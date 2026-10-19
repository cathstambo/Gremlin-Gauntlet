// Level 5 boss: Sylvanas, LASER TITS, in her dungeon bedchamber (GDD, locked; Cath's decisions 16 Oct 2026).
//   Phase 1 Laser Tits of Doom (100–70%): her chest glows and a pink line shows the lane, then a beam fires: high = slide,
//     low = jump. After a few beams her armour overheats: she stands still, steaming: vulnerable.
//   Phase 2 The Great Dong Offensive (70–35%): she throws neon novelty projectiles. Each one either flies straight past (high =
//     slide, low = jump) or is lobbed onto a ring and sticks upright in the floor, swaying, for a few seconds (don't touch it).
//     Vulnerable while she turns her back to reload.
//   Phase 3 Maximum Penetration (<35%): faster combinations, skeleton maids marching across (jump them), purple torch flares, and
//     the ultimate laser: the whole floor glows, GET UP HIGH on a bench; afterwards her armour melts down (long vulnerable window).
//   Defeat: Skeleton Rebellion without the supervisor, on the bed (Cath): her own guards dump her in a padded chest.
// Arena rules as the other bosses (joystick, high ground, everything aimed and telegraphed), reusing the Eddie scene's machinery.
import { DIFF } from '../difficulty.js?v=20261020094816';
import { Boss, GROUND_Y, BOSS_TUNING } from './Boss.js?v=20261020094816';
import { Gremlin } from '../gremlin/Gremlin.js?v=20261020094816';
import { Sylvanas } from '../dungeon/Sylvanas.js?v=20261020094816';
import { Music } from '../audio/Music.js?v=20261020094816';
import { loadDungeon } from '../worlds.js?v=20261020094816';

const W = 1920;
const GREM_H = 330, BOSS_H = 600;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const T5 = {   // tuning (placeholders until playtesting)
  beamTime: 0.7, novSpeed: 950, lobTime: 1.05, stickTime: 3.2, maidSpeed: 520, maidCount: 4, phase3Speed: 1.15, ultBand: 200,
};
// the floating royal-purple benches (readme: two lower, a shorter higher one in the middle)
const PLATFORMS = [
  { name: 'benchL', key: 'd_bench_m', w: 450, top: 22, x0: 300, x1: 680, h: 230 },
  { name: 'top', key: 'd_bench_s', w: 202, top: 22, x0: 850, x1: 1070, h: 440 },
  { name: 'benchR', key: 'd_bench_m', w: 450, top: 22, x0: 1240, x1: 1620, h: 230 },
];
const SPOTS = { left: { x: 190, floor: 0 }, midL: { x: 760, floor: 0 }, midR: { x: 1160, floor: 0 }, right: { x: 1730, floor: 0 } };
const TAUNTS = {
  laser: ['BEHOLD THE POWER OF MY FUCKING TITS!', 'EYES UP HERE, ASSHOLE!'],
  novelty: ['CATCH THIS, YOU LITTLE PRICK!', 'I’VE GOT SOMETHING SPECIAL FOR YOU!'],
  hurt: ['THAT’S NOT HOW THIS IS SUPPOSED TO WORK!'],
  death: ['THANK YOU FOR VISITING. FIVE STARS, BITCH!'],
};
const FACE_FOR = { 'BEHOLD THE POWER OF MY FUCKING TITS!': 'angry', 'EYES UP HERE, ASSHOLE!': 'smug', 'CATCH THIS, YOU LITTLE PRICK!': 'angry',
  'I’VE GOT SOMETHING SPECIAL FOR YOU!': 'smug', 'THAT’S NOT HOW THIS IS SUPPOSED TO WORK!': 'shock', 'THANK YOU FOR VISITING. FIVE STARS, BITCH!': 'smug' };
const NOV = ['pink', 'cyan', 'purple', 'lime'];

export class Laser extends Boss {
  constructor() { super('Boss5'); }

  preload() {
    const t = this.add.text(W / 2, this.scale.height / 2, 'Charging the batteries…', { fontFamily: 'Lilita One, Trebuchet MS, sans-serif', fontSize: 44, color: '#ece6f5' }).setOrigin(0.5);
    this.load.once('complete', () => t.destroy());
    loadDungeon(this, true);
  }

