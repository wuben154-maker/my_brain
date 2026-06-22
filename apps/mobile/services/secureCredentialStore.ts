export type CredentialKind = "llm_api_key" | "voice_api_key" | "short_lived_token";

const KEY_PREFIX = "provider.credential.";

export interface SecureCredentialStore {
  has(kind: CredentialKind): Promise<boolean>;
  /** Returns the stored secret for connection tests — never log or display in UI. */
  get(kind: CredentialKind): Promise<string | null>;
  getLast4(kind: CredentialKind): Promise<string | null>;
  set(kind: CredentialKind, value: string): Promise<void>;
  delete(kind: CredentialKind): Promise<void>;
}

function storageKey(kind: CredentialKind): string {
  return `${KEY_PREFIX}${kind}`;
}

export function maskCredentialLast4(last4: string | null): string {
  if (!last4) {
    return "未配置";
  }
  return `••••${last4}`;
}

/** In-memory adapter for vitest — never persists to disk. */
export function createMemorySecureCredentialStore(): SecureCredentialStore {
  const bag = new Map<string, string>();
  return {
    async has(kind) {
      return bag.has(storageKey(kind));
    },
    async get(kind) {
      return bag.get(storageKey(kind)) ?? null;
    },
    async getLast4(kind) {
      const value = bag.get(storageKey(kind));
      if (!value) {
        return null;
      }
      return value.slice(-4);
    },
    async set(kind, value) {
      bag.set(storageKey(kind), value);
    },
    async delete(kind) {
      bag.delete(storageKey(kind));
    },
  };
}

async function loadSecureStore() {
  return import("expo-secure-store");
}

/** Production adapter — long-lived user keys via expo-secure-store only. */
export function createExpoSecureCredentialStore(): SecureCredentialStore {
  return {
    async has(kind) {
      const SecureStore = await loadSecureStore();
      const raw = await SecureStore.getItemAsync(storageKey(kind));
      return Boolean(raw);
    },
    async get(kind) {
      const SecureStore = await loadSecureStore();
      return SecureStore.getItemAsync(storageKey(kind));
    },
    async getLast4(kind) {
      const SecureStore = await loadSecureStore();
      const raw = await SecureStore.getItemAsync(storageKey(kind));
      if (!raw) {
        return null;
      }
      return raw.slice(-4);
    },
    async set(kind, value) {
      const SecureStore = await loadSecureStore();
      await SecureStore.setItemAsync(storageKey(kind), value);
    },
    async delete(kind) {
      const SecureStore = await loadSecureStore();
      await SecureStore.deleteItemAsync(storageKey(kind));
    },
  };
}

let singleton: SecureCredentialStore | null = null;

export function getSecureCredentialStore(): SecureCredentialStore {
  if (!singleton) {
    singleton =
      typeof process !== "undefined" && process.env.VITEST
        ? createMemorySecureCredentialStore()
        : createExpoSecureCredentialStore();
  }
  return singleton;
}

export function resetSecureCredentialStoreForTests(): void {
  singleton = null;
}
