// World 3 run 2, River Run (Cath-approved art + readme, 15 Oct 2026): charging moose, fishing grizzly, leaping salmon.
// Same interface as the other creatures: update(dt, ctx), hitbox() (what hurts the gremlin), shot(), centre, points.
// Extras used by the Run scene: shootbox() = where magic hits it (if different from hitbox); noShoot = magic passes by.
import { Creature } from './Creatures.js?v=20261015152130';
import { Sprite } from './Wild.js?v=20261015152130';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = k => (k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k));
const D = Math.PI / 180;
// where the bear's claw sweeps (px left of the bear / above the ground): HIGH is over a slide, LOW is under a jump
const SWIPE = { high: { x0: 400, x1: 70, top: 310, bot: 185 }, low: { x0: 400, x1: 70, top: 110, bot: 8 } };

// ---------------- Charging bull moose: trots in, stops, lowers his antlers and paws the ground, then CHARGES.
// Strong enemy (GDD): he's big, so DOUBLE jump him, or blast him twice. 150 points. ----------------
export class Moose extends Creature {
  constructor(scene, x, groundY) {
    super(scene, x, 'moose');
    this.groundY = groundY; this.p = new Sprite(scene, 'r_moose', 0.78);
    this.hp = 2; this.points = 150; this.st = 'trot'; this.stT = 0; this.y = 0; this.dustT = 0;
  }
  update(dt, ctx) {
    this.common(dt); this.x -= ctx.scroll;
    let rot = 0, sq = 1;
    if (this.dead) { const u = this.deadT; rot = Math.min(150, u * 500); this.y += (this.vy = (this.vy ?? 500) - 2600 * dt) * dt; if (u > 1.4) this.gone = true; }
    else {
      this.stT += dt;
      const gap = this.x - ctx.gx;
      if (this.st === 'trot') {          // heavy trot towards you
        this.x -= 160 * dt; const u = (this.t * 2.2) % 1; this.y = 10 * Math.sin(u * Math.PI); rot = -3 + 6 * u;
        if (gap < 1500 && gap > 0) { this.st = 'paw'; this.stT = 0; }
      } else if (this.st === 'paw') {    // the warning: head down, antlers forward, a hoof scrapes the ground twice
        const u = ease(this.stT / 0.25); rot = 9 * u + 2 * Math.sin(this.stT * 22); sq = 1 - 0.05 * u; this.y = 0;
        this.dustT -= dt; if (this.dustT <= 0) { this.dustT = 0.22; this.scene.g.fx.dust?.(3, 0.8, [this.x - 60, this.groundY]); }
        if (this.stT > 0.75) { this.st = 'charge'; this.stT = 0; this.scene.cameras.main.shake(120, 0.004); }
      } else if (this.st === 'charge') { // full gallop at the gremlin
        this.x -= 620 * dt; const u = (this.t * 3.4) % 1; this.y = 26 * Math.sin(u * Math.PI); rot = 6 - 10 * u; sq = u < 0.15 ? 0.92 : 1;
      } else if (this.st === 'recoil') { rot = -10 + 8 * Math.sin(this.stT * 30); this.x += 120 * dt; if (this.stT > 0.35) { this.st = 'charge'; this.stT = 0; } }
    }
    this.p.root.setPosition(this.x, this.groundY + 10 - this.y).setRotation(rot * D);
    this.p.img.setScale(this.p.k / Math.sqrt(sq), this.p.k * sq);
    if (this.x < -600) this.gone = true;
  }
  get warning() { return this.st === 'paw'; }
  onHurt() { this.st = 'recoil'; this.stT = 0; }
  // his body and legs (not the tips of the antlers)
  hitbox() { if (this.dead) return null; return new Phaser.Geom.Rectangle(this.x - 190, this.groundY - this.y - 240, 360, 230); }
  get centre() { return [this.x, this.groundY - this.y - 190]; }
  destroy() { this.p.destroy(); }
}