  create() {
    this.TAUNTS = TAUNTS; this.platforms = PLATFORMS;
    this.potionSpots = [490, 1430]; this.potionH = 230;
    this.crystalSpots = () => [[rnd(160, 1760), GROUND_Y - 70], [490, GROUND_Y - 230 - 70], [1430, GROUND_Y - 230 - 70], [960, GROUND_Y - 440 - 70], [rnd(200, 1700), GROUND_Y - 360]];
    this.mode = 'ready';
    this.startCarry = this.registry.get('carry') || { hearts: 3, chaos: 0, score: 0, damaged: false };
    this.hearts = this.startCarry.hearts; this.chaos = this.startCarry.chaos; this.score = this.startCarry.score; this.damaged = this.startCarry.damaged;
    this.hp = BOSS_TUNING.hp; this.phase = 1; this.patchT = 0;
    this.timeScale = 1; this.showBoxes = false; this.fightT = 0;
    this.shots = []; this.patches = []; this.orbs = []; this.pickups = []; this.waves = []; this.shroomCols = []; this.markers = [];
    this.timers = []; this.tasks = []; this.chips = []; this.queue = []; this.crystalT = 3;
    this.rings = []; this.beams = []; this.aims = []; this.stuckNov = []; this.steamT = 0; this.glowT = 0; this.restToggle = false; this.hurtLineT = 0; this.ult = null;
    this.drawArena();
    this.fxG = this.add.graphics().setDepth(7);
    this.fxTop = this.add.graphics().setDepth(12);
    this.laserG = this.add.graphics().setDepth(11).setBlendMode(Phaser.BlendModes.ADD);
    this.boxG = this.add.graphics().setDepth(30);

    this.g = new Gremlin(this, 420, GROUND_Y, GREM_H);
    this.g.arena = { minX: 110, maxX: 1820 };
    this.g.floorAt = x => { for (const p of PLATFORMS) if (x >= p.x0 && x <= p.x1) return p.h; return 0; };
    this.g.idle();
    this.g.on('shoot', p => this.spawnOrb(p));
    this.g.on('meltBlast', p => this.meltBlast(p));
    this.g.on('died', () => this.after(1.3, () => { this.mode = 'gameover'; this.events.emit('gameover', pick(TAUNTS.death)); }));

    this.e = new Sylvanas(this, SPOTS.right.x, GROUND_Y, BOSS_H);
    this.e.spot = 'right';
    this.e.onEvent = (name, ...a) => this.onBoss(name, ...a);
    this.bubble = this.makeBubble();
    this.addPickup('potion', 960, GROUND_Y - 440 - 60);   // high centre bench (double jump); two more appear at phases 2 and 3
  }

  drawArena() {
    Music.play(this, null);   // (no World 5 track yet)
    const H = this.scale.height;
    const bg = this.add.image(W / 2, H / 2, 'd_arena_bg').setDepth(0);
    bg.setScale(Math.max(W / bg.width, H / bg.height)).setTint(0xa49cac);   // set back so lasers and projectiles stand out
    // the flagstone floor: its top surface on GROUND_Y, dark stone below
    const fs = 1.4;
    this.add.tileSprite(0, GROUND_Y - 34 * fs, W, 183 * fs, 'd_floor').setOrigin(0, 0).setTileScale(fs).setDepth(4);
    this.add.rectangle(0, GROUND_Y - 34 * fs + 175 * fs, W, 400, 0x120c14).setOrigin(0, 0).setDepth(3.9);
    for (const p of PLATFORMS) {
      const sc = (p.x1 - p.x0 + 60) / p.w, x = (p.x0 + p.x1) / 2, y = GROUND_Y - p.h - p.top * sc;
      this.add.image(x + 12, y + 18, p.key).setOrigin(0.5, 0).setScale(sc).setDepth(4.85).setTintFill(0x0a0402).setAlpha(0.4);   // drop shadow
      this.add.image(x, y, p.key).setOrigin(0.5, 0).setScale(sc).setDepth(5);
    }
    // two purple torches at the edges (they flare up in phase 3)
    this.torches = [140, 1780].map(x => this.add.image(x, GROUND_Y + 10, 'd_gargoyle_torch').setOrigin(0.5, 1).setScale(1.0).setDepth(3.95).setTint(0xb0a8b8));
  }

  // ---------- speech: her bubble shows a close-up of her face ----------
  makeBubble() {
    const c = super.makeBubble();
    c.face = this.add.image(0, 0, 'd_f_smug').setOrigin(1, 1).setScale(0.42).setVisible(false);
    c.add(c.face); return c;
  }
  say(text, dur = 1.8, face) {
    super.say(text, dur);
    const b = this.bubble, f = face || FACE_FOR[text] || 'smug';
    b.face.setTexture('d_f_' + f).setVisible(true).setPosition(-(b.txt.width + 44) / 2 + 10, -18);
  }
  taunt(kind) { if (Math.random() < 0.5) this.say(pick(TAUNTS[kind]), 1.5); }

