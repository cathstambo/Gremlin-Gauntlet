// World 1 running stages (1 = easy to medium, 2 = busier and harder), then on to Eddie.
// Hearts, Chaos Meter and score carry from stage 1 to stage 2 to the boss; dying in a running stage restarts the level (GDD).
import { Gremlin } from '../gremlin/Gremlin.js';
import { STAGE1, STAGE2 } from '../course.js';
import { Swamp } from '../world/Swamp.js';
import { Frog, Gator, Bat, Spider } from '../creatures/Creatures.js';

const CREATURES = { frog: Frog, gator: Gator, bat: Bat, spider: Spider };
export const GROUND_Y = 870, GREMLIN_X = 520, GREMLIN_H = 330;

export const POINTS = { taco: 100, margarita: 250, levelComplete: 500, perHeart: 200, noDamage: 1000 };
const MOULD_HURT_AFTER = 0.55;   // seconds standing in mould before it costs a heart (it always slows you)

// how each hazard / pickup is drawn: texture, display scale, and how far the image bottom sits below the ground line
const LOOK = {
  roots: { key: 'haz_roots', s: 0.75, sink: 16 },
  mould: { key: 'haz_mould', s: 0.75, sink: 16 },
  sludge: { key: 'haz_sludge', s: 0.75, sink: 34 },
  sludgeWide: { key: 'haz_sludge', s: 1.85, sink: 80 },
  vines: { key: 'haz_vines_hang', s: 1.3 },
  taco: { key: 'pick_taco', s: 0.47 }, margarita: { key: 'pick_margarita', s: 0.5 },
  crystal: { key: 'pick_crystal', s: 0.42 }, potion: { key: 'pick_potion', s: 0.47 },
};
// collision boxes (screen px): ground hazards are anchored bottom-centre on the ground; pickups are centred
const BOX = {
  roots: { w: 170, h: 80 }, mould: { w: 220, h: 60 }, sludge: { w: 220, h: 40 }, sludgeWide: { w: 600, h: 40 },
  taco: { w: 90, h: 80 }, margarita: { w: 80, h: 90 }, crystal: { w: 70, h: 90 }, potion: { w: 80, h: 90 },
};
const PICKUPS = new Set(['taco', 'margarita', 'crystal', 'potion']);
export const MAX_HEARTS = 4;   // 3 normal + 1 gold bonus heart from a potion drunk at full health

export class Run extends Phaser.Scene {
  constructor() { super('Run'); }

  create() {
    this.stage = this.registry.get('stage') || 1;
    const carry = this.registry.get('carry') || { hearts: 3, chaos: 0, score: 0, damaged: false };
    this.mode = 'ready';            // ready → running → finished | dying → gameover
    this.hearts = carry.hearts; this.chaos = carry.chaos; this.score = carry.score; this.damaged = carry.damaged;
    this.dist = 0; this.timeScale = 1; this.showBoxes = false;
    this.sizes = this.cache.json.get('swampSizes');
    this.swamp = new Swamp(this, GROUND_Y);
    this.items = (this.stage === 1 ? STAGE1 : STAGE2).map(c => ({ ...c, obj: null, done: false }));
    this.orbs = []; this.creatures = [];
    this.orbG = this.add.graphics().setDepth(13).setBlendMode(Phaser.BlendModes.ADD);
    this.hazG = this.add.graphics().setDepth(6);
    this.boxG = this.add.graphics().setDepth(30);

    this.g = new Gremlin(this, GREMLIN_X, GROUND_Y, GREMLIN_H);
    this.g.floorAt = x => this.platformAt(x);
    this.g.idle();
    this.g.on('shoot', p => this.spawnOrb(p));
    this.g.on('meltBlast', () => this.meltBlast());
    this.g.on('died', () => this.time.delayedCall(1100, () => { this.mode = 'gameover'; this.events.emit('gameover'); }));
  }

