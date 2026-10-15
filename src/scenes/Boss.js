// Level 1 boss: Eddie, The Mould King, in The Festering Swamp.
// Arena rules (approved 14 Oct 2026): Eddie moves around the whole arena; the gremlin can move left/right;
// roots and logs give high ground; attacks are aimed at the gremlin and always telegraphed.
import { Gremlin } from '../gremlin/Gremlin.js?v=20261015192012';
import { Eddie } from '../eddie/Eddie.js?v=20261015192012';
import { Swamp } from '../world/Swamp.js?v=20261015192012';
import { Music } from '../audio/Music.js?v=20261015192012';
import { MAX_HEARTS } from './Run.js?v=20261015192012';

export const GROUND_Y = 870;
const W = 1920;
const GREM_H = 330, EDDIE_H = 700;   // Eddie stands about 2× the gremlin's height
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---- tuning (placeholders until playtesting) ----
export const BOSS_TUNING = {
  hp: 100, boltDamage: 2, meltdownDamage: 12,
  phase2At: 70, phase3At: 35,
  rockLowSpeed: 900, rockHighSpeed: 1150, netSpeed: 1250, gasSpeed: 430, waveSpeed: 1000,
  bombFlight: 0.95, patchTime: 3.4, trapTime: 1.8,
  phase3Speed: 1.2,       // Eddie's moves play this much faster below 35%
};

// High ground. h = height of the top surface above the ground, in px.
// Floating swamp platforms; the two low wooden perches at the edges are where Eddie likes to stand.
const PLATFORMS = [
  { name: 'perchL', key: 'plat_wood', x0: 80, x1: 330, h: 150 },
  { name: 'rootL', key: 'plat_small', x0: 450, x1: 720, h: 215 },
  { name: 'log', key: 'plat_medium', x0: 820, x1: 1150, h: 340 },
  { name: 'rootR', key: 'plat_small', x0: 1250, x1: 1500, h: 215 },
  { name: 'perchR', key: 'plat_wood', x0: 1590, x1: 1840, h: 150 },
];
// Where Eddie stands between attacks. He always picks somewhere well away from the gremlin, so there's room to move.
const SPOTS = {
  perchL: { x: 205, floor: 150 }, groundL: { x: 560, floor: 0 }, middle: { x: 985, floor: 0 },
  groundR: { x: 1380, floor: 0 }, perchR: { x: 1715, floor: 150 },
};
const GROUND_SPOTS = ['groundL', 'middle', 'groundR'];
const PATCH_HURT_AFTER = 1.2;   // seconds standing in mould before it costs a heart (it always slows you)
const POINTS = { boss: 1000, levelComplete: 500, perHeart: 200, noDamage: 1000 };

const TAUNTS = {
  rock: ['EAT ROCK!', 'Five-second rule!'],
  mould: ['FRESHLY GROWN, JUST FOR YOU!', 'You’re gonna look great in green.'],
  death: ['YOU JUST GOT MOULDED, BITCH!', 'Should’ve eaten more rocks.'],
};

export class Boss extends Phaser.Scene {
  constructor(key = 'Boss') { super(key); }

  create() {
    this.mode = 'ready';   // ready → intro → running → (won | dying → gameover)
    this.startCarry = this.registry.get('carry') || { hearts: 3, chaos: 0, score: 0, damaged: false };
    this.hearts = this.startCarry.hearts; this.chaos = this.startCarry.chaos; this.score = this.startCarry.score; this.damaged = this.startCarry.damaged;
    this.hp = BOSS_TUNING.hp; this.phase = 1; this.patchT = 0;
    this.timeScale = 1; this.showBoxes = false; this.fightT = 0;
    this.shots = []; this.patches = []; this.orbs = []; this.pickups = []; this.waves = []; this.shroomCols = []; this.markers = [];
    this.timers = []; this.tasks = [];
    this.chips = []; this.queue = []; this.cyclesSinceRest = 0; this.restToggle = false; this.crystalT = 3;
    this.drawArena();
    this.fxG = this.add.graphics().setDepth(7);        // ground effects (patches, markers, cracks)
    this.fxTop = this.add.graphics().setDepth(12);     // projectiles' glow, waves
    this.boxG = this.add.graphics().setDepth(30);

    this.g = new Gremlin(this, 420, GROUND_Y, GREM_H);
    this.g.arena = { minX: 110, maxX: 1820 };
    this.g.floorAt = x => { for (const p of PLATFORMS) if (x >= p.x0 && x <= p.x1) return p.h; return 0; };
    this.g.idle();
    this.g.on('shoot', p => this.spawnOrb(p));
    this.g.on('meltBlast', p => this.meltBlast(p));
    this.g.on('died', () => this.after(1.3, () => { this.mode = 'gameover'; this.events.emit('gameover', pick((this.TAUNTS || TAUNTS).death)); }));

    this.e = new Eddie(this, SPOTS.groundR.x, GROUND_Y, EDDIE_H);
    this.e.spot = 'groundR';
    this.e.onEvent = (name, ...a) => this.onEddie(name, ...a);
    this.bubble = this.makeBubble();
    // three potions in the arena: one waiting on the high centre platform (double jump),
    // then one more appears on a low root platform at the start of phase 2 and of phase 3 (see dropPotion)
    this.addPickup('potion', 985, GROUND_Y - 340 - 60);
  }

  // ---------- arena ----------
  drawArena() {
    const H = this.scale.height;
    this.swamp = new Swamp(this, GROUND_Y, { props: false });
    Music.play(this, 'boss');
    this.swamp.scroll(1500);   // a fixed view of the swamp
    // a couple of decorations at the arena edges (behind the action)
    this.add.image(700, GROUND_Y + 30, 'prop_sign').setOrigin(0.5, 1).setScale(0.8).setDepth(3).setTint(0xb0bab0);
    this.add.image(1420, GROUND_Y + 30, 'prop_mush_orange').setOrigin(0.5, 1).setScale(0.75).setDepth(3).setTint(0xb0bab0);
    // platforms (the approved swamp platform art), each with a flat walking surface at GROUND_Y - h
    const sizes = this.cache.json.get('swampSizes');
    for (const p of PLATFORMS) {
      const S = sizes[p.key], sc = (p.x1 - p.x0 + 40) / S.w;
      this.add.image((p.x0 + p.x1) / 2, GROUND_Y - p.h - S.top * sc, p.key).setOrigin(0.5, 0).setScale(sc).setDepth(5);
    }
  }

