import type { AxieClass } from "./constants.ts";

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

export function formColor(form: DruidForm): number {
  if (form === "bear") return 0x8d6e63;
  if (form === "cat") return 0xff9800;
  return 0x42a5f5;
}

/** Plate stays down this long after a Bear steps off. Floor 2s so any trio can cross. */
export function bearHoldMs(bearRating: number): number {
  return Math.max(2_000, bearRating * 400);
}

export function catSlashCost(catLineageCount: number): number {
  return Math.max(1, 2 - catLineageCount);
}

export function hawkDartCost(hasFlyer: boolean): number {
  return hasFlyer ? 1 : 2;
}

export function hawkSpeedMul(hawkLineageCount: number): number {
  return 1 + 0.15 * hawkLineageCount;
}
