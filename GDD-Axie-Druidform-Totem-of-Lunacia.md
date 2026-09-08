# Game Design Document

**Axie Druidform — Totem of Lunacia**  
Axie Vibeathon · Round 1 Prototype + Product Vision  
Status: **LOCKED for implementation**  
Last updated: 2026-09-07

---

## 0. How to use this document

- **Round 1 (Sep 8–21):** implement only sections marked **R1**.  
- **Vision / submission copy:** use section 1 word-for-word.  
- Do not reintroduce morph, shapeshift, wallet login, Spine mixer, or procedural dungeons into the prototype.  
- If a later idea conflicts with a **LOCK** box, the lock wins.

---

## 1. Locked product vision (word-for-word)

Use this sentence across the pitch, README, thumbnail caption, and Vibeathon submission form:

> The long-term fantasy of Axie Druidform is commanding your actual three owned Axies as a dynamic tactical fireteam—where each Axie’s specific on-chain genetics determine its role as Tank, Striker, or Scout, allowing players to synergize body parts, park companions on strategic switches, and physically stack their real collection into a 3-tier Totem of Lunacia.

**Round 2 mixer note (vision only, not R1 code):**  
The Mixer renders all three party slots using real Axie IDs input by the player or read from a public Ronin address, falling back to default starter IDs if fewer than three are provided.

**Axie Core one-liner for judges (R1 + vision):**  
Dungeon clears are how this fireteam earns AXP and, later, how owned genetics rewrite Tank / Striker / Scout roles.

---

## 2. One-sentence pitch (submission field)

A top-down Zelda-style puzzle-action game where your three Axies must be swapped, parked, and stacked to purify the Totem of Lunacia on a tight energy budget.

---

## 3. Design pillars

1. **True team presence.** All three Axies exist in the room at once. Puzzles are spatial labor, not menus.  
2. **Division of labor.** Tank mass, Striker break, Scout reach. No one body solves a room.  
3. **Action economy over twitch.** Energy remaining is the score. Planning beats speed.  
4. **Readable in four minutes.** Judges finish a clean run before the next tab.  
5. **Core-shaped, wallet-free.** R1 proves the pipeline with starters + simulated AXP. R2 binds real IDs.

---

## 4. Round 1 roster (LOCK)

Party size is exactly three. Slots are hard-locked for the 13-day prototype. Genetics do **not** change roles in R1.

| Slot | Key | Starter | Class body | Vision role | Function |
| --- | --- | --- | --- | --- | --- |
| 1 | `1` | Olek | Plant | Tank | Mass, plates, hazard immunity, Root Slam |
| 2 | `2` | Buba | Beast | Striker | Sprint, brambles / cracked walls, Ronin Slash |
| 3 | `3` | Puffy | Bird | Scout | Hover over mud / chasms, Feather Dart |

**Title screen — Mock Wallet toggle (R1):**  
Off = Olek / Buba / Puffy.  
On = load three JSON profiles (display name, tint, flavor). Still the same three roles. No part parsing. No Ronin.

**Language lock:** say **swap** and **stack**. Never “morph,” “Chimera Shift,” or “despawn” in HUD, tutorial, or README. Chimera / part-hybridization lives only in §16 Vision.

---

## 5. Player fantasy in play

You are the conductor of a triad. One Axie moves under you. The other two either follow on a tether or stand as anchors. When the shrine sits too high, you build a Totem: bodies parented into integer height tiers. The base writes physics. The top writes the attack origin.

---

## 6. Camera, space, movement (LOCK)

- Genre: top-down action-adventure.  
- Movement: free 2D arcade velocity on a **32×32 px** tilemap.  
- Collision: tile-aligned solids, hazards, plates, and pits. Free analog feel; snapped interaction cells.  
- Camera: room-based. On door enter, camera eases to the new room. No continuous overworld scroll in R1.  
- Playable area per room: roughly 16–24 tiles wide, readable at 1280×720.  
- Beast passive: **+25% max speed** while Buba is the active, unstacked unit. Cap acceleration so he cannot skip a 32px plate in one frame.

---

## 7. Controls (LOCK)

| Input | Action |
| --- | --- |
| WASD / Arrow keys | Move the active Axie (or the **base** if you are moving a stack) |
| `1` / `2` / `3` | Select that party slot |
| `Tab` | Cycle 1 → 2 → 3 → 1 |
| `Space` / Left click | Active ability (see §9) |
| `F` | Toggle **Follow** ↔ **Park** on the two inactive Axies as a group (see §8) |
| `E` | Stack if eligible; full dismount if already stacked |
| Reset Bell (world object) | Room retry |