  // ---------- speech bubble (short, non-obstructive) ----------
  makeBubble() {
    const c = this.add.container(0, 0).setDepth(20).setVisible(false);
    c.bg = this.add.graphics(); c.txt = this.add.text(0, 0, '', { fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontStyle: 'bold', fontSize: 34, color: '#1d230c', align: 'center', wordWrap: { width: 560 } }).setOrigin(0.5, 1);
    c.add([c.bg, c.txt]); c.life = 0; return c;
  }
  say(text, dur = 1.8) {
    const b = this.bubble; b.txt.setText(text); b.life = dur; b.max = dur;
    const w = b.txt.width + 44, h = b.txt.height + 26; b.hh = h + 18;
    b.bg.clear().fillStyle(0xf3efd8, 1).lineStyle(5, 0x1d230c, 1)
      .fillRoundedRect(-w / 2, -h - 18, w, h, 18).strokeRoundedRect(-w / 2, -h - 18, w, h, 18)
      .fillTriangle(-14, -20, 14, -20, 0, 6).lineBetween(-14, -20, 0, 6).lineBetween(14, -20, 0, 6);
    b.txt.setY(-31); b.setVisible(true);
  }
  taunt(kind) { if (Math.random() < 0.45) this.say(pick((this.TAUNTS || TAUNTS)[kind]), 1.5); }

  // ---------- flow ----------
  startRun() {
    if (this.mode !== 'ready') return;
    this.mode = 'intro'; this.g.run();
    this.e.play('entrance');
  }
  restart() { this.scene.restart(); this.scene.get('UI').scene.restart(); }
  /** Assisted retry from the boss checkpoint (GDD): three hearts, Chaos Meter reset, running score kept, boss-fight score discarded. */
  retry() { this.registry.set('carry', { ...this.startCarry, hearts: 3, chaos: 0, damaged: true }); this.restart(); }
  /** Which way Eddie is facing: -1 = left, 1 = right. */
  get edir() { return this.e.face > 0 ? -1 : 1; }
  /** Turn Eddie to face the gremlin (only between moves, never mid-throw). */
  faceGremlin() { this.e.face = this.g.x < this.e.x ? 1 : -1; }
  /** A spot well away from the gremlin, so there's always room to manoeuvre. */
  farSpot(groundOnly = false) {
    const names = (groundOnly ? GROUND_SPOTS : Object.keys(SPOTS)).filter(n => n !== this.e.spot);
    const ok = names.filter(n => Math.abs(SPOTS[n].x - this.g.x) >= 560);
    if (ok.length) return pick(ok);
    return names.sort((a, b) => Math.abs(SPOTS[b].x - this.g.x) - Math.abs(SPOTS[a].x - this.g.x))[0];
  }
  act(name, down = true) {
    const g = this.g;
    if (this.mode !== 'running') { if (!down) g.setMove(0); return; }
    if (name === 'jump') g.jump();
    else if (name === 'slide') g.slide();
    else if (name === 'magic') g.attack();
    else if (name === 'left') g.setMove(down ? -1 : (g.S.moveDir === -1 ? 0 : g.S.moveDir));
    else if (name === 'right') g.setMove(down ? 1 : (g.S.moveDir === 1 ? 0 : g.S.moveDir));
    else if (name === 'stick') g.setMove(down);                                   // joystick: down = -1 / 0 / 1
    else if (name === 'slideDir') { if (down) { g.setMove(down); g.face = down; } g.slide(); }   // slide towards the side the stick leans
    else if (name === 'dashL') g.dash(-1);
    else if (name === 'dashR') g.dash(1);
    else if (name === 'meltdown' && this.chaos >= 100 && g.meltdown()) { this.chaos = 0; this.events.emit('chaos', 0); }
  }

  // ---------- Eddie's brain ----------
  // Each step is one of: {m: move}, {hop: spot}, {dive: 'ambush'|spot}, {slam: true}, {rest: 'eat'|'exhausted'}, {wait: s}
  plan() {
    const e = this.e, ph = this.phase, q = [];
    const home = e.spot;
    const rocks = n => { for (let i = 0; i < n; i++) q.push({ m: Math.random() < 0.5 ? 'rockLow' : 'rockHigh' }, { wait: ph === 3 ? 0.25 : 0.4 }); };
    const rest = () => { this.restToggle = !this.restToggle; q.push({ rest: ph === 3 && this.restToggle ? 'exhausted' : 'eat' }); };
    if (ph === 1) {
      if (Math.random() < 0.45 || Math.abs(this.e.x - this.g.x) < 520) q.push({ hop: 'far' });
      rocks(3); q.push({ wait: 0.3 }); rest();
    } else {
      const choices = ph === 2
        ? [() => { rocks(2); q.push({ m: 'bomb' }); }, () => { q.push({ m: 'net' }, { wait: 0.3 }); rocks(2); }, () => q.push({ m: 'bomb' }, { wait: 0.4 }, { m: 'bomb' }),
           () => q.push({ m: 'burp' }), () => q.push({ m: 'shrooms' }), () => q.push({ dive: 'ambush' }), () => q.push({ hop: 'far' })]
        : [() => { q.push({ m: 'bomb' }, { wait: 0.15 }, { m: 'rockHigh' }); }, () => q.push({ m: 'shrooms' }, { wait: 0.2 }, { m: 'splash' }), () => q.push({ slam: true }),
           () => q.push({ dive: 'ambush' }, { wait: 0.2 }, { m: 'burp' }), () => q.push({ m: 'net' }, { wait: 0.2 }, { m: 'bomb' }), () => { rocks(3); }];
      pick(choices)(); q.push({ wait: ph === 3 ? 0.35 : 0.6 });
      pick(choices)(); q.push({ wait: 0.4 });
      rest();
    }
    this.queue = q;
  }
  nextStep() {
    const e = this.e;
    if (this.mode !== 'running' || e.busy || this.stepBusy) return;
    if (this.g.trapped) return;                           // never attack a trapped gremlin (no unavoidable damage)
    if (!this.queue.length) this.plan();
    // too close for comfort? Eddie leaps away before his next attack (keeps the arena playable)
    if (this.queue[0] && (this.queue[0].m || this.queue[0].rest) && Math.abs(e.x - this.g.x) < 360 && !this.queue[0].nearOk) this.queue.unshift({ hop: 'far' });
    const s = this.queue.shift();
    if (!s.hop && !s.slam && !s.dive) this.faceGremlin();
    if (s.wait) { this.stepBusy = true; this.after(s.wait, () => { this.stepBusy = false; }); return; }
    if (s.m) {
      // attacks that need the ground (dives) or a clear line are handled in their own steps; everything else works from any spot
      e.play(s.m); return;
    }
    if (s.rest) { e.play(s.rest); return; }
    if (s.hop) { const n = s.hop === 'far' ? this.farSpot() : s.hop; if (n !== e.spot) this.hopTo(SPOTS[n], n); return; }
    if (s.slam) { const x = clamp(this.g.x, 300, 1620); this.hopTo({ x, floor: 0 }, 'slam', true); this.queue.unshift({ hop: 'far' }); return; }
    if (s.dive) { if (e.floor > 0) { this.queue.unshift(s); const n = this.farSpot(true); this.hopTo(SPOTS[n], n); return; } this.diveAmbush(); }
  }

