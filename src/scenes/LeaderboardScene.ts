import Phaser from "phaser";
import {
  fetchBoard,
  formatTime,
  LEADERBOARD_TOP,
  type ScoreEntry,
} from "../config/leaderboard.ts";
import { plateButton } from "../ui/menuButton.ts";

/**
 * All-time board. Energy first, time tie-break. Honor system, no wallet.
 */
export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super({ key: "LeaderboardScene" });
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const from = (this.scene.settings.data as { from?: string } | undefined)?.from;

    this.add.rectangle(w / 2, h / 2, w, h, 0x0e0e1a, 1);
    this.add
      .text(w / 2, 40, "Leaderboard", {
        fontSize: "28px",
        color: "#e0b84a",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(w / 2, 72, "Energy remaining  ·  time is the tie-break  ·  no wallet", {
        fontSize: "13px",
        color: "#78909c",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    const list = this.add
      .text(w / 2, 120, "Loading…", {
        fontSize: "14px",
        color: "#b0bec5",
        fontFamily: "monospace",
        align: "left",
      })
      .setOrigin(0.5, 0);

    plateButton(
      this,
      w / 2,
      h - 52,
      from === "VictoryScene" ? "Back to victory" : "Back",
      () => {
        this.scene.stop("LeaderboardScene");
        if (from === "VictoryScene") {
          this.scene.resume("VictoryScene");
          return;
        }
        this.scene.start("CollectionScene");
      },
      { width: 280, height: 48 },
    );

    void fetchBoard()
      .then((scores) => {
        list.setText(this.renderList(scores));
      })
      .catch(() => {
        list.setText("Board unreachable. Try again in a bit.");
        list.setColor("#ef5350");
      });
  }

  private renderList(scores: ScoreEntry[]): string {
    const top = scores.slice(0, LEADERBOARD_TOP);
    if (top.length === 0) return "No clears yet. Purify the shrine to post.";
    const lines = top.map((row, i) => {
      const rank = String(i + 1).padStart(2, " ");
      const name = row.name.padEnd(16, " ");
      const energy = String(row.energy).padStart(3, " ");
      const time = formatTime(row.timeMs).padStart(6, " ");
      return `${rank}  ${name}  ${energy}e  ${time}`;
    });
    return ` #  name              nrg    time\n${lines.join("\n")}`;
  }
}
