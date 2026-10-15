// World 3 wildlife (Into the Wild, Cath-approved): wolf, eagle, fox. Each is one drawing from the art sheet,
// animated by bounding, squashing and tilting (they're fast and on screen only briefly).
// Same interface as the other creatures: update(dt, ctx), hitbox(), shot(), centre, points, warning.
import { Creature } from './Creatures.js?v=20261015131435';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = k => (k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k));
const D = Math.PI / 180;

/** A one-image "puppet" with the same flash/destroy interface as the cut-out puppets. */
class Sprite {
  constructor(scene, key, scale, depth = 6) {
    this.root = scene.add.container(0, 0).setDepth(depth);
    this.img = scene.add.image(0, 0, key).setOrigin(0.5, 1).setScale(scale).setFlipX(true);   // drawn facing right; they run at the gremlin (left)
    this.root.add(this.img); this.images = [this.img]; this.k = scale;
  }
  flash(on) { if (on === this._fl) return; this._fl = on; on ? this.img.setTintFill(0xffffff) : this.img.clearTint(); }
  destroy() { this.root.destroy(); }
}

// ---------------- Grey wolf: lopes towards the gremlin, then leaps. Jump it or blast it (2 hits). ----------------
export class Wolf extends Creature {
  constructor(scene, x, groundY) {
    super(scene, x, 'wolf');
    this.groundY = groundY; this.p = new Sprite(scene, 'w_en_wolf', 0.85);
    this.hp = 2; this.points = 150; this.st = 'run'; this.stT = 0; this.y = 0;
  }
  update(dt, ctx) {
    this.common(dt); this.x -= ctx.scroll;
    let rot = 0, sq = 1;
    if (this.dead) { const u = this.deadT; rot = Math.min(180, u * 600); this.y += (this.vy = (this.vy ?? 600) - 2600 * dt) * dt; if (u > 1.3) this.gone = true; }
    else {
      this.stT += dt;
      const gap = this.x - ctx.gx;
      if (this.st === 'run') {   // galloping bound
        this.x -= 300 * dt; const u = (this.t * 2.6) % 1; this.y = 34 * Math.sin(u * Math.PI); rot = -8 + 16 * u; sq = u < 0.15 ? 0.9 : 1;
        if (gap < 520 && gap > 0) { this.st = 'crouch'; this.stT = 0; }
      } else if (this.st === 'crouch') {   // the warning: drops low, hackles up
        this.y = 0; sq = 0.85; rot = 6; this.x -= 120 * dt;
        if (this.stT > 0.3) { this.st = 'leap'; this.stT = 0; this.vy = 900; }
      } else if (this.st === 'leap') {
        this.vy -= 2600 * dt; this.y = Math.max(0, this.y + this.vy * dt); this.x -= 650 * dt; rot = -10 + 20 * clamp(1 - this.vy / 900, 0, 1);
        if (this.y <= 0 && this.vy < 0) { this.st = 'run'; this.stT = -9; }
      } else if (this.st === 'recoil') { rot = 14 * Math.sin(this.stT * 30); if (this.stT > 0.3) { this.st = 'run'; this.stT = 0; } }
    }
    this.p.root.setPosition(this.x, this.groundY + 8 - this.y).setRotation(rot * D);
    this.p.img.setScale(this.p.k / Math.sqrt(sq), this.p.k * sq);
    if (this.x < -500) this.gone = true;
  }
  get warning() { return this.st === 'crouch'; }
  onHurt() { this.st = 'recoil'; this.stT = 0; }
  hitbox() { if (this.dead) return null; return new Phaser.Geom.Rectangle(this.x - 150, this.groundY - this.y - 150, 270, 140); }
  get centre() { return [this.x, this.groundY - this.y - 90]; }
  destroy() { this.p.destroy(); }
}

// ---------------- Eagle: comes in high, then swoops down into the lane at head height. Slide under it or blast it. ----------------
export class Eagle extends Creature {
  constructor(scene, x, groundY) {
    super(scene, x, 'eagle');
    this.groundY = groundY; this.p = new Sprite(scene, 'w_en_eagle', 0.62, 7);
    this.points = 50; this.y = groundY - 620; this.laneY = groundY - 220;
  }
  update(dt, ctx) {
    this.common(dt); this.x -= ctx.scroll;
    let rot = 0;
    if (this.dead) { this.vy = (this.vy || 0) + 2400 * dt; this.y += this.vy * dt; rot = this.deadT * 500; if (this.y > this.groundY + 300) this.gone = true; }
    else {
      this.x -= 340 * dt;
      const gap = this.x - ctx.gx, k = clamp(1 - (gap - 220) / 950, 0, 1);
      const target = (this.groundY - 620) + (this.laneY - (this.groundY - 620)) * ease(k);
      this.y += (target - this.y) * Math.min(1, dt * 6);
      rot = -14 * ease(k) * (1 - ease(k)) * 4;
      if (this.recoilT > 0) { this.recoilT -= dt; rot += 25 * Math.sin(this.recoilT * 40); }
    }
    const flap = Math.sin(this.t * 13);
    this.p.img.setScale(this.p.k, this.p.k * (0.82 + 0.18 * flap));   // wings beating
    this.p.root.setPosition(this.x, this.y + 110).setRotation(rot * D);
    if (this.x < -400) this.gone = true;
  }
  get warning() { return false; }
  onHurt() { this.recoilT = 0.25; }
  hitbox() { if (this.dead) return null; return new Phaser.Geom.Rectangle(this.x - 110, this.y - 40, 210, 110); }
  get centre() { return [this.x, this.y + 20]; }
  destroy() { this.p.destroy(); }
}

// ---------------- Red fox: darts across the path, fast and low, with little hops. Jump it (or blast it). ----------------
export class Fox extends Creature {
  constructor(scene, x, groundY) {
    super(scene, x, 'fox');
    this.groundY = groundY; this.p = new Sprite(scene, 'w_en_fox', 0.62);
    this.points = 50; this.y = 0;
  }
  update(dt, ctx) {
    this.common(dt); this.x -= ctx.scroll;
    let rot = 0;
    if (this.dead) { const u = this.deadT; rot = Math.min(180, u * 700); this.y += (this.vy = (this.vy ?? 500) - 2600 * dt) * dt; if (u > 1.2) this.gone = true; }
    else {
      const gap = this.x - ctx.gx;
      this.x -= (gap < 1100 ? 640 : 120) * dt;   // waits in the grass, then darts
      const u = (this.t * 3.4) % 1; this.y = 22 * Math.sin(u * Math.PI); rot = -6 + 12 * u;
      if (this.recoilT > 0) { this.recoilT -= dt; rot += 20 * Math.sin(this.recoilT * 40); }
    }
    this.p.root.setPosition(this.x, this.groundY + 6 - this.y).setRotation(rot * D);
    if (this.x < -400) this.gone = true;
  }
  get warning() { return false; }
  onHurt() { this.recoilT = 0.25; }
  hitbox() { if (this.dead) return null; return new Phaser.Geom.Rectangle(this.x - 110, this.groundY - this.y - 85, 210, 80); }
  get centre() { return [this.x, this.groundY - this.y - 50]; }
  destroy() { this.p.destroy(); }
}