  // ---------- flow (called by the UI scene) ----------
  startRun() { if (this.mode === 'ready') { this.mode = 'running'; this.g.run(); } }
  restart() { this.scene.restart(); this.scene.get('UI').scene.restart(); }
  carry() { return { hearts: this.hearts, chaos: this.chaos, score: this.score, damaged: this.damaged }; }
  /** After a death in a running stage: back to the start of the level, fresh hearts and score. */
  restartLevel() { this.registry.set('stage', 1); this.registry.remove('carry'); this.restart(); }
  /** Stage cleared: on to stage 2, or to the boss. */
  next() {
    this.registry.set('carry', this.carry());
    if (this.stage === 1) { this.registry.set('stage', 2); this.restart(); }
    else this.scene.get('UI').goTo('Boss');
  }
  act(name) {
    if (this.mode !== 'running') return;
    if (name === 'jump') this.g.jump();
    else if (name === 'slide') this.g.slide();
    else if (name === 'magic') this.g.attack();
    else if (name === 'meltdown' && this.chaos >= 100 && this.g.meltdown()) { this.chaos = 0; this.events.emit('chaos', this.chaos); }
  }
  addScore(n) { this.score += n; this.events.emit('score', this.score); }

  // ---------- magic ----------
  spawnOrb(p) {
    const glow = this.add.image(p.x, p.y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x9b4dff).setDepth(13).setDisplaySize(150, 150);
    // the bolt curves towards the nearest creature ahead (easy aiming on a phone); otherwise it flies straight
    let ty = p.y, best = 1300;
    for (const c of this.creatures) { if (!c.alive) continue; const d = c.centre[0] - p.x; if (d > 0 && d < best) { best = d; ty = c.centre[1]; } }
    this.orbs.push({ x: p.x, y: p.y, ty, vx: 1100, r: 20, glow, trail: [] });
  }
  meltBlast() {
    // Provisional rule: the blast clears every enemy ahead of the gremlin on screen (to be confirmed in playtesting).
    for (const c of this.creatures) if (c.alive && c.x > this.g.x - 100 && c.x < this.scale.width + 100) { c.hurt(99); this.defeated(c); }
  }
  defeated(c) { this.g.fx.burst(c.centre, 0.8); this.addScore(c.points); }

  // ---------- main loop ----------
  update(time, deltaMs) {
    const dt = Math.min(0.05, deltaMs / 1000) * this.timeScale;
    this.g.update(dt);
    const v = this.g.worldSpeed;
    if (this.mode !== 'ready') this.dist += v * dt;
    this.swamp.scroll(this.dist);
    this.updateItems(dt);
    const ctx = { gx: this.g.x, groundY: GROUND_Y, scroll: v * dt * (this.mode === 'ready' ? 0 : 1) };
    for (const c of this.creatures) c.update(dt, ctx);
    for (const c of this.creatures) if (c.gone) c.destroy();
    this.creatures = this.creatures.filter(c => !c.gone);
    this.updateOrbs(dt);
    this.drawHazardFx();
    if (this.mode === 'running') this.collide(dt);
    this.drawBoxes();
  }

