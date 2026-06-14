import { describe, expect, it } from "vitest";

import { parseGateReport } from "./lib/report-parser.ts";
import { VALID_STAGES } from "./lib/types.ts";

describe("mobile gate verifier", () => {
  it("accepts all documented stages", () => {
    expect(VALID_STAGES).toEqual([
      "M0",
      "M1",
      "M2",
      "M3",
      "M4",
      "M5",
      "M6",
      "M7A",
      "M7B",
      "M7",
    ]);
  });

  it("parses PASS verdict and KNOWLEDGE_OS merged status", () => {
    const report = parseGateReport(
      "specs/mobile-app/reports/M0-GATE-report.md",
      `# M0-GATE 验收报告
- **阶段**：M0
- **判定**：PASS
- **日期**：2026-06-13
- **执行者**：agent
- **监督者**：parent
## Enter 条件核对
## Exit checklist
## 命令证据
## 测试 / E2E / 真机
## Commit / Diff
## 风险与 waivers
KNOWLEDGE_OS_VISION.md merged
## 下一阶段许可
## 父 agent 签核`,
    );

    expect(report.verdict).toBe("PASS");
    expect(report.knowledgeOsStatus).toBe("merged");
    expect(report.fields.stage).toBe(true);
  });

  it("detects expo evidence from command table", () => {
    const report = parseGateReport(
      "specs/mobile-app/reports/M0-GATE-report.md",
      `# M0-GATE 验收报告
- **判定**：PASS
| expo config --type public | 0 | ok |
| expo start --offline smoke | 0 | Metro ready |
- [x] **expo start 实测**
KNOWLEDGE_OS_VISION.md merged`,
    );

    expect(report.expoEvidenceOk).toBe(true);
  });
});