No Shift-as-action. No dedicated morph key.

**HUD (always on):**  
Active name + role, energy (integer), room index, run timer, three slot portraits with Parked / Follow / Stacked badges, stack `heightTier` if > 1.

---

## 8. Party states (LOCK)

Every Axie is always in exactly one spatial state:

| State | Behavior |
| --- | --- |
| **Active** | Player input. |
| **Follow** | Loose tether behind the active leader. Stop at last safe tile before pits. Path around solids. Do not enter a new room until the door is open and the leader has crossed; then path through. |
| **Park** | Anchored. Zero locomotion. Can hold a pressure plate after the leader leaves through a door (**Room Transition Rule**). |
| **Stacked (rider)** | No independent collider. Transform slaved to carrier. |
| **Stacked (base)** | Single world collider for the whole totem. Moves the stack. |

`F` toggles Follow ↔ Park for **both** inactive Axies. It does not unstack. Remember each Axie’s Follow/Park preference across a full dismount.

Followers never hover a chasm. A parked Scout over a pit is illegal: snap to last safe tile.

---

## 9. Abilities and energy (LOCK)

**Starting pool:** 100 energy per run.  
**Passive movement:** 0.  
**Swap / Tab / Park / Stack / Dismount:** 0.  
**No regen.**

| Role | Trait / passive | Ability (Space / Click) | Cost | Range / area |
| --- | --- | --- | --- | --- |
| Tank (Plant) | Heavy mass (depresses heavy plates). Hazard / spike / thorn immunity. | **Root Slam** — stun adjacent pests; lock *timed* switches only | 2 | Melee AoE, 48px circle |
| Striker (Beast) | +25% sprint | **Ronin Slash** — cut brambles; break cracked pots / walls | 1 | Forward arc, 64px reach |
| Scout (Bird) | Hover: may cross mud and chasms **only while Scout is the unstacked active unit** | **Feather Dart** — line-of-sight projectile | 2 | 350px LOS |

**Plates vs slam (LOCK):**  
Heavy stone plates require **Tank mass standing on the cell** (Plant as unstacked occupant **or** Plant as stack **base**). Root Slam does **not** substitute for parking on a heavy plate. Slam may lock a separately tagged `timedSwitch`.

**While stacked (LOCK):**  
Space fires the **top** Axie’s ability only. Spawn origin is the top sprite. Slash / slam / dart still use that role’s numbers. If the player presses Space and the top role is not the one they expected, the input still spends that top ability’s cost.

---

## 10. Scoring and failure (LOCK)

**Primary score:** energy remaining when the Totem of Lunacia is activated in Room 5.  
**Tie-breaker:** run time (faster wins). Visible timer on HUD.  
**Optional routing:** 2–3 cracked walls that spend 1 energy to skip a longer path, so optimal energy is a real plan.

### Fail states

| Event | Result |
| --- | --- |
| Energy reaches 0 | Exhaustion screen. **Try Room Again** = same as Reset Bell for the current room. |
| Any Axie (or the stack) falls into a pit | All three snap to last safe tile. Stack breaks. **−3 energy once** (not per body). |
| Softlock | Every room has a Reset Bell. |

### Reset Bell

- Restore energy to `energyOnRoomEnter` (snapshot when the active Axie finished entering this room).  
- Reset this room’s switches, breakables, bridges, pests, and local parks.  
- Axies parked in **other** rooms stay.  
- Add **+10 seconds** to the run timer.

---

## 11. Totem stacking (LOCK)

Stacking is **zero-physics parenting**, not rigid-body balance.

### Build

- Active Axie is the **rider**.  
- Nearest ally within **40px** is the **carrier**.  
- `E` parents the rider **directly above** the carrier (`y - 28px`).  
- Rider independent hitbox **disabled**. Rider transform slaved to carrier.  
- To build Plant → Beast → Bird: stand/park Plant, swap to Beast, `E`, swap to Bird, `E`.

### Height

```
heightTier: 1 | 2 | 3
```

- Ground / unstacked = **1** (that Axie is its own base).  
- Two-body stack = **2**.  
- Full totem = **3** (top Axie).

### Interactive objects

