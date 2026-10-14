// Catalytik, THE EVIL OVERLORD: the approved unicorn art as a cut-out rig (same method as the gremlin and Eddie).
// She faces LEFT as drawn (face = 1); face = -1 mirrors her to face right.
// Angles in degrees. Arms/legs: positive swings the limb forward (towards where she faces).
// lean: positive = leans back, negative = hunches forward. head: positive = chin up.
// A move = { d: seconds, pose(t), ev: [[time, eventName, ...args]] }. Events are handled by the Overlord scene.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const ease = k => (k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k));
const D = Math.PI / 180;
const HIP = [220, 760], SOLE = 938;   // rig origin (hip) and the ground line, in art pixels
const BASE = { lean: 0, head: 0, armN: 0, armF: 0, legA: 0, legB: 0, tail: 0, dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, face: 'smug', salmon: null, salmonAng: 0 };
export const P_ = o => Object.assign({}, BASE, o);
export function lerpPose(a, b, k) {
  const o = {};
  for (const key in b) { const va = a[key], vb = b[key]; o[key] = (typeof vb === 'number' && typeof va === 'number') ? va + (vb - va) * k : (k < 0.5 ? va : vb); }
  return o;
}
function keys(t, list) {
  for (let i = 0; i < list.length - 1; i++) {
    const [t0, p0] = list[i], [t1, p1] = list[i + 1];
    if (t <= t1) return lerpPose(typeof p0 === 'function' ? p0(t) : p0, typeof p1 === 'function' ? p1(t) : p1, ease((t - t0) / (t1 - t0)));
  }
  const l = list[list.length - 1][1]; return typeof l === 'function' ? l(t) : l;
}

// ---------- poses ----------
const idle = t => P_({ lean: 1.5 * Math.sin(t * 2), head: 3 * Math.sin(t * 2 + 0.7), armN: 4 * Math.sin(t * 1.7), armF: -3 * Math.sin(t * 1.7 + 0.5),
  tail: 8 * Math.sin(t * 2.4), sy: 1 + 0.012 * Math.sin(t * 2), dy: 0 });
function walk(t, rate = 1) {   // a smug little royal strut
  const q = t * 7.5 * rate, s = Math.sin(q);
  return P_({ lean: -2 + 2 * Math.sin(2 * q), head: 4 * Math.sin(2 * q + 0.4), legA: 20 * s, legB: -20 * s, armN: -14 * s, armF: 14 * s,
    tail: 16 * Math.sin(q * 1.3), dy: -8 * Math.abs(Math.sin(q)), sy: 1 + 0.02 * Math.cos(2 * q) });
}
const crouch = () => P_({ lean: -10, head: -6, legA: 14, legB: -10, armN: 20, armF: 18, sx: 1.06, sy: 0.88, dy: 0 });
const air = () => P_({ lean: 6, head: 10, legA: 34, legB: -24, armN: 70, armF: 60, tail: -20, sx: 0.96, sy: 1.06, face: 'shout' });
const windUp = () => P_({ lean: 14, head: 12, armN: -150, armF: 30, legA: -8, legB: 10, tail: 20, face: 'angry', salmon: 'hand', salmonAng: -40 });
const swingDown = () => P_({ lean: -18, head: -10, armN: 110, armF: -20, legA: 16, legB: -12, tail: -16, face: 'shout', salmon: 'hand', salmonAng: 30 });

