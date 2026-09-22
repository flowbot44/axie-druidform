/** Puzzle HP and kit damage. Matching job one-shots; anything else chips. */

export const PUZZLE_HP = 3;

export type KitKind = "slash" | "slam" | "dart" | "seed";
export type PuzzleJob = "slash" | "dart";

export function kitMatchesJob(kind: KitKind, job: PuzzleJob): boolean {
  if (job === "slash") return kind === "slash";
  return kind === "dart" || kind === "seed";
}

/** 3 if this kit is the job, 1 otherwise. HP is 3, so off-kit takes three hits. */
export function puzzleDamage(kind: KitKind, job: PuzzleJob): number {
  return kitMatchesJob(kind, job) ? PUZZLE_HP : 1;
}
