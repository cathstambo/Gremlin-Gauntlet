// Running stages for every world (1 = easy to medium, 2 = busier and harder), then on to that world's boss.
// Hearts, Chaos Meter and score carry from stage 1 to stage 2 to the boss; part 2 is a checkpoint.
import { Gremlin } from '../gremlin/Gremlin.js?v=20261015191024';
import { WORLDS, worldNo, loadMeadow, loadWild } from '../worlds.js?v=20261015191024';
import { Chase, CHASE } from './Chase.js?v=20261015191024';
import { Goat } from '../world/Goat.js?v=20261015191024';
import { Moose, Bear, Salmon, ChargeBear } from '../creatures/River.js?v=20261015191024';
import { Wolf, Eagle, Fox } from '../creatures/Wild.js?v=20261015191024';
import { Music, Sfx } from '../audio/Music.js?v=20261015191024';
import { Frog, Gator, Bat, Spider } from '../creatures/Creatures.js?v=20261015191024';
import { Bunny, Kitten, Flower, Swarm } from '../creatures/Meadow.js?v=20261015191024';

const CREATURES = { frog: Frog, gator: Gator, bat: Bat, spider: Spider, bunny: Bunny, kitten: Kitten, flower: Flower, swarm: Swarm, wolf: Wolf, eagle: Eagle, fox: Fox, moose: Moose, bear: Bear, salmon: Salmon, cbear: ChargeBear, hawk: Eagle };
// rainbow beam (World 2): turret size, how far it sinks into the path, and the beam's band (px above the ground)
const BEAM = { low: { s: 0.5, sink: 95, y0: 112, y1: 38 }, high: { s: 0.72, sink: 4, y0: 262, y1: 172 }, warn: 0.95, fire: 0.5, startGap: 1320 };
export const GROUND_Y = 870, GREMLIN_H = 330;
export let GREMLIN_X = 520;   // the World 3 test version moves the gremlin (see create)
const TRUNK = { s: 2.3, cut: 135 };
// River Run bridge crossings (Cath's three bridge drawings). Positions are in the drawing's own pixels; s = display scale.
// deck = the walking line; path = where the drawing's own banks replace the path; gaps = no floor (you fall in).
// Gap sizes vs the gremlin's jumps (~610 px single, 860-980 px double): broken river ~220 px (one jump), canyon ~580 px (double jump;
// a single jump only makes it from the very edge).
export const BRIDGE = {
  s: 1.6, deck: 315, path: [170, 1997],
  whole: { key: 'r_br_whole', gaps: [] },
  river: { key: 'r_br_river', gaps: [[1045, 1185]] },
  canyon: { key: 'r_br_canyon', gaps: [[900, 1262]] },
};
BRIDGE.w = 2167 * BRIDGE.s;
// Uzi Rampage. Debris that Grunt's Uzi bursts knock down from the cliffs: it lands on the red marker and stays there (jump it).
//   lead = how far ahead of the gremlin the burst picks its spot (~2 s of running); warn = marker time before it falls.
export const DROP = {
  lead: 1150, warn: 0.7, fall: 0.32,   // so it lands ~560 px ahead of the gremlin: plenty of room to jump it
  rock: { fall: 'u_rock4', rest: 'u_rock_rest', s: 0.72, box: { w: 160, h: 120 }, restRot: -0.5 },
  rockS: { fall: 'u_rock3', rest: 'u_rock_rest_s', s: 0.68, box: { w: 115, h: 75 }, restRot: -0.45 },
  branch: { fall: 'u_branch1', rest: 'u_branch1', s: 0.9, box: { w: 290, h: 75 }, restRot: -0.05 },
  branch2: { fall: 'u_branch3', rest: 'u_branch3', s: 0.75, box: { w: 300, h: 75 }, restRot: -0.12 },
};
// Rock shelves (slide under). cut = image row where the overhanging slab ends (above: drawn in front of the gremlin;
// below: the support, drawn behind the trail); under = row of the slab's underside; U = its height above the trail.
export const SHELF = {
  s: 1.5, U: 145,   // the gremlin is ~257 px tall standing and ~87 px sliding; a slide covers ~900 px, longer than any shelf
  1: { key: 'u_shelf1', cut: 150, under: 130, w: 529 }, 2: { key: 'u_shelf2', cut: 140, under: 120, w: 396 }, 3: { key: 'u_shelf3', cut: 175, under: 150, w: 629, s: 1.3 },
};   // World 3 fallen trunk: scale, and the row of the art where the log ends and the gap begins

export const POINTS = { taco: 100, margarita: 250, levelComplete: 500, perHeart: 200, noDamage: 1000, chase: 1000 };
const MOULD_HURT_AFTER = 0.55;   // seconds standing in mould before it costs a heart (it always slows you)

// how each hazard / pickup is drawn: texture, display scale, and how far the image bottom sits below the ground line
const LOOK = {
  roots: { key: 'haz_roots', s: 0.92, sink: 22 },
  mould: { key: 'haz_mould', s: 0.92, sink: 22 },
  sludge: { key: 'haz_sludge', s: 0.92, sink: 34 },
  sludgeWide: { key: 'haz_sludge', s: 2.0, sink: 74 },
  vines: { key: 'haz_vines_hang', s: 1.3 },
  root: { key: 'w_haz_root', s: 0.85, sink: 14 }, boulder: { key: 'w_haz_boulder', s: 0.82, sink: 14 },
  rockS: { key: 'r_rock_s', s: 0.55, sink: 16 }, rockM: { key: 'r_rock_m', s: 0.5, sink: 18 }, rockL: { key: 'r_rock_l', s: 0.46, sink: 20 },
  taco: { key: 'pick_taco', s: 0.47 }, margarita: { key: 'pick_margarita', s: 0.5 },
  crystal: { key: 'pick_crystal', s: 0.42 }, potion: { key: 'pick_potion', s: 0.47 },
};
// collision boxes (screen px): ground hazards are anchored bottom-centre on the ground; pickups are centred
const BOX = {
  root: { w: 230, h: 85 }, boulder: { w: 170, h: 110 },
  rockS: { w: 150, h: 70 }, rockM: { w: 220, h: 85 }, rockL: { w: 230, h: 105 },
  roots: { w: 170, h: 80 }, mould: { w: 220, h: 60 }, sludge: { w: 220, h: 40 }, sludgeWide: { w: 600, h: 40 },
  taco: { w: 90, h: 80 }, margarita: { w: 80, h: 90 }, crystal: { w: 70, h: 90 }, potion: { w: 80, h: 90 },
};
const rnd = (a, b) => a + Math.random() * (b - a);
const PICKUPS = new Set(['taco', 'margarita', 'crystal', 'potion']);
const HAZARDS = new Set(['roots', 'vines', 'mould', 'sludge', 'sludgeWide']);
const SHADOW_W = { rockS: 210, rockM: 280, rockL: 290, root: 330, boulder: 250, roots: 300, mould: 300, sludge: 300, sludgeWide: 680 };
export const MAX_HEARTS = 6;   // 3 normal + up to 3 gold bonus hearts from potions drunk at full health

