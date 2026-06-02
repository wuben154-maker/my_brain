/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MorningBriefCard } from "@/components/agent/MorningBriefCard";

describe("MorningBriefCard (A4)", () => {
  afterEach(() => {
    cleanup();
  });

  it("dismiss hides card without persisting (callback only)", () => {
    let dismissed = false;
    render(
      createElement(MorningBriefCard, {
        digest: {
          title: "今日简报",
          generatedAt: "2026-06-02T08:00:00.000Z",
          sections: [{ headline: "AI", body: "要闻摘要" }],
        },
        onDismiss: () => {
          dismissed = true;
        },
      }),
    );

    screen.getByRole("button", { name: "关闭简报" }).click();
    expect(dismissed).toBe(true);
  });
});
