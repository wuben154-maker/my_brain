import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { flattenNewsItems } from "@/providers/news/types";
import { createAppProviders } from "@/providers";
import { createStorageProvider } from "@/storage/createStorageProvider";
import { useAppStore } from "@/stores/appStore";
import { useGraphStore } from "@/stores/graphStore";
import { readAppEnv } from "@/lib/env";

async function runLaunchSequence(): Promise<void> {
  const store = useAppStore.getState();
  const env = readAppEnv();

  store.setSelfChecks([
    {
      id: "mic",
      label: "麦克风 / 扬声器",
      ok: typeof navigator !== "undefined" && !!navigator.mediaDevices,
    },
    {
      id: "network",
      label: "网络连接",
      ok: typeof navigator !== "undefined" ? navigator.onLine : true,
    },
    {
      id: "api_key",
      label: "OpenAI API Key",
      ok: Boolean(env.openAiApiKey),
      detail: env.openAiApiKey ? undefined : "在 .env 中设置 VITE_OPENAI_API_KEY",
    },
    {
      id: "storage",
      label: "本地知识库",
      ok: true,
    },
  ]);

  await new Promise((resolve) => setTimeout(resolve, 600));
  store.setPhase("loading");

  const storage = createStorageProvider();
  store.setStorage(storage);

  try {
    await storage.init();
    const graph = await storage.loadGraph();
    useGraphStore.getState().setGraph(graph);
  } catch (error) {
    store.setError(
      error instanceof Error ? error.message : "本地数据库初始化失败",
    );
    return;
  }

  const providers = createAppProviders(env);
  store.setProviders(providers);

  store.setLoadingMessage("正在抓取今日 AI 资讯与 GitHub 趋势…");
  const newsResults = await providers.news.fetchAll();
  const newsQueue = flattenNewsItems(newsResults);
  store.setNewsQueue(newsQueue);

  await new Promise((resolve) => setTimeout(resolve, 800));
  store.setPhase(newsQueue.length > 0 ? "ready" : "onboarding");
}

export default function App() {
  useEffect(() => {
    void runLaunchSequence();
  }, []);

  return (
    <div className="min-h-screen bg-brain-bg text-slate-100">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-brain-muted">
              my_brain
            </p>
            <h1 className="text-lg font-medium text-white">你的 AI 大脑伴侣</h1>
          </div>
          <p className="text-xs text-slate-500">本地优先 · 语音优先 · 图谱共建</p>
        </div>
      </header>
      <main className="mx-auto h-[calc(100vh-73px)] max-w-7xl p-4">
        <AppShell />
      </main>
    </div>
  );
}
