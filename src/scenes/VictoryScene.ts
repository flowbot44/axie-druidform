import Phaser from "phaser";
import { SIMULATED_AXP } from "../config/constants.ts";

/**
 * R1 victory — energy primary, time tie-break, +250 AXP (Simulated) (GDD §12).
 */
export class VictoryScene extends Phaser.Scene {
  constructor() {
    super({ key: "VictoryScene" });
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const energy = (this.registry.get("energy") as number) ?? 0;
    const ms = (this.registry.get("runTime") as number) ?? 0;
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = (totalSec % 60).toString().padStart(2, "0");
    const time = `${min}:${sec}`;
    const score = `Axie Druidform | Energy ${energy} | Time ${time} | +${SIMULATED_AXP} AXP (Simulated)`;

    this.add.rectangle(w / 2, h / 2, w, h, 0x0e0e1a, 0.92);

    this.add
      .text(w / 2, 88, "Totem of Lunacia — Purified", {
        fontSize: "28px",
        color: "#80deea",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, 160, `Energy remaining  ${energy}`, {
        fontSize: "22px",
        color: "#ffeb3b",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, 200, `Time  ${time}  (tie-break)`, {
        fontSize: "16px",
        color: "#aaaaaa",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, 260, `+${SIMULATED_AXP} AXP (Simulated)`, {
        fontSize: "20px",
        color: "#69f0ae",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(
        w / 2,
        320,
        "AXP accumulation → Ascension is the official\nAxie Core loop this dungeon feeds.",
        {
          fontSize: "14px",
          color: "#b0bec5",
          fontFamily: "monospace",
          align: "center",
        },
      )
      .setOrigin(0.5);

    const scoreText = this.add
      .text(w / 2, 400, score, {
        fontSize: "12px",
        color: "#90a4ae",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    const copy = this.add
      .text(w / 2, 432, "[ click score to copy ]", {
        fontSize: "12px",
        color: "#546e7a",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    scoreText.setInteractive({ useHandCursor: true });
    scoreText.on("pointerdown", () => {
      void navigator.clipboard?.writeText(score);
      copy.setText("copied");
      copy.setColor("#69f0ae");
    });

    const again = this.add
      .text(w / 2, 520, "Play again", {
        fontSize: "18px",
        color: "#ffffff",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    again.on("pointerdown", () => {
      this.scene.stop("VictoryScene");
      this.scene.stop("HUDScene");
      this.scene.stop("GameScene");
      this.scene.start("GameScene");
    });
  }
}