// ---------------- Fishing grizzly (lesser enemy, approved addition): stands in the shallows beside the path, fishing.
// As you come past he swipes a claw across the path, LOW (jump it) or HIGH (slide under it). A red sweep line shows
// where the claw will go before it swings. One blast defeats him, 50 points. Touching his body doesn't hurt: only the claw. ----------------
export class Bear extends Creature {
  constructor(scene, x, groundY, lane = 'high') {
    super(scene, x, 'bear');
    this.groundY = groundY; this.lane = lane;   // 'high' = slide under the swipe, 'low' = jump it
    this.fish = new Sprite(scene, 'r_bear_fish', 1.0, 5.2);
    this.swipe = new Sprite(scene, 'r_bear_swipe', 1.1, 5.2); this.swipe.img.setFlipX(false); this.swipe.root.setVisible(false);
    this.p = this.fish; this.points = 50; this.st = 'fish'; this.stT = 0;
    this.marker = scene.add.graphics().setDepth(9.5);
  }
  setPose(p) { if (this.p === p) return; this.p.root.setVisible(false); this.p = p; p.root.setVisible(true); }
  update(dt, ctx) {
    this.common(dt); this.x -= ctx.scroll;
    let rot = 0, sq = 1, dx = 0; this.claw = null; this.marker.clear();
    const gap = this.x - ctx.gx;
    if (this.dead) {   // topples back into the river
      rot = -Math.min(80, this.deadT * 200); this.p.root.alpha = clamp(1.5 - this.deadT, 0, 1); if (this.deadT > 1.5) this.gone = true;
    } else {
      this.stT += dt;
      if (this.st === 'fish') {
        sq = 1 + 0.02 * Math.sin(this.t * 3);
        if (gap < 760 && gap > 0) { this.st = 'tell'; this.stT = 0; }
      } else if (this.st === 'tell') {   // the warning (0.65 s): HIGH = he rears up on his hind legs; LOW = he hunkers down
        const u = ease(this.stT / 0.3);
        if (this.lane === 'high') { this.setPose(this.swipe); sq = 0.85 + 0.15 * u; rot = 6 * u; }
        else { sq = 1 - 0.14 * u; rot = -4 * u; }
        this.drawSweep(0.35 + 0.45 * Math.abs(Math.sin(this.stT * 14)));
        if (this.stT > 0.65) { this.st = 'swing'; this.stT = 0; }
      } else if (this.st === 'swing') {  // the claw sweeps across the path for a moment
        const u = clamp(this.stT / 0.3, 0, 1);
        if (this.lane === 'high') { rot = 6 - 22 * ease(u); dx = -40 * ease(u); }
        else { rot = -4 - 10 * ease(u); dx = -70 * ease(u); sq = 0.9; }
        const L = SWIPE[this.lane]; this.claw = new Phaser.Geom.Rectangle(this.x - L.x0, this.groundY - L.top, L.x0 - L.x1, L.top - L.bot);
        this.drawSweep(0.9 * (1 - u));
        if (this.stT > 0.38) { this.st = 'after'; this.stT = 0; }
      } else if (this.st === 'after') { rot = this.lane === 'high' ? -10 : -8; if (this.stT > 0.6) { this.st = 'done'; this.stT = 0; } }
      else if (this.st === 'done') { this.setPose(this.fish); sq = 1 + 0.02 * Math.sin(this.t * 3); }
    }
    const base = this.groundY - 18;
    this.p.root.setPosition(this.x + dx, base).setRotation(rot * D);
    this.p.img.setScale(this.p.k / Math.sqrt(sq), this.p.k * sq);
    if (this.x < -500) this.gone = true;
  }
  /** The red sweep line: where the claw is about to go. */
  drawSweep(a) {
    const L = SWIPE[this.lane], G = this.marker, x0 = this.x - L.x0, x1 = this.x - L.x1, y0 = this.groundY - L.top, y1 = this.groundY - L.bot;
    G.fillStyle(0xff3a2a, 0.45 * a).fillRect(x0, y0, x1 - x0, y1 - y0);
    G.lineStyle(8, 0xff3a2a, a).strokeRect(x0, y0, x1 - x0, y1 - y0);
    // three claw slashes across the band
    for (let i = 0; i < 3; i++) { const cx = x0 + 70 + i * 90; G.lineStyle(7, 0xffe0d0, a).lineBetween(cx + 30, y0 + 12, cx - 30, y1 - 12); }
  }
  get warning() { return this.st === 'tell'; }
  hitbox() { return this.dead ? null : this.claw; }
  shootbox() { return this.dead ? null : new Phaser.Geom.Rectangle(this.x - 120, this.groundY - 300, 240, 290); }
  get centre() { return [this.x, this.groundY - 160]; }
  destroy() { this.fish.destroy(); this.swipe.destroy(); this.marker.destroy(); }
}

