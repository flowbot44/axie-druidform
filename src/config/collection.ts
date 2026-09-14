import Phaser from "phaser";
import {
  PLAYER_SPEED,
  type AxieClass,
  type AxieCollection,
  type AxieEvolved,
  type AxiePartClasses,
  type AxieParts,
  type PartyMember,
} from "./constants.ts";
import { specialLine } from "./parts.ts";
import snapshot from "../data/owned-axies.json";

/**
 * Static puzzle subset from this public address. No wallet, no live Market call.
 */
export const OWNER_ADDRESS = snapshot.owner;

export function axieTextureKey(id: number): string {
  return `axie-${id}`;
}

/** Vendored stills. Live CDN 403s on assets.axieinfinity.com. */
export function axieImagePath(id: number): string {
  return `/axies/${id}.png`;
}

export function prepareAxieTexture(
  textures: Phaser.Textures.TextureManager,
  id: number,
): void {
  const tex = textures.get(axieTextureKey(id));
  if (!tex || tex.key === "__MISSING") return;
  tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
}

/** Keep the 4:3 still. Never force a square — that squishes the body. */
export function fitPortrait(
  image: Phaser.GameObjects.Image,
  maxWidth: number,
  maxHeight: number,
): void {
  const fw = image.frame.width;
  const fh = image.frame.height;
  if (fw <= 0 || fh <= 0) return;
  const scale = Math.min(maxWidth / fw, maxHeight / fh);
  image.setDisplaySize(Math.round(fw * scale), Math.round(fh * scale));
}

export interface OwnedAxie {
  readonly id: number;
  readonly name: string;
  readonly axieClass: AxieClass;
  readonly parts: AxieParts;
  readonly partClasses: AxiePartClasses;
  readonly evolved: AxieEvolved;
  readonly collection: AxieCollection;
  readonly color: number;
  readonly speed: number;
  readonly image?: string;
  readonly special?: string;
}

const BEAST_SPEED = Math.floor(PLAYER_SPEED * 1.25);

const CLASS_COLOR: Partial<Record<AxieClass, number>> = {
  Plant: 0x66bb6a,
  Beast: 0xffa726,
  Bird: 0x42a5f5,
  Aqua: 0x26c6da,
  Bug: 0xab47bc,
  Reptile: 0x7e57c2,
  Dawn: 0xb39ddb,
  Dusk: 0x546e7a,
  Mech: 0x90a4ae,
};

const EVO_SLOTS: readonly (keyof AxieEvolved)[] = [
  "eyes",
  "ears",
  "mouth",
  "horn",
  "back",
  "tail",
];

/** `horn-cactus-2` → cactus, `back-pigeon-post` → pigeon_post. Name kept; evo is a flag. */
export function partKey(partId: string): string {
  return partId
    .replace(/^(eyes|ears|mouth|horn|back|tail)-/, "")
    .replace(/-2$/, "")
    .replace(/-/g, "_");
}

export function isEvolvedPartId(partId: string): boolean {
  return /-2$/.test(partId);
}

export function evolvedCount(evo: AxieEvolved): number {
  let n = 0;
  for (const slot of EVO_SLOTS) {
    if (evo[slot]) n += 1;
  }
  return n;
}

export function evoPips(count: number): string {
  const n = Math.max(0, Math.min(6, count));
  return "●".repeat(n) + "○".repeat(6 - n);
}

const SPECIAL_GENES_MAP: Record<string, AxieCollection> = {
  mystic: "mystic",
  origin: "origin",
  meo: "meo",
  summer2022: "summer",
  japan: "japanese",
  xmas2019: "xmas",
  nightmare: "nightmare",
  summershiny2022: "shiny",
  nightmareshiny: "shiny",
  agamo: "agamo",
  agamogenesis: "agamo",
};

const COLLECTION_PRIORITY: Record<AxieCollection, number> = {
  mystic: 100,
  origin: 90,
  agamo: 85,
  shiny: 80,
  xmas: 70,
  meo: 60,
  japanese: 50,
  nightmare: 40,
  summer: 30,
  normal: 0,
};

/** Schema for collectibles. Gameplay signatures are vision — parse only. */
export function detectCollection(
  parts: { specialGenes?: string | null }[],
  title?: string,
  name?: string,
): AxieCollection {
  const found: AxieCollection[] = [];
  for (const p of parts) {
    const gene = (p.specialGenes || "").toLowerCase().trim();
    if (!gene) continue;
    const mapped = SPECIAL_GENES_MAP[gene];
    if (mapped) found.push(mapped);
  }
  if (found.length > 0) {
    found.sort(
      (a, b) => (COLLECTION_PRIORITY[b] ?? 0) - (COLLECTION_PRIORITY[a] ?? 0),
    );
    return found[0] ?? "normal";
  }
  const t = (title || "").trim().toLowerCase();
  const n = (name || "").trim().toLowerCase();
  if (t === "origin") return "origin";
  if (t === "meo corp ii" || t === "meo") return "meo";
  if (n.includes("origin")) return "origin";
  return "normal";
}

