# Game Design Document

**Axie Druidform — Totem of Lunacia**  
Axie Vibeathon · Round 1 Prototype + Product Vision  
Status: **LOCKED** — matches the current prototype  
Last updated: 2026-09-15

---

## 0. How to use this document

- **Round 1 (Sep 8–21):** this file is the lock. Code that disagrees with a LOCK is wrong.  
- **Vision / submission copy:** use §1 word-for-word.  
- Phaser, one tested feature at a time, approved assets, wallet-free play.  
- Do not reintroduce: morph-of-one-hero, totem stacking, wallet login, live Market API, mixers, API keys in the client, default starters (Olek / Buba / Puffy), `1`/`2`/`3` as form keys, **Cat form**, or **`Z`/`X`/`C` form switch**.  
- Axie Core Discord notes are **starting points, not a checklist.** Token integration is not required.

---

## 1. Locked product vision (word-for-word)

> The long-term fantasy of Axie Druidform is commanding Axies you actually own as a tactical fireteam—picking who enters the dungeon, then combining two into Bear or three into Hawk. The form does the fast puzzle job. The part name changes what Space does. Evolved parts and collectibles are why you brought this body, not any cactus.

**R1 ownership:** `src/data/owned-axies.json` — nine Axies (3 Plant, 3 Beast, 3 Bird) snapshotted from `0xdf8b35668c8fcf82b1d1707875c98cd05b6927c4`. No wallet connect. No live Market call.

**Mixer / Market (vision only):** Axie ID → Market GraphQL genes → Mixer. No player wallet required. API key stays out of the client and public repo.

**Axie Core one-liner:**  
**Every trio can purify the shrine.** You seek a Plant because slam and plates are cheap. You seek a cactus because slam plants Thorn Hold. You seek #10865685 because its Clover is evolved. Three of one class still finish — they just take more hits and spend more energy. Mystics, Origins, and Meos play the same rooms with a fireteam signature. They are never a gate. **No class is required.**

---

## 2. One-sentence pitch

A top-down Zelda-style puzzle-action game where you pick three owned Axies, then swap, park, and fuse them — two into Bear, three into Hawk — to purify the Shrine of Lunacia on a tight energy budget.

---

## 3. Design pillars

1. **Owned bodies.** Pick 3 from the JSON. No default fireteam.  
2. **Any trio can finish.** Multiple paths. Mixed classes score better; three Plants still clear. **No Beast required.**  
3. **Form is the pile.** ×2 Bear (slam / plates). ×3 Hawk (fly + dart). **No Cat. No Z/X/C.** Matching kit one-shots (`PUZZLE_HP` 3); off-kit chips (1 dmg, three hits). Parts never skip a room.  
4. **Three layers of “why this Axie.”** Class = which job is *fast*. Part name = which verb on Space. Evo / collectible = this body, not any cactus.  
5. **×2 vs ×3.** More bodies in the pile = better move, range, fuse clock, and the Hawk job.  
6. **Keys do one job.** `1`/`2`/`3` pick Axies. `E` fuse: two → Bear, three → Hawk.  
7. **Energy is the score.** Planning beats speed.  
8. **Readable in four minutes.** Wallet-free. Chips read as progress, not failure. Matching kit tints the target.

---

## 4. Round 1 collection (LOCK)

**File:** `src/data/owned-axies.json`  
**Owner (snapshot):** `0xdf8b35668c8fcf82b1d1707875c98cd05b6927c4`  
Pick **any three**. Slots `1`/`2`/`3` are pick order. Three Plants is legal and completable.

| Class | Id | Name | Notable parts |
| --- | --- | --- | --- |
| Plant | 10865685 | Axie #10865685 | cactus horn, clover-2 |
| Plant | 6932506 | T_1 | cactus + pumpkin |
| Plant | 4060820 | BBP PLANT2 | pumpkin back |
| Beast | 95221 | Axie #95221 | dual-blade |
| Beast | 4551303 | B2 | imp + ronin |
| Beast | 4919477 | Axie #4919477 | dual-blade |
| Bird | 11070928 | Axie #11070928 | pigeon-post |
| Bird | 11367315 | Axie #11367315 | swallow |
| Bird | 12025435 | AOE Bird | wing-horn-2 |

