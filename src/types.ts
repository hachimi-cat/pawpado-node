export interface SessionStatus {
  state: 'idle' | 'provisioning' | 'starting' | 'running' | 'stopping' | 'stopped' | 'failed';
  instanceId?: string | null;
  publicIp?: string | null;
  tailnetIp?: string | null;
  startedAt?: string | null;
  ready?: boolean;
  message?: string | null;
}

export interface Credits {
  balanceCents: number;
  currency: 'IDR' | 'USD';
  storageGb?: number;
  freeStorageGb?: number;
  asOf: string;
}

export interface TopupSession {
  url: string;
  sessionId: string;
}

export interface Settings {
  storageGb?: number;
  region?: string;
  preferredHours?: string[];
  autoStopMinutes?: number;
}

export interface PairInfo {
  pin: string;
  pairUrl: string;
  expiresAt: string;
}

export interface ConnectInfo {
  host: string;
  port: number;
  password?: string;
}

export interface TailscaleKey {
  authKey: string;
  expiresAt: string;
}

export interface AdminReconcileResult {
  reconciled: number;
  details?: Record<string, unknown>;
}

export interface OrphanList {
  ebs: Array<{ volumeId: string; sizeGb: number; createdAt: string }>;
  amis?: Array<{ imageId: string; sizeGb: number; createdAt: string }>;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  emailVerified?: boolean;
}