  // ---------- her brain ----------
  get edir() { return this.e.face > 0 ? -1 : 1; }
  faceGremlin() { this.e.face = this.g.x < this.e.x ? 1 : -1; }
  farSpot() {
    const names = Object.keys(SPOTS).filter(n => n !== this.e.spot);
    const ok = names.filter(n => Math.abs(SPOTS[n].x - this.g.x) >= 600);
    const side = Math.sign(this.e.x - this.g.x), same = ok.filter(n => Math.sign(SPOTS[n].x - this.g.x) === side);
    if (same.length) return pick(same);   // stay on her side of the gremlin (Cath, 20 Oct 2026: no leaping through you)
    if (ok.length) return pick(ok);
    return names.sort((a, b) => Math.abs(SPOTS[b].x - this.g.x) - Math.abs(SPOTS[a].x - this.g.x))[0];
  }
  plan() {
    const ph = this.phase, q = [];
    if (ph === 1) {
      if (Math.random() < 0.5 || Math.abs(this.e.x - this.g.x) < 560) q.push({ hop: 'far' });
      const n = Math.random() < 0.5 ? 2 : 3;
      for (let i = 0; i < n; i++) q.push({ m: 'laser' }, { wait: 0.45 });
      q.push({ rest: 'overheat' });
    } else if (ph === 2) {
      if (Math.random() < 0.5 || Math.abs(this.e.x - this.g.x) < 560) q.push({ hop: 'far' });
      const n = 3 + (Math.random() < 0.5 ? 1 : 0);
      for (let i = 0; i < n; i++) q.push({ m: 'throw' }, { wait: 0.35 });
      if (Math.random() < 0.4) q.push({ m: 'laser' }, { wait: 0.4 });
      q.push({ rest: 'reload' });
    } else {
      const combos = [() => q.push({ m: 'laser' }, { wait: 0.2 }, { m: 'throw' }), () => q.push({ m: 'throw' }, { wait: 0.15 }, { m: 'throw' }, { wait: 0.2 }, { m: 'laser' }),
        () => q.push({ hop: 'far' }, { m: 'laser' }, { wait: 0.25 }, { m: 'laser' }), () => q.push({ maids: true }, { wait: 0.6 }, { m: 'throw' })];
      pick(combos)(); q.push({ wait: 0.35 });
      pick(combos)(); q.push({ wait: 0.35 });
      this.restToggle = !this.restToggle;
      if (this.restToggle) q.push({ m: 'ultimate' }, { rest: 'meltdown' }); else q.push({ rest: 'overheat' });
    }
    this.queue = q;
  }
  nextStep() {
    const e = this.e;
    if (this.mode !== 'running' || e.busy || this.stepBusy) return;
    if (!this.queue.length) this.plan();
    // nothing new while maids are marching through
    if (this.shots.some(s => s.k === 'maid') || this.maidWarn) { this.stepBusy = true; this.after(0.15, () => { this.stepBusy = false; }); return; }
    if (this.queue[0] && (this.queue[0].m || this.queue[0].rest) && Math.abs(e.x - this.g.x) < 380) this.queue.unshift({ hop: 'far' });
    const s = this.queue.shift();
    if (!s.hop) this.faceGremlin();
    if (s.wait) { this.stepBusy = true; this.after(s.wait, () => { this.stepBusy = false; }); return; }
    if (s.m) { e.play(s.m); return; }
    if (s.rest) { e.play(s.rest); return; }
    if (s.maids) { this.maidMarch(); return; }
    if (s.hop) { const n = s.hop === 'far' ? this.farSpot() : s.hop; if (n !== e.spot) this.hopTo(SPOTS[n], n); }
  }
  hopTo(spot, name) {
    const e = this.e; this.stepBusy = true;
    e.play('takeoff');
    const from = { x: e.x, floor: e.floor }, marker = { x: spot.x, floorY: GROUND_Y - spot.floor, w: 300, life: 99, kind: 'land' };
    this.markers.push(marker);
    this.after(0.28, () => {
      e.play('hop'); e.face = spot.x < e.x ? 1 : -1;
      const dur = 0.85 / (this.phase === 3 ? T5.phase3Speed : 1);
      this.animate(dur, u => { e.x = from.x + (spot.x - from.x) * u; e.floor = 0; e.air = from.floor + (spot.floor - from.floor) * u + 4 * (Math.sign(spot.x - this.g.x) !== Math.sign(from.x - this.g.x) ? 620 : 230) * u * (1 - u); },
        () => { e.x = spot.x; e.floor = spot.floor; e.air = 0; e.spot = name; this.faceGremlin(); marker.life = 0; e.play('land'); this.cameras.main.shake(140, 0.004); this.dustBurst(e.x, GROUND_Y - spot.floor, 10, 0xc08ad0); this.stepBusy = false; });
    });
  }

  onBoss(name, ...a) {
    const e = this.e;
    switch (name) {
      case 'say': this.say(a[0], a[1], a[2]); break;
      case 'taunt': this.taunt(a[0]); break;
      case 'vulnerable': e.vulnT = a[0]; this.events.emit('bossvuln', a[0]); break;
      case 'steam': this.steamT = a[0]; break;
      case 'chestGlow': this.glowT = a[0]; break;
      case 'laserWarn': this.laserWarn(); break;
      case 'laserFire': this.laserFire(); break;
      case 'ultimateWarn': this.ultimateWarn(); break;
      case 'ultimateFire': this.ultimateFire(); break;
      case 'throwNovelty': this.throwNovelty(); break;
      case 'moveDone':
        if (a[0] === 'entrance') { this.mode = 'running'; this.events.emit('fightStart'); }
        if (a[0] === 'overheat' || a[0] === 'reload' || a[0] === 'meltdown') { e.vulnT = 0; this.queue.unshift({ hop: 'far' }); }
        break;
    }
  }

  // ---------- lasers (aimed at the gremlin's floor, always shown first) ----------
  laserWarn() {
    this.lzN = (this.lzN || 0) + 1;
    const low = this.lzN % 2 === 1 ? Math.random() < 0.5 : !this.lastLow;
    this.lastLow = low;
    const fy = this.gFloorY(), y = fy - (low ? 62 : 215), dir = this.g.x < this.e.x ? -1 : 1;
    this.e.face = dir < 0 ? 1 : -1;
    this.aim = { y, dir, low, t: 0, T: 0.88 };
    this.glowT = 0.9;
  }
  laserFire() {
    const A = this.aim; if (!A) return; this.aim = null;
    const c = this.e.chestPoint(), x1 = A.dir > 0 ? W + 60 : -60, kx = c[0] + A.dir * 130;
    this.beams.push({ c, kx, y: A.y, x1, dir: A.dir, t: 0, T: T5.beamTime, w: 46 });
    this.cameras.main.shake(180, 0.006);
  }
  ultimateWarn() {
    const dir = this.g.x < this.e.x ? -1 : 1; this.e.face = dir < 0 ? 1 : -1;
    this.ult = { t: 0, T: 1.65, dir }; this.glowT = 1.7;
    this.warnText('GET UP HIGH!');
  }
  ultimateFire() {
    const c = this.e.chestPoint();
    this.beams.push({ c, kx: c[0] + this.ult.dir * 100, y: GROUND_Y - T5.ultBand / 2, x1: this.ult.dir > 0 ? W + 60 : -60, dir: this.ult.dir, t: 0, T: 1.1, w: T5.ultBand, ult: true, both: true });
    this.ult = null; this.cameras.main.shake(900, 0.014);
  }
  warnText(s) {
    const t = this.add.text(W / 2, 300, s, { fontFamily: 'Lilita One, Trebuchet MS, sans-serif', fontSize: 80, color: '#ff4fb8', stroke: '#1a0a1e', strokeThickness: 12 }).setOrigin(0.5).setDepth(25);
    this.animate(1.7, u => t.setAlpha(u < 0.85 ? (Math.sin(u * 40) > 0 ? 1 : 0.4) : 1 - (u - 0.85) / 0.15).setScale(1 + 0.05 * Math.sin(u * 30)), () => t.destroy());
  }

