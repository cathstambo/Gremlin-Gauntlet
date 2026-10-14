// The playable gremlin: a cut-out rig built from the approved artwork.
// Each body part is a Phaser Image hung on a chain of containers (one per joint); every frame the
// joints are rotated from the current pose. Nothing is redrawn, so the character always matches
// the approved design. Collision uses a separate hitbox that ignores ears, scarf and effects.
import {
  TAU, clamp, ease, seg, lerpPose, runPose, crouchPose, risePose, fallPose, tuckPose, slidePose, hurtPose,
  dieAirPose, deadPose, winPose, idlePose, meltPose, meltLift, MELT_T, MELT_BLAST_AT,
} from './poses.js';
import { Effects } from './Effects.js';

// ---- tuning: placeholders until playtesting (art units; the gremlin is ~800 units tall) ----
export const TUNING = {
  gravity: 5600, jumpV: 2600, doubleJumpV: 2300, slideTime: 1.3, spinTime: 0.42,
  hurtV: 1400, invulnTime: 1.5, dieV: 2000, attackTime: 0.32, attackCooldown: 0.24,
};

// ---- 2D matrix helpers (used for contact points and effect positions) ----
const M = {
  mul: (a, b) => [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]],
  t: (x, y) => [1, 0, 0, 1, x, y],
  r: deg => { const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [c, s, -s, c, 0, 0]; },
  s: (x, y) => [x, 0, 0, y ?? x, 0, 0],
  ap: (m, x, y) => [m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5]],
};

const SPIN_C = [400, 470];                  // spin around the gremlin's middle, not the hips
const HIP_N = [380, 600], HIP_F = [404, 604];
const AIRBORNE = new Set(['air', 'spin', 'hurt', 'die', 'melt']);
const FREE = new Set(['run', 'land', 'slideOut']);   // states that accept a new move
// Hitboxes in art units, measured on the upright drawing (sole line = 812). Ears, hair tufts and scarf are left out on purpose.
const BOX_STAND = { x0: 330, x1: 560, y0: 190, y1: 812 };
const BOX_SLIDE = { x0: 250, x1: 680, y0: 600, y1: 812 };

export class Gremlin extends Phaser.Events.EventEmitter {
  constructor(scene, x, groundY, height) {
    super();
    this.scene = scene;
    this.rig = scene.cache.json.get('rig');
    this.x = x; this.groundY = groundY;
    this.k = height / 800;                   // art units → screen pixels
    this.B = this.piv('body');
    this.S = {
      t: 0, st: 'idle', stT: 0, from: null, blend: 0.12, last: null,
      h: 0, vy: 0, usedDouble: false, spinT: -1, lockL: 0, lock: 1, airL: 0,
      atkT: -1, shotFired: false, inv: 0, flash: 0, blasted: false,
      ear: { a: 0, v: 0 }, pouch: { a: 0, v: 0 }, prevRootY: null, prevVy: 0,
      speed: 1500, move: 0, prevFoot: null, rootY: 0, stompQ: -1,
    };
    this.fx = new Effects(scene, this);
    this.buildDisplay();
    this.update(0);
  }
  piv(n) { return [this.rig[n].px, this.rig[n].py]; }

