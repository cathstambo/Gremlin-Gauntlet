// Level 2 boss: Catalytik, THE EVIL OVERLORD, in the Meadows of Malicious Happiness (GDD, LOCKED).
import { DIFF } from '../difficulty.js?v=20261020093249';
//   Phase 1 Salmon Slapper (100–70%): rotten-salmon swings and thrown fish; vulnerable while yanking a salmon out of the ground.
//   Phase 2 Spoonageddon (70–35%): horizontal, falling and bouncing spoons with sparkling warnings; vulnerable while admiring herself.
//   Phase 3 Royal Tantrum (<35%): horn glows purple; salmon + spoons combined; a telegraphed bunny stampede, then she's dizzy.
// Arena rules are the same as Eddie's (whole-screen boss, joystick movement, high ground, everything aimed and telegraphed),
// so this scene reuses the Eddie scene's machinery and swaps in her moves.
import { Boss, GROUND_Y, BOSS_TUNING } from './Boss.js?v=20261020093249';
import { Gremlin } from '../gremlin/Gremlin.js?v=20261020093249';
import { Catalytik, ease } from '../overlord/Catalytik.js?v=20261020093249';
import { Music } from '../audio/Music.js?v=20261020093249';
import { loadMeadow } from '../worlds.js?v=20261020093249';

const W = 1920;
const GREM_H = 330, BOSS_H = 620;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const T2 = {   // tuning (placeholders until playtesting)
  fishLowSpeed: 820, fishHighSpeed: 1100, spoonSpeed: 1100, spoonWarn: 0.75, rainWarn: 0.85, bunnySpeed: 760, bunnyCount: 6,
  phase3Speed: 1.15,
};
const PLATFORMS = [
  { name: 'perchL', key: 'm_aplat_med', size: 'aplat_med', x0: 70, x1: 330, h: 170 },
  { name: 'rootL', key: 'm_aplat_small', size: 'aplat_small', x0: 470, x1: 700, h: 250 },
  { name: 'top', key: 'm_aplat_long', size: 'aplat_long', x0: 790, x1: 1180, h: 390 },
  { name: 'rootR', key: 'm_aplat_small', size: 'aplat_small', x0: 1260, x1: 1490, h: 250 },
  { name: 'perchR', key: 'm_aplat_med', size: 'aplat_med', x0: 1590, x1: 1850, h: 170 },
];
const SPOTS = {
  perchL: { x: 200, floor: 170 }, groundL: { x: 585, floor: 0 }, middle: { x: 985, floor: 0 },
  groundR: { x: 1375, floor: 0 }, perchR: { x: 1720, floor: 170 },
};
const TAUNTS = {
  salmon: ['PREPARE TO BE FISH-SLAPPED, BITCH!', 'THIS SALMON HAS SEEN THINGS!'],
  spoon: ['THERE IS NO SPOON! JUST KIDDING, THERE’S FUCKING HUNDREDS!', 'SPOON ME, MOTHERFUCKER!'],
  hurt: ['EXCUSE YOU! I’M THE FUCKING QUEEN!', 'DO YOU KNOW WHO I AM?!'],
  death: ['AND THAT’S WHY I’M IN CHARGE, BITCHES!', 'Don’t worry. The bunnies will dispose of you.'],
};
const ARENA_FILES = {
  m_arena_bg: 'assets/meadow/arena_bg.jpg', m_arena_floor: 'assets/meadow/arena_floor.webp',
  m_aplat_large: 'assets/meadow/aplat_large.webp', m_aplat_med: 'assets/meadow/aplat_med.webp', m_aplat_long: 'assets/meadow/aplat_long.webp', m_aplat_small: 'assets/meadow/aplat_small.webp',
};
const OVERLORD_PARTS = ['body', 'head', 'head_smug', 'head_shout', 'head_angry', 'head_surprised', 'armN', 'armF', 'legA', 'legB', 'tail', 'salmon', 'fish1', 'fish2', 'fish3'];
const CONFETTI = [0xff4fd8, 0xffd23a, 0x6fe3ff, 0x9b4dff, 0xc6f135, 0xff7a3a, 0xffffff];

export class Overlord extends Boss {
  constructor() { super('Boss2'); }

  preload() {
    const t = this.add.text(W / 2, this.scale.height / 2, 'Polishing the crown…', { fontFamily: 'Lilita One, Trebuchet MS, sans-serif', fontSize: 44, color: '#ece6f5' }).setOrigin(0.5);
    this.load.once('complete', () => t.destroy());
    loadMeadow(this);
    for (const [k, f] of Object.entries(ARENA_FILES)) if (!this.textures.exists(k)) this.load.image(k, f);
    for (const n of OVERLORD_PARTS) if (!this.textures.exists('o_' + n)) this.load.image('o_' + n, `assets/overlord/${n}.webp`);
    if (!this.cache.json.exists('overlordRig')) this.load.json('overlordRig', 'assets/overlord/rig.json');
  }

