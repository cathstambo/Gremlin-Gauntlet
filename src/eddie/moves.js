// Eddie, The Mould King: rig geometry, poses and moves.
// Eddie faces LEFT. Positive limb angles swing a limb forward (towards the gremlin); negative lean = hunch forward.
// A move = { d: duration, pose(t), ev: [[time, eventName, ...args]] }. Events are handled by the Boss scene.

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const ease = k => (k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k));
export const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const lerp = (a, b, k) => a + (b - a) * k;

export const M = {
  mul: (a, b) => [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]],
  t: (x, y) => [1, 0, 0, 1, x, y],
  r: deg => { const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [c, s, -s, c, 0, 0]; },
  s: (x, y) => [x, 0, 0, y ?? x, 0, 0],
  ap: (m, x, y) => [m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5]],
};

export const FAR_LIFT = 24;   // the far leg sits slightly lower in the art (perspective); lift it so both feet share one ground line
export const ORDER = ['head', 'upN', 'foN', 'upF', 'foF', 'thN', 'shN', 'thF', 'shF'];
const BASE = { lean: 0, head: 0, upN: 0, foN: 0, upF: 0, foF: 0, thN: 0, shN: 0, thF: 0, shF: 0, sx: 1, sy: 1, dx: 0, face: null, rock: null, sway: 1, blob: false, netHeld: false };
export const P_ = o => Object.assign({}, BASE, o);
export function lerpPose(a, b, k) {
  const o = {};
  for (const key in b) { const va = a[key], vb = b[key]; o[key] = (typeof vb === 'number' && typeof va === 'number') ? va + (vb - va) * k : (k < 0.5 ? va : vb); }
  return o;
}

