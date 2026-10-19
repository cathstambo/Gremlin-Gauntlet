// Level 4 boss: Rina, THE QUESO JEFE, and her henchman Gingy, in the cheese village (GDD, LOCKED).
//   Phase 1 La Chancla of Doom (100–70%): chanclas thrown high or low that boomerang back (a purple line shows the path);
//     Gingy lobs cheese (a gold ring shows where). Vulnerable ~3 s while she tugs out a chancla that didn't come back (it sticks just behind her; she stays put).
//   Phase 2 Gin & Tonic Warfare (70–35%): arcing gin bottles leave slippery puddles; Gingy's cheese-wheel catapult (gold ring
//     shadow first; sometimes it misfires backwards). Vulnerable while she pours herself a drink.
//   Phase 3 The Big Cheese Meltdown (<35%): combined attacks, a telegraphed rat stampede, bubbling cheese at the arena edges;
//     the catapult jams and she screams at Gingy (longer vulnerable window).
// Arena rules as the other bosses (joystick, high ground, everything aimed and telegraphed), reusing the Eddie scene's machinery.
import { DIFF } from '../difficulty.js?v=20261020093249';
import { Boss, GROUND_Y, BOSS_TUNING } from './Boss.js?v=20261020093249';
import { Gremlin } from '../gremlin/Gremlin.js?v=20261020093249';
import { Rina } from '../queso/Rina.js?v=20261020093249';
import { Music } from '../audio/Music.js?v=20261020093249';
import { loadQueso } from '../worlds.js?v=20261020093249';
import { Backdrop, QUESO } from '../world/Swamp.js?v=20261020093249';
import { bubble, GINGY_LINES } from '../creatures/Queso.js?v=20261020093249';

const W = 1920;
const GREM_H = 330, BOSS_H = 640;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const T4 = {   // tuning (placeholders until playtesting)
  chanclaSpeed: 1050, chanclaWarn: 0.6, ginFlight: 0.95, puddleTime: 3.6, wheelFlight: 1.35, chunkFlight: 1.0,
  ratSpeed: 780, ratCount: 6, phase3Speed: 1.15, poolHurt: 0.5,
};
// floating cheese-rock islands (the run's island art)
const PLATFORMS = [
  { name: 'perchL', key: 'q_isl3', w: 186, top: 10, x0: 110, x1: 340, h: 170 },
  { name: 'islL', key: 'q_isl2', w: 236, top: 10, x0: 450, x1: 690, h: 270 },
  { name: 'top', key: 'q_isl1', w: 291, top: 14, x0: 790, x1: 1130, h: 420 },
  { name: 'islR', key: 'q_isl2', w: 236, top: 10, x0: 1230, x1: 1470, h: 270 },
];
const SPOTS = { perchL: { x: 235, floor: 170 }, groundL: { x: 570, floor: 0 }, middle: { x: 960, floor: 0 }, groundR: { x: 1350, floor: 0 } };
const CAT = { x: 1700, s: 0.85 }, GINGY_X = 1860;
const TAUNTS = {
  chancla: ['FEAR LA CHANCLA, BITCH!', 'THIS ONE’S GOT YOUR NAME ON IT!'],
  gin: ['IT’S GIN O’CLOCK, MOTHERFUCKER!', 'WHAT A WASTE OF GOOD GIN!'],
  hurt: ['YOU’RE GONNA REGRET THAT, CABRÓN!'],
  death: ['YOU JUST GOT SERVED, EXTRA SHARP!', 'Somebody get me another gin.'],
};
const FACE_FOR = { 'FEAR LA CHANCLA, BITCH!': 'angry', 'THIS ONE’S GOT YOUR NAME ON IT!': 'smug', 'IT’S GIN O’CLOCK, MOTHERFUCKER!': 'laugh', 'WHAT A WASTE OF GOOD GIN!': 'shock',
  'YOU’RE GONNA REGRET THAT, CABRÓN!': 'angry', 'YOU JUST GOT SERVED, EXTRA SHARP!': 'laugh', 'Somebody get me another gin.': 'flirt' };

export class Cartel extends Boss {
  constructor() { super('Boss4'); }

  preload() {
    const t = this.add.text(W / 2, this.scale.height / 2, 'Pouring the gin…', { fontFamily: 'Lilita One, Trebuchet MS, sans-serif', fontSize: 44, color: '#ece6f5' }).setOrigin(0.5);
    this.load.once('complete', () => t.destroy());
    loadQueso(this, true);
  }