  create() {
    this.TAUNTS = TAUNTS; this.platforms = PLATFORMS;
    this.potionSpots = [585, 1375]; this.potionH = 250;
    this.crystalSpots = () => [[rnd(160, 1760), GROUND_Y - 70], [585, GROUND_Y - 250 - 70], [1375, GROUND_Y - 250 - 70], [985, GROUND_Y - 390 - 70], [rnd(200, 1700), GROUND_Y - 360]];
    this.mode = 'ready';
    this.startCarry = this.registry.get('carry') || { hearts: 3, chaos: 0, score: 0, damaged: false };
    this.hearts = this.startCarry.hearts; this.chaos = this.startCarry.chaos; this.score = this.startCarry.score; this.damaged = this.startCarry.damaged;
    this.hp = BOSS_TUNING.hp; this.phase = 1; this.patchT = 0;
    this.timeScale = 1; this.showBoxes = false; this.fightT = 0;
    this.shots = []; this.patches = []; this.orbs = []; this.pickups = []; this.waves = []; this.shroomCols = []; this.markers = [];
    this.timers = []; this.tasks = []; this.chips = []; this.queue = []; this.crystalT = 3;
    this.warnLines = []; this.rains = []; this.stuck = null; this.hornGlow = false; this.dizzyT = 0; this.restToggle = false; this.hurtLineT = 0;
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

    this.e = new Catalytik(this, SPOTS.groundR.x, GROUND_Y, BOSS_H);
    this.e.spot = 'groundR';
    this.e.onEvent = (name, ...a) => this.onBoss(name, ...a);
    this.bubble = this.makeBubble();
    this.addPickup('potion', 985, GROUND_Y - 390 - 60);   // high centre platform (double jump); two more appear at phases 2 and 3
  }

  drawArena() {
    const H = this.scale.height;
    Music.play(this, 'w2');   // the World 2 track carries on from the runs into the arena
    // her floating rainbow castle (cover the screen)
    const bg = this.add.image(W / 2, H / 2, 'm_arena_bg').setDepth(0);
    bg.setScale(Math.max(W / bg.width, H / bg.height)); bg.setTint(0xd8d2e8);
    // the crystal floor: its walking surface sits on GROUND_Y
    const info = this.cache.json.get('meadowInfo');
    const F = info.arena_floor, fs = W / F.w * 1.02;
    this.add.image(W / 2, GROUND_Y - (F.top + 12) * fs, 'm_arena_floor').setOrigin(0.5, 0).setScale(fs).setDepth(4);
    for (const p of PLATFORMS) {
      const S = info.sizes[p.size], sc = (p.x1 - p.x0 + 50) / S.w;
      this.add.image((p.x0 + p.x1) / 2, GROUND_Y - p.h - S.top * sc, p.key).setOrigin(0.5, 0).setScale(sc).setDepth(5);
    }
  }

