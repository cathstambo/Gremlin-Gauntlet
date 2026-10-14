// World 2 readability (15 Oct 2026). Outlines and muted backgrounds are baked into the image files themselves
// (see the art notes in the GDD addendum); here are only the plain drawn extras, which work on every phone:
// ground shadows, the disc behind pickups, and the red warning tint on enemies.

export const DANGER_TINT = 0xff5a5a;

/** Soft ground shadow (drawn into a Graphics each frame). h = how high above the ground the thing is. */
export function shadow(G, x, groundY, w, h = 0) {
  const k = Math.max(0.35, 1 - h / 500);
  G.fillStyle(0x0a0510, 0.32 * k).fillEllipse(x, groundY + 4, w * k, 30 * k);
  G.fillStyle(0x0a0510, 0.22 * k).fillEllipse(x, groundY + 4, w * 1.3 * k, 44 * k);
}
/** Shadow under the gremlin, on whatever surface is below him (ground or platform). */
export function gremlinShadow(G, g) {
  const surf = g.floorAt ? g.floorAt(g.x) : 0, h = Math.max(0, g.S.h * g.k - surf);
  shadow(G, g.x + 10 * g.face, g.groundY - surf, 200, h);
}
/** The dark disc with a gold rim that sits behind every pickup. */
export function makePickupDisc(scene) {
  if (scene.textures.exists('pickDisc')) return;
  const t = scene.textures.createCanvas('pickDisc', 160, 160), c = t.getContext();
  const g = c.createRadialGradient(80, 80, 10, 80, 80, 72);
  g.addColorStop(0, 'rgba(20,8,34,.78)'); g.addColorStop(0.75, 'rgba(20,8,34,.62)'); g.addColorStop(1, 'rgba(20,8,34,0)');
  c.fillStyle = g; c.beginPath(); c.arc(80, 80, 72, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(255,240,170,.9)'; c.lineWidth = 4; c.beginPath(); c.arc(80, 80, 56, 0, Math.PI * 2); c.stroke();
  t.refresh();
}
/** Pulse a creature red while it winds up an attack (a plain tint: no special effects). */
export function dangerTint(c, t) {
  const on = c.warning && !c.dead;
  if (on === c._warnOn && !on) return;
  c._warnOn = on;
  if (c.flashT > 0) return;   // the white hit-flash wins
  for (const im of c.p.images) {
    if (on) { const k = 0.5 + 0.5 * Math.sin(t * 22); im.setTint(Phaser.Display.Color.GetColor(255, Math.round(255 - 150 * k), Math.round(255 - 150 * k))); }
    else im.clearTint();
  }
}