  create() {
    this.TAUNTS = TAUNTS; this.platforms = PLATFORMS;
    this.potionSpots = [570, 1350]; this.potionH = 270;
    this.crystalSpots = () => [[rnd(160, 1500), GROUND_Y - 70], [570, GROUND_Y - 270 - 70], [1350, GROUND_Y - 270 - 70], [960, GROUND_Y - 420 - 70], [rnd(200, 1500), GROUND_Y - 360]];
    this.mode = 'ready';
    this.startCarry = this.registry.get('carry') || { hearts: 3, chaos: 0, score: 0, damaged: false };
    this.hearts = this.startCarry.hearts; this.chaos = this.startCarry.chaos; this.score = this.startCarry.score; this.damaged = this.startCarry.damaged;
    this.hp = BOSS_TUNING.hp; this.phase = 1; this.patchT = 0;
    this.timeScale = 1; this.showBoxes = false; this.fightT = 0;
    this.shots = []; this.patches = []; this.orbs = []; this.pickups = []; this.waves = []; this.shroomCols = []; this.markers = [];
    this.timers = []; this.tasks = []; this.chips = []; this.queue = []; this.crystalT = 3;
    this.warnLines = []; this.rings = []; this.puddles = []; this.restToggle = false; this.hurtLineT = 0; this.poolT = 0; this.pools = false;
    this.drawArena();
    this.fxG = this.add.graphics().setDepth(7);
    this.fxTop = this.add.graphics().setDepth(12);
    this.sparkG = this.add.graphics().setDepth(13).setBlendMode(Phaser.BlendModes.ADD);
    this.boxG = this.add.graphics().setDepth(30);

    this.g = new Gremlin(this, 420, GROUND_Y, GREM_H);
    this.g.arena = { minX: 110, maxX: 1820 };
    this.g.floorAt = x => { for (const p of PLATFORMS) if (x >= p.x0 && x <= p.x1) return p.h; return 0; };
    this.g.idle();
    this.g.on('shoot', p => this.spawnOrb(p));
    this.g.on('meltBlast', p => this.meltBlast(p));
    this.g.on('died', () => this.after(1.3, () => { this.mode = 'gameover'; this.events.emit('gameover', pick(TAUNTS.death)); }));

    this.e = new Rina(this, SPOTS.groundR.x, GROUND_Y, BOSS_H);
    this.e.spot = 'groundR';
    this.e.onEvent = (name, ...a) => this.onBoss(name, ...a);
    this.bubble = this.makeBubble();
    this.addPickup('potion', 960, GROUND_Y - 420 - 60);   // high centre island (double jump); two more appear at phases 2 and 3
  }

  drawArena() {
    Music.play(this, null);   // (no World 4 track yet)
    // the village, set further back than in the runs (muted, darker copies of the same art) so the cheese-rock islands,
    // Rina and everything she throws stand out
    this.bg = new Backdrop(this, GROUND_Y, { ...QUESO, near: 'q_arena_near', mid: 'q_arena_mid', nearTint: 0xffffff, midTint: 0xffffff }, { props: false });
    this.bg.scroll(2600); this.bg.far.setTint(0xc8cad6);
    for (const p of PLATFORMS) {
      const sc = (p.x1 - p.x0 + 50) / p.w, x = (p.x0 + p.x1) / 2, y = GROUND_Y - p.h - p.top * sc;
      this.add.image(x, y - 4, p.key).setOrigin(0.5, 0).setScale(sc * 1.05).setDepth(4.9).setTintFill(0x1a0c04).setAlpha(0.85);   // dark rim
      this.add.image(x + 12, y + 18, p.key).setOrigin(0.5, 0).setScale(sc).setDepth(4.85).setTintFill(0x0a0402).setAlpha(0.4);   // drop shadow
      this.add.image(x, y, p.key).setOrigin(0.5, 0).setScale(sc).setDepth(5);
    }
    // Gingy's catapult at the right-hand edge, and Gingy beside it
    this.cat = this.add.image(CAT.x, GROUND_Y + 12, 'q_c_load').setOrigin(0.5, 1).setScale(CAT.s).setDepth(5.5);
    this.gingy = this.add.image(GINGY_X, GROUND_Y + 8, 'q_g_front').setOrigin(0.5, 1).setScale(0.7).setDepth(5.8);
    this.gingyState = { key: 'q_g_front', t: 0, flip: false };
    // bubbling cheese at the arena edges (phase 3)
    this.poolImgs = [this.add.image(110, GROUND_Y + 40, 'q_pool1').setOrigin(0.5, 1).setScale(0.62, 0.8).setDepth(4.6).setAlpha(0),
      this.add.image(1810, GROUND_Y + 40, 'q_pool2').setOrigin(0.5, 1).setScale(0.55, 0.7).setDepth(4.6).setAlpha(0)];
  }

  // ---------- speech: her bubble shows a close-up of her face ----------
  makeBubble() {
    const c = super.makeBubble();
    c.face = this.add.image(0, 0, 'q_p_smug').setOrigin(1, 1).setScale(0.42).setVisible(false);
    c.add(c.face); return c;
  }
  say(text, dur = 1.8, face) {
    super.say(text, dur);
    const b = this.bubble, f = face || FACE_FOR[text] || 'smug';
    b.face.setTexture('q_p_' + f).setVisible(true).setPosition(-(b.txt.width + 44) / 2 + 10, -18);
  }
  gingySay(text, dur = 1.7) { this.gb?.destroy(); this.gb = bubble(this, text, dur); }
  setGingy(key, flip = false) { this.gingyState.key = key; this.gingyState.flip = flip; this.gingyState.t = 0; }

