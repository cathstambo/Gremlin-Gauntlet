// World 5 creatures: the Dungeon of Questionable Pleasures (Cath's enemy sheet + readme; roles agreed 16 Oct 2026).
//   Skeleton maids = the Boner Brigade (charge, throw bones; jump or blast; collapse into a bone pile, the skull talks back).
//   Undead hounds = fast runners (jump or blast). Winged gargoyles = the Restless Spirits (swoop overhead; slide or blast,
//   they drop a customer-complaint form). Armoured knights = the Dungeon Disciplinarians (magic bounces off; their whip swings
//   at head height: slide under). Chest mimics (sit on the path, lash their tongue along the floor: jump; 2 blasts).
//   Possessed paddles (fly at head height: slide, or bounce along the floor: jump; 1 blast).
// Same interface as the other creatures: update(dt, ctx), hitbox(), shot(), centre, points; noShoot / shootbox() / immune.
import { Creature } from './Creatures.js?v=20261016162515';
import { Sprite } from './Wild.js?v=20261016162515';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = k => (k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k));
const D = Math.PI / 180;
const pick = a => a[Math.floor(Math.random() * a.length)];

/** A short floating caption (talking skulls, the knight's gag). */
export function quip(scene, x, y, text, col = '#ffd6f5') {
  const t = scene.add.text(x, y, text, { fontFamily: 'Lilita One, Trebuchet MS, sans-serif', fontSize: 34, color: col, stroke: '#1a0a1e', strokeThickness: 7 }).setOrigin(0.5).setDepth(20);
  scene.tweens.add({ targets: t, y: y - 70, alpha: { from: 1, to: 0 }, delay: 700, duration: 700, onComplete: () => t.destroy() });
  return t;
}
/** Swap a Sprite's picture. */
const tex = (p, key) => { if (p.img.texture.key !== key) p.img.setTexture(key); };

// ---------------- Skeleton maid (Boner Brigade): marches at you, stops, and lobs a bone that bounces along the floor.
// Jump her (and the bone) or blast her. Small enemy, 50. ----------------
export class Maid extends Creature {
  constructor(scene, x, groundY, lane) {
    super(scene, x, 'maid');
    this.groundY = groundY; this.p = new Sprite(scene, 'd_maid1', 1.3); this.p.img.setFlipX(false);   // drawn facing the viewer / left
    this.points = 50; this.shadowW = 150; this.st = 'walk'; this.stT = 0; this.y = 0; this.threw = lane === 'nothrow';
  }
  update(dt, ctx) {
    this.common(dt); this.x -= ctx.scroll;
    let rot = 0, key = 'd_maid1';
    if (this.dead) {
      key = 'd_maid_dead'; if (!this.said) { this.said = true; quip(this.scene, this.x, this.groundY - 160, pick(['RUDE.', 'I JUST DUSTED!', 'WORTH IT.', 'MY SPINE!'])); }
      this.p.root.alpha = clamp(2.5 - this.deadT * 1.5, 0, 1); if (this.deadT > 1.6) this.gone = true;
    } else {
      this.stT += dt;
      const gap = this.x - ctx.gx;
      if (this.st === 'walk') {
        this.x -= 240 * dt; key = (this.t * 4) % 2 < 1 ? 'd_maid2' : 'd_maid3'; this.y = 6 * Math.abs(Math.sin(this.t * 8));
        if (!this.threw && gap < 1050 && gap > 300) { this.st = 'wind'; this.stT = 0; }
      } else if (this.st === 'wind') {   // the warning: winds back, feather duster up
        key = 'd_maid_throw'; this.y = 0; rot = -4;
        if (this.stT > 0.5) { this.st = 'throw'; this.stT = 0; this.threw = true; this.scene.creatures.push(new Bone(this.scene, this.x - 40, this.groundY)); }
      } else if (this.st === 'throw') { key = 'd_maid_throw2'; if (this.stT > 0.4) { this.st = 'walk'; this.stT = 0; } }
      else if (this.st === 'recoil') { key = 'd_maid1'; rot = 10 * Math.sin(this.stT * 30); if (this.stT > 0.3) { this.st = 'walk'; this.stT = 0; } }
    }
    tex(this.p, key);
    this.p.root.setPosition(this.x, this.groundY + 6 - this.y).setRotation(rot * D);
    if (this.x < -400) this.gone = true;
  }
  get warning() { return this.st === 'wind'; }
  onHurt() { this.st = 'recoil'; this.stT = 0; }
  hitbox() { if (this.dead) return null; return new Phaser.Geom.Rectangle(this.x - 65, this.groundY - 245, 130, 240); }
  get centre() { return [this.x, this.groundY - 110]; }
  destroy() { this.p.destroy(); }
}

