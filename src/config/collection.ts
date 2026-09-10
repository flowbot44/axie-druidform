import {
  PLAYER_SPEED,
  type AxieClass,
  type AxieParts,
  type PartyMember,
} from "./constants.ts";
import snapshot from "../data/owned-axies.json";

/**
 * Static puzzle subset from this public address. No wallet, no live Market call.
 */
export const OWNER_ADDRESS = snapshot.owner;

export interface OwnedAxie {
  readonly id: number;
  readonly name: string;
  readonly axieClass: AxieClass;
  readonly parts: AxieParts;
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

/** `horn-cactus-2` → cactus, `back-pigeon-post` → pigeon_post */
export function partKey(partId: string): string {
  return partId
    .replace(/^(eyes|ears|mouth|horn|back|tail)-/, "")
    .replace(/-2$/, "")
    .replace(/-/g, "_");
}

export function specialFor(
  parts: AxieParts,
  axieClass: AxieClass,
): string | undefined {
  if (axieClass === "Plant" && parts.horn === "cactus") {
    return "Cactus horn — slam costs 1";
  }
  if (parts.back === "pumpkin") return "Pumpkin back — +2s Druidform";
  if (axieClass === "Beast" && parts.horn === "imp") {
    return "Imp horn — longer slash";
  }
  if (parts.back === "ronin") return "Ronin back — extra sprint";
  if (axieClass === "Bird" && parts.horn === "cuckoo") {
    return "Cuckoo horn — longer dart";
  }
  if (parts.back === "pigeon_post") return "Pigeon Post — +2s Druidform";
  if (parts.tail === "swallow") return "Swallow tail — +2s Druidform";
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
  parts: { id: string; name: string; type: string; class: string }[];
}): OwnedAxie {
  const axieClass = toAxieClass(raw.class);
  const byType: Record<string, string> = {};
  for (const p of raw.parts) {
    byType[p.type.toLowerCase()] = partKey(p.id);
  }
  const parts: AxieParts = {
    horn: byType.horn ?? "unknown",
    mouth: byType.mouth ?? "unknown",
    back: byType.back ?? "unknown",
    tail: byType.tail ?? "unknown",
  };
  let speed = axieClass === "Beast" ? BEAST_SPEED : PLAYER_SPEED;
  if (parts.back === "ronin") speed = Math.floor(speed * 1.15);
  return {
    id: Number(raw.id),
    name: raw.name || `Axie #${raw.id}`,
    axieClass,
    parts,
    color: CLASS_COLOR[axieClass] ?? 0xb0bec5,
    speed,
    image: raw.image,
    special: specialFor(parts, axieClass),
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
}): number {
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