export class Run extends Phaser.Scene {
  constructor() { super('Run'); }

  preload() {
    if (worldNo(this.registry) === 3) {
      const t = this.add.text(this.scale.width / 2, this.scale.height / 2, 'Something big is in the woods…', { fontFamily: 'Lilita One, Trebuchet MS, sans-serif', fontSize: 44, color: '#ece6f5' }).setOrigin(0.5);
      this.load.once('complete', () => t.destroy());
      loadWild(this);
    }
    if (worldNo(this.registry) === 2) {
      const t = this.add.text(this.scale.width / 2, this.scale.height / 2, 'Picking flowers…', { fontFamily: 'Lilita One, Trebuchet MS, sans-serif', fontSize: 44, color: '#ece6f5' }).setOrigin(0.5);
      this.load.once('complete', () => t.destroy());
      loadMeadow(this);
    }
  }
  create() {
    this.world = worldNo(this.registry); this.W = WORLDS[this.world];
    this.stage = this.registry.get('stage') || 1;
    const carry = this.registry.get('carry') || { hearts: 3, chaos: 0, score: 0, damaged: false };
    this.mode = 'ready';            // ready → running → finished | dying → gameover
    this.startCarry = carry;        // checkpoint: what you had when this part began
    this.hearts = carry.hearts; this.chaos = carry.chaos; this.score = carry.score; this.damaged = carry.damaged;
    this.dist = 0; this.timeScale = 1; this.showBoxes = false;
    this.sizes = this.W.sizes(this);
    // World 3 test version: zoom the camera out (top-left anchored, ground stays where it is on screen) so Grunt fits fully behind her
    const V = this.W.view, cam = this.cameras.main;
    this.viewW = this.scale.width; this.viewH = this.scale.height; let view = null;
    if (V) {
      this.viewW = this.scale.width / V.zoom; this.viewH = this.scale.height / V.zoom;
      view = { y: GROUND_Y - GROUND_Y / V.zoom, w: this.viewW, h: this.viewH, zoom: V.zoom };
      cam.setOrigin(0, 0).setZoom(V.zoom).setScroll(0, view.y);
      GREMLIN_X = Math.round(V.gremlinAt * this.viewW);
    } else { cam.setOrigin(0.5, 0.5).setZoom(1).setScroll(0, 0); GREMLIN_X = 520; }
    const Backdrop = (this.W.backdrops && this.W.backdrops[this.stage - 1]) || this.W.backdrop;
    this.swamp = new Backdrop(this, GROUND_Y, view ? { view } : undefined);
    Music.play(this, { 1: 'run', 2: 'w2', 3: 'w3' }[this.world] || null);   // each world has its own music
    this.items = this.W.stages[this.stage - 1].filter(c => !(this.W.noTrunks && c.t === 'trunk')).map(c => ({ ...c, obj: null, done: false }));
    this.beamG = this.add.graphics().setDepth(10).setBlendMode(Phaser.BlendModes.ADD);
    this.blind = [];   // butterflies covering the screen after the gremlin blunders into a swarm
    this.orbs = []; this.creatures = [];
    this.orbG = this.add.graphics().setDepth(13).setBlendMode(Phaser.BlendModes.ADD);
    this.hazG = this.add.graphics().setDepth(6);
    this.shadowG = this.add.graphics().setDepth(4.6);   // dark contact shadows that sit hazards ON the path
    this.boxG = this.add.graphics().setDepth(30);

    this.g = new Gremlin(this, GREMLIN_X, GROUND_Y, GREMLIN_H);
    this.g.floorAt = x => this.platformAt(x);
    this.g.idle();
    this.g.on('shoot', p => this.spawnOrb(p));
    this.g.on('meltBlast', () => this.meltBlast());
    this.g.on('died', () => this.time.delayedCall(1100, () => { this.mode = 'gameover'; this.events.emit('gameover', this.chase && this.chase.phase === 'catch' ? 'CAUGHT!' : undefined); }));
    this.maxHearts = this.W.maxHearts || MAX_HEARTS;
    this.GROUND_Y = GROUND_Y; this.GREMLIN_X = GREMLIN_X;
    this.retry = !!carry.retry;
    if (this.W.chase) this.chase = new Chase(this, carry.prox ?? this.W.chase.start[this.stage - 1]);
  }

  // ---------- flow (called by the UI scene) ----------
  startRun() { if (this.mode === 'ready') { this.mode = 'running'; this.g.run(); } }
  restart() { this.scene.restart(); this.scene.get('UI').scene.restart(); }
  carry() { return { hearts: this.hearts, chaos: this.chaos, score: this.score, damaged: this.damaged, ...(this.chase ? { prox: this.chase.prox } : {}) }; }
  /** After a death in a running stage. Part 1: start again from scratch. Part 2 is a checkpoint: restart part 2 with
   *  3 hearts and the score / Chaos Meter you had when you reached it (points picked up on the failed try are dropped). */
  restartLevel() {
    // World 3: every run is a checkpoint, and dying resets Grunt's meter to that run's starting value
    if (this.W.chase) this.registry.set('carry', { ...this.startCarry, hearts: 3, damaged: true, prox: this.W.chase.start[this.stage - 1], retry: true });
    else if (this.stage === 2) this.registry.set('carry', { ...this.startCarry, hearts: 3, damaged: true });
    else { this.registry.set('stage', 1); this.registry.remove('carry'); }
    this.restart();
  }
  /** Stage cleared: on to stage 2, or to the boss. */
  next() {
    this.registry.set('carry', this.carry());
    if (this.stage < this.W.stages.length) { this.registry.set('stage', this.stage + 1); this.restart(); }
    else if (this.W.boss) this.scene.get('UI').goTo(this.W.boss);
    else this.scene.get('UI').newLevel(this.world);   // (World 3 runs 2 to 4 are still to come)
  }
  act(name) {
    if (this.mode === 'ending') { if (name === 'tap' && this.endSkip) this.endSkip(); return; }
    if (this.mode !== 'running') return;
    if (name === 'jump') this.g.jump();
    else if (name === 'slide') this.g.slide();
    else if (name === 'magic') this.g.attack();
    else if (name === 'blastBack' && this.chase) this.blastBack();
    else if (name === 'meltdown' && this.chaos >= 100 && this.g.meltdown()) { this.chaos = 0; this.events.emit('chaos', this.chaos); }
  }
  addScore(n) { this.score += n; this.events.emit('score', this.score); }