  // ---------- the novelty arsenal (Cath: they fly past, or stick in the floor and sway; no boomerangs) ----------
  throwNovelty() {
    const h = this.e.handPoint(), dir = this.g.x < this.e.x ? -1 : 1, col = pick(NOV), big = Math.random() < 0.35;
    const key = `d_nov_${col}_${big ? 'l' : 's'}`, sc = big ? 0.55 : 0.9;
    this.novN = (this.novN || 0) + 1;
    const lob = this.novN % 3 === 0 || (this.phase >= 2 && Math.random() < 0.35);
    if (lob) {   // lobbed: a ring shows where it'll land; then it sticks upright in the floor, swaying
      const tx = clamp(this.g.x + rnd(-60, 60), 150, 1770), fy = this.gFloorY();
      const img = this.add.image(h[0], h[1], key).setScale(sc).setDepth(11).setOrigin(0.5, 0.9);
      this.rings.push({ x: tx, floorY: fy, t: 0, T: T5.lobTime, w: big ? 200 : 150 });
      this.shots.push({ k: 'lob', img, x0: h[0], y0: h[1], tx, ty: fy + 6, x: h[0], y: h[1], t: 0, T: T5.lobTime, arc: 420, big, sc });
    } else {   // flies straight past at the high (slide) or low (jump) lane, tip first
      const low = Math.random() < 0.5, y = this.gFloorY() - (low ? 60 : 215);
      const img = this.add.image(h[0], y, key).setScale(sc).setDepth(11).setOrigin(0.5, 0.5).setRotation(dir * Math.PI / 2);
      this.aims.push({ y, dir, x0: h[0], t: 0, T: 0.4 });   // a quick sparkle line first
      this.shots.push({ k: 'nov', img, x: h[0], y, vx: 0, dir, delay: 0.4, r: big ? 48 : 34, sc });
    }
  }
  maidMarch() {   // phase 3: skeleton maids march across the arena (dust and red arrows at the edge first): jump them, or get up high
    const fromLeft = this.e.x > W / 2, dir = fromLeft ? 1 : -1, x0 = fromLeft ? -120 : W + 120;
    this.maidWarn = { x: fromLeft ? 60 : W - 60, dir, t: 0, T: 1.2 };
    this.say('GUARDS! GET THE GREMLIN!', 1.6, 'angry');
    this.after(1.2, () => {
      for (let i = 0; i < T5.maidCount; i++) this.after(i * 0.62, () => {
        const img = this.add.image(x0, GROUND_Y + 6, 'd_maid2').setOrigin(0.5, 1).setScale(1.1).setDepth(9).setFlipX(dir > 0);
        this.shots.push({ k: 'maid', img, x: x0, y: GROUND_Y, vx: dir * T5.maidSpeed, t: rnd(0, 0.3), dir });
      });
    });
  }

  // ---------- damage and defeat ----------
  damageEddie(n, heavy = false) {
    if (this.mode !== 'running') return;
    n *= DIFF.k.boss;   // difficulty: magic hits harder on Normal / Easy
    this.hp = Math.max(0, this.hp - n); this.events.emit('bosshp', this.hp / BOSS_TUNING.hp, this.phase);
    this.e.flashT = 0.09;
    if (this.hurtLineT <= 0 && Math.random() < 0.35) { this.say(TAUNTS.hurt[0], 1.4, 'shock'); this.hurtLineT = 4; }
    if (heavy && !['hop', 'takeoff', 'overheat', 'reload', 'meltdown', 'laser', 'ultimate'].includes(this.e.move) && !this.stepBusy) this.e.play('hitHeavy');
    if (this.hp <= 0) return this.win();
    const ph = this.hp <= BOSS_TUNING.phase3At ? 3 : this.hp <= BOSS_TUNING.phase2At ? 2 : 1;
    if (ph !== this.phase) {
      const skipped = ph - this.phase;
      this.phase = ph; this.queue = []; this.e.timeScale = ph === 3 ? T5.phase3Speed : 1;
      this.say(ph === 2 ? 'Fine. Let’s get NOVEL.' : 'YOU WANTED THE FULL EXPERIENCE? HERE IT FUCKING COMES!', 1.9, ph === 2 ? 'smug' : 'angry');
      for (let i = 0; i < skipped; i++) this.dropPotion();
      this.events.emit('bosshp', this.hp / BOSS_TUNING.hp, this.phase);
    }
  }
  act(name, down = true) {
    if (this.mode === 'won' && down && this.endSkip) { this.endSkip(); return; }
    super.act(name, down);
  }

