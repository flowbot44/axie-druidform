import Phaser from "phaser";
import {
  OWNER_ADDRESS,
  OWNED_AXIES,
  withSlot,
  evolvedCount,
  evoPips,
  axieTextureKey,
  fitPortrait,
  type OwnedAxie,
} from "../config/collection.ts";
import type { PartyMember } from "../config/constants.ts";
import { plateButton, type PlateButton } from "../ui/menuButton.ts";
import {
  pileAffinity,
  bearHoldMs,
  catSlashCost,
  hawkDartCost,
  hawkSpeedMul,
  classJobLine,
} from "../config/forms.ts";
import {
  bearVerb,
  catVerb,
  hawkVerb,
  pileHasHerbivore,
  specialLine,
  verbLabel,
} from "../config/parts.ts";

/**
 * Pick 3 from the static owned subset. No wallet. No live Market call.
 */
export class CollectionScene extends Phaser.Scene {
  private selected: OwnedAxie[] = [];
  private playBtn!: PlateButton;
  private pickLabel!: Phaser.GameObjects.Text;
  private previewLabel!: Phaser.GameObjects.Text;
  private readonly cardHi: Phaser.GameObjects.Rectangle[] = [];

  constructor() {
    super({ key: "CollectionScene" });
  }

  create(): void {
    this.selected = [];
    this.cardHi.length = 0;
    const w = this.cameras.main.width;
    const cx = w / 2;

    this.add.rectangle(
      cx,
      this.cameras.main.height / 2,
      w,
      this.cameras.main.height,
      0x0e0e1a,
    );

    this.add
      .text(cx, 28, "Axie Druidform — Your Axies", {
        fontSize: "26px",
        color: "#e0e0e0",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    plateButton(
      this,
      w - 90,
      32,
      "Board",
      () => {
        this.scene.start("LeaderboardScene", { from: "CollectionScene" });
      },
      { width: 120, height: 40, fontSize: "16px", color: "#e0b84a" },
    );

    const short = `${OWNER_ADDRESS.slice(0, 6)}…${OWNER_ADDRESS.slice(-4)}`;
    this.add
      .text(
        cx,
        58,
        `Static subset from ${short}  ·  3 Plant · 3 Beast · 3 Bird  ·  no wallet`,
        { fontSize: "13px", color: "#78909c", fontFamily: "monospace" },
      )
      .setOrigin(0.5);

    this.add
      .text(
        cx,
        80,
        "Any 3 can finish. Gold = Space verb. Cyan Evo = this body. Z Bear / X Cat / C Hawk.",
        { fontSize: "12px", color: "#90a4ae", fontFamily: "monospace" },
      )
      .setOrigin(0.5);

    this.loadPortraits();
  }

  private loadPortraits(): void {
    if (OWNED_AXIES.every((a) => this.textures.exists(axieTextureKey(a.id)))) {
      this.drawRoster();
      return;
    }
    this.load.crossOrigin = "anonymous";
    for (const axie of OWNED_AXIES) {
      if (!axie.image) continue;
      this.load.image(axieTextureKey(axie.id), axie.image);
    }
    this.load.once("complete", () => this.drawRoster());
    this.load.start();
  }

  private drawRoster(): void {
    const w = this.cameras.main.width;
    const columns: { cls: OwnedAxie["axieClass"]; x: number; title: string }[] =
      [
        { cls: "Plant", x: w * 0.2, title: "Plant" },
        { cls: "Beast", x: w * 0.5, title: "Beast" },
        { cls: "Bird", x: w * 0.8, title: "Bird" },
      ];

    for (const col of columns) {
      this.add
        .text(col.x, 110, col.title, {
          fontSize: "16px",
          color: "#b0bec5",
          fontFamily: "monospace",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      const list = OWNED_AXIES.filter((a) => a.axieClass === col.cls);
      list.forEach((axie, i) => this.drawCard(axie, col.x, 148 + i * 148));
    }

    this.pickLabel = this.add
      .text(w / 2, 592, "", {
        fontSize: "14px",
        color: "#ce93d8",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    this.previewLabel = this.add
      .text(w / 2, 616, "", {
        fontSize: "12px",
        color: "#90a4ae",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    this.playBtn = plateButton(this, w / 2, 652, "Select 3", () => this.tryPlay(), {
      width: 320,
      height: 52,
      fontSize: "20px",
      color: "#f5e6c8",
    });
    this.playBtn.setArmed(false);

    this.add
      .text(
        w / 2,
        698,
        "1/2/3 pick Axies. After fuse: Z Bear, X Cat, C Hawk. Mixed spends less energy.",
        { fontSize: "11px", color: "#546e7a", fontFamily: "monospace" },
      )
      .setOrigin(0.5);

    this.refresh();
  }

  private drawCard(axie: OwnedAxie, x: number, y: number): void {
    const cardW = 340;
    const cardH = 140;
    const bg = this.add.rectangle(x, y + 48, cardW, cardH, 0x1a1a2e, 1);
    bg.setStrokeStyle(2, 0x37474f);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerdown", () => this.toggle(axie));
    this.cardHi.push(bg);
    bg.setData("id", axie.id);

    const tex = axieTextureKey(axie.id);
    const textX = x - 36;
    if (this.textures.exists(tex)) {
      const face = this.add.image(x - 108, y + 50, tex);
      fitPortrait(face, 112, 92);
    } else {
      this.add.ellipse(x - 108, y + 50, 40, 30, axie.color);
    }

    const title =
      axie.name === `Axie #${axie.id}` ? `#${axie.id}` : axie.name;
    this.add
      .text(textX, y + 12, title, {
        fontSize: "13px",
        color: "#eceff1",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0, 0);

    if (axie.collection !== "normal") {
      this.add
        .text(x + 156, y + 12, axie.collection, {
          fontSize: "10px",
          color: "#ce93d8",
          fontFamily: "monospace",
          fontStyle: "bold",
        })
        .setOrigin(1, 0);
    }

    this.add
      .text(textX, y + 36, `${axie.parts.horn} / ${axie.parts.back}`, {
        fontSize: "11px",
        color: "#90a4ae",
        fontFamily: "monospace",
      })
      .setOrigin(0, 0);

    const verb = specialLine(axie.parts);
    this.add
      .text(textX, y + 56, verb ?? classJobLine(axie.axieClass), {
        fontSize: "11px",
        color: verb ? "#ffd54f" : "#78909c",
        fontFamily: "monospace",
      })
      .setOrigin(0, 0);

    const extraHerb =
      axie.parts.mouth === "herbivore" && verb !== "Herbivore — park regen";
    if (extraHerb) {
      this.add
        .text(textX, y + 76, "Herbivore — park regen", {
          fontSize: "10px",
          color: "#aed581",
          fontFamily: "monospace",
        })
        .setOrigin(0, 0);
    }

    const evo = evolvedCount(axie.evolved);
    if (evo > 0) {
      let extra = "";
      if (axie.evolved.ears && axie.parts.ears === "clover") {
        extra = "  first kit −1e";
      } else if (axie.evolved.horn && axie.parts.horn === "wing_horn") {
        extra = "  longer dart";
      }
      this.add
        .text(textX, extraHerb ? y + 96 : y + 78, `Evo ${evoPips(evo)}${extra}`, {
          fontSize: "10px",
          color: "#80deea",
          fontFamily: "monospace",
        })
        .setOrigin(0, 0);
    }
  }

  private toggle(axie: OwnedAxie): void {
    const idx = this.selected.findIndex((a) => a.id === axie.id);
    if (idx >= 0) {
      this.selected.splice(idx, 1);
    } else if (this.selected.length < 3) {
      this.selected.push(axie);
    }
    this.refresh();
  }

  private refresh(): void {
    const names = this.selected.map((a, i) => `${i + 1} ${a.name}`).join("   ");
    this.pickLabel.setText(
      this.selected.length ? `Party  ${names}` : "Party  — empty —",
    );

    const ready = this.selected.length === 3;
    this.playBtn.setLabel(ready ? "Play" : `Select ${3 - this.selected.length} more`);
    this.playBtn.setArmed(ready);
    this.playBtn.text.setColor(ready ? "#c8f5d4" : "#a09070");

    // Team build preview — show form stats based on pile affinity
    if (this.selected.length >= 2) {
      const bearAff = pileAffinity(this.selected, "bear");
      const catAff = pileAffinity(this.selected, "cat");
      const hawkAff = pileAffinity(this.selected, "hawk");
      const holdSec = (bearHoldMs(bearAff) / 1000).toFixed(1);
      const slashCost = catSlashCost(catAff);
      const speedPct = Math.round((hawkSpeedMul(hawkAff) - 1) * 100);
      const dartCost = hawkDartCost(hawkAff);
      const verbs = [
        bearVerb(this.selected),
        catVerb(this.selected),
        hawkVerb(this.selected),
      ]
        .filter((v): v is NonNullable<typeof v> => v !== null)
        .map((v) => verbLabel(v));
      const verbBit = verbs.length ? `  ·  ${verbs.join(" / ")}` : "";
      const regenBit = pileHasHerbivore(this.selected)
        ? "  ·  Herbivore +1e/4s parked"
        : "";
      this.previewLabel.setText(
        `Bear: ${holdSec}s hold  ·  Cat: ${slashCost}e slash  ·  Hawk: +${speedPct}% spd, ${dartCost}e dart${verbBit}${regenBit}`,
      );
      this.previewLabel.setColor("#b0bec5");
    } else {
      this.previewLabel.setText("Pick 2+ to preview form stats");
      this.previewLabel.setColor("#546e7a");
    }

    for (const bg of this.cardHi) {
      const id = bg.getData("id") as number;
      const on = this.selected.some((a) => a.id === id);
      bg.setStrokeStyle(2, on ? 0xce93d8 : 0x37474f);
      bg.setFillStyle(on ? 0x2a1a3a : 0x1a1a2e);
    }
  }

  private tryPlay(): void {
    if (this.selected.length !== 3) return;
    const party: PartyMember[] = this.selected.map((a, i) => withSlot(a, i + 1));
    this.registry.set("party", party);
    this.scene.start("GameScene");
  }
}
