/**
 * Weekly growth digest.
 *
 * Boutique owners do not log into dashboards — they run a shop. A dashboard
 * nobody opens produces zero decisions, so the product has to travel to them.
 *
 * The digest is deliberately ONE headline, THREE numbers and ONE action. Sending
 * fifteen metrics would be easier to build and would be ignored; the discipline
 * of picking the single highest-value action is the feature.
 */
import { db } from './store';
import { connectionHealth } from './scheduler';

export interface DigestAction {
  title: string;
  detail: string;
  /** Rough value ranking, used only to pick the winner. */
  weight: number;
}

export interface Digest {
  businessId: string;
  periodDays: number;
  headline: string;
  metrics: Array<{ label: string; value: string; sub?: string }>;
  topAction: DigestAction | null;
  otherActions: DigestAction[];
  problems: string[];
  html: string;
  text: string;
}

const fmtCents = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const daysAgoIso = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const daysAgoDate = (n: number) => daysAgoIso(n).slice(0, 10);

async function countRows(table: string, businessId: string, column: string, since: string): Promise<number> {
  const { count } = await db()
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .gte(column, since);
  return count ?? 0;
}

export async function buildDigest(businessId: string, periodDays = 7): Promise<Digest> {
  const sinceIso = daysAgoIso(periodDays);
  const sinceDate = daysAgoDate(periodDays);

  const [spendRes, touchRes, reviewRes, listingRes, health] = await Promise.all([
    db().from('growth_channel_spend').select('channel,spend_cents,clicks').eq('business_id', businessId).gte('spend_date', sinceDate),
    db().from('growth_attribution_touchpoints').select('channel,lead_id,is_last_touch').eq('business_id', businessId).gte('occurred_at', sinceIso),
    db().from('growth_reviews').select('rating,status,posted_at').eq('business_id', businessId),
    db().from('growth_local_listings').select('completeness_score,issues,review_count,rating').eq('business_id', businessId),
    connectionHealth(businessId),
  ]);

  const spend = (spendRes.data ?? []) as Array<{ channel: string; spend_cents: number; clicks: number }>;
  const touches = (touchRes.data ?? []) as Array<{ channel: string; lead_id: string | null; is_last_touch: boolean }>;
  const reviews = (reviewRes.data ?? []) as Array<{ rating: number; status: string; posted_at: string }>;
  const listings = (listingRes.data ?? []) as Array<{
    completeness_score: number | null;
    issues: Array<{ severity: string; message: string }> | null;
    review_count: number;
    rating: number | null;
  }>;

  const totalSpend = spend.reduce((s, r) => s + (r.spend_cents ?? 0), 0);
  const leadsThisWeek = new Set(touches.filter((t) => t.lead_id).map((t) => t.lead_id)).size;
  const newReviews = reviews.filter((r) => new Date(r.posted_at).getTime() >= Date.now() - periodDays * 86_400_000);
  const needsReply = reviews.filter((r) => r.status === 'needs_reply');
  const appointments = await countRows('appointments', businessId, 'created_at', sinceIso).catch(() => 0);

  // Best channel by attributed leads — the only ranking that survives having no
  // ad spend, which is the common case for a boutique starting out.
  const leadsByChannel = new Map<string, number>();
  for (const t of touches) {
    if (!t.lead_id || !t.is_last_touch) continue;
    leadsByChannel.set(t.channel, (leadsByChannel.get(t.channel) ?? 0) + 1);
  }
  const bestChannel = [...leadsByChannel.entries()].sort((a, b) => b[1] - a[1])[0];

  /* Actions, weighted by what actually moves bookings for a bridal boutique. */
  const actions: DigestAction[] = [];

  if (needsReply.length > 0) {
    actions.push({
      title: `Reply to ${needsReply.length} review${needsReply.length === 1 ? '' : 's'}`,
      detail:
        'Drafts are already written — approving them takes a minute each. Reply rate is one of the few local ranking factors you fully control.',
      weight: 90 + needsReply.length,
    });
  }

  const highIssue = listings.flatMap((l) => l.issues ?? []).find((i) => i.severity === 'high');
  if (highIssue) {
    actions.push({
      title: 'Fix a high-priority Google profile issue',
      detail: highIssue.message,
      weight: 80,
    });
  }

  const completeness = listings[0]?.completeness_score ?? null;
  if (completeness !== null && completeness < 90) {
    actions.push({
      title: `Google profile is ${completeness}% complete`,
      detail: 'Complete profiles get materially more direction requests and calls than partial ones.',
      weight: 60 + (90 - completeness),
    });
  }

  if (leadsThisWeek === 0 && totalSpend > 0) {
    actions.push({
      title: 'Spend ran with no attributed leads',
      detail: `${fmtCents(totalSpend)} of spend produced no tracked leads this week. Check that campaign links carry UTM tags.`,
      weight: 95,
    });
  }

  if (health.problems.length > 0) {
    actions.push({
      title: 'A data source needs attention',
      detail: health.problems[0],
      weight: 85,
    });
  }

  actions.sort((a, b) => b.weight - a.weight);
  const topAction = actions[0] ?? null;

  const headline =
    leadsThisWeek > 0
      ? `${leadsThisWeek} new lead${leadsThisWeek === 1 ? '' : 's'} this week${bestChannel ? `, mostly from ${bestChannel[0]}` : ''}.`
      : 'No tracked leads this week.';

  const metrics = [
    { label: 'New leads', value: String(leadsThisWeek), sub: bestChannel ? `top: ${bestChannel[0]}` : undefined },
    { label: 'Appointments booked', value: String(appointments) },
    {
      label: 'New reviews',
      value: String(newReviews.length),
      sub: listings[0]?.rating ? `${listings[0].rating}★ overall` : undefined,
    },
  ];
  if (totalSpend > 0) metrics.push({ label: 'Ad spend', value: fmtCents(totalSpend) });

  const appUrl = process.env.PUBLIC_APP_URL || 'https://vowos.bridgebox.ai';

  const text = [
    `VowOS weekly growth — ${headline}`,
    '',
    ...metrics.map((m) => `${m.label}: ${m.value}${m.sub ? ` (${m.sub})` : ''}`),
    '',
    topAction ? `Do this first: ${topAction.title}\n${topAction.detail}` : 'Nothing needs your attention this week.',
    '',
    `Open VowOS: ${appUrl}/growth`,
  ].join('\n');

  const html = `<!doctype html><html><body style="margin:0;background:#faf8f5;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px">
    <p style="margin:0 0 4px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#a8a29e">VowOS · This week</p>
    <h1 style="margin:0 0 24px;font-size:22px;line-height:1.3;color:#1c1917;font-weight:600">${escapeHtml(headline)}</h1>
    <table role="presentation" width="100%" style="border-collapse:separate;border-spacing:0 8px">
      ${metrics
        .map(
          (m) => `<tr><td style="padding:12px 16px;background:#fff;border:1px solid #e7e5e4;border-radius:12px">
        <span style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#78716c">${escapeHtml(m.label)}</span><br>
        <strong style="font-size:20px;color:#1c1917">${escapeHtml(m.value)}</strong>
        ${m.sub ? `<span style="font-size:12px;color:#a8a29e"> · ${escapeHtml(m.sub)}</span>` : ''}
      </td></tr>`,
        )
        .join('')}
    </table>
    ${
      topAction
        ? `<div style="margin-top:24px;padding:16px;background:#fff;border:1px solid #f5d0c5;border-left:3px solid #e11d48;border-radius:12px">
      <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#e11d48;font-weight:700">Do this first</p>
      <p style="margin:0 0 6px;font-size:15px;color:#1c1917;font-weight:600">${escapeHtml(topAction.title)}</p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#57534e">${escapeHtml(topAction.detail)}</p>
    </div>`
        : `<p style="margin-top:24px;font-size:14px;color:#57534e">Nothing needs your attention this week.</p>`
    }
    <p style="margin:28px 0 0"><a href="${appUrl}/growth" style="display:inline-block;padding:10px 18px;background:#e11d48;color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600">Open Growth</a></p>
  </div></body></html>`;

  return {
    businessId,
    periodDays,
    headline,
    metrics,
    topAction,
    otherActions: actions.slice(1, 4),
    problems: health.problems,
    html,
    text,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Deliver through the existing send-message edge function rather than adding an
 * email provider: the SendGrid credentials, suppression handling and delivery
 * logging already live there.
 */
export async function sendDigest(businessId: string, recipients: string[], periodDays = 7): Promise<Digest> {
  const digest = await buildDigest(businessId, periodDays);
  for (const to of recipients) {
    try {
      await db().functions.invoke('send-message', {
        body: {
          channel: 'email',
          to,
          subject: `VowOS weekly growth — ${digest.headline}`,
          body: digest.text,
          html: digest.html,
        },
      });
    } catch (err) {
      console.error('[growth-digest] send failed for', to, err instanceof Error ? err.message : err);
    }
  }
  return digest;
}