/** A bone thrown by a skeleton maid: arcs out, then bounces along the floor at you. Jump it (or blast it). */
export class Bone extends Creature {
  constructor(scene, x, groundY) {
    super(scene, x, 'bone');
    this.groundY = groundY; this.points = 0; this.shadowW = 70;
    this.g = scene.add.graphics().setDepth(7);
    this.p = { root: this.g, flash() {}, destroy: () => this.g.destroy() };
    this.y = groundY - 170; this.vx = -420; this.vy = -600; this.bounces = 0;
  }
  update(dt, ctx) {
    this.common(dt); this.x -= ctx.scroll;
    if (this.dead) { this.g.alpha = clamp(1 - this.deadT * 4, 0, 1); if (this.deadT > 0.3) this.gone = true; }
    else {
      this.vy += 2600 * dt; this.x += this.vx * dt; this.y += this.vy * dt;
      const floor = this.groundY - 22;
      if (this.y > floor && this.vy > 0) { this.y = floor; this.vy = this.bounces < 6 ? -480 : 0; this.vx = -330; this.bounces++; }
    }
    const G = this.g; G.clear(); G.setPosition(this.x, this.y).setRotation(this.t * -9);
    G.lineStyle(5, 0x2a1a0a, 1).fillStyle(0xefe2c0, 1);
    for (const s of [-1, 1]) { G.fillCircle(s * 34, -9, 11).strokeCircle(s * 34, -9, 11).fillCircle(s * 34, 9, 11).strokeCircle(s * 34, 9, 11); }
    G.fillRect(-34, -7, 68, 14).lineBetween(-32, -7, 32, -7).lineBetween(-32, 7, 32, 7);
    if (this.x < -300) this.gone = true;
  }
  hitbox() { if (this.dead) return null; return new Phaser.Geom.Rectangle(this.x - 46, this.y - 26, 92, 50); }
  get air() { return this.groundY - 22 - this.y; }
  get centre() { return [this.x, this.y]; }
  destroy() { this.g.destroy(); }
}

// ---------------- Undead hound: bounds in fast and low, crouches (the warning), then leaps. Jump it or blast it. 50. ----------------
export class Hound extends Creature {
  constructor(scene, x, groundY) {
    super(scene, x, 'hound');
    this.groundY = groundY; this.p = new Sprite(scene, 'd_hound1', 1.15); this.p.img.setFlipX(true);   // drawn facing right
    this.points = 50; this.shadowW = 210; this.st = 'run'; this.stT = 0; this.y = 0;
  }
  update(dt, ctx) {
    this.common(dt); this.x -= ctx.scroll;
    let rot = 0, key = 'd_hound1';
    if (this.dead) { key = 'd_hound_dead'; this.p.root.alpha = clamp(2.5 - this.deadT * 1.5, 0, 1); if (this.deadT > 1.6) this.gone = true; }
    else {
      this.stT += dt;
      const gap = this.x - ctx.gx;
      if (this.st === 'run') {
        this.x -= 420 * dt; key = (this.t * 7) % 2 < 1 ? 'd_hound1' : 'd_hound2'; this.y = 14 * Math.abs(Math.sin(this.t * 11));
        if (gap < 560 && gap > 0) { this.st = 'crouch'; this.stT = 0; }
      } else if (this.st === 'crouch') { key = 'd_hound_crouch'; this.y = 0; this.x -= 100 * dt; if (this.stT > 0.32) { this.st = 'leap'; this.stT = 0; this.vy = 820; } }
      else if (this.st === 'leap') {
        key = 'd_hound_leap'; this.vy -= 2600 * dt; this.y = Math.max(0, this.y + this.vy * dt); this.x -= 700 * dt; rot = -6 + 12 * clamp(1 - this.vy / 820, 0, 1);
        if (this.y <= 0 && this.vy < 0) { this.st = 'run2'; this.stT = 0; }
      } else if (this.st === 'run2') { this.x -= 420 * dt; key = (this.t * 7) % 2 < 1 ? 'd_hound1' : 'd_hound2'; }
      else if (this.st === 'recoil') { rot = 12 * Math.sin(this.stT * 30); if (this.stT > 0.3) { this.st = 'run'; this.stT = 0; } }
    }
    tex(this.p, key);
    this.p.root.setPosition(this.x, this.groundY + 8 - this.y).setRotation(rot * D);
    if (this.x < -500) this.gone = true;
  }
  get warning() { return this.st === 'crouch'; }
  onHurt() { this.st = 'recoil'; this.stT = 0; }
  hitbox() { if (this.dead) return null; return new Phaser.Geom.Rectangle(this.x - 105, this.groundY - this.y - 135, 210, 125); }
  get centre() { return [this.x, this.groundY - this.y - 80]; }
  destroy() { this.p.destroy(); }
}

