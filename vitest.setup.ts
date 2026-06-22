/**
 * Shared vitest bootstrap for monorepo (web + mobile suites).
 */
(globalThis as { __DEV__?: boolean }).__DEV__ = false;

if (!(globalThis as { expo?: unknown }).expo) {
  (globalThis as { expo: { EventEmitter: new () => unknown } }).expo = {
    EventEmitter: class EventEmitter {
      addListener() {
        return { remove() {} };
      }
      removeListener() {}
      removeAllListeners() {}
      emit() {}
    },
  };
}