  // ---------- her brain ----------
  get edir() { return this.e.face > 0 ? -1 : 1; }
  faceGremlin() { this.e.face = this.g.x < this.e.x ? 1 : -1; }
  farSpot() {
    const names = Object.keys(SPOTS).filter(n => n !== this.e.spot);
    const ok = names.filter(n => Math.abs(SPOTS[n].x - this.g.x) >= 560);
    if (ok.length) return pick(ok);
    return names.sort((a, b) => Math.abs(SPOTS[b].x - this.g.x) - Math.abs(SPOTS[a].x - this.g.x))[0];
  }
  plan() {
    const ph = this.phase, q = [];
    if (ph === 1) {
      if (Math.random() < 0.5 || Math.abs(this.e.x - this.g.x) < 520) q.push({ hop: 'far' });
      q.push({ m: 'chancla' }, { wait: 0.5 }, { m: 'chancla' }, { wait: 0.4 }, { gingy: 'chunk' }, { wait: 0.9 });
      q.push({ lost: true });
    } else if (ph === 2) {
      const choices = [() => q.push({ m: 'gin' }, { wait: 0.4 }, { m: 'gin' }), () => q.push({ gingy: 'wheel' }, { wait: 0.3 }, { m: 'gin' }), () => q.push({ hop: 'far' }, { m: 'chancla' }), () => q.push({ gingy: 'wheel' }, { wait: 0.6 }, { gingy: 'chunk' })];
      pick(choices)(); q.push({ wait: 0.6 });
      pick(choices)(); q.push({ wait: 0.5 });
      q.push({ rest: 'pour' });
    } else {
      const combos = [() => q.push({ m: 'chancla' }, { wait: 0.15 }, { m: 'gin' }), () => q.push({ gingy: 'wheel' }, { wait: 0.1 }, { m: 'chancla' }),
        () => q.push({ m: 'gin' }, { wait: 0.15 }, { gingy: 'chunk' }, { wait: 0.2 }, { m: 'chancla' }), () => q.push({ hop: 'far' }, { gingy: 'wheel' }, { wait: 0.2 }, { m: 'gin' })];
      pick(combos)(); q.push({ wait: 0.35 });
      pick(combos)(); q.push({ wait: 0.35 });
      this.restToggle = !this.restToggle;
      if (this.restToggle) q.push({ m: 'stampede' }, { wait: 1.6 }, { lost: true }); else q.push({ jam: true });
    }
    this.queue = q;
  }
  nextStep() {
    const e = this.e;
    if (this.mode !== 'running' || e.busy || this.stepBusy) return;
    if (!this.queue.length) this.plan();
    if (this.queue[0] && (this.queue[0].m || this.queue[0].rest) && Math.abs(e.x - this.g.x) < 360) this.queue.unshift({ hop: 'far' });
    const s = this.queue.shift();
    // never two chanclas in the air at once (a jump over one mustn't land you in the other)
    if (((s.m === 'chancla' || s.lost) && this.shots.some(x => x.k === 'chancla')) || this.shots.some(x => x.k === 'rat') || this.stampedeWarn) { this.queue.unshift(s); this.stepBusy = true; this.after(0.15, () => { this.stepBusy = false; }); return; }
    if (!s.hop) this.faceGremlin();
    if (s.wait) { this.stepBusy = true; this.after(s.wait, () => { this.stepBusy = false; }); return; }
    if (s.m) { e.play(s.m); return; }
    if (s.rest) { e.play(s.rest); return; }
    if (s.lost) { this.nextLost = true; this.stepBusy = true; e.play('chancla'); return; }   // she waits for it (it lands behind her)
    if (s.gingy) { this.gingyAttack(s.gingy); return; }
    if (s.jam) { this.jam(); return; }
    if (s.hop) { const n = s.hop === 'far' ? this.farSpot() : s.hop; if (n !== e.spot) this.hopTo(SPOTS[n], n); }
  }
  hopTo(spot, name) {
    const e = this.e; this.stepBusy = true;
    e.play('takeoff');
    const from = { x: e.x, floor: e.floor }, marker = { x: spot.x, floorY: GROUND_Y - spot.floor, w: 300, life: 99, kind: 'land' };
    this.markers.push(marker);
    this.after(0.28, () => {
      e.play('hop'); e.face = spot.x < e.x ? 1 : -1;
      const dur = 0.8 / (this.phase === 3 ? T4.phase3Speed : 1);
      this.animate(dur, u => { e.x = from.x + (spot.x - from.x) * u; e.floor = 0; e.air = from.floor + (spot.floor - from.floor) * u + 4 * 210 * u * (1 - u); },
        () => { e.x = spot.x; e.floor = spot.floor; e.air = 0; e.spot = name; this.faceGremlin(); marker.life = 0; e.play('land'); this.cameras.main.shake(140, 0.004); this.dustBurst(e.x, GROUND_Y - spot.floor, 10, 0xe8b84a); this.stepBusy = false; });
    });
  }

  onBoss(name, ...a) {
    const e = this.e;
    switch (name) {
      case 'say': this.say(a[0], a[1], a[2]); break;
      case 'taunt': this.taunt(a[0]); break;
      case 'vulnerable': e.vulnT = a[0]; this.events.emit('bossvuln', a[0]); break;
      case 'rumble': this.cameras.main.shake(500, 0.004); break;
      case 'chanclaWarn': this.chanclaWarn(); break;
      case 'throwChancla': this.throwChancla(); break;
      case 'chanclaBack': if (this.stuck) { this.stuck.img.destroy(); this.stuck = null; } break;
      case 'throwGin': this.throwGin(); break;
      case 'stampede': this.stampede(); break;
      case 'moveDone':
        if (a[0] === 'entrance') { this.mode = 'running'; this.events.emit('fightStart'); }
        if (a[0] === 'tug') { e.vulnT = 0; this.stepBusy = false; this.queue.unshift({ hop: 'far' }); }
        if (a[0] === 'scold') e.face = this.g.x < e.x ? 1 : -1;
        break;
    }
  }