  // Leap in an arc to a new spot (marker shows where he'll land).
  hopTo(spot, name, slam = false) {
    const e = this.e; this.stepBusy = true;
    e.play('takeoff');
    const from = { x: e.x, floor: e.floor }, marker = { x: spot.x, floorY: GROUND_Y - spot.floor, w: 300, life: 99, kind: slam ? 'danger' : 'land' };
    this.markers.push(marker);
    this.after(0.3, () => {
      e.play('hop');
      const dur = (slam ? 0.95 : 0.8) / (this.phase === 3 ? BOSS_TUNING.phase3Speed : 1);
      this.animate(dur, u => {
        e.x = from.x + (spot.x - from.x) * u; e.floor = 0; e.air = from.floor + (spot.floor - from.floor) * u + 4 * (slam ? 380 : 300) * u * (1 - u);
      }, () => {
        e.x = spot.x; e.floor = spot.floor; e.air = 0; e.spot = name === 'slam' ? 'slamSpot' : name; this.faceGremlin();
        marker.life = 0; e.play('land'); this.cameras.main.shake(slam ? 300 : 160, slam ? 0.01 : 0.004);
        this.dustBurst(e.x, GROUND_Y - spot.floor, slam ? 26 : 12);
        if (slam) { this.say('EAT ROCK!', 1); this.waves.push({ x: e.x - 150, dir: -1, life: 0.9, h: 80, kind: 'shock' }, { x: e.x + 150, dir: 1, life: 0.9, h: 80, kind: 'shock' }); }
        this.stepBusy = false;
      });
    });
  }

  // Sink into the mud, tunnel towards the gremlin (bubbles show where), then burst up under him.
  diveAmbush() {
    const e = this.e; this.stepBusy = true;
    e.play('dive');
    this.after(0.45, () => {
      this.dustBurst(e.x, GROUND_Y, 14, 0x6b7a22);
      this.animate(0.45, u => { e.sink = 700 * u; }, () => {
        e.stop();
        const trail = { x: e.x, life: 99, kind: 'bubbles', w: 160, floorY: GROUND_Y };
        this.markers.push(trail);
        let prevU = 0;
        this.animate(1.55, u => {
          const dt = (u - prevU) * 1.55; prevU = u; const t = u * 1.55;
          const target = clamp(this.g.x, 200, 1720);
          if (t < 1.0) trail.x += clamp(target - trail.x, -620 * dt, 620 * dt);    // chases the gremlin...
          if (t >= 1.0 && !trail.locked) { trail.locked = true; trail.kind = 'danger'; trail.w = 260; }   // ...then locks on: get out of the way
        }, () => {
          trail.life = 0;
          e.x = trail.x; e.spot = 'ambush'; this.faceGremlin(); e.play('rise');
          this.dustBurst(e.x, GROUND_Y, 30, 0x7d8f24); this.cameras.main.shake(260, 0.01);
          this.waves.push({ x: e.x, dir: 0, life: 0.35, h: 300, w: 260, kind: 'burst' });
          this.animate(0.26, u => { e.sink = 700 * (1 - u); }, () => { this.stepBusy = false; this.queue.unshift({ hop: 'far' }); });
        });
      });
    });
  }

  onEddie(name, ...a) {
    const e = this.e, g = this.g;
    switch (name) {
      case 'say': this.say(a[0], a[1]); break;
      case 'taunt': this.taunt(a[0]); break;
      case 'crumbs': { const m = e.mouthPoint(); for (let i = 0; i < a[0]; i++) this.chips.push({ x: m[0], y: m[1], vx: rnd(40, 260) * this.edir, vy: rnd(-260, 20), life: rnd(0.4, 0.8), sz: rnd(4, 8) }); break; }
      case 'vulnerable': e.vulnT = a[0]; this.events.emit('bossvuln', a[0]); break;
      case 'warn': this.warn(); break;
      case 'rumble': this.cameras.main.shake(400, 0.003); break;
      case 'landed': break;
      case 'thud': this.cameras.main.shake(300, 0.008); this.dustBurst(e.x, GROUND_Y, 14); break;
      case 'sink': this.defeatSink(); break;
      case 'throwRock': this.throwRock(a[0]); break;
      case 'throwBomb': this.throwBomb(); break;
      case 'throwNet': this.throwNet(); break;
      case 'gas': this.gas(); break;
      case 'shrooms': this.shrooms(); break;
      case 'splash': this.waves.push({ x: e.x + 120 * this.edir, dir: this.edir, life: 1.9, h: 110, kind: 'sludge' }); this.dustBurst(e.x + 100 * this.edir, GROUND_Y, 18, 0x8fae22); break;
      case 'moveDone':
        if (a[0] === 'entrance') { this.mode = 'running'; this.events.emit('fightStart'); }
        break;
    }
  }
  warn() {   // a bright "!" over Eddie's head: something big is coming
    const h = this.e.headTop();
    const t = this.add.text(h[0], h[1] - 40, '!', { fontFamily: 'Lilita One, Trebuchet MS, sans-serif', fontSize: 110, color: '#ff5a3a', stroke: '#1b0b06', strokeThickness: 12 }).setOrigin(0.5).setDepth(21);
    this.tweens.add({ targets: t, scale: { from: 0.4, to: 1.15 }, duration: 160, yoyo: true, hold: 260, onComplete: () => t.destroy() });
  }

