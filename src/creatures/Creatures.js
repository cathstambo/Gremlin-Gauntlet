// World 1 swamp creatures, animated as cut-out puppets (same method as the gremlin and Eddie).
// Each creature: update(dt, ctx) → moves itself; hitbox() → screen rect that hurts the gremlin;
// shot() → called when magic hits it (returns true if the orb is used up). ctx = { gx, groundY, scroll }.
import { inkOutline } from '../world/Readability.js';
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = k => (k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k));
const rnd = (a, b) => a + Math.random() * (b - a);
const TEX = 2;   // creature images are stored at half the art's size (they're shown at about a third of it)

/** A set of image parts hung on pivots, all relative to the creature's body pivot. */
export class Puppet {
  constructor(scene, kind, scale, order, depth = 6) {
    this.scene = scene; this.kind = kind;
    this.R = scene.cache.json.get('creatures')[kind];
    this.root = scene.add.container(0, 0).setScale(scale).setDepth(depth);
    this.inner = scene.add.container(0, 0); this.root.add(this.inner);
    this.k = scale; this.parts = {}; this.images = [];
    const B = this.R.body;
    for (const n of order) {
      const p = this.R[n];
      const c = scene.add.container(p.px - B.px, p.py - B.py);
      const im = scene.add.image(p.x - p.px, p.y - p.py, `c_${kind}_${n}`).setOrigin(0, 0).setScale(TEX);
      c.add(im); this.inner.add(c); this.parts[n] = c; this.images.push(im); c.img = im;
    }
    this.ink = inkOutline(this.root);   // dark outline round the whole creature (turns red during its warning)
  }
  flash(on) { if (on === this._fl) return; this._fl = on; for (const im of this.images) on ? im.setTintFill(0xffffff) : im.clearTint(); }
  destroy() { this.root.destroy(); }
}

export class Creature {
  constructor(scene, x, kind) { this.scene = scene; this.x = x; this.kind = kind; this.dead = false; this.gone = false; this.hp = 1; this.t = 0; this.flashT = 0; this.deadT = 0; }
  get alive() { return !this.dead; }
  hurt(n = 1) {
    if (this.dead) return false;
    this.hp -= n; this.flashT = 0.1;
    if (this.hp <= 0) { this.dead = true; this.deadT = 0; this.onDefeat?.(); }
    else this.onHurt?.();
    return true;
  }
  shot() { return this.hurt(1); }
  common(dt) { this.t += dt; this.flashT = Math.max(0, this.flashT - dt); this.p.flash(this.flashT > 0); if (this.dead) this.deadT += dt; }
}

// ---------------- Angry frog: crouches, then leaps at the gremlin. Jump it or blast it. ----------------
export class Frog extends Creature {
  constructor(scene, x, groundY) {
    super(scene, x, 'frog');
    this.groundY = groundY; this.p = new Puppet(scene, 'frog', 0.45, ['hind', 'body', 'jaw', 'front']);
    this.R = this.p.R; this.y = 0; this.vx = 0; this.vy = 0; this.st = 'sit'; this.stT = rnd(0, 0.6); this.points = 50;
  }
  update(dt, ctx) {
    this.common(dt);
    const P = this.p.parts, k = this.p.k, R = this.R;
    this.x -= ctx.scroll;
    let sq = 1, rot = 0, jaw = 0, hind = 0, front = 0;
    if (this.dead) {   // flips onto its back, legs kicking, and falls through the floor
      const u = this.deadT;
      rot = Math.min(180, u * 900); this.vy -= 2600 * dt; this.y += this.vy * dt;
      hind = 30 * Math.sin(u * 40); front = 30 * Math.sin(u * 40 + 1); jaw = 14;
      if (u > 1.4) this.gone = true;
    } else {
      this.stT += dt;
      const near = this.x - ctx.gx < 900 && this.x > ctx.gx - 50;
      if (this.st === 'sit') {
        sq = 1 + 0.03 * Math.sin(this.t * 6); jaw = 6 + 6 * Math.sin(this.t * 9);   // breathing, mouth working
        if (near && this.stT > 0.5) { this.st = 'crouch'; this.stT = 0; }
      } else if (this.st === 'crouch') {   // the warning: squashes down, mouth snaps shut
        const u = ease(this.stT / 0.32); sq = 1 - 0.18 * u; hind = 10 * u; front = -6 * u; jaw = -18 * u;
        if (this.stT >= 0.32) { this.st = 'air'; this.stT = 0; this.vy = 1150; this.vx = -420; }
      } else if (this.st === 'air') {
        this.vy -= 2600 * dt; this.y += this.vy * dt; this.x += this.vx * dt;
        sq = 1.12; rot = -12 + 26 * clamp(1 - this.vy / 1150, 0, 1); hind = -45; front = 25; jaw = 14;
        if (this.y <= 0 && this.vy < 0) { this.y = 0; this.vy = 0; this.st = 'land'; this.stT = 0; }
      } else if (this.st === 'land') {
        const u = this.stT / 0.22; sq = 1 - 0.2 * Math.sin(Math.min(1, u) * Math.PI); jaw = 10;
        if (this.stT > 0.22) { this.st = 'sit'; this.stT = -0.25; }
      } else if (this.st === 'recoil') {
        rot = 18 * Math.sin(this.stT * 30) * (1 - this.stT / 0.3); jaw = 30;
        if (this.stT > 0.3) { this.st = 'sit'; this.stT = 0; }
      }
    }
    // feet sit on the ground line; squash keeps the feet planted
    const feetUp = (R._feet - R.body.py) * k;
    this.p.root.setPosition(this.x, this.groundY - this.y - feetUp * sq);
    this.p.inner.setScale(1 / Math.sqrt(sq), sq).setRotation(rot * Math.PI / 180);
    P.jaw.rotation = -jaw * Math.PI / 180; P.hind.rotation = hind * Math.PI / 180; P.front.rotation = front * Math.PI / 180;
    if (this.x < -400) this.gone = true;
  }
  onHurt() { this.st = 'recoil'; this.stT = 0; }
  onDefeat() { this.vy = 900; }
  get warning() { return !this.dead && this.st === 'crouch'; }
  hitbox() { if (this.dead) return null; const w = 170, h = 125; return new Phaser.Geom.Rectangle(this.x - w / 2 + 10, this.groundY - this.y - h, w, h); }
  get centre() { return [this.x, this.groundY - this.y - 70]; }
  destroy() { this.p.destroy(); }
}

