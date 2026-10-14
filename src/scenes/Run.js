// The test run: scrolling swamp-dusk placeholder world, fixed course, hearts, Chaos Meter, Meltdown.
import { Gremlin } from '../gremlin/Gremlin.js';
import { COURSE } from '../course.js';
import { Swamp } from '../world/Swamp.js';
import { Frog, Gator, Bat, Spider } from '../creatures/Creatures.js';

const CREATURES = { frog: Frog, gator: Gator, bat: Bat, spider: Spider };

export const GROUND_Y = 870, GREMLIN_X = 520, GREMLIN_H = 330;
const VIEW_W = 1920;

// collision boxes per placeholder type, relative to the item's anchor (bottom-centre on the ground, or centre for pickups)
const SHAPES = {
  log: { w: 140, h: 70 }, stump: { w: 110, h: 330 },
  crystal: { w: 70, h: 90 }, potion: { w: 70, h: 90 },
};

export class Run extends Phaser.Scene {
  constructor() { super('Run'); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.mode = 'ready';            // ready → running → dead / finished
    this.hearts = 3; this.chaos = 0; this.dist = 0; this.timeScale = 1; this.showBoxes = false;
    this.swamp = new Swamp(this, GROUND_Y);
    this.items = COURSE.map(c => ({ ...c, obj: null, done: false }));
    this.orbs = []; this.creatures = []; this.score = 0;
    this.orbG = this.add.graphics().setDepth(13).setBlendMode(Phaser.BlendModes.ADD);
    this.boxG = this.add.graphics().setDepth(30);

    this.g = new Gremlin(this, GREMLIN_X, GROUND_Y, GREMLIN_H);
    this.g.idle();
    this.g.on('shoot', p => this.spawnOrb(p));
    this.g.on('meltBlast', () => this.meltBlast());
    this.g.on('died', () => this.time.delayedCall(1100, () => { this.mode = 'gameover'; this.events.emit('gameover'); }));
  }

  // ---------- actions called by the UI scene ----------
  startRun() { if (this.mode === 'ready') { this.mode = 'running'; this.g.run(); } }
  restart() { this.scene.restart(); this.scene.get('UI').scene.restart(); }
  act(name) {
    if (this.mode !== 'running') return;
    if (name === 'jump') this.g.jump();
    else if (name === 'slide') this.g.slide();
    else if (name === 'magic') this.g.attack();
    else if (name === 'meltdown' && this.chaos >= 100 && this.g.meltdown()) { this.chaos = 0; this.events.emit('chaos', this.chaos); }
  }

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
  defeated(c) { this.g.fx.burst(c.centre, 0.8); this.score += c.points; }

  // ---------- main loop ----------
  update(time, deltaMs) {
    const dt = Math.min(0.05, deltaMs / 1000) * this.timeScale;
    if (this.mode === 'paused') return;
    this.g.update(dt);
    const v = this.g.worldSpeed;
    if (this.mode === 'running' || this.mode === 'finished' || this.mode === 'gameover') this.dist += v * dt;
    this.swamp.scroll(this.dist);
    this.updateItems(dt);
    const ctx = { gx: this.g.x, groundY: GROUND_Y, scroll: v * dt * (this.mode === 'ready' ? 0 : 1) };
    for (const c of this.creatures) c.update(dt, ctx);
    for (const c of this.creatures) if (c.gone) c.destroy();
    this.creatures = this.creatures.filter(c => !c.gone);
    this.updateOrbs(dt);
    if (this.mode === 'running') this.collide();
    this.drawBoxes();
  }

