// Gremlin poses.
// A pose is a set of joint angles (degrees, clockwise positive). Thigh/boot angles are "world"
// angles relative to upright so the legs keep working however far the body leans.
// eye = eye size (1 = as drawn), glow = Meltdown intensity 0..1, flap = scarf flutter multiplier.

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const ease = k => (k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k));
export const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

export const RUN_CYCLE = 0.36; // seconds per run cycle (two strides)

const BASE = {
  lean: 0, head: 0, armN: 0, foreN: 0, armF: 0, foreF: 0,
  near: { thighW: 0, knee: 0 }, far: { thighW: 0, knee: 0 },
  tailBase: 0, hop: 0, sx: 1, sy: 1, spin: 0, eye: 1, glow: 0, flap: 1,
};
export const pose = o => {
  const p = structuredClone(BASE);
  for (const k in o) p[k] = (typeof o[k] === 'object' && !Array.isArray(o[k])) ? { ...p[k], ...o[k] } : o[k];
  return p;
};

export function lerpPose(a, b, k) {
  if (typeof a === 'number') return a + (b - a) * k;
  if (a && typeof a === 'object') { const o = {}; for (const key in b) o[key] = key in a ? lerpPose(a[key], b[key], k) : b[key]; return o; }
  return k < 0.5 ? a : b;
}

export function runPose(t) {
  const ph = (t / RUN_CYCLE) * TAU;
  const leg = o => {
    const p = ph + o, s = Math.sin(p);
    const swing = Math.max(0, Math.cos(p + 0.25)), stance = Math.max(0, -Math.cos(p + 0.25));
    const thighW = -50 * s - 8 - 22 * Math.pow(swing, 1.5) * Math.max(0, s + 0.4);
    const toeOff = 24 * Math.pow(Math.max(0, Math.sin(p - 2.0)), 2);
    const bootW = (1 - swing) * (-6 * stance + toeOff) +
      swing * (thighW + 78 * Math.pow(Math.sin(Math.min(Math.PI, (p + 0.25 + Math.PI / 2) % TAU)), 1.1));
    return { thighW, knee: bootW - thighW };
  };
  const lean = 21 + 3 * Math.sin(2 * ph + 0.6);
  return pose({
    lean, near: leg(0), far: leg(Math.PI), head: -lean * 0.55 + 3 * Math.sin(2 * ph + 1.2),
    armN: 48 * Math.sin(ph) - 6, foreN: -(42 + 30 * Math.max(0, -Math.sin(ph))),
    armF: 48 * Math.sin(ph + Math.PI) - 6, foreF: -(42 + 30 * Math.max(0, -Math.sin(ph + Math.PI))),
    hop: 13 * Math.pow(Math.max(0, Math.sin(2 * ph - 0.9)), 2), tailBase: 9 + 4 * Math.sin(2 * ph),
  });
}

// Crouch before take-off and on landing.
export const crouchPose = () => pose({ lean: 30, head: -20, near: { thighW: -52, knee: 52 }, far: { thighW: -40, knee: 40 },
  armN: 42, foreN: -35, armF: 30, foreF: -30, tailBase: 14, sx: 1.06, sy: 0.9 });
// Rising: knee driven up, claws reaching forward (confident leap).
export const risePose = () => pose({ lean: 4, head: -10, near: { thighW: -72, knee: 96 }, far: { thighW: 18, knee: 62 },
  armN: -78, foreN: 8, armF: -165, foreF: -20, tailBase: -18, sx: 0.95, sy: 1.07 });
// Falling: legs reaching for the ground, arms flailing.
export const fallPose = t => pose({ lean: 2, head: -4, near: { thighW: -20, knee: 22 }, far: { thighW: 6, knee: 16 },
  armN: -70 + 14 * Math.sin(t * 26), foreN: -4, armF: -150 + 18 * Math.sin(t * 26 + 2), foreF: -24, tailBase: 34 });
// Double-jump spin: tucked into a ball.
export const tuckPose = () => pose({ lean: 12, head: 8, near: { thighW: -88, knee: 128 }, far: { thighW: -70, knee: 120 },
  armN: -58, foreN: -95, armF: -40, foreF: -95, tailBase: 20 });
// Slide: belly-first, claws ahead, legs trailing, head up.
export const slidePose = t => pose({ lean: 80, head: -62, near: { thighW: 98, knee: 14 }, far: { thighW: 88, knee: 22 },
  armN: -146 + 5 * Math.sin(t * 30), foreN: -14, armF: -162 + 5 * Math.sin(t * 30 + 1.5), foreF: -6,
  tailBase: -70 + 6 * Math.sin(t * 22), sx: 1.04, sy: 0.97 });
// Damage: comical surprise, bulging eye, flailing limbs.
export const hurtPose = t => pose({ lean: -20, head: -16, eye: 1.45,
  armN: -120 + 38 * Math.sin(t * 42), foreN: -10 + 20 * Math.sin(t * 37), armF: -165 + 34 * Math.sin(t * 42 + 2), foreF: -30,
  near: { thighW: -48 + 18 * Math.sin(t * 40), knee: 55 }, far: { thighW: 34 - 18 * Math.sin(t * 40), knee: 30 }, tailBase: 30, flap: 1.6 });
