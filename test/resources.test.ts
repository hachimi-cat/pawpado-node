import { describe, it, expect, beforeEach } from 'vitest';
import { PawpadoClient } from '../src/index.js';

function makeClient() {
  const captured: Array<{ url: string; method: string; body?: string; headers: Record<string, string> }> = [];
  const fetchImpl: typeof fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    captured.push({
      url: typeof input === 'string' ? input : input.toString(),
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? init.body : undefined,
      headers: (init?.headers ?? {}) as Record<string, string>,
    });
    return new Response(
      JSON.stringify({ data: { ok: true }, error: null, meta: { requestId: 'r', timestamp: '' } }),
      { headers: { 'content-type': 'application/json' } },
    );
  }) as typeof fetch;
  const client = new PawpadoClient({ baseUrl: 'https://pawpado.test', apiKey: 'tok', fetchImpl });
  return { client, captured };
}

describe('PawpadoClient', () => {
  let h: ReturnType<typeof makeClient>;
  beforeEach(() => { h = makeClient(); });

  it('sessions.start POSTs', async () => {
    await h.client.sessions.start();
    expect(h.captured[0]!.method).toBe('POST');
    expect(h.captured[0]!.url).toContain('/api/v1/sessions/start');
  });
  it('sessions.stop POSTs with body', async () => {
    await h.client.sessions.stop({ force: true });
    expect(JSON.parse(h.captured[0]!.body!)).toEqual({ force: true });
  });
  it('sessions.poll GETs', async () => {
    await h.client.sessions.poll();
    expect(h.captured[0]!.url).toContain('/api/v1/sessions/poll');
  });
  it('credits.topup POSTs an IDR amount, or USD cents', async () => {
    await h.client.credits.topup({ amountIdr: 100_000 });
    await h.client.credits.topup({ amountUsdCents: 1_000 });
    expect(h.captured[0]!.url).toContain('/api/v1/credits/topup');
    expect(JSON.parse(h.captured[0]!.body!)).toEqual({ amountIdr: 100_000 });
    expect(JSON.parse(h.captured[1]!.body!)).toEqual({ amountUsdCents: 1_000 });
  });
  it('settings.update PATCHes the fields the server reads', async () => {
    await h.client.settings.update({ idleAutoStopMinutes: null, playMode: 'moonlight', launchOptions: { fps: 60 } });
    expect(h.captured[0]!.method).toBe('PATCH');
    expect(JSON.parse(h.captured[0]!.body!)).toEqual({ idleAutoStopMinutes: null, playMode: 'moonlight', launchOptions: { fps: 60 } });
  });
  it('sessions.pair POSTs the PIN', async () => {
    await h.client.sessions.pair({ pin: '1234' });
    expect(JSON.parse(h.captured[0]!.body!)).toEqual({ pin: '1234' });
  });
  it('billing.resizeStorage POSTs the new size', async () => {
    await h.client.billing.resizeStorage({ storageGb: 200 });
    expect(h.captured[0]!.method).toBe('POST');
    expect(JSON.parse(h.captured[0]!.body!)).toEqual({ storageGb: 200 });
  });
  it('account.delete POSTs the typed confirmation', async () => {
    await h.client.account.delete();
    expect(h.captured[0]!.method).toBe('POST');
    expect(h.captured[0]!.url).toContain('/api/v1/account/delete');
    expect(JSON.parse(h.captured[0]!.body!)).toEqual({ confirm: 'DELETE' });
  });
  it('attaches Bearer from apiKey', async () => {
    await h.client.sessions.poll();
    expect(h.captured[0]!.headers.authorization).toBe('Bearer tok');
  });
  it('per-call token overrides', async () => {
    await h.client.sessions.poll('override');
    expect(h.captured[0]!.headers.authorization).toBe('Bearer override');
  });
  it('health() works', async () => {
    await h.client.health();
    expect(h.captured[0]!.url).toContain('/api/v1/health');
  });
});