  // ---------- magic ----------
  /** World 3: turn and fire a bolt back at Grunt. */
  blastBack() {
    if (!this.g.attack()) return;
    this.backShot = true; this.g.face = -1;
    this.time.delayedCall(380, () => { this.g.face = 1; });
    // turning round to fire costs you: a half-second stumble at half speed, and Grunt gains a little
    this.g.slow(CHASE.fireStumble, false); this.chase.closer(CHASE.fireCost, false);
  }
  spawnOrb(p) {
    if (this.backShot) {
      this.backShot = false;
      const glow = this.add.image(p.x, p.y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x9b4dff).setDepth(13).setDisplaySize(150, 150);
      this.orbs.push({ x: p.x, y: p.y, ty: GROUND_Y - 420, vx: -1300, r: 22, glow, trail: [], back: true });
      return;
    }
    const glow = this.add.image(p.x, p.y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x9b4dff).setDepth(13).setDisplaySize(150, 150);
    // the bolt curves towards the nearest creature ahead (easy aiming on a phone); otherwise it flies straight
    let ty = p.y, best = 1300;
    for (const c of this.creatures) { if (!c.alive || c.noShoot) continue; const d = c.centre[0] - p.x; if (d > 0 && d < best) { best = d; ty = c.centre[1]; } }
    this.orbs.push({ x: p.x, y: p.y, ty, vx: 1100, r: 20, glow, trail: [] });
  }
  meltBlast() {
    // Provisional rule: the blast clears every enemy ahead of the gremlin on screen (to be confirmed in playtesting).
    for (const c of this.creatures) if (c.alive && c.x > this.g.x - 100 && c.x < this.viewW + 100) { c.hurt(99); this.defeated(c); }
  }
  defeated(c) { this.g.fx.burst(c.centre, 0.8); this.addScore(c.points); if (this.chase) { c.cleared = true; this.chase.ease(CHASE.defeat); } }

  // ---------- main loop ----------
  update(time, deltaMs) {
    const dt = Math.min(0.05, deltaMs / 1000) * this.timeScale;
    this.g.update(dt);
    const v = this.mode === 'ending' ? 0 : this.g.worldSpeed;   // in the ending the world stops; the gremlin runs on a little way
    if (this.mode !== 'ready') this.dist += v * dt;
    if (this.mode === 'running') this.runTime = (this.runTime || 0) + dt;
    this.bridgeHole();
    this.swamp.scroll(this.dist);
    this.checkFall();
    this.updateItems(dt);
    const ctx = { gx: this.g.x, groundY: GROUND_Y, scroll: v * dt * (this.mode === 'ready' ? 0 : 1) };
    for (const c of this.creatures) c.update(dt, ctx);
    for (const c of this.creatures) if (c.gone) c.destroy();
    this.creatures = this.creatures.filter(c => !c.gone);
    this.updateOrbs(dt);
    if (this.chase) { this.chase.update(dt); this.updateArrows(dt); this.updateDrops(dt); this.checkCleared(); }
    this.drawHazardFx();
    this.updateBeams(dt);
    this.updateBlind(dt);
    if (this.endAnim) this.endAnim(dt);
    if (this.mode === 'running') this.collide(dt);
    this.drawBoxes();
  }