// ---------------- Alligator: crawls in, then lunges with a jaw snap. Jump the lunge or blast it (3 hits). ----------------
export class Gator extends Creature {
  constructor(scene, x, groundY) {
    super(scene, x, 'gator');
    this.groundY = groundY; this.p = new Puppet(scene, 'gator', 0.42, ['legB', 'tail', 'legC', 'body', 'jaw', 'legA']);
    this.R = this.p.R; this.hp = 3; this.points = 150; this.st = 'crawl'; this.stT = 0; this.lunged = false;
    // the tail is redrawn as thin strips so it can swish
    const tp = this.R.tail, tc = this.p.parts.tail; tc.img.setVisible(false); this.strips = [];
    const N = 30, sw = tp.w / N;
    for (let i = 0; i < N; i++) { const im = scene.add.image(tp.x - tp.px, tp.y - tp.py, 'c_gator_tail').setOrigin(0, 0).setScale(TEX).setCrop(i * sw / TEX, 0, (sw + 2) / TEX, tp.h / TEX); im.d = i / N; im.by = tp.y - tp.py; tc.add(im); this.strips.push(im); this.p.images.push(im); }
  }
  update(dt, ctx) {
    this.common(dt);
    const P = this.p.parts, k = this.p.k, R = this.R;
    this.x -= ctx.scroll;
    let jaw = 0, lean = 0, bob = 0, dx = 0, legSwing = 0, flip = 1, speedLegs = 7;
    if (this.dead) {
      const u = this.deadT; flip = Math.cos(Math.min(1, u * 3) * Math.PI); jaw = 18; bob = -60 * Math.sin(Math.min(1, u * 3) * Math.PI);
      legSwing = 30 * Math.sin(u * 30) * Math.max(0, 1 - u); this.p.root.alpha = clamp(2.2 - u, 0, 1);
      if (u > 2.2) this.gone = true;
    } else {
      this.stT += dt;
      const gap = this.x - ctx.gx;
      if (this.st === 'crawl') {
        this.x -= 120 * dt; legSwing = 22; bob = 4 * Math.sin(this.t * 14); jaw = -12 + 5 * Math.sin(this.t * 3);
        if (gap < 640 && gap > 0) { this.st = 'warn'; this.stT = 0; }
      } else if (this.st === 'warn') {   // the warning: rears back, jaws wide, tail lashing
        const u = ease(this.stT / 0.45); lean = -7 * u; jaw = -12 + 26 * u; dx = 30 * u; speedLegs = 0;
        if (this.stT >= 0.45) { this.st = 'lunge'; this.stT = 0; }
      } else if (this.st === 'lunge') {   // shoots forward, then the jaws SNAP
        const u = this.stT; this.x -= (u < 0.28 ? 1500 : 0) * dt; legSwing = 40; speedLegs = 26;
        lean = 4; jaw = u < 0.22 ? 14 : -26 + 10 * Math.min(1, (u - 0.22) * 2);
        if (u > 0.22 && !this.snapped) { this.snapped = true; this.scene.cameras.main.shake(90, 0.004); }
        if (u > 0.7) { this.st = 'crawl'; this.stT = -0.8; this.snapped = false; }
      } else if (this.st === 'recoil') {
        lean = -6 * Math.sin(this.stT * 25); jaw = 20; dx = 40 * (1 - this.stT / 0.35);
        if (this.stT > 0.35) { this.st = 'crawl'; this.stT = 0; }
      }
    }
    const feetUp = (R._feet - R.body.py) * k;
    this.p.root.setPosition(this.x + dx, this.groundY - feetUp + bob * 0.5);
    this.p.inner.setScale(1, flip).setRotation(lean * Math.PI / 180);
    P.jaw.rotation = -jaw * Math.PI / 180;   // positive = opens wider than drawn, negative = closes
    const w = this.t * speedLegs;
    P.legA.rotation = legSwing * Math.sin(w) * Math.PI / 180; P.legC.rotation = legSwing * Math.sin(w + Math.PI) * Math.PI / 180; P.legB.rotation = legSwing * Math.sin(w + Math.PI) * Math.PI / 180;
    const lash = this.st === 'warn' ? 3 : 1;
    for (const s of this.strips) s.y = s.by + (16 * lash) * Math.pow(s.d, 1.4) * Math.sin(this.t * 5 * lash - s.d * 5);
    if (this.x < -700) this.gone = true;
  }
  onHurt() { this.st = 'recoil'; this.stT = 0; }
  get warning() { return !this.dead && (this.st === 'warn' || this.st === 'lunge'); }
  hitbox() {
    if (this.dead) return null;
    return new Phaser.Geom.Rectangle(this.x - 220, this.groundY - 105, 360, 100);
  }
  get centre() { return [this.x - 60, this.groundY - 70]; }
  destroy() { this.p.destroy(); }
}