// ---------------- Winged gargoyle (Restless Spirit): comes in high, then swoops into the lane at head height. Slide or blast. 50.
// Blasted, it drops a customer-complaint form. ----------------
export class Gargoyle extends Creature {
  constructor(scene, x, groundY) {
    super(scene, x, 'garg');
    this.groundY = groundY; this.p = new Sprite(scene, 'd_garg1', 1.05, 7); this.p.img.setOrigin(0.5, 0.5);
    this.points = 50; this.y = groundY - 620; this.laneY = groundY - 225;
  }
  update(dt, ctx) {
    this.common(dt); this.x -= ctx.scroll;
    let rot = 0, key = (this.t * 6) % 2 < 1 ? 'd_garg1' : 'd_garg2';
    if (this.dead) {
      key = 'd_garg_dead'; this.vy = (this.vy || 0) + 1800 * dt; this.y += this.vy * dt; this.p.root.alpha = clamp(1.6 - this.deadT, 0, 1);
      if (!this.form) { this.form = true; const f = this.scene.add.text(this.x, this.y, 'COMPLAINT\nFORM', { fontFamily: 'Atkinson Hyperlegible, sans-serif', fontStyle: 'bold', fontSize: 16, color: '#3a2a10', backgroundColor: '#f4ecd2', align: 'center', padding: { x: 8, y: 6 } }).setOrigin(0.5).setDepth(9);
        this.scene.tweens.add({ targets: f, y: this.groundY - 20, angle: 340, x: f.x - 140, duration: 1400, onComplete: () => this.scene.tweens.add({ targets: f, alpha: 0, duration: 600, onComplete: () => f.destroy() }) }); }
      if (this.deadT > 1.6) this.gone = true;
    } else {
      this.x -= 330 * dt;
      const gap = this.x - ctx.gx, k = clamp(1 - (gap - 230) / 950, 0, 1);
      const target = (this.groundY - 620) + (this.laneY - (this.groundY - 620)) * ease(k);
      this.y += (target - this.y) * Math.min(1, dt * 6);
      if (k > 0.5) key = 'd_garg_swoop';
      if (this.recoilT > 0) { this.recoilT -= dt; rot = 20 * Math.sin(this.recoilT * 40); }
    }
    tex(this.p, key); this.p.img.setFlipX(false);
    this.p.root.setPosition(this.x, this.y).setRotation(rot * D);
    if (this.x < -400) this.gone = true;
  }
  onHurt() { this.recoilT = 0.25; }
  hitbox() { if (this.dead) return null; return new Phaser.Geom.Rectangle(this.x - 80, this.y - 45, 160, 105); }
  get centre() { return [this.x, this.y + 10]; }
  destroy() { this.p.destroy(); }
}