export const MOVES = {
  entrance: { d: 5.2, pose: t => keys(t, [[0, idle(t)], [0.35, P_({ lean: 8, head: 16, armN: 120, armF: 40, tail: 30, face: 'shout' })], [2.4, P_({ lean: 8, head: 16 + 2 * Math.sin(t * 20), armN: 124, armF: 44, tail: 30 * Math.sin(t * 5), face: 'shout' })],
    [2.8, P_({ lean: 2, head: 6, armN: 10, armF: 0, face: 'smug' })], [5.2, idle(t)]]),
    ev: [[0.4, 'say', 'WELCOME TO MY FUCKING PARADISE!', 2.0], [2.8, 'say', 'Everything here loves you. Briefly.', 2.2]] },
  // ---- phase 1: Salmon Slapper ----
  fish: { d: 1.15, pose: t => keys(t, [[0, idle(t)], [0.4, P_({ lean: 10, head: 8, armN: -110, armF: 20, tail: 14, face: 'angry' })], [0.55, P_({ lean: -12, head: -6, armN: 120, armF: -10, tail: -10, face: 'shout' })], [1.15, idle(t)]]),
    ev: [[0.52, 'throwFish']] },
  swing: { d: 1.7, pose: t => keys(t, [[0, idle(t)], [0.3, P_({ armN: 40, salmon: 'hand', salmonAng: 60 })], [0.75, windUp()], [0.95, swingDown()], [1.25, swingDown()], [1.7, idle(t)]]),
    ev: [[0.15, 'taunt', 'salmon'], [0.3, 'warn'], [0.93, 'swing']] },
  // the big slam: she lands with the salmon raised and drives it into the ground... and it gets stuck
  slam: { d: 0.5, pose: t => keys(t, [[0, windUp()], [0.16, swingDown()], [0.5, P_({ lean: -26, head: -14, armN: 130, armF: 60, legA: 20, legB: -14, face: 'angry', salmon: null })]]),
    ev: [[0.14, 'salmonStuck']] },
  tug: { d: 3.6, pose: t => {
      const w = Math.sin(t * 18), k = Math.min(1, t * 4) * (1 - ease((t - 3.3) / 0.3));
      return P_({ lean: 22 * k + 3 * w, head: 6 + 4 * w, armN: 120 - 10 * w * k, armF: 100, legA: -20 * k, legB: 16 * k, tail: 20 * w, dx: 30 * k, face: t > 3.2 ? 'surprised' : 'angry', sx: 1 - 0.02 * w });
    }, ev: [[0.1, 'vulnerable', 3.1], [0.2, 'say', 'COME OUT, YOU SLIPPERY BASTARD!', 1.6], [3.3, 'salmonFree']] },
  // ---- phase 2: Spoonageddon ----
  spoons: { d: 1.5, pose: t => keys(t, [[0, idle(t)], [0.45, P_({ lean: 12, head: 16, armN: 150, armF: 140, tail: 24, face: 'shout' })], [1.0, P_({ lean: 12, head: 16, armN: 156, armF: 146, tail: -24, face: 'shout' })], [1.5, idle(t)]]),
    ev: [[0.1, 'taunt', 'spoon'], [0.45, 'spoonVolley']] },
  rain: { d: 1.6, pose: t => keys(t, [[0, idle(t)], [0.4, P_({ lean: 16, head: 26, armN: 170, armF: 10, face: 'shout' })], [1.1, P_({ lean: 16, head: 26 + 4 * Math.sin(t * 20), armN: 170, armF: 10, face: 'shout' })], [1.6, idle(t)]]),
    ev: [[0.1, 'taunt', 'spoon'], [0.4, 'spoonRain']] },
  bounce: { d: 1.3, pose: t => keys(t, [[0, idle(t)], [0.35, P_({ lean: 6, armN: -60, face: 'angry' })], [0.5, P_({ lean: -14, armN: 100, armF: -10, face: 'shout' })], [1.3, idle(t)]]),
    ev: [[0.48, 'spoonBounce']] },
  admire: { d: 3.6, pose: t => {
      const k = ease(t / 0.4) * (1 - ease((t - 3.2) / 0.4));
      return lerpPose(idle(t), P_({ lean: 10, head: 22 + 2 * Math.sin(t * 3), armN: 70, armF: 20, tail: 12 * Math.sin(t * 3), face: 'smug', sy: 1.02 }), k);
    }, ev: [[0.3, 'vulnerable', 3.0], [0.35, 'say', 'Gorgeous. Simply gorgeous. Me, I mean.', 2.2]] },
  // ---- phase 3: Royal Tantrum ----
  hornCharge: { d: 1.4, pose: t => keys(t, [[0, idle(t)], [0.4, P_({ lean: -16, head: -18, armN: 30, armF: 20, legA: 10, legB: -8, face: 'angry' })], [1.4, P_({ lean: -14, head: -16 + 2 * Math.sin(t * 30), armN: 30, armF: 20, legA: 10, legB: -8, face: 'angry' })]]),
    ev: [[0.3, 'hornGlow']] },
  stampede: { d: 2.2, pose: t => keys(t, [[0, idle(t)], [0.4, P_({ lean: 14, head: 22, armN: 160, armF: 150, tail: 30, face: 'shout' })], [1.8, P_({ lean: 14, head: 22 + 3 * Math.sin(t * 25), armN: 164, armF: 154, tail: -30, face: 'shout' })], [2.2, idle(t)]]),
    ev: [[0.2, 'say', 'RELEASE THE FLUFFY BASTARDS!', 2.0], [0.3, 'rumble'], [0.5, 'stampede']] },
  dizzy: { d: 4.0, pose: t => {
      const k = ease(t / 0.3) * (1 - ease((t - 3.7) / 0.3)), w = Math.sin(t * 6);
      return lerpPose(idle(t), P_({ lean: 8 * w, head: 14 * Math.sin(t * 6 + 1), armN: 40 + 20 * w, armF: 30 - 20 * w, legA: 6 * w, legB: -6 * w, tail: -10, face: 'surprised', rot: 4 * w }), k);
    }, ev: [[0.2, 'vulnerable', 3.6], [0.2, 'dizzy', 3.6]] },
  // ---- movement ----
  walk: { d: 99, pose: t => walk(t, 1.2) },
  takeoff: { d: 0.3, pose: t => keys(t, [[0, idle(t)], [0.3, crouch()]]) },
  hop: { d: 99, pose: t => keys(t, [[0, crouch()], [0.14, air()], [99, air()]]) },
  hopSlam: { d: 99, pose: t => keys(t, [[0, crouch()], [0.14, air()], [0.4, windUp()], [99, windUp()]]) },
  land: { d: 0.45, pose: t => keys(t, [[0, crouch()], [0.12, crouch()], [0.45, idle(t)]]) },
  // ---- reactions ----
  hit: { d: 0.5, pose: t => keys(t, [[0, idle(t)], [0.08, P_({ lean: 14, head: 16, armN: -30, armF: -20, face: 'angry' })], [0.5, idle(t)]]) },
  hitHeavy: { d: 1.1, pose: t => keys(t, [[0, idle(t)], [0.1, P_({ lean: 24, head: 24, armN: -60, armF: -50, legA: -10, legB: 14, face: 'surprised', dx: 50 })], [0.5, P_({ lean: 12, head: 10, face: 'angry', dx: 70 })], [1.1, P_(Object.assign(idle(t), { dx: 0 }))]]) },
  // defeat: staggers back clutching her salmon (the scene runs the glitter explosion and the flowerbed)
  defeat: { d: 99, pose: t => {
      const P = keys(t, [[0, idle(t)], [0.3, P_({ lean: 22, head: 22, armN: 60, armF: 40, face: 'angry', dx: 40, salmon: 'hand', salmonAng: 100 })], [2.2, P_({ lean: 16, head: 16, armN: 70, armF: 50, face: 'shout', dx: 60, salmon: 'hand', salmonAng: 100 })],
        [4.3, P_({ lean: 10, head: 12, armN: 70, armF: 50, face: 'surprised', dx: 60, salmon: 'hand', salmonAng: 100 })], [99, P_({ lean: 10, head: 12, armN: 70, armF: 50, face: 'surprised', dx: 60, salmon: 'hand', salmonAng: 100 })]]);
      if (t > 2.2) P.salmonAng += 8 * Math.sin(t * 60) * Math.min(1, (t - 2.2) * 2);   // the salmon starts to vibrate
      return P;
    } },
  // upside down in the flowerbed, legs kicking
  upended: { d: 99, pose: t => P_({ rot: 180, lean: 0, head: -10, legA: 16 * Math.sin(t * 7), legB: -16 * Math.sin(t * 7 + 1), armN: 40 + 10 * Math.sin(t * 5), armF: 30, tail: 30 * Math.sin(t * 4), face: 'angry', dy: 0 }) },
};
export { idle };

