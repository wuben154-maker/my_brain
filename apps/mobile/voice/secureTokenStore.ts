export interface SecureTokenRecord {
  accessToken: string;
  expiresAt: string;
}

export interface SecureTokenStore {
  get(key: string): Promise<SecureTokenRecord | null>;
  set(key: string, value: SecureTokenRecord): Promise<void>;
  delete(key: string): Promise<void>;
}

const VOICE_TOKEN_KEY = "voice.shortLivedToken";

/** Vitest / mock-first in-memory secure store — no disk persistence. */
export function createMemorySecureTokenStore(): SecureTokenStore {
  const bag = new Map<string, SecureTokenRecord>();
  return {
    async get(key) {
      return bag.get(key) ?? null;
    },
    async set(key, value) {
      bag.set(key, value);
    },
    async delete(key) {
      bag.delete(key);
    },
  };
}

export function voiceTokenStorageKey(): string {
  return VOICE_TOKEN_KEY;
}