**Language:** swap, park, fuse, split, **Bear / Hawk**. Never morph, stack, totem, Chimera Shift, Cat form, or despawn in HUD. Product title may keep “Totem of Lunacia”; the win object is the **Shrine of Lunacia**.

---

## 5. Player fantasy

You choose three Axies you own. Unfused they keep class jobs — every class has a Space kit. Fuse **two → Bear**, **three → Hawk**. The form is the *fast* job, not a gate. The parts in the pile change what Space does (Thorn Hold, Cleave, Pierce). An evolved part or a collectible is why that slot is this Axie, not a generic cactus.

---

## 6. Camera, space, movement (LOCK)

- Top-down, 32×32 tiles, arcade velocity, room camera (five rooms stitched east–west).  
- Look is **Zelda-dungeon**, not forest moss: diamond floors lighter than walls, running-bond brick, cream pit lips, shutter doors, wall torches. Original tiles — never Nintendo assets.  
- **No world labels.** Props read from silhouette + pulse / tint / texture swap. `1`/`2`/`3` on Axies and HUD copy stay.  
- Beast unfused: +25% speed (ronin back ×1.15 more).  
- Hawk form: hover pits + fly speed `× (1 + 0.15 × flyer count)` on top of ×2/×3.

---

## 7. Controls (LOCK)

| Input | What it does |
| --- | --- |
| Collection click | Pick up to 3, then **Play** |
| WASD / touch stick | Move the selected Axie (or the form, if you are driving it) |
| `1` `2` `3` / tap portraits | **Always pick a party Axie.** Absorbed slots jump to the form body. Switching *off* a form body **auto-parks it** where it stands (Room 3). |
| `Tab` | Cycle visible Axies (skips absorbed) |
| `Space` / click / Kit | Kit of the body you are driving |
| `F` / Park | Follow ↔ Park the two inactives as a group |
| `E` / Fuse | Fuse the unparked team in the room (3 energy each, cap ×3). At ×3, splits (0) |
| HUD Retry | Energy 0: room retry (+10s, restore `energyOnRoomEnter`, split) |

Form is the pile: **×2 Bear**, **×3 Hawk**. No Z/X/C. Touch pad is Kit / Fuse / Park only — no form buttons.

HUD: **`E adds the third → Hawk`** at ×2, **`E splits`** at ×3. Unfused: `E fuse two → Bear  ·  three → Hawk`.

Room retry is the HUD button. Do not resurrect a world Reset Bell.

---

## 8. Party states (LOCK)

| State | Behavior |
| --- | --- |
| Active | Input. |
| Follow | Tether. No pit hover. |
| Park | Anchored. Holds a plate after a door. Auto-applied to a form body when you swap off it. |
| Fused host | One collider. ×2 Bear or ×3 Hawk. Painted animal **behind** a chest knot of portraits — never hide the Axies. Badge PARK if left on a plate. |
| Absorbed | Physics hidden. Faces stay on the host chest. Its slot key selects the form body. |

---

## 9. Jobs, forms, lineage, parts (LOCK)

**Energy:** 100. Move / swap / park / split = 0. Fuse = 3 per join. Form follows size (no switch cost). No general regen. **Herbivore** (parked) is the exception: 1 energy / 4s, cap 3 per room.

### Unfused class jobs — every class has a kit

Lineage, not a three-class gate:

| Lineage | Classes | Kit |
| --- | --- | --- |
| Heavy | Plant, Reptile, Dusk | Slam (2, cactus → 1). Presses plates. |
| Slash | Beast, Bug, Mech | Slash. Sprint on Beast. |
| Flyer | Bird, Aqua, Dawn | Dart (2). Hover on Bird / Hawk form. |

A Reptile slams. A Bug slashes. An Aqua darts. Nobody is stuck without Space.

### Combat (LOCK) — fast vs slow, never locked

`PUZZLE_HP` = 3. Matching job deals 3 (one-shot). Off-kit deals 1 (three hits). **No class is required.**

| Object | Fast (1 hit) | Slow (3 hits) |
| --- | --- | --- |
| Brambles / thorns / core | Slash | Slam or dart. Dual Blade hits the whole L. |
| Eyes / crystal | Dart (Bird / Hawk seed) | Slash or slam. |
| Plate / paw-anchor | Plant parked (stays + regen) or Bear (hold after step-off) | Park **any** body and walk through. |
| Pits | Bird / Hawk fly | Slam or dart fills **1 tile**. Hawk seed fills the whole dart line. Do not one-shot fill a whole chasm. |

