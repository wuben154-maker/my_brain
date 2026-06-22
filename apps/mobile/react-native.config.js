/**
 * Expo's package react-native.config.js requires expo-modules-autolinking at load time,
 * which fails when Gradle evaluates it via require-from-string (mocked module paths only).
 * Without this override, RN autolinking falls back to namespace "expo.core" + ExpoModulesPackage
 * even though the class lives in expo.modules.
 */
module.exports = {
  dependencies: {
    expo: {
      platforms: {
        android: {
          packageImportPath: 'import expo.modules.ExpoModulesPackage;',
          packageInstance: 'new ExpoModulesPackage()',
        },
      },
    },
  },
};
