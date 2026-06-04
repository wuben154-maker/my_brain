import type { Plugin } from "vite";

const PREFIX = "/__my_brain/storage";

type StorageBackendModule = typeof import("./src/storage/adapters/betterSqliteBackend");
type BetterSqliteBackend = StorageBackendModule["BetterSqliteBackend"];

/** Exposes better-sqlite3 to the browser build during `pnpm dev`. */
export function myBrainStoragePlugin(): Plugin {
  let backend: InstanceType<BetterSqliteBackend> | null = null;
  let backendReady: Promise<void> | null = null;

  const ensureBackend = async (): Promise<void> => {
    if (backend) {
      return;
    }
    if (!backendReady) {
      backendReady = (async () => {
        const mod: StorageBackendModule = await import(
          "./src/storage/adapters/betterSqliteBackend"
        );
        backend = new mod.BetterSqliteBackend({ dbPath: mod.defaultWebDbPath() });
      })();
    }
    await backendReady;
  };

  return {
    name: "my-brain-storage",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith(PREFIX)) {
          next();
          return;
        }

        try {
          await ensureBackend();
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Storage init error",
            }),
          );
          return;
        }

        const path = req.url.slice(PREFIX.length) || "/";
        res.setHeader("Content-Type", "application/json");

        try {
          if (path === "/init" && req.method === "POST") {
            backend?.init();
            res.end(JSON.stringify({ ok: true }));
            return;
          }

          if (path === "/close" && req.method === "POST") {
            backend?.close();
            res.end(JSON.stringify({ ok: true }));
            return;
          }

          backend?.init();

          if (path === "/graph" && req.method === "GET") {
            res.end(JSON.stringify(backend!.loadGraph()));
            return;
          }

          if (path === "/graph-history" && req.method === "GET") {
            res.end(JSON.stringify(backend!.listGraphHistory()));
            return;
          }

          if (path === "/graph/display" && req.method === "GET") {
            res.end(JSON.stringify(backend!.loadGraphForDisplay()));
            return;
          }

          if (path === "/profile" && req.method === "GET") {
            res.end(JSON.stringify(backend!.loadUserProfile()));
            return;
          }

          if (path === "/proposals/pending" && req.method === "GET") {
            res.end(JSON.stringify(backend!.listPendingProposals()));
            return;
          }

          const metaMatch = path.match(/^\/meta\/(.+)$/);
          if (metaMatch && req.method === "GET") {
            const key = decodeURIComponent(metaMatch[1]);
            res.end(JSON.stringify(backend!.getAppMeta(key)));
            return;
          }

          const usageMatch = path.match(/^\/agent-usage\/(.+)$/);
          if (usageMatch && req.method === "GET") {
            const usageDate = decodeURIComponent(usageMatch[1]);
            res.end(JSON.stringify(backend!.loadAgentUsage(usageDate)));
            return;
          }

          if (req.method === "POST") {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
            }
            const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));

            if (path === "/concept") {
              backend!.saveConcept(body);
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (path === "/concept/delete") {
              backend!.deleteConcept(String(body.id));
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (path === "/edge") {
              backend!.saveEdge(body);
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (path === "/edge/delete") {
              backend!.deleteEdge(String(body.id));
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (path === "/profile") {
              backend!.saveUserProfile(body);
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (path === "/proposals/save") {
              backend!.saveProposal(body);
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (path === "/proposals/status") {
              backend!.setProposalStatus(String(body.id), body.status);
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (path === "/meta") {
              backend!.setAppMeta(String(body.key), String(body.value));
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (path === "/graph-history/save") {
              backend!.saveGraphHistoryEntry(body);
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (path === "/graph-history/undone") {
              backend!.setGraphHistoryUndone(String(body.id));
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (path === "/agent-usage") {
              backend!.addAgentUsage(
                String(body.usageDate),
                Number(body.tokens),
              );
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (path === "/graph-history/save") {
              backend!.saveGraphHistoryEntry(body);
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (path === "/graph-history/undone") {
              backend!.setGraphHistoryUndone(String(body.id));
              res.end(JSON.stringify({ ok: true }));
              return;
            }
          }

          if (path === "/graph-history" && req.method === "GET") {
            res.end(JSON.stringify(backend!.listGraphHistory()));
            return;
          }

          res.statusCode = 404;
          res.end(JSON.stringify({ error: "Not found" }));
        } catch (error) {
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Storage error",
            }),
          );
        }
      });
    },
  };
}
