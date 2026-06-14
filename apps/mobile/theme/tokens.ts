/** M1 dark theme tokens — aligned with DESIGN_SYSTEM.md */
export const colors = {
  background: "#14161C",
  surface: "#1E2129",
  primary: "#7B8CFF",
  accent: "#FF8A7A",
  text: "#F4F2EF",
  textMuted: "#9BA3B4",
  danger: "#E86B5A",
  success: "#6BCB9A",
} as const;

export const copy = {
  intents: {
    ingest: "记住这个",
    skip: "先不用",
    explain: "多说点",
  },
  home: {
    emptyTitle: "这里还空着",
    emptyBody: "聊几句，我就知道怎么陪你。第一颗星，会来自你的话。",
    startChat: "开始聊",
  },
} as const;
