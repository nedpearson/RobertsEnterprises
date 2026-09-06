/**
 * send-message — the single outbound delivery path for VowOS.
 *
 * Four subsystems have been calling `supabase.functions.invoke('send-message')`
 * for weeks: appointment intake notifications, fulfillment delivery notices,
 * the growth digest, and Shopify order notifications. The function did not
 * exist. `POST /functions/v1/send-message` returned 404 — byte-identical to a
 * name nobody ever wrote — so every send failed, and the 98 rows in
 * appointment_intake_notification_outbox burned all 8 retries against a
 * function that was never there.
 *
 * Two rules this function will not break:
 *
 *   1. It never returns 2xx for a message it did not send. The outbox's retry
 *      and the callers' try/catch both key off the status code; a polite 200 on
 *      a failed send is how you get a queue that looks drained and a boutique
 *      that never heard about a bride.
 *
 *   2. Missing configuration is an error, not a silent no-op. If RESEND_API_KEY
 *      is absent the response says exactly that. Absence of config and absence
 *      of failure must not look the same from outside.
 *
 * Auth: invoked with the service-role key by the worker. JWT verification stays
 * ON — deploy without --no-verify-jwt. This endpoint sends mail on your domain;
 * it is not public.
 *
 * Secrets required (set as Supabase Edge Function secrets, never in the repo):
 *   RESEND_API_KEY   Resend API key
 *   RESEND_FROM      verified sender, e.g. "I Do Bridal Couture <hello@idobridalcouture.com>"
 * Optional, for channel:"sms":
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 */

interface SendMessageRequest {
  channel?: string;
  to?: string;
  subject?: string;
  body?: string;
  html?: string;
  from?: string;
}

const json = (status: number, payload: Record<string, unknown>): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** Deliberately conservative: rejects what Resend would reject anyway. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

async function sendEmail(req: SendMessageRequest): Promise<Response> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const defaultFrom = Deno.env.get('RESEND_FROM');

  if (!apiKey) {
    return json(500, {
      error: 'RESEND_API_KEY is not configured for this project.',
      hint: 'supabase secrets set RESEND_API_KEY=...',
    });
  }
  if (!req.from && !defaultFrom) {
    return json(500, {
      error: 'No sender address. Set RESEND_FROM, or pass "from" in the request.',
      hint: 'The address must be on a domain verified in Resend.',
    });
  }

  const to = (req.to ?? '').trim();
  if (!looksLikeEmail(to)) {
    return json(400, { error: 'A valid "to" address is required.' });
  }
  if (!req.body && !req.html) {
    return json(400, { error: 'Either "body" or "html" is required.' });
  }

  const payload: Record<string, unknown> = {
    from: req.from ?? defaultFrom,
    to: [to],
    subject: req.subject?.trim() || '(no subject)',
  };
  // Send both parts when the caller supplied both; the growth digest does.
  if (req.html) payload.html = req.html;
  if (req.body) payload.text = req.body;

  let response: Response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    // A network failure or timeout is retryable. 502 tells the outbox to try
    // again rather than marking the message delivered.
    return json(502, {
      error: 'Could not reach Resend.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  const detail = await response.text();
  if (!response.ok) {
    // Pass Resend's own status through. A 422 for an unverified domain must not
    // be retried eight times as though it were a blip, and a 429 must be.
    return json(response.status, {
      error: 'Resend rejected the message.',
      status: response.status,
      detail: detail.slice(0, 500),
    });
  }

  let id: string | null = null;
  try {
    id = (JSON.parse(detail) as { id?: string }).id ?? null;
  } catch {
    id = null;
  }
  return json(200, { delivered: true, channel: 'email', id });
}

async function sendSms(req: SendMessageRequest): Promise<Response> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_FROM_NUMBER');

  // 501, not 200. The fulfillment module passes through whatever channel the
  // queued item carries, and a silent success on an unconfigured channel is the
  // failure mode this whole function exists to end.
  if (!sid || !token || !from) {
    return json(501, {
      error: 'SMS is not configured for this project.',
      missing: [
        !sid ? 'TWILIO_ACCOUNT_SID' : null,
        !token ? 'TWILIO_AUTH_TOKEN' : null,
        !from ? 'TWILIO_FROM_NUMBER' : null,
      ].filter(Boolean),
    });
  }

  const to = (req.to ?? '').trim();
  if (!to) return json(400, { error: 'A "to" number is required.' });
  if (!req.body) return json(400, { error: '"body" is required for SMS.' });

  const form = new URLSearchParams({ To: to, From: from, Body: req.body });
  let response: Response;
  try {
    response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    return json(502, {
      error: 'Could not reach Twilio.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  const detail = await response.text();
  if (!response.ok) {
    return json(response.status, {
      error: 'Twilio rejected the message.',
      status: response.status,
      detail: detail.slice(0, 500),
    });
  }
  return json(200, { delivered: true, channel: 'sms' });
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') {
    return json(405, { error: 'POST only.' });
  }

  let payload: SendMessageRequest;
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: 'Body must be JSON.' });
  }

  const channel = (payload.channel ?? 'email').toLowerCase();
  switch (channel) {
    case 'email':
      return await sendEmail(payload);
    case 'sms':
      return await sendSms(payload);
    default:
      return json(400, { error: `Unsupported channel "${channel}". Expected "email" or "sms".` });
  }
});