  // ---------- Eddie's attacks (all aimed at the gremlin) ----------
  gFloorY() { return GROUND_Y - this.g.S.floor * this.g.k; }   // the surface the gremlin is actually standing on
  throwRock(type) {
    const h = this.e.handPoint(), g = this.g;
    const img = this.add.image(h[0], h[1], 'e_rock').setDepth(11).setScale(0.45 * EDDIE_H / 540);
    if (type === 'low') {
      // drops in front of him, then bounces and rolls along the ground all the way across: JUMP it
      this.shots.push({ k: 'rockLow', img, x: h[0], y: h[1], vx: this.edir * BOSS_TUNING.rockLowSpeed * 0.6, dir: this.edir, vy: -200, r: 40, bounces: 0 });
    } else {
      // flies straight at the gremlin's head height: SLIDE under it
      const tx = g.x, ty = this.gFloorY() - 215;
      const dx = tx - h[0], dy = ty - h[1], d = Math.hypot(dx, dy) || 1, sp = BOSS_TUNING.rockHighSpeed;
      this.shots.push({ k: 'rockHigh', img, x: h[0], y: h[1], vx: dx / d * sp, vy: dy / d * sp, r: 36 });
    }
  }
  throwBomb() {
    const h = this.e.handPoint(), g = this.g;
    const lead = clamp(g.S.vx * 0.35, -220, 220);
    const tx = clamp(g.x + lead + rnd(-50, 50), 140, 1700);
    const standing = g.S.floor * g.k, floor = (standing > 0 && g.floorAt(tx) === standing) ? standing : 0;   // lands on his ledge if he's up on one
    const ty = GROUND_Y - floor;
    const marker = { x: tx, floorY: ty, w: 230, life: BOSS_TUNING.bombFlight, kind: 'bomb' };
    this.markers.push(marker);
    const img = this.add.image(h[0], h[1], 'mouldBomb').setDepth(11).setScale(0.75);
    this.shots.push({ k: 'bomb', img, x0: h[0], y0: h[1], tx, ty, t: 0, T: BOSS_TUNING.bombFlight, r: 34, floor });
  }
  throwNet() {
    const h = this.e.handPoint(), g = this.g;
    const tx = g.x, ty = this.gFloorY() - 150;
    const dx = tx - h[0], dy = ty - h[1], d = Math.hypot(dx, dy) || 1, sp = BOSS_TUNING.netSpeed;
    const img = this.add.image(h[0], h[1], 'mouldNet').setDepth(11).setScale(0.3);
    this.shots.push({ k: 'net', img, x: h[0], y: h[1], vx: dx / d * sp, vy: dy / d * sp, r: 62 });
  }
  gas() {   // a toxic cloud that rolls along the ground: jump over it, stand on high ground, or blast it apart (3 hits)
    const m = this.e.mouthPoint();
    const puffs = [];
    for (let i = 0; i < 7; i++) puffs.push(this.add.image(m[0], m[1], 'glow').setTint(i % 2 ? 0xa8d62a : 0x7fa61c).setAlpha(0.85).setDepth(11).setDisplaySize(10, 10));
    this.shots.push({ k: 'gas', puffs, x: m[0], y: m[1], vx: this.edir * BOSS_TUNING.gasSpeed, w: 170, hgt: 165, grow: 0, hp: 3 });
  }
  shrooms() {   // cracks race along the ground towards the gremlin, then toadstools burst up one after another
    const e = this.e, d = this.edir, end = d < 0 ? clamp(this.g.x - 160, 120, e.x - 200) : clamp(this.g.x + 160, e.x + 200, 1800);
    let i = 0;
    for (let x = e.x + 230 * d; d < 0 ? x >= end : x <= end; x += 150 * d, i++) this.shroomCols.push({ x, warn: 0.55 + i * 0.11, t: 0, up: 0.65, h: rnd(150, 185), s: rnd(0.9, 1.15) });
  }