export class Catalytik {
  constructor(scene, x, groundY, height) {
    this.scene = scene;
    this.RIG = scene.cache.json.get('overlordRig');
    this.k = height / (SOLE - 85);   // art pixels → screen pixels (crown top to soles)
    this.x = x; this.groundY = groundY;
    this.floor = 0; this.air = 0; this.sink = 0;
    this.t = 0; this.move = null; this.mt = 0; this.evI = 0; this.from = null; this.blendIn = 0.18; this.last = null;
    this.flashT = 0; this.vulnT = 0; this.timeScale = 1;
    this.face = 1;   // 1 = facing left (as drawn), -1 = facing right
    this.onEvent = () => {};
    this.build();
    this.update(0);
  }
  img(name, parent, pivot) {
    const R = this.RIG[name], sc = 1 / this.RIG._scale;
    const im = this.scene.add.image(R.x - pivot[0], R.y - pivot[1], 'o_' + name).setOrigin(0, 0).setScale(sc);
    parent.add(im); this.images.push(im); return im;
  }
  build() {
    const sc = this.scene, R = this.RIG; this.images = [];
    const piv = n => [R[n].px, R[n].py];
    const at = (n, parent) => { const c = sc.add.container(R[n].px - parent[0], R[n].py - parent[1]); return c; };
    this.root = sc.add.container(this.x, this.groundY).setScale(this.k).setDepth(8);
    this.inner = sc.add.container(0, HIP[1] - SOLE); this.root.add(this.inner);
    this.bodyC = sc.add.container(0, 0); this.inner.add(this.bodyC);
    // head (behind the ermine collar), with its four expressions
    this.headC = at('head', HIP); this.bodyC.add(this.headC);
    this.faces = {};
    for (const f of ['smug', 'shout', 'angry', 'surprised']) { const im = this.img('head_' + f, this.headC, piv('head')); im.setVisible(f === 'smug'); this.faces[f] = im; }
    this.img('body', this.bodyC, HIP);
    this.tailC = at('tail', HIP); this.bodyC.add(this.tailC); this.img('tail', this.tailC, piv('tail'));
    this.legBC = at('legB', HIP); this.inner.add(this.legBC); this.img('legB', this.legBC, piv('legB'));
    this.legAC = at('legA', HIP); this.inner.add(this.legAC); this.img('legA', this.legAC, piv('legA'));
    this.armsC = sc.add.container(0, 0); this.inner.add(this.armsC);
    this.armFC = at('armF', HIP); this.armsC.add(this.armFC); this.img('armF', this.armFC, piv('armF'));
    this.armNC = at('armN', HIP); this.armsC.add(this.armNC); this.img('armN', this.armNC, piv('armN'));
    // the rotten salmon, held by the tail in her near hoof
    const hp = R._hoofN, ap = piv('armN');
    this.salmon = sc.add.image(hp[0] - ap[0], hp[1] - ap[1], 'o_salmon').setOrigin(0.07, 0.55).setScale(1.15).setVisible(false);
    this.armNC.add(this.salmon);
  }

