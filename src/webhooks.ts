import { createHmac, timingSafeEqual } from 'node:crypto';

/** The body Pawpado POSTs to a webhook subscription. `id` is the same on every retry. */
export interface PawpadoWebhookEvent<T = Record<string, unknown>> {
  id: string;
  type: string;
  occurredAt: string;
  workspaceId: string;
  data: T;
}

/** A delivery whose `Pawpado-Signature` does not check out (or is too old). */
export class PawpadoWebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PawpadoWebhookError';
  }
}

export interface VerifyWebhookOptions {
  /** Reject a signature whose timestamp is further than this from now. Default 300. */
  toleranceSeconds?: number;
  /** The clock, in milliseconds (tests). Default Date.now. */
  now?: () => number;
}

function parseHeader(header: string): { t: number; v1: string[] } | null {
  let t: number | null = null;
  const v1: string[] = [];
  for (const part of header.split(',')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k === 't' && /^\d+$/.test(v)) t = Number(v);
    else if (k === 'v1' && /^[0-9a-f]{64}$/i.test(v)) v1.push(v.toLowerCase());
  }
  return t === null || v1.length === 0 ? null : { t, v1 };
}

/**
 * Does `Pawpado-Signature` (`t=<unix>,v1=<hex HMAC-SHA256(secret, "<t>.<raw body>")>`)
 * match the raw body, within the tolerance? Pass the RAW bytes as received — a body that
 * was parsed and re-serialised will not match.
 */
export function verifyWebhookSignature(
  rawBody: string | Uint8Array,
  signatureHeader: string | null | undefined,
  secret: string,
  options: VerifyWebhookOptions = {},
): boolean {
  if (!signatureHeader || !secret) return false;
  const parsed = parseHeader(signatureHeader);
  if (!parsed) return false;
  const tolerance = options.toleranceSeconds ?? 300;
  const now = Math.floor((options.now ?? Date.now)() / 1000);
  if (Math.abs(now - parsed.t) > tolerance) return false;
  const body = typeof rawBody === 'string' ? rawBody : Buffer.from(rawBody).toString('utf8');
  const expected = createHmac('sha256', secret).update(`${parsed.t}.${body}`).digest();
  return parsed.v1.some((sig) => {
    const got = Buffer.from(sig, 'hex');
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

/**
 * Verify a webhook delivery and return its event. Throws PawpadoWebhookError when the
 * signature is missing, wrong or older than the tolerance (default 5 minutes).
 *
 *   const event = verifyWebhook(rawBody, req.headers['pawpado-signature'], secret);
 */
export function verifyWebhook<T = Record<string, unknown>>(
  rawBody: string | Uint8Array,
  signatureHeader: string | null | undefined,
  secret: string,
  options: VerifyWebhookOptions = {},
): PawpadoWebhookEvent<T> {
  if (!verifyWebhookSignature(rawBody, signatureHeader, secret, options)) {
    throw new PawpadoWebhookError('invalid or expired Pawpado-Signature');
  }
  const body = typeof rawBody === 'string' ? rawBody : Buffer.from(rawBody).toString('utf8');
  try {
    return JSON.parse(body) as PawpadoWebhookEvent<T>;
  } catch {
    throw new PawpadoWebhookError('the webhook body is not JSON');
  }
}
