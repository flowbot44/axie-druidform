import Phaser from "phaser";
import { SIMULATED_AXP, type PartyMember } from "../config/constants.ts";
import { emptyLedger, readLedger } from "../config/energy.ts";
import { normalizeName, submitScore } from "../config/leaderboard.ts";
import { wantsTouch } from "../config/touch.ts";
import { plateButton } from "../ui/menuButton.ts";
import {
  bearVerb,
  catVerb,
  hawkVerb,
  pileHasCloverEvo,
  pileHasHerbivore,
  verbLabel,
} from "../config/parts.ts";
import { calculateRating } from "../config/TeamRating.ts";

/**
 * R1 victory — energy primary, time tie-break, +250 AXP (Simulated) (GDD §12).
 * Breakdown credits the bodies: verbs, evo, herbivore (GDD §13).
 */
export class VictoryScene extends Phaser.Scene {
  private runnerName = "Player";
  private editingName = false;
  private submitted = false;
  private nameLabel!: Phaser.GameObjects.Text;
  private submitLabel!: Phaser.GameObjects.Text;

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

    this.add.rectangle(w / 2, h / 2, w, h, 0x0e0e1a, 1);

    this.add
      .text(w / 2, 64, "Shrine of Lunacia — Purified", {
        fontSize: "28px",
        color: "#80deea",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, 118, `Energy remaining  ${energy}`, {
        fontSize: "22px",
        color: "#ffeb3b",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, 150, `Time  ${time}  (tie-break)`, {
        fontSize: "16px",
        color: "#aaaaaa",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, 190, `+${SIMULATED_AXP} AXP (Simulated)`, {
        fontSize: "20px",
        color: "#69f0ae",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // --- Team Rating ---
    const rating = calculateRating(this);
    const gradeColors: Record<string, string> = {
      S: "#ffd54f",
      A: "#69f0ae",
      B: "#42a5f5",
      C: "#b0bec5",
      D: "#ef5350",
    };
    const gradeColor = gradeColors[rating.letter] ?? "#b0bec5";

    const gradeLabel = this.add
      .text(w / 2, 240, rating.letter, {
        fontSize: "52px",
        color: gradeColor,
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScale(3)
      .setAlpha(0);

    // Stamp animation
    this.tweens.add({
      targets: gradeLabel,
      scale: 1,
      alpha: 1,
      duration: 300,
      ease: "Back.easeOut",
      delay: 400,
    });

    this.add
      .text(w / 2, 274, `Score ${rating.score}`, {
        fontSize: "14px",
        color: "#90a4ae",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    // Factor breakdown
    const factorLines = rating.factors.map((f) => {
      const mark = f.earned ? "✓" : "✗";
      const pts = f.earned ? `+${f.points}` : `  0`;
      return `${mark} ${pts}  ${f.label}`;
    });
    this.add
      .text(w / 2, 310, factorLines.join("\n"), {
        fontSize: "11px",
        color: "#b0bec5",
        fontFamily: "monospace",
        lineSpacing: 3,
      })
      .setOrigin(0.5, 0);

    // --- Fireteam + Credits (shifted down) ---
    this.add
      .text(w / 2, 410, this.fireteamLine(), {
        fontSize: "13px",
        color: "#ffd54f",
        fontFamily: "monospace",
        align: "center",
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, 434, this.creditLine(), {
        fontSize: "13px",
        color: "#80deea",
        fontFamily: "monospace",
        align: "center",
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, 458, this.spendLine(), {
        fontSize: "12px",
        color: "#b0bec5",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    this.add
      .text(
        w / 2,
        486,
        "AXP accumulation → Ascension is the official\nAxie Core loop this dungeon feeds.",
        {
          fontSize: "13px",
          color: "#b0bec5",
          fontFamily: "monospace",
          align: "center",
        },
      )
      .setOrigin(0.5);

    const scoreText = this.add
      .text(w / 2, 528, score, {
        fontSize: "11px",
        color: "#90a4ae",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    const copy = this.add
      .text(w / 2, 546, "[ click score to copy ]", {
        fontSize: "11px",
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

    this.nameLabel = this.add
      .text(w / 2, 572, "", {
        fontSize: "14px",
        color: "#e0b84a",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.refreshName();
    this.nameLabel.on("pointerdown", () => {
      if (wantsTouch()) {
        const typed = window.prompt("Name on the board", this.runnerName);
        if (typed !== null) this.runnerName = normalizeName(typed);
        this.editingName = false;
        this.refreshName();
        return;
      }
      this.editingName = true;
      this.refreshName();
    });

    this.submitLabel = plateButton(
      this,
      w / 2,
      604,
      "Submit to board",
      () => {
        void this.submit(energy, ms);
      },
      { width: 300, height: 44, stroke: 0xe0b84a, color: "#ffd54f" },
    ).text;

    plateButton(
      this,
      w / 2,
      654,
      "View board",
      () => {
        this.editingName = false;
        this.scene.pause("VictoryScene");
        this.scene.launch("LeaderboardScene", { from: "VictoryScene" });
      },
      { width: 260, height: 40, stroke: 0x80deea, color: "#80deea", fontSize: "15px" },
    );

    plateButton(
      this,
      w / 2,
      700,
      "Play again",
      () => {
        this.scene.stop("VictoryScene");
        this.scene.stop("LeaderboardScene");
        this.scene.stop("HUDScene");
        this.scene.stop("GameScene");
        this.scene.start("CollectionScene");
      },
      { width: 260, height: 48 },
    );

    this.input.keyboard?.on("keydown", (ev: KeyboardEvent) => {
      if (!this.editingName) return;
      ev.preventDefault();
      if (ev.key === "Enter") {
        this.editingName = false;
        this.runnerName = normalizeName(this.runnerName);
        this.refreshName();
        return;
      }
      if (ev.key === "Backspace") {
        this.runnerName = this.runnerName.slice(0, -1);
        this.refreshName();
        return;
      }
      if (ev.key.length === 1 && this.runnerName.length < 16) {
        if (!/[a-zA-Z0-9 _\-.]/.test(ev.key)) return;
        if (this.runnerName === "Player") this.runnerName = "";
        this.runnerName += ev.key;
        this.refreshName();
      }
    });
  }

  private refreshName(): void {
    const shown = this.runnerName.length > 0 ? this.runnerName : "Player";
    this.nameLabel.setText(
      this.editingName ? `Name  ${shown}_` : `Name  ${shown}  ·  ${wantsTouch() ? "tap to set" : "click to type"}`,
    );
  }

  private async submit(energy: number, timeMs: number): Promise<void> {
    if (this.submitted) return;
    this.editingName = false;
    this.runnerName = normalizeName(this.runnerName);
    this.refreshName();
    this.submitLabel.setText("Submitting…");
    this.submitLabel.setColor("#90a4ae");
    try {
      await submitScore({
        name: this.runnerName,
        energy,
        timeMs,
      });
      this.submitted = true;
      this.submitLabel.setText("Posted");
      this.submitLabel.setColor("#69f0ae");
    } catch {
      this.submitLabel.setText("Submit failed — try again");
      this.submitLabel.setColor("#ef5350");
    }
  }

  private fireteamLine(): string {
    const party =
      (this.registry.get("party") as PartyMember[] | undefined) ?? [];
    const verbs = [bearVerb(party), catVerb(party), hawkVerb(party)]
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .map((v) => verbLabel(v));
    const extras: string[] = [];
    if (pileHasCloverEvo(party)) extras.push("Clover evo");
    if (pileHasHerbivore(party)) extras.push("Herbivore");
    const bits = [...verbs, ...extras];
    if (bits.length === 0) return "This fireteam  ·  class jobs only";
    return `This fireteam  ·  ${bits.join("  ·  ")}`;
  }

  private creditLine(): string {
    const ledger = this.registry.get("energyLedger")
      ? readLedger(this)
      : emptyLedger();
    const bits: string[] = [];
    if (ledger.cactusSaved > 0) bits.push(`Cactus saved ${ledger.cactusSaved}e`);
    if (ledger.cloverSaved > 0) bits.push(`Clover saved ${ledger.cloverSaved}e`);
    if (ledger.herbivore > 0) bits.push(`Herbivore +${ledger.herbivore}e`);
    if (bits.length === 0) {
      return "This body is the score  ·  parts save energy";
    }
    return bits.join("  ·  ");
  }

  private spendLine(): string {
    const ledger = this.registry.get("energyLedger")
      ? readLedger(this)
      : emptyLedger();
    return `Spent  Fuse ${ledger.fuse}e  ·  Kits ${ledger.kit}e  ·  Switches ${ledger.formSwitch}e  ·  Pits ${ledger.pit}e`;
  }
}
