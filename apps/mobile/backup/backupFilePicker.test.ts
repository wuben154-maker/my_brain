import { describe, expect, it } from "vitest";

import {
  pickBackupJsonFile,
  readBackupFilePickerAvailability,
  setBackupFilePickerPort,
} from "./backupFilePicker";

describe("backupFilePicker", () => {
  it("reports unavailable in vitest runtime by default", () => {
    const availability = readBackupFilePickerAvailability();
    expect(availability.available).toBe(false);
    expect(availability.message).toContain("文件选择器不可用");
  });

  it("pickBackupJsonFile returns unavailable hint in vitest runtime", async () => {
    const result = await pickBackupJsonFile();
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.hintCode).toBe("import:file_picker_unavailable");
  });

  it("uses injected port when provided", async () => {
    setBackupFilePickerPort({
      readAvailability() {
        return { available: true, message: "mock picker ready" };
      },
      async pickAndReadJson() {
        return { ok: true, json: '{"manifest":{}}', fileName: "mock.json" };
      },
    });
    const availability = readBackupFilePickerAvailability();
    expect(availability.available).toBe(true);
    const picked = await pickBackupJsonFile();
    expect(picked.ok).toBe(true);
    setBackupFilePickerPort(null);
  });
});
