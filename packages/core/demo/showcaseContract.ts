/**
 * Seven-step showcase harness contract — testIds must exist in RN screens/components.
 * Used by showcaseFlow.test.ts and docs/evals/app-demo-showcase-script.md.
 */
export interface ShowcaseStepContract {
  step: number;
  sceneId: string;
  title: string;
  audienceTakeaway: string;
  testIds: readonly string[];
  uiBaselinePng?: string;
}

export const SHOWCASE_FLOW_STEPS: readonly ShowcaseStepContract[] = [
  {
    step: 1,
    sceneId: "cold-start",
    title: "冷启动空态 / 演示星核",
    audienceTakeaway: "活体星图 + 语音光球；无资讯流",
    testIds: ["living-brain-home", "home-voice-orb"],
    uiBaselinePng: "app-development/UI/03-living-brain-home.png",
  },
  {
    step: 2,
    sceneId: "first-ingest",
    title: "第一次对话 → 点亮第一颗星",
    audienceTakeaway: "入库须确认；不是自动写库",
    testIds: ["home-voice-orb", "context-decision-bar-ingest", "context-decision-sheet"],
    uiBaselinePng: "app-development/UI/09-context-sheets.png",
  },
  {
    step: 3,
    sceneId: "today-reason",
    title: "Today 一条推荐 + reason",
    audienceTakeaway: "个性化，非 RSS",
    testIds: ["today-screen", "today-focus-reason"],
    uiBaselinePng: "app-development/UI/04-today.png",
  },
  {
    step: 4,
    sceneId: "capture-inbox",
    title: "Capture Inbox 处理 1 候选",
    audienceTakeaway: "候选 vs 永久图谱；ContextDecisionBar",
    testIds: [
      "capture-inbox-screen",
      "capture-inbox-list",
      "capture-inbox-row-demo-provisional-link-action-light-up",
    ],
    uiBaselinePng: "app-development/UI/05-capture-inbox.png",
  },
  {
    step: 5,
    sceneId: "brain-map-detail",
    title: "Brain Map 点星 → 详情",
    audienceTakeaway: "概念 + 来源 + archive 语义",
    testIds: ["brain-map-screen", "brain-map-constellation", "node-detail-sheet"],
    uiBaselinePng: "app-development/UI/06-brain-map.png",
  },
  {
    step: 6,
    sceneId: "memory-review-evidence",
    title: "Memory Review 一项 evidence",
    audienceTakeaway: "有 evidence 才展示",
    testIds: ["memory-review-screen", "memory-weather-evidence", "memory-replay-evidence"],
    uiBaselinePng: "app-development/UI/07-memory-review.png",
  },
  {
    step: 7,
    sceneId: "settings-provider",
    title: "Settings Provider mock/live",
    audienceTakeaway: "诚实 degraded；非工程面板",
    testIds: ["settings-screen", "provider-mock-banner", "provider-status-llm"],
    uiBaselinePng: "app-development/UI/08-profile-trust-settings.png",
  },
] as const;

export const SHOWCASE_OPTIONAL_ACTION_PREVIEW: ShowcaseStepContract = {
  step: 8,
  sceneId: "action-preview-optional",
  title: "S16 action preview（可选 30s）",
  audienceTakeaway: "建议 ≠ 自动行动",
  testIds: ["settings-cognitive-actions", "action-preview-sheet"],
};
