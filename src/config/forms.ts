import type { AxieClass, AxiePartClasses } from "./constants.ts";

export type DruidForm = "bear" | "cat" | "hawk";

export const FORM_BY_SLOT: readonly DruidForm[] = ["bear", "cat", "hawk"];

const BEAR: readonly AxieClass[] = ["Plant", "Reptile", "Dusk"];
const CAT: readonly AxieClass[] = ["Beast", "Bug", "Mech"];
const HAWK: readonly AxieClass[] = ["Bird", "Aqua", "Dawn"];

export function defaultFormFor(cls: AxieClass): DruidForm {
  if (BEAR.includes(cls)) return "bear";
  if (CAT.includes(cls)) return "cat";
  return "hawk";
}

export function formFromSlot(slot: number): DruidForm | null {
  if (slot === 1) return "bear";
  if (slot === 2) return "cat";
  if (slot === 3) return "hawk";
  return null;
}

export function lineageGroup(form: DruidForm): readonly AxieClass[] {
  if (form === "bear") return BEAR;
  if (form === "cat") return CAT;
  return HAWK;
}

/** 3 if this class is native to the form, 1 otherwise. */
export function lineageScore(cls: AxieClass, form: DruidForm): number {
  return lineageGroup(form).includes(cls) ? 3 : 1;
}

// ---------------------------------------------------------------------------
// Part Affinity — count how many of an Axie's 6 body part classes match the
// form's native lineage group. +1 bonus if the Axie's base class also matches.
// Range: 0–7 per Axie.  Pile range: 0–21 for ×3.
// ---------------------------------------------------------------------------

const ALL_SLOTS: readonly (keyof AxiePartClasses)[] = [
  "eyes", "ears", "mouth", "horn", "back", "tail",
];

/**
 * How many of this Axie's parts are native to the given form (0–6),
 * plus +1 if the Axie's base class is also native (0–7 total).
 */
export function partAffinity(
  axieClass: AxieClass,
  partClasses: AxiePartClasses,
  form: DruidForm,
): number {
  const group = lineageGroup(form);
  let count = 0;
  for (const slot of ALL_SLOTS) {
    if (group.includes(partClasses[slot])) count += 1;
  }
  // Base class bonus
  if (group.includes(axieClass)) count += 1;
  return count;
}

/**
 * Sum of part affinities for every Axie in the pile.
 * This is the single number that drives all form stat formulas.
 */
export function pileAffinity(
  pile: readonly { axieClass: AxieClass; partClasses: AxiePartClasses }[],
  form: DruidForm,
): number {
  let total = 0;
  for (const axie of pile) {
    total += partAffinity(axie.axieClass, axie.partClasses, form);
  }
  return total;
}

export function isFlyerClass(cls: AxieClass): boolean {
  return HAWK.includes(cls);
}

export function isHeavyClass(cls: AxieClass): boolean {
  return BEAR.includes(cls);
}

export function isCatClass(cls: AxieClass): boolean {
  return CAT.includes(cls);
}

export function formLabel(form: DruidForm): string {
  if (form === "bear") return "Bear";
  if (form === "cat") return "Cat";
  return "Hawk";
}

/** Layer 1 on a collection card when the body has no named verb. */
export function classJobLine(cls: AxieClass): string {
  if (isHeavyClass(cls)) return `${cls} — plates`;
  if (isCatClass(cls)) return `${cls} — slash`;
  return `${cls} — hover`;
}

export function formColor(form: DruidForm): number {
  if (form === "bear") return 0x8d6e63;
  if (form === "cat") return 0xff9800;
  return 0x42a5f5;
}

// ---------------------------------------------------------------------------
// Form stat formulas — now driven by pile affinity instead of flat class count.
//
// All formulas guarantee "any trio can finish" with floors / ceilings that
// match the GDD §9 minimums.  Better affinity = less energy spent = higher
// score, never gated.
// ---------------------------------------------------------------------------

/**
 * Plate stays down this long after Bear steps off.
 * Floor 2s (any trio can cross).  Affinity 21 (3 pure Plants) → 5.25s.
 * Old formula: max(2000, rating * 400) where rating was 3–9.
 */
export function bearHoldMs(pileAffinityValue: number): number {
  return Math.max(2_000, pileAffinityValue * 250);
}

/**
 * Cat slash energy cost.  High affinity → 1.  Low → 2.
 * Threshold at affinity 4 (e.g., one Beast with good parts).
 * Old formula: max(1, 2 - catClassCount).
 */
export function catSlashCost(pileAffinityValue: number): number {
  return pileAffinityValue >= 4 ? 1 : 2;
}

/**
 * Hawk dart energy cost.  Need meaningful Bird presence (affinity ≥ 4).
 * Old formula: hasFlyer ? 1 : 2.
 */
export function hawkDartCost(pileAffinityValue: number): number {
  return pileAffinityValue >= 4 ? 1 : 2;
}

/**
 * Hawk hover speed multiplier.  Each affinity point adds 5%.
 * Floor ×1.0 (any trio can still Hawk).  Affinity 21 → ×2.05.
 * Old formula: 1 + 0.15 * flyerCount.
 */
export function hawkSpeedMul(pileAffinityValue: number): number {
  return 1 + 0.05 * pileAffinityValue;
}

