// Visual effects owned by the gremlin: dust, sparks, magic rings, double-jump swirl,
// hit shock lines, Meltdown aura / lightning / rocks / eye glow / blast, dizzy stars.
// All drawn with Phaser Graphics plus a soft 'glow' texture made in the Boot scene.
import { TAU, clamp, seg } from './poses.js?v=20261015125752';

const rnd = (a, b) => a + Math.random() * (b - a);
const VIOLET = 0x9b4dff, MAGENTA = 0xee2a8a, ACID = 0xc6f135;

export class Effects {
  constructor(scene, g) {
    this.scene = scene; this.g = g; this.p = []; this.bolts = []; this.boltT = 0;
    this.back = scene.add.graphics().setDepth(9);
    this.auraImg = scene.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xa050ff).setDepth(9.5).setVisible(false);
    this.auraG = scene.add.graphics().setDepth(9.6).setBlendMode(Phaser.BlendModes.ADD);
    this.front = scene.add.graphics().setDepth(11);
    this.add = scene.add.graphics().setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
    this.eyeGlow = scene.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(ACID).setDepth(12).setVisible(false);
  }
  get k() { return this.g.k; }

  // ---------- emitters ----------
  burst(c, size) {
    this.p.push({ k: 'ring', x: c[0], y: c[1], r: 20, life: 0.42, max: 0.42, grow: 900 * size });
    for (let i = 0; i < 28 * size; i++) {
      const a = Math.random() * TAU, v = rnd(500, 1400) * size;
      this.p.push({ k: 'spark', x: c[0], y: c[1], vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.35, 0.7), max: 0.7,
        col: Math.random() < 0.6 ? VIOLET : (Math.random() < 0.5 ? MAGENTA : ACID), sz: rnd(3, 7) });
    }
  }
  muzzle(c) { this.p.push({ k: 'ring', x: c[0], y: c[1], r: 6, life: 0.18, max: 0.18, grow: 500 }); }
  shock(c) { for (let i = 0; i < 6; i++) this.p.push({ k: 'line', x: c[0], y: c[1], a: -Math.PI / 2 + (i - 2.5) * 0.42, life: 0.32, max: 0.32 }); }
  dust(n, str, pos) {
    const c = pos || [this.g.x - 60 * this.k * this.g.face, this.g.groundY - this.g.S.h * this.k];
    for (let i = 0; i < n; i++) this.p.push({ k: 'dust', x: c[0] + rnd(-25, 25), y: c[1] - Math.random() * 8,
      vx: -rnd(80, 340) * str * this.g.face, vy: -rnd(30, 150) * str, life: rnd(0.4, 0.7), max: 0.7, sz: rnd(7, 18) });
  }
  meltdownTick(dt, t) {
    const c = this.g.centre(), k = this.k;
    if (t > 0.4 && t < 1.3 && Math.random() < dt * 22) this.p.push({ k: 'rock', x: c[0] + rnd(-160, 160) * k, y: this.g.groundY - 4,
      vx: rnd(-30, 30), vy: -rnd(150, 320), life: rnd(0.8, 1.3), max: 1.3, rot: rnd(0, 6), vr: rnd(-4, 4), sz: rnd(8, 16) * k * 2.4 });
    if (t > 0.1 && t < 1.6 && Math.random() < dt * 50) this.p.push({ k: 'wisp', x: c[0] + rnd(-220, 220) * k, y: c[1] + rnd(-100, 260) * k,
      vx: rnd(-40, 40), vy: -rnd(200, 500), life: rnd(0.4, 0.8), max: 0.8, col: Math.random() < 0.7 ? VIOLET : MAGENTA, sz: rnd(3, 7) });
    this.boltT -= dt;
    if (this.boltT <= 0) {
      this.boltT = 0.06; this.bolts = [];
      for (let n = 0; n < 3; n++) {
        const a = rnd(0, TAU), r0 = rnd(140, 260) * k, len = rnd(150, 260) * k, d = a + rnd(-0.9, 0.9);
        let x = c[0] + Math.cos(a) * r0, y = c[1] + Math.sin(a) * r0; const pts = [[x, y]];
        for (let i = 0; i < 6; i++) { x += Math.cos(d) * len / 6 + rnd(-18, 18) * k; y += Math.sin(d) * len / 6 + rnd(-18, 18) * k; pts.push([x, y]); }
        this.bolts.push(pts);
      }
    }
  }

  // ---------- per-frame ----------
  update(dt, scroll, P) {
    const m = 1.2 * this.k * 4;   // particle speeds are tuned in art-ish units
    for (const p of this.p) {
      p.life -= dt;
      if (p.k === 'ring') { p.r += p.grow * dt * this.k * 4; continue; }
      if (p.k === 'line') continue;
      p.x += p.vx * dt * m * 0.25 - (p.k === 'dust' || p.k === 'rock' ? scroll : 0); p.y += p.vy * dt * m * 0.25;
      if (p.k === 'spark') { p.vx *= 0.92; p.vy *= 0.92; p.vy += 500 * dt; }
      else if (p.k === 'wisp') p.vx *= 0.96;
      else if (p.k === 'rock') p.rot += p.vr * dt;
      else { p.vx *= 0.95; p.vy *= 0.9; }
    }
    this.p = this.p.filter(p => p.life > 0);
    this.draw(P);
  }

  draw(P) {
    const g = this.g, S = g.S, k = this.k, B = this.back, F = this.front, A = this.add, AG = this.auraG;
    B.clear(); F.clear(); A.clear(); AG.clear();
    const c = g.centre();
    // shadow, shrinking as the gremlin rises
    const fl = g.floorAt ? g.floorAt(g.x) : 0;
    const air = clamp((S.h - fl / k) / 600, 0, 1), wide = (S.st === 'slide' || S.st === 'dead') ? 230 : 170;
    B.fillStyle(0x000000, 0.28 * (1 - air * 0.7)).fillEllipse(g.x, g.groundY - fl + 2, wide * 2 * k * (1 - air * 0.5), 32 * k);
    for (const p of this.p) {
      const a = clamp(p.life / p.max, 0, 1);
      if (p.k === 'dust') B.fillStyle(0x786850, 0.5 * a).fillCircle(p.x, p.y, p.sz * (1.6 - a));
      if (p.k === 'rock') {
        const s = p.sz, pts = [[-1, -.6], [-.2, -1], [.9, -.5], [1, .5], [.1, 1], [-.9, .6]].map(([x, y]) => {
          const cs = Math.cos(p.rot), sn = Math.sin(p.rot); return { x: p.x + (x * cs - y * sn) * s, y: p.y + (x * sn + y * cs) * s }; });
        B.fillStyle(0x463a50, a).fillPoints(pts, true); B.lineStyle(2, 0xbe5aff, 0.8 * a).strokePoints(pts, true);
      }
    }
    // Meltdown aura
    const gl = P.glow || 0;
    this.auraImg.setVisible(gl > 0.01);
    if (gl > 0.01) {
      const R = (470 + 40 * Math.sin(S.t * 14)) * k;
      this.auraImg.setPosition(c[0], c[1]).setDisplaySize(R * 2, R * 2).setAlpha(0.75 * gl);
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * TAU + S.t * 1.7, rr = R * 0.52, x = c[0] + Math.cos(a) * rr * 0.75, y = c[1] + Math.sin(a) * rr;
        const len = (110 + 70 * Math.sin(S.t * 19 + i * 1.7)) * k * gl;
        AG.fillStyle(i % 3 ? VIOLET : MAGENTA, 0.45 * gl).fillTriangle(x - 14 * k, y, x + 14 * k, y, x + 18 * k * Math.sin(S.t * 23 + i), y - len);
      }
    }
    // double-jump swirl
    if (S.st === 'spin') {
      const a = 1 - clamp(S.stT / 0.42, 0, 1), sp = (P.spin || 0) * Math.PI / 180, R = 330 * k;
      for (let i = 0; i < 3; i++) {
        A.lineStyle((6 - i) * 1.6, i === 1 ? MAGENTA : VIOLET, (i === 1 ? 0.8 : 0.9) * a);
        A.beginPath(); A.arc(c[0], c[1], R * (0.9 + 0.12 * i), sp + i * TAU / 3, sp + i * TAU / 3 + 2.1); A.strokePath();
      }
    }
    // eye glow + streaks
    this.eyeGlow.setVisible(gl > 0.01);
    if (gl > 0.01) {
      const e = g.pupilPoint(), r = 90 * k * (0.8 + 0.2 * Math.sin(S.t * 30));
      this.eyeGlow.setPosition(e[0], e[1]).setDisplaySize(r * 2.4, r * 2.4).setAlpha(gl);
      A.lineStyle(5, ACID, 0.8 * gl);
      for (let i = 0; i < 3; i++) A.lineBetween(e[0] - 10 * k * g.face, e[1] + (i - 1) * 14 * k, e[0] - (120 + 40 * i) * k * gl * g.face, e[1] + (i - 1) * 24 * k - 20 * k);
    }
    // lightning
    if (gl > 0.55) for (const b of this.bolts) {
      A.lineStyle(9, VIOLET, 0.5 * gl).strokePoints(b.map(([x, y]) => ({ x, y })));
      A.lineStyle(3, 0xe1beff, 0.9 * gl).strokePoints(b.map(([x, y]) => ({ x, y })));
    }
    // Meltdown blast beam
    if (S.st === 'melt' && S.stT >= 1.3 && S.stT <= 1.9) {
      const t = S.stT, kk = seg(t, 1.3, 1.38), f = 1 - seg(t, 1.55, 1.9), w = (90 + 40 * Math.sin(t * 60)) * k * kk * f;
      const h = g.handPoint(), x1 = g.face > 0 ? (this.scene.viewW || this.scene.scale.width) + 50 : -50;
      [[2.6, 0x7828e6, 0.35], [1.7, VIOLET, 0.6], [1.1, MAGENTA, 0.55], [0.55, 0xfff0ff, 0.95]].forEach(([mm, col, al]) => {
        A.fillStyle(col, al);
        A.fillPoints([{ x: h[0], y: h[1] - w * mm * 0.3 }, { x: x1, y: h[1] - w * mm }, { x: x1, y: h[1] + w * mm }, { x: h[0], y: h[1] + w * mm * 0.3 }], true);
        A.fillCircle(h[0], h[1], w * mm * 0.7);
      });
    }
    // particles in front
    for (const p of this.p) {
      const a = clamp(p.life / p.max, 0, 1);
      if (p.k === 'line') {
        const r0 = 240 * k * (1.1 - a) * 0.6, r1 = r0 + 240 * k;
        F.lineStyle(5, 0xffffff, a).lineBetween(p.x + Math.cos(p.a) * r0, p.y + Math.sin(p.a) * r0, p.x + Math.cos(p.a) * r1, p.y + Math.sin(p.a) * r1);
      }
      if (p.k === 'ring') {
        A.lineStyle(3 + 8 * a, VIOLET, a).strokeCircle(p.x, p.y, p.r);
        A.lineStyle(2, MAGENTA, a * 0.7).strokeCircle(p.x, p.y, p.r * 0.72);
      }
      if (p.k === 'spark' || p.k === 'wisp') A.fillStyle(p.col, a).fillCircle(p.x, p.y, p.sz * (p.k === 'wisp' ? 0.5 + a : 1));
    }
    // dizzy stars when flopped
    if (S.st === 'dead') {
      const hp = g.headPoint();
      for (let i = 0; i < 3; i++) {
        const a = S.t * 4 + i * TAU / 3, x = hp[0] + Math.cos(a) * 110 * k, y = hp[1] - 30 * k + Math.sin(a) * 30 * k, r = (16 + 4 * Math.sin(a)) * k * 1.6;
        const pts = []; for (let j = 0; j < 10; j++) { const rr = j % 2 ? r * 0.45 : r, aa = j * Math.PI / 5 - Math.PI / 2; pts.push({ x: x + Math.cos(aa) * rr, y: y + Math.sin(aa) * rr }); }
        F.fillStyle(i === 1 ? ACID : 0xc79bff, 1).fillPoints(pts, true);
      }
    }
  }
}
