import type Phaser from "phaser";
import type { PartyMember } from "./constants.ts";
import { isCatClass, isHeavyClass } from "./forms.ts";

/**
 * Team Rating — scores the run based on energy, verb routes, composition.
 *
 * Judges see a letter grade (S/A/B/C/D) and a factor breakdown showing
 * what they could do differently. This is the replay hook.
 */

export interface RatingFactor {
  label: string;
  points: number;
  maxPoints: number;
  earned: boolean;
}

export interface TeamRatingResult {
  letter: string;
  score: number;
  maxScore: number;
  factors: RatingFactor[];
}

type LineageKind = "heavy" | "slash" | "flyer";

function lineageOf(cls: string): LineageKind {
  if (isHeavyClass(cls as any)) return "heavy";
  if (isCatClass(cls as any)) return "slash";
  return "flyer";
}

export function calculateRating(scene: Phaser.Scene): TeamRatingResult {
  const energy = (scene.registry.get("energy") as number) ?? 0;
  const party = (scene.registry.get("party") as PartyMember[] | undefined) ?? [];

  // --- Verb routes ---
  const thornShortcut = (scene.registry.get("verbRoute_thornShortcut") as boolean) ?? false;
  const pierceBonus = (scene.registry.get("verbRoute_pierceBonus") as boolean) ?? false;
  const groundPound = (scene.registry.get("verbRoute_groundPound") as boolean) ?? false;

  // --- Lone Wolf ---
  const loneWolfUsed = (scene.registry.get("loneWolfUsed") as boolean) ?? false;

  // --- Composition analysis ---
  const lineages = new Set(party.map((p) => lineageOf(p.axieClass)));
  const allThreeLineages = lineages.size >= 3;

  const classes = party.map((p) => p.axieClass);
  const monoClass = classes.length >= 3 && classes.every((c) => c === classes[0]);

  // --- Build factors ---
  const factors: RatingFactor[] = [];

  // Energy (uncapped, 1pt per energy)
  factors.push({
    label: "Energy remaining",
    points: energy,
    maxPoints: 80,
    earned: energy > 0,
  });

  // Verb routes (10 each, max 30)
  factors.push({
    label: "Thorn Hold shortcut",
    points: thornShortcut ? 10 : 0,
    maxPoints: 10,
    earned: thornShortcut,
  });
  factors.push({
    label: "Pierce bonus eye",
    points: pierceBonus ? 10 : 0,
    maxPoints: 10,
    earned: pierceBonus,
  });
  factors.push({
    label: "Bear Ground Pound",
    points: groundPound ? 10 : 0,
    maxPoints: 10,
    earned: groundPound,
  });

  // Lone Wolf
  factors.push({
    label: "Lone Wolf used",
    points: loneWolfUsed ? 10 : 0,
    maxPoints: 10,
    earned: loneWolfUsed,
  });

  // Lineage coverage (mutually exclusive with mono)
  factors.push({
    label: "All 3 lineages",
    points: allThreeLineages ? 10 : 0,
    maxPoints: 10,
    earned: allThreeLineages,
  });

  // Mono-class bonus (mutually exclusive with lineage)
  factors.push({
    label: "Mono-class challenge",
    points: monoClass ? 15 : 0,
    maxPoints: 15,
    earned: monoClass,
  });

  const score = factors.reduce((sum, f) => sum + f.points, 0);
  const maxScore = 80 + 30 + 10 + 15; // energy + routes + wolf + best of lineage/mono

  let letter: string;
  if (score >= 120) letter = "S";
  else if (score >= 100) letter = "A";
  else if (score >= 80) letter = "B";
  else if (score >= 60) letter = "C";
  else letter = "D";

  return { letter, score, maxScore, factors };
}
