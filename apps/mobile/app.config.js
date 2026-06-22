const fs = require("fs");
const path = require("path");

const appJson = require("./app.json");

const monorepoRoot = path.resolve(__dirname, "../..");
const envLocalPath = path.join(monorepoRoot, ".env.local");

const COMPANION_KEYS = [
  "DOUBAO_VOICE_APP_ID",
  "DOUBAO_VOICE_ACCESS_TOKEN",
  "DOUBAO_VOICE_SECRET_KEY",
  "MODELSCOPE_LLM_BASE_URL",
  "MODELSCOPE_LLM_API_KEY",
  "MODELSCOPE_LLM_MODEL",
];

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseEnvFile(text) {
  const entries = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    const value = stripQuotes(line.slice(eq + 1).trim());
    if (key) {
      entries[key] = value;
    }
  }
  return entries;
}

/** Dev-only companion secrets for Metro / dev-client — never for store release profiles. */
function loadCompanionDevEnv() {
  if (process.env.EAS_BUILD_PROFILE === "production") {
    return undefined;
  }
  if (!fs.existsSync(envLocalPath)) {
    return undefined;
  }
  const parsed = parseEnvFile(fs.readFileSync(envLocalPath, "utf8"));
  const companionDevEnv = {};
  for (const key of COMPANION_KEYS) {
    const value = parsed[key];
    if (typeof value === "string" && value.length > 0) {
      companionDevEnv[key] = value;
    }
  }
  return Object.keys(companionDevEnv).length > 0 ? companionDevEnv : undefined;
}

const companionDevEnv = loadCompanionDevEnv();

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      ...(companionDevEnv ? { companionDevEnv } : {}),
    },
  },
};
