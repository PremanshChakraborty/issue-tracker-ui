import { Redis } from "@upstash/redis";

/**
 * Lazily initialized Redis client.
 *
 * Redis.fromEnv() reads UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * at call time. We defer creation to request time so Next.js build-time
 * static analysis doesn't fail when env vars aren't present.
 */
let _kv: Redis | null = null;

function getKv(): Redis {
  if (!_kv) _kv = Redis.fromEnv();
  return _kv;
}

export interface InstallationRecord {
  installation_id: number;
  repo_owner: string;
  repo_name: string;
  installed_at: string;
}

export interface TelegramConnectToken {
  installation_id: number;
  github_user_id: number;
}

export const getInstallation = (id: number) =>
  getKv().get<InstallationRecord>(`installation:${id}`);

export const setInstallation = (id: number, v: InstallationRecord) =>
  getKv().set(`installation:${id}`, v);

export const getTelegramToken = (uuid: string) =>
  getKv().get<TelegramConnectToken>(`telegram:connect:${uuid}`);

export const setTelegramToken = (uuid: string, v: TelegramConnectToken) =>
  getKv().set(`telegram:connect:${uuid}`, v, { ex: 600 }); // 10 min TTL

export const delTelegramToken = (uuid: string) =>
  getKv().del(`telegram:connect:${uuid}`);

export const getTelegramStatus = (id: number) =>
  getKv().get<{ connected_at: string }>(`telegram:connected:${id}`);

export const setTelegramStatus = (id: number) =>
  getKv().set(`telegram:connected:${id}`, {
    connected_at: new Date().toISOString(),
  });

export interface ActivationRecord {
  activated_at: string;
}

export const getActivated = (id: number) =>
  getKv().get<ActivationRecord>(`activated:${id}`);

export const setActivated = (id: number) =>
  getKv().set(`activated:${id}`, { activated_at: new Date().toISOString() });