  updateItems(dt) {
    const W = this.viewW, t = this.time.now / 1000;
    for (const it of this.items) {
      const x = GREMLIN_X + (it.d - this.dist);
      if (!it.obj && !it.done && x < W + 500) this.spawnItem(it, x);
      if (!it.obj) continue;
      it.obj.x = x; if (it.back) it.back.x = x;
      if (PICKUPS.has(it.t)) it.obj.y = GROUND_Y - it.h + 8 * Math.sin(t * 3 + it.d);
      if (it.t === 'sludge' || it.t === 'sludgeWide') it.obj.scaleY = it.baseScale * (1 + 0.025 * Math.sin(t * 5 + it.d));   // slow bubbling heave
      if (it.t === 'vines') it.obj.rotation = 0.012 * Math.sin(t * 1.6 + it.d);                                                  // gentle sway
      if (it.glow) it.glow.outerStrength = 2.6 + 1.6 * (0.5 + 0.5 * Math.sin(t * 5));                                            // warning pulse
      if (x + (it.t === 'bridge' ? BRIDGE.w : 0) < -600) { if (it.goat) it.goat.destroy(); else it.obj.destroy(); if (it.rest) it.rest.destroy(); if (it.fallObj) it.fallObj.destroy(); it.obj = null; it.done = true; if (it.back) { it.back.destroy(); it.back = null; } }
      if (it.t === 'fishbreak' && !it.fired && x <= GREMLIN_X + 150 && this.chase) { it.fired = true; this.chase.distract(2.6); }
      if (it.t === 'jam' && !it.fired && x <= GREMLIN_X + 150 && this.chase) { it.fired = true; this.chase.jam(2.6); }
      if (it.goat) { it.goat.x = x; it.goat.update(dt, this.g.x); }
      if (it.t === 'finish' && !it.reached && this.mode === 'running' && x <= GREMLIN_X) { it.reached = true; this.finish(); }
    }
  }
  spawnItem(it, x) {
    if (it.t === 'deco') {   // scenery beside the path (World 3): behind the gremlin, never in the way
      it.obj = this.add.image(x, GROUND_Y - 28, it.key).setOrigin(0.5, 1).setScale(it.s * 0.8).setDepth(3.9); return;   // just behind the path's front edge
    }
    if (it.t === 'bridge') {   // a bridge crossing: the drawing's own banks replace the path (see bridgeHole); its deck is the walking line
      it.obj = this.add.image(x, GROUND_Y - BRIDGE.deck * BRIDGE.s, BRIDGE[it.kind].key).setOrigin(0, 0).setScale(BRIDGE.s).setDepth(4.5); return;
    }
    if (it.t === 'fishbreak' || it.t === 'jam') { it.obj = this.add.zone(x, 0, 1, 1); return; }
    if (it.t === 'drop') { it.obj = this.add.zone(x, 0, 1, 1); it.st = 'wait'; it.stT = 0; return; }
    if (it.t === 'goat') { it.goat = new Goat(this, x, GROUND_Y - 20, it.s || 0.62); it.obj = it.goat.body; return; }
    if (it.t === 'shelf') {   // the slab in front of the gremlin, its support behind the trail (so you slide under the lip)
      const S = SHELF[it.n], sc = S.s || SHELF.s, top = GROUND_Y - SHELF.U - S.under * sc, h = this.textures.get(S.key).getSourceImage().height;
      it.obj = this.add.image(x, top, S.key).setOrigin(0, 0).setScale(sc).setDepth(11).setCrop(0, 0, S.w, S.cut);
      it.back = this.add.image(x, top, S.key).setOrigin(0, 0).setScale(sc).setDepth(3.9).setCrop(0, S.cut - 2, S.w, h - S.cut + 2);
      return;
    }
    if (it.t === 'trunk') {   // fallen trunk across the path: slide under it
      // big and in two layers: the log hangs IN FRONT of the gremlin (she slides under it), the stumps and ferns sit behind her
      const T = TRUNK, img = d => this.add.image(x, GROUND_Y + 18, 'w_haz_trunk').setOrigin(0.5, 1).setScale(T.s).setDepth(d);
      it.obj = img(11).setCrop(0, 0, 425, T.cut); it.back = img(9).setCrop(0, T.cut, 425, 206 - T.cut); return;
    }
    if (it.t === 'arrow') {   // fired by Grunt when it comes into view
      it.obj = this.add.image(x, -200, 'gr_arrow').setScale(1.5).setDepth(11).setVisible(false);
      this.chase.fireArrow(it); if (it.skip) { it.obj.destroy(); it.obj = null; it.done = true; } return;
    }
    if (CREATURES[it.t]) { const C = CREATURES[it.t]; this.creatures.push(new C(this, x, GROUND_Y, it.lane)); it.done = true; return; }
    let o;
    const L = LOOK[it.t];
    if (it.t === 'plat') {
      const P = this.W.plats[it.size], S = this.sizes[P.size], s = P.s * (S.scale || 1);
      o = this.add.image(x, GROUND_Y - it.h - S.top * s, P.key).setOrigin(0.5, 0).setScale(s).setDepth(5);
      it.w = S.w * s;
    } else if (it.t === 'beam') {
      // a crystal turret by the path; after a glowing warning it fires a rainbow beam across the path
      const B = BEAM[it.lane], T = this.cache.json.get('meadowInfo').turret;
      o = this.add.image(x, GROUND_Y + B.sink, 'm_turret').setOrigin(0.35, 1).setScale(B.s * 2).setDepth(3.5);
      it.state = 'idle'; it.st = 0;
      if (o.preFX) it.glow = o.preFX.addGlow(0xff4fd8, 2, 0, false, 0.1, 10);
    } else if (it.t === 'vines') {
      // a slimy branch hanging overhead: vine tips stop ~150 px above the ground, so you have to slide
      o = this.add.image(x, GROUND_Y - 140, L.key).setOrigin(0.5, 1).setScale(L.s).setDepth(9);
    } else if (PICKUPS.has(it.t)) {
      o = this.add.image(x, GROUND_Y - it.h, L.key).setScale(L.s).setDepth(7);
    } else if (L) {
      o = this.add.image(x, GROUND_Y + L.sink, L.key).setOrigin(0.5, 1).setScale(L.s).setDepth(5);
      it.baseScale = L.s;
    } else if (it.t === 'finish') {
      o = this.add.image(x, GROUND_Y + 6, 'flag').setOrigin(0.15, 1).setDepth(5);
    }
    // hazards get a warm pulsing rim-light so they always read as dangerous against the green scenery (WebGL only; harmless elsewhere)
    if (HAZARDS.has(it.t) && o.preFX) it.glow = o.preFX.addGlow(0xffb02a, 3, 0, false, 0.1, 10);
    it.obj = o;
  }
  /** Height (px) of the floating platform under screen x, or 0 for the ground. */
  platformAt(x) {
    // a gap in a bridge: nothing to stand on
    for (const it of this.items) {
      if (it.t !== 'bridge') continue;
      for (const [g0, g1] of BRIDGE[it.kind].gaps) {
        const a = GREMLIN_X + (it.d + g0 * BRIDGE.s - this.dist), b = GREMLIN_X + (it.d + g1 * BRIDGE.s - this.dist);
        if (x > a + 20 && x < b - 20) { this.gapAt = it.d + g0 * BRIDGE.s; return -5000; }
      }
    }
    for (const it of this.items) if (it.t === 'plat' && it.obj && Math.abs(x - it.obj.x) < it.w / 2 - 25) return it.h;
    return 0;
  }
  itemRect(it) {
    const o = it.obj;
    if (it.t === 'vines') return new Phaser.Geom.Rectangle(o.x - 150, 0, 300, GROUND_Y - 150);
    if (it.t === 'trunk') return new Phaser.Geom.Rectangle(o.x - 200, GROUND_Y - 440, 400, 315);   // the log itself; the gap under it (125 px) is clear for a slide
    if (it.t === 'arrow') return it.landed ? new Phaser.Geom.Rectangle(o.x - 30, GROUND_Y - 120, 60, 120) : null;
    if (it.t === 'deco' || it.t === 'bridge' || it.t === 'fishbreak' || it.t === 'jam' || it.t === 'goat') return null;
    if (it.t === 'drop') { if (!it.landed) return null; const b = DROP[it.k].box; return new Phaser.Geom.Rectangle(o.x - b.w / 2, GROUND_Y - b.h, b.w, b.h); }
    if (it.t === 'shelf') { const S = SHELF[it.n]; return new Phaser.Geom.Rectangle(o.x + 30, GROUND_Y - SHELF.U - 200, S.w * (S.s || SHELF.s) * 0.64, 200 + 20); }   // the slab, up to where the support drops behind the trail
    if (it.t === 'beam') { if (it.state !== 'fire') return null; const B = BEAM[it.lane]; return new Phaser.Geom.Rectangle(-100, GROUND_Y - B.y0, it.obj.x - 60 + 100, B.y0 - B.y1); }
    const b = BOX[it.t]; if (!b) return null;
    if (PICKUPS.has(it.t)) return new Phaser.Geom.Rectangle(o.x - b.w / 2, o.y - b.h / 2, b.w, b.h);
    return new Phaser.Geom.Rectangle(o.x - b.w / 2, GROUND_Y - b.h, b.w, b.h);
  }
  collide(dt) {
    const g = this.g, hb = g.hitbox(); if (!hb) return;
    let inMould = false;
    for (const it of this.items) {
      if (!it.obj || it.done || it.t === 'finish' || it.t === 'plat' || it.t === 'bridge' || it.t === 'fishbreak' || it.t === 'jam' || it.t === 'goat') continue;
      if (it.t === 'beam' && it.state !== 'fire') continue;
      const r = this.itemRect(it); if (!r || !Phaser.Geom.Intersects.RectangleToRectangle(hb, r)) continue;
      if (it.t === 'crystal') { this.collect(it); this.chaos = Math.min(100, this.chaos + 10); this.events.emit('chaos', this.chaos); }
      else if (it.t === 'taco' || it.t === 'margarita') { this.collect(it); this.addScore(POINTS[it.t]); }
      else if (it.t === 'potion') {
        // +1 heart; at full health it gives a gold bonus heart (max 6). Already on 6: it stays put for later.
        if (this.hearts < this.maxHearts) { this.collect(it); this.hearts++; this.events.emit('hearts', this.hearts); }
      } else if (it.t === 'mould') {
        inMould = true; g.slow(0.5);
        this.mouldT = (this.mouldT || 0) + dt;
        if (this.mouldT > MOULD_HURT_AFTER) { this.mouldT = 0; this.takeHit(); }
      } else this.takeHit();
    }
    if (!inMould) this.mouldT = 0;
    for (const c of this.creatures) {
      const r = c.hitbox(); if (!r || !Phaser.Geom.Intersects.RectangleToRectangle(hb, r)) continue;
      if (c.harmless) { c.hurt(99); this.blinded(); }   // butterflies: no damage, but you can't see for a moment
      else this.takeHit();
    }
  }
  // ---------- World 3 ending (GDD, locked: Hairball Apocalypse; Cath 15 Oct: no floating in the river — the hairball knocks
  // him over backwards and a fish lands on his head). Skippable (tap) after the first viewing. ----------
  hairball() {
    const C = this.chase, Gr = C.grunt, g = this.g, gy = GROUND_Y;
    this.mode = 'ending'; this.finalTime = this.runTime || 0;
    for (const it of this.items) if (it.t === 'finish' && it.obj) { it.obj.destroy(); it.obj = null; it.done = true; }
    C.phase = 'ending'; C.endProx = 100; C.surgeT = 0; C.stunT = 0;   // he catches up to where she was...
    for (const w of C.paws || []) w.im.destroy(); C.paws = [];
    this.gRun = 0;   // ...she runs on a little way, then stops and turns round to face him
    this.events.emit('prox', null); this.events.emit('danger', 0);
    let seen = false; try { seen = localStorage.getItem('gremlinGauntlet.hairballSeen') === '1'; } catch (e) { /* private mode */ }
    const steps = [], at = (t, fn) => steps.push(this.time.delayedCall(t * 1000, fn));
    let hb = null, fish = null, done = false;
    const finish = () => {
      if (done) return; done = true; for (const s of steps) s.remove(false);
      try { localStorage.setItem('gremlinGauntlet.hairballSeen', '1'); } catch (e) { /* ignore */ }
      if (hb) hb.destroy();
      Gr.setFace('grumpy'); Gr.fall = 1; Gr.pose = null; Gr.poseT = 0;
      if (!fish) fish = this.add.image(0, 0, 'r_salmon').setScale(0.45).setDepth(8.6);
      this.fishOnHead = fish;
      g.face = 1; g.win();
      const res = this.chaseScore();
      this.mode = 'won';
      this.events.emit('finished', { stage: this.stage, score: this.score, ending: true, breakdown: res.breakdown, time: this.finalTime });
    };
    this.endSkip = seen ? finish : null;
    at(0.3, () => C.say('*HISSSSS!*', 1.0));
    at(1.4, () => { Gr.act('uzi', 99); C.say('*HISSSSS!*', 0.9); Sfx.play(this, 'hiss_growl'); });   // both Uzis up for one last attack...
    at(2.6, () => { Gr.flinch = 0.4; C.say('Hrk…', 0.7); this.cameras.main.shake(120, 0.003); Sfx.play(this, 'growl'); });   // ...then he freezes
    at(3.4, () => { Gr.flinch = 0.5; C.say('hrk…', 0.7); this.cameras.main.shake(140, 0.004); });
    at(4.2, () => { Gr.flinch = 0.9; Gr.setFace('hairball'); C.say('HRRRRK…', 1.0); this.cameras.main.shake(300, 0.008); Sfx.play(this, 'yowl_long'); });
    at(5.2, () => {   // drops the Uzis and coughs up a hairball the size of a small house
      Gr.pose = null; Gr.poseT = 0;
      const h = Gr.headPoint(); hb = this.add.image(h[0] + 40, h[1] + 60, 'f_hairball').setScale(0.15).setDepth(9.5);
      this.hbT = 0; this.hbFrom = [h[0] + 40, h[1] + 60];
    });
    at(7.6, () => {   // it rolled back into his paws: he goes over backwards
      if (hb) { const b = this.add.image(hb.x, gy + 10, 'f_hairball_burst').setOrigin(0.5, 1).setScale(1.8).setDepth(9.6); this.tweens.add({ targets: b, alpha: 0, delay: 400, duration: 600, onComplete: () => b.destroy() }); hb.destroy(); hb = null; }
      this.cameras.main.shake(500, 0.016); g.fx.dust?.(20, 2, [Gr.frontX - 150, gy]); C.say('*THUD!*', 0.9);
      Gr.setFace('shock'); this.fallT = 0;
    });
    at(9.0, () => { fish = this.add.image(this.viewW + 100, gy - 700, 'r_salmon').setScale(0.45).setDepth(8.6); this.fishT = 0; });   // a tiny fish lands on his forehead
    at(10.4, () => { Gr.setFace('grumpy'); C.say('Mrrrp.', 1.6); Sfx.play(this, 'mrrrp'); });
    at(12.2, finish);
    // per-frame animation of the hairball, the fall and the fish
    this.endAnim = dt => {
      if (this.gRun !== undefined && this.gRun < 1) {
        this.gRun = Math.min(1, this.gRun + dt / 1.1); g.x = GREMLIN_X + 560 * (1 - (1 - this.gRun) ** 2);
        if (this.gRun >= 1) { g.idle(); g.face = -1; }
      }
      if (hb && this.hbT !== undefined) {
        this.hbT += dt; const t = this.hbT, [x0, y0] = this.hbFrom, xMid = (Gr.frontX + g.x) / 2 + 40;
        if (t < 0.9) { const u = t / 0.9; hb.setScale(0.15 + 1.75 * u).setPosition(x0 + (xMid - x0) * u, y0 + (gy - 250 - y0) * u - 380 * 4 * u * (1 - u)).setRotation(u * 4); }
        else if (t < 1.4) { const u = (t - 0.9) / 0.5; hb.setTexture('f_hairball').setPosition(xMid + 40 * u, gy - 250 - 180 * 4 * u * (1 - u)).setRotation(4 + u * 2); if (u > 0.05 && !this.bounced) { this.bounced = true; this.cameras.main.shake(200, 0.008); g.fx.dust?.(12, 1.6, [xMid, gy]); } }
        else { const u = Math.min(1, (t - 1.4) / 1.0); hb.setTexture('f_hairball_roll').setFlipX(true).setPosition(xMid + 40 - (xMid + 40 - (Gr.frontX - 60)) * u, gy - 175).setRotation(0); }
      }
      if (this.fallT !== undefined && Gr.fall < 1) { this.fallT += dt; Gr.fall = Math.min(1, (this.fallT / 0.7) ** 2); }
      if (fish && this.fishT !== undefined) {
        this.fishT += dt; const u = Math.min(1, this.fishT / 1.1);
        const head = Gr.root.getWorldTransformMatrix().transformPoint(432, 60), tx = head.x, ty = head.y - 20, x0 = this.viewW + 100, y0 = gy - 700;
        fish.setPosition(x0 + (tx - x0) * u, y0 + (ty - y0) * u - 300 * 4 * u * (1 - u)).setRotation(u * 7 + (u >= 1 ? 0.15 * Math.sin(this.fishT * 9) * Math.max(0, 2.5 - this.fishT) : 0));
      }
      if (this.fishOnHead && done) { const head = Gr.root.getWorldTransformMatrix().transformPoint(432, 60); this.fishOnHead.setPosition(head.x, head.y - 20).setRotation(0.2); }
    };
  }
  /** GDD chase scoring (locked): chase completion +1,000, level +500, 200 per heart, no-damage chase +1,000, Final Sprint time bonus. */
  chaseScore() {
    const t = this.finalTime, timeBonus = t < 45 ? 500 : t <= 75 ? 300 : 100;
    const parts = [['Escaped Grunt', POINTS.chase], ['Level complete', POINTS.levelComplete], [`Final Sprint ${t.toFixed(0)} s`, timeBonus], [`${this.hearts} heart${this.hearts === 1 ? '' : 's'} left`, POINTS.perHeart * this.hearts]];
    if (!this.damaged) parts.push(['No damage!', POINTS.noDamage]);
    for (const [, n] of parts) this.score += n;
    this.events.emit('score', this.score);
    return { breakdown: parts.map(([l, n]) => `${l}: +${n.toLocaleString()}`).join('\n') };
  }
  /** Uzi Rampage: Grunt fires a burst into the cliffs above the trail ahead; a red marker shows where the debris will land,
   *  then it crashes down onto the marker and stays there (jump it). Being right under it as it lands also hurts. */
  updateDrops(dt) {
    const G = this.uziG || (this.uziG = this.add.graphics().setDepth(4.8)); G.clear();
    const t = this.time.now / 1000;
    for (const it of this.items) {
      if (it.t !== 'drop' || !it.obj || it.done) continue;
      const x = it.obj.x, D = DROP[it.k];
      if (it.st === 'wait') { if (x - GREMLIN_X < DROP.lead && this.mode === 'running') { it.st = 'warn'; it.stT = 0; if (!it.quiet) this.chase.uzi(); } continue; }
      it.stT += dt;
      const cliffY = GROUND_Y - GROUND_Y / 0.7 + 60;   // the top of the view: the cliffs and trees above the trail
      if (it.st === 'warn') {
        const p = 0.5 + 0.5 * Math.sin(t * 18);
        G.lineStyle(6, 0xff3a2a, 0.6 + 0.4 * p).strokeEllipse(x, GROUND_Y + 4, 190, 32).fillStyle(0xff3a2a, 0.2 + 0.25 * p).fillEllipse(x, GROUND_Y + 4, 190, 32);
        G.lineStyle(4, 0xff3a2a, 0.35 + 0.3 * p).lineBetween(x - 22, GROUND_Y - 60, x, GROUND_Y - 20).lineBetween(x + 22, GROUND_Y - 60, x, GROUND_Y - 20);
        if (it.stT < 0.45) {   // the burst: tracer streaks up into the cliff above the marker, sparks where they hit
          const gx = this.chase.grunt.headPoint()[0] + 80, gy = this.chase.grunt.headPoint()[1] + 170;
          for (let i = 0; i < 4; i++) {
            const f = ((it.stT * 9 + i * 0.27) % 1), tx = x + (i - 1.5) * 40, ty = cliffY + 30 * Math.sin(i * 2.3);
            const ax = gx + (tx - gx) * f, ay = gy + (ty - gy) * f, bx = gx + (tx - gx) * Math.min(1, f + 0.08), by = gy + (ty - gy) * Math.min(1, f + 0.08);
            G.lineStyle(9, 0xffe27a, 0.95).lineBetween(ax, ay, bx, by); G.lineStyle(3, 0xffffff, 1).lineBetween(ax, ay, bx, by);
            G.fillStyle(0xfff3b0, 0.9).fillCircle(tx + 10 * Math.sin(t * 40 + i), ty + 10 * Math.cos(t * 37 + i), 10 + 6 * Math.sin(t * 50 + i));
          }
        }
        if (it.stT >= DROP.warn) { it.st = 'fall'; it.stT = 0; it.fallObj = this.add.image(x, cliffY, D.fall).setScale(D.s).setDepth(9.3); }
      } else if (it.st === 'fall') {
        const u = Math.min(1, it.stT / DROP.fall);
        G.lineStyle(6, 0xff3a2a, 0.9).strokeEllipse(x, GROUND_Y + 4, 190, 32);
        it.fallObj.setPosition(x, cliffY + (GROUND_Y - 60 - cliffY) * u * u).setRotation(u * 1.5);
        if (u >= 1) {   // lands: a crash, a dust burst, and the debris stays on the trail
          it.fallObj.destroy(); it.fallObj = null; it.st = 'landed'; it.landed = true;
          this.cameras.main.shake(140, 0.006); this.g.fx.dust?.(14, 1.4, [x, GROUND_Y]);
          if (it.k.startsWith('rock')) { const im = this.add.image(x, GROUND_Y + 10, 'u_rock_land').setOrigin(0.5, 1).setScale(0.55).setDepth(9.2); this.tweens.add({ targets: im, alpha: 0, delay: 120, duration: 300, onComplete: () => im.destroy() }); }
          it.rest = this.add.image(x, GROUND_Y + 12, D.rest).setOrigin(0.5, it.k.startsWith('rock') ? 0.85 : 1).setScale(D.s * (it.k.startsWith('branch') ? 1 : 0.95)).setRotation(D.restRot || 0).setDepth(5);
          // right underneath it as it lands: that hurts too
          const hb = this.g.hitbox(); if (hb && Math.abs(hb.centerX - x) < 110 && this.mode === 'running') this.takeHit();
        }
      }
      if (it.rest) {   // landed debris keeps a soft pulsing red ring so it never blends in with the trail's own rocks
        it.rest.x = x; const p = 0.5 + 0.5 * Math.sin(t * 6);
        G.lineStyle(5, 0xff3a2a, 0.35 + 0.25 * p).strokeEllipse(x, GROUND_Y + 6, DROP[it.k].box.w + 70, 34);
      }
    }
  }
  /** River Run: while a bridge is on screen, the path stops where the bridge drawing's own banks take over. */
  bridgeHole() {
    let hole = null;
    for (const it of this.items) {
      if (it.t !== 'bridge' || it.done) continue;
      const x = GREMLIN_X + (it.d - this.dist);
      if (x < this.viewW + 200 && x + BRIDGE.w > -200) hole = [x + BRIDGE.path[0] * BRIDGE.s, x + BRIDGE.path[1] * BRIDGE.s];
    }
    if (this.swamp.setHole) this.swamp.setHole(...(hole || [null]));
  }
  /** Fell into a bridge gap: lose a heart, pop back up just before the gap, and Grunt gains a lot of ground. */
  checkFall() {
    const g = this.g, h = g.S.h * g.k;
    g.root.setDepth(h < -25 ? 4.4 : 10);   // below the deck: behind the bridge, into the water
    if (this.mode !== 'running' || h > -170 || this.gapAt === undefined) return;
    const target = this.gapAt - 330, delta = this.dist - target;
    this.dist = target;
    for (const c of this.creatures) c.x += delta;
    for (const o of this.orbs) o.x += delta;
    g.revive(); g.root.setDepth(10);
    this.cameras.main.shake(250, 0.008);
    this.g.fx.burst([GREMLIN_X, GROUND_Y - 150], 0.6);
    if (this.chase) { this.chase.closer(CHASE.fall); this.lastHitD = this.dist; this.chase.say('*MROW!*', 0.9); }
    this.hearts--; this.damaged = true; this.events.emit('hearts', this.hearts);
    if (this.hearts <= 0) { this.mode = 'dying'; g.die(); } else g.hurt();
  }
  collect(it) {
    it.done = true; const o = it.obj;
    this.g.fx.burst([o.x, o.y], 0.4);
    this.tweens.add({ targets: o, scale: o.scale * 1.6, alpha: 0, duration: 200, onComplete: () => { o.destroy(); } });
    it.obj = null;
  }
  takeHit() {
    if (this.g.invulnerable) return;
    if (this.chase) { this.chase.closer(); this.lastHitD = this.dist; }
    this.hearts--; this.damaged = true; this.events.emit('hearts', this.hearts);
    if (this.hearts <= 0) { this.mode = 'dying'; this.g.die(); }
    else this.g.hurt();
  }
  finish() {
    if (this.world === 3 && this.stage === this.W.stages.length && this.chase) return this.hairball();
    this.mode = 'finished';
    this.time.delayedCall(250, () => { this.g.win(); this.events.emit('finished', { stage: this.stage, score: this.score }); });
  }