**Feedback (LOCK):** a chip is progress, not a miss. Cream `−1` floater + tick SFX. A clear is gold `−3` + brighter SFX. Eyes/crystal flash cream — never the red `*-bad` texture. Matching kit **telegraphs**: slash gold-tints thorns/core; dart cyan-tints eyes/crystal.

### Druidform — pile size is the form

| Form | Size | Kit | Native lineage (score 3) | Off-lineage (score 1) |
| --- | --- | --- | --- | --- |
| **Bear** | ×2 | Slam; presses plates / boss anchor | Plant, Reptile, Dusk | everyone else |
| **Hawk** | ×3 | Hover + dart; Seed-vines pits so a leftover ally can follow | Bird, Aquatic, Dawn | everyone else |

There is **no Cat form**. Slash is unfused slash-lineage (and Dual Blade Cleave). Fuse two Beasts and you get Bear slam — thorns then take three hits unless you split.

- **Bear Form** (Beast/Plant dominant): Heavy slam attack. Moves slowly but can take hits. Press Space/Kit for **Ground Pound** — a larger AoE slam that stuns brambles for 3 seconds before auto-shattering them.
- **Hawk Form** (Bird/Aqua dominant): Ranged dart attack. Moves extremely fast and flies over pits.
- **Lone Wolf** (Slash Lineage identity): If a Beast/Bug/Mech is left unfused while allies are in Druidform, it gains the Lone Wolf buff, giving it free slashes (0 energy cost) and ×1.5 reach.

**Form rating** = sum of lineage scores in the pile (3 or 1 per body).

**×2 / ×3**

| | ×2 Bear | ×3 Hawk |
| --- | --- | --- |
| Move | ×1.25 | ×1.5 |
| Ability range | ×1.25 | ×1.5 |
| Fuse clock | 8s | 14s |
| Job | slam / plates | fly + dart |

Plant+Bird in the pile: **+4s** (Dawn bonus). JSON parts add +2s each (pumpkin, pigeon-post, swallow).

**Bear — time to get across**  
After a Bear steps off a heavy plate, the gate stays down `max(2.0s, 0.4s × Bear rating)`. Any Bear can cross; heavier piles get more time. Unfused Plant **parked** still holds forever. Anyone standing or parked holds the plate while they occupy it.

**Slash — less energy (unfused slash lineage)**  
Slash cost = `max(1, 2 − Cat-lineage count)` when that formula is on the fused Cat path; unfused slash is `SLASH_COST`. Dual Blade is the verb, not a second form.

**Hawk — fly faster**  
Hover speed × `(1 + 0.15 × flyer count)`. Dart cost 2, or **1** if at least one flyer is in the pile. Three Plants can Hawk; they fly at ×1.0 and pay 2 per dart. Hawk dart **always** vines pit tiles it crosses.

### Parts — three layers (LOCK)

Official Core question: *what would make a player seek out a particular Axie for a specific purpose?* This game answers it in three layers. None of them are keys. Any L1 trio still finishes.

| Layer | What you seek | What you get | R1 |
| --- | --- | --- | --- |
| 1. Class | a Plant / Beast / Bird | which job is *fast* (slam / slash / dart); fuse size is Bear / Hawk | shipped |
| 2. Part name | a cactus, a dual-blade, a pigeon-post | which **verb** Space does | shipped |
| 3a. Evolved (`-2`) | **this** cactus, not T_1’s | the same verb, louder / a body mark | shipped on clover-2 + wing-horn-2 |
| 3b. Collectible | **your** Mystic / Origin / Meo | fireteam **signature** | schema only; gameplay is §16 |

**Rule:** part name = verb. Evo = intensity of that body. Collectible = how the fireteam exists. Parts do not skip a room. Rare is not “bigger Cleave.”

Named parts change **what Space does**. Affinity still changes numbers. One verb per form (priority). Dual Blade still fires on unfused slash.

**Bear** Cactus Thorn Hold > Carrot Root Pull  
**Slash lineage** Dual Blade Cleave  
**Hawk** Pigeon Post Pierce > Eggshell Split Dart > Swallow Tailwind

