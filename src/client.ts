import { ApiClient, Session } from '@forjio/sdk';
import { GeneratedApi, type ApigenTransport } from './api.generated.js';
import type {
  ConnectInfo,
  Credits,
  PairInput,
  SessionPoll,
  SessionResult,
  Settings,
  SettingsPatch,
  StorageOptions,
  StorageResize,
  TailscaleKey,
  TopupInput,
  TopupSession,
} from './types.js';

export interface PawpadoClientOptions {
  /** Base URL. Default https://pawpado.com. */
  baseUrl?: string;
  /** When set, auto-attaches the session's bearer + proactive refresh. */
  session?: Session;
  /** A Pawpado API key (`paw_live_…`, Settings → API keys) or a Huudis access token,
   *  sent as Bearer (alternative to session). */
  apiKey?: string;
  /** Test seam. */
  fetchImpl?: typeof fetch;
}

/**
 * `client.api`: every feature route, one method each (generated from the API spec:
 * api.generated.ts) — and, as before, the raw HTTP verbs of the underlying ApiClient
 * (`client.api.get('/api/v1/...')`), which the CLI and the docs use as the escape hatch.
 */
export class PawpadoApi extends GeneratedApi {
  readonly get: ApiClient['get'];
  readonly post: ApiClient['post'];
  readonly patch: ApiClient['patch'];
  readonly put: ApiClient['put'];
  readonly delete: ApiClient['delete'];
  readonly paginate: ApiClient['paginate'];

  constructor(transport: ApigenTransport, private readonly http: ApiClient) {
    super(transport);
    this.get = http.get.bind(http);
    this.post = http.post.bind(http);
    this.patch = http.patch.bind(http);
    this.put = http.put.bind(http);
    this.delete = http.delete.bind(http);
    this.paginate = http.paginate.bind(http);
  }

  get baseUrl(): string {
    return this.http.baseUrl;
  }

  get session(): Session | undefined {
    return this.http.session;
  }
}

export class PawpadoClient {
  /** Every feature route (generated), plus the raw HTTP verbs. See PawpadoApi. */
  readonly api: PawpadoApi;
  private readonly http: ApiClient;
  private readonly apiKey?: string;

  constructor(opts: PawpadoClientOptions = {}) {
    this.http = new ApiClient({
      baseUrl: opts.baseUrl ?? 'https://pawpado.com',
      session: opts.session,
      fetchImpl: opts.fetchImpl,
    });
    this.apiKey = opts.apiKey;
    this.api = new PawpadoApi(this, this.http);
  }

  /** The call behind `client.api.<area><Action>(...)`: the same ApiClient and credentials
   *  (the session, or the constructor's apiKey — a `paw_live_…` key, sent as Bearer) as
   *  every other method. */
  apigenRequest(method: string, path: string, query: Record<string, unknown> | undefined, body: unknown): Promise<unknown> {
    const ro = {
      ...this.a(),
      query: query
        ? Object.fromEntries(
            Object.entries(query).map(([k, v]): [string, string | number | boolean] => [
              k,
              typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? v : JSON.stringify(v),
            ]),
          )
        : undefined,
    };
    switch (method.toUpperCase()) {
      case 'GET':
        return this.http.get<unknown>(path, ro);
      case 'POST':
        return this.http.post<unknown>(path, body, ro);
      case 'PATCH':
        return this.http.patch<unknown>(path, body, ro);
      case 'PUT':
        return this.http.put<unknown>(path, body, ro);
      case 'DELETE':
        return this.http.delete<unknown>(path, ro);
      default:
        return Promise.reject(new Error(`unsupported method ${method}`));
    }
  }

  private a(token?: string) {
    return { authToken: token ?? this.apiKey };
  }

  // Each method takes an optional per-call token (an API key or a Huudis access token)
  // that overrides the client's own credentials. Every other route: `client.api`.

  // ─── Session management ───────────────────────────────────
  sessions = {
    start: (token?: string) =>
      this.http.post<SessionResult>('/api/v1/sessions/start', undefined, this.a(token)),
    stop: (input: { force?: boolean } = {}, token?: string) =>
      this.http.post<SessionResult>('/api/v1/sessions/stop', input, this.a(token)),
    poll: (token?: string) =>
      this.http.get<SessionPoll>('/api/v1/sessions/poll', this.a(token)),
    /** Pair a Moonlight client: send the 4-digit PIN it shows. */
    pair: (input: PairInput, token?: string) =>
      this.http.post<{ ok: true }>('/api/v1/sessions/pair', input, this.a(token)),
    connect: (token?: string) =>
      this.http.get<ConnectInfo>('/api/v1/sessions/connect', this.a(token)),
    tailscaleKey: (token?: string) =>
      this.http.post<TailscaleKey>('/api/v1/sessions/tailscale-key', undefined, this.a(token)),
  };

  // ─── Credits (wallet) ─────────────────────────────────────
  credits = {
    me: (token?: string) => this.http.get<Credits>('/api/v1/credits/me', this.a(token)),
    /** Start a checkout: `{ amountIdr }`, or `{ amountUsdCents }` for PayPal/USD.
     *  Owner/admin only (an API key: the role of the person who made it). */
    topup: (input: TopupInput, token?: string) =>
      this.http.post<TopupSession>('/api/v1/credits/topup', input, this.a(token)),
  };

  // ─── Billing ──────────────────────────────────────────────
  billing = {
    /** The storage sizes on offer (GB). */
    storage: (token?: string) => this.http.get<StorageOptions>('/api/v1/billing/storage', this.a(token)),
    /** Grow the workspace's disk (owner/admin; disks only grow). */
    resizeStorage: (input: { storageGb: number }, token?: string) =>
      this.http.post<StorageResize>('/api/v1/billing/storage', input, this.a(token)),
  };

  // ─── Settings ─────────────────────────────────────────────
  settings = {
    get: (token?: string) =>
      this.http.get<{ settings: Settings; presets: { idleAutoStopMinutes: number[] } }>('/api/v1/settings', this.a(token)),
    update: (patch: SettingsPatch, token?: string) =>
      this.http.patch<{ ok: true; settings: Settings }>('/api/v1/settings', patch, this.a(token)),
  };

  // ─── Account ──────────────────────────────────────────────
  account = {
    /** Delete the account. Person-only: Pawpado accepts it from the signed-in browser
     *  session alone — an API key or a Huudis token gets 401, so a leaked key cannot
     *  lock the owner out. */
    delete: (token?: string) =>
      this.http.post<{ ok: boolean; result: unknown }>('/api/v1/account/delete', { confirm: 'DELETE' }, this.a(token)),
  };

  // ─── Health (no auth) ─────────────────────────────────────
  health() {
    return this.http.get<{ status: string }>('/api/v1/health');
  }
}
