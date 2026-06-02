import { readAppEnv } from "@/lib/env";
import {
  BOOT_CHECK_VISIBLE_MS,
  BOOT_MIN_TOTAL_MS,
  BOOT_STAGGER_MS,
  BOOT_TAIL_MS,
  createBootCheckDefinitions,
  sleep,
  toPendingChecks,
} from "@/lib/bootSelfCheck";
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

let launchStarted = false;

/** Launch pipeline: animated boot self-check → loading → ready/onboarding. */
export async function runLaunchSequence(): Promise<void> {
  if (launchStarted) {
    return;
  }
  launchStarted = true;

  const bootStartedAt = Date.now();
  const store = useAppStore.getState();
  const env = readAppEnv();
  const defs = createBootCheckDefinitions(env);

  store.resetBoot();
  store.setSelfChecks([
    ...toPendingChecks(defs),
    { id: STORAGE_CHECK.id, label: STORAGE_CHECK.label, status: "pending" },
  ]);
  store.appendBootLog("[BOOT] INITIALIZING SECOND BRAIN…");

  const storage = createStorageProvider();
  store.setStorage(storage);

  for (let i = 0; i < defs.length; i++) {
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
    store.setBootProgress(
      Math.round(((i + 1) / (defs.length + 1)) * 100),
    );
    await sleep(BOOT_STAGGER_MS);
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

  store.setBootProgress(100);
  store.appendBootLog("[BOOT] SELF-CHECK COMPLETE · 进入数据流注入");
  await sleep(BOOT_TAIL_MS);

  const bootElapsed = Date.now() - bootStartedAt;
  if (bootElapsed < BOOT_MIN_TOTAL_MS) {
    await sleep(BOOT_MIN_TOTAL_MS - bootElapsed);
  }

  store.setPhase("loading");

  const providers = createAppProviders(env);
  store.setProviders(providers);

  store.setLoadingMessage("正在抓取今日 AI 资讯与 GitHub 趋势…");
  store.appendBootLog("> 抓取 RSS / GitHub 趋势…");
  const newsResults = await providers.news.fetchAll();
  const newsQueue = flattenNewsItems(newsResults);
  store.setNewsQueue(newsQueue);
  store.appendBootLog(`  候选资讯 ${newsQueue.length} 条`);

  await sleep(800);
  store.setPhase(newsQueue.length > 0 ? "ready" : "onboarding");
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
  store.setSelfCheckStatus(id, result.ok ? "ok" : "warn", result.detail);
  store.appendBootLog(
    result.ok ? `✓ ${label}` : `! ${label} · 待配置`,
  );

  if (id === STORAGE_CHECK.id && !result.ok) {
    return false;
  }
  return true;
}