  // ---------- gremlin's attacks ----------
  spawnOrb(p) {
    const glow = this.add.image(p.x, p.y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x9b4dff).setDepth(13).setDisplaySize(150, 150);
    this.orbs.push({ x: p.x, y: p.y, vx: 1250 * this.g.face, r: 22, glow, trail: [] });
  }
  meltBlast(p) {
    const hb = this.e.hurtbox();
    if (hb && this.mode === 'running' && (hb.centerX - p.x) * this.g.face > -100 && p.y > hb.y - 60 && p.y < hb.bottom + 60) this.damageEddie(BOSS_TUNING.meltdownDamage, true);
    for (const s of this.shots) if (s.k === 'gas' && s.x > p.x) s.dead = true;
  }
  damageEddie(n, heavy = false) {
    if (this.mode !== 'running') return;
    this.hp = Math.max(0, this.hp - n); this.events.emit('bosshp', this.hp / BOSS_TUNING.hp, this.phase);
    this.e.flashT = 0.09;
    if (heavy && !['hop', 'takeoff', 'dive', 'rise'].includes(this.e.move) && !this.stepBusy) this.e.play('hitHeavy');
    if (this.hp <= 0) return this.win();
    const ph = this.hp <= BOSS_TUNING.phase3At ? 3 : this.hp <= BOSS_TUNING.phase2At ? 2 : 1;
    if (ph !== this.phase) {
      const skipped = ph - this.phase;   // a big Meltdown hit can jump two phases: still drop both potions
      this.phase = ph; this.queue = []; this.e.timeScale = ph === 3 ? BOSS_TUNING.phase3Speed : 1;
      this.say(ph === 2 ? 'Right. MOULD TIME.' : 'NOW I’M ANGRY. AND HUNGRY.', 1.8);
      for (let i = 0; i < skipped; i++) this.dropPotion();
      this.events.emit('bosshp', this.hp / BOSS_TUNING.hp, this.phase);
    }
  }
  win() {
    this.mode = 'won'; this.queue = []; this.stepBusy = true;
    for (const s of this.shots) s.dead = true;
    this.markers = []; this.shroomCols = []; this.waves = [];
    this.e.vulnT = 0; this.e.timeScale = 1; this.e.air = 0;
    const toGround = () => { this.e.floor = 0; this.e.play('defeat'); };
    if (this.e.floor > 0) { this.e.floor = 0; this.dustBurst(this.e.x, GROUND_Y, 14); }
    this.after(0.25, toGround);
    this.bossTime = this.fightT;
  }
  defeatSink() {
    const e = this.e;
    this.puddle = { x: e.x + 30, w: 0 };
    this.animate(0.9, u => { this.puddle.w = 420 * u; });
    this.animate(1.6, u => { e.sink = 900 * (1 - Math.cos(u * Math.PI / 2)); });
    // a mould-covered hand rises clutching one final rock... CRUNCH... and sinks
    this.after(2.6, () => {
      const hand = this.add.container(e.x + 20, GROUND_Y + 160).setDepth(9);
      const hs = e.k * 1.5;   // drawn a bit larger than life so it reads at phone size
      const f = e.RIG.foN, hd = e.RIG._hand;   // forearm turned upside down so the hand points at the sky
      const arm = this.add.image(0, 0, 'e_foN').setOrigin((f.px - f.x) / f.w, (f.py - f.y) / f.h).setScale(hs).setAngle(180);
      const rock = this.add.image(-(hd[0] - f.px) * hs, -(hd[1] - f.py) * hs + 10, 'e_rock_s1').setScale(0.9);
      hand.add([arm, rock]);
      const mg = this.make.graphics({ add: false }); mg.fillStyle(0xffffff).fillRect(0, 0, W, GROUND_Y + 4);
      hand.setMask(mg.createGeometryMask());
      this.animate(0.9, u => { hand.y = GROUND_Y + 160 - 140 * Math.sin(u * Math.PI / 2); });
      this.after(1.5, () => { this.say('CRUNCH.', 0.9); rock.setVisible(false); this.cameras.main.shake(120, 0.004); });
      this.after(2.6, () => { this.say('Tell my rocks... I love them...', 2.2); });
      this.after(4.3, () => this.animate(0.9, u => { hand.y = GROUND_Y + 20 + 240 * (1 - Math.cos(u * Math.PI / 2)); }));
      this.after(5.4, () => { this.puddle.pop = 1; this.g.win(); this.after(1.2, () => this.events.emit('finished', this.finalScore())); });
    });
  }

  // ---------- game-time scheduling (follows slow motion and pause, unlike wall-clock tweens) ----------
  after(sec, fn) { this.timers.push({ t: sec, fn }); }
  /** Run step(u) for u = 0..1 over d seconds, then done(). */
  animate(d, step, done) { this.tasks.push({ t: 0, d, step, done }); }
  tick(dt) {
    for (const tm of this.timers) { tm.t -= dt; if (tm.t <= 0 && !tm.fired) { tm.fired = true; tm.fn(); } }
    this.timers = this.timers.filter(tm => !tm.fired);
    for (const k of this.tasks.slice()) { k.t += dt; const u = Math.min(1, k.t / k.d); k.step(u); if (u >= 1 && !k.fin) { k.fin = true; k.done && k.done(); } }
    this.tasks = this.tasks.filter(k => !k.fin);
  }

  /** GDD scoring: boss 1,000 + time bonus, level 500, 200 per heart left, 1,000 for no damage in the whole level. */
  finalScore() {
    const t = this.bossTime, timeBonus = t < 45 ? 500 : t <= 75 ? 300 : 100;
    const parts = [['Boss defeated', POINTS.boss], [`Boss time ${t.toFixed(0)} s`, timeBonus], ['Level complete', POINTS.levelComplete], [`${this.hearts} heart${this.hearts === 1 ? '' : 's'} left`, POINTS.perHeart * this.hearts]];
    if (!this.damaged) parts.push(['No damage!', POINTS.noDamage]);
    for (const [, n] of parts) this.score += n;
    this.events.emit('score', this.score);
    return { time: t, hearts: this.hearts, score: this.score, breakdown: parts.map(([l, n]) => `${l}: +${n.toLocaleString()}`).join('\n') };
  }

  // ---------- helpers ----------
  dustBurst(x, y, n, col = 0x6a5a3a) { for (let i = 0; i < n; i++) (this.chips ||= []).push({ x: x + rnd(-120, 120), y, vx: rnd(-420, 420), vy: rnd(-520, -120), life: rnd(0.4, 0.9), sz: rnd(8, 18), col, dust: true }); }
  /** A fresh potion pops up on a low root platform (a single jump reaches it): one that's still empty, as far from Eddie as possible. */
  dropPotion() {
    const y = GROUND_Y - (this.potionH || 215) - 60, taken = x => this.pickups.some(q => q.type === 'potion' && !q.dead && Math.abs(q.x - x) < 50);
    const spots = (this.potionSpots || [585, 1375]).slice().sort((a, b) => Math.abs(b - this.e.x) - Math.abs(a - this.e.x));
    const x = spots.find(x => !taken(x)) ?? spots[0];
    this.addPickup('potion', x, y);
    this.g.fx.burst([x, y], 0.6);
  }
  addPickup(type, x, y) {
    const img = this.add.image(x, y, 'pick_' + type).setDepth(6).setScale(type === 'crystal' ? 0.42 : 0.47);
    this.pickups.push({ type, x, y, img, t: Math.random() * 6 });
  }
  takeHit(src = '') {
    const g = this.g;
    if (g.invulnerable || g.trapped || this.mode !== 'running') return;
    this.lastHitBy = src;
    this.hearts--; this.damaged = true; this.events.emit('hearts', this.hearts);
    if (this.hearts <= 0) { this.mode = 'dying'; g.die(); this.say(pick((this.TAUNTS || TAUNTS).death), 2.4); }
    else g.hurt();
  }

