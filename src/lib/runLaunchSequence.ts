import type { NewsItem } from "@/domain/news";
import { readAppEnv } from "@/lib/env";
import {
  resolveVoiceConnectConfig,
} from "@/lib/voiceConnectConfig";
import {
  bootstrapShowcaseGraph,
  getShowcaseNewsQueue,
  isShowcaseDemoMode,
} from "@/showcase/showcaseDemoMode";
import { createShowcaseGraphSnapshot } from "@/showcase/showcaseFixtures";
import type { BrainGraphSnapshot } from "@/domain/graph";
import {
  BOOT_CHECK_VISIBLE_MS,
  BOOT_MIN_TOTAL_MS,
  BOOT_STAGGER_MS,
  BOOT_TAIL_MS,
  bootApiKeyLogLine,
  createBootCheckDefinitions,
  sleep,
  toPendingChecks,
} from "@/lib/bootSelfCheck";
import { speakSelfCheck } from "@/lib/speakSelfCheck";
import { flattenNewsItems } from "@/providers/news/types";
import { createAppProviders } from "@/providers";
import { runRadarBriefing } from "@/radar/runRadarBriefing";
import { createStorageProvider } from "@/storage/createStorageProvider";
import { useAppStore } from "@/stores/appStore";
import { useBriefingStore } from "@/stores/briefingStore";
import { useGraphStore } from "@/stores/graphStore";
import { useProfileStore } from "@/stores/profileStore";
import { useProposalStore } from "@/stores/proposalStore";

/** When true (default), non-fatal self-check warnings still advance to loading. */
export const BOOT_ALLOW_DEGRADED = true;

let launchStarted = false;
let launchSpeechAbort: AbortController | null = null;

/** Test-only: allow re-running the launch pipeline. */
export function resetLaunchSequenceGuard(): void {
  launchStarted = false;
  launchSpeechAbort = null;
}

/** Barge-in: skip remaining self-check voice lines and continue boot. */
export function skipLaunchSelfCheckSpeech(): void {
  launchSpeechAbort?.abort();
  const voice = useAppStore.getState().providers?.voice;
  if (voice) {
    void voice.interrupt();
  }
}

/** Launch pipeline: self-check + voice → loading → companion (no boot intro screen). */
export async function runLaunchSequence(): Promise<void> {
  if (launchStarted) {
    return;
  }
  launchStarted = true;

  const bootStartedAt = Date.now();
  const store = useAppStore.getState();
  const env = readAppEnv();
  const showcaseMode = isShowcaseDemoMode();
  const radarMode = isRadarLaunchMode();

  const storage = createStorageProvider();
  store.setStorage(storage);

  const defs = createBootCheckDefinitions(env, storage);

  store.beginSelfCheckLaunch(toPendingChecks(defs));
  store.appendBootLog("[BOOT] VOICE SYSTEM CHECK…");

  const providers = createAppProviders(
    {
      openAiApiKey: env.openAiApiKey,
      openAiLlmModel: env.openAiLlmModel,
      openAiRealtimeModel: env.openAiRealtimeModel,
      everMemOsBaseUrl: env.everMemOsBaseUrl,
      everMemOsApiKey: env.everMemOsApiKey,
      everMemOsUserId: env.everMemOsUserId,
      domesticLlmApiKey: env.domesticLlmApiKey,
      domesticLlmBaseUrl: env.domesticLlmBaseUrl,
      modelscopeApiKey: env.modelscopeApiKey,
      modelscopeBaseUrl: env.modelscopeBaseUrl,
      modelscopeLlmModel: env.modelscopeLlmModel,
      volcAppId: env.volcAppId,
      volcAccessKey: env.volcAccessKey,
      volcConnectId: env.volcConnectId,
      volcRealtimeModel: env.volcRealtimeModel,
    },
    { forceMock: showcaseMode },
  );
  store.setProviders(providers);

  const apiLog = bootApiKeyLogLine(env);
  if (apiLog) {
    store.appendBootLog(`  ${apiLog}`);
  }

  launchSpeechAbort = new AbortController();
  const speechSignal = launchSpeechAbort.signal;

  try {
    await providers.voice.connect(resolveVoiceConnectConfig(env));
  } catch {
    store.appendBootLog("  语音通道未连接，自检将仅显示文字");
  }

  let speechSkipped = false;
  const totalChecks = defs.length;

  for (let i = 0; i < defs.length; i++) {
    if (speechSkipped || speechSignal.aborted) {
      break;
    }

    const def = defs[i];
    const finished = await runSingleBootCheck(def.id, def.label, async () => {
      const result = await def.run();
      if (result.logLine) {
        store.appendBootLog(`  ${result.logLine}`);
      }
      return result;
    });
    if (!finished) {
      return;
    }

    if (def.id === "storage" && finished) {
      try {
        if (showcaseMode) {
          await bootstrapShowcaseGraph(storage);
          useGraphStore.getState().setGraph(createShowcaseGraphSnapshot());
        }
        const graph = await storage.loadGraphForDisplay();
        useGraphStore.getState().setGraph(graph);
        await useProfileStore.getState().loadFromStorage(storage);
        await useProposalStore.getState().load(storage);
        await useBriefingStore.getState().loadFromStorage(storage);
        store.appendBootLog("  图谱与用户画像已加载");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "图谱加载失败";
        store.appendBootLog(`  ERROR: ${message}`);
        store.setError(message);
        return;
      }
    }

    const item = useAppStore.getState().selfChecks.find((c) => c.id === def.id);
    if (item && !speechSkipped && !speechSignal.aborted) {
      const finalStatus = item.status;
      const finalDetail = item.detail;
      const { skipped } = await speakSelfCheck([item], providers.voice, {
        signal: speechSignal,
        onItemStart: (id) => store.setSelfCheckStatus(id, "syncing"),
      });
      store.setSelfCheckStatus(def.id, finalStatus, finalDetail);
      if (skipped) {
        speechSkipped = true;
      }
    }

    store.setBootProgress(Math.round(((i + 1) / totalChecks) * 100));
    if (!speechSkipped) {
      await sleep(BOOT_STAGGER_MS);
    }
  }

  if (speechSkipped || speechSignal.aborted) {
    store.appendBootLog("[BOOT] 自检播报已跳过，继续启动…");
  }

  store.setBootProgress(100);
  store.appendBootLog("[BOOT] SELF-CHECK COMPLETE · 进入数据流注入");
  await sleep(BOOT_TAIL_MS);

  const bootElapsed = Date.now() - bootStartedAt;
  if (bootElapsed < BOOT_MIN_TOTAL_MS) {
    await sleep(BOOT_MIN_TOTAL_MS - bootElapsed);
  }

  launchSpeechAbort = null;
  store.setPhase("loading");

  let newsQueue;
  if (showcaseMode) {
    store.setLoadingMessage("Showcase 模式：加载固定演示资讯…");
    store.appendBootLog("> Showcase 固定 briefing（无网络）…");
    newsQueue = getShowcaseNewsQueue();
  } else {
    newsQueue = await runDefaultRadarLaunch({
      providers,
      store,
      explicitRadarFlag: radarMode,
    });
  }
  store.setNewsQueue(newsQueue);
  store.appendBootLog(`  候选资讯 ${newsQueue.length} 条`);

  await sleep(800);
  store.setPhase("companion");
}