// ---------------- Swamp bat: swoops in at a low or high lane. Jump/slide accordingly, or blast it. ----------------
export class Bat extends Creature {
  /** lane: 'low' (jump it) or 'high' (slide under it) */
  constructor(scene, x, groundY, lane = 'high') {
    super(scene, x, 'bat');
    this.groundY = groundY; this.lane = lane; this.p = new Puppet(scene, 'bat', 0.4, ['farWing', 'body', 'nearWing'], 7);
    this.R = this.p.R; this.points = 50;
    this.laneY = lane === 'low' ? groundY - 70 : groundY - 215;
    this.y = groundY - 560; this.vy = 0;
  }
  update(dt, ctx) {
    this.common(dt);
    const P = this.p.parts;
    this.x -= ctx.scroll;
    let rot = 0, flapSpeed = 16, flap;
    if (this.dead) {   // tumbles out of the sky
      this.vy += 2400 * dt; this.y += this.vy * dt; rot = this.deadT * 720; flapSpeed = 4;
      if (this.y > this.groundY + 200) this.gone = true;
    } else {
      this.x -= 260 * dt;
      const gap = this.x - ctx.gx;
      // swoop: comes in high, dives into its lane as it closes in, with a little wobble
      const k = clamp(1 - (gap - 250) / 900, 0, 1);
      const target = (this.groundY - 560) + (this.laneY - (this.groundY - 560)) * ease(k);
      this.y += (target - this.y) * Math.min(1, dt * 6);
      this.y += 6 * Math.sin(this.t * 7);
      rot = -10 * ease(k) * (1 - ease(k)) * 4;
      if (this.recoilT > 0) { this.recoilT -= dt; rot += 30 * Math.sin(this.recoilT * 40); }
    }
    flap = Math.sin(this.t * flapSpeed);
    P.farWing.rotation = (-20 * flap) * Math.PI / 180; P.farWing.scaleY = 0.75 + 0.25 * flap;
    P.nearWing.rotation = (22 * flap) * Math.PI / 180; P.nearWing.scaleY = 0.7 + 0.3 * flap;
    this.p.root.setPosition(this.x, this.y).setRotation(rot * Math.PI / 180);
    if (this.x < -300) this.gone = true;
  }
  onHurt() { this.recoilT = 0.25; }
  hitbox() { if (this.dead) return null; return new Phaser.Geom.Rectangle(this.x - 80, this.y - 50, 150, 95); }
  get centre() { return [this.x, this.y]; }
  destroy() { this.p.destroy(); }
}