  // bubbles rising out of sludge pools, spores drifting off mould
  drawHazardFx() {
    const G = this.hazG; G.clear(); const t = this.time.now / 1000;
    const S = this.shadowG; S.clear();
    for (const it of this.items) {
      if (!it.obj || it.done) continue;
      const sw = SHADOW_W[it.t] || (it.t === 'drop' && it.landed ? 220 : 0);
      if (sw) { S.fillStyle(0x050805, 0.55).fillEllipse(it.obj.x, GROUND_Y + 8, sw, 38); S.fillStyle(0x050805, 0.35).fillEllipse(it.obj.x, GROUND_Y + 8, sw * 1.15, 54); }
      if (it.t === 'sludge' || it.t === 'sludgeWide') {
        const w = (it.t === 'sludgeWide' ? 520 : 200);
        for (let i = 0; i < (it.t === 'sludgeWide' ? 7 : 3); i++) {
          const ph = (t * 0.9 + i * 0.37 + it.d * 0.001) % 1, bx = it.obj.x - w / 2 + ((i * 97 + it.d) % w), by = GROUND_Y - 6 - ph * 40;
          G.fillStyle(0xc8f53a, 0.85 * (1 - ph)).fillCircle(bx, by, 5 + 7 * ph).lineStyle(2, 0x3f5a08, 0.8 * (1 - ph)).strokeCircle(bx, by, 5 + 7 * ph);
        }
      }
      if (it.t === 'mould') for (let i = 0; i < 4; i++) {
        const ph = (t * 0.5 + i * 0.25) % 1;
        G.fillStyle(i % 2 ? 0xb06cff : 0xc4e534, 0.6 * (1 - ph)).fillCircle(it.obj.x - 80 + i * 50 + 10 * Math.sin(t * 2 + i), GROUND_Y - 60 - ph * 90, 4);
      }
    }
  }