  // ---------- display: one container chain per drawn part ----------
  buildDisplay() {
    const sc = this.scene, R = this.rig;
    this.root = sc.add.container(this.x, this.groundY).setScale(this.k).setDepth(10);
    this.spinC = sc.add.container(SPIN_C[0] - this.B[0], SPIN_C[1] - this.B[1]);
    this.spinBack = sc.add.container(-(SPIN_C[0] - this.B[0]), -(SPIN_C[1] - this.B[1]));
    this.squash = sc.add.container(0, 0);
    this.bodyC = sc.add.container(0, 0);
    this.root.add(this.spinC); this.spinC.add(this.spinBack); this.spinBack.add(this.squash); this.squash.add(this.bodyC);
    const ua = R.upperArm;
    // joint name → [parent part, where the joint sits in the parent's art space]
    this.J = {
      head: ['body', this.piv('head')], eye: ['head', this.piv('eye')], ear: ['head', this.piv('ear')],
      tail: ['body', this.piv('tail')], pouch: ['body', this.piv('pouch')],
      upperArm: ['body', this.piv('upperArm')], foreArm: ['upperArm', this.piv('foreArm')],
      upperArmFar: ['body', [ua.px + 16, ua.py - 6]], foreArmFar: ['upperArmFar', this.piv('foreArmFar')],
      thighN: ['body', HIP_N], bootN: ['thighN', this.piv('bootN')],
      thighFfar: ['body', HIP_F], bootFfar: ['thighFfar', this.piv('bootFfar')],
    };
    this.jointCs = {};                       // joint name → every container standing for it
    const chainFor = names => {
      let parent = this.bodyC;
      for (const n of names) {
        const [pName, at] = this.J[n], pp = pName === 'body' ? this.B : this.piv(pName);
        const c = sc.add.container(at[0] - pp[0], at[1] - pp[1]);
        parent.add(c); parent = c; (this.jointCs[n] ||= []).push(c);
      }
      return parent;
    };
    const img = (name, parent) => {
      const p = R[name];
      const im = sc.add.image(p.x - p.px, p.y - p.py, 'g_' + name).setOrigin(0, 0);
      parent.add(im); (this.images ||= []).push(im); return im;
    };
    // back-to-front drawing order
    img('foreArmFar', chainFor(['upperArmFar', 'foreArmFar']));
    img('upperArmFar', chainFor(['upperArmFar']));
    img('thighFfar', chainFor(['thighFfar']));
    img('bootFfar', chainFor(['thighFfar', 'bootFfar']));
    img('thighN', chainFor(['thighN']));
    img('ear', chainFor(['head', 'ear']));
    const headForSpikes = chainFor(['head']);
    this.spikes = sc.add.graphics(); this.spikes.setPosition(-R.head.px, -R.head.py); headForSpikes.add(this.spikes);
    img('head', chainFor(['head']));
    img('eye', chainFor(['head', 'eye']));
    // scarf tails: thin vertical strips that ripple like cloth
    const tailC = chainFor(['tail']), tp = R.tail; this.tailStrips = [];
    const N = 36, sw = tp.w / N;
    for (let i = 0; i < N; i++) {
      const im = sc.add.image(tp.x - tp.px, tp.y - tp.py, 'g_tail').setOrigin(0, 0);
      im.setCrop(i * sw, 0, sw + 1.5, tp.h); im.stripD = clamp((tp.px - (tp.x + i * sw)) / (tp.px - tp.x), 0, 1);
      tailC.add(im); this.tailStrips.push(im); this.images.push(im);
    }
    img('body', this.bodyC);
    img('pouch', chainFor(['pouch']));
    img('bootN', chainFor(['thighN', 'bootN']));
    img('foreArm', chainFor(['upperArm', 'foreArm']));
    img('upperArm', chainFor(['upperArm']));
  }

