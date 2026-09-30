// What Pawpado's routes take and return (frontend/src/app/api/v1/**/route.ts). Every
// route is also in `client.api` (generated from the API spec); these types cover the
// hand-written namespaces.

/** A session row, as the session routes return it. */
export interface Session {
  id: string;
  state: 'requested' | 'starting' | 'running' | 'stopping' | 'stopped' | 'failed' | (string & {});
  instanceId?: string | null;
  workspaceId?: string;
  userId?: string;
  [field: string]: unknown;
}

/** `sessions.start()` / `sessions.stop()`. */
export interface SessionResult {
  ok: true;
  session: Session;
  /** stop only: whether it was a forced stop, and a throwaway machine's teardown. */
  forced?: boolean;
  destroyed?: boolean;
  saves?: string;
}

/** `sessions.poll()`: the session (live, else the latest) and its machine. */
export interface SessionPoll {
  session: Session | null;
  instance: { state: string; publicIp: string | null; [field: string]: unknown } | null;
  tailnet?: { ready: boolean } | null;
  error?: string;
}

/** `sessions.pair()` input: the 4-digit PIN Moonlight shows. */
export interface PairInput {
  pin: string;
  deviceName?: string;
  via?: 'desktop' | 'mobile';
}

/** `sessions.connect()`: how to reach the running machine. */
export interface ConnectInfo {
  status: 'no_workspace' | 'no_session' | 'ready' | 'registering' | (string & {});
  session: { id: string; state: string; instanceId: string | null; updatedAtMs: number | null } | null;
  desktop: { host: string | null; ports: { sunshineHttps: number; sunshineWeb: number } } | null;
  mobile: { host: string | null; hostname: string | null; online: boolean } | null;
  rdp: { host: string; port: number; username: string; password: string } | null;
  apollo: { url: string; adminUser: string; adminPassword: string } | null;
  moonlight: Record<string, string>;
  tailscaleLinks: Record<string, string>;
}

/** `sessions.tailscaleKey()`: a fresh single-use Tailscale auth key for a device. */
export interface TailscaleKey {
  ok: true;
  key: string;
  expiresAt: string;
  usedStatic: boolean;
}

/** `credits.me()`: the workspace's wallet and its 25 latest transactions. */
export interface Credits {
  wallet: { workspaceId: string; balanceIdrCents: number; updatedAt: string };
  transactions: Array<{ id: string; kind: string; amountIdrCents: number; createdAt: string; [field: string]: unknown }>;
  /** name is null when called with an API key. */
  workspace: { id: string; name: string | null; role: 'owner' | 'admin' | 'member' };
}

/** `credits.topup()` input: an IDR amount, or USD cents (charged via PayPal). */
export type TopupInput = { amountIdr: number; amountUsdCents?: never } | { amountUsdCents: number; amountIdr?: never };

/** `credits.topup()`: a checkout to send the payer to. */
export interface TopupSession {
  ok: true;
  checkoutUrl: string;
  checkoutSessionId: string;
}

/** `billing.storage()`: the storage sizes on offer, in GB. */
export interface StorageOptions {
  presets: number[];
  min: number;
  max: number;
}

/** `billing.resizeStorage()`: the new size (owner/admin; disks only grow). */
export interface StorageResize {
  ok: true;
  storageGb: number;
  result: unknown;
}

/** Stream launch options, validated by the server (see PATCH /api/v1/settings). */
export interface LaunchOptions {
  fps?: 30 | 60 | 120;
  hdr?: boolean;
  transport?: 'auto' | 'webrtc' | 'websocket';
  muteAudio?: boolean;
  resolution?: '360p' | '720p' | '1080p' | '1440p' | '4k' | 'full' | 'custom';
  customWidth?: number;
  customHeight?: number;
}

/** A person's settings row. */
export interface Settings {
  idleAutoStopMinutes: number | null;
  playMode: 'browser' | 'moonlight' | null;
  /** JSON text of LaunchOptions, as stored. */
  launchOptions: string | null;
  [field: string]: unknown;
}

/** `settings.update()` input — send only what changes. */
export interface SettingsPatch {
  /** null turns idle auto-stop off. */
  idleAutoStopMinutes?: number | null;
  playMode?: 'browser' | 'moonlight';
  launchOptions?: LaunchOptions;
}