  // ---------- her brain ----------
  get edir() { return this.e.face > 0 ? -1 : 1; }
  farSpot(groundOnly = false) {
    const names = Object.keys(SPOTS).filter(n => n !== this.e.spot && (!groundOnly || SPOTS[n].floor === 0));
    const ok = names.filter(n => Math.abs(SPOTS[n].x - this.g.x) >= 560);
    if (ok.length) return pick(ok);
    return names.sort((a, b) => Math.abs(SPOTS[b].x - this.g.x) - Math.abs(SPOTS[a].x - this.g.x))[0];
  }
  plan() {
    const ph = this.phase, q = [];
    const fish = n => { for (let i = 0; i < n; i++) q.push({ m: 'fish' }, { wait: ph === 3 ? 0.25 : 0.4 }); };
    if (ph === 1) {
      if (Math.random() < 0.5 || Math.abs(this.e.x - this.g.x) < 520) q.push({ hop: 'far' });
      fish(3);
      if (Math.random() < 0.6) q.push({ m: 'swing' }, { wait: 0.4 });
      q.push({ slam: true });
    } else if (ph === 2) {
      const choices = [() => q.push({ m: 'spoons' }), () => q.push({ m: 'rain' }), () => q.push({ m: 'bounce' }, { wait: 0.5 }, { m: 'bounce' }), () => q.push({ hop: 'far' }, { m: 'spoons' })];
      pick(choices)(); q.push({ wait: 0.6 });
      pick(choices)(); q.push({ wait: 0.5 });
      if (Math.random() < 0.4) { q.push({ m: 'fish' }, { wait: 0.4 }); }
      q.push({ rest: 'admire' });
    } else {
      if (!this.hornGlow) q.push({ m: 'hornCharge' });
      const combos = [() => { q.push({ m: 'rain' }, { wait: 0.15 }, { m: 'fish' }); }, () => q.push({ m: 'swing' }, { wait: 0.2 }, { m: 'spoons' }),
        () => q.push({ m: 'bounce' }, { wait: 0.2 }, { m: 'fish' }, { wait: 0.2 }, { m: 'fish' }), () => q.push({ hop: 'far' }, { m: 'rain' })];
      pick(combos)(); q.push({ wait: 0.35 });
      pick(combos)(); q.push({ wait: 0.35 });
      this.restToggle = !this.restToggle;
      if (this.restToggle) q.push({ m: 'stampede' }, { rest: 'dizzy' }); else q.push({ slam: true });
    }
    this.queue = q;
  }
  nextStep() {
    const e = this.e;
    if (this.mode !== 'running' || e.busy || this.stepBusy) return;
    if (!this.queue.length) this.plan();
    if (this.queue[0] && (this.queue[0].m || this.queue[0].rest) && Math.abs(e.x - this.g.x) < 360 && !this.queue[0].nearOk) this.queue.unshift({ hop: 'far' });
    const s = this.queue.shift();
    if (!s.hop && !s.slam) this.faceGremlin();
    if (s.wait) { this.stepBusy = true; this.after(s.wait, () => { this.stepBusy = false; }); return; }
    if (s.m) { e.play(s.m); return; }
    if (s.rest) { e.play(s.rest); return; }
    if (s.hop) { const n = s.hop === 'far' ? this.farSpot() : s.hop; if (n !== e.spot) this.hopTo(SPOTS[n], n); return; }
    if (s.slam) { const x = clamp(this.g.x + this.edir * -40, 300, 1620); this.slamAt(x); }
  }
  hopTo(spot, name) {
    const e = this.e; this.stepBusy = true;
    e.play('takeoff');
    const from = { x: e.x, floor: e.floor }, marker = { x: spot.x, floorY: GROUND_Y - spot.floor, w: 300, life: 99, kind: 'land' };
    this.markers.push(marker);
    this.after(0.3, () => {
      e.play('hop');
      const dur = 0.8 / (this.phase === 3 ? T2.phase3Speed : 1);
      this.animate(dur, u => { e.x = from.x + (spot.x - from.x) * u; e.floor = 0; e.air = from.floor + (spot.floor - from.floor) * u + 4 * 300 * u * (1 - u); },
        () => { e.x = spot.x; e.floor = spot.floor; e.air = 0; e.spot = name; this.faceGremlin(); marker.life = 0; e.play('land'); this.cameras.main.shake(140, 0.004); this.dustBurst(e.x, GROUND_Y - spot.floor, 10, 0xff9ce8); this.stepBusy = false; });
    });
  }
  // Leaps at the gremlin with the salmon raised (red marker shows where), slams it into the ground... and it sticks.
  slamAt(x) {
    const e = this.e; this.stepBusy = true;
    this.faceGremlin(); e.play('takeoff'); this.taunt('salmon');
    const from = { x: e.x, floor: e.floor }, marker = { x, floorY: GROUND_Y, w: 340, life: 99, kind: 'danger' };
    this.markers.push(marker);
    this.after(0.35, () => {
      e.play('hopSlam');
      this.animate(1.0 / (this.phase === 3 ? T2.phase3Speed : 1), u => { e.x = from.x + (x - from.x) * u; e.floor = 0; e.air = from.floor * (1 - u) + 4 * 380 * u * (1 - u); },
        () => { e.x = x; e.floor = 0; e.air = 0; e.spot = 'slamSpot'; marker.life = 0; e.play('slam'); this.stepBusy = false; });
    });
  }

  onBoss(name, ...a) {
    const e = this.e;
    switch (name) {
      case 'say': this.say(a[0], a[1]); break;
      case 'taunt': this.taunt(a[0]); break;
      case 'warn': this.warn(); break;
      case 'vulnerable': e.vulnT = a[0]; this.events.emit('bossvuln', a[0]); break;
      case 'rumble': this.cameras.main.shake(500, 0.004); break;
      case 'throwFish': this.throwFish(); break;
      case 'swing': this.swingWave(); break;
      case 'salmonStuck': this.salmonStuck(); break;
      case 'salmonFree': this.salmonFree(); break;
      case 'spoonVolley': this.spoonVolley(); break;
      case 'spoonRain': this.spoonRain(); break;
      case 'spoonBounce': this.spoonBounce(); break;
      case 'hornGlow': this.hornGlow = true; this.say('NOW YOU’VE DONE IT.', 1.4); break;
      case 'stampede': this.stampede(); break;
      case 'dizzy': this.dizzyT = a[0]; break;
      case 'moveDone':
        if (a[0] === 'entrance') { this.mode = 'running'; this.events.emit('fightStart'); }
        if (a[0] === 'slam' && this.mode === 'running') e.play('tug');
        break;
    }
  }

