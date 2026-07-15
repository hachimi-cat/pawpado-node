import { ApiClient, Session } from '@forjio/sdk';
import type {
  AdminReconcileResult,
  ConnectInfo,
  Credits,
  OrphanList,
  PairInfo,
  SessionStatus,
  Settings,
  TailscaleKey,
  TopupSession,
  UserProfile,
} from './types.js';

export interface PawpadoClientOptions {
  /** Base URL. Default https://pawpado.com. */
  baseUrl?: string;
  /** When set, auto-attaches the session's bearer + proactive refresh. */
  session?: Session;
  /** Static API/access token (alternative to session). */
  apiKey?: string;
  /** Test seam. */
  fetchImpl?: typeof fetch;
}

export class PawpadoClient {
  readonly api: ApiClient;
  private readonly apiKey?: string;

  constructor(opts: PawpadoClientOptions = {}) {
    this.api = new ApiClient({
      baseUrl: opts.baseUrl ?? 'https://pawpado.com',
      session: opts.session,
      fetchImpl: opts.fetchImpl,
    });
    this.apiKey = opts.apiKey;
  }

  private a(token?: string) {
    return { authToken: token ?? this.apiKey };
  }

  // ─── Session management ───────────────────────────────────
  sessions = {
    start: (token?: string) =>
      this.api.post<SessionStatus>('/api/v1/sessions/start', undefined, this.a(token)),
    stop: (input: { force?: boolean } = {}, token?: string) =>
      this.api.post<SessionStatus>('/api/v1/sessions/stop', input, this.a(token)),
    poll: (token?: string) =>
      this.api.get<SessionStatus>('/api/v1/sessions/poll', this.a(token)),
    pair: (token?: string) =>
      this.api.post<PairInfo>('/api/v1/sessions/pair', undefined, this.a(token)),
    connect: (token?: string) =>
      this.api.get<ConnectInfo>('/api/v1/sessions/connect', this.a(token)),
    tailscaleKey: (token?: string) =>
      this.api.post<TailscaleKey>('/api/v1/sessions/tailscale-key', undefined, this.a(token)),
  };

  // ─── Credits (wallet) ─────────────────────────────────────
  credits = {
    me: (token?: string) => this.api.get<Credits>('/api/v1/credits/me', this.a(token)),
    topup: (input: { amountCents: number; currency?: 'IDR' | 'USD' }, token?: string) =>
      this.api.post<TopupSession>('/api/v1/credits/topup', input, this.a(token)),
  };

  // ─── Billing ──────────────────────────────────────────────
  billing = {
    storage: (token?: string) =>
      this.api.get<{ storageGb: number; ratePerGb: number; periodFrom: string; periodTo: string }>(
        '/api/v1/billing/storage',
        this.a(token),
      ),
  };

  // ─── Settings ─────────────────────────────────────────────
  settings = {
    get: (token?: string) => this.api.get<Settings>('/api/v1/settings', this.a(token)),
    update: (patch: Partial<Settings>, token?: string) =>
      this.api.patch<Settings>('/api/v1/settings', patch, this.a(token)),
  };

  // ─── Account ──────────────────────────────────────────────
  account = {
    session: (token?: string) =>
      this.api.get<{ user: UserProfile; sessionExpAt: string }>('/api/v1/session', this.a(token)),
    delete: (token?: string) =>
      this.api.delete<void>('/api/v1/account/delete', this.a(token)),
  };

  // ─── Admin (operator-only) ────────────────────────────────
  admin = {
    reconcile: (token?: string) =>
      this.api.post<AdminReconcileResult>('/api/v1/admin/reconcile', undefined, this.a(token)),
    orphans: (token?: string) =>
      this.api.get<OrphanList>('/api/v1/admin/orphans', this.a(token)),
  };

  // ─── Health (no auth) ─────────────────────────────────────
  health() {
    return this.api.get<{ status: string }>('/api/v1/health');
  }
}