// ---------------- Armoured knight (Dungeon Disciplinarian): magic bounces off. He plods towards you, winds up his whip
// (the warning: a red line shows the swing at head height), then cracks it: SLIDE under it. His body is tall: sliding past his
// legs is safe, standing isn't. If he catches you: "BAD GREMLIN!". ----------------
export class Knight extends Creature {
  constructor(scene, x, groundY) {
    super(scene, x, 'knight');
    this.groundY = groundY; this.p = new Sprite(scene, 'd_knight1', 1.45); this.p.img.setFlipX(false);
    this.points = 0; this.immune = true; this.shadowW = 230; this.st = 'walk'; this.stT = 0;
    this.g = scene.add.graphics().setDepth(9);
  }
  shot() { this.flashT = 0.06; quip(this.scene, this.x, this.groundY - 330, '*PING*', '#c8d0ff'); return false; }   // magic bounces off
  update(dt, ctx) {
    this.common(dt); this.x -= ctx.scroll;
    let key = 'd_knight1', bob = 0;
    this.stT += dt; const gap = this.x - ctx.gx;
    const G = this.g; G.clear();
    if (this.dead) {   // only Gremlin Meltdown can do this
      this.p.root.alpha = clamp(1 - this.deadT * 1.5, 0, 1); this.p.root.y += 60 * dt; if (this.deadT > 0.8) this.gone = true; return;
    }
    if (this.st === 'walk') { this.x -= 90 * dt; bob = 4 * Math.abs(Math.sin(this.t * 6)); if (gap < 760 && gap > 0) { this.st = 'wind'; this.stT = 0; } }
    else if (this.st === 'wind') {   // the warning: whip drawn back, a red band shows where it will crack (head height)
      key = 'd_knight_wind'; const p = 0.5 + 0.5 * Math.sin(this.t * 20);
      G.fillStyle(0xff3a2a, 0.15 + 0.2 * p).fillRect(this.x - 620, this.groundY - 330, 600, 170).lineStyle(4, 0xff3a2a, 0.6 + 0.4 * p).strokeRect(this.x - 620, this.groundY - 330, 600, 170);
      if (this.stT > 0.7) { this.st = 'crack'; this.stT = 0; this.scene.cameras.main.shake(90, 0.004); }
    } else if (this.st === 'crack') {
      key = 'd_knight_swing';
      const u = this.stT / 0.5; G.lineStyle(10, 0x6a2a6a, 1 - u).lineBetween(this.x - 40, this.groundY - 250, this.x - 600 * Math.min(1, u * 3), this.groundY - 240 + 30 * Math.sin(u * 20));
      if (this.stT > 0.5) { this.st = 'rest'; this.stT = 0; }
    } else if (this.st === 'rest') { key = 'd_knight1'; if (this.stT > 1.2 && gap > 400) { this.st = 'wind'; this.stT = 0; } }
    tex(this.p, key);
    this.p.root.setPosition(this.x, this.groundY + 8 - bob);
    if (this.x < -500) this.gone = true;
  }
  get warning() { return this.st === 'wind'; }
  /** The whip crack (head height, out in front) and his upper body. His legs are clear for a slide. */
  hitbox() {
    if (this.dead) return null;
    if (this.st === 'crack' && this.stT < 0.35) return new Phaser.Geom.Rectangle(this.x - 600, this.groundY - 320, 600, 150);
    return new Phaser.Geom.Rectangle(this.x - 80, this.groundY - 280, 160, 165);
  }
  onHitGremlin() { if (this.scene.time.now - (this.lastQuip || -9e9) < 1500) return; this.lastQuip = this.scene.time.now; quip(this.scene, this.x, this.groundY - 330, 'BAD GREMLIN!', '#ff8ad8'); }
  get centre() { return [this.x, this.groundY - 160]; }
  destroy() { this.p.destroy(); this.g.destroy(); }
}

// ---------------- Chest mimic: a treasure chest on the path. As you come close it creaks open (the warning), then lashes its
// tongue out along the floor: JUMP the tongue. Blast it twice. Strong enemy, 150. ----------------
export class Mimic extends Creature {
  constructor(scene, x, groundY) {
    super(scene, x, 'mimic');
    this.groundY = groundY; this.p = new Sprite(scene, 'd_mimic_shut', 1.2); this.p.img.setFlipX(false);
    this.hp = 2; this.points = 150; this.shadowW = 230; this.st = 'shut'; this.stT = 0; this.lash = 0;
  }
  update(dt, ctx) {
    this.common(dt); this.x -= ctx.scroll;
    let key = 'd_mimic_shut', rot = 0; this.lash = 0;
    if (this.dead) { key = 'd_mimic_dead'; this.p.root.alpha = clamp(2.5 - this.deadT * 1.5, 0, 1); if (this.deadT > 1.6) this.gone = true; }
    else {
      this.stT += dt; const gap = this.x - ctx.gx;
      if (this.st === 'shut') { rot = 1.5 * Math.sin(this.t * 3); if (gap < 700 && gap > 0) { this.st = 'creak'; this.stT = 0; } }
      else if (this.st === 'creak') { key = this.stT % 0.2 < 0.1 ? 'd_mimic_open' : 'd_mimic_shut'; rot = 3 * Math.sin(this.stT * 40); if (this.stT > 0.55) { this.st = 'lash'; this.stT = 0; } }
      else if (this.st === 'lash') { key = 'd_mimic_lash'; this.lash = Math.min(1, this.stT / 0.12) * (this.stT < 0.6 ? 1 : Math.max(0, 1 - (this.stT - 0.6) / 0.2)); if (this.stT > 0.8) { this.st = 'open'; this.stT = 0; } }
      else if (this.st === 'open') { key = 'd_mimic_tongue'; if (this.stT > 1.0 && gap > 250) { this.st = 'creak'; this.stT = 0; } }
      else if (this.st === 'recoil') { key = 'd_mimic_open'; rot = 8 * Math.sin(this.stT * 30); if (this.stT > 0.35) { this.st = 'open'; this.stT = 0; } }
    }
    tex(this.p, key); this.p.img.setFlipX(true);   // mouth faces left, at the gremlin
    this.p.root.setPosition(this.x, this.groundY + 10).setRotation(rot * D);
    if (this.x < -500) this.gone = true;
  }
  get warning() { return this.st === 'creak'; }
  onHurt() { this.st = 'recoil'; this.stT = 0; }
  hitbox() {
    if (this.dead) return null;
    if (this.lash > 0.3) return new Phaser.Geom.Rectangle(this.x - 100 - 330 * this.lash, this.groundY - 70, 330 * this.lash + 200, 65);   // the tongue, low along the floor
    return new Phaser.Geom.Rectangle(this.x - 100, this.groundY - 140, 200, 135);
  }
  shootbox() { return this.dead ? null : new Phaser.Geom.Rectangle(this.x - 100, this.groundY - 150, 200, 145); }
  get centre() { return [this.x, this.groundY - 80]; }
  destroy() { this.p.destroy(); }
}

