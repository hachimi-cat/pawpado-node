import { describe, it, expect } from 'vitest';
import { PawpadoClient, GeneratedApi } from '../src/index.js';

// client.api: every feature route, generated from the API spec (scripts/apigen.sh).
function capture() {
  const seen: Array<{ url: string; method: string; body?: string; auth?: string | null }> = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    seen.push({
      url: typeof input === 'string' ? input : input.toString(),
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? init.body : undefined,
      auth: new Headers(init?.headers).get('authorization'),
    });
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  const client = new PawpadoClient({ baseUrl: 'https://pawpado.test', apiKey: 'paw_live_test', fetchImpl });
  return { client, seen };
}

describe('client.api (generated from the spec)', () => {
  it('has a method for every feature route', () => {
    const { client } = capture();
    expect(client.api).toBeInstanceOf(GeneratedApi);
    const methods = Object.getOwnPropertyNames(GeneratedApi.prototype).filter((n) => n !== 'constructor' && n !== 'call');
    expect(methods.length).toBeGreaterThanOrEqual(38);
    expect(methods).toContain('snapshotsCreate');
    expect(methods).toContain('machinesResize');
  });

  it('sends the body fields Pawpado reads, with the API key as Bearer', async () => {
    const { client, seen } = capture();
    await client.api.feedbackCreate({ sessionId: 'ses_1', rating: 5, experience: 'smooth' });
    expect(seen[0]!.method).toBe('POST');
    expect(seen[0]!.url).toBe('https://pawpado.test/api/v1/feedback');
    expect(JSON.parse(seen[0]!.body!)).toEqual({ sessionId: 'ses_1', rating: 5, experience: 'smooth' });
    expect(seen[0]!.auth).toBe('Bearer paw_live_test');
  });

  it('puts path parameters in the path and query fields in the query', async () => {
    const { client, seen } = capture();
    await client.api.snapshotsStatus('snap 1');
    await client.api.auditLogList({ limit: 5, action: 'pawpado.snapshot.deleted.v1' });
    await client.api.webhooksUpdate('wh_1', { active: false });
    expect(seen[0]!.url).toBe('https://pawpado.test/api/v1/snapshots/snap%201/status');
    const listed = new URL(seen[1]!.url);
    expect(listed.pathname).toBe('/api/v1/audit-log');
    expect(Object.fromEntries(listed.searchParams)).toEqual({ limit: '5', action: 'pawpado.snapshot.deleted.v1' });
    expect(seen[2]!.method).toBe('PATCH');
    expect(JSON.parse(seen[2]!.body!)).toEqual({ active: false });
  });

  it('keeps the raw HTTP verbs on client.api', async () => {
    const { client, seen } = capture();
    await client.api.get('/api/v1/sessions/poll', { authToken: 'paw_live_other' });
    expect(seen[0]!.url).toBe('https://pawpado.test/api/v1/sessions/poll');
    expect(seen[0]!.auth).toBe('Bearer paw_live_other');
    expect(client.api.baseUrl).toBe('https://pawpado.test');
  });
});
