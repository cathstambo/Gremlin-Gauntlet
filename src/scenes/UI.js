// HUD and controls: hearts, Chaos Meter, pause, touch buttons, swipe gestures, keyboard, overlays.
const FONT = 'Lilita One, Arial Rounded MT Bold, Trebuchet MS, sans-serif';
const BODY = 'Atkinson Hyperlegible, system-ui, sans-serif';
const INK = '#ece6f5', VIOLET = 0x9b4dff, ACID = 0xc6f135;

export class UI extends Phaser.Scene {
  constructor() { super('UI'); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.run = this.scene.get('Run');
    this.input.addPointer(3);   // multi-touch: jump while holding slide, etc.

    // hearts
    this.heartIcons = [0, 1, 2].map(i => this.add.image(70 + i * 92, 70, 'heart').setScale(0.8));
    // Chaos Meter
    this.add.text(W / 2, 34, 'CHAOS', { fontFamily: FONT, fontSize: 30, color: INK }).setOrigin(0.5, 0.5).setAlpha(0.85);
    this.add.rectangle(W / 2, 78, 520, 34, 0x0e1614, 0.75).setStrokeStyle(3, 0xece6f5, 0.35);
    this.meter = this.add.rectangle(W / 2 - 256, 78, 0, 26, VIOLET).setOrigin(0, 0.5);
    this.meterGlow = this.add.rectangle(W / 2, 78, 530, 44).setStrokeStyle(5, ACID, 1).setAlpha(0);
    this.ready = this.add.text(W / 2, 122, 'MELTDOWN READY', { fontFamily: FONT, fontSize: 26, color: '#c6f135' }).setOrigin(0.5).setAlpha(0);

    // pause + fullscreen
    this.pauseBtn = this.roundButton(W - 70, 70, 52, 'II', () => this.togglePause(), 30);
    if (this.scale.fullscreenAvailable) this.roundButton(W - 190, 70, 52, '⛶', () => this.scale.isFullscreen ? this.scale.stopFullscreen() : this.scale.startFullscreen(), 34);

    // action buttons (big, thumb-sized)
    const R = 92, by = H - 130;
    this.roundButton(150, by, R, 'SLIDE', () => this.act('slide'));
    this.roundButton(W - 150, by, R, 'JUMP', () => this.act('jump'));
    this.roundButton(W - 370, by, R, 'MAGIC', () => this.act('magic'), 30, VIOLET);
    this.meltBtn = this.roundButton(W - 260, by - 220, 84, 'MELT\nDOWN', () => this.act('meltdown'), 26, ACID);
    this.meltBtn.setVisible(false);

    // swipe / tap anywhere else
    this.input.on('pointerdown', (p, over) => { if (over.length) return; this.gesture = { x: p.x, y: p.y, done: false, id: p.id }; });
    this.input.on('pointermove', p => {
      const g = this.gesture; if (!g || g.done || g.id !== p.id) return;
      const dx = p.x - g.x, dy = p.y - g.y;
      if (Math.abs(dx) > Math.abs(dy) && dx > 70) { g.done = true; this.act('magic'); }
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
      else if (['ArrowRight', 'KeyD', 'KeyF'].includes(k)) this.act('magic');
      else if (k === 'KeyM' || k === 'KeyE') this.act('meltdown');
      else if (k === 'KeyP' || k === 'Escape') this.togglePause();
      else if (k === 'KeyH') this.run.showBoxes = !this.run.showBoxes;
    });

    // overlays
    this.overlay = this.add.container(0, 0).setDepth(50);
    this.showMessage('GREMLIN GAUNTLET', 'Test run · tap to start', 'Tap / swipe up: jump (tap again in the air to double jump)\nSwipe down: slide   ·   Swipe right: magic\nCollect 10 crystals to fill the Chaos Meter, then hit MELTDOWN');

    this.run.events.on('hearts', n => this.setHearts(n));
    this.run.events.on('chaos', c => this.setChaos(c));
    this.run.events.on('gameover', () => this.showMessage('SPLAT.', 'Tap to try again'));
    this.run.events.on('finished', () => this.time.delayedCall(1200, () => this.showMessage('YOU MAGNIFICENT LITTLE BASTARD!', 'Course complete · tap to run again')));
    this.setHearts(3); this.setChaos(0);
  }

