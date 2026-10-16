# Gremlin Gauntlet: World 5 handoff (for the next developer / AI)

**Owner:** Cath (not a developer: explain things simply, test on her phone, ask before big changes).
**Date written:** 16 Oct 2026, by Claude. **Branch:** `world5-wip` (all World 5 work so far). `main` is live.
**Live site:** https://cathstambo.github.io/Gremlin-Gauntlet/ (GitHub Pages serves `main`; pushing to `main` = live).

---

## 1. The project in one minute

- Phaser 3.80.1 landscape mobile browser game, no build step. `index.html` loads `src/main.js` as an ES module.
- Logical size 1920×1080, `Scale.FIT`. Ground line `GROUND_Y = 870`.
- Scenes (`src/main.js`): `Boot`, `Menu`, `Run`, `Boss` (World 1), `Overlord` (key `Boss2`), `Cartel` (key `Boss4`), `UI`.
- **Worlds 1–4 are finished and live.** World 5 is half-built on the `world5-wip` branch.
- Design source of truth: the GDD (`Gremlin_Gauntlet_GDD_v1_7.docx`, in Cath's Claude project) plus the addenda (`GDD_addendum_boss_arenas.md`, `GDD_addendum_start_menu.md`, `GDD_addendum_world4.md`). World 5 = "Boss 5 — Sylvanas: LASER TITS", world "Dungeon of Questionable Pleasures". The key rules are copied into section 4 below.

### House rules (follow these)
1. **Approved art is sacred.** Use Cath's drawings as given (cut out, scaled, flipped, rotated); don't redraw characters. Effects such as glows, lines and markers may be drawn in code.
2. **Don't use Phaser `preFX` / `postFX`** in new code: it breaks on Cath's phone. Fake glows with a tinted copy (`setTintFill`) behind the sprite.
3. **Everything dangerous is telegraphed** with a clear warning (red ring/marker/band, a wind-up pose) and has a safe answer (jump / slide / blast / move).
4. **Cache-busting:** before every commit run `python3 tools/stamp.py`. It stamps `?v=` on every import, so phones fetch new code. New files must be imported with a relative path; the stamper adds the version.
5. **Test on a separate link first.** New worlds stay hidden behind a test address until Cath approves (World 5: `#test5`, already wired). Only then open the menu card (see 6.4).
6. Commits: short message saying what changed for the player.
7. No music for World 5 yet: `Music.play(this, null)`.

### Useful addresses (append to the site URL)
`#test5` menu with the World 5 card unlocked · `#world5` part 1 · `#world5part2` part 2 · `#boss5` Sylvanas (scene not built yet; see section 3).

### How to test locally
`cd` into the repo, run `python3 -m http.server 8766`, then open `http://localhost:8766/#world5`. The pause button (II) can show hitboxes and slow motion.

---

## 2. What is DONE on `world5-wip`

### Art (all cut out to transparent WebP in `assets/dungeon/`; texture keys = `d_` + file name)
- **Backgrounds:** `bg_far.jpg`, `bg_mid`, `bg_near`, `ground` (checkerboard removed, seamless). The config is `DUNGEON` in `src/world/Swamp.js` (`groundSurface 350`, `gS 1.35`, dimmed tints).
- **Enemies:**
  - maid1/2/3, maid_throw/throw2, maid_dead
  - hound1/2, hound_leap, hound_crouch, hound_dead
  - garg1/2, garg_swoop, garg_dead
  - knight1, knight_wind, knight_swing, knight_paddle
  - mimic_shut/open/tongue/lash/dead
  - paddle (a small rack paddle, scaled up)
- **Hazards:** flogger, cross_up/cross_tip/cross_down, plate + spikes, flame0–5, bench.
- **Scenery:**
  - Gags and signs: reception (skeleton receptionist), knitter (skeleton knitting in a swing), reader (skeleton on a cross with a newspaper), polisher (armour polishing a paddle), sign_tacos, sign_refunds, sign_fivestar.
  - Area signs and lighting: sign_dungeon, sign_ways (PLEASURE CHAMBERS / ROYAL DUNGEON post), candles, gargoyle_torch.
- **Sylvanas** (boss only):
  - full-body poses: s_front, s_reach, s_battle, s_back, s_side, s_walk, s_lunge, s_side2, s_walk2, s_throw, s_hurt
  - face close-ups: f_smug, f_angry, f_shock, f_hurt
  - laser poses: l_charge, l_charge2 (glowing chest), l_recover
  - **Facing:** the side, walk, lunge and laser poses face RIGHT; s_throw reaches LEFT; s_front, s_battle and s_back face the viewer.
  - **Chest point** (laser origin) in `l_charge` art pixels ≈ (205, 105) of 286×346.
- **Effects:** beam, beam2 (laser strips 465×74, drawn pointing right), spark, ring.
- **Arena** (boss only): `arena_bg.jpg` (bedchamber with the four-poster bed in the middle; it has its own floor), `floor` (flagstone strip, seamless), bench_l / bench_m / bench_s (floating purple benches; the cushion top is about 22 px from the top of the image).
- **Novelty projectiles** (boss only): nov_{pink,cyan,purple,lime}_{s,l}. The small ones are 93×140, the large 214×305; they stand upright with the tip at the top.
- **File lists:** `DUNGEON_FILES` (runs) and `SYLV_FILES` (boss extras) in `src/world/Swamp.js`. The loader is `loadDungeon(scene, boss)` in `src/worlds.js`.
- **Menu thumbnail:** `assets/menu/thumb_world5.webp` is currently a **copy of World 4's: replace it** (see 6.3).

### Code
- `src/worlds.js`: World 5 entry: `boss: 'Boss5'`, `bossTitle 'LASER TITS'`, `bossName 'SYLVANAS'`, stages `W5_STAGE1/2`, bench platforms. `LAST_WORLD = 5`.
- `src/creatures/Dungeon.js`: the World 5 enemies. Same interface as the other creatures (`update(dt, ctx)`, `hitbox()`, `shot()`, `centre`, `points`).
  - **Maid** = Boner Brigade: marches, winds up, throws a **Bone** that bounces along the floor; jump or blast. Her skull quips when she dies.
  - **Hound**: fast; crouches, then leaps; jump or blast.
  - **Gargoyle** = Restless Spirit: swoops to head height; slide or blast; drops a "COMPLAINT FORM".
  - **Knight** = Disciplinarian: magic pings off (`immune`). A red band warns before his whip cracks at head height; slide under. Sliding past his legs is safe. Says "BAD GREMLIN!" when he hits you. Only Meltdown kills him.
  - **Mimic**: a chest on the path; creaks open (warning), then lashes its tongue along the floor; jump; 2 blasts; 150 points.
  - **Paddle** = Possessed Paddle with inscriptions BEHAVE / TRY AGAIN / NICE TRY, BITCH. Lane `fly` = head height (slide); `bounce` = bounces along the floor (jump).
- `src/scenes/Run.js`: World 5 hazards and set pieces in `updateDungeon(dt)`, plus spawn code in `spawnItem` and hitboxes in `itemRect`.
  - **Hazards:** `flogger` (swings at head height: slide), `cross` (rattles, red marker, topples across the path and stays: jump), `bench` (jump), `spikes` (plate rattles, then spikes: jump), `flames` (purple vent: jump).
  - **Set pieces:** `area` (big area-name title as you enter), `zap` (Royal Dungeon: Sylvanas's laser from up in the castle zaps one of her own guards).
  - **Scenery:** `deco` (scenery; `up` lifts signs onto the wall).
- `src/course.js`: `W5_STAGE1` = The Reception → The Equipment Room; `W5_STAGE2` = The Pleasure Chambers → The Royal Dungeon. Each danger appears alone first, and the closing stretch has about a second between threats.
- `src/scenes/UI.js`: World 5 intro texts, part-cleared texts, boss intro text, phase names (`LASER TITS OF DOOM` / `THE GREAT DONG OFFENSIVE` / `MAXIMUM PENETRATION`), and the "Sylvanas has been returned to sender" win line.
- `src/scenes/Boot.js`: the `#world5`, `#world5part2`, `#boss5` and `#test5` shortcuts; loads `menu_thumb5`.
- `src/scenes/Menu.js`: World 5 card; `soon: location.hash !== '#test5'` (hidden on the normal menu until approved).

### Not yet tested on `world5-wip`
- Part 1 was screenshot-checked (enemies readable, warnings show). Part 2 has **not** been screenshot-checked or bot-tested.
- No playtest bot has been run on either part. Copy the World 4 approach (section 5).

---

## 3. What is LEFT TO DO

### 3.1 Fix / check in the running parts
1. **Strip at the very bottom of the screen:** a thin purple/blue strip shows under the path in World 5. `Backdrop` adds an `under` rectangle when `cfg.under` is set (`DUNGEON.under = 0x15101a`), but the strip still shows.
   - Check the ground image's transparent bottom rows (`groundBottom: 495`) and the rectangle's y.
   - Or raise `gS` a little, or drop `groundBottom` to ~480.
2. Screenshot-check part 2: gargoyles, flames, mimic, hounds, spikes, bouncing paddles, the zap beam and the gargoyle torches.
3. **Bot-test both parts.** A careful player should finish both; one who never uses magic should also finish, with a few hits. Re-space anything that comes too close together.
4. The background is busy. If enemies are hard to see on Cath's phone, dim `midTint` / `nearTint` further in `DUNGEON`.

### 3.2 Build the boss: Sylvanas, scene key `Boss5`
Create `src/scenes/Dungeon5.js` (any name) as `export class Sylvanas5 extends Boss` with `constructor() { super('Boss5'); }`. Register it in `src/main.js`'s scene list.

**Copy the structure of `src/scenes/Cartel.js` (Rina, World 4).** It is the newest and cleanest boss and already does almost everything needed:
- `preload()` calls `loadDungeon(this, true)`.
- Boss-arena rules: joystick, platforms, potions (one on the high bench, plus one each at phases 2 and 3), crystals.
- Speech bubble with a face close-up beside it.
- A step queue (`plan()` / `nextStep()`) with `{m: move}`, `{wait: s}`, `{hop: 'far'}` steps.
- Vulnerable windows: `e.vulnT` plus `this.events.emit('bossvuln', seconds)`.
- `damageEddie(n)`: the shared name for "boss takes damage"; it scales by `DIFF.k.boss`.
- `win()` runs a scripted, skippable defeat sequence (localStorage flag) and ends with `this.events.emit('finished', this.finalScore())`.

**Boss sprite class.** Copy `src/queso/Rina.js` to e.g. `src/dungeon/Sylvanas.js`. It animates by swapping full-body drawings and moving them as a whole (lean, squash, hop). Set its `DRAW` table to the `d_s_*` and `d_l_*` keys with the facings listed above. `faces: 1` = drawn facing left; `-1` = drawn facing right. Height on screen ≈ 640 px.

**Arena:**
- Background: `d_arena_bg`, scaled to cover the screen and dimmed a little (tint around `0xc8c0c8`).
- Floor: put `d_floor` (tileSprite) so its walking surface sits on `GROUND_Y`.
- Platforms (readme: "three stationary benches: two lower and a shorter higher central one"):
  - `bench_m` at left, x 330–690, h 230
  - `bench_m` at right, x 1230–1590, h 230
  - `bench_s` in the centre, x 840–1080, h 430

**Phases (GDD, locked):**
1. **Phase 1, Laser Tits of Doom (100–70% HP).** Purple/pink beams from her chest.
   - **Warning:** about 0.9 s in the `l_charge` pose with a pulsing chest glow, plus a thin pink aiming line across the arena at the lane height.
   - **Lanes:** **high** (about 215 px above the floor) = SLIDE; **low** (about 70 px) = JUMP. Alternate high and low.
   - **Firing:** draw `d_beam` as an image stretched from her chest to the arena edge on her facing side. For a low beam, draw a short angled piece down from her chest, then a horizontal beam along the low lane. The hitbox is the horizontal band.
   - **Vulnerable after the armour overheats:** after 2–3 beams she uses `l_recover` with steam/sparks drawn in code and stays **still** for about 3 s. Cath asked bosses to stand still while vulnerable (Rina feedback).
2. **Phase 2, The Great Dong Offensive (70–35%).** She throws the neon novelty projectiles (`d_nov_*`), using the `s_throw` pose.
   - **Cath's rule, 16 Oct 2026:** they do NOT boomerang. Each one either **flies straight past** (at the high or low lane: slide or jump), or is **lobbed and sticks upright in the floor**, swaying a little (gentle rotation about the base) for about 3 s, then fades. While stuck it hurts to touch, so jump over it or walk around via a bench. A landing ring shows where a lobbed one will land.
   - Use all four colours at random and both sizes (large = slower, bigger hitbox).
   - **Vulnerable while reloading:** about 3 s in the `s_back` pose, rummaging. She stays still.
3. **Phase 3, Maximum Penetration (<35%).**
   - Combined lasers and projectiles, a bit faster (`timeScale` ≈ 1.15).
   - Occasional skeleton maids run across the arena: jump them or blast them. Reuse the stampede code from Rina's scene with `d_maid2/3` frames.
   - Purple torch flare effects.
   - **ULTIMATE LASER:** a long charge (about 1.6 s), while the whole floor flashes with a "GET UP HIGH" warning. Then a fat beam sweeps the whole floor up to about 260 px. Standing on a bench is safe (bench tops are at 230+). Afterwards her armour overheats: **vulnerable about 4 s, standing still**.
- Touching her hurts, except while she's vulnerable. Magic only hurts her while vulnerable; Meltdown always does. This is the same as the other bosses; copy `collide()` from `Cartel.js`.

**Dialogue (GDD; Cath approved it as written, 16 Oct 2026):**
- **Entrance:** "WELCOME TO MY DUNGEON, YOU MISERABLE LITTLE SHIT!" / "PREPARE TO EXPERIENCE THE FULL FORCE OF MY TITS!" / "NOW LET'S GET THIS PARTY STARTED!"
- **Lasers:** "BEHOLD THE POWER OF MY FUCKING TITS!" / "EYES UP HERE, ASSHOLE!"
- **Novelty projectiles:** "CATCH THIS, YOU LITTLE PRICK!" / "I'VE GOT SOMETHING SPECIAL FOR YOU!"
- **Final phase:** "YOU WANTED THE FULL EXPERIENCE? HERE IT FUCKING COMES!" / "NOBODY LEAVES MY DUNGEON UNSATISFIED!"
- **Takes damage:** "THAT'S NOT HOW THIS IS SUPPOSED TO WORK!"
- **Defeats the gremlin:** "THANK YOU FOR VISITING. FIVE STARS, BITCH!"
- **Defeated:** "YOU CAN'T DEFEAT ME! I'VE GOT BATTERIES!"
- Faces: smug = taunts; angry = attacks and hurt; shock = defeat; hurt = vulnerable.

**Defeat sequence: "Skeleton Rebellion" (GDD, adjusted by Cath, 16 Oct 2026).** Cath said to **ignore the whole supervisor thing**: no clipboard skeleton, no inspection papers, no stamp. **She staggers back onto the four-poster bed** (the bed in the middle of `arena_bg`) instead of a throne. Sequence:
1. She staggers to the bed, armour sparking (`s_hurt`): "YOU CAN'T DEFEAT ME! I'VE GOT BATTERIES!"
2. She orders the guards: "GUARDS! GET THE GREMLIN!" Skeleton maids march in from the edges.
3. The guards stop, look at each other, and turn on her (revolt).
4. "WHAT THE FUCK DO YOU THINK YOU'RE DOING?!" She fires one tiny, useless laser spark (`d_spark`, tiny).
5. The maids carry her over to a giant padded equipment chest and dump her in.
   - **Chest art:** there's no separate chest sprite yet. Either cut the padded chest from `Sylvanas_Dungeon_Decorations/01_Static_Furnishings.png` (around x 1228–1440, y 300–432), or use `d_mimic_shut` scaled up.
   - She drops in from above behind the chest, hidden with a geometry mask, and the chest shakes.
6. A code-drawn paper label on the chest: "RETURN TO SENDER / DEFECTIVE OVERLORD".
7. From inside: "YOU UNGRATEFUL BONY BASTARDS!"
8. The skeletons cheer and throw paddles and novelty projectiles in the air. A falling purple novelty projectile knocks one maid apart (swap her to `d_maid_dead`).
9. BOSS DEFEATED, then `emit('finished', this.finalScore())`. Tap to skip after the first viewing.

### 3.3 Hook-ups after the boss works
1. `src/main.js`: add the boss scene to the scene list.
2. `UI.js` already handles `Boss5` as a boss (scene key starts with `Boss`) and saves the best score per difficulty.
3. **Grand victory screen (GDD, locked)** after beating World 5 in a FULL EVENT run of all five worlds. This is optional and **ask Cath first**: "CHAOS CONQUERED!", "YOU MAGNIFICENT LITTLE BASTARD!", total score, rank "CERTIFIED MENACE". Currently each world returns to the menu.

---

## 4. Decisions Cath made for World 5 (16 Oct 2026)
- **Enemy roles:** maids = Boner Brigade; gargoyles = Restless Spirits; knights = Disciplinarians; hounds = fast runners you jump; mimics = chests that lash their tongue. **Make the Possessed Paddles** (done). **Skip the Leather Imps.**
- **No supervisor** at all: no Dungeon Inspection mini-event in the run, none in the ending.
- **The ending uses the bed**, not a throne.
- **Projectiles:** the neon novelty shapes are what she throws. They don't boomerang. They stick in the floor and sway a little, or just fly past.
- **Traps:** only floggers, crosses and benches (GDD), plus spike floors and flame vents as simple jump hazards. Don't use the other traps on the hazard sheet.
- **Structure:** two running parts (Reception + Equipment Room; Pleasure Chambers + Royal Dungeon), then the boss. Same hearts, checkpoint, potion and score rules as Worlds 1, 2 and 4.
- **Dialogue:** use the GDD lines as written.
- Readmes: decorations are scenery only (no collision); don't invent new art; keep hazards visibly different from scenery.

---

## 5. Testing approach that worked (headless Chromium + Playwright)
- Start a server from the repo folder: `python3 -m http.server 8766`.
- **Screenshot script pattern:** open the page with `#world5`, call `game.scene.getScene('UI').act('tap')` to start, then step the scene manually and screenshot:
  ```js
  const R = game.scene.getScene('Run'); game.loop.sleep(); let ft = performance.now();
  while (R.dist < 5000) { ft += 16.7; R.sys.step(ft, 16.7); game.scene.getScene('UI').sys.step(ft, 16.7); }
  game.loop.wake();
  ```
- **Bot pattern:** `/home/claude/work/bot_w4.js` and `boss_w4.js` from the previous machine (not in the repo). They loop over `R.creatures` and `R.items`, call `g.jump()` / `g.slide()` / `g.attack()` at the right distances, and log every hit with what was nearby.
- **Headless pitfalls:** tweens run on real time, so they won't advance while stepping manually; use the scene's own timers (`this.after()` in boss scenes) for gameplay. Wait for a scene to exist with `waitForFunction` before using it.

---

## 6. Finishing steps
1. On `world5-wip`: finish 3.1–3.3, run `python3 tools/stamp.py`, commit.
2. Merge `world5-wip` into `main` and push. The World 5 card stays hidden on the normal menu; Cath tests at `https://cathstambo.github.io/Gremlin-Gauntlet/#test5`. GitHub Pages can take up to 10 minutes; `?new=1` before the `#` forces a fresh copy.
3. **Replace the menu thumbnail:** take a 1920×1080 screenshot of the Sylvanas arena with the gremlin and Sylvanas in shot. Resize it to 640×360 and save as `assets/menu/thumb_world5.webp`.
4. **When Cath approves:** in `src/scenes/Menu.js` change the World 5 card to `{ n: 5, title: 'DUNGEON OF QUESTIONABLE PLEASURES', boss: 'SYLVANAS · LASER TITS' }` (remove `soon`). Then stamp, commit and push.
5. Write a short "World 5 as built" note for Cath's project docs, in the style of `GDD_addendum_world4.md`.