/** Query flag `?radar=1` — explicit alias; default launch is already Radar. */
export function isRadarLaunchMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const value = new URLSearchParams(window.location.search).get("radar");
  return value === "1" || value === "true";
}

interface RunDefaultRadarLaunchInput {
  providers: ReturnType<typeof createAppProviders>;
  store: ReturnType<typeof useAppStore.getState>;
  explicitRadarFlag: boolean;
}

async function runDefaultRadarLaunch(
  input: RunDefaultRadarLaunchInput,
): Promise<NewsItem[]> {
  const { providers, store, explicitRadarFlag } = input;
  const radarLabel = explicitRadarFlag ? "Radar（显式 ?radar=1）" : "Radar（默认 mock-first）";
  store.setLoadingMessage("生成今日三条 Radar briefing…");
  store.appendBootLog(`> ${radarLabel} · live 失败则 fixture 兜底 · RSS flatten 仅最后 legacy 兜底…`);

  const graph = resolveRadarRankingGraph();
  const profile = useProfileStore.getState().profile;
  const briefingState = useBriefingStore.getState();

  try {
    const result = await runRadarBriefing({
      providers,
      graph,
      profile,
      feedbackByItemId: briefingState.feedbackByItemId,
      warn: (message) => store.appendBootLog(`  WARN: ${message}`),
    });
    store.setWorldItemStore(result.store);
    briefingState.setTodayItems(result.briefingItems);

    if (result.briefingItems.length > 0) {
      store.appendBootLog(
        `  今日 briefing ${result.briefingItems.length} 条 · active WorldItem ${result.store.listActive().length} 条`,
      );
      return result.newsQueue;
    }

    store.appendBootLog("  WARN: Radar briefing 为空，降级 legacy RSS flatten…");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Radar briefing failed";
    store.appendBootLog(`  WARN: Radar briefing 失败（${message}），降级 legacy RSS flatten…`);
  }

  return runLegacyRssFlatten(providers, store);
}

async function runLegacyRssFlatten(
  providers: ReturnType<typeof createAppProviders>,
  store: ReturnType<typeof useAppStore.getState>,
): Promise<NewsItem[]> {
  store.appendBootLog("> Legacy RSS / GitHub flatten（非默认主路径）…");
  const newsResults = await providers.news.fetchAll();
  const newsQueue = flattenNewsItems(newsResults);
  store.appendBootLog(`  Legacy flatten ${newsQueue.length} 条`);
  return newsQueue;
}

function resolveRadarRankingGraph(): BrainGraphSnapshot {
  const graphState = useGraphStore.getState();
  if (graphState.nodes.length > 0) {
    return { nodes: graphState.nodes, edges: graphState.edges };
  }
  const snapshot = createShowcaseGraphSnapshot();
  useGraphStore.getState().setGraph(snapshot);
  return snapshot;
}

async function runSingleBootCheck(
  id: string,
  label: string,
  run: () => Promise<{ ok: boolean; detail?: string }>,
): Promise<boolean> {
  const store = useAppStore.getState();
  const startedAt = Date.now();
  store.setSelfCheckStatus(id, "syncing");
  store.appendBootLog(`> ${label}`);

  const result = await run();
  const visibleRemaining = BOOT_CHECK_VISIBLE_MS - (Date.now() - startedAt);
  if (visibleRemaining > 0) {
    await sleep(visibleRemaining);
  }

  const status = result.ok ? "ok" : "warn";
  store.setSelfCheckStatus(id, status, result.detail);
  store.appendBootLog(
    result.ok ? `✓ ${label}` : `! ${label} · 待配置`,
  );

  if (id === "storage" && !result.ok) {
    return false;
  }

  if (!result.ok && !BOOT_ALLOW_DEGRADED && id !== "storage") {
    return false;
  }

  return true;
}
