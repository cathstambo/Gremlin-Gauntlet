// HUD and controls for whichever game scene is active ('Run' = test course, 'Boss' = Eddie's arena):
// hearts, Chaos Meter, boss health, pause, touch buttons, swipe gestures, keyboard, overlays.
const FONT = 'Lilita One, Arial Rounded MT Bold, Trebuchet MS, sans-serif';
const BODY = 'Atkinson Hyperlegible, system-ui, sans-serif';
const INK = '#ece6f5', VIOLET = 0x9b4dff, ACID = 0xc6f135, MOULD = 0x9fcc1e;

export class UI extends Phaser.Scene {
  constructor() { super('UI'); }

  get isBoss() { return this.registry.get('gameScene') === 'Boss'; }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.run = this.scene.get(this.registry.get('gameScene') || 'Run');
    this.input.addPointer(3);   // multi-touch: move with one thumb while jumping with the other
    this.paused = false;

    // hearts
    this.heartIcons = [0, 1, 2, 3].map(i => this.add.image(70 + i * 92, 70, i === 3 ? 'heartGold' : 'heart').setScale(0.8));   // 4th = gold bonus heart
    this.scoreTxt = this.add.text(30, 120, '0', { fontFamily: FONT, fontSize: 40, color: '#ffd76a', stroke: '#2b1a05', strokeThickness: 8 }).setOrigin(0, 0);
    // Chaos Meter
    const cx = this.isBoss ? 760 : W / 2, mw = this.isBoss ? 420 : 520;
    this.add.text(cx, 34, 'CHAOS', { fontFamily: FONT, fontSize: 30, color: INK }).setOrigin(0.5).setAlpha(0.85);
    this.add.rectangle(cx, 78, mw, 34, 0x0e1614, 0.75).setStrokeStyle(3, 0xece6f5, 0.35);
    this.meterW = mw - 8; this.meter = this.add.rectangle(cx - this.meterW / 2, 78, 0, 26, VIOLET).setOrigin(0, 0.5);
    this.meterGlow = this.add.rectangle(cx, 78, mw + 10, 44).setStrokeStyle(5, ACID, 1).setAlpha(0);
    this.ready = this.add.text(cx, 122, 'MELTDOWN READY', { fontFamily: FONT, fontSize: 26, color: '#c6f135' }).setOrigin(0.5).setAlpha(0);
    // boss health
    if (this.isBoss) {
      const bx = 1370;
      this.add.text(bx, 34, 'EDDIE · THE MOULD KING', { fontFamily: FONT, fontSize: 30, color: '#d8ff8a' }).setOrigin(0.5).setAlpha(0.95);
      this.add.rectangle(bx, 78, 560, 34, 0x0e1614, 0.75).setStrokeStyle(3, 0xd8ff8a, 0.45);
      this.bossBar = this.add.rectangle(bx - 276, 78, 552, 26, MOULD).setOrigin(0, 0.5);
      for (const f of [0.7, 0.35]) this.add.rectangle(bx - 276 + 552 * f, 78, 4, 30, 0x0e1614, 0.9);   // phase marks
      this.phaseTxt = this.add.text(bx, 122, 'PHASE 1 · ROCK BUFFET', { fontFamily: FONT, fontSize: 24, color: '#d8ff8a' }).setOrigin(0.5).setAlpha(0.85);
      this.vulTxt = this.add.text(bx, 160, 'VULNERABLE! BLAST HIM!', { fontFamily: FONT, fontSize: 30, color: '#c6f135', stroke: '#14200a', strokeThickness: 8 }).setOrigin(0.5).setAlpha(0);
    }

    // pause + fullscreen
    this.roundButton(W - 70, 70, 52, 'II', () => this.togglePause(), 30);
    if (this.scale.fullscreenAvailable) this.roundButton(W - 190, 70, 52, '⛶', () => this.scale.isFullscreen ? this.scale.stopFullscreen() : this.scale.startFullscreen(), 34);