| Part | Effect |
| --- | --- |
| cactus horn | **Thorn Hold** — slam plants a 2s weight on a nearby plate. Plant cactus still −1 slam cost. |
| carrot tail | **Root Pull** — slam tugs the nearest parked ally 2 tiles (if no cactus in the pile) |
| dual-blade horn | **Cleave** — wider slash. Core still needs expose. |
| pigeon-post back | **Pierce** — dart skips the first wall / Treant. Also +2s fuse. |
| eggshell horn | **Split Dart** — two bolts at 15° (if no pigeon-post) |
| swallow tail | **Tailwind** — ×2 move for 2s after dart (if no pigeon-post / eggshell). Also +2s fuse. |
| herbivore mouth | Parked pile regen 1 energy / 4s, cap 3 per room |
| imp horn on a Beast | Slash range ×1.25 |
| cuckoo horn | Hawk dart range ×1.25 |
| ronin back | extra sprint on that body |
| pumpkin back | +2s Druidform |
| **clover ears L2** (`ears-clover-2`) | **Clover evo** — first kit in each room costs −1 energy. Why #10865685 ≠ T_1. |
| **wing horn L2** (`horn-wing-horn-2`) | **Wing Horn evo** — dart range ×1.25. Why AOE Bird is not a blank card. |

Part names stay (cactus, clover). The `-2` suffix is stored as `evolved` on that slot — not stripped. Evo pips on the collection card (`Evo ●○○○○○`).

Collectible fields on the snapshot (`parts[].specialGenes`, `title`) parse Mystic / Origin / Meo / etc. **No collectible gameplay in R1.** Signatures are vision (§16).

---

## 10. Scoring and failure (LOCK)

Primary: energy remaining at shrine. Tie-break: time. All-time honor board: name + energy + time, top 20, no wallet. Daily board is deferred.

| Fail | Result |
| --- | --- |
| Energy 0 | Exhaustion. HUD: Retry room (+10s) |
| Pit | Snap, split, −3 once |
| Softlock | HUD retry at energy 0 |

---

## 11. Fusion rules (LOCK)

- Unparked teammates in the same room. Any classes. One Fuse press absorbs all of them, up to ×3 (3 energy each). Fuse at ×3 splits. ×2 splits only if nobody is left to add (parked or other room).  
- The form is a **painted Bear (×2) or Hawk (×3)** behind the pile, fireteam portraits on the chest — never hide the Axies. Never the hollow orange crate.  
- Form follows size. No `Z`/`X`/`C`. Adding the third **is** the switch to Hawk.  
- Swapping off the form with `1`/`2`/`3` **parks** it.  
- Split: guests pop 32px, cost 0. Timer, pits, and **walking into a new room** also split.

---

## 12. Dungeon (LOCK)

Five rooms, 3–4 minutes. **Multiple paths.** Three of one class is a supported route. Puzzle props sit in **corners**, not on the hallway midline.

### Collection

Nine cards from the JSON. Pick three. Copy: *Any 3 can finish. Fuse two → Bear, three → Hawk. Slash is fastest on thorns.* Play-again returns here.

### Room 1 — thorns (slash is fastest)

Bramble **L** in the **north** gap. Center of the divider is wall — walk up, hit the bushes, around to the east door. **Slash one-shots. Slam/dart take three hits.** Dual Blade clears the L in one Space. A Bird (or Plant) can clear the room; it just costs more.

### Room 2 — fly + dart (or chip / fill)

**Wide 3-tile chasm.** East door is sealed until the eye. Eye sits in the **SE corner** behind a south LOS wall. Fast: hover the pit, walk south, dart (one hit). Slow: chip the eye in three slashes/slams, or slam-fill a 1-tile path and walk. The eye drops a **bridge** and opens the east door.

### Room 3 — plate + leftover

Wall + gate. **Plate is NW, lever is SE.**

1. Park **anyone** (`F`) on the plate, walk another through, pull the lever down-right. Plant parked also regens.  
2. Fuse **two** as Bear, stand on the plate, press the leftover’s `1`/`2`/`3` — Bear **auto-parks** — walk through, pull the lever. Bear keeps a hold after step-off.

If all three are fused there is no leftover; then the 2s+ hold-timer race is the fallback.

### Room 4 — fly, then thorns

