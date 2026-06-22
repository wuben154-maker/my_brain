/** Stub @edkimmel/expo-audio-stream for vitest (no native module in CI/node). */
export const Pipeline = class Pipeline {
  static readonly RECORDER = "recorder";
};

export const ExpoPlayAudioStream = {
  async startMicrophone() {
    return { subscription: { remove: () => {} } };
  },
  async stopMicrophone() {},
  toggleSilence(_muted: boolean) {},
};