  // ---------- her attacks (aimed at the gremlin, always telegraphed) ----------
  /** The chancla's lane, chosen at the warning: low = jump it, high = slide under it. Alternates. */
  chanclaWarn() {
    this.chN = (this.chN || 0) + 1;
    const low = this.chN % 2 === 1, y = this.gFloorY() - (low ? 70 : 215), x0 = this.e.x + 80 * this.edir, dir = this.edir;
    this.nextLane = { low, y, dir };
    this.warnLines.push({ x0, y, dir, t: 0, T: T4.chanclaWarn });
  }
  throwChancla() {
    const L = this.nextLane || { y: this.gFloorY() - 70, dir: this.edir }, h = this.e.handPoint();
    const img = this.add.image(h[0], L.y, 'q_chancla').setDepth(11).setScale(0.75);
    const lost = !!this.nextLost; this.nextLost = false;
    this.shots.push({ k: 'chancla', img, x: this.e.x + 60 * L.dir, y: L.y, vx: L.dir * T4.chanclaSpeed, dir: L.dir, r: 40, state: 'out', lost, trail: [] });
  }
  /** A chancla that didn't come back (Cath, 16 Oct 2026: she must stand still while vulnerable and not come at you):
   *  on its way back it sails over her head and sticks in the ground just behind her, on the side away from the gremlin.
   *  She turns her back and tugs at it on the spot: vulnerable ~3 s, no walking. */
  chanclaStuck(s) {
    s.dead = true;
    const e = this.e, x = clamp(s.x, 160, 1760), fy = GROUND_Y - e.floor;
    this.stuck = { x, img: this.add.image(x, fy + 10, 'q_chancla').setOrigin(0.5, 0.85).setScale(0.6).setRotation(s.vx > 0 ? 0.9 : -0.9).setDepth(6) };
    this.dustBurst(x, fy, 10, 0xb06cff); this.cameras.main.shake(120, 0.004);
    this.say(pick(['¡AY, NO! MY CHANCLA!', 'Don’t. Touch. My. Chancla.']), 1.6, 'shock');
    this.stepBusy = true;
    e.face = x < e.x ? 1 : -1;   // turns towards the chancla: her back to the gremlin
    e.play('tug');
  }
  throwGin() {   // an arcing bottle; a green ring shows where it will smash (and leave a slippery puddle)
    const h = this.e.handPoint(), g = this.g, tx = clamp(g.x + rnd(-40, 40), 140, 1780), floorY = this.gFloorY();
    const img = this.add.image(h[0], h[1], 'q_gin').setDepth(11).setScale(0.75);
    this.rings.push({ x: tx, floorY, t: 0, T: T4.ginFlight, col: 0x9fe8b8, w: 220 });
    this.shots.push({ k: 'gin', img, x0: h[0], y0: h[1], tx, ty: floorY - 40, x: h[0], y: h[1], t: 0, T: T4.ginFlight, arc: 360 });
  }
  /** Gingy's part. 'chunk' = he lobs cheese at you; 'wheel' = he fires the catapult (sometimes backwards). */
  gingyAttack(kind) {
    this.stepBusy = true;
    const gx = clamp(this.g.x, 140, 1700), floorY = this.gFloorY();
    if (kind === 'chunk') {
      this.setGingy('q_gt_lift'); if (Math.random() < 0.5) this.gingySay(pick(GINGY_LINES.slice(0, 3)));
      this.after(0.55, () => {
        this.setGingy('q_gt_throw');
        this.rings.push({ x: gx, floorY, t: 0, T: T4.chunkFlight, col: 0xffc93a, w: 200 });
        const img = this.add.image(GINGY_X - 60, GROUND_Y - 230, 'q_chunk1').setDepth(11).setScale(0.6);
        this.shots.push({ k: 'chunk', img, x0: GINGY_X - 60, y0: GROUND_Y - 230, tx: gx, ty: floorY - 30, x: 0, y: 0, t: 0, T: T4.chunkFlight, arc: 420 });
        this.after(0.5, () => { this.setGingy('q_g_front'); this.stepBusy = false; });
      });
      return;
    }
    // the catapult: Gingy kicks the release, the wheel goes up high, and a gold shadow ring grows where it'll come down
    const misfire = this.phase >= 2 && Math.random() < 0.25;
    this.setGingy('q_g_kick', true); this.gingySay(misfire ? 'OH SHIT, WRONG BUTTON!' : pick(GINGY_LINES.slice(0, 2)));
    this.after(0.45, () => {
      this.cat.setTexture('q_c_fire'); this.cameras.main.shake(120, 0.004);
      this.after(0.5, () => this.cat.setTexture('q_c_load'));
      const img = this.add.image(CAT.x - 60, GROUND_Y - 230, 'q_wheel').setDepth(11).setScale(0.9);
      if (misfire) {   // flies off backwards and crashes somewhere behind the village
        this.shots.push({ k: 'wheelOff', img, x: CAT.x - 60, y: GROUND_Y - 230, vx: 900, vy: -1300, r: 0 });
        this.after(1.4, () => { this.cameras.main.shake(300, 0.006); this.say('I SAID ATTACK THE GREMLIN, NOT ME!', 1.7, 'angry'); });
      } else {
        this.rings.push({ x: gx, floorY, t: 0, T: T4.wheelFlight, col: 0xffc93a, w: 300, grow: true });
        this.shots.push({ k: 'wheel', img, x0: CAT.x - 60, y0: GROUND_Y - 230, tx: gx, ty: floorY - 70, x: 0, y: 0, t: 0, T: T4.wheelFlight, arc: 700 });
      }
      this.after(0.6, () => { this.setGingy('q_g_front'); this.stepBusy = false; });
    });
  }
  /** Phase 3: the catapult jams; Gingy panics and she turns on him (long vulnerable window). */
  jam() {
    this.stepBusy = true;
    this.setGingy('q_g_kick', true); this.gingySay('…huh?', 1.0);
    this.after(0.5, () => { this.cat.setTexture('q_c_broken'); this.cameras.main.shake(200, 0.006); this.dustBurst(CAT.x, GROUND_Y, 12, 0x8a6a3a); this.setGingy('q_g_panic'); this.gingySay('RINA, I CAN EXPLAIN!', 1.6); });
    this.after(1.0, () => { this.e.face = -1; this.e.play('scold'); this.stepBusy = false; });
    this.after(6.0, () => { this.cat.setTexture('q_c_load'); this.setGingy('q_g_front'); });
  }
  stampede() {   // dust and arrows at one edge first, then a pack of rats pours across the arena: jump them (or get up high)
    const fromLeft = this.e.x > W / 2, dir = fromLeft ? 1 : -1, x0 = fromLeft ? -140 : W + 140;
    this.stampedeWarn = { x: fromLeft ? 60 : W - 60, dir, t: 0, T: 1.2 };
    this.after(1.2, () => {
      for (let i = 0; i < T4.ratCount; i++) this.after(i * 0.42, () => {
        const img = this.add.image(x0, GROUND_Y + 8, 'q_rat1').setOrigin(0.5, 1).setScale(0.95).setDepth(9).setFlipX(dir < 0);
        this.shots.push({ k: 'rat', img, x: x0, y: GROUND_Y, vx: dir * T4.ratSpeed, t: rnd(0, 0.2), dir });
      });
    });
  }