**Short 2-tile fly-gap** on the door line only (walls block walking around). Fast: fuse **three** as Hawk (or unfused Bird) and fly it. Slow: slam/dart-fill the ditch. On the landing, **thorns** — slash one-shot or chip in three. Optional crystal in a **south-east** alcove (dart one-shot, else three hits).

This room teaches **size → form**. Room 2 does not.

### Room 5 — shrine (Bear, Hawk, slash)

Corners, not a hallway. Roots **latch** open on the first paw press (no hold race). Walking in splits a carried form — fuse again inside.

1. Fuse **two** as Bear on the paw-anchor — **SW**. Roots drop **and stay down**. Anyone can occupy the paw; Bear/Plant is faster.  
2. Add the third → Hawk. Dart the eye — **NE** (or chip in three).  
3. Split. Slash the ember — **SE** (or chip in three). Shrine lights; victory.

### Victory

Energy, time, +250 AXP (Simulated), Ascension line, copyable score. Optional name → all-time board (energy first, time tie-break, no wallet). Play again → collection.

---

## 10. Scoring & Team Rating (Axie Core)

The R1 demo uses a **Team Rating** system (S/A/B/C/D grade) that evaluates how well you composed and played your team.

Points are earned via:
1. **Energy Remaining** (1 pt per energy left, max ~80)
2. **Verb Routes Found** (10 pts each, max 30) — e.g. finding the Thorn Hold cracked wall shortcut or Pierce hidden eye.
3. **Lone Wolf Used** (10 pts) — if a slash-lineage Axie fought while allies were fused.
4. **Composition Bonus** (mutually exclusive paths):
   - **Lineage Coverage** (10 pts): having all 3 lineages (Heavy, Flyer, Slash) on the team.
   - **Mono-Class Challenge** (15 pts): all 3 Axies are exactly the same class (e.g. 3 Plants).

*Axie Core connection: The rating directly encourages players to replay the dungeon with different trios (e.g. going for the Mono-Class S-rank).*

---

## 13. Axie Core

Official prompt: *what would make a player seek out a particular Axie for a specific purpose in your game?*

Starting points, not a checklist. Token integration is not required. Basic play stays wallet-free.

**R1 answer (playable now)**