  // ---------- main loop ----------
  update(time, deltaMs) {
    const dt = Math.min(0.05, deltaMs / 1000) * this.timeScale;
    this.chips ||= [];
    if (this.mode === 'running') this.fightT += dt;
    // the gremlin can't get past Eddie (he always faces left)
    const ehb = this.e.hurtbox();
    this.g.faceTarget = this.e.x;
    this.tick(dt);
    this.g.update(dt);
    this.e.update(dt);
    this.nextStep();
    this.updateShots(dt);
    this.updateOrbs(dt);
    this.updateGround(dt);
    this.updatePickups(dt);
    if (this.mode === 'running') this.collide(dt);
    // speech bubble follows Eddie's head
    const b = this.bubble;
    if (b.visible) { b.life -= dt; const h = this.e.headTop(); b.setPosition(clamp(h[0] - 40, 340, W - 340), clamp(h[1] - 30, 200 + b.hh, GROUND_Y - 260)); b.setAlpha(Math.min(1, b.life * 4)); if (b.life <= 0) b.setVisible(false); }
    this.drawBoxes();
  }

  updateShots(dt) {
    const g = this.g;
    for (const s of this.shots) {
      if (s.k === 'rockLow') {
        s.vy += 2600 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.y > GROUND_Y - s.r && s.vy > 0) { s.y = GROUND_Y - s.r; s.vy = s.bounces < 2 ? -s.vy * 0.4 : 0; s.vx = s.dir * BOSS_TUNING.rockLowSpeed; s.bounces++; if (s.bounces <= 2) this.dustBurst(s.x, GROUND_Y, 3); }
        s.img.rotation -= dt * 9;
      } else if (s.k === 'rockHigh' || s.k === 'net') {
        s.x += s.vx * dt; s.y += s.vy * dt; s.img.rotation -= dt * (s.k === 'net' ? 2 : 7);
        if (s.k === 'net') s.img.setScale(Math.min(0.62, s.img.scale + dt * 1.2));
      } else if (s.k === 'bomb') {
        s.t += dt; const u = Math.min(1, s.t / s.T);
        s.x = s.x0 + (s.tx - s.x0) * u; s.y = s.y0 + (s.ty - s.y0) * u - 4 * 330 * u * (1 - u); s.img.rotation -= dt * 6;
        if (u >= 1) { s.dead = true; this.bombSplat(s); }
      } else if (s.k === 'gas') {
        s.grow = Math.min(1, s.grow + dt * 2.2);
        s.x += s.vx * dt; s.y += (GROUND_Y - s.hgt / 2 - s.y) * Math.min(1, dt * 4);
        s.puffs.forEach((p, i) => { const a = i / s.puffs.length * Math.PI * 2 + this.time.now / 500;
          p.setPosition(s.x + Math.cos(a) * s.w * 0.32, s.y + Math.sin(a * 1.3) * s.hgt * 0.25).setDisplaySize(s.w * 0.9 * s.grow, s.hgt * 0.9 * s.grow); });
      }
      if (s.img) s.img.setPosition(s.x, s.y);
      if (s.x < -200 || s.y > GROUND_Y + 200) s.dead = true;
      if (s.dead) { s.img?.destroy(); s.puffs?.forEach(p => p.destroy()); }
    }
    this.shots = this.shots.filter(s => !s.dead);
  }
  bombSplat(s) {
    this.dustBurst(s.tx, s.ty, 14, 0x9fcc1e);
    this.patches.push({ x: s.tx, floorY: s.ty, w: 230, life: BOSS_TUNING.patchTime, max: BOSS_TUNING.patchTime });
    const hb = this.g.hitbox();
    if (hb && Math.abs(this.g.x - s.tx) < 110 && Math.abs(hb.bottom - s.ty) < 60) this.takeHit('bomb');
  }

  updateOrbs(dt) {
    for (const o of this.orbs) {
      o.x += o.vx * dt; o.trail.unshift([o.x, o.y]); if (o.trail.length > 9) o.trail.pop();
      o.glow.setPosition(o.x, o.y);
      const hb = this.e.hurtbox();
      if (hb && this.mode === 'running' && Phaser.Geom.Intersects.CircleToRectangle(new Phaser.Geom.Circle(o.x, o.y, o.r), hb)) {
        o.dead = true;
        if (this.e.vulnerable) { this.damageEddie(BOSS_TUNING.boltDamage); this.g.fx.burst([o.x, o.y], 0.5); }
        else { this.ping(o.x, o.y); }   // not vulnerable: the magic just bounces off his mould
      }
      for (const s of this.shots) if (!o.dead && s.k === 'gas' && Math.abs(o.x - s.x) < s.w / 2 && Math.abs(o.y - s.y) < s.hgt / 2) {
        o.dead = true; s.hp--; s.w *= 0.75; s.hgt *= 0.8; this.g.fx.burst([o.x, o.y], 0.4); if (s.hp <= 0) s.dead = true;
      }
      if (o.x > W + 100 || o.x < -100) o.dead = true;
      if (o.dead) o.glow.destroy();
    }
    this.orbs = this.orbs.filter(o => !o.dead);
  }
  ping(x, y) {
    for (let i = 0; i < 6; i++) this.chips.push({ x, y, vx: rnd(100, 500) * -this.g.face, vy: rnd(-300, 300), life: 0.25, sz: 5, col: 0xe2beff, spark: true });
  }

  updateGround(dt) {
    const G = this.fxG, F = this.fxTop; G.clear(); F.clear();
    const now = this.time.now / 1000;
    // markers: where a bomb will land / where Eddie will land / where he'll burst up
    for (const m of this.markers) {
      m.life -= dt; if (m.life <= 0) continue;
      const pulse = 0.5 + 0.5 * Math.sin(now * 16);
      if (m.kind === 'bubbles') { G.fillStyle(0x4b5a1e, 0.9).fillEllipse(m.x, GROUND_Y + 4, m.w, 30); for (let i = 0; i < 7; i++) { const r = 10 + (i % 3) * 6; G.fillStyle(0xb8e02a, 0.9).fillCircle(m.x + Math.sin(now * 9 + i * 2) * 60, GROUND_Y - 8 - ((now * 160 + i * 23) % 60), r); G.lineStyle(3, 0x3f5a08, 0.9).strokeCircle(m.x + Math.sin(now * 9 + i * 2) * 60, GROUND_Y - 8 - ((now * 160 + i * 23) % 60), r); } }
      else { const col = m.kind === 'land' ? 0xe2c46a : m.kind === 'bomb' ? 0xc6f135 : 0xff5a3a; G.lineStyle(6, col, 0.5 + 0.5 * pulse).strokeEllipse(m.x, m.floorY + 3, m.w, 30); G.fillStyle(col, 0.18 + 0.15 * pulse).fillEllipse(m.x, m.floorY + 3, m.w, 30); }
    }
    this.markers = this.markers.filter(m => m.life > 0);
    // mould patches: damaging while they last, then they fade (the arena never becomes impassable)
    for (const p of this.patches) {
      p.life -= dt; const a = Math.min(1, p.life / 0.6);
      G.fillStyle(0x6f8f18, 0.85 * a).fillEllipse(p.x, p.floorY + 4, p.w, 34);
      for (let i = 0; i < 5; i++) { const r = 10 + 6 * Math.sin(now * 4 + i * 2); G.fillStyle(0xb8e02a, 0.9 * a).fillCircle(p.x + (i - 2) * p.w * 0.18, p.floorY - 2, Math.max(2, r)); }
    }
    this.patches = this.patches.filter(p => p.life > 0);
    // toadstool eruptions
    for (const c of this.shroomCols) {
      c.t += dt;
      if (c.t < c.warn) { const k = c.t / c.warn; G.lineStyle(5, 0x1a120a, 0.9).lineBetween(c.x - 40 * k, GROUND_Y + 2, c.x + 40 * k, GROUND_Y + 2); if (Math.random() < 0.3) this.chips.push({ x: c.x + rnd(-30, 30), y: GROUND_Y, vx: rnd(-60, 60), vy: rnd(-200, -80), life: 0.3, sz: 5, col: 0x5a4a30, dust: true }); }
      else {
        const u = c.t - c.warn, k = u < 0.12 ? u / 0.12 : u > c.up ? Math.max(0, 1 - (u - c.up) / 0.15) : 1;
        if (!c.img) { c.img = this.add.image(c.x, GROUND_Y + 6, 'shroom').setOrigin(0.5, 1).setDepth(9); this.dustBurst(c.x, GROUND_Y, 5); }
        c.img.setScale(c.s, c.s * k * (c.h / 200)); c.live = k > 0.4;
        if (u > c.up + 0.15) { c.dead = true; c.img.destroy(); }
      }
    }
    this.shroomCols = this.shroomCols.filter(c => !c.dead);
    // ground waves: sludge splash, slam shockwaves, mud burst
    for (const w of this.waves) {
      w.life -= dt; if (w.dir) w.x += w.dir * BOSS_TUNING.waveSpeed * dt;
      const a = Math.min(1, w.life * 4);
      if (w.kind === 'sludge') { F.fillStyle(0x7fa61c, 0.95 * a); F.fillTriangle(w.x - 90, GROUND_Y, w.x, GROUND_Y - w.h, w.x + 70, GROUND_Y); F.fillStyle(0xb8e02a, a); for (let i = 0; i < 4; i++) F.fillCircle(w.x - 20 + i * 18, GROUND_Y - w.h + 10 - 14 * Math.sin(now * 20 + i), 9); }
      else if (w.kind === 'shock') { F.fillStyle(0x8a7350, 0.9 * a).fillTriangle(w.x - 60, GROUND_Y, w.x, GROUND_Y - w.h, w.x + 60, GROUND_Y); F.lineStyle(5, 0xe2c46a, a).strokeTriangle(w.x - 60, GROUND_Y, w.x, GROUND_Y - w.h, w.x + 60, GROUND_Y); }
      else if (w.kind === 'burst') { F.fillStyle(0x6f8f18, 0.8 * a).fillEllipse(w.x, GROUND_Y - w.h * 0.4, w.w, w.h); }
    }
    this.waves = this.waves.filter(w => w.life > 0 && w.x > -150 && w.x < W + 150);
    // flying bits
    for (const c of this.chips) { c.life -= dt; c.x += c.vx * dt; c.y += c.vy * dt; c.vy += (c.spark ? 0 : 1300) * dt; if (c.y > GROUND_Y && c.dust) { c.y = GROUND_Y; c.vy = 0; c.vx *= 0.8; } }
    this.chips = this.chips.filter(c => c.life > 0);
    for (const c of this.chips) F.fillStyle(c.col || 0x7a6a4a, Math.min(1, c.life * 3)).fillCircle(c.x, c.y, c.sz);
    // orb trails
    for (const o of this.orbs) { o.trail.forEach(([x, y], i) => { const a = 1 - i / o.trail.length; F.fillStyle(0x9b4dff, 0.35 * a).fillCircle(x - i * 6 * Math.sign(o.vx), y, o.r * (0.9 * a + 0.2)); }); F.fillStyle(0xe2beff, 1).fillCircle(o.x, o.y, o.r * 0.8).fillStyle(0xffffff, 1).fillCircle(o.x, o.y, o.r * 0.45); }
    // defeat puddle
    if (this.puddle) { const p = this.puddle; G.fillStyle(0x6f8f18, 0.95).fillEllipse(p.x, GROUND_Y + 6, p.w, 40); G.fillStyle(0xb8e02a, 1).fillEllipse(p.x, GROUND_Y + 2, p.w * 0.8, 22);
      for (let i = 0; i < 4; i++) if (!p.pop || i < 1) G.lineStyle(4, 0xc4e534, 0.9).strokeCircle(p.x + (i - 1.5) * p.w * 0.2, GROUND_Y - 6 - 4 * Math.sin(now * 3 + i), 10 + 4 * Math.sin(now * 5 + i * 2)); }
    // trapped gremlin: the net wrapped around him
    if (this.g.trapped) { const c = this.g.centre(); F.lineStyle(6, 0xc4e534, 0.95); for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; F.lineBetween(c[0], c[1], c[0] + Math.cos(a) * 150, c[1] + Math.sin(a) * 170); } for (const r of [60, 110, 160]) F.strokeEllipse(c[0], c[1], r * 1.6, r * 1.9); }
  }

  updatePickups(dt) {
    const g = this.g;
    if (this.mode === 'running') {
      this.crystalT -= dt;
      if (this.crystalT <= 0 && this.pickups.filter(p => p.type === 'crystal').length < 3) {
        this.crystalT = rnd(4, 6.5);
        const where = pick(this.crystalSpots ? this.crystalSpots() : [[rnd(160, 1760), GROUND_Y - 70], [585, GROUND_Y - 215 - 70], [1375, GROUND_Y - 215 - 70], [985, GROUND_Y - 340 - 70], [rnd(200, 1700), GROUND_Y - 360]]);
        this.addPickup('crystal', where[0], where[1]);
      }
    }
    const hb = g.hitbox();
    for (const p of this.pickups) {
      p.t += dt; p.img.y = p.y + 8 * Math.sin(p.t * 3);
      if (hb && !p.dead && Phaser.Geom.Intersects.RectangleToRectangle(hb, new Phaser.Geom.Rectangle(p.x - 35, p.img.y - 45, 70, 90))) {
        if (p.type === 'crystal') { p.dead = true; this.chaos = Math.min(100, this.chaos + 10); this.events.emit('chaos', this.chaos); g.fx.burst([p.x, p.img.y], 0.45); }
        else if (p.type === 'potion' && this.hearts < MAX_HEARTS) { p.dead = true; this.hearts++; this.events.emit('hearts', this.hearts); }
        if (p.dead) this.tweens.add({ targets: p.img, scale: 1.6, alpha: 0, duration: 200, onComplete: () => p.img.destroy() });
      }
    }
    this.pickups = this.pickups.filter(p => !p.dead);
  }

  collide(dt) {
    const g = this.g, hb = g.hitbox(); if (!hb) return;
    const gc = new Phaser.Geom.Rectangle(hb.x, hb.y, hb.width, hb.height);
    // touching Eddie hurts
    const eb = this.e.hurtbox();
    if (eb && g.state !== 'slide') { const core = new Phaser.Geom.Rectangle(eb.x + eb.width * 0.15, eb.y + eb.height * 0.1, eb.width * 0.7, eb.height * 0.9); if (Phaser.Geom.Intersects.RectangleToRectangle(gc, core)) this.takeHit('touch'); }
    for (const s of this.shots) {
      if (s.dead) continue;
      if (s.k === 'gas') { if (Phaser.Geom.Intersects.RectangleToRectangle(gc, new Phaser.Geom.Rectangle(s.x - s.w * 0.4, s.y - s.hgt * 0.4, s.w * 0.8, s.hgt * 0.8))) this.takeHit('gas'); continue; }
      if (s.k === 'bomb') continue;   // bombs hit where they land
      if (Phaser.Geom.Intersects.CircleToRectangle(new Phaser.Geom.Circle(s.x, s.y, s.r), gc)) {
        if (s.k === 'net') { if (!g.invulnerable) { s.dead = true; g.trap(BOSS_TUNING.trapTime); this.say('HAHA! STUCK WITH ME NOW!', 1.6); this.events.emit('trapped'); } }
        else { this.takeHit(s.k); }
      }
    }
    const onGround = !['air', 'spin', 'hurt', 'crouch'].includes(g.state) && Math.abs(hb.bottom - GROUND_Y) < 8;
    const footY = hb.bottom;
    // mould patches: stepping in slows you right down; stay in too long and it costs a heart
    let inPatch = false;
    for (const p of this.patches) if (Math.abs(footY - p.floorY) < 10 && !['air', 'spin'].includes(g.state) && Math.abs(g.x - p.x) < p.w * 0.45 && p.life > 0.3) inPatch = true;
    if (inPatch) { g.slow(0.4); this.patchT += dt; if (this.patchT > PATCH_HURT_AFTER) { this.patchT = 0; this.takeHit('patch'); } } else this.patchT = 0;
    for (const c of this.shroomCols) if (c.live && onGround && Math.abs(g.x - c.x) < 65) this.takeHit('shroom');
    for (const w of this.waves) {
      if (w.kind === 'burst') { if (onGround && Math.abs(g.x - w.x) < w.w / 2 && w.life > 0.15) this.takeHit('burst'); continue; }
      if (Phaser.Geom.Intersects.RectangleToRectangle(gc, new Phaser.Geom.Rectangle(w.x - 50, GROUND_Y - w.h, 100, w.h))) this.takeHit(w.kind);
    }
  }

  drawBoxes() {
    const G = this.boxG; G.clear(); if (!this.showBoxes) return;
    const hb = this.g.hitbox(); if (hb) G.lineStyle(3, this.g.invulnerable ? 0xffffff : 0xc6f135, 1).strokeRectShape(hb);
    const eb = this.e.hurtbox(); if (eb) G.lineStyle(3, this.e.vulnerable ? 0xc6f135 : 0xee2a8a, 1).strokeRectShape(eb);
    for (const s of this.shots) if (s.r) G.lineStyle(3, 0xee2a8a, 1).strokeCircle(s.x, s.y, s.r);
    for (const p of (this.platforms || PLATFORMS)) G.lineStyle(2, 0x9b4dff, 1).lineBetween(p.x0, GROUND_Y - p.h, p.x1, GROUND_Y - p.h);
  }
}
