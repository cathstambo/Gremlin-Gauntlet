// World 3 run 2, River Run (Cath-approved art + readme, 15 Oct 2026): charging moose, fishing grizzly, leaping salmon.
// Same interface as the other creatures: update(dt, ctx), hitbox() (what hurts the gremlin), shot(), centre, points.
// Extras used by the Run scene: shootbox() = where magic hits it (if different from hitbox); noShoot = magic passes by.
import { Creature } from './Creatures.js?v=20261016122744';
import { Sprite } from './Wild.js?v=20261016122744';

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

// ---------------- Leaping salmon (hazard, intact bridges only; Cath 15 Oct: on a constant loop with a high arc, so you can
// see them from the moment the bridge comes into view). Each salmon keeps leaping out of the river, high over the deck and
// back in on the other side, then the other way. It's dangerous where it crosses head height: SLIDE as you pass under it.
// Magic doesn't stop it. ----------------
const LEAP = { flight: 1.7, rest: 0.45, span: 440, top: 780, low: 170, band: [330, 120] };   // top = peak above the deck, low = start below it   // band = px above the deck where it hurts
export class Salmon extends Creature {
  constructor(scene, x, groundY) {
    super(scene, x, 'salmon');
    this.groundY = groundY; this.p = new Sprite(scene, 'r_salmon', 0.8, 4.4);   // behind the bridge deck until it clears it
    this.p.img.setOrigin(0.45, 0.3); this.noShoot = true; this.points = 0;
    this.ring = scene.add.graphics().setDepth(4.6);
    this.t = (x * 0.37) % (LEAP.flight + LEAP.rest);   // salmon on the same bridge are out of step with each other
  }
  update(dt, ctx) {
    this.t += dt; this.x -= ctx.scroll; this.ring.clear(); this.box = null;
    const P = LEAP.flight + LEAP.rest, n = Math.floor(this.t / P), ph = this.t - n * P, dir = n % 2 ? 1 : -1;
    const G = this.groundY;
    if (ph < LEAP.flight) {
      const u = ph / LEAP.flight, x = this.x + dir * LEAP.span * (u - 0.5);
      const y = G + LEAP.low - (LEAP.top + LEAP.low) * 4 * u * (1 - u);
      const vx = dir * LEAP.span / LEAP.flight, vy = -(LEAP.top + LEAP.low) * 4 * (1 - 2 * u) / LEAP.flight;
      const ang = Math.atan2(vy, vx);
      this.p.img.setFlipX(dir < 0);
      this.p.root.setVisible(true).setPosition(x, y).setRotation(dir < 0 ? ang - Math.PI : ang);
      this.p.root.setDepth(y < G - 40 ? 9.6 : 4.4);   // in front of the deck while it's above it
      const above = G - y;
      if (above < LEAP.band[0] && above > LEAP.band[1]) {   // crossing head height: this is what hits you
        const c = Math.abs(Math.cos(ang)), sn = Math.abs(Math.sin(ang)), w = 90 + 130 * c, h = 90 + 130 * sn;
        const y0 = Math.max(y - h / 2, G - LEAP.band[0]), y1 = Math.min(y + h / 2, G - LEAP.band[1]);   // never low enough to touch a slide
        if (y1 > y0) this.box = new Phaser.Geom.Rectangle(x - w / 2, y0, w, y1 - y0);
      }
      if (u < 0.08 || u > 0.92) this.splash(dir * LEAP.span * (u < 0.5 ? -0.5 : 0.5), 1);
    } else {
      this.p.root.setVisible(false);
      this.splash(-dir * LEAP.span * 0.5, 0.6 * (1 - (ph - LEAP.flight) / LEAP.rest));   // ripples where it's about to come out
    }
    if (this.x < -700) this.gone = true;
  }
  splash(dx, a) { this.ring.fillStyle(0xffffff, 0.7 * a).fillEllipse(this.x + dx, this.groundY + 175, 170, 36); }
  hitbox() { return this.box || null; }
  get centre() { return [this.x, this.groundY - 300]; }
  destroy() { this.p.destroy(); this.ring.destroy(); }
}

// ---------------- Charging grizzly (Uzi Rampage, Cath 15 Oct: "bears running out to attack same as the moose").
// Lumbers in, rears up and ROARS (the warning), then drops forward and charges. Lesser enemy (approved readme):
// one blast defeats him, 50 points; or double jump him. ----------------
export class ChargeBear extends Creature {
  constructor(scene, x, groundY) {
    super(scene, x, 'bear');
    this.groundY = groundY; this.p = new Sprite(scene, 'r_bear_swipe', 0.72);
    this.points = 50; this.st = 'walk'; this.stT = 0; this.y = 0;
  }
  update(dt, ctx) {
    this.common(dt); this.x -= ctx.scroll;
    let rot = 0, sq = 1;
    if (this.dead) { const u = this.deadT; rot = -Math.min(100, u * 400); this.y += (this.vy = (this.vy ?? 400) - 2600 * dt) * dt; if (u > 1.4) this.gone = true; }
    else {
      this.stT += dt;
      const gap = this.x - ctx.gx;
      if (this.st === 'walk') {          // heavy lumber towards you, leaning forward
        this.x -= 150 * dt; const u = (this.t * 2) % 1; this.y = 8 * Math.sin(u * Math.PI); rot = -14 + 5 * Math.sin(u * Math.PI * 2); sq = 0.92;
        if (gap < 1450 && gap > 0) { this.st = 'rear'; this.stT = 0; }
      } else if (this.st === 'rear') {   // the warning: rears up tall and roars, claws up
        const u = ease(this.stT / 0.3); rot = -14 + 14 * u + 2 * Math.sin(this.stT * 30); sq = 0.92 + 0.1 * u;
        if (this.stT > 0.8) { this.st = 'charge'; this.stT = 0; this.scene.cameras.main.shake(120, 0.004); }
      } else if (this.st === 'charge') { // drops forward and gallops at the gremlin
        this.x -= 600 * dt; const u = (this.t * 3.2) % 1; this.y = 20 * Math.sin(u * Math.PI); rot = -22 + 8 * u; sq = 0.86;
      }
    }
    this.p.root.setPosition(this.x, this.groundY + 12 - this.y).setRotation(rot * D);
    this.p.img.setScale(this.p.k / Math.sqrt(sq), this.p.k * sq);
    if (this.x < -600) this.gone = true;
  }
  get warning() { return this.st === 'rear'; }
  hitbox() { if (this.dead) return null; return new Phaser.Geom.Rectangle(this.x - 150, this.groundY - this.y - 250, 290, 240); }
  get centre() { return [this.x, this.groundY - this.y - 200]; }
  destroy() { this.p.destroy(); }
}
