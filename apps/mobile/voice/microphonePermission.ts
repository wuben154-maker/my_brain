export type MicrophonePermissionStatus = "granted" | "denied" | "undetermined";

export interface MicrophonePermissionPort {
  getStatus(): Promise<MicrophonePermissionStatus>;
  request(): Promise<MicrophonePermissionStatus>;
}

/** Vitest / CI memory port — no native permission APIs. */
export function createMemoryMicrophonePermissionPort(
  initial: MicrophonePermissionStatus = "granted",
): MicrophonePermissionPort {
  let status = initial;
  return {
    async getStatus() {
      return status;
    },
    async request() {
      if (status === "undetermined") {
        status = "granted";
      }
      return status;
    },
  };
}

async function readAndroidMicPermission(): Promise<MicrophonePermissionStatus> {
  const { PermissionsAndroid, Platform } = await import("react-native");
  if (Platform.OS !== "android") {
    return "undetermined";
  }
  const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  if (granted) {
    return "granted";
  }
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  if (result === PermissionsAndroid.RESULTS.GRANTED) {
    return "granted";
  }
  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    return "denied";
  }
  return "denied";
}

async function readIosMicPermission(): Promise<MicrophonePermissionStatus> {
  // Dev Client native hook lands in M6; M3 documents undetermined until AVAudioSession bridge ships.
  return "undetermined";
}

/** Platform microphone permission adapter — manifest strings live in app.json. */
export function createDeviceMicrophonePermissionPort(): MicrophonePermissionPort {
  return {
    async getStatus() {
      const { Platform } = await import("react-native");
      if (Platform.OS === "android") {
        const { PermissionsAndroid } = await import("react-native");
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        );
        return granted ? "granted" : "undetermined";
      }
      if (Platform.OS === "ios") {
        return readIosMicPermission();
      }
      return "undetermined";
    },
    async request() {
      const { Platform } = await import("react-native");
      if (Platform.OS === "android") {
        return readAndroidMicPermission();
      }
      if (Platform.OS === "ios") {
        return readIosMicPermission();
      }
      return "undetermined";
    },
  };
}
