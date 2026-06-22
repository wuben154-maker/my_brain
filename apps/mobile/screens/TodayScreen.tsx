import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import type { PendingIngestProposal } from "@my-brain/core";

import { ContextDecisionSheet } from "../components/ContextDecisionSheet";
import { DegradedModeBanner } from "../components/DegradedModeBanner";
import { TodayEntryCard } from "../components/TodayEntryCard";
import {
  TODAY_PAGE_COPY,
  TODAY_VISUAL_FIXTURE_ENTRIES,
  type TodayEntryViewModel,
} from "../components/todayEntryModel";
import { ContextDecisionBar } from "../components/ui/ContextDecisionBar";
import { PageHeader } from "../components/ui/PageHeader";
import { VoiceOrb } from "../components/ui/VoiceOrb";
import { useContextCandidate } from "../hooks/useContextCandidate";
import { useConversationSession } from "../hooks/useConversationSession";
import { BackButton } from "../navigation/BackButton";
import { useNavigation } from "../navigation/NavigationContext";
import {
  selectTodayEntryViewModels,
  useMobileAppStore,
} from "../stores/mobileAppStore";
import { useProvisionalStore } from "../stores/provisionalStore";
import { useTheme } from "../theme/ThemeProvider";
import { safeArea, type IntentKey } from "../theme/tokens";
import { isVisualFixtureRoute } from "../visual-fixtures/captureSession";

function mapIntentKey(key: IntentKey): "ingest" | "skip" | "explain_more" {
  if (key === "detail") {
    return "explain_more";
  }
  return key;
}

function proposalForEntry(entry: TodayEntryViewModel): PendingIngestProposal {
  return {
    id: `today-proposal-${entry.id}`,
    concept: entry.title.slice(0, 32),
    intro: entry.reasonText,
    sourceLinks: entry.id ? [entry.id] : [],
    signalId: entry.signalIndex !== null ? entry.id : undefined,
    createdAt: new Date().toISOString(),
  };
}