    // action buttons (big, thumb-sized)
    const R = 92, by = H - 130;
    this.roundButton(W - 150, by, R, 'JUMP', () => this.act('jump'));
    this.roundButton(W - 370, by, R, 'MAGIC', () => this.act('magic'), 30, VIOLET);
    this.meltBtn = this.roundButton(W - 260, by - 220, 84, 'MELT\nDOWN', () => this.act('meltdown'), 26, ACID);
    this.meltBtn.setVisible(false);
    if (this.isBoss) {
      // left thumb: hold arrows to move, SLIDE above them
      this.roundButton(120, by, 84, '◀', () => this.act('left', true), 46, 0xece6f5, () => this.act('left', false));
      this.roundButton(320, by, 84, '▶', () => this.act('right', true), 46, 0xece6f5, () => this.act('right', false));
      this.roundButton(220, by - 200, 80, 'SLIDE', () => this.act('slide'), 28);
    } else {
      this.roundButton(150, by, R, 'SLIDE', () => this.act('slide'));
    }

    // swipe / tap anywhere else
    this.input.on('pointerdown', (p, over) => { if (over.length) return; this.gesture = { x: p.x, y: p.y, done: false, id: p.id }; });
    this.input.on('pointermove', p => {
      const g = this.gesture; if (!g || g.done || g.id !== p.id) return;
      const dx = p.x - g.x, dy = p.y - g.y;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 70) { g.done = true; this.act(this.isBoss ? (dx > 0 ? 'dashR' : 'dashL') : (dx > 0 ? 'magic' : 'none')); }
      else if (dy > 60) { g.done = true; this.act('slide'); }
      else if (dy < -60) { g.done = true; this.act('jump'); }
    });
    this.input.on('pointerup', p => { const g = this.gesture; if (g && !g.done && g.id === p.id) this.act('jump'); this.gesture = null; });
    // keyboard
    this.input.keyboard.on('keydown', e => {
      if (e.repeat) return;
      const k = e.code;
      if (['Space', 'ArrowUp', 'KeyW'].includes(k)) this.act('jump');
      else if (['ArrowDown', 'KeyS'].includes(k)) this.act('slide');
      else if (this.isBoss && ['ArrowLeft', 'KeyA'].includes(k)) this.act('left', true);
      else if (this.isBoss && ['ArrowRight', 'KeyD'].includes(k)) this.act('right', true);
      else if (['KeyF', 'KeyJ', 'Enter'].includes(k) || (!this.isBoss && ['ArrowRight', 'KeyD'].includes(k))) this.act('magic');
      else if (k === 'KeyM' || k === 'KeyE') this.act('meltdown');
      else if (k === 'KeyP' || k === 'Escape') this.togglePause();
      else if (k === 'KeyH') this.run.showBoxes = !this.run.showBoxes;
    });
    this.input.keyboard.on('keyup', e => {
      if (!this.isBoss) return;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) this.act('left', false);
      if (['ArrowRight', 'KeyD'].includes(e.code)) this.act('right', false);
    });

    // overlays
    this.overlay = this.add.container(0, 0).setDepth(50);
    const stage = this.registry.get('stage') || 1, fresh = !this.registry.get('carry');
    if (this.isBoss) this.showMessage('THE MOULD KING', 'Level 1 boss · The Festering Swamp · tap to start',
      '◀ ▶ or swipe left/right: move   ·   Tap / swipe up: jump (tap again for double jump)\nSwipe down: slide   ·   MAGIC: only hurts Eddie while he’s VULNERABLE\nWatch the markers: green = mould bomb, red = danger, gold = where Eddie lands');
    else if (stage === 2) this.showMessage('THE MOULD SWAMP · PART 2', 'Deeper in. Nastier. · tap to start', 'Eddie waits at the end of this one.');
    else this.showMessage('GREMLIN GAUNTLET', 'World 1 · The Mould Swamp · tap to start', 'Tap / swipe up: jump (tap again in the air to double jump)\nSwipe down: slide   ·   Swipe right: magic\nCollect 10 crystals to fill the Chaos Meter, then hit MELTDOWN', true);

    const ev = this.run.events;
    ev.on('hearts', n => this.setHearts(n));
    ev.on('chaos', c => this.setChaos(c));
    ev.on('score', n => this.setScore(n));
    ev.on('bosshp', (f, ph) => this.setBoss(f, ph));
    ev.on('bossvuln', d => { this.tweens.killTweensOf(this.vulTxt); this.vulTxt.setAlpha(1); this.tweens.add({ targets: this.vulTxt, alpha: 0, delay: d * 1000 - 300, duration: 300 }); });
    ev.on('gameover', msg => this.showMessage(msg || 'SPLAT.', this.isBoss ? 'Tap to retry the boss (3 hearts, Chaos Meter reset)' : 'Tap to restart the swamp from the beginning'));
    ev.on('finished', info => this.time.delayedCall(this.isBoss ? 300 : 1200, () => {
      if (this.isBoss) this.showMessage('BOSS DEFEATED', `The Mould King has been mouldered · ${info.time.toFixed(1)} s · score ${info.score.toLocaleString()}`, info.breakdown + '\n\nTap to play World 1 again');
      else if (info.stage === 1) this.showMessage('SWAMP PART 1 CLEARED', 'Tap for part 2', `Score so far: ${info.score.toLocaleString()}`);
      else this.showMessage('SWAMP CLEARED', 'Tap to face THE MOULD KING', `Score so far: ${info.score.toLocaleString()}`);
    }));
    this.setHearts(this.run.hearts ?? 3); this.setChaos(this.run.chaos ?? 0); this.setScore(this.run.score ?? 0);
  }

  roundButton(x, y, r, label, fn, size = 30, ring = 0xece6f5, onUp = null) {
    const c = this.add.container(x, y);
    const bg = this.add.circle(0, 0, r, 0x0e1614, 0.5).setStrokeStyle(4, ring, 0.7);
    const t = this.add.text(0, 0, label, { fontFamily: FONT, fontSize: size, color: INK, align: 'center' }).setOrigin(0.5);
    c.add([bg, t]); c.setSize(r * 2, r * 2);
    c.setInteractive(new Phaser.Geom.Circle(r, r, r), Phaser.Geom.Circle.Contains);
    c.on('pointerdown', () => { bg.setFillStyle(VIOLET, 0.85); fn(); });
    const up = () => { bg.setFillStyle(0x0e1614, 0.5); if (onUp && c.held) onUp(); c.held = false; };
    c.on('pointerdown', () => { c.held = true; });
    c.on('pointerup', up); c.on('pointerout', up);
    return c;
  }

  /** Start World 1 again from swamp part 1. */
  newLevel() { this.registry.set('stage', 1); this.registry.remove('carry'); this.goTo('Run'); }
  /** Testing shortcut: part 1 → part 2 → boss → back to part 1 (fresh hearts each time). */
  skipAhead() {
    if (this.isBoss) return this.newLevel();
    this.registry.remove('carry');
    if ((this.registry.get('stage') || 1) === 1) { this.registry.set('stage', 2); this.goTo('Run'); } else this.goTo('Boss');
  }
  setScore(n) { this.scoreTxt.setText(n.toLocaleString()); }

  // switch between the running stages and the boss arena
  goTo(sceneKey) {
    const cur = this.registry.get('gameScene') || 'Run';
    this.registry.set('gameScene', sceneKey);
    this.scene.stop(cur); this.scene.start(sceneKey); this.scene.restart();
  }

  act(name, down = true) {
    const r = this.run;
    if (this.overlay.visible && !this.paused) {
      if (!down) return;
      if (r.mode === 'ready') { this.overlay.setVisible(false); r.startRun(); }
      else if (r.mode === 'gameover') this.isBoss ? r.retry() : r.restartLevel();
      else if (r.mode === 'finished') r.next();
      else if (r.mode === 'won') this.newLevel();
      return;
    }
    if (this.paused) return;
    r.act(name, down);
  }
  togglePause() {
    if (this.overlay.visible && !this.paused) return;
    this.paused = !this.paused;
    if (this.paused) { this.scene.pause(this.run.scene.key); this.showPauseMenu(); }
    else { this.scene.resume(this.run.scene.key); this.overlay.setVisible(false); }
  }
  showPauseMenu() {
    const W = this.scale.width, H = this.scale.height, o = this.overlay; o.removeAll(true);
    o.add(this.add.rectangle(W / 2, H / 2, W, H, 0x0b1210, 0.78).setInteractive());
    o.add(this.add.text(W / 2, 200, 'PAUSED', { fontFamily: FONT, fontSize: 84, color: INK }).setOrigin(0.5));
    const opts = [
      ['Resume', () => this.togglePause()],
      [this.isBoss ? 'Restart boss fight' : 'Restart run', () => { this.paused = false; this.scene.resume(this.run.scene.key); this.run.restart(); }],
      [this.isBoss ? 'Back to swamp part 1' : (this.registry.get('stage') === 2 ? 'Skip to the boss' : 'Skip to swamp part 2'), () => { this.paused = false; this.skipAhead(); }],
      [() => `Hitboxes: ${this.run.showBoxes ? 'ON' : 'OFF'}`, () => { this.run.showBoxes = !this.run.showBoxes; }],
      [() => `Slow motion: ${this.run.timeScale < 1 ? 'ON' : 'OFF'}`, () => { this.run.timeScale = this.run.timeScale < 1 ? 1 : 0.25; }],
    ];
    opts.forEach(([label, fn], i) => {
      const y = 340 + i * 115;
      const bg = this.add.rectangle(W / 2, y, 600, 90, 0x1b2f29, 1).setStrokeStyle(3, 0xece6f5, 0.4).setInteractive({ useHandCursor: true });
      const txt = this.add.text(W / 2, y, typeof label === 'function' ? label() : label, { fontFamily: FONT, fontSize: 40, color: INK }).setOrigin(0.5);
      bg.on('pointerdown', () => { fn(); if (typeof label === 'function') txt.setText(label()); });
      o.add([bg, txt]);
    });
    o.setVisible(true);
  }
  showMessage(title, sub, help, bossLink = false) {
    const W = this.scale.width, H = this.scale.height, o = this.overlay; o.removeAll(true);
    const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x0b1210, 0.6).setInteractive();
    bg.on('pointerdown', () => this.act('tap'));
    o.add(bg);
    o.add(this.add.text(W / 2, H * 0.27, title, { fontFamily: FONT, fontSize: title.length > 22 ? 70 : 110, color: INK, stroke: '#2b0d55', strokeThickness: 12, align: 'center' }).setOrigin(0.5));
    o.add(this.add.text(W / 2, H * 0.27 + 100, sub, { fontFamily: FONT, fontSize: 40, color: '#c6f135', align: 'center' }).setOrigin(0.5));
    if (help) o.add(this.add.text(W / 2, H * 0.27 + 180, help, { fontFamily: BODY, fontSize: 30, color: INK, align: 'center', lineSpacing: 10 }).setOrigin(0.5, 0).setAlpha(0.88));
    if (bossLink) {
      const b = this.add.rectangle(W / 2, H - 150, 640, 96, 0x22341a, 1).setStrokeStyle(4, MOULD, 0.9).setInteractive({ useHandCursor: true });
      const t = this.add.text(W / 2, H - 150, 'Skip to the boss: THE MOULD KING', { fontFamily: FONT, fontSize: 36, color: '#d8ff8a' }).setOrigin(0.5);
      b.on('pointerdown', (p, x, y, e) => { e.stopPropagation(); this.registry.remove('carry'); this.goTo('Boss'); });
      o.add([b, t]);
    }
    o.setVisible(true);
  }
  setHearts(n) { this.heartIcons.forEach((h, i) => { h.setVisible(i < 3 || n > 3); h.setAlpha(i < n ? 1 : 0.18); if (i === n) this.tweens.add({ targets: h, scale: { from: 1.3, to: 0.8 }, duration: 250 }); }); }
  setChaos(c) {
    this.tweens.add({ targets: this.meter, width: this.meterW * c / 100, duration: 200 });
    const full = c >= 100;
    this.meltBtn.setVisible(full); this.ready.setAlpha(full ? 1 : 0);
    if (full && !this.pulse) this.pulse = this.tweens.add({ targets: [this.meterGlow, this.meltBtn], alpha: { from: 0.3, to: 1 }, scale: { from: 1, to: 1.06 }, yoyo: true, repeat: -1, duration: 420 });
    if (!full && this.pulse) { this.pulse.stop(); this.pulse = null; this.meterGlow.setAlpha(0); this.meltBtn.setScale(1).setAlpha(1); }
  }
  setBoss(f, ph) {
    this.tweens.add({ targets: this.bossBar, width: 552 * f, duration: 150 });
    this.phaseTxt.setText(['', 'PHASE 1 · ROCK BUFFET', 'PHASE 2 · MOULD MAYHEM', 'PHASE 3 · THE MOULDENING'][ph]);
  }
}