  // ---------- her attacks (aimed at the gremlin, always telegraphed) ----------
  throwFish() {
    const h = this.e.handPoint(), g = this.g;
    this.fishN = (this.fishN || 0) + 1;
    const low = this.fishN % 2 === 1;
    const img = this.add.image(h[0], h[1], pick(['o_fish1', 'o_fish2', 'o_fish3'])).setDepth(11).setScale(1.0).setFlipX(this.edir < 0);
    if (low) {   // flops along the ground towards you: JUMP it
      this.shots.push({ k: 'fishLow', img, x: h[0], y: h[1], vx: this.edir * T2.fishLowSpeed * 0.6, dir: this.edir, vy: -250, r: 36, bounces: 0 });
    } else {     // flies straight at head height: SLIDE under it
      const tx = g.x, ty = this.gFloorY() - 215, dx = tx - h[0], dy = ty - h[1], d = Math.hypot(dx, dy) || 1, sp = T2.fishHighSpeed;
      this.shots.push({ k: 'fishHigh', img, x: h[0], y: h[1], vx: dx / d * sp, vy: dy / d * sp, r: 34 });
    }
  }
  swingWave() {   // the salmon slap sends a wave of rotten slime along the ground: jump it
    const e = this.e;
    this.waves.push({ x: e.x + 160 * this.edir, dir: this.edir, life: 1.9, h: 110, kind: 'sludge' });
    this.dustBurst(e.x + 140 * this.edir, GROUND_Y, 14, 0x9fcc1e); this.cameras.main.shake(160, 0.006);
  }
  salmonStuck() {
    const e = this.e, x = e.x + 190 * this.edir;
    const img = this.add.image(x, GROUND_Y + 30, 'o_salmon').setOrigin(0.07, 0.55).setScale(1.15 * e.k / 0.8).setRotation(this.edir < 0 ? -1.15 : -2.0).setDepth(9).setFlipY(this.edir > 0);
    this.stuck = { img, x }; this.dustBurst(x, GROUND_Y, 22, 0x8a6a8a); this.cameras.main.shake(260, 0.012);
    // the impact also hurts if you're standing right there
    const hb = this.g.hitbox(); if (hb && Math.abs(this.g.x - x) < 150 && hb.bottom > GROUND_Y - 20) this.takeHit('slam');
  }
  salmonFree() {
    if (this.stuck) { this.stuck.img.destroy(); this.dustBurst(this.stuck.x, GROUND_Y, 12, 0x8a6a8a); this.stuck = null; }
    this.queue.unshift({ hop: 'far' });
  }
  spoonVolley() {   // three spoons at different heights; a sparkling line shows each one's path first
    const e = this.e, dir = this.edir, x0 = e.x + 120 * dir;
    const lanes = pick([['low', 'high', 'low'], ['high', 'low', 'high'], ['low', 'low', 'high']]);
    lanes.forEach((lane, i) => {
      const y = this.gFloorY() - (lane === 'low' ? 70 : 220);
      const wl = { x0, y, dir, t: 0, T: T2.spoonWarn };
      this.after(i * 0.8, () => {
        this.warnLines.push(wl);
        this.after(T2.spoonWarn, () => {
          const img = this.add.image(x0, y, 'spoon').setDepth(11).setScale(1.15).setFlipX(dir > 0);
          this.shots.push({ k: 'spoonH', img, x: x0, y, vx: dir * T2.spoonSpeed, vy: 0, r: 30 });
        });
      });
    });
  }
  spoonRain() {   // spoons fall where the sparkles land on the ground: get out from under them
    const g = this.g, base = clamp(g.x, 200, 1720);
    const offs = pick([[-260, 0, 260], [-130, 130, 390], [-390, -130, 130], [-200, 60, 320]]);
    if (this.phase === 3) offs.push(pick([-480, 480]));
    offs.forEach((o, i) => {
      const x = clamp(base + o, 120, 1800), fl = g.floorAt(x) === g.S.floor * g.k && g.S.floor > 0 ? g.S.floor * g.k : 0;
      this.rains.push({ x, floorY: GROUND_Y - fl, t: -i * 0.12, warn: T2.rainWarn, y: -120, state: 'warn' });
    });
  }
  spoonBounce() {   // a spoon that bounds along the ground towards you: jump it at the bottom or slide under the top of a bounce
    const h = this.e.handPoint();
    const img = this.add.image(h[0], h[1], 'spoon').setDepth(11).setScale(1.1);
    this.shots.push({ k: 'spoonB', img, x: h[0], y: h[1], vx: this.edir * 470, vy: -700, r: 30, bounces: 0 });
  }
  stampede() {   // dust and arrows on her side first, then a line of murderous bunnies hops across the arena
    const fromLeft = this.e.x < W / 2, dir = fromLeft ? 1 : -1, x0 = fromLeft ? -120 : W + 120;
    this.stampedeWarn = { x: fromLeft ? 60 : W - 60, dir, t: 0, T: 1.2 };
    this.after(1.2, () => {
      for (let i = 0; i < T2.bunnyCount; i++) this.after(i * 0.46, () => {
        const body = this.add.image(0, 0, 'c_bunny_body').setScale(2 * 0.45), ears = this.add.image(0, 0, 'c_bunny_ears').setScale(2 * 0.45);
        const c = this.add.container(x0, GROUND_Y, [body, ears]).setDepth(9).setScale(dir > 0 ? -1 : 1, 1);
        const R = this.cache.json.get('creatures').bunny, B = R.body, E = R.ears, k = 0.45;
        body.setOrigin(0, 0).setPosition((B.x - B.px) * k, (B.y - R._feet) * k);
        ears.setOrigin(0, 0).setPosition((E.x - B.px) * k, (E.y - R._feet) * k);
        this.shots.push({ k: 'bunny', img: c, x: x0, y: GROUND_Y, vx: dir * T2.bunnySpeed, t: rnd(0, 0.2), dir });
      });
    });
  }