  updateItems(dt) {
    const W = this.scale.width, t = this.time.now / 1000;
    for (const it of this.items) {
      const x = GREMLIN_X + (it.d - this.dist);
      if (!it.obj && !it.done && x < W + 500) this.spawnItem(it, x);
      if (!it.obj) continue;
      it.obj.x = x;
      if (PICKUPS.has(it.t)) it.obj.y = GROUND_Y - it.h + 8 * Math.sin(t * 3 + it.d);
      if (it.t === 'sludge' || it.t === 'sludgeWide') it.obj.scaleY = it.baseScale * (1 + 0.025 * Math.sin(t * 5 + it.d));   // slow bubbling heave
      if (it.t === 'vines') it.obj.rotation = 0.012 * Math.sin(t * 1.6 + it.d);                                                  // gentle sway
      if (x < -600) { it.obj.destroy(); it.obj = null; it.done = true; }
      if (it.t === 'finish' && !it.reached && this.mode === 'running' && x <= GREMLIN_X) { it.reached = true; this.finish(); }
    }
  }
  spawnItem(it, x) {
    if (CREATURES[it.t]) { const C = CREATURES[it.t]; this.creatures.push(new C(this, x, GROUND_Y, it.lane)); it.done = true; return; }
    let o;
    const L = LOOK[it.t];
    if (it.t === 'plat') {
      const key = it.size === 'small' ? 'plat_small' : 'plat_medium', s = it.size === 'small' ? 1.2 : 0.9, S = this.sizes[key];
      o = this.add.image(x, GROUND_Y - it.h - S.top * s, key).setOrigin(0.5, 0).setScale(s).setDepth(5);
      it.w = S.w * s;
    } else if (it.t === 'vines') {
      // a slimy branch hanging overhead: vine tips stop ~150 px above the ground, so you have to slide
      o = this.add.image(x, GROUND_Y - 140, L.key).setOrigin(0.5, 1).setScale(L.s).setDepth(9);
    } else if (PICKUPS.has(it.t)) {
      o = this.add.image(x, GROUND_Y - it.h, L.key).setScale(L.s).setDepth(7);
    } else if (L) {
      o = this.add.image(x, GROUND_Y + L.sink, L.key).setOrigin(0.5, 1).setScale(L.s).setDepth(5);
      it.baseScale = L.s;
    } else if (it.t === 'finish') {
      o = this.add.image(x, GROUND_Y + 6, 'flag').setOrigin(0.15, 1).setDepth(5);
    }
    // hazards get a pale rim-light so they always read as dangerous against the scenery (WebGL only; harmless elsewhere)
    if (['roots', 'vines', 'mould', 'sludge', 'sludgeWide'].includes(it.t) && o.preFX) o.preFX.addGlow(0xffd23a, 1.4, 0, false, 0.1, 8);
    it.obj = o;
  }
  /** Height (px) of the floating platform under screen x, or 0 for the ground. */
  platformAt(x) {
    for (const it of this.items) if (it.t === 'plat' && it.obj && Math.abs(x - it.obj.x) < it.w / 2 - 25) return it.h;
    return 0;
  }
  itemRect(it) {
    const o = it.obj;
    if (it.t === 'vines') return new Phaser.Geom.Rectangle(o.x - 150, 0, 300, GROUND_Y - 150);
    const b = BOX[it.t]; if (!b) return null;
    if (PICKUPS.has(it.t)) return new Phaser.Geom.Rectangle(o.x - b.w / 2, o.y - b.h / 2, b.w, b.h);
    return new Phaser.Geom.Rectangle(o.x - b.w / 2, GROUND_Y - b.h, b.w, b.h);
  }
  collide(dt) {
    const g = this.g, hb = g.hitbox(); if (!hb) return;
    let inMould = false;
    for (const it of this.items) {
      if (!it.obj || it.done || it.t === 'finish' || it.t === 'plat') continue;
      const r = this.itemRect(it); if (!r || !Phaser.Geom.Intersects.RectangleToRectangle(hb, r)) continue;
      if (it.t === 'crystal') { this.collect(it); this.chaos = Math.min(100, this.chaos + 10); this.events.emit('chaos', this.chaos); }
      else if (it.t === 'taco' || it.t === 'margarita') { this.collect(it); this.addScore(POINTS[it.t]); }
      else if (it.t === 'potion') {
        // +1 heart; at full health it gives a gold bonus heart (max 4). Already on 4: it stays put for later.
        if (this.hearts < MAX_HEARTS) { this.collect(it); this.hearts++; this.events.emit('hearts', this.hearts); }
      } else if (it.t === 'mould') {
        inMould = true; g.slow(0.5);
        this.mouldT = (this.mouldT || 0) + dt;
        if (this.mouldT > MOULD_HURT_AFTER) { this.mouldT = 0; this.takeHit(); }
      } else this.takeHit();
    }
    if (!inMould) this.mouldT = 0;
    for (const c of this.creatures) { const r = c.hitbox(); if (r && Phaser.Geom.Intersects.RectangleToRectangle(hb, r)) this.takeHit(); }
  }
  collect(it) {
    it.done = true; const o = it.obj;
    this.g.fx.burst([o.x, o.y], 0.4);
    this.tweens.add({ targets: o, scale: o.scale * 1.6, alpha: 0, duration: 200, onComplete: () => { o.destroy(); } });
    it.obj = null;
  }
  takeHit() {
    if (this.g.invulnerable) return;
    this.hearts--; this.damaged = true; this.events.emit('hearts', this.hearts);
    if (this.hearts <= 0) { this.mode = 'dying'; this.g.die(); }
    else this.g.hurt();
  }
  finish() {
    this.mode = 'finished';
    this.time.delayedCall(250, () => { this.g.win(); this.events.emit('finished', { stage: this.stage, score: this.score }); });
  }