// ---------------- Possessed paddle: an enchanted paddle with a rude inscription. lane 'fly' = sails in at head height (slide);
// 'bounce' = bounds along the floor (jump). Blast it once. 50. ----------------
const INSCRIPTIONS = ['BEHAVE', 'TRY AGAIN', 'NICE TRY, BITCH'];
let inscription = 0;
export class Paddle extends Creature {
  constructor(scene, x, groundY, lane = 'fly') {
    super(scene, x, 'paddle');
    this.groundY = groundY; this.lane = lane; this.points = 50; this.shadowW = lane === 'bounce' ? 110 : 0;
    const c = scene.add.container(x, 0).setDepth(7);
    const glow = scene.add.image(0, 0, 'd_paddle').setScale(2.3).setTintFill(0xd04dff).setAlpha(0.55);
    const img = scene.add.image(0, 0, 'd_paddle').setScale(2.1);
    const word = INSCRIPTIONS[inscription++ % INSCRIPTIONS.length];
    const txt = scene.add.text(0, 60, word, { fontFamily: 'Lilita One, Trebuchet MS, sans-serif', fontSize: 30, color: '#ffc4f5', stroke: '#1a0a1e', strokeThickness: 5 }).setOrigin(0.5).setRotation(-Math.PI / 2);
    c.add([glow, img, txt]);
    this.p = { root: c, img, k: 1, flash: on => (on ? img.setTintFill(0xffffff) : img.clearTint()), destroy: () => c.destroy() };
    this.y = lane === 'bounce' ? groundY - 120 : groundY - 560; this.vy = 0;
  }
  update(dt, ctx) {
    this.common(dt); this.x -= ctx.scroll;
    const c = this.p.root;
    if (this.dead) { this.y += 500 * dt; c.alpha = clamp(1 - this.deadT * 2.5, 0, 1); c.rotation += dt * 12; if (this.deadT > 0.5) this.gone = true; }
    else if (this.lane === 'bounce') {   // bounds along the floor, spinning
      this.x -= 300 * dt; this.vy += 2600 * dt; this.y += this.vy * dt;
      if (this.y > this.groundY - 105 && this.vy > 0) { this.y = this.groundY - 105; this.vy = -900; }
      c.rotation = this.t * -6;
    } else {   // sails in high, then drops into the lane at head height, swinging like it's spanking the air
      this.x -= 340 * dt;
      const gap = this.x - ctx.gx, k = clamp(1 - (gap - 230) / 900, 0, 1), target = (this.groundY - 560) + 330 * ease(k);
      this.y += (target - this.y) * Math.min(1, dt * 6);
      c.rotation = Math.PI / 2 + 0.5 * Math.sin(this.t * 9);
    }
    c.setPosition(this.x, this.y);
    if (this.x < -400) this.gone = true;
  }
  get air() { return this.groundY - 105 - this.y; }
  hitbox() {
    if (this.dead) return null;
    if (this.lane === 'bounce') return new Phaser.Geom.Rectangle(this.x - 60, this.y - 60, 120, 120);
    return new Phaser.Geom.Rectangle(this.x - 95, this.y - 45, 190, 90);
  }
  get centre() { return [this.x, this.y]; }
  destroy() { this.p.destroy(); }
}
