const GIST_ID = "a5fdb966c851f7f55f6f0d521e9ad337";
const FILE = "druidform-leaderboard.json";
const CAP = 100;
const GIST_URL = `https://api.github.com/gists/${GIST_ID}`;

function normalizeName(raw) {
  const cleaned = String(raw ?? "")
    .replace(/[^a-zA-Z0-9 _\-.]/g, "")
    .trim()
    .slice(0, 16);
  return cleaned.length > 0 ? cleaned : "Player";
}

function sortScores(scores) {
  return [...scores].sort((a, b) => {
    if (b.energy !== a.energy) return b.energy - a.energy;
    if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
    return a.at - b.at;
  });
}

function parseBoard(raw) {
  const scores = raw && Array.isArray(raw.scores) ? raw.scores : [];
  const out = [];
  for (const row of scores) {
    if (!row || typeof row !== "object") continue;
    const energy = Number(row.energy);
    const timeMs = Number(row.timeMs);
    const at = Number(row.at);
    if (!Number.isFinite(energy) || energy < 0 || energy > 100) continue;
    if (!Number.isFinite(timeMs) || timeMs < 1000 || timeMs > 3600000) continue;
    out.push({
      name: normalizeName(row.name),
      energy: Math.floor(energy),
      timeMs: Math.floor(timeMs),
      at: Number.isFinite(at) ? at : 0,
    });
  }
  return sortScores(out).slice(0, CAP);
}

function token() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
}

function headers(write) {
  const h = {
    Accept: "application/vnd.github+json",
    "User-Agent": "axie-druidform",
  };
  const t = token();
  if (t) h.Authorization = `Bearer ${t}`;
  if (write) h["Content-Type"] = "application/json";
  return h;
}

async function readScores() {
  const res = await fetch(GIST_URL, { headers: headers(false) });
  if (!res.ok) throw new Error(`gist ${res.status}`);
  const gist = await res.json();
  const raw = gist.files?.[FILE]?.content || '{"scores":[]}';
  return parseBoard(JSON.parse(raw));
}

async function writeScores(scores) {
  const t = token();
  if (!t) throw new Error("missing GITHUB_TOKEN");
  const res = await fetch(GIST_URL, {
    method: "PATCH",
    headers: headers(true),
    body: JSON.stringify({
      files: {
        [FILE]: {
          content: JSON.stringify({ scores: sortScores(scores).slice(0, CAP) }),
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`gist patch ${res.status}`);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") {
      res.status(200).json({ scores: await readScores() });
      return;
    }
    if (req.method === "POST") {
      const incoming = req.body || {};
      const next = {
        name: normalizeName(incoming.name),
        energy: Math.floor(Number(incoming.energy)),
        timeMs: Math.floor(Number(incoming.timeMs)),
        at: Date.now(),
      };
      if (!Number.isFinite(next.energy) || next.energy < 0 || next.energy > 100) {
        res.status(400).json({ error: "bad energy" });
        return;
      }
      if (!Number.isFinite(next.timeMs) || next.timeMs < 1000 || next.timeMs > 3600000) {
        res.status(400).json({ error: "bad time" });
        return;
      }
      const scores = await readScores();
      scores.push(next);
      const ranked = sortScores(scores).slice(0, CAP);
      await writeScores(ranked);
      res.status(200).json({ scores: ranked });
      return;
    }
    res.status(405).json({ error: "method" });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "fail" });
  }
}