  // ---------- pure geometry (art space, root = body pivot) ----------
  build(P) {
    const B = this.B, X = {};
    let root = M.s(P.sx, P.sy);
    if (P.spin) { const cx = SPIN_C[0] - B[0], cy = SPIN_C[1] - B[1]; root = M.mul(M.mul(M.t(cx, cy), M.r(P.spin)), M.mul(M.t(-cx, -cy), root)); }
    X.body = M.mul(root, M.r(P.lean));
    const ang = this.angles(P);
    const order = ['head', 'eye', 'ear', 'tail', 'pouch', 'upperArm', 'foreArm', 'upperArmFar', 'foreArmFar', 'thighN', 'bootN', 'thighFfar', 'bootFfar'];
    for (const n of order) {
      const [pName, at] = this.J[n], pp = pName === 'body' ? B : this.piv(pName);
      X[n] = M.mul(X[pName], M.mul(M.t(at[0] - pp[0], at[1] - pp[1]), M.r(ang[n])));
    }
    return X;
  }
  angles(P) {
    const S = this.S;
    return { head: P.head, eye: 0, ear: S.ear.a, tail: P.tailBase, pouch: S.pouch.a, upperArm: P.armN, foreArm: P.foreN,
      upperArmFar: P.armF, foreArmFar: P.foreF, thighN: P.near.thighW - P.lean, bootN: P.near.knee,
      thighFfar: P.far.thighW - P.lean, bootFfar: P.far.knee };
  }
  at(X, n, x, y) { return M.ap(X[n], x - this.rig[n].px, y - this.rig[n].py); }
  soles(X) {
    const s = this.rig._soles;
    return { near: s.bootN.map(([x, y]) => this.at(X, 'bootN', x, y)), far: s.bootF.map(([x, y]) => this.at(X, 'bootFfar', x, y)) };
  }
  lowest(X) {
    const sp = this.soles(X), ys = [...sp.near, ...sp.far].map(q => q[1]);
    [[505,500],[470,590],[400,632],[330,615],[520,440],[300,470],[290,540],[268,600]].forEach(([x, y]) => ys.push(this.at(X, 'body', x, y)[1]));
    [[560,330],[490,385],[420,60],[330,180],[300,330]].forEach(([x, y]) => ys.push(this.at(X, 'head', x, y)[1]));
    ys.push(this.at(X, 'foreArm', 400, 700)[1]);
    return Math.max(...ys);
  }
  // art-space point → screen
  toScreen(X, n, x, y) { const q = n === 'root' ? [x, y] : this.at(X, n, x, y); return [this.x + q[0] * this.k, this.groundY + (this.S.rootY + q[1]) * this.k]; }

  // ---------- moves ----------
  go(st, blend) { const S = this.S; S.from = S.last || runPose(S.t); S.st = st; S.stT = 0; S.blend = blend; this.emit('state', st); }
  leaveGround() { const S = this.S; if (!AIRBORNE.has(S.st)) { S.airL = S.lockL; S.h = 0; } S.lock = 0; }
  get state() { return this.S.st; }
  get dead() { return this.S.st === 'die' || this.S.st === 'dead'; }
  get invulnerable() { return this.S.inv > 0 || this.S.st === 'melt' || this.dead; }
  /** Scroll speed of the world in screen pixels per second (matches the planted foot, so feet never skate). */
  get worldSpeed() { return this.S.speed * this.S.move * this.k * (this.S.st === 'slide' ? 1.05 : 1); }

  jump() {
    const S = this.S;
    if (FREE.has(S.st)) { this.go('crouch', 0.05); return true; }
    if (S.st === 'air' && !S.usedDouble) {     // double jump always adds height, so it always lasts longer than a single jump
      S.usedDouble = true; S.vy = Math.max(TUNING.doubleJumpV, S.vy + TUNING.doubleJumpV * 0.5);
      this.go('spin', 0.06); S.spinT = 0; this.fx.burst(this.centre(), 1); return true;
    }
    return false;
  }
  slide() { if (FREE.has(this.S.st)) { this.go('slide', 0.12); this.fx.dust(10, 1.4); return true; } return false; }
  attack() {
    const S = this.S;
    if (['spin', 'hurt', 'die', 'dead', 'melt', 'crouch', 'victory'].includes(S.st)) return false;
    if (S.atkT >= 0 && S.atkT < TUNING.attackCooldown) return false;
    S.atkT = 0; S.shotFired = false; return true;
  }
  /** Take one heart of damage. Returns false while invulnerable. */
  hurt() {
    const S = this.S; if (this.invulnerable) return false;
    this.leaveGround(); S.vy = TUNING.hurtV; S.spinT = -1; S.atkT = -1; S.inv = TUNING.invulnTime; S.flash = 0.1;
    this.go('hurt', 0.05); this.fx.shock(this.headPoint()); return true;
  }
  die() {
    const S = this.S; if (this.dead) return;
    this.leaveGround(); S.vy = TUNING.dieV; S.spinT = -1; S.atkT = -1; S.inv = 0; S.flash = 0.1;
    this.go('die', 0.06); this.fx.shock(this.headPoint());
  }
  win() { if (this.dead || AIRBORNE.has(this.S.st)) return false; this.S.atkT = -1; this.go('victory', 0.18); return true; }
  meltdown() {
    const S = this.S; if (!FREE.has(S.st) && S.st !== 'slide') return false;
    this.leaveGround(); S.atkT = -1; S.blasted = false; this.go('melt', 0); return true;
  }
  /** Stand still in the smug idle stance (title screen). */
  idle() { this.S.move = 0; this.go('idle', 0.2); }
  /** Start running from idle. */
  run() { if (this.S.st === 'idle') this.go('run', 0.2); }
  revive() { const S = this.S; S.inv = 0; S.h = 0; S.vy = 0; S.lock = 1; S.move = 0; this.go('run', 0.25); }

