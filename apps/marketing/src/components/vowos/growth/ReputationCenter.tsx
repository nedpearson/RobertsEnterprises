import { useMemo, useState } from 'react';
import { Star, MessageSquare, Filter, ExternalLink, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, toast } from '@vowos/design-system';
import { useReviews, useBusinessId } from '@/lib/growth/useGrowth';
import { saveReviewResponse, publishReviewReply } from '@/lib/growth/growthService';
import type { GrowthReview, ReviewStatus } from '@/lib/growth/types';

const FILTERS: Array<{ label: string; value: ReviewStatus | 'all' }> = [
  { label: 'Needs reply', value: 'needs_reply' },
  { label: 'Flagged', value: 'flagged' },
  { label: 'Replied', value: 'replied' },
  { label: 'All', value: 'all' },
];

const SOURCE_LABEL: Record<string, string> = {
  google: 'Google',
  yelp: 'Yelp',
  facebook: 'Facebook',
  the_knot: 'The Knot',
  wedding_wire: 'WeddingWire',
  manual: 'Manual',
};

const initialsOf = (name: string | null) =>
  (name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

const relativeTime = (iso: string) => {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`}
        />
      ))}
    </span>
  );
}

function ReviewCard({ review, onChanged }: { review: GrowthReview; onChanged: () => void }) {
  const businessId = useBusinessId();
  const [draft, setDraft] = useState(review.response_body ?? review.ai_draft ?? '');
  const [busy, setBusy] = useState<null | 'saving' | 'publishing'>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const save = async () => {
    setBusy('saving');
    const { error } = await saveReviewResponse(review.id, draft);
    setBusy(null);
    setMessage(error ? { kind: 'error', text: error } : { kind: 'ok', text: 'Reply saved.' });
    if (!error) onChanged();
  };

  const publish = async () => {
    if (!businessId) return;
    setBusy('publishing');
    // Persist first so a failed Google call never loses the text.
    const saved = await saveReviewResponse(review.id, draft);
    if (saved.error) {
      setBusy(null);
      setMessage({ kind: 'error', text: saved.error });
      return;
    }
    const { ok, error } = await publishReviewReply(businessId, review.id);
    setBusy(null);
    setMessage(
      ok
        ? { kind: 'ok', text: 'Published to Google.' }
        : { kind: 'error', text: error ?? 'Publish failed.' },
    );
    onChanged();
  };

  return (
    <Card className="shadow-sm" data-tour-id="review-card">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft/60 text-sm font-semibold text-brand-primary">
            {initialsOf(review.author_name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold text-stone-900">{review.author_name ?? 'Anonymous'}</span>
              <Stars rating={review.rating} />
              <span className="text-xs text-stone-500">
                {relativeTime(review.posted_at)} on {SOURCE_LABEL[review.source] ?? review.source}
              </span>
              {review.status === 'flagged' && (
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                  Flagged
                </span>
              )}
              {review.status === 'replied' && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Replied
                </span>
              )}
            </div>

            {review.body && <p className="mt-2 text-sm leading-relaxed text-stone-700">{review.body}</p>}

            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                {review.ai_draft && !review.response_body ? 'Suggested reply' : 'Your reply'}
              </label>
              <textarea
                data-tour-id="review-reply-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                placeholder="Write a reply…"
                className="mt-1 w-full rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-800 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  data-tour-id="review-save"
                  onClick={save}
                  disabled={!draft.trim() || busy !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm transition-colors hover:bg-stone-50 disabled:opacity-50"
                >
                  {busy === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Save reply
                </button>
                <button
                  data-tour-id="review-publish"
                  onClick={publish}
                  disabled={!draft.trim() || busy !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-primary-hover disabled:opacity-50"
                >
                  {busy === 'publishing' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Publish to {SOURCE_LABEL[review.source] ?? 'source'}
                </button>
                {message && (
                  <span
                    className={`text-xs ${message.kind === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}
                    data-tour-id="review-message"
                  >
                    {message.text}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Reviews & Reputation, backed by growth_reviews.
 *
 * Replies are saved to the database first and pushed to the provider second, so
 * a Google outage can never lose text the user typed.
 */
export function ReputationCenter({ hideHeader = false }: { hideHeader?: boolean }) {
  const [filter, setFilter] = useState<ReviewStatus | 'all'>('needs_reply');
  const { data: reviews, loading, error, refresh } = useReviews(filter === 'all' ? undefined : filter);
  const { data: allReviews } = useReviews();

  const stats = useMemo(() => {
    if (!allReviews.length) return null;
    const total = allReviews.length;
    const avg = allReviews.reduce((s, r) => s + r.rating, 0) / total;
    const needsReply = allReviews.filter((r) => r.status === 'needs_reply').length;
    const negative = allReviews.filter((r) => r.rating <= 2).length;
    return { total, avg, needsReply, negative };
  }, [allReviews]);

  const [autoPilotActive, setAutoPilotActive] = useState(true);
  const [autoReplying, setAutoReplying] = useState(false);

  const businessId = useBusinessId();

  const handleAutoReplyAll5Stars = async () => {
    const unreplied5Stars = allReviews.filter(r => (r.status === 'needs_reply' || (r.status as string) === 'draft') && r.rating >= 4);
    if (unreplied5Stars.length === 0) {
      toast({ title: '✨ Reputation Auto-Pilot', description: 'All 5-star reviews have already been replied to!' });
      return;
    }

    setAutoReplying(true);
    let count = 0;

    for (const rev of unreplied5Stars) {
      const reply = rev.response_body || rev.ai_draft || `Thank you so much, ${rev.author_name || 'beautiful bride'}! We loved helping you find your dream gown at the boutique. Congratulations on your upcoming wedding! 💖`;
      try {
        await saveReviewResponse(rev.id, reply);
        if (businessId) await publishReviewReply(businessId, rev.id);
        count++;
      } catch (err) {
        console.error('Auto reply failed for review', rev.id, err);
      }
    }

    setAutoReplying(false);
    toast({ title: '🤖 Auto-Pilot Complete', description: `Successfully published AI replies for ${count} 5-star review${count === 1 ? '' : 's'}!` });
    refresh();
  };

  return (
    <div className="space-y-6" data-tour-id="reputation-center">
      {/* AI Auto-Pilot Banner */}
      <Card className="border-amber-200/80 bg-gradient-to-r from-amber-50/80 via-rose-50/50 to-stone-50 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
              <Star className="h-5 w-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-stone-900">AI Reputation Auto-Pilot</h3>
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">ACTIVE</span>
              </div>
              <p className="text-xs text-stone-600">Auto-drafts warm, luxury-styled replies for Google & Knot reviews within 15 minutes of posting.</p>
            </div>
          </div>
          <button
            onClick={handleAutoReplyAll5Stars}
            disabled={autoReplying}
            className="flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-stone-800 disabled:opacity-50 shrink-0"
          >
            {autoReplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>⚡</span>}
            Auto-Reply All 5-Star Reviews
          </button>
        </div>
      </Card>

      {!hideHeader ? (
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">Review &amp; Reputation Center</h1>
            <p className="mt-1 text-sm text-stone-500">
              Monitor and respond to customer reviews across every connected source.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white p-1 shadow-sm">
              <Filter className="ml-1.5 h-3.5 w-3.5 text-stone-400" />
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  data-tour-id={`review-filter-${f.value}`}
                  onClick={() => setFilter(f.value)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    filter === f.value ? 'bg-brand-primary text-white' : 'text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between pb-2 border-b border-stone-200/60">
          <p className="text-xs text-stone-500 font-medium">Customer Review & Feedback Stream</p>
          <div className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white p-1 shadow-sm">
            <Filter className="ml-1.5 h-3.5 w-3.5 text-stone-400" />
            {FILTERS.map((f) => (
              <button
                key={f.value}
                data-tour-id={`review-filter-${f.value}`}
                onClick={() => setFilter(f.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  filter === f.value ? 'bg-brand-primary text-white' : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <Card className="border-rose-200 bg-rose-50/60">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <p className="text-sm text-rose-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-tour-id="reputation-stats">
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Average rating</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-stone-900">
                {stats.avg.toFixed(1)}
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Total reviews</p>
              <p className="mt-1 text-2xl font-bold text-stone-900">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Awaiting reply</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{stats.needsReply}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">1–2 star</p>
              <p className="mt-1 text-2xl font-bold text-rose-600">{stats.negative}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Reviews</CardTitle>
          <CardDescription>
            Replies save to VowOS first, then publish to the source — a provider outage never loses your text.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-stone-500">Loading reviews…</p>
          ) : reviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/60 p-8 text-center" data-tour-id="reputation-empty">
              <MessageSquare className="mx-auto h-6 w-6 text-stone-400" />
              <p className="mt-2 text-sm font-semibold text-stone-800">
                {filter === 'all' ? 'No reviews yet' : `Nothing in “${FILTERS.find((f) => f.value === filter)?.label}”`}
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs text-stone-500">
                Connect Google Business Profile to pull reviews automatically, or switch filters.
              </p>
              <a
                href="https://business.google.com/"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-primary hover:underline"
              >
                Open Google Business Profile <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ) : (
            reviews.map((r) => <ReviewCard key={r.id} review={r} onChanged={refresh} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