  /** GDD defeat sequence "Skeleton Rebellion", without the supervisor (Cath, 16 Oct 2026), on the bed. Skippable after the first viewing. */
  win() {
    this.mode = 'won'; this.queue = []; this.stepBusy = true; this.bossTime = this.fightT;
    for (const s of this.shots) { s.dead = true; s.img?.destroy(); } this.shots = [];
    for (const n of this.stuckNov) n.img.destroy(); this.stuckNov = [];
    this.markers = []; this.rings = []; this.beams = []; this.aims = []; this.aim = null; this.ult = null; this.maidWarn = null;
    for (const p of this.pickups) { p.dead = true; p.img.destroy(); } this.pickups = [];
    const e = this.e; e.vulnT = 0; e.timeScale = 1; e.floor = 0; e.air = 0; this.steamT = 0;
    let seen = false; try { seen = localStorage.getItem('gremlinGauntlet.sylvanasSeen') === '1'; } catch (err) { /* private mode */ }
    let done = false; const cast = [];
    const finish = () => {
      if (done) return; done = true;
      try { localStorage.setItem('gremlinGauntlet.sylvanasSeen', '1'); } catch (err) { /* ignore */ }
      this.timers = []; this.tasks = [];
      this.bubble.setVisible(false);
      this.g.win();
      this.after(1.0, () => this.events.emit('finished', this.finalScore()));
    };
    this.endSkip = seen ? finish : null;
    // keep the gremlin out of the way, on the left
    this.g.setMove(0);
    // 1. she staggers back to the bed (the middle of the room), armour sparking
    e.play('stagger'); this.sparkT = 99;
    const fromX = e.x, bedX = 960;
    this.animate(1.6, u => { e.x = fromX + (bedX - fromX) * u; });
    this.after(0.2, () => this.say('YOU CAN’T DEFEAT ME! I’VE GOT BATTERIES!', 2.2, 'shock'));
    this.after(1.7, () => { e.x = bedX; e.play('sitBed'); });
    // 2. she orders her guards to attack: four skeleton maids march in
    this.after(2.8, () => { e.play('furious'); this.say('GUARDS! GET THE GREMLIN!', 1.8, 'angry'); });
    const maid = (x, flip) => { const m = this.add.image(x, GROUND_Y + 6, 'd_maid1').setOrigin(0.5, 1).setScale(1.35).setDepth(9).setFlipX(flip); cast.push(m); return m; };
    this.after(3.2, () => {
      const ms = [maid(-100, true), maid(-260, true), maid(W + 100, false), maid(W + 260, false)];
      const tx = [700, 560, 1220, 1360];
      ms.forEach((m, i) => { const x0 = m.x; m.setTexture('d_maid2'); this.animate(1.3, u => { m.x = x0 + (tx[i] - x0) * u; m.y = GROUND_Y + 6 - 6 * Math.abs(Math.sin(u * 20)); }, () => m.setTexture('d_maid1')); });
      this.maidsEnd = ms;
    });
    // 3. ...they stop, look at each other, and turn on her
    this.after(5.0, () => { const ms = this.maidsEnd; ms.forEach(m => m.setFlipX(!m.flipX)); this.quipAt(ms[1].x, GROUND_Y - 280, '…nah.'); });
    this.after(5.6, () => { const ms = this.maidsEnd; ms[0].setFlipX(false); ms[1].setFlipX(false); ms[2].setFlipX(true); ms[3].setFlipX(true); this.quipAt(ms[2].x, GROUND_Y - 280, 'GET HER!'); });
    // 4. "WHAT THE FUCK...", and one tiny, useless laser spark
    this.after(6.2, () => { e.play('zap'); this.say('WHAT THE FUCK DO YOU THINK YOU’RE DOING?!', 2.0, 'angry'); });
    this.after(7.6, () => {
      const c = e.chestPoint(), sp = this.add.image(c[0], c[1], 'd_spark').setScale(0.12).setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
      this.animate(0.7, u => sp.setPosition(c[0] + 160 * u, c[1] + 140 * u * u).setAlpha(1 - u), () => sp.destroy());
      this.quipAt(c[0] + 120, c[1] - 40, '*pfft*');
    });
    // 5. the maids carry her off to the padded equipment chest and dump her in
    const chestX = 1560;
    let chest = null;
    this.after(8.2, () => {
      chest = this.add.image(chestX, GROUND_Y + 8, 'd_chest').setOrigin(0.5, 1).setScale(2.6).setDepth(8.6); cast.push(chest); this.chestImg = chest;
      this.dustBurst(chestX, GROUND_Y, 12, 0x8a7a8a); this.cameras.main.shake(150, 0.005);
      const ms = this.maidsEnd; ms.forEach((m, i) => { const x0 = m.x; this.animate(0.6, u => { m.x = x0 + (bedX + (i - 1.5) * 90 - x0) * u; }); });
    });
    this.after(9.0, () => {
      e.play('carried'); const ms = this.maidsEnd;
      ms.forEach((m, i) => { m.setTexture('d_maid_throw').setFlipX(true); });
      const x0 = e.x;
      this.animate(1.8, u => {
        e.x = x0 + (chestX - x0) * u; e.air = 230 + 10 * Math.sin(u * 30);
        ms.forEach((m, i) => { m.x = e.x + (i - 1.5) * 90; m.y = GROUND_Y + 6 - 6 * Math.abs(Math.sin(u * 30 + i)); });
      });
    });
    this.after(11.0, () => {   // up and over... and in
      const mg = this.make.graphics({ add: false }); mg.fillStyle(0xffffff).fillRect(0, 0, W, GROUND_Y - 150);
      e.root.setMask(mg.createGeometryMask());
      this.sparkT = 0;
      this.animate(0.6, u => { e.air = 230 + 160 * Math.sin(u * Math.PI) - 520 * u * u; e.x = chestX + 20; }, () => { e.root.setVisible(false); this.cameras.main.shake(250, 0.01); this.dustBurst(chestX, GROUND_Y - 250, 14, 0xc08ad0); });
      this.maidsEnd.forEach((m, i) => { m.setTexture('d_maid1'); const x0 = m.x; this.animate(0.5, u => { m.x = x0 + (chestX - 330 - i * 110 - x0) * u; }); });   // step aside so the chest is in view
    });
    this.after(11.8, () => {   // the label goes on
      const lab = this.add.text(chestX, GROUND_Y - 170, 'RETURN TO SENDER\nDEFECTIVE OVERLORD', { fontFamily: 'Lilita One, Trebuchet MS, sans-serif', fontSize: 30, color: '#7a0f0f', backgroundColor: '#f4ecd2', align: 'center', padding: { x: 14, y: 10 } }).setOrigin(0.5).setDepth(9.5).setRotation(-0.06);
      cast.push(lab); this.animate(0.25, u => lab.setScale(1.6 - 0.6 * u));
    });
    this.after(12.6, () => { this.say('YOU UNGRATEFUL BONY BASTARDS!', 2.2, 'angry'); e.x = chestX; e.air = 0; this.chestShake = 2.4; });
    // 6. the skeletons cheer and throw things in the air... and a falling purple one knocks a maid apart
    this.after(14.6, () => {
      const ms = this.maidsEnd;
      for (let i = 0; i < 7; i++) {
        const key = i % 3 ? `d_nov_${pick(NOV)}_s` : 'd_paddle', im = this.add.image(ms[i % 4].x, GROUND_Y - 200, key).setScale(i % 3 ? 0.7 : 1.6).setDepth(10);
        const vx = rnd(-300, 300), x0 = im.x; cast.push(im);
        this.animate(1.6, u => { im.setPosition(x0 + vx * u, GROUND_Y - 200 - 900 * u + 1100 * u * u).setRotation(u * 12); }, () => im.destroy());
      }
      ms.forEach((m, i) => this.animate(1.4, u => { m.y = GROUND_Y + 6 - 30 * Math.abs(Math.sin(u * 12 + i)); }));
      this.quipAt(ms[0].x, GROUND_Y - 290, 'HOORAY!');
    });
    this.after(16.4, () => {
      const m = this.maidsEnd[1], pur = this.add.image(m.x, -150, 'd_nov_purple_l').setScale(0.5).setDepth(10); cast.push(pur);
      this.animate(0.55, u => pur.setPosition(m.x, -150 + (GROUND_Y - 260 + 150) * u * u).setRotation(u * 5), () => {
        m.setTexture('d_maid_dead'); this.cameras.main.shake(160, 0.006); this.dustBurst(m.x, GROUND_Y, 12, 0xefe2c0); this.quipAt(m.x, GROUND_Y - 160, '…worth it.');
        this.animate(0.5, u => pur.setPosition(m.x + 40 * u, GROUND_Y - 260 + 200 * u).setRotation(5 + u * 2));
      });
    });
    this.after(18.6, finish);
  }
  quipAt(x, y, s) {
    const t = this.add.text(x, y, s, { fontFamily: 'Lilita One, Trebuchet MS, sans-serif', fontSize: 34, color: '#ffd6f5', stroke: '#1a0a1e', strokeThickness: 7 }).setOrigin(0.5).setDepth(20);
    this.animate(1.6, u => t.setY(y - 40 * u).setAlpha(u < 0.7 ? 1 : (1 - u) / 0.3), () => t.destroy());
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
    this.updateDungeon(dt);
    this.updatePickups(dt);
    if (this.mode === 'running') this.collide(dt);
    const b = this.bubble;
    if (b.visible) { b.life -= dt; const h = this.e.headTop(); b.setPosition(clamp(h[0] - 40, 420, W - 340), clamp(h[1] - 30, 200 + b.hh, GROUND_Y - 260)); b.setAlpha(Math.min(1, b.life * 4)); if (b.life <= 0) b.setVisible(false); }
    this.drawBoxes();
  }
  updateShots(dt) {
    for (const s of this.shots) {
      if (s.dead) continue;
      if (s.k === 'nov') {   // waits for its sparkle line, then flies straight past, tip first, wobbling
        if (s.delay > 0) { s.delay -= dt; if (s.delay <= 0) s.vx = s.dir * T5.novSpeed; }
        s.x += s.vx * dt; s.img.setPosition(s.x, s.y + 6 * Math.sin(this.time.now / 40)).setRotation(s.dir * Math.PI / 2 + 0.12 * Math.sin(this.time.now / 70));
        if (s.x < -200 || s.x > W + 200) s.dead = true;
      } else if (s.k === 'lob') {
        s.t += dt; const u = Math.min(1, s.t / s.T);
        s.x = s.x0 + (s.tx - s.x0) * u; s.y = s.y0 + (s.ty - s.y0) * u - 4 * s.arc * u * (1 - u);
        s.img.setPosition(s.x, s.y).setRotation((1 - u) * 6);
        if (u >= 1) {   // lands upright and sticks in the floor, swaying
          s.dead = true; this.cameras.main.shake(120, 0.004); this.dustBurst(s.tx, s.ty, 8, 0xc08ad0);
          s.img.setRotation(0).setDepth(8.5);
          this.stuckNov.push({ img: s.img, x: s.tx, y: s.ty, t: 0, life: T5.stickTime, big: s.big, sc: s.sc, ph: rnd(0, 6) });
          const hb = this.g.hitbox(); if (hb && Math.abs(this.g.x - s.tx) < (s.big ? 90 : 65) && Math.abs(hb.bottom - s.ty) < 80) this.takeHit('lob');
          continue;
        }
      } else if (s.k === 'maid') {
        s.t += dt; s.x += s.vx * dt; s.img.setTexture((s.t * 5) % 2 < 1 ? 'd_maid2' : 'd_maid3').setPosition(s.x, GROUND_Y + 6 - 8 * Math.abs(Math.sin(s.t * 10)));
        if (s.x > W + 200 || s.x < -200) s.dead = true;
      }
    }
    for (const s of this.shots) if (s.dead && s.k !== 'lob') s.img?.destroy();
    this.shots = this.shots.filter(s => !s.dead);
  }
  updateDungeon(dt) {
    const L = this.laserG, F = this.fxG; L.clear(); const now = this.time.now / 1000;
    const c = this.e.chestPoint();
    // chest glow while charging
    this.glowT = Math.max(0, this.glowT - dt);
    if (this.glowT > 0) { const p = 0.5 + 0.5 * Math.sin(now * 30); L.fillStyle(0xff3ab8, 0.35 + 0.35 * p).fillCircle(c[0], c[1], 40 + 30 * p).fillStyle(0xffffff, 0.6 * p).fillCircle(c[0], c[1], 16); }
    // the aiming line: a thin pulsing pink line across the lane the beam will take
    if (this.aim) {
      const A = this.aim; A.t += dt; const k = Math.min(1, A.t / A.T), x1 = A.dir > 0 ? W + 40 : -40, x0 = c[0] + A.dir * 130;
      L.lineStyle(3 + 5 * k, 0xff4fb8, 0.35 + 0.5 * k * (0.5 + 0.5 * Math.sin(now * 30))).lineBetween(c[0], c[1], x0, A.y).lineBetween(x0, A.y, x1, A.y);
      for (let x = x0; A.dir > 0 ? x < x1 : x > x1; x += 60 * A.dir) L.fillStyle(0xffffff, 0.5 * k * (0.5 + 0.5 * Math.sin(now * 20 + x * 0.05))).fillCircle(x, A.y, 4 + 3 * k);
    }
    for (const A of this.aims) { A.t += dt; const x1 = A.dir > 0 ? W + 40 : -40; for (let x = A.x0; A.dir > 0 ? x < x1 : x > x1; x += 52 * A.dir) L.fillStyle(0xd27bff, 0.6 * (0.5 + 0.5 * Math.sin(now * 22 + x * 0.04))).fillCircle(x, A.y, 6); }
    this.aims = this.aims.filter(A => A.t < A.T);
    // the ultimate's warning: the whole floor glows (benches are safe)
    if (this.ult) {
      const U = this.ult; U.t += dt; const k = Math.min(1, U.t / U.T), p = 0.5 + 0.5 * Math.sin(now * 18);
      F.fillStyle(0xff3ab8, (0.15 + 0.3 * k) * (0.6 + 0.4 * p)).fillRect(0, GROUND_Y - T5.ultBand, W, T5.ultBand + 10);
      for (const P of PLATFORMS) F.lineStyle(5, 0xc6f135, 0.6 + 0.4 * p).strokeRect(P.x0, GROUND_Y - P.h - 8, P.x1 - P.x0, 16);
    }
    // beams
    for (const B of this.beams) {
      B.t += dt; const a = Math.min(1, B.t * 10, (B.T - B.t) * 6), wob = Math.sin(now * 60) * 3;
      if (B.ult) {   // a wall of pink light over the whole floor
        L.fillStyle(0xff3ab8, 0.55 * a).fillRect(0, GROUND_Y - B.w, W, B.w + 10).fillStyle(0xffffff, 0.5 * a).fillRect(0, GROUND_Y - B.w * 0.65 + wob, W, B.w * 0.3);
        L.lineStyle(26, 0xff3ab8, 0.8 * a).lineBetween(B.c[0], B.c[1], B.c[0] + B.dir * 120, GROUND_Y - B.w * 0.5);
      } else {
        L.lineStyle(B.w, 0xff3ab8, 0.55 * a).lineBetween(B.c[0], B.c[1], B.kx, B.y).lineBetween(B.kx, B.y + wob, B.x1, B.y + wob);
        L.lineStyle(B.w * 0.35, 0xffffff, 0.9 * a).lineBetween(B.c[0], B.c[1], B.kx, B.y).lineBetween(B.kx, B.y + wob, B.x1, B.y + wob);
        L.fillStyle(0xffffff, 0.8 * a).fillCircle(B.c[0], B.c[1], 30);
      }
    }
    this.beams = this.beams.filter(B => B.t < B.T);
    // landing rings for lobbed novelties
    for (const r of this.rings) { r.t += dt; const k = Math.min(1, r.t / r.T), p = 0.5 + 0.5 * Math.sin(now * 16);
      F.lineStyle(6, 0xff4fb8, 0.5 + 0.5 * p).strokeEllipse(r.x, r.floorY + 4, r.w, r.w * 0.18).fillStyle(0xff4fb8, 0.15 + 0.25 * k).fillEllipse(r.x, r.floorY + 4, r.w, r.w * 0.18); }
    this.rings = this.rings.filter(r => r.t < r.T);
    // novelties stuck in the floor, swaying, then fading
    for (const n of this.stuckNov) { n.t += dt; n.img.setRotation(0.16 * Math.sin(n.t * 4 + n.ph) * Math.max(0.3, 1 - n.t / n.life)).setAlpha(Math.min(1, (n.life - n.t) / 0.5)); }
    for (const n of this.stuckNov) if (n.t >= n.life) n.img.destroy();
    this.stuckNov = this.stuckNov.filter(n => n.t < n.life);
    // maids' warning: dust and red arrows at the edge they'll come from
    if (this.maidWarn) {
      const w = this.maidWarn; w.t += dt;
      if (Math.random() < 0.7) this.dustBurst(w.x, GROUND_Y, 2, 0xd8c8b8);
      const a = 0.5 + 0.5 * Math.sin(now * 16);
      for (let i = 0; i < 3; i++) { const x = w.x + w.dir * (60 + i * 70); L.fillStyle(0xff5a3a, a).fillTriangle(x, GROUND_Y - 160, x - w.dir * 40, GROUND_Y - 190, x - w.dir * 40, GROUND_Y - 130); }
      if (w.t > w.T) this.maidWarn = null;
    }
    // overheated armour: steam and sparks off her chest
    this.steamT = Math.max(0, this.steamT - dt);
    if (this.steamT > 0 || this.sparkT > 0) {
      if (Math.random() < 0.5) this.chips.push({ x: c[0] + rnd(-40, 40), y: c[1], vx: rnd(-60, 60), vy: rnd(-260, -120), life: rnd(0.5, 1), sz: rnd(10, 22), col: 0xe8e0f0, spark: true });
      if (Math.random() < 0.25) this.chips.push({ x: c[0] + rnd(-30, 30), y: c[1], vx: rnd(-400, 400), vy: rnd(-400, -100), life: 0.3, sz: 5, col: 0xff8ad8, spark: true });
    }
    // phase 3: the purple torches flare
    const flare = this.phase === 3 && this.mode === 'running';
    for (const t of this.torches) { if (flare && Math.random() < 0.3) this.chips.push({ x: t.x + rnd(-20, 20), y: GROUND_Y - 250, vx: rnd(-40, 40), vy: rnd(-300, -120), life: rnd(0.4, 0.8), sz: rnd(8, 16), col: 0xc04dff, spark: true }); }
    // the chest shaking with her inside
    if (this.chestShake > 0 && this.chestImg) { this.chestShake -= dt; this.chestImg.setRotation(0.04 * Math.sin(now * 40) * Math.min(1, this.chestShake)).setX(1560 + 5 * Math.sin(now * 33)); }
  }

