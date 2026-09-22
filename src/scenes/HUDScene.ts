import Phaser from "phaser";
import { axieTextureKey, fitPortrait } from "../config/collection.ts";
import type { PartyMember } from "../config/constants.ts";
import { wantsTouch, type TouchAction } from "../config/touch.ts";
import { plateButton, type PlateButton } from "../ui/menuButton.ts";
import { TouchControls } from "../ui/TouchControls.ts";

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
  private toastLabel!: Phaser.GameObjects.Text;
  private exhaustBg!: Phaser.GameObjects.Rectangle;
  private exhaustLabel!: Phaser.GameObjects.Text;
  private retryLabel!: Phaser.GameObjects.Text;
  private retryPlate: PlateButton | null = null;

  private portraits: {
    fill: Phaser.GameObjects.Arc;
    border: Phaser.GameObjects.Arc;
    face: Phaser.GameObjects.Image | null;
  }[] = [];

  private badgeTexts: Phaser.GameObjects.Text[] = [];
  private party: PartyMember[] = [];
  private touch: TouchControls | null = null;

  constructor() {
    super({ key: "HUDScene" });
  }

  create(): void {
    this.input.enabled = true;
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
      .text(w / 2, this.cameras.main.height - pad - 22, "", {
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

    this.toastLabel = this.add
      .text(w / 2, this.cameras.main.height / 2 + 48, "", {
        fontSize: "18px",
        color: "#ffd54f",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const midY = this.cameras.main.height / 2 - 70;
    this.exhaustBg = this.add.rectangle(w / 2, midY, 560, 88, 0x1a0a12, 0.92);
    this.exhaustBg.setStrokeStyle(2, 0xef5350);
    this.exhaustBg.setDepth(20);
    this.exhaustBg.setVisible(false);

    this.exhaustLabel = this.add
      .text(w / 2, midY - 16, "Exhausted — energy 0", {
        fontSize: "18px",
        color: "#ef5350",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(21)
      .setVisible(false);

    this.retryPlate = plateButton(
      this,
      w / 2,
      midY + 22,
      "Retry room  ·  +10s",
      () => {
        this.registry.set("retryRoom", true);
      },
      { width: 280, height: 48, stroke: 0xffe082, color: "#ffe082", depth: 21 },
    );
    this.retryLabel = this.retryPlate.text;
    this.retryPlate.bg.setVisible(false);
    this.retryLabel.setVisible(false);

    // ── Bottom-left: slot portraits ──────────────────────────────────
    this.createSlotPortraits(pad);

    if (wantsTouch()) {
      this.formHelp.setVisible(false);
      this.hintText.setVisible(false);
      this.touch = new TouchControls(this, (kind, slot) => {
        this.registry.set("touchAction", {
          t: this.time.now,
          kind,
          slot,
        } satisfies TouchAction);
      });
      this.registry.set("touchUi", true);
    } else {
      this.registry.set("touchUi", false);
    }
    this.registry.set("touchDir", { x: 0, y: 0 });

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
    this.registry.events.on("changedata-toast", () => this.showToast());
    this.registry.events.on("changedata-formVerb", () =>
      this.refreshStaticHUD(),
    );
  }

  private showToast(): void {
    const text = (this.registry.get("toast") as string) ?? "";
    if (!text) return;
    this.tweens.killTweensOf(this.toastLabel);
    this.toastLabel.setText(text);
    this.toastLabel.setAlpha(1);
    this.tweens.add({
      targets: this.toastLabel,
      alpha: 0,
      delay: 3200,
      duration: 400,
    });
  }

  update(): void {
    const ms = (this.registry.get("runTime") as number) ?? 0;
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    this.timerText.setText(`${min}:${sec.toString().padStart(2, "0")}`);
    if (this.touch) {
      this.touch.update();
      this.registry.set("touchDir", { x: this.touch.dir.x, y: this.touch.dir.y });
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private createSlotPortraits(pad: number): void {
    const h = this.cameras.main.height;
    const w = this.cameras.main.width;
    const touch = wantsTouch();

    for (let i = 0; i < this.party.length; i++) {
      const member = this.party[i]!;
      const x = touch ? w - 220 + i * 72 : pad + 36 + i * 92;
      const y = touch ? 86 : h - pad - 52;
      const faceW = touch ? 48 : 56;
      const faceH = touch ? 38 : 44;

      const border = this.add.circle(x, y, touch ? 26 : 28, 0x000000, 0);
      border.setStrokeStyle(2, 0x666666);

      const fill = this.add.circle(x, y, touch ? 24 : 26, member.color, 0.35);

      const key = axieTextureKey(member.id);
      let face: Phaser.GameObjects.Image | null = null;
      if (this.textures.exists(key)) {
        face = this.add.image(x, y, key);
        fitPortrait(face, faceW, faceH);
      }

      this.portraits.push({ fill, border, face });

      const hit = this.add.zone(x, y, 72, 72).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => {
        this.registry.set("touchAction", {
          t: this.time.now,
          kind: "slot",
          slot: member.slot,
        } satisfies TouchAction);
      });

      this.add
        .text(x + (touch ? 18 : 20), y - 18, `${member.slot}`, {
          fontSize: "11px",
          color: "#ffffff",
          fontFamily: "monospace",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      if (!touch) {
        const shortName =
          member.name.length > 12 ? `#${member.id}` : member.name;
        this.add
          .text(x, y + 32, shortName, {
            fontSize: "10px",
            color: "#aaaaaa",
            fontFamily: "monospace",
          })
          .setOrigin(0.5, 0);
      }

      const badge = this.add
        .text(x, y + (touch ? 30 : 46), "", {
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
    const formVerb = (this.registry.get("formVerb") as string) ?? "";
    const verbBit = formVerb ? `  ·  ${formVerb}` : "";
    const active = this.party.find((p) => p.slot === activeSlot);
    if (fused) {
      const tag = fuseTag || "Druidform";
      this.activeLabel.setText(
        this.touch
          ? `${tag}${verbBit}`
          : `${tag} ${fused}${verbBit}  ·  1/2/3 still pick Axies`,
      );
      this.activeLabel.setColor(
        tag === "Bear" ? "#bcaaa4" : tag === "Cat" ? "#ff9800" : "#42a5f5",
      );
      this.formHelp.setText(
        fused === "×2"
          ? "E adds the third → Hawk"
          : "E splits",
      );
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
      this.activeLabel.setText(
        `${active.name} — ${role} · ${active.axieClass}${verbBit}`,
      );
      this.activeLabel.setColor(
        `#${active.color.toString(16).padStart(6, "0")}`,
      );
      this.formHelp.setText(
        roomIndex === 1
          ? "Slash one-shots bushes  ·  slam/dart take 3  ·  1/2/3 switch"
          : "E fuse two → Bear  ·  three → Hawk",
      );
      this.formHelp.setColor("#546e7a");
    } else {
      this.formHelp.setText("");
    }

    // Energy
    this.energyText.setText(`Energy ${energy}`);
    this.energyText.setColor(energy <= 0 ? "#ef5350" : "#ffeb3b");

    const exhausted = energy <= 0;
    this.exhaustBg.setVisible(exhausted);
    this.exhaustLabel.setVisible(exhausted);
    this.retryLabel.setVisible(exhausted);
    this.retryPlate?.bg.setVisible(exhausted);
    this.touch?.setActiveForm(fused ? fuseTag : "");

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
    this.hintText.setColor(roomIndex === 1 ? "#ffe082" : "#888899");

    // Highlight active portrait
    for (let i = 0; i < this.portraits.length; i++) {
      const portrait = this.portraits[i]!;
      const member = this.party[i]!;
      const isActive = member.slot === activeSlot;

      portrait.fill.setFillStyle(member.color, isActive ? 0.55 : 0.22);
      portrait.border.setStrokeStyle(
        2,
        isActive ? 0xffffff : 0x666666,
        isActive ? 1 : 0.5,
      );
      portrait.face?.setAlpha(isActive ? 1 : 0.72);
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
