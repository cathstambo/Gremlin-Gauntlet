// World 2 creatures: Meadows of Malicious Happiness. Deceptively cute, all dangerous (GDD).
// Same cut-out puppet method and interface as the swamp creatures:
// update(dt, ctx) moves it; hitbox() is what hurts the gremlin; shot() is called when magic hits it.
import { Puppet, Creature } from './Creatures.js?v=20261016134000';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = k => (k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k));
const rnd = (a, b) => a + Math.random() * (b - a);
const D = Math.PI / 180;
// the meadow is busy and bright: a light outline keeps every creature readable against the flowers
function outline(p, col = 0xffffff) { for (const im of p.images) if (im.preFX) im.preFX.addGlow(col, 3, 0, false, 0.1, 6); return p; }

// ---------------- Killer bunny: hops at the gremlin in low bounding leaps. Jump it or blast it. ----------------
export class Bunny extends Creature {
  constructor(scene, x, groundY) {
    super(scene, x, 'bunny');
    this.groundY = groundY; this.p = outline(new Puppet(scene, 'bunny', 0.5, ['body', 'ears']), 0xff3a6a);
    this.R = this.p.R; this.points = 50; this.st = 'sit'; this.stT = rnd(0, 0.5); this.y = 0; this.hopT = 0;
  }
  update(dt, ctx) {
    this.common(dt);
    const P = this.p.parts, k = this.p.k, R = this.R;
    this.x -= ctx.scroll;
    let sq = 1, rot = 0, ears = 4 * Math.sin(this.t * 7);
    if (this.dead) {   // flips over and drops away
      const u = this.deadT; rot = Math.min(200, u * 800); this.y += (this.vy = (this.vy ?? 700) - 2600 * dt) * dt; ears = 30;
      if (u > 1.3) this.gone = true;
    } else {
      this.stT += dt;
      const gap = this.x - ctx.gx;
      if (this.st === 'sit') {   // twitchy nose, ears flicking
        sq = 1 + 0.03 * Math.sin(this.t * 12); ears = 8 * Math.sin(this.t * 11);
        if (gap < 950 && gap > 0 && this.stT > 0.3) { this.st = 'hop'; this.hopT = 0; }
      } else if (this.st === 'hop') {   // bounding leaps straight at the gremlin
        this.hopT += dt; const T = 0.44, u = (this.hopT % T) / T;
        this.y = 115 * 4 * u * (1 - u); this.x -= 360 * dt;
        sq = u < 0.12 ? 0.85 : 1.08; rot = -16 + 30 * u; ears = -26 + 40 * u;
      } else if (this.st === 'recoil') {
        rot = 20 * Math.sin(this.stT * 30); this.y = Math.max(0, this.y - 600 * dt);
        if (this.stT > 0.3) { this.st = 'hop'; this.stT = 0; }
      }
    }
    const feetUp = (R._feet - R.body.py) * k;
    this.p.root.setPosition(this.x, this.groundY - this.y - feetUp * sq);
    this.p.inner.setScale(1 / Math.sqrt(sq), sq).setRotation(rot * D);
    P.ears.rotation = -ears * D;
    if (this.x < -400) this.gone = true;
  }
  onHurt() { this.st = 'recoil'; this.stT = 0; }
  hitbox() { if (this.dead) return null; return new Phaser.Geom.Rectangle(this.x - 85, this.groundY - this.y - 125, 165, 120); }
  get centre() { return [this.x, this.groundY - this.y - 60]; }
  destroy() { this.p.destroy(); }
}

