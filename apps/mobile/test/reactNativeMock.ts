/** Minimal react-native stub for node/happy-dom vitest (avoids Flow `import typeof` parse errors). */
export const Platform = {
  OS: "android" as const,
  Version: "14",
  select<T extends Record<string, unknown>>(options: T): T[keyof T] {
    return (options.android ?? options.default ?? Object.values(options)[0]) as T[keyof T];
  },
};

export const NativeModules = {
  Voice: {
    isAvailable: async () => true,
    start: async () => {},
    stop: async () => {},
    cancel: async () => {},
    destroy: async () => {},
    removeAllListeners: () => {},
    isRecognizing: async () => false,
  },
};

export const NativeEventEmitter = class NativeEventEmitter {
  addListener() {
    return { remove: () => {} };
  }
  removeAllListeners() {}
};

export const AppState = {
  currentState: "active",
  addEventListener: () => ({ remove: () => {} }),
};

export const Linking = {
  openURL: async () => {},
  getInitialURL: async () => null,
  addEventListener: () => ({ remove: () => {} }),
};

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T) => styles,
  hairlineWidth: 1,
};

export const View = "div";
export const Text = "span";
export const Pressable = "button";
export const ScrollView = "div";
export const SafeAreaView = "div";
export const StatusBar = () => null;
export const Modal = ({ children, visible }: { children?: unknown; visible?: boolean }) =>
  visible ? children : null;
export const Switch = () => null;
export const Share = { share: async () => {} };
export const useColorScheme = () => "dark";
export const useWindowDimensions = () => ({
  width: 390,
  height: 844,
  scale: 1,
  fontScale: 1,
});

const reactNativeMock = {
  Platform,
  NativeModules,
  NativeEventEmitter,
  AppState,
  Linking,
  StyleSheet,
  View,
  Text,
};

export default reactNativeMock;