  targetPose() {
    const S = this.S, t = S.t;
    switch (S.st) {
      case 'crouch': case 'land': return crouchPose();
      case 'air': return lerpPose(risePose(), fallPose(t), ease(clamp((520 - S.vy) / 1500, 0, 1)));
      case 'spin': return tuckPose();
      case 'slide': return slidePose(t);
      case 'hurt': return hurtPose(t);
      case 'die': return dieAirPose(t);
      case 'dead': return deadPose(S.stT);
      case 'victory': return winPose(S.stT);
      case 'melt': return meltPose(S.stT, t);
      case 'idle': return idlePose(S.stT);
      default: return runPose(t);
    }
  }
  // The magic attack only moves the near arm, so it layers over running, jumping or sliding.
  applyAttack(P) {
    const t = this.S.atkT; if (t < 0) return P;
    const w = ease(seg(t, 0, 0.05)) * (1 - ease(seg(t, 0.2, TUNING.attackTime)));
    const wind = 1 - seg(t, 0.03, 0.08);
    const armWorld = -72 + 60 * wind, foreRel = 2 - 40 * wind;
    P.armN += ((armWorld - P.lean) - P.armN) * w;
    P.foreN += (foreRel - P.foreN) * w;
    return P;
  }
  centre() { return this.toScreen(this.X, 'root', SPIN_C[0] - this.B[0], SPIN_C[1] - this.B[1]); }
  handPoint() { return this.toScreen(this.X, 'foreArm', 420, 690); }
  headPoint() { return this.toScreen(this.X, 'head', 520, 140); }
  pupilPoint() { return this.toScreen(this.X, 'head', this.rig._pupil[0], this.rig._pupil[1]); }

  /** Screen-space collision box, or null when the gremlin can't be hit at all (dead). */
  hitbox() {
    const S = this.S; if (this.dead) return null;
    const b = (S.st === 'slide') ? BOX_SLIDE : BOX_STAND, k = this.k;
    const feet = this.groundY - S.h * k;
    const bx = this.x - this.B[0] * k;
    return new Phaser.Geom.Rectangle(bx + b.x0 * k, feet - (812 - b.y0) * k, (b.x1 - b.x0) * k, (b.y1 - b.y0) * k);
  }

