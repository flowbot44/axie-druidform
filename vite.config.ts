// @ts-nocheck — Node APIs; game tsc only includes src/
import { defineConfig, type Plugin } from "vite";
import { spawn } from "node:child_process";
import {
  LEADERBOARD_CAP,
  LEADERBOARD_FILE,
  LEADERBOARD_GIST_ID,
  normalizeName,
  parseBoard,
  sortScores,
  type ScoreEntry,
} from "./src/config/leaderboard.ts";

function ghApi(args: string[], input?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("gh", ["api", ...args]);
    let out = "";
    let err = "";
    child.stdout.on("data", (d: { toString: () => string }) => {
      out += d.toString();
    });
    child.stderr.on("data", (d: { toString: () => string }) => {
      err += d.toString();
    });
    child.on("error", reject);
    child.on("close", (code: number) => {
      if (code === 0) resolve(out);
      else reject(new Error(err.trim() || `gh ${code}`));
    });
    if (input) child.stdin.write(input);
    child.stdin.end();
  });
}

async function readGist(): Promise<ScoreEntry[]> {
  const rawJson = await ghApi([`gists/${LEADERBOARD_GIST_ID}`]);
  const gist = JSON.parse(rawJson) as {
    files?: Record<string, { content?: string }>;
  };
  const raw = gist.files?.[LEADERBOARD_FILE]?.content ?? '{"scores":[]}';
  return parseBoard(JSON.parse(raw) as unknown);
}

function writeGist(scores: ScoreEntry[]): Promise<void> {
  const body = JSON.stringify({
    files: {
      [LEADERBOARD_FILE]: {
        content: JSON.stringify({
          scores: sortScores(scores).slice(0, LEADERBOARD_CAP),
        }),
      },
    },
  });
  return ghApi(["-X", "PATCH", `gists/${LEADERBOARD_GIST_ID}`, "--input", "-"], body).then(
    () => undefined,
  );
}

function leaderboardDev(): Plugin {
  return {
    name: "leaderboard-dev",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url !== "/api/scores") {
          next();
          return;
        }
        const send = (status: number, data: unknown) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");
          res.end(JSON.stringify(data));
        };
        void (async () => {
          try {
            if (req.method === "GET") {
              send(200, { scores: await readGist() });
              return;
            }
            if (req.method === "POST") {
              const raw = await new Promise<string>((resolve, reject) => {
                let acc = "";
                req.on("data", (c: string | Uint8Array) => {
                  acc += c.toString();
                });
                req.on("end", () => resolve(acc));
                req.on("error", reject);
              });
              const incoming = JSON.parse(raw || "{}") as Partial<ScoreEntry>;
              const next: ScoreEntry = {
                name: normalizeName(String(incoming.name ?? "Player")),
                energy: Math.floor(Number(incoming.energy)),
                timeMs: Math.floor(Number(incoming.timeMs)),
                at: Date.now(),
              };
              if (!Number.isFinite(next.energy) || next.energy < 0 || next.energy > 100) {
                send(400, { error: "bad energy" });
                return;
              }
              if (
                !Number.isFinite(next.timeMs) ||
                next.timeMs < 1_000 ||
                next.timeMs > 3_600_000
              ) {
                send(400, { error: "bad time" });
                return;
              }
              const scores = await readGist();
              scores.push(next);
              const ranked = sortScores(scores).slice(0, LEADERBOARD_CAP);
              await writeGist(ranked);
              send(200, { scores: ranked });
              return;
            }
            send(405, { error: "method" });
          } catch (err) {
            send(500, { error: err instanceof Error ? err.message : "fail" });
          }
        })();
      });
    },
  };
}

export default defineConfig({
  base: "./",
  build: {
    target: "ES2020",
  },
  plugins: [leaderboardDev()],
});
