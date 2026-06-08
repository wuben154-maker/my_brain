import { dirname, resolve as pathResolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = pathResolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const subpath = specifier.slice(2);
    const tsPath = pathResolve(projectRoot, "src", `${subpath}.ts`);
    return nextResolve(pathToFileURL(tsPath).href, context);
  }
  return nextResolve(specifier, context);
}