  // ---------- World 2: rainbow beams and butterfly blindness ----------
  updateBeams(dt) {
    const G = this.beamG; G.clear(); const now = this.time.now / 1000;
    for (const it of this.items) {
      if (it.t !== 'beam' || !it.obj) continue;
      const B = BEAM[it.lane], o = it.obj, gap = o.x - this.g.x;
      const lensX = o.x - 0.35 * o.displayWidth + 0.27 * o.displayWidth, yc = GROUND_Y - (B.y0 + B.y1) / 2, th = B.y0 - B.y1;
      it.st += dt;
      if (it.state === 'idle' && gap < BEAM.startGap && this.mode === 'running') { it.state = 'warn'; it.st = 0; }
      else if (it.state === 'warn' && it.st >= BEAM.warn) { it.state = 'fire'; it.st = 0; this.cameras.main.shake(120, 0.004); }
      else if (it.state === 'fire' && it.st >= BEAM.fire) { it.state = 'done'; it.st = 0; }
      if (it.state === 'warn') {   // the lens glows brighter and a sparkling guide line shows exactly where the beam will go
        const k = it.st / BEAM.warn, blink = 0.5 + 0.5 * Math.sin(now * (14 + 20 * k));
        if (it.glow) it.glow.outerStrength = 2 + 8 * k;
        G.fillStyle(0xff7ae0, 0.25 + 0.4 * k * blink).fillCircle(lensX, yc, 30 + 30 * k);
        for (let x = lensX - 40; x > -40; x -= 46) G.fillStyle(0xffffff, (0.25 + 0.55 * k) * (0.5 + 0.5 * Math.sin(now * 20 + x * 0.05))).fillCircle(x, yc, 4 + 3 * k);
        G.lineStyle(2, 0xff9ce8, 0.35 + 0.4 * k).lineBetween(-40, yc - th / 2, lensX, yc - th / 2).lineBetween(-40, yc + th / 2, lensX, yc + th / 2);
      } else if (it.state === 'fire') {   // the beam: rainbow bands, wobbling
        if (!it.beam) { it.beam = this.add.tileSprite(0, yc, 10, th * 1.6, 'm_beam').setOrigin(0, 0.5).setDepth(10); }
        const w = Math.max(0, lensX + 20); it.beam.setPosition(0, yc + 3 * Math.sin(now * 40)).setSize(w, th * 1.6).setTileScale(1, th * 1.6 / 200);
        it.beam.tilePositionX -= dt * 2400; it.beam.setAlpha(Math.min(1, it.st * 12, (BEAM.fire - it.st) * 10));
        G.fillStyle(0xffffff, 0.8).fillCircle(lensX, yc, th * 0.7);
      } else if (it.beam) { it.beam.destroy(); it.beam = null; if (it.glow) it.glow.outerStrength = 2; }
    }
  }
  blinded() {
    // a flurry of butterflies sweeps across the screen for a moment (the GDD's "obscure visibility briefly")
    const W = this.scale.width;
    for (let i = 0; i < 9; i++) {
      const im = this.add.image(W + 200 + i * 140, 140 + (i * 197) % 760, 'c_swarm_body').setScale(rnd(1.2, 1.8)).setDepth(25).setAlpha(0.96).setFlipX(i % 2 === 0);
      this.blind.push({ im, vx: -rnd(900, 1300), vy: rnd(-40, 40), t: 0, ph: i });
    }
    this.blindFog = this.blindFog || this.add.rectangle(W / 2, this.scale.height / 2, W, this.scale.height, 0xff7ae0, 0).setDepth(24);
    this.blindT = 1.8;
  }
  updateBlind(dt) {
    if (this.blindFog) { this.blindT = Math.max(0, (this.blindT || 0) - dt); this.blindFog.setAlpha(0.35 * Math.min(1, this.blindT * 2)); }
    for (const b of this.blind) { b.t += dt; b.im.x += b.vx * dt; b.im.y += b.vy * dt + 40 * Math.sin(b.t * 9 + b.ph) * dt; b.im.scaleY = b.im.scaleX * (0.85 + 0.15 * Math.sin(b.t * 25)); if (b.im.x < -500) { b.im.destroy(); b.dead = true; } }
    this.blind = this.blind.filter(b => !b.dead);
  }