// ---------------- Web spider: hangs from a branch, the web trembles, then it drops into the path. ----------------
export class Spider extends Creature {
  constructor(scene, x, groundY, branchY = 140) {
    super(scene, x, 'spider');
    this.groundY = groundY; this.branchY = branchY; this.p = new Puppet(scene, 'spider', 0.4, ['legsL', 'legsR', 'body'], 7);
    this.R = this.p.R; this.points = 50; this.st = 'hang'; this.stT = 0;
    this.hangY = branchY + 90;                  // waiting high up
    this.dropY = groundY - 245;                 // drops to head height: slide under it, or blast it
    this.y = this.hangY; this.web = scene.add.graphics().setDepth(6);
    this.branch = scene.add.graphics().setDepth(5);
  }
  update(dt, ctx) {
    this.common(dt);
    const P = this.p.parts, k = this.p.k;
    this.x -= ctx.scroll;
    let legs = 3 * Math.sin(this.t * 4), shake = 0, rot = 0;
    const gap = this.x - ctx.gx;
    if (this.dead) {
      legs = -28 * Math.min(1, this.deadT * 5);   // curls up
      this.vy = (this.vy || 0) + 2600 * dt; this.y += this.vy * dt; rot = this.deadT * 200;
      if (this.y > this.groundY + 200) this.gone = true;
    } else {
      this.stT += dt;
      if (this.st === 'hang') { if (gap < 760 && gap > 0) { this.st = 'tremble'; this.stT = 0; } }
      else if (this.st === 'tremble') {   // fair warning: the thread and the spider quiver
        shake = 7 * Math.sin(this.stT * 70); legs = 12 * Math.sin(this.stT * 50);
        if (this.stT > 0.65) { this.st = 'drop'; this.stT = 0; this.vy = 0; }
      } else if (this.st === 'drop') {
        this.vy += 4200 * dt; this.y += this.vy * dt; legs = -15;
        if (this.y >= this.dropY) { this.y = this.dropY; this.st = 'bounce'; this.stT = 0; }
      } else if (this.st === 'bounce') {
        this.y = this.dropY - 40 * Math.exp(-this.stT * 6) * Math.abs(Math.sin(this.stT * 14)); legs = 10 * Math.sin(this.stT * 20);
        if (this.stT > 2.2) { this.st = 'climb'; this.stT = 0; }
      } else if (this.st === 'climb') { this.y = Math.max(this.hangY, this.y - 500 * dt); legs = 14 * Math.sin(this.t * 18); }
      if (this.recoilT > 0) { this.recoilT -= dt; rot = 20 * Math.sin(this.recoilT * 40); }
    }
    P.legsL.rotation = legs * Math.PI / 180; P.legsR.rotation = -legs * Math.PI / 180;
    this.p.root.setPosition(this.x + shake, this.y).setRotation(rot * Math.PI / 180);
    // web thread from the branch to the spider's back
    const top = this.p.R._top, B = this.p.R.body;
    const ax = this.x + shake + (top[0] - B.px) * k, ay = this.y + (top[1] - B.py) * k;
    this.web.clear();
    if (!this.dead || this.deadT < 0.05) {
      this.web.lineStyle(3, 0xd8e6c0, 0.85).beginPath(); this.web.moveTo(ax - shake * 0.2, this.branchY);
      const midX = ax + (this.st === 'tremble' ? 10 * Math.sin(this.stT * 90) : 0);
      this.web.lineTo(midX, (this.branchY + ay) / 2); this.web.lineTo(ax, ay); this.web.strokePath();
    }
    this.branch.clear().fillStyle(0x2f2216, 1).fillRoundedRect(this.x - 220, this.branchY - 18, 440, 30, 14)
      .fillStyle(0x5f7a22, 0.9).fillEllipse(this.x - 120, this.branchY - 16, 70, 18).fillEllipse(this.x + 90, this.branchY - 16, 60, 16);
    if (this.x < -400) this.gone = true;
  }
  onHurt() { this.recoilT = 0.25; }
  get warning() { return !this.dead && (this.st === 'tremble' || this.st === 'drop'); }
  hitbox() { if (this.dead || this.st === 'hang' || this.st === 'climb' && this.y < this.dropY - 150) return null; return new Phaser.Geom.Rectangle(this.x - 110, this.y - 70, 220, 140); }
  get centre() { return [this.x, this.y]; }
  destroy() { this.p.destroy(); this.web.destroy(); this.branch.destroy(); }
}

export const CREATURE_PARTS = {
  frog: ['body', 'jaw', 'hind', 'front'], gator: ['body', 'jaw', 'legA', 'legB', 'legC', 'tail'],
  bat: ['body', 'farWing', 'nearWing'], spider: ['body', 'legsL', 'legsR'],
};
// World 2 creatures (loaded when World 2 starts)
export const MEADOW_CREATURE_PARTS = { bunny: ['body', 'ears'], kitten: ['body', 'tail'], flower: ['body', 'head'], swarm: ['body'] };
