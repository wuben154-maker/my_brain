import { useCallback } from "react";

import { SafeAreaView, StatusBar, StyleSheet } from "react-native";



import { MigrationGate } from "./boot/MigrationGate";

import { useStorageBootstrap } from "./boot/storageBootstrap";

import { LaunchScreen } from "./screens/LaunchScreen";

import { LivingBrainHome } from "./screens/LivingBrainHome";

import { hydrateMobileStores } from "./stores/persistHydrate";

import { useMobileAppStore } from "./stores/mobileAppStore";

import { colors } from "./theme/tokens";



export default function App() {

  const phase = useMobileAppStore((s) => s.phase);

  const storageReady = useMobileAppStore((s) => s.storageReady);

  const finishLaunch = useMobileAppStore((s) => s.finishLaunch);

  const onLaunchDone = useCallback(() => finishLaunch(), [finishLaunch]);



  const onHydrated = useCallback((bundle: Parameters<typeof hydrateMobileStores>[0]) => {

    hydrateMobileStores(bundle, useMobileAppStore.getState().hasApiKey);

    useMobileAppStore.setState({

      providerStatus: { ...bundle.providerConfig, storage: "ready" },

    });

  }, []);



  const { status, error, schemaVersion, retry } = useStorageBootstrap(onHydrated);



  return (

    <SafeAreaView style={styles.root}>

      <StatusBar barStyle="light-content" />

      {status !== "ready" ? (

        <MigrationGate

          status={status}

          schemaVersion={schemaVersion}

          errorMessage={error}

          onRetry={retry}

        />

      ) : phase === "launch" ? (

        <LaunchScreen onDone={onLaunchDone} />

      ) : storageReady ? (

        <LivingBrainHome />

      ) : (

        <MigrationGate status="migrating" schemaVersion={schemaVersion} />

      )}

    </SafeAreaView>

  );

}



const styles = StyleSheet.create({

  root: {

    flex: 1,

    backgroundColor: colors.background,

  },

});