  // ---------- moves ----------
  play(name) {
    if (this.move === 'defeat' && name !== 'upended') return;
    this.from = this.last; this.move = name; this.mt = 0; this.evI = 0; this.blendIn = 0.18;
  }
  stop() { this.from = this.last; this.move = null; this.mt = 0; }
  get busy() { return !!this.move; }
  get vulnerable() { return this.vulnT > 0; }
  pose() {
    let P = this.move ? MOVES[this.move].pose(this.mt) : idle(this.t);
    if (this.from && this.mt < this.blendIn) P = lerpPose(this.from, P, ease(this.mt / this.blendIn));
    return P;
  }
  update(dt) {
    this.t += dt;
    this.flashT = Math.max(0, this.flashT - dt); this.vulnT = Math.max(0, this.vulnT - dt);
    if (this.move) {
      const m = MOVES[this.move]; this.mt += dt * this.timeScale;
      const ev = m.ev || [];
      while (this.evI < ev.length && this.mt >= ev[this.evI][0]) { const [, name, ...args] = ev[this.evI++]; this.onEvent(name, ...args); }
      if (this.mt >= m.d) { const done = this.move; this.from = this.pose(); this.move = null; this.mt = 0; this.onEvent('moveDone', done); }
    }
    const P = this.pose(); this.last = P;
    this.render(P);
  }
  get feetY() { return this.groundY - this.floor - this.air + this.sink; }
  render(P) {
    this.root.setPosition(this.x, this.feetY);
    this.root.scaleX = this.k * this.face; this.root.scaleY = this.k;
    this.inner.setPosition(P.dx, HIP[1] - SOLE + P.dy).setScale(P.sx, P.sy).setRotation(P.rot * D);
    if (P.rot > 90) this.inner.y = -380 + P.dy;   // upside down: hips in the air, head buried in the flowerbed
    this.bodyC.rotation = P.lean * D; this.armsC.rotation = P.lean * D;
    this.headC.rotation = P.head * D; this.tailC.rotation = -P.tail * D;
    this.armNC.rotation = P.armN * D; this.armFC.rotation = P.armF * D;
    this.legAC.rotation = P.legA * D; this.legBC.rotation = P.legB * D;
    for (const f in this.faces) this.faces[f].setVisible(f === (P.face || 'smug'));
    this.salmon.setVisible(P.salmon === 'hand'); this.salmon.rotation = (P.salmonAng + 90) * D;
    // white flash when hit; pink pulse while vulnerable
    const flash = this.flashT > 0, vul = this.vulnT > 0, mode = flash ? 'flash' : vul ? 'vul' : 'none';
    if (mode !== this._tint || vul) {
      this._tint = mode;
      for (const im of this.images.concat([this.salmon])) {
        if (mode === 'flash') im.setTintFill(0xffffff);
        else if (mode === 'vul') { const p = 0.5 + 0.5 * Math.sin(this.t * 14); im.setTint(Phaser.Display.Color.GetColor(255, Math.round(255 - 70 * p), Math.round(255 - 20 * p))); }
        else im.clearTint();
      }
    }
  }
  // ---------- geometry in screen space ----------
  local(c, x, y) { const p = c.getWorldTransformMatrix().transformPoint(x, y); return [p.x, p.y]; }
  handPoint() { const R = this.RIG, ap = [R.armN.px, R.armN.py]; return this.local(this.armNC, R._hoofN[0] - ap[0], R._hoofN[1] - ap[1]); }
  hornPoint() { const R = this.RIG, hp = [R.head.px, R.head.py]; return this.local(this.headC, R._horn[0] - hp[0], R._horn[1] - hp[1]); }
  mouthPoint() { const R = this.RIG, hp = [R.head.px, R.head.py]; return this.local(this.headC, R._mouth[0] - hp[0], R._mouth[1] - hp[1]); }
  headTop() { const R = this.RIG, hp = [R.head.px, R.head.py]; return this.local(this.headC, 200 - hp[0], 90 - hp[1]); }
  /** Salmon tip (for the swing's reach and the stuck-salmon spot). */
  salmonTip() { return this.local(this.salmon, 300 * 0.93, 0); }
  /** Body box: gremlin touching it gets hurt; magic hitting it does damage (when vulnerable). */
  hurtbox() {
    if (this.sink > 200) return null;
    const k = this.k, f = this.face, a = this.x + (30 - HIP[0]) * k * f, b = this.x + (330 - HIP[0]) * k * f;
    const top = this.feetY - (SOLE - 260) * k;
    return new Phaser.Geom.Rectangle(Math.min(a, b), top, Math.abs(b - a), (SOLE - 260 - 10) * k);
  }
}
