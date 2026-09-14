export const LEADERBOARD_GIST_ID = "a5fdb966c851f7f55f6f0d521e9ad337";
export const LEADERBOARD_FILE = "druidform-leaderboard.json";
export const LEADERBOARD_TOP = 20;
export const LEADERBOARD_CAP = 100;

export interface ScoreEntry {
  name: string;
  energy: number;
  timeMs: number;
  at: number;
}

export interface LeaderboardFile {
  scores: ScoreEntry[];
}

export function normalizeName(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9 _\-.]/g, "").trim().slice(0, 16);
  return cleaned.length > 0 ? cleaned : "Player";
}

export function sortScores(scores: readonly ScoreEntry[]): ScoreEntry[] {
  return [...scores].sort((a, b) => {
    if (b.energy !== a.energy) return b.energy - a.energy;
    if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
    return a.at - b.at;
  });
}

export function parseBoard(raw: unknown): ScoreEntry[] {
  if (!raw || typeof raw !== "object") return [];
  const scores = (raw as LeaderboardFile).scores;
  if (!Array.isArray(scores)) return [];
  const out: ScoreEntry[] = [];
  for (const row of scores) {
    if (!row || typeof row !== "object") continue;
    const name = normalizeName(String((row as ScoreEntry).name ?? ""));
    const energy = Number((row as ScoreEntry).energy);
    const timeMs = Number((row as ScoreEntry).timeMs);
    const at = Number((row as ScoreEntry).at);
    if (!Number.isFinite(energy) || energy < 0 || energy > 100) continue;
    if (!Number.isFinite(timeMs) || timeMs < 1_000 || timeMs > 3_600_000) continue;
    out.push({
      name,
      energy: Math.floor(energy),
      timeMs: Math.floor(timeMs),
      at: Number.isFinite(at) ? at : 0,
    });
  }
  return sortScores(out).slice(0, LEADERBOARD_CAP);
}

export function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = (totalSec % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

export async function fetchBoard(): Promise<ScoreEntry[]> {
  const res = await fetch("/api/scores");
  if (!res.ok) throw new Error(`board ${res.status}`);
  const data: unknown = await res.json();
  return parseBoard(data);
}

export async function submitScore(entry: {
  name: string;
  energy: number;
  timeMs: number;
}): Promise<ScoreEntry[]> {
  const res = await fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error(`submit ${res.status}`);
  const data: unknown = await res.json();
  return parseBoard(data);
}
