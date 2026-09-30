import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PawpadoClient } from '../src/index.js';

// Every hand-written method must call a route Pawpado actually serves: its (method, path)
// is checked against the API spec, frontend/openapi.json, which scripts/apigen.sh makes
// from the route handlers. A method whose route moves or disappears fails here. (The
// public mirror of this package carries no spec, so there the check is skipped.)
const here = path.dirname(fileURLToPath(import.meta.url));
const SPEC = path.resolve(here, '../../../frontend/openapi.json');
const spec = (fs.existsSync(SPEC) ? JSON.parse(fs.readFileSync(SPEC, 'utf8')) : { paths: {} }) as {
  paths: Record<string, Record<string, unknown>>;
};
const served = (method: string, url: string): boolean => {
  const p = new URL(url).pathname;
  return Object.entries(spec.paths).some(([route, ops]) =>
    new RegExp(`^${route.replace(/\{[^}]+\}/g, '[^/]+')}$`).test(p) && method.toLowerCase() in ops);
};

// One call per hand-written method; a method missing here fails the completeness check.
const CALLS: Record<string, (c: PawpadoClient) => Promise<unknown>> = {
  'sessions.start': (c) => c.sessions.start(),
  'sessions.stop': (c) => c.sessions.stop({ force: true }),
  'sessions.poll': (c) => c.sessions.poll(),
  'sessions.pair': (c) => c.sessions.pair({ pin: '1234' }),
  'sessions.connect': (c) => c.sessions.connect(),
  'sessions.tailscaleKey': (c) => c.sessions.tailscaleKey(),
  'credits.me': (c) => c.credits.me(),
  'credits.topup': (c) => c.credits.topup({ amountIdr: 100_000 }),
  'billing.storage': (c) => c.billing.storage(),
  'billing.resizeStorage': (c) => c.billing.resizeStorage({ storageGb: 200 }),
  'settings.get': (c) => c.settings.get(),
  'settings.update': (c) => c.settings.update({ playMode: 'browser' }),
  'account.delete': (c) => c.account.delete(),
  health: (c) => c.health(),
};

describe.skipIf(!fs.existsSync(SPEC))('hand-written SDK methods vs the API spec', () => {
  const seen: Array<{ method: string; url: string }> = [];
  const client = new PawpadoClient({
    baseUrl: 'https://pawpado.test',
    apiKey: 'paw_live_test',
    fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
      seen.push({ method: init?.method ?? 'GET', url: typeof input === 'string' ? input : input.toString() });
      return new Response('{}', { headers: { 'content-type': 'application/json' } });
    }) as typeof fetch,
  });

  it('covers every hand-written method', () => {
    const methods = ['sessions', 'credits', 'billing', 'settings', 'account'].flatMap((ns) =>
      Object.keys((client as unknown as Record<string, Record<string, unknown>>)[ns]!).map((m) => `${ns}.${m}`));
    expect(Object.keys(CALLS).sort()).toEqual([...methods, 'health'].sort());
  });

  for (const [name, call] of Object.entries(CALLS)) {
    it(`${name} calls a route the spec has`, async () => {
      seen.length = 0;
      await call(client);
      expect(seen).toHaveLength(1);
      expect(served(seen[0]!.method, seen[0]!.url), `${seen[0]!.method} ${seen[0]!.url}`).toBe(true);
    });
  }
});