  // bubbles rising out of sludge pools, spores drifting off mould
  drawHazardFx() {
    const G = this.hazG; G.clear(); const t = this.time.now / 1000;
    for (const it of this.items) {
      if (!it.obj || it.done) continue;
      if (it.t === 'sludge' || it.t === 'sludgeWide') {
        const w = (it.t === 'sludgeWide' ? 520 : 200);
        for (let i = 0; i < (it.t === 'sludgeWide' ? 7 : 3); i++) {
          const ph = (t * 0.9 + i * 0.37 + it.d * 0.001) % 1, bx = it.obj.x - w / 2 + ((i * 97 + it.d) % w), by = GROUND_Y - 6 - ph * 40;
          G.fillStyle(0xc8f53a, 0.85 * (1 - ph)).fillCircle(bx, by, 5 + 7 * ph).lineStyle(2, 0x3f5a08, 0.8 * (1 - ph)).strokeCircle(bx, by, 5 + 7 * ph);
        }
      }
      if (it.t === 'mould') for (let i = 0; i < 4; i++) {
        const ph = (t * 0.5 + i * 0.25) % 1;
        G.fillStyle(i % 2 ? 0xb06cff : 0xc4e534, 0.6 * (1 - ph)).fillCircle(it.obj.x - 80 + i * 50 + 10 * Math.sin(t * 2 + i), GROUND_Y - 60 - ph * 90, 4);
      }
    }
  }

  updateOrbs(dt) {
    const G = this.orbG; G.clear();
    for (const o of this.orbs) {
      o.x += o.vx * dt; o.y += (o.ty - o.y) * Math.min(1, dt * 9); o.trail.unshift([o.x, o.y]); if (o.trail.length > 10) o.trail.pop();
      o.trail.forEach(([x, y], i) => { const a = 1 - i / o.trail.length; G.fillStyle(0x9b4dff, 0.35 * a).fillCircle(x - i * 6, y, o.r * (0.9 * a + 0.2)); });
      G.fillStyle(0xe2beff, 1).fillCircle(o.x, o.y, o.r * 0.8); G.fillStyle(0xffffff, 1).fillCircle(o.x, o.y, o.r * 0.45);
      const t = this.time.now / 50; G.lineStyle(3, 0xee2a8a, 0.8);
      for (let i = 0; i < 3; i++) { const a0 = t + i * 2.1; G.lineBetween(o.x + Math.cos(a0) * o.r * 1.3, o.y + Math.sin(a0) * o.r * 1.3, o.x + Math.cos(a0 + 0.6) * o.r * 1.9, o.y + Math.sin(a0 + 0.6) * o.r * 1.9); }
      o.glow.setPosition(o.x, o.y);
      for (const c of this.creatures) {
        const r = c.hitbox(); if (!r) continue;
        if (Phaser.Geom.Intersects.CircleToRectangle(new Phaser.Geom.Circle(o.x, o.y, o.r + 10), r)) { o.dead = true; c.shot(); this.g.fx.burst([o.x, o.y], 0.4); if (c.dead) this.defeated(c); break; }
      }
      if (o.x > this.scale.width + 100) o.dead = true;
      if (o.dead) o.glow.destroy();
    }
    this.orbs = this.orbs.filter(o => !o.dead);
  }
  drawBoxes() {
    const G = this.boxG; G.clear(); if (!this.showBoxes) return;
    const hb = this.g.hitbox();
    if (hb) G.lineStyle(3, this.g.invulnerable ? 0xffffff : 0xc6f135, 1).strokeRectShape(hb);
    for (const it of this.items) {
      if (!it.obj || it.done) continue;
      if (it.t === 'plat') { G.lineStyle(3, 0x9b4dff, 1).lineBetween(it.obj.x - it.w / 2 + 25, GROUND_Y - it.h, it.obj.x + it.w / 2 - 25, GROUND_Y - it.h); continue; }
      const r = this.itemRect(it); if (r) G.lineStyle(3, PICKUPS.has(it.t) ? 0x9b4dff : 0xee2a8a, 1).strokeRectShape(r);
    }
    for (const c of this.creatures) { const r = c.hitbox(); if (r) G.lineStyle(3, 0xee2a8a, 1).strokeRectShape(r); }
  }
}