export function TodayScreen() {
  const todayVisualCapture = isVisualFixtureRoute("TodayScreen");
  const { goBack } = useNavigation();
  const { mode: themeMode, colors } = useTheme();
  const signals = useMobileAppStore((s) => s.signals);
  const userProfile = useMobileAppStore((s) => s.userProfile);
  const graph = useMobileAppStore((s) => s.graph);
  const history = useMobileAppStore((s) => s.history);
  const storageReady = useMobileAppStore((s) => s.storageReady);
  const degraded = useMobileAppStore((s) => s.degraded);
  const pendingIngestProposal = useMobileAppStore((s) => s.pendingIngestProposal);
  const setPendingIngestProposal = useMobileAppStore((s) => s.setPendingIngestProposal);
  const pendingCount = useProvisionalStore((s) => s.listPending().length);
  const { focusSignal, dispatchIntent, confirmPendingIngest } = useConversationSession();
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const entries = useMemo(
    () =>
      todayVisualCapture
        ? TODAY_VISUAL_FIXTURE_ENTRIES
        : selectTodayEntryViewModels(
            { userProfile, signals, graph, history },
            pendingCount,
          ),
    [todayVisualCapture, userProfile, signals, graph, history, pendingCount],
  );

  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? null;

  const voiceOrbState = degraded.active.includes("voice_disconnected")
    ? "degraded"
    : "idle";

  const selectEntry = useCallback(
    (entry: TodayEntryViewModel) => {
      setSelectedEntryId(entry.id);
      if (entry.signalIndex !== null) {
        focusSignal(entry.signalIndex);
      }
    },
    [focusSignal],
  );

  const proposeIngest = useCallback(
    (entry: TodayEntryViewModel) => {
      selectEntry(entry);
      setPendingIngestProposal(proposalForEntry(entry));
      setSheetOpen(true);
    },
    [selectEntry, setPendingIngestProposal],
  );

  const contextCandidate = useContextCandidate({
    labelVariant: "today",
    selectedEntryId,
    todayEntry: selectedEntry,
    onProposeIngest: () => {
      if (selectedEntry) {
        proposeIngest(selectedEntry);
      }
    },
    onClearSelection: () => setSelectedEntryId(null),
  });

  const handleCardAction = useCallback(
    (entry: TodayEntryViewModel, intent: IntentKey) => {
      if (intent === "ingest") {
        proposeIngest(entry);
        return;
      }
      selectEntry(entry);
      if (intent === "skip") {
        setPendingIngestProposal(null);
        setSheetOpen(false);
        return;
      }
      dispatchIntent(mapIntentKey(intent));
      setSheetOpen(true);
    },
    [dispatchIntent, proposeIngest, selectEntry, setPendingIngestProposal],
  );

  const contextActions = useMemo(
    () =>
      contextCandidate
        ? [
            {
              key: "ingest" as const,
              onPress: () => {
                contextCandidate.onIngest();
                setSheetOpen(true);
              },
            },
            {
              key: "skip" as const,
              onPress: () => {
                contextCandidate.onSkip();
                setSheetOpen(false);
              },
            },
            {
              key: "detail" as const,
              onPress: () => {
                dispatchIntent(mapIntentKey("detail"));
                setSheetOpen(true);
              },
              variant: "primary" as const,
            },
          ]
        : [],
    [contextCandidate, dispatchIntent],
  );

  const sheetVisible =
    sheetOpen && (pendingIngestProposal !== null || contextCandidate !== null);

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background },
        todayVisualCapture ? styles.rootFixture : null,
      ]}
      testID="today-screen"
    >
      <PageHeader
        title={todayVisualCapture ? "Today" : TODAY_PAGE_COPY.title}
        subtitle={TODAY_PAGE_COPY.subtitle}
        themeMode={themeMode}
        variant={todayVisualCapture ? "contract" : "default"}
        leftSlot={todayVisualCapture ? undefined : <BackButton onPress={goBack} />}
      />

      {!todayVisualCapture ? <DegradedModeBanner codes={degraded.active} /> : null}

      <ScrollView style={styles.scroll} testID="today-entry-list">
        {!storageReady && entries.length === 0 ? (
          <View style={styles.emptyState} testID="today-storage-not-ready">
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {TODAY_PAGE_COPY.storageNotReady}
            </Text>
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.emptyState} testID="today-empty-state">
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {TODAY_PAGE_COPY.emptyTitle}
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              {TODAY_PAGE_COPY.emptyBody}
            </Text>
          </View>
        ) : (
          <>
            {!storageReady ? (
              <View style={styles.storageBanner} testID="today-storage-not-ready">
                <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                  {TODAY_PAGE_COPY.storageNotReady}
                </Text>
              </View>
            ) : null}
            {entries.map((entry) => (
              <TodayEntryCard
                key={entry.id}
                entry={entry}
                themeMode={themeMode}
                selected={selectedEntryId === entry.id}
                onSelect={() => selectEntry(entry)}
                onAction={(intent) => handleCardAction(entry, intent)}
                testID={`today-entry-${entry.id}`}
              />
            ))}
          </>
        )}
      </ScrollView>

      <View style={styles.voiceDock} testID="today-voice-dock">
        <Text
          style={[styles.voiceHint, { color: colors.textSecondary }]}
          testID="today-voice-hint"
        >
          {TODAY_PAGE_COPY.voiceHint}
        </Text>
        <VoiceOrb state={voiceOrbState} themeMode={themeMode} testID="today-voice-orb" />
      </View>

      {todayVisualCapture ? null : contextCandidate ? (
        <ContextDecisionBar
          actions={contextActions}
          labelVariant="today"
          themeMode={themeMode}
        />
      ) : null}

      {todayVisualCapture ? null : contextCandidate ? (
        <ContextDecisionSheet
          visible={sheetVisible}
          title={contextCandidate.title}
          whyRecommended={contextCandidate.whyRecommended}
          labelVariant="sheet"
          themeMode={themeMode}
          onIngest={() => {
            confirmPendingIngest();
            setSheetOpen(false);
            setSelectedEntryId(null);
          }}
          onSkip={() => {
            contextCandidate.onSkip();
            setSheetOpen(false);
          }}
          onDetail={() => contextCandidate.onDetail()}
          onDismiss={() => {
            setSheetOpen(false);
            setPendingIngestProposal(null);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: safeArea.screenTopChrome,
  },
  rootFixture: {
    paddingTop: 0,
  },
  scroll: {
    flex: 1,
  },
  emptyState: {
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 24,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  storageBanner: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 4,
  },
  voiceDock: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  voiceHint: {
    fontSize: 13,
    lineHeight: 18,
  },
});