  // ---------- damage and defeat ----------
  damageEddie(n, heavy = false) {
    if (this.mode !== 'running') return;
    n *= DIFF.k.boss;   // difficulty: magic hits harder on Normal / Easy
    this.hp = Math.max(0, this.hp - n); this.events.emit('bosshp', this.hp / BOSS_TUNING.hp, this.phase);
    this.e.flashT = 0.09;
    if (this.hurtLineT <= 0 && Math.random() < 0.35) { this.say(TAUNTS.hurt[0], 1.4, 'angry'); this.hurtLineT = 4; }
    if (heavy && !['hop', 'takeoff', 'tug', 'pour', 'scold'].includes(this.e.move) && !this.stepBusy) this.e.play('hitHeavy');
    if (this.hp <= 0) return this.win();
    const ph = this.hp <= BOSS_TUNING.phase3At ? 3 : this.hp <= BOSS_TUNING.phase2At ? 2 : 1;
    if (ph !== this.phase) {
      const skipped = ph - this.phase;
      this.phase = ph; this.queue = []; this.e.timeScale = ph === 3 ? T4.phase3Speed : 1;
      this.say(ph === 2 ? 'Gingy! Bring the gin. ALL the gin.' : 'THAT’S IT. MELT. EVERYTHING.', 1.8, ph === 2 ? 'flirt' : 'angry');
      if (ph === 3) this.pools = true;
      for (let i = 0; i < skipped; i++) this.dropPotion();
      this.events.emit('bosshp', this.hp / BOSS_TUNING.hp, this.phase);
    }
  }
  act(name, down = true) {
    if (this.mode === 'won' && down && this.endSkip) { this.endSkip(); return; }
    super.act(name, down);
  }
  /** GDD defeat sequence (locked): "Gin, Gingy & Gravity". Skippable after the first viewing (tap). */
  win() {
    this.mode = 'won'; this.queue = []; this.stepBusy = true; this.bossTime = this.fightT;
    for (const s of this.shots) s.dead = true;
    this.markers = []; this.warnLines = []; this.rings = []; this.stampedeWarn = null; this.pools = false;
    if (this.stuck) { this.stuck.img.destroy(); this.stuck = null; }
    for (const p of this.pickups) { p.dead = true; p.img.destroy(); } this.pickups = [];   // clear the stage for the ending
    const e = this.e; e.vulnT = 0; e.timeScale = 1; e.floor = 0; e.air = 0; e.face = this.g.x < e.x ? 1 : -1;
    let seen = false; try { seen = localStorage.getItem('gremlinGauntlet.rinaSeen') === '1'; } catch (err) { /* private mode */ }
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      try { localStorage.setItem('gremlinGauntlet.rinaSeen', '1'); } catch (err) { /* ignore */ }
      this.timers = []; this.tasks = [];
      e.root.setVisible(false); this.bubble.setVisible(false); this.gb?.destroy(); this.gb = null;
      if (this.wheelBox) this.wheelBox.destroy(); else this.wheelEnd?.destroy(); this.wheelBox = null; this.wheelEnd = null; this.legs = null; this.g.win();
      this.after(1.0, () => this.events.emit('finished', this.finalScore()));
    };
    this.endSkip = seen ? finish : null;
    e.play('stagger');
    // she staggers back towards the catapult and drops her chancla
    this.after(0.2, () => this.say('THIS IS NACHO FUCKING VICTORY!', 2.0, 'shock'));
    const drop = this.add.image(e.x, GROUND_Y - 300, 'q_chancla').setScale(0.55).setDepth(9);
    this.animate(0.6, u => drop.setPosition(e.x - 40, GROUND_Y - 300 + 290 * u * u).setRotation(u * 3), () => this.dustBurst(drop.x, GROUND_Y, 6, 0xb06cff));
    const fromX = e.x, toX = CAT.x - 170;
    this.after(0.4, () => { e.face = 1; this.animate(1.8, u => { e.x = fromX + (toX - fromX) * u; }); });
    this.after(2.3, () => { e.play('lastGin'); this.say('GINGY! DO SOMETHING!', 1.9, 'angry'); });
    // Gingy runs round to the catapult
    this.after(3.4, () => { this.setGingy('q_g_run', true); this.gingySay('DON’T WORRY, BOSS! I’VE GOT THIS!', 2.0);
      const g0 = this.gingy.x; this.animate(0.6, u => { this.gingy.x = g0 + (1800 - g0) * Math.sin(u * Math.PI); }, () => this.setGingy('q_g_front')); });
    this.after(5.2, () => { this.setGingy('q_g_spoon', true); this.gingySay('*yank*', 0.8); });            // pulls the lever...
    this.after(6.1, () => { this.setGingy('q_g_front'); this.gingySay('…', 0.8); });                         // ...nothing
    this.after(7.0, () => { this.setGingy('q_g_kick', true); this.gingySay('*CLUNK*', 0.9); this.cameras.main.shake(150, 0.005); });   // kicks it
    this.after(7.3, () => {   // the catapult goes off: the wheel first, then Rina
      this.cat.setTexture('q_c_fire'); this.cameras.main.shake(250, 0.01);
      const wheel = this.add.image(CAT.x - 60, GROUND_Y - 230, 'q_wheel').setDepth(8.5).setScale(0.9);
      const tx = clamp(this.g.x < 960 ? this.g.x + 520 : this.g.x - 520, 420, 1250);   // lands well away from the gremlin
      this.animate(1.1, u => wheel.setPosition(CAT.x - 60 + (tx - CAT.x + 60) * u, GROUND_Y - 230 + 55 * u - 4 * 520 * u * (1 - u)).setScale(0.9 + 1.4 * u).setRotation(-u * 6),
        () => { wheel.setRotation(0).setPosition(tx, GROUND_Y - 175); this.cameras.main.shake(300, 0.012); this.dustBurst(tx, GROUND_Y, 16, 0xe8b84a); this.wheelEnd = wheel; });
      this.after(0.15, () => {
        e.play('launched'); this.say('GINGYYYYYYYY!', 2.2, 'shock');
        const x0 = e.x;
        this.animate(1.5, u => { e.x = x0 + (tx - x0) * u; e.air = 4 * 620 * u * (1 - u) + 120 * u; },
          () => {   // headfirst into the cheese wheel: just her legs (and the chancla foot) sticking out
            e.root.setVisible(false); e.air = 0;
            this.cameras.main.shake(350, 0.014); this.dustBurst(tx, GROUND_Y - 200, 14, 0xffd23a);
            // (the legs drawing turned upside down: skirt in the wheel, chancla foot in the air)
            const legs = this.add.image(-10, -300, 'q_r_legs').setOrigin(0.5, 0).setScale(1.05).setRotation(Math.PI).setFlipX(true);
            this.wheelEnd.setPosition(0, -175);
            this.wheelBox = this.add.container(tx, GROUND_Y, [legs, this.wheelEnd]).setDepth(8.5);
            this.legs = legs;
          });
      });
    });
    this.after(9.4, () => { this.gingySay('Boss?', 1.2); this.setGingy('q_g_front'); });
    this.after(10.6, () => {   // the wheel rolls away downhill, legs kicking
      const box = this.wheelBox; if (!box) return;
      const x0 = box.x;
      this.animate(2.4, u => { box.x = x0 - 1100 * u * u; box.rotation = -u * u * 9; });
    });
    this.after(11.2, () => {   // her last gin comes down... and Gingy catches it
      const gin = this.add.image(1860, -60, 'q_gin').setScale(0.55).setDepth(9);
      this.animate(0.9, u => gin.setPosition(1860, -60 + (GROUND_Y - 250 + 60) * u * u).setRotation(u * 6), () => {
        gin.setRotation(-0.3).setPosition(GINGY_X - 25, GROUND_Y - 240); this.setGingy('q_g_cheer', true); this.gingySay('WASTE NOT, WANT NOT.', 1.8); this.ginCaught = gin;
      });
    });
    this.after(13.4, () => {   // a rat runs off with his cheese
      const cheese = this.add.image(GINGY_X - 110, GROUND_Y + 4, 'q_g_chunk').setOrigin(0.5, 1).setScale(0.3).setDepth(9);
      const rat = this.add.image(W + 140, GROUND_Y + 8, 'q_rat1').setOrigin(0.5, 1).setScale(0.8).setDepth(9).setFlipX(true);
      cheese.setDepth(5.9);
      const rx = GINGY_X - 110;
      this.animate(0.5, u => { rat.x = W + 140 - (W + 140 - rx) * u; }, () => {
        rat.setFlipX(false);
        this.animate(0.9, u => { rat.x = rx + 500 * u; cheese.x = rat.x + 70; cheese.y = GROUND_Y - 60; });
        this.setGingy('q_g_panic'); this.gingySay('OH, FOR FUCK’S SAKE!', 2.0);
      });
    });
    this.after(16.0, finish);
  }

  // ---------- main loop ----------
  update(time, deltaMs) {
    const dt = Math.min(0.05, deltaMs / 1000) * this.timeScale * DIFF.k.speed;   // difficulty: slower = more time to react
    if (this.mode === 'running') this.fightT += dt;
    this.hurtLineT -= dt;
    this.g.faceTarget = this.e.x;
    this.tick(dt);
    this.g.update(dt);
    this.e.update(dt);
    this.nextStep();
    this.updateShots(dt);
    this.updateOrbs(dt);
    this.updateGround(dt);
    this.updateCartel(dt);
    this.updatePickups(dt);
    if (this.mode === 'running') this.collide(dt);
    const b = this.bubble;
    if (b.visible) { b.life -= dt; const h = this.e.headTop(); b.setPosition(clamp(h[0] - 40, 420, W - 340), clamp(h[1] - 30, 200 + b.hh, GROUND_Y - 260)); b.setAlpha(Math.min(1, b.life * 4)); if (b.life <= 0) b.setVisible(false); }
    if (this.gb) { this.gb.life -= dt; this.gb.setPosition(clamp(this.gingy.x - 60, 300, W - 260), GROUND_Y - 290).setAlpha(Math.min(1, this.gb.life * 4)); if (this.gb.life <= 0) { this.gb.destroy(); this.gb = null; } }
    this.drawBoxes();
  }
  updateShots(dt) {
    for (const s of this.shots) {
      if (s.dead) continue;
      if (s.k === 'chancla') {
        s.img.rotation += dt * 14 * s.dir;
        s.trail.unshift([s.x, s.y]); if (s.trail.length > 12) s.trail.pop();
        if (s.state === 'out') {
          s.x += s.vx * dt;
          if (s.x < 70 || s.x > W - 70) {
            s.state = 'turn'; s.turnT = 0.25; s.y0 = s.y;
          }
        } else if (s.state === 'turn') { s.turnT -= dt; if (s.turnT <= 0) { s.state = 'back'; s.vx = -s.vx; } }
        else if (s.state === 'back' && s.lost) {   // the one that doesn't come back: sails up over her head and lands behind her
          s.x += s.vx * dt;
          const past = (s.x - this.e.x) * Math.sign(s.vx), high = this.e.feetY - 700;
          s.y += ((past > -500 ? high : s.y0) - s.y) * Math.min(1, dt * 7);
          if (past > 170) { this.chanclaStuck(s); continue; }
        }
        else if (s.state === 'back') {   // boomerangs back to her hand
          s.x += s.vx * dt;
          if (Math.abs(s.x - this.e.x) < 70 || s.x < -100 || s.x > W + 100) { s.dead = true; if (!['tug', 'scold', 'pour'].includes(this.e.move) && !this.stepBusy && this.mode === 'running') this.e.play('catch'); }
        }
      } else if (s.k === 'gin' || s.k === 'chunk' || s.k === 'wheel') {
        s.t += dt; const u = Math.min(1, s.t / s.T);
        s.x = s.x0 + (s.tx - s.x0) * u; s.y = s.y0 + (s.ty - s.y0) * u - 4 * s.arc * u * (1 - u);
        s.img.rotation += dt * (s.k === 'wheel' ? -5 : 7);
        if (u >= 1) { s.dead = true; this.landed(s); }
      } else if (s.k === 'wheelOff') { s.vy += 1800 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.img.rotation += dt * 6; if (s.x > W + 200) s.dead = true; }
      else if (s.k === 'rat') {
        s.t += dt; s.x += s.vx * dt; s.y = GROUND_Y - 12 * Math.abs(Math.sin(s.t * 14));
        if ((s.t * 9) % 2 < 1) s.img.setTexture('q_rat1'); else s.img.setTexture('q_rat2');
        if (s.x > W + 200 || s.x < -200) s.dead = true;
      }
      if (s.img) s.img.setPosition(s.x, s.y + (s.k === 'rat' ? 8 : 0));
    }
    for (const s of this.shots) if (s.dead) s.img?.destroy();
    this.shots = this.shots.filter(s => !s.dead);
  }
  /** Something lobbed has come down. */
  landed(s) {
    const hb = this.g.hitbox(), near = (r) => hb && Math.abs(this.g.x - s.tx) < r && Math.abs(hb.bottom - (s.ty + (s.k === 'wheel' ? 70 : s.k === 'gin' ? 40 : 30))) < 90;
    if (s.k === 'gin') {
      const fy = s.ty + 40;
      const sh = this.add.image(s.tx, fy + 10, 'q_gin_splash').setOrigin(0.5, 1).setScale(0.75).setDepth(9);
      this.animate(0.5, u => sh.setAlpha(1 - u), () => sh.destroy());
      const img = this.add.image(s.tx, fy + 14, pick(['q_gin_pud1', 'q_gin_pud2'])).setOrigin(0.5, 1).setScale(0.85).setDepth(4.8);
      this.puddles.push({ x: s.tx, floorY: fy, w: 300, life: T4.puddleTime, img });
      if (near(110)) this.takeHit('gin');
    } else if (s.k === 'chunk') {
      const sp = this.add.image(s.tx, s.ty + 40, 'q_csplash').setOrigin(0.5, 1).setScale(0.8).setDepth(9);
      this.animate(0.45, u => sp.setAlpha(1 - u), () => sp.destroy());
      this.dustBurst(s.tx, s.ty + 30, 8, 0xffc93a);
      if (near(100)) this.takeHit('chunk');
    } else if (s.k === 'wheel') {
      const sm = this.add.image(s.tx, s.ty + 80, 'q_wheel_smash').setOrigin(0.5, 1).setScale(0.9).setDepth(9);
      this.animate(0.7, u => sm.setAlpha(1 - u * u), () => sm.destroy());
      this.cameras.main.shake(260, 0.01); this.dustBurst(s.tx, s.ty + 70, 16, 0xe8b84a);
      if (near(150)) this.takeHit('wheel');
    }
  }
  updateCartel(dt) {
    const S = this.sparkG, F = this.fxG; S.clear(); const now = this.time.now / 1000;
    // the chancla's path: a purple sparkle line before she throws
    for (const w of this.warnLines) {
      w.t += dt; const k = Math.min(1, w.t / w.T), x1 = w.dir < 0 ? -40 : W + 40;
      for (let x = w.x0; w.dir < 0 ? x > x1 : x < x1; x += 52 * w.dir) S.fillStyle(0xd27bff, (0.3 + 0.6 * k) * (0.5 + 0.5 * Math.sin(now * 22 + x * 0.04))).fillCircle(x, w.y, 4 + 4 * k);
    }
    this.warnLines = this.warnLines.filter(w => w.t < w.T);
    // spinning chanclas leave a purple swirl
    for (const s of this.shots) if (s.k === 'chancla' && s.trail) s.trail.forEach(([x, y], i) => { if (i < 2) return; const a = 1 - i / s.trail.length; S.fillStyle(0xb04dff, 0.18 * a).fillCircle(x, y, 26 * a + 4); });
    // landing rings (gin = green, cheese = gold); the catapult's ring grows as the wheel comes down
    for (const r of this.rings) {
      r.t += dt; const k = Math.min(1, r.t / r.T), p = 0.5 + 0.5 * Math.sin(now * 16), w = r.grow ? r.w * (0.45 + 0.55 * k) : r.w;
      F.lineStyle(6, r.col, 0.5 + 0.5 * p).strokeEllipse(r.x, r.floorY + 4, w, w * 0.16).fillStyle(r.col, 0.15 + 0.25 * k).fillEllipse(r.x, r.floorY + 4, w, w * 0.16);
      if (r.grow) F.fillStyle(0x000000, 0.25 * k).fillEllipse(r.x, r.floorY + 4, w * 0.8, w * 0.12);
    }
    this.rings = this.rings.filter(r => r.t < r.T);
    // gin puddles fade
    for (const p of this.puddles) { p.life -= dt; p.img.setAlpha(Math.min(1, p.life / 0.6)); if (p.life <= 0) p.img.destroy(); }
    this.puddles = this.puddles.filter(p => p.life > 0);
    // stampede warning: dust and arrows at the edge the rats will come from
    if (this.stampedeWarn) {
      const w = this.stampedeWarn; w.t += dt;
      if (Math.random() < 0.7) this.dustBurst(w.x, GROUND_Y, 2, 0xd8c8b8);
      const a = 0.5 + 0.5 * Math.sin(now * 16);
      for (let i = 0; i < 3; i++) { const x = w.x + w.dir * (60 + i * 70); S.fillStyle(0xff5a3a, a).fillTriangle(x, GROUND_Y - 160, x - w.dir * 40, GROUND_Y - 190, x - w.dir * 40, GROUND_Y - 130); }
      if (w.t > w.T) this.stampedeWarn = null;
    }
    // bubbling cheese at the edges (phase 3)
    for (const im of this.poolImgs) { const target = this.pools ? 1 : 0; im.setAlpha(im.alpha + (target - im.alpha) * Math.min(1, dt * 3)); im.scaleY = (im === this.poolImgs[0] ? 0.8 : 0.7) * (1 + 0.04 * Math.sin(now * 5 + im.x)); }
    if (this.pools) for (let i = 0; i < 4; i++) { const ph = (now * 0.8 + i * 0.25) % 1, x = i < 2 ? 60 + i * 80 : 1760 + (i - 2) * 80; S.fillStyle(0xffc93a, 0.7 * (1 - ph)).fillCircle(x, GROUND_Y - 20 - ph * 60, 8 + 8 * ph); }
    // Gingy: a little bob, mirrored as needed
    const G = this.gingyState; G.t += dt;
    if (this.gingy.texture.key !== G.key) this.gingy.setTexture(G.key);
    this.gingy.setFlipX(G.flip).setScale(0.7, 0.7 * (1 + 0.02 * Math.sin(now * 5)));
    // the legs sticking out of the wheel kick about
    if (this.legs) this.legs.rotation = Math.PI + 0.12 * Math.sin(now * 9);
  }

  collide(dt) {
    const g = this.g, hb = g.hitbox(); if (!hb) return;
    const gc = new Phaser.Geom.Rectangle(hb.x, hb.y, hb.width, hb.height);
    // touching her hurts, except while she's vulnerable (get in close and blast her)
    const eb = this.e.hurtbox();
    if (eb && !this.e.vulnerable && g.state !== 'slide') { const core = new Phaser.Geom.Rectangle(eb.x + eb.width * 0.15, eb.y + eb.height * 0.1, eb.width * 0.7, eb.height * 0.9); if (Phaser.Geom.Intersects.RectangleToRectangle(gc, core)) this.takeHit('touch'); }
    for (const s of this.shots) {
      if (s.dead) continue;
      if (s.k === 'chancla' && s.state !== 'turn' && Phaser.Geom.Intersects.CircleToRectangle(new Phaser.Geom.Circle(s.x, s.y, s.r), gc)) this.takeHit('chancla');
      if (s.k === 'rat' && Phaser.Geom.Intersects.RectangleToRectangle(gc, new Phaser.Geom.Rectangle(s.x - 95, s.y - 105, 190, 100))) this.takeHit('rat');
    }
    const onFloor = !['air', 'spin'].includes(g.state) && Math.abs(hb.bottom - GROUND_Y) < 10;
    // gin puddles: slippery (you skid on in the way you were going)
    for (const p of this.puddles) if (!['air', 'spin'].includes(g.state) && Math.abs(hb.bottom - p.floorY) < 14 && Math.abs(g.x - p.x) < p.w * 0.45 && p.life > 0.3) g.slip?.(0.45);
    // bubbling cheese at the edges
    if (this.pools && onFloor && (g.x < 190 || g.x > 1735)) { this.poolT += dt; if (this.poolT > T4.poolHurt) { this.poolT = 0; this.takeHit('pool'); } } else this.poolT = 0;
  }

  drawBoxes() {
    const G = this.boxG; G.clear(); if (!this.showBoxes) return;
    const hb = this.g.hitbox(); if (hb) G.lineStyle(3, this.g.invulnerable ? 0xffffff : 0xc6f135, 1).strokeRectShape(hb);
    const eb = this.e.hurtbox(); if (eb) G.lineStyle(3, this.e.vulnerable ? 0xc6f135 : 0xee2a8a, 1).strokeRectShape(eb);
    for (const s of this.shots) if (s.r) G.lineStyle(3, 0xee2a8a, 1).strokeCircle(s.x, s.y, s.r);
    for (const p of PLATFORMS) G.lineStyle(2, 0x9b4dff, 1).lineBetween(p.x0, GROUND_Y - p.h, p.x1, GROUND_Y - p.h);
  }
}