export function specialFor(
  parts: AxieParts,
  axieClass: AxieClass,
  evolved: AxieEvolved,
): string | undefined {
  const verb = specialLine(parts);
  if (verb) return verb;
  if (evolved.horn && parts.horn === "wing_horn") {
    return "Wing Horn evo — longer dart";
  }
  if (evolved.ears && parts.ears === "clover") {
    return "Clover evo — first kit −1e";
  }
  if (parts.back === "pumpkin") return "Pumpkin back — +2s Druidform";
  if (axieClass === "Beast" && parts.horn === "imp") {
    return "Imp horn — longer slash";
  }
  if (parts.back === "ronin") return "Ronin back — extra sprint";
  if (axieClass === "Bird" && parts.horn === "cuckoo") {
    return "Cuckoo horn — longer dart";
  }
  return undefined;
}

function toAxieClass(raw: string): AxieClass {
  if (raw === "Aquatic") return "Aqua";
  const allowed: AxieClass[] = [
    "Plant",
    "Beast",
    "Bird",
    "Aqua",
    "Bug",
    "Reptile",
    "Mech",
    "Dawn",
    "Dusk",
  ];
  return allowed.includes(raw as AxieClass) ? (raw as AxieClass) : "Plant";
}

export function fromSnapshotAxie(raw: {
  id: string;
  name: string;
  class: string;
  image?: string;
  title?: string;
  parts: {
    id: string;
    name: string;
    type: string;
    class: string;
    specialGenes?: string | null;
  }[];
}): OwnedAxie {
  const axieClass = toAxieClass(raw.class);
  const byType: Record<string, string> = {};
  const classByType: Record<string, AxieClass> = {};
  const evoByType: Record<string, boolean> = {};
  for (const p of raw.parts) {
    const slot = p.type.toLowerCase();
    byType[slot] = partKey(p.id);
    classByType[slot] = toAxieClass(p.class);
    evoByType[slot] = isEvolvedPartId(p.id);
  }
  const parts: AxieParts = {
    eyes: byType.eyes ?? "unknown",
    ears: byType.ears ?? "unknown",
    horn: byType.horn ?? "unknown",
    mouth: byType.mouth ?? "unknown",
    back: byType.back ?? "unknown",
    tail: byType.tail ?? "unknown",
  };
  const partClasses: AxiePartClasses = {
    eyes: classByType.eyes ?? axieClass,
    ears: classByType.ears ?? axieClass,
    mouth: classByType.mouth ?? axieClass,
    horn: classByType.horn ?? axieClass,
    back: classByType.back ?? axieClass,
    tail: classByType.tail ?? axieClass,
  };
  const evolved: AxieEvolved = {
    eyes: evoByType.eyes ?? false,
    ears: evoByType.ears ?? false,
    mouth: evoByType.mouth ?? false,
    horn: evoByType.horn ?? false,
    back: evoByType.back ?? false,
    tail: evoByType.tail ?? false,
  };
  let speed = axieClass === "Beast" ? BEAST_SPEED : PLAYER_SPEED;
  if (parts.back === "ronin") speed = Math.floor(speed * 1.15);
  return {
    id: Number(raw.id),
    name: raw.name || `Axie #${raw.id}`,
    axieClass,
    parts,
    partClasses,
    evolved,
    collection: detectCollection(raw.parts, raw.title, raw.name),
    color: CLASS_COLOR[axieClass] ?? 0xb0bec5,
    speed,
    image: axieImagePath(Number(raw.id)),
    special: specialFor(parts, axieClass, evolved),
  };
}

export const OWNED_AXIES: readonly OwnedAxie[] =
  snapshot.axies.map(fromSnapshotAxie);

export function withSlot(axie: OwnedAxie, slot: number): PartyMember {
  return { ...axie, slot };
}

export function partCostDelta(axie: {
  parts: AxieParts;
  axieClass: AxieClass;
}): number {
  if (axie.axieClass === "Plant" && axie.parts.horn === "cactus") return -1;
  return 0;
}

export function partRangeMul(axie: {
  parts: AxieParts;
  axieClass: AxieClass;
  evolved: AxieEvolved;
}): number {
  if (axie.parts.horn === "wing_horn" && axie.evolved.horn) return 1.25;
  if (axie.axieClass === "Beast" && axie.parts.horn === "imp") return 1.25;
  if (axie.axieClass === "Bird" && axie.parts.horn === "cuckoo") return 1.25;
  return 1;
}

export function partFuseBonusMs(members: { parts: AxieParts }[]): number {
  let extra = 0;
  for (const m of members) {
    if (m.parts.back === "pumpkin") extra += 2_000;
    if (m.parts.back === "pigeon_post") extra += 2_000;
    if (m.parts.tail === "swallow") extra += 2_000;
  }
  return extra;
}