  updateItems(dt) {
    const W = this.scale.width;
    for (const it of this.items) {
      const x = GREMLIN_X + (it.d - this.dist);
      if (!it.obj && !it.done && x < W + 400) this.spawnItem(it, x);
      if (it.creature) continue;
      if (!it.obj) continue;
      if (it.obj.active) it.obj.x = x + (it.dx || 0);
      if ((it.t === 'crystal' || it.t === 'potion') && !it.done) it.obj.y = GROUND_Y - it.h + 8 * Math.sin(this.time.now / 300 + it.d);
      if (x < -400 && it.obj.active) { it.obj.destroy(); it.obj = null; it.done = true; }
      if (it.t === 'finish' && !it.done && this.mode === 'running' && x <= GREMLIN_X) this.finish(it);
    }
  }
  spawnItem(it, x) {
    if (CREATURES[it.t]) { const C = CREATURES[it.t]; const c = new C(this, x, GROUND_Y, it.lane); this.creatures.push(c); it.creature = c; it.done = true; return; }
    let o;
    switch (it.t) {
      case 'log': o = this.add.image(x, GROUND_Y + 6, 'log').setOrigin(0.5, 1); break;
      case 'stump': o = this.add.image(x, GROUND_Y + 6, 'stump').setOrigin(0.5, 1); break;
      case 'vines': o = this.add.image(x, GROUND_Y - 135, 'branch').setOrigin(0.5, 1).setDisplaySize(280, GROUND_Y - 135); break;
      case 'crystal': o = this.add.image(x, GROUND_Y - it.h, 'crystal').setScale(0.8); break;
      case 'potion': o = this.add.image(x, GROUND_Y - it.h, 'potion').setScale(0.8); break;
      case 'finish': o = this.add.image(x, GROUND_Y + 6, 'flag').setOrigin(0.15, 1); break;
    }
    it.obj = o.setDepth(5);
  }
  itemRect(it) {
    const o = it.obj;
    if (it.t === 'vines') return new Phaser.Geom.Rectangle(o.x - 60, 0, 120, GROUND_Y - 135);
    const s = SHAPES[it.t]; if (!s) return null;
    if (it.t === 'crystal' || it.t === 'potion') return new Phaser.Geom.Rectangle(o.x - s.w / 2, o.y - s.h / 2, s.w, s.h);
    return new Phaser.Geom.Rectangle(o.x - s.w / 2, o.y - s.h, s.w, s.h);
  }
  collide() {
    const hb = this.g.hitbox(); if (!hb) return;
    for (const it of this.items) {
      if (!it.obj || it.done || it.t === 'finish') continue;
      const r = this.itemRect(it); if (!r || !Phaser.Geom.Intersects.RectangleToRectangle(hb, r)) continue;
      if (it.t === 'crystal') {
        it.done = true; this.chaos = Math.min(100, this.chaos + 10); this.events.emit('chaos', this.chaos);
        this.g.fx.burst([it.obj.x, it.obj.y], 0.45);
        this.tweens.add({ targets: it.obj, scale: 1.6, alpha: 0, duration: 200, onComplete: () => it.obj && it.obj.destroy() });
      } else if (it.t === 'potion') {
        // Potion at full health: GDD marks this TO DECIDE. For now it stays put and is only used when a heart is missing.
        if (this.hearts < 3) { it.done = true; this.hearts++; this.events.emit('hearts', this.hearts); this.tweens.add({ targets: it.obj, scale: 1.6, alpha: 0, duration: 200 }); }
      } else this.takeHit();
    }
    for (const c of this.creatures) { const r = c.hitbox(); if (r && Phaser.Geom.Intersects.RectangleToRectangle(hb, r)) this.takeHit(); }
  }
  takeHit() {
    if (this.g.invulnerable) return;
    this.hearts--; this.events.emit('hearts', this.hearts);
    if (this.hearts <= 0) { this.mode = 'dying'; this.g.die(); }
    else this.g.hurt();
  }
  finish(it) {
    it.done = true; this.mode = 'finished';
    this.time.delayedCall(250, () => { this.g.win(); this.events.emit('finished'); });
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
    for (const it of this.items) { if (!it.obj || it.done) continue; const r = this.itemRect(it); if (r) G.lineStyle(3, it.t === 'crystal' || it.t === 'potion' ? 0x9b4dff : 0xee2a8a, 1).strokeRectShape(r); }
    for (const c of this.creatures) { const r = c.hitbox(); if (r) G.lineStyle(3, 0xee2a8a, 1).strokeRectShape(r); }
  }
}