// ---------------- Psychotic kitten: wiggles its bum, then pounces at head height. Slide under it or blast it. ----------------
export class Kitten extends Creature {
  constructor(scene, x, groundY) {
    super(scene, x, 'kitten');
    this.groundY = groundY; this.p = outline(new Puppet(scene, 'kitten', 0.5, ['tail', 'body']), 0xfff0ff);
    this.R = this.p.R; this.points = 50; this.st = 'crouch'; this.stT = 0; this.y = 0;
  }
  update(dt, ctx) {
    this.common(dt);
    const P = this.p.parts, k = this.p.k, R = this.R;
    this.x -= ctx.scroll;
    let rot = 0, tail = 10 * Math.sin(this.t * 4), sq = 1, wig = 0;
    if (this.dead) {
      const u = this.deadT; rot = -u * 700; this.y += (this.vy = (this.vy ?? 600) - 2600 * dt) * dt;
      if (u > 1.3) this.gone = true;
    } else {
      this.stT += dt;
      const gap = this.x - ctx.gx;
      if (this.st === 'crouch') {
        sq = 0.92 + 0.02 * Math.sin(this.t * 5); tail = 18 * Math.sin(this.t * 6);
        if (gap < 820 && gap > 0) { this.st = 'wiggle'; this.stT = 0; }
      } else if (this.st === 'wiggle') {   // the warning: bum wiggle, tail lashing
        wig = 10 * Math.sin(this.stT * 40); tail = 34 * Math.sin(this.stT * 24); sq = 0.86;
        if (this.stT > 0.5) { this.st = 'pounce'; this.stT = 0; }
      } else if (this.st === 'pounce') {   // springs up to head height and flies straight across: SLIDE
        const u = this.stT; this.y = 220 * ease(u / 0.16); this.x -= 820 * dt; rot = -6; tail = -30; sq = 1.06;
        if (u > 0.75) { this.st = 'fall'; this.stT = 0; this.vy = 0; }
      } else if (this.st === 'fall') {
        this.vy -= 2800 * dt; this.y = Math.max(0, this.y + this.vy * dt); this.x -= 400 * dt; rot = 10;
        if (this.y <= 0) { this.st = 'crouch'; this.stT = -9; }
      } else if (this.st === 'recoil') {
        rot = 18 * Math.sin(this.stT * 30); this.y = Math.max(0, this.y - 500 * dt);
        if (this.stT > 0.3) { this.st = this.y > 20 ? 'fall' : 'crouch'; this.stT = this.y > 20 ? 0 : -9; this.vy = 0; }
      }
    }
    const feetUp = (R._feet - R.body.py) * k;
    this.p.root.setPosition(this.x + wig, this.groundY - this.y - feetUp * sq);
    this.p.inner.setScale(1 / Math.sqrt(sq), sq).setRotation(rot * D);
    P.tail.rotation = -tail * D;
    if (this.x < -400) this.gone = true;
  }
  onHurt() { this.st = 'recoil'; this.stT = 0; }
  hitbox() { if (this.dead) return null; return new Phaser.Geom.Rectangle(this.x - 105, this.groundY - this.y - 120, 200, 105); }
  get centre() { return [this.x, this.groundY - this.y - 55]; }
  destroy() { this.p.destroy(); }
}

