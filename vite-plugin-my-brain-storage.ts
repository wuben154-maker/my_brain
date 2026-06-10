import type { Plugin } from "vite";

const PREFIX = "/__my_brain/storage";
const BACKEND_MODULE = "/src/storage/adapters/betterSqliteBackend.ts";

interface StorageBackendModule {
  BetterSqliteBackend: new (options: { dbPath: string }) => StorageBackend;
  defaultWebDbPath: () => string;
}

/** Minimal surface used by dev middleware; avoids config-time module graph pulls. */
interface StorageBackend {
  init(): void;
  close(): void;
  loadGraph(): unknown;
  listGraphHistory(): unknown;
  listLearningTraces(): unknown;
  listCognitiveActions(): unknown;
  listBriefingFeedback(): unknown;
  loadGraphForDisplay(): unknown;
  loadUserProfile(): unknown;
  listPendingProposals(): unknown;
  getAppMeta(key: string): unknown;
  loadAgentUsage(usageDate: string): unknown;
  saveConcept(body: unknown): void;
  saveProject(body: unknown): void;
  saveSource(body: unknown): void;
  saveDecision(body: unknown): void;
  saveQuestion(body: unknown): void;
  saveSkill(body: unknown): void;
  deleteConcept(id: string): void;
  deleteProject(id: string): void;
  deleteSource(id: string): void;
  deleteDecision(id: string): void;
  deleteQuestion(id: string): void;
  deleteSkill(id: string): void;
  saveEdge(body: unknown): void;
  deleteEdge(id: string): void;
  syncEdgesSnapshot(body: unknown): void;
  saveUserProfile(body: unknown): void;
  saveProposal(body: unknown): void;
  setProposalStatus(id: string, status: unknown): void;
  setAppMeta(key: string, value: string): void;
  saveGraphHistoryEntry(body: unknown): void;
  setGraphHistoryUndone(id: string): void;
  saveLearningTrace(body: unknown): void;
  saveCognitiveAction(body: unknown): void;
  saveBriefingFeedback(body: unknown): void;
  addAgentUsage(usageDate: string, tokens: number): void;
}

/**
 * Web-dev-only storage bridge: exposes better-sqlite3 to the browser during `pnpm dev`.
 * Not used by Brain MCP, production Tauri builds, or any external write surface.
 */
export function myBrainStoragePlugin(): Plugin {
  return {
    name: "my-brain-storage",
    configureServer(server) {
      let backend: StorageBackend | null = null;
      let backendReady: Promise<void> | null = null;

      const ensureBackend = async (): Promise<void> => {
        if (backend) {
          return;
        }
        if (!backendReady) {
          backendReady = (async () => {
            const mod = (await server.ssrLoadModule(
              BACKEND_MODULE,
            )) as StorageBackendModule;
            backend = new mod.BetterSqliteBackend({
              dbPath: mod.defaultWebDbPath(),
            });
          })();
        }
        await backendReady;
      };

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

          if (path === "/learning-traces" && req.method === "GET") {
            res.end(JSON.stringify(backend!.listLearningTraces()));
            return;
          }

          if (path === "/cognitive-actions" && req.method === "GET") {
            res.end(JSON.stringify(backend!.listCognitiveActions()));
            return;
          }

          if (path === "/briefing-feedback" && req.method === "GET") {
            res.end(JSON.stringify(backend!.listBriefingFeedback()));
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

            if (path === "/project") {
              backend!.saveProject(body);
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (path === "/source") {
              backend!.saveSource(body);
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (path === "/decision") {
              backend!.saveDecision(body);
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (path === "/question") {
              backend!.saveQuestion(body);
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (path === "/skill") {
              backend!.saveSkill(body);
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (path === "/concept/delete") {
              backend!.deleteConcept(String(body.id));
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (path === "/project/delete") {
              backend!.deleteProject(String(body.id));
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (path === "/source/delete") {
              backend!.deleteSource(String(body.id));
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (path === "/decision/delete") {
              backend!.deleteDecision(String(body.id));
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (path === "/question/delete") {
              backend!.deleteQuestion(String(body.id));
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (path === "/skill/delete") {
              backend!.deleteSkill(String(body.id));
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

            if (path === "/edges/sync") {
              backend!.syncEdgesSnapshot(body.edges);
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

            if (path === "/learning-traces/save") {
              backend!.saveLearningTrace(body);
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (path === "/cognitive-actions/save") {
              backend!.saveCognitiveAction(body);
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (path === "/briefing-feedback/save") {
              backend!.saveBriefingFeedback(body);
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