  /** Arrows: marker on the path, flight from Grunt's bow, then stuck in the path. */
  updateArrows(dt) {
    const G = this.hazG;
    for (const it of this.items) {
      if (it.t !== 'arrow' || !it.obj || it.done || it.flightT === undefined) continue;
      const o = it.obj, tx = o.x, now = this.time.now / 1000;
      if (!it.landed) {
        it.flightT += dt; const u = Math.min(1, it.flightT / it.flight);
        const p = 0.5 + 0.5 * Math.sin(now * 18);
        G.lineStyle(6, 0xff5a3a, 0.5 + 0.5 * p).strokeEllipse(tx, GROUND_Y + 4, 150, 26).fillStyle(0xff5a3a, 0.2 + 0.2 * p).fillEllipse(tx, GROUND_Y + 4, 150, 26);
        const sx = this.chase.grunt.frontX - 60, sy = GROUND_Y - 700;
        const x = sx + (tx - sx) * u, y = sy + (GROUND_Y - 60 - sy) * u - 500 * 4 * u * (1 - u);
        const vx = (tx - sx) / it.flight, vy = (GROUND_Y - 60 - sy) / it.flight - 500 * 4 * (1 - 2 * u) / it.flight;
        o.setVisible(true).setPosition(x, y).setRotation(Math.atan2(vy, vx));
        if (u >= 1) { it.landed = true; o.setRotation(1.15); this.cameras.main.shake(90, 0.004); this.g.fx.burst([tx, GROUND_Y - 10], 0.3); }
      } else o.setPosition(tx, GROUND_Y - 55);
    }
  }
  /** Grunt eases back a little for every hazard or creature you get past cleanly. */
  checkCleared() {
    const gx = this.g.x, clean = d => this.lastHitD === undefined || d - this.lastHitD > 500;
    for (const it of this.items) if (!it.cleared && it.obj && (it.t === 'root' || it.t === 'boulder' || it.t === 'trunk' || it.t === 'rockS' || it.t === 'rockM' || it.t === 'rockL' || it.t === 'shelf' || (it.t === 'drop' && it.landed) || (it.t === 'arrow' && it.landed)) && it.obj.x < gx - 150) { it.cleared = true; if (clean(this.dist)) { this.chase.ease(CHASE.clear); if (it.t === 'arrow') this.chase.missed(); } }
    for (const c of this.creatures) if (!c.cleared && c.alive && c.x < gx - 200) { c.cleared = true; if (clean(this.dist)) this.chase.ease(CHASE.clear); }
  }

