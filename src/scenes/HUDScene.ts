import Phaser from "phaser";
import type { PartyMember } from "../config/constants.ts";

/**
 * HUDScene — always-on overlay (GDD §7).
 *
 * Runs in parallel on top of GameScene via scene.launch().
 * Reads shared state from the Phaser registry.
 *
 * Displays:
 *  - Active Axie name + role       (top-left)
 *  - Fused Dawn badge if Plant+Bird are combined
 *  - Energy counter                (top-right)
 *  - Room index                    (top-center)
 *  - Run timer                     (below room index)
 *  - Three slot portraits + badges (bottom-left)
 */
export class HUDScene extends Phaser.Scene {
  private energyText!: Phaser.GameObjects.Text;
  private activeLabel!: Phaser.GameObjects.Text;
  private stackLabel!: Phaser.GameObjects.Text;
  private roomLabel!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private objectiveLabel!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private formHelp!: Phaser.GameObjects.Text;

  private portraits: {
    fill: Phaser.GameObjects.Arc;
    border: Phaser.GameObjects.Arc;
  }[] = [];

  private badgeTexts: Phaser.GameObjects.Text[] = [];
  private party: PartyMember[] = [];

  constructor() {
    super({ key: "HUDScene" });
  }

  create(): void {
    this.input.enabled = false;
    this.party = (this.registry.get("party") as PartyMember[] | undefined) ?? [];

    const pad = 16;
    const w = this.cameras.main.width;

    // ── Top-left: active Axie ────────────────────────────────────────
    this.activeLabel = this.add.text(pad, pad, "", {
      fontSize: "18px",
      color: "#ffffff",
      fontFamily: "monospace",
      fontStyle: "bold",
    });

    this.stackLabel = this.add.text(pad, pad + 22, "", {
      fontSize: "14px",
      color: "#ce93d8",
      fontFamily: "monospace",
      fontStyle: "bold",
    });

    // ── Top-right: energy ────────────────────────────────────────────
    this.energyText = this.add
      .text(w - pad, pad, "", {
        fontSize: "18px",
        color: "#ffeb3b",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(1, 0);

    // ── Top-center: room index ───────────────────────────────────────
    this.roomLabel = this.add
      .text(w / 2, pad, "", {
        fontSize: "16px",
        color: "#aaaaaa",
        fontFamily: "monospace",
      })
      .setOrigin(0.5, 0);

    // ── Below room: timer ────────────────────────────────────────────
    this.timerText = this.add
      .text(w / 2, pad + 24, "", {
        fontSize: "14px",
        color: "#888888",
        fontFamily: "monospace",
      })
      .setOrigin(0.5, 0);

    this.objectiveLabel = this.add
      .text(w / 2, pad + 44, "", {
        fontSize: "13px",
        color: "#ff9800",
        fontFamily: "monospace",
      })
      .setOrigin(0.5, 0);

    this.formHelp = this.add
      .text(w / 2, this.cameras.main.height - pad - 18, "", {
        fontSize: "14px",
        color: "#90a4ae",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 1);

    this.hintText = this.add
      .text(w / 2, this.cameras.main.height - pad, "", {
        fontSize: "12px",
        color: "#666677",
        fontFamily: "monospace",
      })
      .setOrigin(0.5, 1);

    // ── Bottom-left: slot portraits ──────────────────────────────────
    this.createSlotPortraits(pad);

    // ── Initial draw ─────────────────────────────────────────────────
    this.refreshStaticHUD();
    this.refreshBadges();

    // ── Registry listeners ───────────────────────────────────────────
    this.registry.events.on("changedata-energy", () =>
      this.refreshStaticHUD(),
    );
    this.registry.events.on("changedata-activeSlot", () =>
      this.refreshStaticHUD(),
    );
    this.registry.events.on("changedata-roomIndex", () =>
      this.refreshStaticHUD(),
    );
    this.registry.events.on("changedata-partyStates", () =>
      this.refreshBadges(),
    );
    this.registry.events.on("changedata-fused", () => this.refreshStaticHUD());
    this.registry.events.on("changedata-fuseMs", () => this.refreshStaticHUD());
    this.registry.events.on("changedata-fuseTag", () => this.refreshStaticHUD());
    this.registry.events.on("changedata-objective", () =>
      this.refreshStaticHUD(),
    );
    this.registry.events.on("changedata-hint", () => this.refreshStaticHUD());
  }

  update(): void {
    // Timer updates every frame
    const ms = (this.registry.get("runTime") as number) ?? 0;
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    this.timerText.setText(`${min}:${sec.toString().padStart(2, "0")}`);
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private createSlotPortraits(pad: number): void {
    const h = this.cameras.main.height;

    for (let i = 0; i < this.party.length; i++) {
      const member = this.party[i]!;
      const x = pad + 28 + i * 72;
      const y = h - pad - 36;

      // Border circle
      const border = this.add.circle(x, y, 16, 0x000000, 0);
      border.setStrokeStyle(2, 0x666666);

      // Fill circle
      const fill = this.add.circle(x, y, 14, member.color, 0.3);

      this.portraits.push({ fill, border });

      // Slot number
      this.add
        .text(x, y, `${member.slot}`, {
          fontSize: "14px",
          color: "#ffffff",
          fontFamily: "monospace",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      // Name below circle
      this.add
        .text(x, y + 22, member.name, {
          fontSize: "10px",
          color: "#aaaaaa",
          fontFamily: "monospace",
        })
        .setOrigin(0.5, 0);

      // State badge below name
      const badge = this.add
        .text(x, y + 34, "", {
          fontSize: "9px",
          color: "#888888",
          fontFamily: "monospace",
        })
        .setOrigin(0.5, 0);
      this.badgeTexts.push(badge);
    }
  }

  private refreshStaticHUD(): void {
    const energy = this.registry.get("energy") as number;
    const activeSlot = this.registry.get("activeSlot") as number;
    const roomIndex = this.registry.get("roomIndex") as number;

    // Active label
    const fused = (this.registry.get("fused") as string) ?? "";
    const fuseTag = (this.registry.get("fuseTag") as string) ?? "";
    const active = this.party.find((p) => p.slot === activeSlot);
    if (fused) {
      const tag = fuseTag || "Druidform";
      this.activeLabel.setText(`${tag} ${fused}  ·  1/2/3 still pick Axies`);
      this.activeLabel.setColor(
        tag === "Bear" ? "#bcaaa4" : tag === "Cat" ? "#ff9800" : "#42a5f5",
      );
      this.formHelp.setText("Z Bear    X Cat    C Hawk");
      this.formHelp.setColor(
        tag === "Bear" ? "#bcaaa4" : tag === "Cat" ? "#ff9800" : "#42a5f5",
      );
    } else if (active) {
      const role =
        active.axieClass === "Plant"
          ? "Tank"
          : active.axieClass === "Beast"
            ? "Striker"
            : "Scout";
      const spec = active.special ? " ★" : "";
      this.activeLabel.setText(
        `${active.name} — ${role} · ${active.axieClass}${spec}`,
      );
      this.activeLabel.setColor(
        `#${active.color.toString(16).padStart(6, "0")}`,
      );
      this.formHelp.setText("E fuse  ·  then Z Bear / X Cat / C Hawk");
      this.formHelp.setColor("#546e7a");
    } else {
      this.formHelp.setText("");
    }

    // Energy
    this.energyText.setText(`Energy ${energy}`);
    this.energyText.setColor(energy <= 0 ? "#ef5350" : "#ffeb3b");

    // Room
    this.roomLabel.setText(`Room ${roomIndex}`);

    const fuseMs = (this.registry.get("fuseMs") as number) ?? 0;
    if (fused) {
      const sec = (fuseMs / 1000).toFixed(1);
      this.stackLabel.setText(`${fuseTag} ${fused}  ${sec}s`);
    } else {
      this.stackLabel.setText("");
    }

    const objective = (this.registry.get("objective") as string) ?? "";
    this.objectiveLabel.setText(objective);
    this.objectiveLabel.setColor(
      objective.startsWith("Bridge down") ||
        objective.startsWith("Gate locked") ||
        objective === "Shrine purified" ||
        objective === "Path open"
        ? "#66bb6a"
        : "#ff9800",
    );

    this.hintText.setText((this.registry.get("hint") as string) ?? "");

    // Highlight active portrait
    for (let i = 0; i < this.portraits.length; i++) {
      const portrait = this.portraits[i]!;
      const member = this.party[i]!;
      const isActive = member.slot === activeSlot;

      portrait.fill.setFillStyle(member.color, isActive ? 0.9 : 0.3);
      portrait.border.setStrokeStyle(
        2,
        isActive ? 0xffffff : 0x666666,
        isActive ? 1 : 0.5,
      );
    }
  }

  private refreshBadges(): void {
    const states = this.registry.get("partyStates") as
      | Record<number, string>
      | undefined;
    if (!states) return;

    for (let i = 0; i < this.party.length; i++) {
      const member = this.party[i]!;
      const state = states[member.slot];
      const badge = this.badgeTexts[i];
      if (!badge) continue;

      if (state === "fused") {
        badge.setText("FUSED");
        badge.setColor("#ce93d8");
      } else if (state === "active") {
        badge.setText("");
      } else if (state === "follow") {
        badge.setText("FOLLOW");
        badge.setColor("#66bb6a");
      } else if (state === "park") {
        badge.setText("PARK");
        badge.setColor("#ff7043");
      }
    }
  }
}