// ---------------- Leaping salmon (hazard, intact bridges only): a splash in the river under the bridge is the warning,
// then a salmon leaps up over the deck at head height and back down the other side. SLIDE under it. Magic doesn't stop it. ----------------
export class Salmon extends Creature {
  constructor(scene, x, groundY) {
    super(scene, x, 'salmon');
    this.groundY = groundY; this.p = new Sprite(scene, 'r_salmon', 0.8, 4.4);   // behind the bridge deck until it clears it
    this.p.img.setOrigin(0.45, 0.3); this.p.root.setVisible(false); this.noShoot = true; this.points = 0; this.st = 'wait'; this.stT = 0;
    this.ring = scene.add.graphics().setDepth(9.5);
    this.T = 1.15; this.vx = 330;   // flight time; the fish's own speed towards the gremlin
  }
  update(dt, ctx) {
    this.t += dt; this.x -= ctx.scroll; this.ring.clear(); this.box = null;
    const gap = this.x - ctx.gx, v = ctx.scroll / Math.max(dt, 1e-4);
    // launch so that the top of its leap meets the gremlin; the splash warning comes 0.6 s before that
    const meet = (v + this.vx) * this.T / 2;
    if (this.st === 'wait') { if (gap < meet + (v + 0) * 0.6 && gap > 0) { this.st = 'warn'; this.stT = 0; } }
    else if (this.st === 'warn') {
      this.stT += dt; const a = 0.5 + 0.5 * Math.sin(this.stT * 20);
      // bubbling water just below the deck where it will jump out, and a red ring at head height where it will cross
      this.ring.fillStyle(0xffffff, 0.75 * a).fillEllipse(this.x, this.groundY + 175, 150 + 80 * this.stT, 34);
      this.ring.lineStyle(6, 0xff5a3a, 0.7 * a).strokeEllipse(this.x - 120, this.groundY - 235, 150, 150);
      if (gap <= meet) { this.st = 'leap'; this.stT = 0; this.x0 = this.x; this.p.root.setVisible(true); this.scene.g.fx.burst?.([this.x, this.groundY + 40], 0.25); }
    } else if (this.st === 'leap') {
      this.stT += dt; const u = this.stT / this.T;
      this.x -= this.vx * dt;
      const yTop = this.groundY - 235, yLow = this.groundY + 120;
      const y = yLow + (yTop - yLow) * 4 * u * (1 - u);
      const vy = (yTop - yLow) * 4 * (1 - 2 * u) / this.T;
      this.p.root.setPosition(this.x, y).setRotation(Math.atan2(vy, -this.vx) + Math.PI);
      this.p.root.setDepth(y < this.groundY - 40 ? 9.6 : 4.4);   // in front of the deck while it's above it
      if (y < this.groundY - 120) this.box = new Phaser.Geom.Rectangle(this.x - 105, y - 50, 210, 100);
      if (u >= 1) { this.st = 'gone'; this.gone = true; }
    }
    if (this.x < -500) this.gone = true;
  }
  hitbox() { return this.box || null; }
  get centre() { return [this.x, this.groundY - 200]; }
  destroy() { this.p.destroy(); this.ring.destroy(); }
}
