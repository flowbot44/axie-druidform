import type { AxieClass, AxieEvolved, AxieParts } from "./constants.ts";
import type Phaser from "phaser";
import { isCatClass, isFlyerClass, isHeavyClass, type DruidForm } from "./forms.ts";

/** Named-part verbs. Affinity still owns numbers. One verb per form per pile. */

export type BearVerb = "thorn_hold" | "root_pull";
export type CatVerb = "cleave";
export type HawkVerb = "pierce" | "split" | "tailwind";
export type PartVerb = BearVerb | CatVerb | HawkVerb;

export const THORN_HOLD_MS = 2_000;
export const CLEAVE_ARC_DEG = 150;
export const CLEAVE_REACH_MUL = 1.15;
export const SPLIT_SPREAD_DEG = 15;
export const TAILWIND_MS = 2_000;
export const TAILWIND_MUL = 2;
export const ROOT_PULL_TILES = 2;
export const HERBIVORE_PERIOD_MS = 4_000;
export const HERBIVORE_CAP_PER_ROOM = 3;
export const TREANT_BLOCK_RADIUS = 24;
/** Room 5: blocks the center dart; row 4 / 6 still thread around. */
export const TREANT_BOSS_RADIUS = 26;

type PileMember = { parts: AxieParts; evolved?: AxieEvolved };

export function pileHas(
  pile: readonly PileMember[],
  slot: keyof AxieParts,
  key: string,
): boolean {
  return pile.some((m) => m.parts[slot] === key);
}

/** Bear: Cactus > Carrot. Pumpkin / Rose Bud stay number-layer only. */
export function bearVerb(pile: readonly PileMember[]): BearVerb | null {
  if (pileHas(pile, "horn", "cactus")) return "thorn_hold";
  if (pileHas(pile, "tail", "carrot")) return "root_pull";
  return null;
}

/** Cat: Dual Blade. Ronin stays sprint; Imp stays range. */
export function catVerb(pile: readonly PileMember[]): CatVerb | null {
  if (pileHas(pile, "horn", "dual_blade")) return "cleave";
  return null;
}

/** Hawk: Pigeon Post > Eggshell > Swallow. */
export function hawkVerb(pile: readonly PileMember[]): HawkVerb | null {
  if (pileHas(pile, "back", "pigeon_post")) return "pierce";
  if (pileHas(pile, "horn", "eggshell")) return "split";
  if (pileHas(pile, "tail", "swallow")) return "tailwind";
  return null;
}

export function pileHasHerbivore(pile: readonly PileMember[]): boolean {
  return pileHas(pile, "mouth", "herbivore");
}

export function pileHasCloverEvo(pile: readonly PileMember[]): boolean {
  return pile.some(
    (m) => m.parts.ears === "clover" && m.evolved?.ears === true,
  );
}

export function pileHasWingHornEvo(pile: readonly PileMember[]): boolean {
  return pile.some(
    (m) => m.parts.horn === "wing_horn" && m.evolved?.horn === true,
  );
}

/** Verb of the body you are driving. Form wins while fused; class job while unfused. */
export function verbForBody(
  pile: readonly PileMember[],
  form: DruidForm | null,
  axieClass: AxieClass,
): PartVerb | null {
  if (form === "bear" || (!form && isHeavyClass(axieClass))) return bearVerb(pile);
  if (form === "cat" || (!form && isCatClass(axieClass))) return catVerb(pile);
  if (form === "hawk" || (!form && isFlyerClass(axieClass))) {
    return hawkVerb(pile);
  }
  return null;
}

export function verbLabel(verb: PartVerb): string {
  switch (verb) {
    case "thorn_hold":
      return "Thorn Hold";
    case "root_pull":
      return "Root Pull";
    case "cleave":
      return "Cleave";
    case "pierce":
      return "Pierce";
    case "split":
      return "Split Dart";
    case "tailwind":
      return "Tailwind";
  }
}

export function verbToast(verb: PartVerb): string {
  switch (verb) {
    case "thorn_hold":
      return "Cactus — Thorn Hold";
    case "root_pull":
      return "Carrot — Root Pull";
    case "cleave":
      return "Dual Blade — Cleave";
    case "pierce":
      return "Pigeon Post — Pierce";
    case "split":
      return "Eggshell — Split Dart";
    case "tailwind":
      return "Swallow — Tailwind";
  }
}

/** Gold line on a collection card: verb first, then park regen, then numbers. */
export function specialLine(parts: AxieParts): string | undefined {
  const one = [{ parts }];
  const bear = bearVerb(one);
  if (bear) {
    return bear === "thorn_hold" ? "Cactus — Thorn Hold" : "Carrot — Root Pull";
  }
  const cat = catVerb(one);
  if (cat) return "Dual Blade — Cleave";
  const hawk = hawkVerb(one);
  if (hawk === "pierce") return "Pigeon Post — Pierce";
  if (hawk === "split") return "Eggshell — Split Dart";
  if (hawk === "tailwind") return "Swallow — Tailwind";
  if (parts.mouth === "herbivore") return "Herbivore — park regen";
  return undefined;
}

export function toastOnce(
  scene: Phaser.Scene,
  id: string,
  text: string,
): void {
  const seen = (scene.registry.get("toastsSeen") as string[] | undefined) ?? [];
  if (seen.includes(id)) return;
  scene.registry.set("toastsSeen", [...seen, id]);
  scene.registry.set("toast", text);
}
