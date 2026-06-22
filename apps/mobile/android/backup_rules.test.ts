import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("android backup_rules", () => {
  it("excludes SQLite databases from Auto Backup", () => {
    const xmlPath = join(__dirname, "backup_rules.xml");
    const xml = readFileSync(xmlPath, "utf8");
    expect(xml).toContain('domain="database"');
    expect(xml).toContain('path="."');
    expect(xml).toContain("exclude");
  });

  it("excludes SecureStore shared preferences from Auto Backup", () => {
    const xmlPath = join(__dirname, "backup_rules.xml");
    const xml = readFileSync(xmlPath, "utf8");
    expect(xml).toContain('domain="sharedpref"');
    expect(xml).toContain('path="SecureStore"');
  });
});
