import type { SyncPayload, SyncProvider, SyncPullResult, SyncPushResult } from "./types.js";

/**
 * In-memory mock SyncProvider for deterministic two-device harness tests.
 * Simulates JSON snapshot exchange without network SDK.
 */
export class MockSyncProvider implements SyncProvider {
  readonly deviceId: string;
  private remoteStore: SyncPayload | null = null;
  private resumeToken: string | undefined;

  constructor(deviceId: string) {
    this.deviceId = deviceId;
  }

  seedRemote(payload: SyncPayload): void {
    this.remoteStore = payload;
  }

  peekRemote(): SyncPayload | null {
    return this.remoteStore;
  }

  async pull(resumeToken?: string): Promise<SyncPullResult> {
    if (resumeToken && resumeToken !== this.resumeToken) {
      return { payload: null, resumeToken: this.resumeToken };
    }
    this.resumeToken = `resume-${this.deviceId}-${Date.now()}`;
    return {
      payload: this.remoteStore,
      resumeToken: this.resumeToken,
    };
  }

  async push(payload: SyncPayload): Promise<SyncPushResult> {
    this.remoteStore = payload;
    this.resumeToken = `resume-${this.deviceId}-${Date.now()}`;
    return { accepted: true, resumeToken: this.resumeToken };
  }
}

export function createTwoDeviceSyncHarness(input: {
  deviceAId?: string;
  deviceBId?: string;
}): {
  providerA: MockSyncProvider;
  providerB: MockSyncProvider;
} {
  const providerA = new MockSyncProvider(input.deviceAId ?? "device-a");
  const providerB = new MockSyncProvider(input.deviceBId ?? "device-b");
  return { providerA, providerB };
}
