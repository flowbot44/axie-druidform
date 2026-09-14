import type Phaser from "phaser";

/** Spends and part-saves for the current clear. Room retry restores the snapshot. */
export interface EnergyLedger {
  fuse: number;
  formSwitch: number;
  kit: number;
  pit: number;
  herbivore: number;
  cloverSaved: number;
  cactusSaved: number;
}

export function emptyLedger(): EnergyLedger {
  return {
    fuse: 0,
    formSwitch: 0,
    kit: 0,
    pit: 0,
    herbivore: 0,
    cloverSaved: 0,
    cactusSaved: 0,
  };
}

export function cloneLedger(ledger: EnergyLedger): EnergyLedger {
  return { ...ledger };
}

export function readLedger(scene: Phaser.Scene): EnergyLedger {
  const raw = scene.registry.get("energyLedger") as Partial<EnergyLedger> | undefined;
  return { ...emptyLedger(), ...raw };
}

export function bumpLedger(
  scene: Phaser.Scene,
  key: keyof EnergyLedger,
  amount = 1,
): void {
  if (amount <= 0) return;
  const ledger = readLedger(scene);
  ledger[key] += amount;
  scene.registry.set("energyLedger", ledger);
}

export function snapshotLedger(scene: Phaser.Scene): void {
  scene.registry.set("energyLedgerOnRoomEnter", cloneLedger(readLedger(scene)));
}

export function restoreLedger(scene: Phaser.Scene): void {
  const snap = scene.registry.get("energyLedgerOnRoomEnter") as
    | EnergyLedger
    | undefined;
  scene.registry.set("energyLedger", snap ? cloneLedger(snap) : emptyLedger());
}
