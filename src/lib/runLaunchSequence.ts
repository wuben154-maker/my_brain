import { readAppEnv } from "@/lib/env";
import {
  BOOT_CHECK_VISIBLE_MS,
  BOOT_INTRO_MS,
  BOOT_MIN_TOTAL_MS,
  BOOT_STAGGER_MS,
  BOOT_TAIL_MS,
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

const STORAGE_CHECK = {
  id: "storage",
  label: "本地知识库",
} as const;

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

/** Launch pipeline: boot intro → self-check + voice → loading → companion. */
export async function runLaunchSequence(): Promise<void> {
  if (launchStarted) {
    return;
  }
  launchStarted = true;

  const bootStartedAt = Date.now();
  const store = useAppStore.getState();
  const env = readAppEnv();
  const defs = createBootCheckDefinitions(env);

  store.setPhase("boot");
  await sleep(BOOT_INTRO_MS);

  store.resetBoot();
  store.setSelfChecks([
    ...toPendingChecks(defs),
    { id: STORAGE_CHECK.id, label: STORAGE_CHECK.label, status: "pending" },
  ]);
  store.appendBootLog("[BOOT] INITIALIZING SECOND BRAIN…");

  const storage = createStorageProvider();
  store.setStorage(storage);

  const providers = createAppProviders({
    openAiApiKey: env.openAiApiKey,
    openAiLlmModel: env.openAiLlmModel,
    openAiRealtimeModel: env.openAiRealtimeModel,
    everMemOsBaseUrl: env.everMemOsBaseUrl,
    everMemOsApiKey: env.everMemOsApiKey,
    everMemOsUserId: env.everMemOsUserId,
  });
  store.setProviders(providers);

  launchSpeechAbort = new AbortController();
  const speechSignal = launchSpeechAbort.signal;

  try {
    await providers.voice.connect({ apiKey: env.openAiApiKey ?? "" });
  } catch {
    store.appendBootLog("  语音通道未连接，自检将仅显示文字");
  }

  let speechSkipped = false;
  const totalChecks = defs.length + 1;

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

    const item = useAppStore.getState().selfChecks.find((c) => c.id === def.id);
    if (item) {
      const { skipped } = await speakSelfCheck([item], providers.voice, {
        signal: speechSignal,
      });
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

  const storageOk = await runSingleBootCheck(
    STORAGE_CHECK.id,
    STORAGE_CHECK.label,
    async () => {
      try {
        await storage.init();
        const graph = await storage.loadGraphForDisplay();
        useGraphStore.getState().setGraph(graph);
        await useProfileStore.getState().loadFromStorage(storage);
        await useProposalStore.getState().load(storage);
        store.appendBootLog("  SQLite 读写 · 图谱与用户画像已加载");
        return { ok: true };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "本地数据库初始化失败";
        store.appendBootLog(`  ERROR: ${message}`);
        store.setError(message);
        return { ok: false };
      }
    },
  );
  if (!storageOk) {
    return;
  }

  const storageItem = useAppStore
    .getState()
    .selfChecks.find((c) => c.id === STORAGE_CHECK.id);
  if (storageItem && !speechSkipped && !speechSignal.aborted) {
    await speakSelfCheck([storageItem], providers.voice, {
      signal: speechSignal,
    });
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

  if (id === STORAGE_CHECK.id && !result.ok) {
    return false;
  }

  if (!result.ok && !BOOT_ALLOW_DEGRADED && id !== STORAGE_CHECK.id) {
    return false;
  }

  return true;
}
