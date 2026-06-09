import { useMemo } from "react";
import { useGraphStore } from "@/stores/graphStore";
import { useInterviewStore } from "@/stores/interviewStore";

/** KOS-C3 — temporary overlay listing interview prompts + linked concept chips. */
export function InterviewOverlay() {
  const active = useInterviewStore((state) => state.active);
  const questions = useInterviewStore((state) => state.questions);
  const cursor = useInterviewStore((state) => state.cursor);
  const skippedIds = useInterviewStore((state) => state.skippedIds);
  const skip = useInterviewStore((state) => state.skip);
  const next = useInterviewStore((state) => state.next);
  const nodes = useGraphStore((state) => state.nodes);

  const nodeTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const node of nodes) {
      map.set(node.id, node.title);
    }
    return map;
  }, [nodes]);

  if (questions.length === 0) {
    return null;
  }

  const showList = questions.length >= 5;

  return (
    <div
      data-testid="interview-overlay"
      role="region"
      aria-label="面试模式"
      className="pointer-events-auto absolute inset-x-4 top-16 z-30 mx-auto max-w-2xl rounded-lg border border-violet-500/35 bg-bg-elevated/90 p-4 text-body shadow-lg backdrop-blur-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-caption uppercase tracking-wide text-violet-300/80">
            面试模式
          </p>
          <h2 className="mt-1 text-h3 text-primary">
            {active
              ? `第 ${Math.min(cursor + 1, questions.length)} / ${questions.length} 题`
              : "本轮结束"}
          </h2>
        </div>
        {active ? (
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="interview-skip-btn"
              onClick={() => skip()}
              className="rounded-md border border-violet-500/40 px-2 py-1 text-caption text-secondary transition hover:text-primary"
            >
              跳过
            </button>
            <button
              type="button"
              data-testid="interview-next-btn"
              onClick={() => next()}
              className="rounded-md border border-violet-500/40 px-2 py-1 text-caption text-secondary transition hover:text-primary"
            >
              下一题
            </button>
          </div>
        ) : null}
      </div>

      {showList ? (
        <ul
          data-testid="interview-question-list"
          className="mt-3 space-y-3 max-h-[40vh] overflow-y-auto"
        >
          {questions.map((question, index) => {
            const isCurrent = active && index === cursor;
            const isSkipped = skippedIds.includes(question.id);
            return (
              <li
                key={question.id}
                data-testid={`interview-item-${question.id}`}
                className={`rounded-md border p-3 ${
                  isCurrent
                    ? "border-violet-400/60 bg-violet-950/30"
                    : "border-white/10 bg-black/20"
                }`}
              >
                <p className="text-caption text-violet-200/80">
                  {question.id}
                  {isSkipped ? " · 已跳过" : ""}
                  {question.depth === "advanced" ? " · 进阶" : ""}
                </p>
                <p className="mt-1 text-sm text-primary">{question.prompt}</p>
                {question.scaffold ? (
                  <p className="mt-1 text-caption text-secondary">
                    {question.scaffold}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {question.linkedNodeIds.map((nodeId) => (
                    <span
                      key={nodeId}
                      data-testid={`interview-chip-${question.id}-${nodeId}`}
                      className="rounded-full border border-cyan-500/30 bg-cyan-950/40 px-2 py-0.5 text-xs text-cyan-100"
                    >
                      {nodeTitleById.get(nodeId) ?? nodeId}
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