  // ---------- damage and defeat ----------
  damageEddie(n, heavy = false) {
    if (this.mode !== 'running') return;
    n *= DIFF.k.boss;   // difficulty: magic hits harder on Normal / Easy
    this.hp = Math.max(0, this.hp - n); this.events.emit('bosshp', this.hp / BOSS_TUNING.hp, this.phase);
    this.e.flashT = 0.09;
    if (this.hurtLineT <= 0 && Math.random() < 0.35) { this.say(pick(TAUNTS.hurt), 1.3); this.hurtLineT = 4; }
    if (heavy && !['hop', 'hopSlam', 'takeoff', 'slam', 'tug'].includes(this.e.move) && !this.stepBusy) this.e.play('hitHeavy');
    if (this.hp <= 0) return this.win();
    const ph = this.hp <= BOSS_TUNING.phase3At ? 3 : this.hp <= BOSS_TUNING.phase2At ? 2 : 1;
    if (ph !== this.phase) {
      const skipped = ph - this.phase;
      this.phase = ph; this.queue = []; this.e.timeScale = ph === 3 ? T2.phase3Speed : 1;
      this.say(ph === 2 ? 'Fine. Let’s try CUTLERY.' : 'THAT’S IT. NOBODY TOUCHES THE CROWN.', 1.8);
      for (let i = 0; i < skipped; i++) this.dropPotion();
      this.events.emit('bosshp', this.hp / BOSS_TUNING.hp, this.phase);
    }
  }
  win() {
    // GDD defeat animation: Unicorn Glitter Explosion
    this.mode = 'won'; this.queue = []; this.stepBusy = true; this.bossTime = this.fightT;
    for (const s of this.shots) s.dead = true;
    this.markers = []; this.waves = []; this.warnLines = []; this.rains.forEach(r => r.img?.destroy()); this.rains = []; this.stampedeWarn = null;
    if (this.stuck) { this.stuck.img.destroy(); this.stuck = null; }
    const e = this.e; e.vulnT = 0; e.timeScale = 1; this.dizzyT = 0;
    const land = () => { e.floor = 0; e.air = 0; e.play('defeat'); };
    if (e.floor > 0 || e.air > 0) { e.floor = 0; e.air = 0; this.dustBurst(e.x, GROUND_Y, 14, 0xff9ce8); }
    this.after(0.2, land);
    this.after(0.3, () => this.say(pick(['THIS IS BULLSHIT! I DEMAND A RECOUNT!', 'I’M TELLING THE GENERALS!']), 1.9));
    this.after(2.3, () => { this.hornFlash = 2.6; this.say('I AM THE EVIL OVERLORD! I AM IMMORTAL!', 2.0); });
    this.after(4.4, () => {   // spoons levitate around her
      this.floaters = [];
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; this.floaters.push({ img: this.add.image(e.x, GROUND_Y, 'spoon').setDepth(12).setScale(0.6), a, r: 230 + (i % 2) * 70, t: 0 }); }
      this.say('Uh-oh.', 1.1);
    });
    this.after(5.8, () => this.glitterExplosion());
  }
  glitterExplosion() {
    const e = this.e, cx = e.x, cy = GROUND_Y - 300;
    const flash = this.add.rectangle(W / 2, this.scale.height / 2, W, this.scale.height, 0xffe6fb, 1).setDepth(40);
    this.animate(1.1, u => flash.setAlpha(1 - u), () => flash.destroy());
    this.cameras.main.shake(500, 0.02);
    (this.floaters || []).forEach(f => f.img.destroy()); this.floaters = [];
    this.confetti = [];
    for (let i = 0; i < 140; i++) { const a = rnd(0, Math.PI * 2), sp = rnd(300, 1300); this.confetti.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 400, life: rnd(1.6, 3.2), c: pick(CONFETTI), s: rnd(6, 14), rot: rnd(0, 6), vr: rnd(-12, 12) }); }
    for (let i = 0; i < 12; i++) {   // flying spoons and rotten fish
      const img = this.add.image(cx, cy, i % 3 ? 'spoon' : pick(['o_fish1', 'o_fish2', 'o_fish3'])).setDepth(13).setScale(0.6);
      const a = rnd(-Math.PI, 0); this.confetti.push({ img, x: cx, y: cy, vx: Math.cos(a) * rnd(500, 1100), vy: Math.sin(a) * rnd(600, 1200), life: 3, vr: rnd(-10, 10), rot: 0 });
    }
    // when the glitter clears: upside down in a flowerbed, legs in the air
    e.stop(); e.play('upended'); this.flowerbed = { x: e.x };
    const mg = this.make.graphics({ add: false }); mg.fillStyle(0xffffff).fillRect(0, 0, W, GROUND_Y + 2);
    e.root.setMask(mg.createGeometryMask());   // head buried in the flowerbed
    this.after(1.6, () => this.loserBunny());
  }
  loserBunny() {
    const e = this.e, fromLeft = this.g.x < e.x ? false : true, dir = fromLeft ? 1 : -1;
    const R = this.cache.json.get('creatures').bunny, B = R.body, E = R.ears, k = 0.26;
    const body = this.add.image((B.x - B.px) * k, (B.y - R._feet) * k, 'c_bunny_body').setOrigin(0, 0).setScale(2 * k);
    const ears = this.add.image((E.x - B.px) * k, (E.y - R._feet) * k, 'c_bunny_ears').setOrigin(0, 0).setScale(2 * k);
    const flag = this.add.image(-30, -60, 'loserFlag').setOrigin(0.1, 1).setScale(0.55).setRotation(-0.3);
    const bun = this.add.container(fromLeft ? -100 : W + 100, GROUND_Y, [flag, body, ears]).setDepth(10).setScale(dir > 0 ? -1 : 1, 1);
    const stopX = e.x - dir * 170;
    let hopT = 0;
    this.animate(1.6, u => { hopT += 0.016; bun.x = (fromLeft ? -100 : W + 100) + (stopX - (fromLeft ? -100 : W + 100)) * u; bun.y = GROUND_Y - 50 * Math.abs(Math.sin(u * Math.PI * 6)); }, () => {
      bun.y = GROUND_Y;
      // plants the flag on her upturned backside
      const hip = this.e.local(this.e.inner, 0, 0);
      flag.setVisible(false);
      const planted = this.add.image(hip[0] + 10 * dir, hip[1] - 40, 'loserFlag').setOrigin(0.1, 1).setScale(0.8).setDepth(10);
      this.animate(0.25, u => planted.setScale(0.8, 0.8 * u));
      this.cameras.main.shake(100, 0.003);
      this.after(0.8, () => this.animate(1.2, u => { bun.x = stopX - dir * 900 * u; bun.y = GROUND_Y - 50 * Math.abs(Math.sin(u * Math.PI * 5)); }));
      this.after(1.0, () => this.say('*muffled* FUCK OFF.', 2.0));
      this.after(3.2, () => { this.g.win(); this.after(1.2, () => this.events.emit('finished', this.finalScore())); });
    });
  }

  // ---------- main loop ----------
  update(time, deltaMs) {
    const dt = Math.min(0.05, deltaMs / 1000) * this.timeScale * DIFF.k.speed;   // difficulty: slower = more time to react
    if (this.mode === 'running') this.fightT += dt;
    this.hurtLineT -= dt; this.dizzyT = Math.max(0, this.dizzyT - dt);
    this.g.faceTarget = this.e.x;
    this.tick(dt);
    this.g.update(dt);
    this.e.update(dt);
    this.nextStep();
    this.updateShots(dt);
    this.updateOrbs(dt);
    this.updateGround(dt);
    this.updateMeadow(dt);
    this.updatePickups(dt);
    if (this.mode === 'running') this.collide(dt);
    const b = this.bubble;
    if (b.visible) { b.life -= dt; const h = this.e.headTop(); b.setPosition(clamp(h[0] - 40, 340, W - 340), clamp(h[1] - 30, 200 + b.hh, GROUND_Y - 260)); b.setAlpha(Math.min(1, b.life * 4)); if (b.life <= 0) b.setVisible(false); }
    this.drawBoxes();
  }
  updateShots(dt) {
    for (const s of this.shots) {
      if (s.k === 'fishLow') {
        s.vy += 2600 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.y > GROUND_Y - s.r && s.vy > 0) { s.y = GROUND_Y - s.r; s.vy = s.bounces < 3 ? -260 : 0; s.vx = s.dir * T2.fishLowSpeed; s.bounces++; }
        s.img.rotation = 0.4 * Math.sin(this.time.now / 60);   // flopping
      } else if (s.k === 'fishHigh') { s.x += s.vx * dt; s.y += s.vy * dt; s.img.rotation += dt * 4; }
      else if (s.k === 'spoonH') { s.x += s.vx * dt; s.img.rotation = 0.15 * Math.sin(this.time.now / 40); }
      else if (s.k === 'spoonB') {
        s.vy += 2600 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.img.rotation += dt * 9 * Math.sign(s.vx);
        if (s.y > GROUND_Y - s.r && s.vy > 0) { s.y = GROUND_Y - s.r; s.vy = s.bounces < 4 ? -820 : 0; s.bounces++; this.sparkBurst(s.x, GROUND_Y, 8); }
      } else if (s.k === 'bunny') {
        s.t += dt; const u = (s.t % 0.42) / 0.42; s.x += s.vx * dt; s.y = GROUND_Y - 110 * 4 * u * (1 - u);
        s.img.setRotation((s.dir > 0 ? 1 : -1) * (-0.25 + 0.5 * u));
      }
    }
    for (const s of this.shots) if (s.x > W + 200 || s.x < -200) s.dead = true;
    super.updateShots(dt);
  }
  updateMeadow(dt) {
    const S = this.sparkG; S.clear(); const now = this.time.now / 1000;
    // sparkling path warnings for spoon volleys
    for (const w of this.warnLines) {
      w.t += dt; const k = Math.min(1, w.t / w.T), x1 = w.dir < 0 ? -40 : W + 40;
      for (let x = w.x0; w.dir < 0 ? x > x1 : x < x1; x += 52 * w.dir) S.fillStyle(0xff9ce8, (0.3 + 0.6 * k) * (0.5 + 0.5 * Math.sin(now * 22 + x * 0.04))).fillCircle(x, w.y, 4 + 4 * k);
    }
    this.warnLines = this.warnLines.filter(w => w.t < w.T);
    // falling spoons: a sparkle ring on the ground, then the spoon drops and sticks for a moment
    for (const r of this.rains) {
      r.t += dt;
      if (r.t < 0) continue;
      if (r.state === 'warn') {
        const k = Math.min(1, r.t / r.warn), p = 0.5 + 0.5 * Math.sin(now * 18);
        this.fxG.lineStyle(5, 0xff7ae0, 0.5 + 0.5 * p).strokeEllipse(r.x, r.floorY + 3, 150, 26).fillStyle(0xff7ae0, 0.15 + 0.2 * k).fillEllipse(r.x, r.floorY + 3, 150, 26);
        for (let i = 0; i < 4; i++) S.fillStyle(0xffffff, 0.6 * k).fillCircle(r.x + Math.cos(now * 6 + i * 1.6) * 60, r.floorY - 10 - 50 * ((now * 1.5 + i * 0.25) % 1), 4);
        if (r.t >= r.warn) { r.state = 'fall'; r.img = this.add.image(r.x, -100, 'spoon').setDepth(11).setScale(1.15).setRotation(Math.PI / 2); }
      } else if (r.state === 'fall') {
        r.y += 2600 * dt; r.img.setPosition(r.x, Math.min(r.y, r.floorY - 70));
        if (r.y >= r.floorY - 70) { r.state = 'stuck'; r.st = 0; this.sparkBurst(r.x, r.floorY, 10); r.hit = true; }
      } else if (r.state === 'stuck') { r.st += dt; r.img.setAlpha(1 - Math.max(0, r.st - 0.5) / 0.3); if (r.st > 0.8) { r.img.destroy(); r.dead = true; } }
    }
    this.rains = this.rains.filter(r => !r.dead);
    // stampede warning: dust and arrows at the edge the bunnies will come from
    if (this.stampedeWarn) {
      const w = this.stampedeWarn; w.t += dt;
      if (Math.random() < 0.7) this.dustBurst(w.x, GROUND_Y, 2, 0xd8c8b8);
      const a = 0.5 + 0.5 * Math.sin(now * 16);
      for (let i = 0; i < 3; i++) { const x = w.x + w.dir * (60 + i * 70); S.fillStyle(0xff5a3a, a).fillTriangle(x, GROUND_Y - 160, x - w.dir * 40, GROUND_Y - 190, x - w.dir * 40, GROUND_Y - 130); }
      if (w.t > w.T) this.stampedeWarn = null;
    }
    // her horn: glowing purple in phase 3; flashing pink/purple in defeat
    if (this.hornGlow || this.hornFlash > 0) {
      const hp = this.e.hornPoint(), p = 0.5 + 0.5 * Math.sin(now * (this.hornFlash > 0 ? 30 : 6));
      this.hornFlash = Math.max(0, (this.hornFlash || 0) - dt);
      const col = this.hornFlash > 0 ? (Math.sin(now * 30) > 0 ? 0xff4fd8 : 0x9b4dff) : 0x9b4dff;
      S.fillStyle(col, 0.35 + 0.3 * p).fillCircle(hp[0], hp[1], 46 + 14 * p).fillStyle(0xffffff, 0.5 * p).fillCircle(hp[0], hp[1], 14);
    }
    // dizzy stars
    if (this.dizzyT > 0) { const h = this.e.headTop(); for (let i = 0; i < 5; i++) { const a = now * 4 + i * 1.256; this.drawStar(S, h[0] + Math.cos(a) * 110, h[1] + 30 + Math.sin(a) * 28, 14, 0xffd23a); } }
    // levitating spoons (defeat)
    for (const f of (this.floaters || [])) { f.t += dt; f.a += dt * 2.4; f.img.setPosition(this.e.x + Math.cos(f.a) * f.r, GROUND_Y - 330 + Math.sin(f.a) * f.r * 0.5 - 40 * Math.min(1, f.t)).setRotation(f.a + Math.sin(f.t * 30) * 0.2); }
    // confetti
    if (this.confetti) {
      for (const c of this.confetti) {
        c.life -= dt; c.vy += 900 * dt; c.vx *= 0.99; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt;
        if (c.img) { c.img.setPosition(c.x, c.y).setRotation(c.rot); if (c.life <= 0 || c.y > GROUND_Y + 300) { c.img.destroy(); c.life = 0; } }
        else if (c.life > 0) { const w = c.s * Math.abs(Math.cos(c.rot)); S.fillStyle(c.c, Math.min(1, c.life)).fillRect(c.x - w / 2, c.y - c.s / 3, w + 1, c.s * 0.66); }
      }
      this.confetti = this.confetti.filter(c => c.life > 0);
    }
    // the flowerbed she ends up in (drawn in front of her)
    if (this.flowerbed) {
      const F = this.fxTop, x = this.flowerbed.x;
      F.fillStyle(0x4f8a2a, 1).fillEllipse(x, GROUND_Y + 4, 520, 90).fillStyle(0x6fae36, 1).fillEllipse(x, GROUND_Y - 6, 470, 64);
      for (let i = 0; i < 26; i++) {
        const fx = x - 230 + (i * 89) % 460, fy = GROUND_Y - 12 - ((i * 37) % 40), col = [0xff7ab8, 0xffffff, 0xffd23a, 0xc78bff][i % 4];
        for (let p = 0; p < 5; p++) { const a = p / 5 * Math.PI * 2 + i; F.fillStyle(col, 1).fillCircle(fx + Math.cos(a) * 9, fy + Math.sin(a) * 9, 7); }
        F.fillStyle(0xffb020, 1).fillCircle(fx, fy, 5);
      }
    }
  }
  drawStar(G, x, y, r, col) {
    const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr)); }
    G.fillStyle(col, 1).fillPoints(pts, true);
  }
  sparkBurst(x, y, n) { for (let i = 0; i < n; i++) this.chips.push({ x, y, vx: rnd(-300, 300), vy: rnd(-500, -100), life: rnd(0.3, 0.6), sz: rnd(3, 7), col: pick([0xff9ce8, 0xffffff, 0xc78bff]), spark: true }); }

  collide(dt) {
    const g = this.g, hb = g.hitbox(); if (!hb) return;
    for (const s of this.shots) if (s.k === 'bunny' && !s.dead && Phaser.Geom.Intersects.RectangleToRectangle(hb, new Phaser.Geom.Rectangle(s.x - 60, s.y - 95, 120, 90))) this.takeHit('bunny');
    for (const r of this.rains) if (r.state === 'fall' && r.y > r.floorY - 260 && Math.abs(g.x - r.x) < 70 && hb.bottom > r.floorY - 300) this.takeHit('spoon');
    // while she's vulnerable (yanking her salmon, admiring herself, dizzy) touching her doesn't hurt: get in close and blast her
    const v = this.e.vulnT > 0;
    if (v) { this._eh = this.e.hurtbox; this.e.hurtbox = () => null; }
    super.collide(dt);
    if (v) { this.e.hurtbox = this._eh; delete this._eh; }
  }
}
