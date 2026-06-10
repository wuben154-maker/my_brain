import type { AppEnv } from "@/lib/env";
import type { StorageProvider } from "@/storage/types";
import type { BootCheckStatus, SelfCheckItem } from "@/stores/appStore";

export const BOOT_STAGGER_MS = 200;
/** V2 boot intro on black field before self-check. */
export const BOOT_INTRO_MS = 700;
export const BOOT_TAIL_MS = 350;
/** Each diagnostic row stays in「检测中」at least this long so the animation is visible. */
export const BOOT_CHECK_VISIBLE_MS = 450;
/** Minimum time on the boot screen before transitioning to loading. */
export const BOOT_MIN_TOTAL_MS = 3200;

/** Fixed v2 self-check row order (zh labels). */
export const BOOT_CHECK_IDS = [
  "mic",
  "speaker",
  "network",
  "news",
  "storage",
] as const;

export type BootCheckId = (typeof BOOT_CHECK_IDS)[number];

export interface BootCheckResult {
  ok: boolean;
  detail?: string;
  logLine?: string;
}

export interface BootCheckDefinition {
  id: BootCheckId;
  label: string;
  run: () => Promise<BootCheckResult>;
}

export function createBootCheckDefinitions(
  _env: AppEnv,
  storage: StorageProvider,
): BootCheckDefinition[] {
  return [
    {
      id: "mic",
      label: "麦克风",
      run: async () => {
        const ok =
          typeof navigator !== "undefined" &&
          !!navigator.mediaDevices?.getUserMedia;
        return {
          ok,
          logLine: ok ? "麦克风接口可用" : "未检测到 MediaDevices API",
        };
      },
    },
    {
      id: "speaker",
      label: "扬声器",
      run: async () => {
        const ok =
          typeof window !== "undefined" &&
          (typeof AudioContext !== "undefined" ||
            typeof (window as Window & { webkitAudioContext?: typeof AudioContext })
              .webkitAudioContext !== "undefined");
        return {
          ok,
          logLine: ok ? "音频输出接口可用" : "未检测到 Web Audio API",
        };
      },
    },
    {
      id: "network",
      label: "网络",
      run: async () => {
        const ok = typeof navigator !== "undefined" ? navigator.onLine : true;
        return { ok, logLine: ok ? "在线" : "离线" };
      },
    },
    {
      id: "news",
      label: "资讯源",
      run: async () => {
        const ok = typeof navigator !== "undefined" ? navigator.onLine : true;
        return {
          ok,
          logLine: ok ? "RSS · GitHub 趋势模块就绪" : "抓取将在联网后重试",
        };
      },
    },
    {
      id: "storage",
      label: "大脑读写",
      run: async () => {
        try {
          await storage.init();
          return { ok: true, logLine: "SQLite 读写 · 本地知识库就绪" };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "本地数据库初始化失败";
          return { ok: false, detail: message, logLine: `ERROR: ${message}` };
        }
      },
    },
  ];
}

/** Log provider key presence without adding a sixth visible row. */
export function bootApiKeyLogLine(env: AppEnv): string | null {
  if (env.volcAppId && env.volcAccessKey) {
    return "豆包实时语音凭证已配置";
  }
  if (env.openAiApiKey) {
    return "OpenAI Realtime / LLM 密钥已配置";
  }
  if (env.modelscopeApiKey) {
    return "ModelScope 文本 LLM 密钥已配置";
  }
  return "Live API 密钥未配置 · 默认 mock 路径可完整演示";
}

export function toPendingChecks(defs: BootCheckDefinition[]): SelfCheckItem[] {
  return defs.map((def) => ({
    id: def.id,
    label: def.label,
    status: "pending" as BootCheckStatus,
  }));
}

export function statusLabel(status: BootCheckStatus): string {
  switch (status) {
    case "pending":
      return "待命";
    case "syncing":
      return "检测中…";
    case "ok":
      return "检测通过";
    case "warn":
      return "待配置";
  }
}

/** English HUD tag under each zh-CN self-check row. */
export const SELF_CHECK_SUBLABELS: Record<BootCheckId, string> = {
  mic: "AUDIO INPUT",
  speaker: "AUDIO OUTPUT",
  network: "NETWORK LINK",
  news: "FEED SYNC",
  storage: "BRAIN I/O",
};

/** 0–100 progress from completed rows (ok/warn only; syncing stays at prior pct). */
export function computeSelfCheckProgress(checks: SelfCheckItem[]): number {
  if (checks.length === 0) {
    return 0;
  }
  const done = checks.filter(
    (item) => item.status === "ok" || item.status === "warn",
  ).length;
  return Math.round((done / checks.length) * 100);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
