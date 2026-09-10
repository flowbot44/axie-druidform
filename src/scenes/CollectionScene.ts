import Phaser from "phaser";
import {
  OWNER_ADDRESS,
  OWNED_AXIES,
  withSlot,
  type OwnedAxie,
} from "../config/collection.ts";
import type { PartyMember } from "../config/constants.ts";

/**
 * Pick 3 from the static owned subset. No wallet. No live Market call.
 */
export class CollectionScene extends Phaser.Scene {
  private selected: OwnedAxie[] = [];
  private playLabel!: Phaser.GameObjects.Text;
  private pickLabel!: Phaser.GameObjects.Text;
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
      .text(cx, 36, "Axie Druidform — Your Axies", {
        fontSize: "26px",
        color: "#e0e0e0",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const short = `${OWNER_ADDRESS.slice(0, 6)}…${OWNER_ADDRESS.slice(-4)}`;
    this.add
      .text(
        cx,
        68,
        `Static subset from ${short}  ·  3 Plant · 3 Beast · 3 Bird  ·  no wallet`,
        { fontSize: "13px", color: "#78909c", fontFamily: "monospace" },
      )
      .setOrigin(0.5);

    this.add
      .text(
        cx,
        92,
        "Any 3 can finish. E fuse. Z Bear / X Cat / C Hawk. 1 2 3 always pick Axies.",
        { fontSize: "12px", color: "#90a4ae", fontFamily: "monospace" },
      )
      .setOrigin(0.5);

    this.loadPortraits();
  }

  private loadPortraits(): void {
    this.load.crossOrigin = "anonymous";
    for (const axie of OWNED_AXIES) {
      if (!axie.image) continue;
      this.load.image(`axie-${axie.id}`, axie.image);
    }
    this.load.once("complete", () => this.drawRoster());
    this.load.start();
    if (OWNED_AXIES.every((a) => !a.image)) this.drawRoster();
  }

  private drawRoster(): void {
    const w = this.cameras.main.width;
    const columns: { cls: OwnedAxie["axieClass"]; x: number; title: string }[] =
      [
        { cls: "Plant", x: w * 0.22, title: "Plant" },
        { cls: "Beast", x: w * 0.5, title: "Beast" },
        { cls: "Bird", x: w * 0.78, title: "Bird" },
      ];

    for (const col of columns) {
      this.add
        .text(col.x, 128, col.title, {
          fontSize: "16px",
          color: "#b0bec5",
          fontFamily: "monospace",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      const list = OWNED_AXIES.filter((a) => a.axieClass === col.cls);
      list.forEach((axie, i) => this.drawCard(axie, col.x, 168 + i * 130));
    }

    this.pickLabel = this.add
      .text(w / 2, 568, "", {
        fontSize: "14px",
        color: "#ce93d8",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    this.playLabel = this.add
      .text(w / 2, 620, "", {
        fontSize: "20px",
        color: "#546e7a",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.playLabel.setInteractive({ useHandCursor: true });
    this.playLabel.on("pointerdown", () => this.tryPlay());

    this.add
      .text(
        w / 2,
        680,
        "Any 3 can finish. 1/2/3 pick Axies. After fuse: Z Bear, X Cat, C Hawk.",
        { fontSize: "11px", color: "#546e7a", fontFamily: "monospace" },
      )
      .setOrigin(0.5);

    this.refresh();
  }

  private drawCard(axie: OwnedAxie, x: number, y: number): void {
    const bg = this.add.rectangle(x, y + 40, 280, 118, 0x1a1a2e, 1);
    bg.setStrokeStyle(2, 0x37474f);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerdown", () => this.toggle(axie));
    this.cardHi.push(bg);
    bg.setData("id", axie.id);

    const tex = `axie-${axie.id}`;
    if (this.textures.exists(tex)) {
      this.add.image(x - 100, y + 40, tex).setDisplaySize(56, 56);
    } else {
      this.add.ellipse(x - 100, y + 40, 36, 28, axie.color);
    }

    this.add
      .text(x - 72, y + 8, `#${axie.id}  ${axie.name}`, {
        fontSize: "13px",
        color: "#eceff1",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0, 0);

    this.add
      .text(x - 72, y + 30, `${axie.parts.horn} / ${axie.parts.back}`, {
        fontSize: "11px",
        color: "#90a4ae",
        fontFamily: "monospace",
      })
      .setOrigin(0, 0);

    this.add
      .text(x - 72, y + 50, axie.special ?? "Standard parts", {
        fontSize: "11px",
        color: axie.special ? "#ffd54f" : "#607d8b",
        fontFamily: "monospace",
      })
      .setOrigin(0, 0);
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
    this.playLabel.setText(ready ? "Play" : `Select ${3 - this.selected.length} more`);
    this.playLabel.setColor(ready ? "#69f0ae" : "#546e7a");

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