  roundButton(x, y, r, label, fn, size = 30, ring = 0xece6f5) {
    const c = this.add.container(x, y);
    const bg = this.add.circle(0, 0, r, 0x0e1614, 0.5).setStrokeStyle(4, ring, 0.7);
    const t = this.add.text(0, 0, label, { fontFamily: FONT, fontSize: size, color: INK, align: 'center' }).setOrigin(0.5);
    c.add([bg, t]); c.setSize(r * 2, r * 2);
    c.setInteractive(new Phaser.Geom.Circle(r, r, r), Phaser.Geom.Circle.Contains);
    c.on('pointerdown', (p, lx, ly, e) => { e && e.stopPropagation && e.stopPropagation(); bg.setFillStyle(VIOLET, 0.85); fn(); });
    c.on('pointerup', () => bg.setFillStyle(0x0e1614, 0.5));
    c.on('pointerout', () => bg.setFillStyle(0x0e1614, 0.5));
    c.bg = bg; return c;
  }

  act(name) {
    const r = this.run;
    if (this.overlay.visible) {
      if (r.mode === 'ready') { this.overlay.setVisible(false); r.startRun(); }
      else if (r.mode === 'gameover' || r.mode === 'finished') r.restart();
      return;
    }
    if (this.paused) return;
    r.act(name);
  }
  togglePause() {
    if (this.overlay.visible && !this.paused) return;
    this.paused = !this.paused;
    if (this.paused) { this.scene.pause('Run'); this.showPauseMenu(); }
    else { this.scene.resume('Run'); this.overlay.setVisible(false); }
  }
  showPauseMenu() {
    const W = this.scale.width, H = this.scale.height, o = this.overlay; o.removeAll(true);
    o.add(this.add.rectangle(W / 2, H / 2, W, H, 0x0b1210, 0.78).setInteractive());
    o.add(this.add.text(W / 2, 250, 'PAUSED', { fontFamily: FONT, fontSize: 84, color: INK }).setOrigin(0.5));
    const opts = [
      ['Resume', () => this.togglePause()],
      ['Restart run', () => { this.paused = false; this.scene.resume('Run'); this.run.restart(); }],
      [() => `Hitboxes: ${this.run.showBoxes ? 'ON' : 'OFF'}`, () => { this.run.showBoxes = !this.run.showBoxes; }],
      [() => `Slow motion: ${this.run.timeScale < 1 ? 'ON' : 'OFF'}`, () => { this.run.timeScale = this.run.timeScale < 1 ? 1 : 0.25; }],
    ];
    opts.forEach(([label, fn], i) => {
      const y = 420 + i * 120;
      const bg = this.add.rectangle(W / 2, y, 560, 90, 0x1b2f29, 1).setStrokeStyle(3, 0xece6f5, 0.4).setInteractive({ useHandCursor: true });
      const txt = this.add.text(W / 2, y, typeof label === 'function' ? label() : label, { fontFamily: FONT, fontSize: 40, color: INK }).setOrigin(0.5);
      bg.on('pointerdown', () => { fn(); if (typeof label === 'function') txt.setText(label()); });
      o.add([bg, txt]);
    });
    o.setVisible(true);
  }
  showMessage(title, sub, help) {
    const W = this.scale.width, H = this.scale.height, o = this.overlay; o.removeAll(true);
    const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x0b1210, 0.55).setInteractive();
    bg.on('pointerdown', () => this.act('tap'));
    o.add(bg);
    o.add(this.add.text(W / 2, H * 0.3, title, { fontFamily: FONT, fontSize: title.length > 20 ? 72 : 110, color: INK, stroke: '#2b0d55', strokeThickness: 12, align: 'center' }).setOrigin(0.5));
    o.add(this.add.text(W / 2, H * 0.3 + 100, sub, { fontFamily: FONT, fontSize: 44, color: '#c6f135' }).setOrigin(0.5));
    if (help) o.add(this.add.text(W / 2, H * 0.3 + 200, help, { fontFamily: BODY, fontSize: 30, color: INK, align: 'center', lineSpacing: 10 }).setOrigin(0.5, 0).setAlpha(0.85));
    o.setVisible(true);
  }
  setHearts(n) { this.heartIcons.forEach((h, i) => { h.setAlpha(i < n ? 1 : 0.18); if (i === n) this.tweens.add({ targets: h, scale: { from: 1.3, to: 0.8 }, duration: 250 }); }); }
  setChaos(c) {
    this.tweens.add({ targets: this.meter, width: 512 * c / 100, duration: 200 });
    const full = c >= 100;
    this.meltBtn.setVisible(full); this.ready.setAlpha(full ? 1 : 0);
    if (full && !this.pulse) this.pulse = this.tweens.add({ targets: [this.meterGlow, this.meltBtn], alpha: { from: 0.3, to: 1 }, scale: { from: 1, to: 1.06 }, yoyo: true, repeat: -1, duration: 420 });
    if (!full && this.pulse) { this.pulse.stop(); this.pulse = null; this.meterGlow.setAlpha(0); this.meltBtn.setScale(1).setAlpha(1); }
  }
}
