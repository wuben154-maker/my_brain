import type { AppEnv } from "@/lib/env";
import type { BootCheckStatus, SelfCheckItem } from "@/stores/appStore";

export const BOOT_STAGGER_MS = 200;
/** V0 boot intro on black field before self-check (V1 adds motion). */
export const BOOT_INTRO_MS = 700;
export const BOOT_TAIL_MS = 350;
/** Each diagnostic row stays in「检测中」at least this long so the animation is visible. */
export const BOOT_CHECK_VISIBLE_MS = 450;
/** Minimum time on the boot screen before transitioning to loading. */
export const BOOT_MIN_TOTAL_MS = 3200;

export interface BootCheckResult {
  ok: boolean;
  detail?: string;
  logLine?: string;
}

export interface BootCheckDefinition {
  id: string;
  label: string;
  run: () => Promise<BootCheckResult>;
}

export function createBootCheckDefinitions(env: AppEnv): BootCheckDefinition[] {
  return [
    {
      id: "mic",
      label: "麦克风 / 扬声器",
      run: async () => {
        const ok =
          typeof navigator !== "undefined" && !!navigator.mediaDevices;
        return {
          ok,
          logLine: ok ? "音频 I/O 接口可用" : "未检测到 MediaDevices API",
        };
      },
    },
    {
      id: "network",
      label: "网络连接",
      run: async () => {
        const ok = typeof navigator !== "undefined" ? navigator.onLine : true;
        return { ok, logLine: ok ? "在线" : "离线" };
      },
    },
    {
      id: "api_key",
      label: "OpenAI API Key",
      run: async () => {
        const ok = Boolean(env.openAiApiKey);
        return {
          ok,
          detail: ok ? undefined : "在 .env 中设置 VITE_OPENAI_API_KEY",
          logLine: ok ? "Realtime / LLM 密钥已配置" : "语音与摘要功能将受限",
        };
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
  ];
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
      return "检测中";
    case "ok":
      return "就绪";
    case "warn":
      return "待配置";
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