  collide(dt) {
    const g = this.g, hb = g.hitbox(); if (!hb) return;
    const gc = new Phaser.Geom.Rectangle(hb.x, hb.y, hb.width, hb.height);
    // touching her hurts, except while she's vulnerable (get in close and blast her)
    const eb = this.e.hurtbox();
    if (eb && !this.e.vulnerable && g.state !== 'slide' && !['takeoff', 'hop', 'land'].includes(this.e.move) && this.e.air <= 0) { const core = new Phaser.Geom.Rectangle(eb.x + eb.width * 0.15, eb.y + eb.height * 0.1, eb.width * 0.7, eb.height * 0.9); if (Phaser.Geom.Intersects.RectangleToRectangle(gc, core)) this.takeHit('touch'); }
    for (const B of this.beams) {
      if (B.t < 0.06 || B.t > B.T - 0.08) continue;
      if (B.ult) { if (gc.bottom > GROUND_Y - B.w + 10) this.takeHit('ultimate'); continue; }
      const xa = Math.min(B.kx, B.x1), xb = Math.max(B.kx, B.x1);
      if (Phaser.Geom.Intersects.RectangleToRectangle(gc, new Phaser.Geom.Rectangle(xa, B.y - B.w * 0.4, xb - xa, B.w * 0.8))) this.takeHit('laser');
    }
    for (const s of this.shots) {
      if (s.dead) continue;
      if (s.k === 'nov' && s.vx && Phaser.Geom.Intersects.CircleToRectangle(new Phaser.Geom.Circle(s.x, s.y, s.r), gc)) this.takeHit('novelty');
      if (s.k === 'maid' && Phaser.Geom.Intersects.RectangleToRectangle(gc, new Phaser.Geom.Rectangle(s.x - 50, GROUND_Y - 145, 100, 140))) this.takeHit('maid');
    }
    for (const n of this.stuckNov) {
      if (n.t > n.life - 0.4) continue;
      const w = n.big ? 70 : 46, h = n.big ? 150 : 115;
      if (Phaser.Geom.Intersects.RectangleToRectangle(gc, new Phaser.Geom.Rectangle(n.x - w / 2, n.y - h, w, h))) this.takeHit('stuck');
    }
  }

  drawBoxes() {
    const G = this.boxG; G.clear(); if (!this.showBoxes) return;
    const hb = this.g.hitbox(); if (hb) G.lineStyle(3, this.g.invulnerable ? 0xffffff : 0xc6f135, 1).strokeRectShape(hb);
    const eb = this.e.hurtbox(); if (eb) G.lineStyle(3, this.e.vulnerable ? 0xc6f135 : 0xee2a8a, 1).strokeRectShape(eb);
    for (const s of this.shots) if (s.r) G.lineStyle(3, 0xee2a8a, 1).strokeCircle(s.x, s.y, s.r);
    for (const p of PLATFORMS) G.lineStyle(2, 0x9b4dff, 1).lineBetween(p.x0, GROUND_Y - p.h, p.x1, GROUND_Y - p.h);
  }
}
