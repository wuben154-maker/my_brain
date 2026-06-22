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

async function loadSecureStore() {
  return import("expo-secure-store");
}

/** Production adapter — short-lived voice tokens via expo-secure-store (ADR 0002). */
export function createExpoSecureTokenStore(): SecureTokenStore {
  return {
    async get(key) {
      const SecureStore = await loadSecureStore();
      const raw = await SecureStore.getItemAsync(key);
      if (!raw) {
        return null;
      }
      try {
        return JSON.parse(raw) as SecureTokenRecord;
      } catch {
        return null;
      }
    },
    async set(key, value) {
      const SecureStore = await loadSecureStore();
      await SecureStore.setItemAsync(key, JSON.stringify(value));
    },
    async delete(key) {
      const SecureStore = await loadSecureStore();
      await SecureStore.deleteItemAsync(key);
    },
  };
}

export function voiceTokenStorageKey(): string {
  return VOICE_TOKEN_KEY;
}
