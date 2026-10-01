import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyWebhook, verifyWebhookSignature, PawpadoWebhookError } from '../src/index.js';

const secret = 'paw_whsec_test';
const body = JSON.stringify({ id: 'evt_1', type: 'pawpado.session.stopped.v1', occurredAt: '2026-10-01T00:00:00.000Z', workspaceId: 'ws_1', data: { sessionId: 'ses_1', reason: 'idle' } });
const sign = (t: number, b = body, s = secret) => `t=${t},v1=${createHmac('sha256', s).update(`${t}.${b}`).digest('hex')}`;
const now = 1_790_000_000;
const clock = () => now * 1000;

describe('verifyWebhook', () => {
  it('returns the event for a valid, fresh signature (string or bytes)', () => {
    const ev = verifyWebhook(body, sign(now), secret, { now: clock });
    expect(ev).toMatchObject({ id: 'evt_1', type: 'pawpado.session.stopped.v1', data: { reason: 'idle' } });
    expect(verifyWebhookSignature(new TextEncoder().encode(body), sign(now), secret, { now: clock })).toBe(true);
  });
  it('refuses a wrong secret, a changed body, an old timestamp or a missing header', () => {
    expect(verifyWebhookSignature(body, sign(now, body, 'other'), secret, { now: clock })).toBe(false);
    expect(verifyWebhookSignature(body + ' ', sign(now), secret, { now: clock })).toBe(false);
    expect(verifyWebhookSignature(body, sign(now - 301), secret, { now: clock })).toBe(false);
    expect(verifyWebhookSignature(body, sign(now - 301), secret, { now: clock, toleranceSeconds: 600 })).toBe(true);
    expect(verifyWebhookSignature(body, undefined, secret)).toBe(false);
    expect(() => verifyWebhook(body, 't=1,v1=00', secret, { now: clock })).toThrow(PawpadoWebhookError);
  });
});