// ---------------- Carnivorous flower: rooted to the spot; rears back, then SNAPS forward. Jump it (or blast it ×3). ----------------
export class Flower extends Creature {
  constructor(scene, x, groundY) {
    super(scene, x, 'flower');
    this.groundY = groundY; this.p = outline(new Puppet(scene, 'flower', 0.56, ['body', 'head']), 0xffe14a);
    this.R = this.p.R; this.points = 150; this.hp = 3; this.st = 'idle'; this.stT = 0; this.reach = 0;
  }
  update(dt, ctx) {
    this.common(dt);
    const P = this.p.parts, k = this.p.k, R = this.R;
    this.x -= ctx.scroll;
    let head = 6 * Math.sin(this.t * 2.5), hs = 1, lean = 0;
    this.reach = 0;
    if (this.dead) {   // wilts and sinks into the ground
      const u = this.deadT; head = -60 * ease(u / 0.6); lean = 25 * ease(u / 0.8); this.p.root.alpha = clamp(1.6 - u, 0, 1);
      if (u > 1.6) this.gone = true;
    } else {
      this.stT += dt;
      const gap = this.x - ctx.gx;
      if (this.st === 'idle') { if (gap < 560 && gap > 0) { this.st = 'rear'; this.stT = 0; } }
      else if (this.st === 'rear') {   // the warning: head pulls back, jaws gaping
        const u = ease(this.stT / 0.35); head = -24 * u; lean = 8 * u; hs = 1 + 0.08 * u;
        if (this.stT > 0.35) { this.st = 'snap'; this.stT = 0; }
      } else if (this.st === 'snap') {   // lunges out low and chomps
        const u = this.stT, out = u < 0.12 ? ease(u / 0.12) : 1 - ease((u - 0.35) / 0.3);
        head = 34 * out; lean = -14 * out; hs = 1.12; this.reach = 150 * out;
        if (u > 0.12 && !this.chomped) { this.chomped = true; this.scene.cameras.main.shake(80, 0.003); }
        if (u > 0.7) { this.st = 'idle2'; this.stT = 0; this.chomped = false; }
      } else if (this.st === 'idle2') { head = 4 * Math.sin(this.t * 6); if (this.stT > 0.8 && gap > 0 && gap < 560) { this.st = 'rear'; this.stT = 0; } }
      else if (this.st === 'recoil') { head = -30 + 10 * Math.sin(this.stT * 30); if (this.stT > 0.3) { this.st = 'idle2'; this.stT = 0; } }
    }
    const feetUp = (R._feet - R.body.py) * k;
    this.p.root.setPosition(this.x, this.groundY - feetUp + 6);
    this.p.inner.setRotation(lean * D);
    P.head.rotation = -head * D; P.head.setScale(hs);
    if (this.x < -500) this.gone = true;
  }
  onHurt() { this.st = 'recoil'; this.stT = 0; }
  hitbox() {
    if (this.dead) return null;
    const w = 230 + this.reach;
    return new Phaser.Geom.Rectangle(this.x - 150 - this.reach, this.groundY - 200, w, 195);
  }
  get centre() { return [this.x - 70, this.groundY - 120]; }
  destroy() { this.p.destroy(); }
}

// ---------------- Butterfly swarm: drifts in at head height. Touching it doesn't hurt, but it blinds you for a moment.
// Avoid it (jump or slide) or blast it apart. ----------------
export class Swarm extends Creature {
  constructor(scene, x, groundY, lane = 'high') {
    super(scene, x, 'swarm');
    this.groundY = groundY; this.p = new Puppet(scene, 'swarm', 0.5, ['body'], 7);
    this.R = this.p.R; this.points = 50; this.harmless = true;
    this.baseY = lane === 'low' ? groundY - 120 : groundY - 230; this.y = groundY - 520;
  }
  update(dt, ctx) {
    this.common(dt);
    this.x -= ctx.scroll;
    if (this.dead) {   // scatters
      this.p.root.alpha = clamp(1 - this.deadT * 2.5, 0, 1); this.p.root.setScale(this.p.k * (1 + this.deadT * 2));
      if (this.deadT > 0.5) this.gone = true;
    } else {
      this.x -= 300 * dt;
      const gap = this.x - ctx.gx, kk = clamp(1 - (gap - 200) / 900, 0, 1);
      const target = (this.groundY - 520) + (this.baseY - (this.groundY - 520)) * ease(kk);
      this.y += (target - this.y) * Math.min(1, dt * 5) + 5 * Math.sin(this.t * 6);
      this.p.inner.setScale(1 + 0.05 * Math.sin(this.t * 22), 1 - 0.12 * Math.abs(Math.sin(this.t * 18)));   // wings fluttering
      this.p.root.setRotation(0.06 * Math.sin(this.t * 3));
    }
    this.p.root.setPosition(this.x, this.y);
    if (this.x < -400) this.gone = true;
  }
  hitbox() { if (this.dead) return null; return new Phaser.Geom.Rectangle(this.x - 95, this.y - 65, 190, 120); }
  get centre() { return [this.x, this.y]; }
  destroy() { this.p.destroy(); }
}