  // ---------- simulation ----------
  update(dt) {
    const S = this.S, T = TUNING;
    S.t += dt; S.stT += dt;
    S.inv = Math.max(0, S.inv - dt); S.flash = Math.max(0, S.flash - dt);
    if (S.st === 'crouch' && S.stT >= 0.07) { S.vy = T.jumpV; S.h = 0; S.usedDouble = false; S.airL = S.lockL; S.lock = 0; this.go('air', 0.1); }
    if (S.st === 'spin') { S.spinT += dt; if (S.spinT >= T.spinTime) { S.spinT = -1; this.go('air', 0.12); } }
    if (['air', 'spin', 'hurt', 'die'].includes(S.st)) {
      S.vy -= T.gravity * dt; S.h += S.vy * dt;
      if (S.h <= 0 && S.vy < 0) {
        S.h = 0; S.vy = 0; S.lock = 0;
        if (S.st === 'die') { this.go('dead', 0.22); this.scene.cameras.main.shake(250, 0.006); this.fx.dust(14, 1.2); this.emit('died'); }
        else { this.go('land', 0.06); this.fx.dust(8, 0.8); this.emit('landed'); }
      }
    }
    if (S.st === 'melt') {
      const t = S.stT; S.h = meltLift(t);
      this.fx.meltdownTick(dt, t);
      if (t >= MELT_BLAST_AT && !S.blasted) {
        S.blasted = true; const h = this.handPoint();
        this.scene.cameras.main.shake(400, 0.012); this.scene.cameras.main.flash(250, 230, 200, 255);
        this.fx.burst(h, 1.6); this.emit('meltBlast', { x: h[0], y: h[1] });
      }
      if (t >= MELT_T) { S.blasted = false; S.h = 0; S.vy = 0; this.go('run', 0.1); S.lock = 0; }
    }
    if (S.st === 'land' && S.stT >= 0.13) this.go('run', 0.16);
    if (S.st === 'slide') { if (Math.random() < dt * 28) this.fx.dust(1, 1); if (S.stT >= T.slideTime) this.go('slideOut', 0.16); }
    if (S.st === 'slideOut' && S.stT >= 0.16) this.go('run', 0.1);
    if (S.lock < 1 && !AIRBORNE.has(S.st)) S.lock = Math.min(1, S.lock + dt / 0.08);
    if (S.atkT >= 0) {
      S.atkT += dt;
      if (!S.shotFired && S.atkT >= 0.08) { S.shotFired = true; const h = this.handPoint(); this.fx.muzzle(h); this.emit('shoot', { x: h[0], y: h[1] }); }
      if (S.atkT >= T.attackTime) S.atkT = -1;
    }
    if (S.st === 'victory') {
      const q = Math.floor(S.stT / 0.26);
      if (q !== S.stompQ) { S.stompQ = q; if (S.stT > 0.2) this.fx.dust(4, 0.6, [this.x + (q % 2 ? -100 : 60) * this.k, this.groundY]); }
    }

    // pose = blend from the previous pose into this state's pose, plus the attack layer
    let P = lerpPose(S.from || this.targetPose(), this.targetPose(), ease(S.blend ? S.stT / S.blend : 1));
    P.spin = S.spinT >= 0 ? 360 * ease(Math.pow(S.spinT / T.spinTime, 0.8)) : (S.st === 'die' ? -720 * Math.pow(clamp(S.stT / 0.7, 0, 1), 0.85) : 0);
    P = this.applyAttack(P);
    const X = this.build(P); this.X = X;
    const L = this.lowest(X);
    if (S.lock >= 1 || ['run', 'slide', 'slideOut', 'victory', 'dead', 'idle'].includes(S.st)) S.lockL = L;
    S.last = P;
    const groundRoot = -(L + P.hop), airRoot = -(S.airL + S.h);
    const rootY = AIRBORNE.has(S.st) ? airRoot : airRoot + (groundRoot - airRoot) * S.lock;
    S.rootY = rootY;
    // ears and pouch are springs pushed around by vertical motion
    if (S.prevRootY !== null && dt > 0) {
      const vy = (rootY - S.prevRootY) / dt, ay = clamp((vy - S.prevVy) / dt, -9000, 9000); S.prevVy = vy;
      const e = S.ear;
      const tgt = S.st === 'slide' ? -18 : S.st === 'dead' ? 62 : S.st === 'melt' ? -10 + 8 * P.glow * Math.sin(S.t * 50) : (S.st === 'air' ? (S.vy > 0 ? 14 : -12) : -4);
      e.v += (-180 * (e.a - tgt) - 11 * e.v + ay * 0.0105) * dt; e.a = clamp(e.a + e.v * dt, -30, S.st === 'dead' ? 70 : 30);
      const q = S.pouch; q.v += (-260 * (q.a - (-P.lean * 0.85)) - 9 * q.v - ay * 0.004) * dt; q.a += q.v * dt;
    }
    S.prevRootY = rootY;
    // world speed follows the planted foot while running
    const moveTarget = (S.st === 'victory' || S.st === 'dead' || S.st === 'idle') ? 0 : S.st === 'die' ? 0.4 : S.st === 'melt' ? 0.45 : 1;
    S.move += (moveTarget - S.move) * Math.min(1, dt * (moveTarget < S.move ? 3 : 6));
    if (S.st === 'run') {
      const sp = this.soles(X);
      const nearLow = Math.max(...sp.near.map(q => q[1])) >= Math.max(...sp.far.map(q => q[1]));
      const foot = nearLow ? 'near' : 'far', fx = (sp[foot][0][0] + sp[foot][1][0]) / 2;
      if (S.prevFoot && S.prevFoot.foot === foot && dt > 0 && S.move > 0.98) { const v = -(fx - S.prevFoot.x) / dt; if (v > 0) S.speed = S.speed * 0.8 + v * 0.2; }
      S.prevFoot = { foot, x: fx };
    } else S.prevFoot = null;

    this.render(P);
    this.fx.update(dt, this.worldSpeed * dt, P);
  }

