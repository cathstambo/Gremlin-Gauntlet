// Readability rules, shared by every world (approved plan, 15 Oct 2026):
//   1. backgrounds are muted (less colour, a soft haze) so the action stays the brightest thing on screen
//   2. characters get a dark ink outline around their whole silhouette
//   3. everything that stands on the ground gets a soft shadow under it
//   4. pickups sit on a dark disc with a bright rim
//   5. an enemy's outline flashes red while it winds up an attack
// All of it is WebGL-only polish: on a browser without WebGL the game still runs, just without these touches.

export const INK = 0x170a22;          // the outline colour (very dark purple, reads as black but sits with the gremlin)
export const DANGER = 0xff2a3a;

/** Dark outline around a whole container (one silhouette, not each separate part). Returns the effect, or null. */
export function inkOutline(obj, strength = 4, col = INK) {
  const fx = obj.postFX || obj.preFX;
  if (!fx) return null;
  return fx.addGlow(col, strength, 0, false, 0.1, 6);
}
/** Same, for a single image (fish, spoons, pickups). */
export function inkImage(img, strength = 3, col = INK) {
  if (!img.preFX) return null;
  return img.preFX.addGlow(col, strength, 0, false, 0.1, 5);
}
/** Turn a creature's outline red while it's winding up. */
export function dangerFlash(fx, on, t) {
  if (!fx) return;
  if (on) { fx.color = DANGER; fx.outerStrength = 4 + 3 * (0.5 + 0.5 * Math.sin(t * 22)); }
  else { fx.color = INK; fx.outerStrength = 4; }
}
/** Mute a background layer: less saturation, a little darker or lighter. */
export function mute(obj, { sat = -0.3, bright = 1 } = {}) {
  if (!obj.preFX) return;
  const cm = obj.preFX.addColorMatrix();
  cm.saturate(sat, true);
  if (bright !== 1) cm.brightness(bright, true);
}
/** Soft ground shadow (drawn into a Graphics each frame). h = how high above the ground the thing is. */
export function shadow(G, x, groundY, w, h = 0) {
  const k = Math.max(0.35, 1 - h / 500);
  G.fillStyle(0x0a0510, 0.32 * k).fillEllipse(x, groundY + 4, w * k, 30 * k);
  G.fillStyle(0x0a0510, 0.22 * k).fillEllipse(x, groundY + 4, w * 1.3 * k, 44 * k);
}
/** The disc that sits behind every pickup. */
export function makePickupDisc(scene) {
  if (scene.textures.exists('pickDisc')) return;
  const t = scene.textures.createCanvas('pickDisc', 160, 160), c = t.getContext();
  const g = c.createRadialGradient(80, 80, 10, 80, 80, 72);
  g.addColorStop(0, 'rgba(20,8,34,.78)'); g.addColorStop(0.75, 'rgba(20,8,34,.62)'); g.addColorStop(1, 'rgba(20,8,34,0)');
  c.fillStyle = g; c.beginPath(); c.arc(80, 80, 72, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(255,240,170,.9)'; c.lineWidth = 4; c.beginPath(); c.arc(80, 80, 56, 0, Math.PI * 2); c.stroke();
  t.refresh();
}
/** Shadow under the gremlin, on whatever surface is below him (ground or platform). */
export function gremlinShadow(G, g) {
  const surf = g.floorAt ? g.floorAt(g.x) : 0, h = Math.max(0, g.S.h * g.k - surf);
  shadow(G, g.x + 10 * g.face, g.groundY - surf, 200, h);
}