// Death in the air: limbs everywhere while the body tumbles.
export const dieAirPose = t => pose({ lean: 0, head: -12, eye: 1.4,
  armN: -110 + 45 * Math.sin(t * 30), foreN: -20, armF: -60 + 45 * Math.sin(t * 30 + 2.4), foreF: -20,
  near: { thighW: -60 + 30 * Math.sin(t * 28), knee: 40 }, far: { thighW: 40 - 30 * Math.sin(t * 28), knee: 30 }, tailBase: 20, flap: 1.5 });
// Death, flopped on its back with the odd twitch.
export const deadPose = t => {
  const tw = Math.pow(Math.max(0, Math.sin(t * 3.1)), 12);
  return pose({ lean: -96, head: -6, eye: 1.15, armN: -132, foreN: 24 + 10 * tw, armF: -100, foreF: 30,
    near: { thighW: -168 + 12 * tw, knee: 38 }, far: { thighW: -145, knee: 54 - 20 * tw }, tailBase: 104, flap: 0.25 });
};
// Victory: feral stomping, fist-pumping, bouncing.
export function winPose(t) {
  const q = t / 0.52 * TAU, sN = Math.max(0, Math.sin(q)), sF = Math.max(0, -Math.sin(q));
  return pose({ lean: -4 + 7 * Math.sin(q), head: -16 + 7 * Math.sin(2 * q), eye: 1.08,
    near: { thighW: 8 - 88 * sN, knee: 105 * sN }, far: { thighW: 8 - 88 * sF, knee: 105 * sF },
    armN: -104 + 14 * Math.sin(2 * q), foreN: 6 + 12 * Math.sin(2 * q + 1), armF: -178 + 32 * Math.sin(2 * q + Math.PI), foreF: 12 + 20 * Math.sin(2 * q),
    hop: 42 * Math.abs(Math.sin(q)), sy: 1 - 0.05 * Math.pow(Math.abs(Math.cos(q)), 6), sx: 1 + 0.03 * Math.pow(Math.abs(Math.cos(q)), 6),
    tailBase: 16 + 10 * Math.sin(2 * q) });
}
// Gremlin Meltdown timeline (seconds): activation 0–0.5, full meltdown 0.5–1.3, release 1.3–1.65, return to 2.3.
export const MELT_T = 2.3, MELT_BLAST_AT = 1.3;
export const meltGlow = t => ease(seg(t, 0.05, 0.5)) * (1 - ease(seg(t, 1.65, 2.15)));
export const meltLift = t => 140 * ease(seg(t, 0.35, 0.7)) * (1 - ease(seg(t, 1.55, 2.0))) +
  10 * Math.sin(t * 9) * seg(t, 0.7, 0.9) * (1 - seg(t, 1.3, 1.55));
export function meltPose(t, runT) {
  const jit = a => a * Math.sin(t * 95) * seg(t, 0.25, 0.5) * (1 - seg(t, 1.65, 1.9));
  const charge = pose({ lean: 24 + jit(3), head: -6, eye: 1.1, armN: 28, foreN: -88, armF: 20, foreF: -90,
    near: { thighW: -46, knee: 50 }, far: { thighW: -34, knee: 40 }, tailBase: 30, sx: 1.04, sy: 0.95 });
  const full = pose({ lean: -8 + jit(4), head: -26 + jit(3), eye: 1.18, armN: -38 + jit(6), foreN: -70, armF: -150 + jit(6), foreF: -30,
    near: { thighW: -30, knee: 52 }, far: { thighW: 26, knee: 42 }, tailBase: 48 });
  const blast = pose({ lean: 14, head: -6, eye: 1.15, armN: -86, foreN: 0, armF: -74, foreF: 0,
    near: { thighW: -20, knee: 30 }, far: { thighW: 30, knee: 20 }, tailBase: -4 });
  let P;
  if (t < 0.5) P = lerpPose(runPose(runT), charge, ease(t / 0.22));
  else if (t < 1.3) P = lerpPose(charge, full, ease((t - 0.5) / 0.18));
  else if (t < 1.65) P = lerpPose(full, blast, ease((t - 1.3) / 0.07));
  else P = lerpPose(blast, runPose(runT), ease((t - 1.65) / 0.5));
  P.glow = meltGlow(t); P.flap = 1 + 1.6 * P.glow;
  return P;
}
// Idle: smug heroic stance, chest puffed out, breathing.
export const idlePose = t => pose({ lean: -5, head: -7 + 1.5 * Math.sin(t * 2.6), eye: 1,
  armN: 14, foreN: -14 + 3 * Math.sin(t * 2.6), armF: 16, foreF: -10,
  near: { thighW: 13, knee: -6 }, far: { thighW: -15, knee: 8 },
  sy: 1 + 0.014 * Math.sin(t * 2.6), sx: 1 - 0.007 * Math.sin(t * 2.6), tailBase: 4 + 3 * Math.sin(t * 1.7), flap: 0.45 });
