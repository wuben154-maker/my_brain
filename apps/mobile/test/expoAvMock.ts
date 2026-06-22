export const Audio = {
  setAudioModeAsync: async () => {},
  Sound: class Sound {
    static async createAsync() {
      return { sound: new Sound(), status: {} };
    }
    async unloadAsync() {}
    async playAsync() {}
    async stopAsync() {}
  },
  Recording: class Recording {
    static async createAsync() {
      return { recording: new Recording(), status: {} };
    }
    async stopAndUnloadAsync() {
      return { uri: null, status: {} };
    }
  },
};

export default { Audio };