- **Class → fast job.** Plant slam/plates. Beast/Bug/Mech slash. Bird/Aqua dart. Fuse ×2 = Bear, ×3 = Hawk. Off-kit still completes — more hits, more energy.  
- **Part name → verb.** Cactus Thorn Hold. Dual Blade Cleave. Pigeon Post Pierce. Eggshell Split. Swallow Tailwind. Carrot Root Pull. Herbivore park regen. One verb per form (priority). Same rooms; Space feels different.  
- **Evo → this body.** `-2` is kept as a flag. Clover-2: first kit −1e/room (#10865685 ≠ T_1). Wing Horn-2: longer dart (AOE Bird is not blank). Pips on the card.  
- **How many:** ×3 is strictly better than ×2 (Hawk job + numbers).  
- **Mono is allowed:** 3 Plants clear; mixed keeps energy.  
- **Tokens not required. No wallet.**

That is “seek a cactus” plus “seek the cactus I evolved.” It is not yet “only this Mystic.”

**Vision (same dungeon, later snapshot)**

- **Collectible → fireteam signature.** Mystic / Origin / Meo from `specialGenes` + `title`. Schema is in. Gameplay is §16. Not a bigger Cleave. Not a gate.  
- **Evo on the verb part** (cactus-2, dual-blade-2) upgrades that verb’s intensity. R1’s evos happen to sit on non-verb slots, so they are body marks.  
- **Breeding target:** evolve the verb part on a collectible. One Axie, three layers.

**Do not**

- Mystic-only rooms, evo-locked shortcuts, collectible skip-expose.  
- Let Dual Blade skip the exposed core.  
- Bring back Cat form or Z/X/C.  
- Hard-refuse an off-kit hit (the old “dart will not cut them” / no-spend gate). Chip instead.

| Claim | R1 | Vision |
| --- | --- | --- |
| Seek a class | Pick-3 columns; class is *speed*, not a key | same |
| Seek a part name | verbs on Space | same |
| Seek this Axie | clover-2 vs T_1; wing-horn-2 | Mystic/Origin/Meo signatures; evo-on-verb |
| Fireteam | three owned bodies; fuse spends them | collectible changes how the pile exists |
| Core loop | +250 AXP (Simulated) | rebuilt JSON from a public address |
| Ownership | static JSON from a real address | same, no wallet for basic play |
| Combinations | any 2 → Bear, any 3 → Hawk | verb + evo + collectible on one body |

---

## 14. Tech (LOCK)

Vite + Phaser 3 + TypeScript. Arcade physics. `owned-axies.json` imported at build time. No Market, mixer, or wallet in R1. `pixelArt: false` — nearest-filter only generated tiles so Axie portraits stay smooth.

| Resource | This project |
| --- | --- |
| Origins Assets Kit | Optional stills |
| Animated 3D / Three.js mixer (beta) / Unity mixers | Vision only |

Each Axie: `{ slot, id, axieClass, parts, partClasses, evolved, collection, followPark, guests[], absorbedBy, form }`.

Combat: `src/config/combat.ts` (`PUZZLE_HP`, `puzzleDamage`). Form size: `formForSize()` in `src/config/forms.ts`. Honor board: gist `a5fdb966c851f7f55f6f0d521e9ad337` via `/api/scores`. Live: https://axie-druidform.vercel.app (board POST needs Vercel `GITHUB_TOKEN`).

---

## 15. Build status

**Shipped in the prototype**

- Collection pick-3 from static JSON  
- Five rooms, Zelda-dungeon look, unlabeled props, corner placements  
- Park, fuse ×2 Bear / ×3 Hawk (no Cat, no Z/X/C)  
- One Fuse press grabs every unparked teammate in the room  
- Painted Bear/Hawk behind a chest knot of portraits  
- `1`/`2`/`3` always pick Axies; swap-off auto-parks the form; room-enter splits  
- Lineage stats, 2s floor on Bear hold, Hawk always vines  
- Named part verbs + Herbivore park regen + evo pips  
- Any-kit combat: matching job one-shots, off-kit chips (HP 3); every class has a kit  
- Chip floaters + cream flash; matching-kit telegraph tint  
- Anyone can hold a plate; pits fill 1 tile on the slow path  
- Room 2 east sealed until the SE eye; Room 4 short fly-gap + thorns; Room 5 latching roots  
- HUD retry at energy 0 (no world bell)  
- Touch: Kit / Fuse / Park (no form buttons)  
- All-time honor board (name + energy + time, no wallet)  
- Boss beats + victory AXP  

**Still R1 polish**

1. Playtest the size-form dungeon (Room 4 split-then-slash, Room 5 ×2 → ×3 → split).  
2. Origins stills if time.  
3. Vercel `GITHUB_TOKEN` so the live board writes.

**Do not start:** live Market, mixers, wallet, totem stacking, Cat form, Z/X/C, Reset Bell, daily leaderboard.

---

## 16. Vision

Rebuild the JSON from a public address at build time. Named bonuses for Mech (slash lineage with Beast+Bug) and Dusk (Plant+Reptile as Bear). Mixer later. No default starters if IDs are missing — pick screen stays empty.

**Collectible signatures** (schema is in; gameplay is not). When the snapshot includes `specialGenes` / `title`, a Mystic / Origin / Meo is *this* Axie, not a better cactus:

- **Mystic** — fuse clock does not expire while that body is in the pile.  
- **Origin** — first fuse in each room costs 0.  
- **Meo** — parked Meo may fire its class kit once per room without swapping to it.

**Evo on the verb part** (later, when the snapshot has cactus-2 / dual-blade-2): same verb, louder — Thorn Hold lasts 3s, Pierce skips two blockers. Non-verb evos stay body marks (R1 clover-2 / wing-horn-2).

Basic play stays wallet-free. Any L1 trio still finishes. Collectibles and evo are score and fireteam texture, never a gate. Do not add Mystic-only rooms.

---

## 17. Submission checklist

- [ ] Title: Axie Druidform — Totem of Lunacia  
- [ ] Pitch §2 and vision §1  
- [ ] Playable link  
- [ ] First-play §18  
- [ ] Axie Core §13 + AXP screen  
- [ ] No wallet required  
- [ ] Thumbnail, repo, fallback video, AI tools  

---

## 18. First-play instructions (paste into the form)

Pick any 3 from the collection. No wallet. **Any trio can finish the shrine.** Mixed Plant + Beast + Bird is easiest. Three of one class still clears — more hits, more energy. Gold line on a card is the part **verb**; cyan **Evo** pips mean that body, not a generic cactus.  
`WASD` move. `1` `2` `3` pick an Axie (`Tab` cycles). First room: **any kit chips the north bushes; slash is one hit, slam/dart take three.** `F` parks the others. `E` fuses: **two → Bear, three → Hawk**.  
Room 3: plate is up-left. Fuse two as Bear (or park anyone), leftover walks through, lever is down-right.  
Room 4: Hawk the pit (fuse 3 or Bird), slash or chip the door thorns. Crystal is down-right.  
Room 5: fuse two on the paw, add the third for the eye, split and slash (or chip) the ember.  
`Space` uses that job. Energy remaining is the score. HUD retry if energy hits 0.

---

## 19. Out of scope

Default starters · wallet connect · live Market / API keys · totem stacking · `1`/`2`/`3` as form keys · **Cat form** · **`Z`/`X`/`C` form switch** · single-hero morph · requiring a Beast (or Mech/Dusk) to finish R1 · per-Axie `F` · partial split · wallet / verified leaderboard · treating Discord Core as a checklist · Mystic-only rooms · evo-gated shortcuts · collectible as skip-expose · world Reset Bell · daily leaderboard · hard-refuse off-kit (no-spend on the wrong job)

---

## 20. Change log

| Date | Change |
| --- | --- |
| 2026-09-15 | GDD synced to prototype: size-forms, any-kit combat, telegraph/floaters, no Beast required, Zelda look, latching shrine, corner rooms. |
| 2026-09-15 | No Beast required. Slash one-shots thorns; slam/dart take 3. Every class has a kit. |
| 2026-09-15 | Cat form removed. ×2 = Bear, ×3 = Hawk. No Z/X/C. Touch loses form buttons. |
| 2026-09-15 | Chip floaters + cream flash (not fail-red). Matching kit gold/cyan-tints the target. |
| 2026-09-15 | Any kit completes every puzzle. Matching job one-shots (HP 3). Off-kit chips. Anyone can hold a plate; fly is still fastest over pits. |
| 2026-09-15 | Painted Bear/Hawk behind a chest knot of Axie portraits. One Fuse press grabs every unparked teammate. Room-enter splits. |
| 2026-09-15 | Puzzle props moved to corners (R1 north L, R2 SE eye, R3 plate NW/lever SE, R4 SE crystal, R5 paw SW/eye NE/ember SE). |
| 2026-09-15 | Room 5 roots latch open. Shrine still needs eye + paw + ember. |
| 2026-09-15 | Room 2 east door sealed until the eye. Room 4 is a short fly-gap + thorn choke, not a second chasm. |
| 2026-09-14 | Feel pass: silhouettes, walk bob, hit-stop, energy floaters, SFX. |
| 2026-09-14 | Touch pad restyle: stone wells, gold rims, icons, larger hits. Portraits top-right on phones. Menu plates. |
| 2026-09-14 | All-time honor-system board: name + energy + time. No wallet. HUD retry; no world bell. |
| 2026-09-11 | Evolved parts kept as flags (no longer strip `-2`). Clover-2: first kit −1e/room. Wing Horn-2: dart range ×1.25. Evo pips on collection cards. Collectible schema (`specialGenes`, `title`) parsed; Mystic/Origin/Meo signatures are vision only. |
| 2026-09-11 | Named part verbs: Cactus Thorn Hold, Dual Blade Cleave, Pigeon Post Pierce, Eggshell Split Dart, Swallow Tailwind, Carrot Root Pull. Herbivore parked regen (cap 3/room). Collection cards show the verb. One verb per form (priority). |
| 2026-09-10 | Synced to prototype: `1`/`2`/`3` always Axies, auto-park on swap-off, any trio can finish, Room 4 thorn gate (not a second dart chasm), Hawk always vines, Bear hold floor 2s. |
| 2026-09-09 | Druidform is Bear / Cat / Hawk (Cat later removed 2026-09-15). Lineage stats. 3-same-class route. |
| 2026-09-09 | Static `owned-axies.json` pick-3 from 0xdf8b…27c4. |
| 2026-09-09 | Totem stacking cut. |
| 2026-09-07 | Original Phaser R1 lock. |