Objects declare `targetTier`.  
An ability or projectile **only** resolves if `attacker.heightTier === targetTier`.

| Object | `targetTier` |
| --- | --- |
| Room 2 eye-beacon | **1** |
| Room 4 pillar crystal | **3** |
| Room 5 boss weak eye | **3** (fallback **2** if time-cut) |

### Kinetic properties

- **Base** writes surface physics. Plant base → whole stack has spike / thorn immunity and triggers heavy plates. Non-Plant base → no heavy plate.  
- **Top** writes offense origin and which ability Space fires. Scout on top of a Tier-3 stack originates the dart from Tier 3 (clears low blockers, hits high eyes).  
- Hover is **not** inherited. If Scout is not the unstacked mover, chasms still fail the stack.

### Dismount

`E` while already stacked **collapses the entire totem**:

- Top unit pops **32px backward**.  
- All units return to `heightTier: 1`.  
- Follow/Park flags restore.

No single-layer peel in R1.

### Rooms and stacks

- A stack **cannot straddle two rooms**. Crossing a door moves the whole totem.  
- A **parked, unstacked** Tank may remain on a plate in the previous room.

### Fall

One −3 energy, full collapse, snap all three to last safe tile.

---

## 12. Dungeon — Round 1 scope (LOCK)

**Five rooms. Target clean run: 3–4 minutes.**  
Single dungeon. No hub. No shops.

### Room 1 — Entry Hall (teach move + slash)

- WASD + `1/2/3`.  
- Bramble gate. Only Ronin Slash opens it.  
- Reset Bell in view.  
- Goal: prove Striker destruction.

### Room 2 — The Chasm (teach Scout)

- Gap the Tank and Striker cannot cross.  
- Scout hovers the chasm.  
- Eye-beacon: `targetTier: 1`, Feather Dart.  
- Hit lowers a bridge so the others can cross.  
- Goal: prove hover + dart without a stack.

### Room 3 — Dual Weight Vault (teach Park)

- Heavy plate in view of a sealed gate.  
- Park Tank (`F`) on the plate.  
- Swap to Striker, walk through, hit the release lever.  
- Room Transition Rule on display if the lever is past a threshold.  
- Goal: prove spatial presence and `F`.

### Room 4 — The Totem Pillar (teach stack)

- Central pillar, crystal `targetTier: 3`.  
- Player builds a 3-tier totem (Plant base recommended for a floor hazard ring).  
- Scout on top darts or the top role interacts with the crystal.  
- Goal: prove parenting, tiers, and base/top split.

### Room 5 — Boss Chamber, Corrupted Treant (puzzle-boss, not an arena)

Scripted three-beat encounter. No HP sponge.

1. Tank anchors the root whip (stand on the anchor cell, or one Root Slam if tagged `timedSwitch`).  
2. Scout darts the weak eye (`targetTier: 3` if a totem is required; cut to 1 or 2 if day 8 is late).  
3. Striker slashes the exposed core **once**.

Then the **Totem of Lunacia** accepts activation (walk into shrine + `E` or auto after core break).

**Win:** purify shrine → victory screen.

### Victory screen (R1)

- Energy remaining (primary score)  
- Time (tie-breaker)  
- **+250 AXP (Simulated)**  
- One line: *AXP accumulation → Ascension is the official Axie Core loop this dungeon feeds.*  
- Copy-able score string for manual leaderboard / screenshot.

No live global leaderboard required in R1. Document the metric.

---

## 13. Axie Core — what R1 actually ships vs what it claims

| Claim | R1 implementation | Why it scores |
| --- | --- | --- |
| Fireteam of Axies | Three named starters on screen at once | Squad size matches Axie |
| Core loop | Victory screen **+250 AXP (Simulated)** and copy about Ascension | Shows AXP as the sink for play time |
| Ownership pipeline | Mock Wallet JSON profiles | Proves a data slot for real IDs later |
| Genetics → role | Documented only | Avoids 13-day gene bugs |
| Collectibles | Hidden path + one lore shrine (cosmetic) | Optional; no stat swing |

**Collectibles (R1):** one optional off-path shrine. Cosmetic flavor only.  
**Collectibles (R2 doc):** Origin / Mystic / Shiny auras and optional Mastery Shrines. No combat stat change.

---

## 14. Tech (LOCK)

