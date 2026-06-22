const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
process.chdir(projectRoot);

const entryFileArgIndex = process.argv.indexOf("--entry-file");
if (entryFileArgIndex >= 0 && process.argv[entryFileArgIndex + 1]) {
  process.argv[entryFileArgIndex + 1] = path.join(projectRoot, "index.js");
}

require(require.resolve("@expo/cli", { paths: [require.resolve("expo/package.json")] }));