  updateOrbs(dt) {
    const G = this.orbG; G.clear();
    for (const o of this.orbs) {
      if (o.back) {   // a bolt fired back at Grunt
        o.x += o.vx * dt; o.y += (o.ty - o.y) * Math.min(1, dt * 4); o.trail.unshift([o.x, o.y]); if (o.trail.length > 10) o.trail.pop();
        o.trail.forEach(([x, y], i) => { const a = 1 - i / o.trail.length; G.fillStyle(0x9b4dff, 0.35 * a).fillCircle(x + i * 6, y, o.r * (0.9 * a + 0.2)); });
        G.fillStyle(0xe2beff, 1).fillCircle(o.x, o.y, o.r * 0.8); G.fillStyle(0xffffff, 1).fillCircle(o.x, o.y, o.r * 0.45);
        o.glow.setPosition(o.x, o.y);
        if (this.chase && o.x < this.chase.hitX) { o.dead = true; if (this.chase.blasted()) this.g.fx.burst([o.x, o.y], 0.7); }
        if (o.x < -100) o.dead = true;
        if (o.dead) o.glow.destroy();
        continue;
      }
      o.x += o.vx * dt; o.y += (o.ty - o.y) * Math.min(1, dt * 9); o.trail.unshift([o.x, o.y]); if (o.trail.length > 10) o.trail.pop();
      o.trail.forEach(([x, y], i) => { const a = 1 - i / o.trail.length; G.fillStyle(0x9b4dff, 0.35 * a).fillCircle(x - i * 6, y, o.r * (0.9 * a + 0.2)); });
      G.fillStyle(0xe2beff, 1).fillCircle(o.x, o.y, o.r * 0.8); G.fillStyle(0xffffff, 1).fillCircle(o.x, o.y, o.r * 0.45);
      const t = this.time.now / 50; G.lineStyle(3, 0xee2a8a, 0.8);
      for (let i = 0; i < 3; i++) { const a0 = t + i * 2.1; G.lineBetween(o.x + Math.cos(a0) * o.r * 1.3, o.y + Math.sin(a0) * o.r * 1.3, o.x + Math.cos(a0 + 0.6) * o.r * 1.9, o.y + Math.sin(a0 + 0.6) * o.r * 1.9); }
      o.glow.setPosition(o.x, o.y);
      for (const c of this.creatures) {
        if (c.noShoot) continue;
        const r = c.shootbox ? c.shootbox() : c.hitbox(); if (!r) continue;
        if (Phaser.Geom.Intersects.CircleToRectangle(new Phaser.Geom.Circle(o.x, o.y, o.r + 10), r)) { o.dead = true; c.shot(); this.g.fx.burst([o.x, o.y], 0.4); if (c.dead) this.defeated(c); break; }
      }
      if (o.x > this.viewW + 100) o.dead = true;
      if (o.dead) o.glow.destroy();
    }
    this.orbs = this.orbs.filter(o => !o.dead);
  }
  drawBoxes() {
    const G = this.boxG; G.clear(); if (!this.showBoxes) return;
    const hb = this.g.hitbox();
    if (hb) G.lineStyle(3, this.g.invulnerable ? 0xffffff : 0xc6f135, 1).strokeRectShape(hb);
    for (const it of this.items) {
      if (!it.obj || it.done) continue;
      if (it.t === 'plat') { G.lineStyle(3, 0x9b4dff, 1).lineBetween(it.obj.x - it.w / 2 + 25, GROUND_Y - it.h, it.obj.x + it.w / 2 - 25, GROUND_Y - it.h); continue; }
      const r = this.itemRect(it); if (r) G.lineStyle(3, PICKUPS.has(it.t) ? 0x9b4dff : 0xee2a8a, 1).strokeRectShape(r);
    }
    for (const c of this.creatures) { const r = c.hitbox(); if (r) G.lineStyle(3, 0xee2a8a, 1).strokeRectShape(r); }
  }
}