| Item | Choice |
| --- | --- |
| Stack | Vite + Phaser 3 + TypeScript |
| Physics | Arcade / kinematic. **No** rigid-body stack. |
| Map | Tiled or equivalent 32px tilemap |
| Hosting | GitHub Pages or Vercel, wallet-free, opens in a new tab |
| Art days 1–3 | Colored primitive bodies (green / orange / blue ellipses) |
| Art day 4+ | Static 2D starter stills if available from the Vibeathon kit; squash-stretch tweens for polish. No Spine runtime in R1. |
| Audio | Optional SFX; mute toggle |

### Implementation notes

- Snapshot `energyOnRoomEnter` in the room-enter callback.  
- Give each Axie `{ slot, role, followPark, heightTier, mountedTo }`.  
- Stack = set parent, disable rider body, grow base body height or use a single stack collider.  
- Abilities are short-lived zones or a hitscan / small sprite for the dart.  
- Seeds / RNG off. Fixed dungeon so scores compare.

---

## 15. Build order (13-day)

1. Boot Phaser, one room, one body, WASD, energy HUD.  
2. Three bodies, slot select, follow tether, `F` park.  
3. Heavy plate + gate (Room 3 logic).  
4. Parent stack + `heightTier` + one Tier-3 crystal.  
5. Slash vs bramble (Room 1).  
6. Chasm + hover + Tier-1 eye + bridge (Room 2).  
7. Stitch five rooms, door camera, Reset Bell, energy snapshot.  
8. Room 5 as three scripted beats + victory / AXP screen.  
9. Replace primitives with stills; juice; first-play text.  
10. Buffer. Cut boss totem requirement before cutting park or stack.

**Do not start in R1:** Three.js / Unity mixer, Ronin read, part decoding, daily seeds, landowner shrines, shaders beyond a simple tint.

---

## 16. Product vision — Round 2 and production

### Week 2 (if finalist)

- Mixer (or official 2D mixer) renders **three** real Axie IDs into the three slots.  
- Player pastes IDs or a public Ronin address.  
- Fewer than three IDs → remaining slots stay Olek / Buba / Puffy.  
- Roles still mapped by a simple rule (body class → Tank / Striker / Scout) until part-hybrid ships.

### Month 3 (ecosystem)

- **True part inheritance:** the six on-chain parts of each owned Axie modify mass, break power, hover distance, and ability kit. Party of three owned Axies, not one hero plus escorts.  
- **Daily procedural ruins:** seeded shrines. Lunacia landowners host instances on plots. Clears under par energy pay AXP and off-chain craft materials.  
- Optional approved Sky Mavis hooks only after the loop is fun without a wallet.

No winner is entitled to this path; it is the credible Core fit for judges.

---

## 17. Submission checklist (Vibeathon)

- [ ] Title: Axie Druidform — Totem of Lunacia  
- [ ] One-sentence pitch (§2)  
- [ ] Vision sentence (§1) in short + full description  
- [ ] Thumbnail  
- [ ] Playable link (new tab)  
- [ ] Controls + first-play instructions (paste §7 + “Room 1 slash the brambles”)  
- [ ] Repo link (may stay private)  
- [ ] Fallback demo video  
- [ ] AI tools used  
- [ ] Axie Core paragraph (§13 + +250 AXP screen)  
- [ ] Register by Sep 7; R1 build window Sep 8–21  

---

## 18. First-play instructions (paste into the form)

You command three Axies at once. `1` Olek the Tank, `2` Buba the Striker, `3` Puffy the Scout. `Tab` cycles.  
`WASD` moves the selected Axie. `F` parks the others on switches. `E` stacks an Axie onto a nearby ally to build a Totem; `E` again takes the tower apart.  
`Space` uses that role’s tool (slam, slash, or dart) and spends energy.  
Finish with as much energy as you can. Time is only a tie-break.  
If you get stuck, hit the Reset Bell in the room.

---

## 19. Open issues that are explicitly out of scope

- Mixed-gene role calculation  
- Per-Axie `F` (only group toggle)  
- Partial dismount  
- Live leaderboard backend  
- Damage-over-time boss  
- Multiplayer  

If an AI coding tool proposes any of the above, reject it.

---

## 20. Change log

| Date | Change |
| --- | --- |
| 2026-09-07 | Locked 3-owned-Axie fireteam fantasy; swap ≠ morph; four stack rules; 5-room list; energy 100; simulated AXP; Phaser R1. |