  render(P) {
    const S = this.S, ang = this.angles(P);
    this.root.setPosition(this.x, this.groundY + S.rootY * this.k);
    this.spinC.rotation = (P.spin || 0) * Math.PI / 180;
    this.squash.setScale(P.sx, P.sy);
    this.bodyC.rotation = P.lean * Math.PI / 180;
    for (const n in this.jointCs) for (const c of this.jointCs[n]) {
      c.rotation = ang[n] * Math.PI / 180;
      if (n === 'eye') c.setScale(P.eye);
    }
    // scarf ripple
    const fl = (S.st === 'slide' || S.st === 'spin' ? 1.4 : 1) * (P.flap || 1), tp = this.rig.tail;
    for (const im of this.tailStrips) {
      const d = im.stripD, amp = 14 * fl * Math.pow(d, 1.3);
      im.y = tp.y - tp.py + amp * Math.sin(S.t * 17 * Math.min(1.6, fl) - d * 7.5) + 4 * fl * d * d * Math.sin(S.t * 31 - d * 13);
    }
    // Meltdown fur spikes
    this.drawSpikes(P.glow);
    // hit flash (white silhouette) and invulnerability blink (separate from the short ouch reaction)
    const flash = S.flash > 0;
    if (flash !== this._flashing) { this._flashing = flash; for (const im of this.images) flash ? im.setTintFill(0xffffff) : im.clearTint(); }
    this.root.visible = !(S.inv > 0 && S.st !== 'hurt' && Math.floor(S.inv * 12.5) % 2 === 0);
  }
  drawSpikes(g) {
    const gr = this.spikes; gr.clear(); if (g <= 0.01) return;
    const CREST = [[430,70,-60],[470,40,-40],[515,30,-15],[560,50,10],[590,95,35],[395,120,-100],[360,200,-130],[350,300,-160],[400,350,170],[300,330,-170],[330,260,-150]];
    CREST.forEach(([x, y, a0], i) => {
      const len = (70 + 30 * Math.sin(this.S.t * 30 + i * 1.3)) * g, a = a0 * Math.PI / 180, w = 26;
      const tx = x + Math.sin(a) * len * 1.2, ty = y - Math.cos(a) * len * 1.2;
      gr.fillStyle(i % 2 ? 0x4a1f86 : 0x5d2aa4, 1).lineStyle(4, 0x26103a, 1);
      gr.beginPath(); gr.moveTo(x - Math.cos(a) * w, y - Math.sin(a) * w); gr.lineTo(tx, ty); gr.lineTo(x + Math.cos(a) * w, y + Math.sin(a) * w); gr.closePath(); gr.fillPath(); gr.strokePath();
    });
  }
}