export function makeEddieRig(RIG) {
  const piv = n => [RIG[n].px, RIG[n].py];
  // joint → [parent, offset from the parent's pivot]
  const J = {};
  const T = piv('torso');
  const jointAt = { head: piv('head'), upN: piv('upN'), foN: piv('foN'), upF: piv('upF'), foF: piv('foF'),
    thN: piv('thN'), shN: piv('shN'), thF: [RIG.thF.px, RIG.thF.py - FAR_LIFT], shF: [RIG.shF.px, RIG.shF.py - FAR_LIFT] };
  const parent = { head: 'torso', upN: 'torso', foN: 'upN', upF: 'torso', foF: 'upF', thN: 'torso', shN: 'thN', thF: 'torso', shF: 'thF' };
  for (const n of ORDER) { const pn = parent[n], pp = pn === 'torso' ? T : jointAt[pn]; J[n] = [pn, [jointAt[n][0] - pp[0], jointAt[n][1] - pp[1]]]; }
  // each part's image is drawn so its own pivot (from the art) sits on the joint; for the far leg that joint is lifted, so the leg lifts with it
  const imgPivot = n => piv(n);

  function angle(P, n) { let a = P[n]; if (n === 'thN' || n === 'thF') a -= P.lean; return a; }   // thighs use world angles
  function build(P) {
    const X = {};
    X.torso = M.mul(M.t(P.dx, 0), M.mul(M.s(P.sx, P.sy), M.r(P.lean)));
    for (const n of ORDER) { const [pn, off] = J[n]; X[n] = M.mul(X[pn], M.mul(M.t(off[0], off[1]), M.r(angle(P, n)))); }
    return X;
  }
  // art point of a part → rig space (origin = torso pivot)
  const at = (X, n, x, y) => { const p = n === 'torso' ? T : imgPivot(n); return M.ap(X[n], x - p[0], y - p[1]); };
  function lowest(X) {
    const s = RIG._soles;
    const ys = [...s.shN.map(([x, y]) => at(X, 'shN', x, y)[1]), ...s.shF.map(([x, y]) => at(X, 'shF', x, y)[1])];
    ys.push(at(X, 'shN', 190, 800)[1], at(X, 'shF', 440, 800)[1]);   // knees, for kneeling
    return Math.max(...ys);
  }
  // near-arm IK: rotate shoulder and elbow until the hand reaches a target in rig space
  const handPos = P => at(build(P), 'foN', RIG._hand[0], RIG._hand[1]);
  const jointPos = (P, n) => M.ap(build(P)[n], 0, 0);
  function armIK(P, target, seed) {
    const Q = Object.assign({}, P); if (seed) { Q.upN = seed[0]; Q.foN = seed[1]; }
    for (let it = 0; it < 8; it++) for (const n of ['foN', 'upN']) {
      const j = jointPos(Q, n), h = handPos(Q);
      let d = (Math.atan2(target[1] - j[1], target[0] - j[0]) - Math.atan2(h[1] - j[1], h[0] - j[0])) * 180 / Math.PI;
      while (d > 180) d -= 360; while (d < -180) d += 360;
      Q[n] += d * 0.9;
      if (n === 'foN') Q.foN = clamp(Q.foN, -155, 25);
      if (n === 'upN') Q.upN = clamp(Q.upN, -170, 150);
    }
    return { upN: Q.upN, foN: Q.foN };
  }

  // ---------- poses ----------
  const idle = t => P_({ lean: -3 + 1.5 * Math.sin(t * 2.2), head: 2 * Math.sin(t * 2.2 + 0.6), upN: 3 * Math.sin(t * 1.6), foN: 4 * Math.sin(t * 1.6 + 0.5),
    upF: -3 * Math.sin(t * 1.6), foF: 3 * Math.sin(t * 1.6 + 0.4), sy: 1 + 0.01 * Math.sin(t * 2.2), sway: 0.6 });
  function walkPose(t, rate = 1) {   // heavy shuffle, toes dragging
    const q = t / 1.05 * TAU * rate, s = Math.sin(q), sN = Math.max(0, s), sF = Math.max(0, -s);
    return P_({ lean: -6 + 2 * Math.sin(2 * q), head: -2 + 3 * Math.sin(2 * q + 0.5), upN: -12 * s - 2, foN: 6 + 8 * Math.max(0, -s), upF: 12 * s, foF: 6 + 8 * Math.max(0, s),
      thN: 16 * s + 4 * sN, shN: -26 * sN, thF: -16 * s + 4 * sF, shF: -26 * sF, sway: 1.3 });
  }
  // charging: same shuffle, much faster, bent right over with claws out
  function chargePose(t) {
    const q = t / 0.42 * TAU, s = Math.sin(q), sN = Math.max(0, s), sF = Math.max(0, -s);
    return P_({ lean: -26 + 3 * Math.sin(2 * q), head: 14, upN: 80 + 20 * s, foN: 10, upF: 60 - 20 * s, foF: 20,
      thN: 34 * s + 10 * sN, shN: -50 * sN, thF: -34 * s + 10 * sF, shF: -50 * sF, sway: 2, face: 'shout' });
  }
  const crouch = () => P_({ lean: -46, head: 30, thN: 62, shN: -84, thF: 52, shF: -80, upF: 20, foF: 10, sway: 0.7 });
  const airPose = () => P_({ lean: -10, head: -8, upN: -150, foN: -20, upF: -140, foF: -10, thN: 70, shN: -100, thF: 50, shF: -90, sway: 1.8, face: 'shout' });
  const kneel = t => P_({ lean: -10 + 2 * Math.sin(t * 5), head: 14 + 3 * Math.sin(t * 5), upN: 20, foN: 30, upF: -10, foF: 40,
    thN: 82, shN: -102, thF: 72, shF: -98, sy: 1 + 0.02 * Math.sin(t * 5), face: 'hurt', sway: 0.5 });

  function keys(t, list) {
    for (let i = 0; i < list.length - 1; i++) {
      const [t0, p0] = list[i], [t1, p1] = list[i + 1];
      if (t <= t1) return lerpPose(typeof p0 === 'function' ? p0(t) : p0, typeof p1 === 'function' ? p1(t) : p1, ease((t - t0) / (t1 - t0)));
    }
    const l = list[list.length - 1][1]; return typeof l === 'function' ? l(t) : l;
  }
  const groundReach = P => armIK(P, [-170, lowest(build(P)) - 30]);
  const mouthPoint = X => at(X, 'head', RIG._mouth[0] + 10, RIG._mouth[1] + 5);
  function reachDown(P, t) { if (t < 0.75) { const k = ease(seg(t, 0.2, 0.45)) * (1 - ease(seg(t, 0.6, 0.75))); if (k > 0) { const ik = groundReach(P); P.upN = lerp(P.upN, ik.upN, k); P.foN = lerp(P.foN, ik.foN, k); } } }

  const MOVES = {
    entrance: { d: 6.2, pose: t => {
      const P = keys(t, [[0, idle(t)], [0.4, P_({ lean: 6, head: -14, upN: -30, foN: -40, upF: 30, foF: 20, face: 'shout', sway: 1.4 })], [2.6, P_({ lean: 6, head: -14, upN: -36, foN: -44, upF: 34, foF: 24, face: 'shout', sway: 1.4 })],
        [3.1, P_({ lean: -8, head: 6 })], [6.2, idle(t)]]);
      if (t > 3.1 && t < 5.8) {   // "Hang on. Lemme finish this rock."
        const k = ease(seg(t, 3.1, 3.6)) * (1 - ease(seg(t, 5.4, 5.8))); const m = mouthPoint(build(P));
        const ik = armIK(P, [lerp(-60, m[0] - 6, k), lerp(140, m[1] + 18, k)], [lerp(0, 105, k), lerp(-10, -120, k)]); P.upN = ik.upN; P.foN = ik.foN;
        P.rock = k > 0.85 ? null : 'hand'; P.face = k > 0.85 && Math.sin(t * 16) > -0.3 ? 'chomp' : null; P.head = 6 + 3 * Math.sin(t * 16) * (k > 0.85 ? 1 : 0);
      }
      return P; },
      ev: [[0.5, 'say', 'WHO DISTURBS MY MOULDY KINGDOM?!', 2.2], [3.2, 'say', 'Hang on. Lemme finish this rock.', 2.4], [4.0, 'crumbs', 14], [4.8, 'crumbs', 10]] },
    rockLow: { d: 1.6, pose: t => {
      const P = keys(t, [[0, idle(t)], [0.45, crouch()], [0.6, crouch()], [0.95, P_({ lean: -14, head: 4, thN: 10, shN: -18, thF: 4, shF: -12, upN: -80, foN: -30, upF: 20, foF: 10, face: 'shout' })],
        [1.12, P_({ lean: -26, head: 10, thN: 26, shN: -30, thF: -6, shF: -10, upN: 70, foN: 8, upF: -20, foF: 20, face: 'shout', sway: 1.5 })], [1.6, idle(t)]]);
      reachDown(P, t); P.rock = (t > 0.45 && t < 1.06) ? 'hand' : null; return P; },
      ev: [[0.3, 'taunt', 'rock'], [1.06, 'throwRock', 'low']] },
    rockHigh: { d: 1.6, pose: t => {
      const P = keys(t, [[0, idle(t)], [0.45, crouch()], [0.6, crouch()], [0.95, P_({ lean: 12, head: -12, thN: -8, shN: -6, thF: 10, shF: -14, upN: -150, foN: -40, upF: 30, foF: 10, face: 'shout' })],
        [1.1, P_({ lean: -22, head: 8, thN: 22, shN: -24, thF: -10, shF: -8, upN: 120, foN: 10, upF: -26, foF: 20, face: 'shout', sway: 1.6 })], [1.6, idle(t)]]);
      reachDown(P, t); P.rock = (t > 0.45 && t < 1.02) ? 'hand' : null; return P; },
      ev: [[0.3, 'taunt', 'rock'], [1.02, 'throwRock', 'high']] },
    eat: { d: 4.8, pose: t => {
      const P = keys(t, [[0, idle(t)], [0.45, crouch()], [0.6, crouch()], [1.0, P_({ lean: -4, head: 8, sway: 0.5 })], [4.2, P_({ lean: -4, head: 8, sway: 0.5 })], [4.5, P_({ lean: 6, head: -18 })], [4.8, idle(t)]]);
      reachDown(P, t);
      if (t >= 0.6 && t < 4.3) { const k = ease(seg(t, 0.6, 1.05)) * (1 - ease(seg(t, 3.9, 4.3))); const m = mouthPoint(build(P));
        const ik = armIK(P, [lerp(-40, m[0] - 6, k), lerp(160, m[1] + 18, k)], [lerp(0, 105, k), lerp(-10, -120, k)]); P.upN = ik.upN; P.foN = ik.foN; }
      const chewing = t > 1.05 && t < 3.9;
      P.rock = t > 0.45 && t < 1.05 ? 'hand' : null; P.face = chewing ? (Math.sin(t * 14) > -0.2 ? 'chomp' : null) : (t >= 4.3 && t < 4.6 ? 'shout' : null);
      if (chewing) P.head += 3 * Math.sin(t * 14);
      return P; },
      ev: [[1.05, 'vulnerable', 3.0], [1.05, 'crumbs', 10], [1.6, 'crumbs', 8], [2.2, 'crumbs', 8], [2.8, 'crumbs', 8], [3.4, 'crumbs', 6]] },
    bomb: { d: 1.8, pose: t => {
      const P = keys(t, [[0, idle(t)], [0.4, P_({ lean: -10, head: 4, upN: -20, foN: -90, sway: 0.8 })], [0.85, P_({ lean: 14, head: -14, thN: -6, thF: 10, shF: -12, upN: -160, foN: -30, upF: 26, face: 'shout' })],
        [1.05, P_({ lean: -22, head: 8, thN: 20, shN: -22, thF: -8, upN: 110, foN: 12, upF: -20, foF: 20, face: 'shout', sway: 1.5 })], [1.8, idle(t)]]);
      P.blob = t > 0.3 && t < 0.98; return P; },
      ev: [[0.35, 'taunt', 'mould'], [0.98, 'throwBomb']] },
    net: { d: 1.9, pose: t => {
      const P = keys(t, [[0, idle(t)], [0.5, P_({ lean: -6, head: 0, upN: -110, foN: -50, upF: -20, foF: 10, thN: 6, thF: -6, sway: 1.0 })], [0.75, P_({ lean: -6, head: -4, upN: -130, foN: -60, upF: -24, face: 'shout' })],
        [0.95, P_({ lean: -24, head: 10, thN: 18, shN: -20, thF: -8, upN: 90, foN: -10, upF: -30, foF: 20, face: 'shout', sway: 1.6 })], [1.9, idle(t)]]);
      P.netHeld = t > 0.2 && t < 0.93; return P; },
      ev: [[0.1, 'warn'], [0.93, 'throwNet']] },
    burp: { d: 2.6, pose: t => {
      const P = keys(t, [[0, idle(t)], [0.6, P_({ lean: 16, head: -22, upN: -24, foN: -50, upF: 16, foF: -40, sx: 1.04, sy: 1.03, sway: 0.8 })], [0.85, P_({ lean: 16, head: -26, upN: -28, foN: -54, upF: 18, foF: -44, sx: 1.06, sy: 1.04 })],
        [1.05, P_({ lean: -14, head: 12, upN: 10, foN: -20, upF: -10, foF: -20, face: 'shout', sway: 1.3 })], [2.0, P_({ lean: -14, head: 12 + 3 * Math.sin(t * 30), upN: 10, foN: -20, upF: -10, foF: -20, face: 'shout', sway: 1.3 })], [2.6, idle(t)]]);
      return P; },
      ev: [[0.2, 'warn'], [1.0, 'gas']] },
    shrooms: { d: 2.4, pose: t => {
      const P = keys(t, [[0, idle(t)], [0.55, P_({ lean: 10, head: -16, upN: -160, foN: -20, upF: 150, foF: -10, face: 'shout', sway: 1.2 })], [0.8, P_({ lean: 12, head: -18, upN: -166, foN: -24, upF: 156, foF: -14, face: 'shout' })],
        [0.95, P_({ lean: -18, head: 6, upN: 30, foN: 10, upF: -30, foF: 10, thN: 20, shN: -24, thF: -6, sway: 1.6, face: 'shout' })], [1.8, P_({ lean: -16, head: 6, upN: 26, foN: 10, upF: -26, foF: 10, thN: 18, shN: -22, thF: -6 })], [2.4, idle(t)]]);
      return P; },
      ev: [[0.2, 'rumble'], [0.95, 'shrooms']] },
    splash: { d: 1.8, pose: t => {
      const P = keys(t, [[0, idle(t)], [0.45, P_({ lean: 6, head: -8, thN: -30, shN: -60, upN: -40, foN: -30, upF: 30, foF: -20, sway: 1.0 })], [0.62, P_({ lean: -10, head: 6, thN: 10, shN: -10, upN: 30, foN: -10, upF: -20, foF: 10, face: 'shout', sway: 1.8 })], [1.8, idle(t)]]);
      return P; },
      ev: [[0.1, 'warn'], [0.6, 'splash']] },
    roar: { d: 0.9, pose: t => keys(t, [[0, idle(t)], [0.3, P_({ lean: 8, head: -20, upN: -60, foN: -60, upF: 50, foF: -40, thN: -10, thF: 14, face: 'shout', sway: 1.4 })],
      [0.9, P_({ lean: 2, head: -14 + 3 * Math.sin(t * 40), upN: -50, foN: -60, upF: 40, foF: -40, thN: -10, thF: 14, face: 'shout', sway: 1.4 })]]),
      ev: [[0.05, 'warn']] },
    charge: { d: 9, pose: t => chargePose(t) },            // ended by the scene when he reaches the far side
    walk: { d: 9, pose: t => walkPose(t, 1.4) },           // ended by the scene on arrival
    hop: { d: 9, pose: t => keys(t, [[0, crouch()], [0.12, airPose()], [9, airPose()]]) },   // airborne: the scene moves him along an arc
    land: { d: 0.45, pose: t => keys(t, [[0, crouch()], [0.15, crouch()], [0.45, idle(t)]]), ev: [[0, 'landed']] },
    takeoff: { d: 0.3, pose: t => keys(t, [[0, idle(t)], [0.3, crouch()]]) },
    dive: { d: 0.6, pose: t => keys(t, [[0, idle(t)], [0.3, crouch()], [0.6, P_({ lean: -60, head: 30, thN: 70, shN: -90, thF: 60, shF: -90, upN: 120, foN: 20, upF: 100, foF: 20, sway: 2 })]]) },
    rise: { d: 0.7, pose: t => keys(t, [[0, airPose()], [0.4, airPose()], [0.7, idle(t)]]) },
    exhausted: { d: 4.2, pose: t => keys(t, [[0, idle(t)], [0.4, kneel(t)], [3.8, kneel], [4.2, idle(t)]]), ev: [[0.4, 'vulnerable', 3.6], [0.4, 'say', '*wheeze*... need... a rock...', 2.2]] },
    hit: { d: 0.55, pose: t => keys(t, [[0, idle(t)], [0.08, P_({ lean: 16, head: -20, upN: -30, foN: -20, upF: 30, foF: 20, face: 'hurt' })], [0.3, P_({ lean: 10, head: -12, upN: -14, foN: -10, upF: 16, foF: 10, face: 'hurt' })], [0.55, idle(t)]]) },
    hitHeavy: { d: 1.2, pose: t => keys(t, [[0, idle(t)], [0.1, P_({ lean: 26, head: -28, upN: -60, foN: -30, upF: 60, foF: 30, thN: -10, thF: 14, face: 'hurt', dx: 60 })],
      [0.45, P_({ lean: 14, head: -8, upN: -20, foN: -10, upF: 20, foF: 10, thN: 20, shN: -40, thF: 10, shF: -30, face: 'hurt', dx: 80, sway: 1.6 })], [1.2, P_(Object.assign(idle(t), { dx: 0 }))]]) },
    defeat: { d: 9.5, pose: t => {
      const P = keys(t, [[0, idle(t)], [0.3, P_({ lean: 24, head: -24, upN: -50, foN: -30, upF: 50, foF: 30, thN: -10, thF: 14, face: 'hurt', dx: 40 })],
        [1.2, P_({ lean: 16, head: -10, upF: 40, foF: 20, thN: -6, thF: 8, face: 'hurt', dx: 60 })],
        [2.0, P_({ lean: -8, head: 12, upF: -10, foF: 30, thN: 80, shN: -100, thF: 70, shF: -96, face: 'hurt', dx: 60, sway: 0.6 })],
        [2.8, P_({ lean: -14, head: 18, upF: -20, foF: 40, thN: 84, shN: -104, thF: 74, shF: -100, face: 'hurt', dx: 60, sway: 0.4 })], [9.5, P_({ lean: -14, head: 18, thN: 84, shN: -104, thF: 74, shF: -100, face: 'hurt', dx: 60 })]]);
      if (t > 0.9 && t < 3.0) { const c = at(build(P), 'torso', 215, 380); const ik = armIK(P, [c[0], c[1]]); const k = ease(seg(t, 0.9, 1.3)); P.upN = lerp(P.upN, ik.upN, k); P.foN = lerp(P.foN, ik.foN, k); }
      return P; },
      ev: [[0.2, 'say', 'BUT... I’M THE MOULD KING...', 2.2], [2.0, 'thud'], [2.9, 'sink']] },
  };
  return { RIG, J, T, imgPivot, angle, build, at, lowest, idle, MOVES, mouthPoint };
}
