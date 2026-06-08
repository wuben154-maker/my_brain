import { readAppEnv } from "@/lib/env";
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
import { createStorageProvider } from "@/storage/createStorageProvider";
import { useAppStore } from "@/stores/appStore";
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

  const storage = createStorageProvider();
  store.setStorage(storage);

  const defs = createBootCheckDefinitions(env, storage);

  store.beginSelfCheckLaunch(toPendingChecks(defs));
  store.appendBootLog("[BOOT] VOICE SYSTEM CHECK…");

  const providers = createAppProviders({
    openAiApiKey: env.openAiApiKey,
    openAiLlmModel: env.openAiLlmModel,
    openAiRealtimeModel: env.openAiRealtimeModel,
    everMemOsBaseUrl: env.everMemOsBaseUrl,
    everMemOsApiKey: env.everMemOsApiKey,
    everMemOsUserId: env.everMemOsUserId,
  });
  store.setProviders(providers);

  const apiLog = bootApiKeyLogLine(env);
  if (apiLog) {
    store.appendBootLog(`  ${apiLog}`);
  }

  launchSpeechAbort = new AbortController();
  const speechSignal = launchSpeechAbort.signal;

  try {
    await providers.voice.connect({ apiKey: env.openAiApiKey ?? "" });
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
        const graph = await storage.loadGraphForDisplay();
        useGraphStore.getState().setGraph(graph);
        await useProfileStore.getState().loadFromStorage(storage);
        await useProposalStore.getState().load(storage);
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

  store.setLoadingMessage("正在抓取今日 AI 资讯与 GitHub 趋势…");
  store.appendBootLog("> 抓取 RSS / GitHub 趋势…");
  const newsResults = await providers.news.fetchAll();
  const newsQueue = flattenNewsItems(newsResults);
  store.setNewsQueue(newsQueue);
  store.appendBootLog(`  候选资讯 ${newsQueue.length} 条`);

  await sleep(800);
  store.setPhase("companion");
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
