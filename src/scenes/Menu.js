// Start menu (Cath, 16 Oct 2026): GREMLIN GAUNTLET, EASY / NORMAL / HARD, the five worlds as cards in two rows
// (title, thumbnail, best score, FULL EVENT / BOSS), and a ? button for How to Play. No sound on this screen.
// Worlds 4 and 5 show "Coming soon". All built worlds are open from the start. Background: Cath's art to come.
import { Music } from '../audio/Music.js?v=20261016122744';
import { WORLDS } from '../worlds.js?v=20261016122744';
import { DIFF, LEVELS, getBest } from '../difficulty.js?v=20261016122744';

const FONT = 'Lilita One, Arial Rounded MT Bold, Trebuchet MS, sans-serif';
const BODY = 'Atkinson Hyperlegible, system-ui, sans-serif';
const INK = '#ece6f5', VIOLET = 0x9b4dff, ACID = 0xc6f135, PINK = 0xff7ae0;
// the five worlds in the locked GDD order (4 and 5 are not built yet)
const CARDS = [
  { n: 1, title: 'THE FESTERING SWAMP', boss: 'EDDIE · THE MOULD KING' },
  { n: 2, title: 'MEADOWS OF MALICIOUS HAPPINESS', boss: 'CATALYTIK · THE EVIL OVERLORD' },
  { n: 3, title: 'THE ALASKAN WILDERNESS', boss: 'GRUNT · WRATH OF THE HAIRBALL' },
  // World 4 is in testing: its card only opens on the test address (…/#test4) until Cath approves it
  { n: 4, title: 'THE CHEDDAR CARTEL', boss: 'RINA · QUESO JEFE', soon: location.hash !== '#test4' },
  { n: 5, title: 'DUNGEON OF QUESTIONABLE PLEASURES', boss: 'SYLVANAS', soon: true },
];
const CW = 560, CH = 392, TH = 184;   // card size, thumbnail height

export class Menu extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    Music.play(this, null);   // silent menu
    this.input.addPointer(2);
    // placeholder backdrop until Cath's background arrives: deep purple night with a soft glow
    if (this.textures.exists('menu_bg')) this.add.image(W / 2, H / 2, 'menu_bg').setDisplaySize(W, H);
    else {
      const g = this.add.graphics();
      g.fillGradientStyle(0x1a0f2e, 0x1a0f2e, 0x0b1210, 0x0b1210, 1).fillRect(0, 0, W, H);
      this.add.image(W / 2, 120, 'glow').setTint(VIOLET).setAlpha(0.35).setDisplaySize(1600, 520);
    }
    // title
    this.add.text(W / 2, 92, 'GREMLIN GAUNTLET', { fontFamily: FONT, fontSize: 112, color: INK, stroke: '#2b0d55', strokeThickness: 16 }).setOrigin(0.5);
    // difficulty
    this.diffBtns = {};
    Object.keys(LEVELS).forEach((k, i) => {
      const x = W / 2 + (i - 1) * 270, y = 206;
      const bg = this.add.rectangle(x, y, 244, 64, 0x0e1614, 0.75).setStrokeStyle(4, 0xece6f5, 0.5).setInteractive({ useHandCursor: true });
      const t = this.add.text(x, y, LEVELS[k].label, { fontFamily: FONT, fontSize: 34, color: INK }).setOrigin(0.5);
      bg.on('pointerdown', () => { DIFF.level = k; this.refresh(); });
      this.diffBtns[k] = { bg, t };
    });
    // How to Play
    this.roundBtn(W - 80, 80, 50, '?', () => this.showHelp(), 54);
    // world cards: 3 on top, 2 below (centred)
    this.cards = [];
    CARDS.forEach((c, i) => {
      const row = i < 3 ? 0 : 1, col = row === 0 ? i : i - 3, n = row === 0 ? 3 : 2, gap = 40;
      const x = W / 2 + (col - (n - 1) / 2) * (CW + gap), y = 262 + row * (CH + 22) + CH / 2;
      this.cards.push(this.makeCard(c, x, y));
    });
    this.refresh();
    this.help = null;
  }

  roundBtn(x, y, r, label, fn, size = 30) {
    const c = this.add.container(x, y);
    const bg = this.add.circle(0, 0, r, 0x0e1614, 0.7).setStrokeStyle(4, 0xece6f5, 0.8);
    c.add([bg, this.add.text(0, 0, label, { fontFamily: FONT, fontSize: size, color: INK }).setOrigin(0.5)]);
    c.setSize(r * 2, r * 2).setInteractive(new Phaser.Geom.Circle(r, r, r), Phaser.Geom.Circle.Contains);
    c.on('pointerdown', fn);
    return c;
  }

  makeCard(c, x, y) {
    const top = y - CH / 2, o = { c };
    const frame = this.add.rectangle(x, y, CW, CH, 0x0e1614, 0.82).setStrokeStyle(4, c.soon ? 0x5a5266 : 0xece6f5, c.soon ? 0.4 : 0.55);
    this.add.text(x, top + 30, c.title, { fontFamily: FONT, fontSize: c.title.length > 30 ? 25 : c.title.length > 26 ? 29 : 34, color: c.soon ? '#8d8597' : INK }).setOrigin(0.5);
    const ty = top + 54;
    if (!c.soon) {
      const im = this.add.image(x, ty, `menu_thumb${c.n}`).setOrigin(0.5, 0);
      const s = (CW - 28) / im.width, cropH = TH / s;
      im.setScale(s).setCrop(0, (im.height - cropH) / 2, im.width, cropH).setY(ty - (im.height - cropH) / 2 * s);
      this.add.rectangle(x, ty + TH / 2, CW - 28, TH).setStrokeStyle(2, 0x000000, 0.6);
      // the world's boss along the bottom of the picture
      this.add.rectangle(x, ty + TH - 22, CW - 28, 44, 0x0b1210, 0.62);
      this.add.text(x, ty + TH - 22, c.boss, { fontFamily: FONT, fontSize: 23, color: '#d8ff8a' }).setOrigin(0.5);
      o.best = this.add.text(x, ty + TH + 32, '', { fontFamily: FONT, fontSize: 28, color: '#ffd76a', stroke: '#2b1a05', strokeThickness: 6 }).setOrigin(0.5);
      const btn = (bx, label, col, fn) => {
        const b = this.add.rectangle(bx, top + CH - 44, 248, 62, 0x1b2f29, 1).setStrokeStyle(4, col, 0.95).setInteractive({ useHandCursor: true });
        const t = this.add.text(bx, top + CH - 44, label, { fontFamily: FONT, fontSize: 30, color: INK }).setOrigin(0.5);
        b.on('pointerdown', () => { b.setFillStyle(col, 0.6); fn(); });
        return [b, t];
      };
      btn(x - 132, 'FULL EVENT', ACID, () => this.start(c.n, 'full'));
      btn(x + 132, 'BOSS', PINK, () => this.start(c.n, 'boss'));
    } else {
      this.add.rectangle(x, ty + TH / 2, CW - 28, TH, 0x1d1826, 1).setStrokeStyle(2, 0x000000, 0.6);
      this.add.text(x, ty + TH / 2 - 18, '🔒', { fontSize: 56 }).setOrigin(0.5).setAlpha(0.55);
      this.add.text(x, ty + TH / 2 + 46, c.boss, { fontFamily: FONT, fontSize: 24, color: '#8d8597' }).setOrigin(0.5);
      this.add.text(x, top + CH - 62, 'COMING SOON', { fontFamily: FONT, fontSize: 40, color: '#b9a3d9' }).setOrigin(0.5);
    }
    return o;
  }

  refresh() {
    for (const [k, b] of Object.entries(this.diffBtns)) {
      const on = k === DIFF.level;
      b.bg.setFillStyle(on ? VIOLET : 0x0e1614, on ? 0.95 : 0.75).setStrokeStyle(4, on ? ACID : 0xece6f5, on ? 1 : 0.5);
      b.t.setColor(on ? '#ffffff' : '#bdb4cc');
    }
    for (const o of this.cards) if (o.best) { const b = getBest(o.c.n); o.best.setText(`BEST (${LEVELS[DIFF.level].label}): ${b ? b.toLocaleString() : '—'}`); }
  }

  /** Full event: runs then boss. Boss: the boss on its own (for Grunt, his Final Sprint and the hairball). */
  start(world, mode) {
    const R = this.registry;
    R.set('world', world); R.set('mode', mode); R.set('assisted', false); R.remove('carry');
    let scene = 'Run';
    if (mode === 'boss' && world === 3) R.set('stage', WORLDS[3].stages.length);
    else { R.set('stage', 1); if (mode === 'boss') scene = WORLDS[world].boss; }
    R.set('gameScene', scene);
    this.scene.start(scene); this.scene.launch('UI');
  }

  // ---------- How to Play ----------
  showHelp() {
    if (this.help) return;
    const W = this.scale.width, H = this.scale.height, o = this.help = this.add.container(0, 0).setDepth(100);
    const block = this.add.rectangle(W / 2, H / 2, W, H, 0x05080a, 0.82).setInteractive();
    const panel = this.add.rectangle(W / 2, H / 2 + 20, 1640, 960, 0x13201c, 1).setStrokeStyle(5, VIOLET, 0.9);
    o.add([block, panel, this.add.text(W / 2, 140, 'HOW TO PLAY', { fontFamily: FONT, fontSize: 64, color: INK, stroke: '#2b0d55', strokeThickness: 10 }).setOrigin(0.5)]);
    const close = this.roundBtn(W / 2 + 770, 100, 44, '✕', () => { o.destroy(); this.help = null; close.destroy(); }, 40); close.setDepth(101);
    const tabs = [
      ['RUNNING', '• Tap or swipe UP: jump. Tap again in the air: DOUBLE jump.\n• Swipe DOWN (or the SLIDE button): slide under things.\n• Swipe RIGHT (or MAGIC): fire magic at enemies.\n• Collect crystals to fill the Chaos Meter, then hit MELTDOWN\n   to wipe out everything on screen.\n• Red and orange glows mean danger: jump it, slide it or blast it.'],
      ['BOSSES', '• Left thumb: touch anywhere on the left and drag to RUN.\n   Pull DOWN to slide, flick UP to jump.\n• Right thumb: JUMP and MAGIC buttons.\n• Magic only hurts a boss while it’s VULNERABLE (watch for the sign).\n• Markers show where attacks will land: get out of the way.\n• Grab the potions on the platforms.'],
      ['GRUNT', '• A giant cat is chasing you. Don’t let him catch you!\n• The GRUNT IS COMING meter shows how close he is.\n   Running cleanly pulls you away. Getting hit lets him catch up.\n• BLAST BACK (or swipe LEFT) fires magic behind you to knock him back.\n• Red markers show where his arrows and Uzi debris will land.\n• Four runs. Survive them all to see the ending.'],
      ['HEARTS & SCORE', '• You have 3 hearts. A hit costs one, then you flash for a moment.\n• Potions give a heart back (a gold bonus heart if you’re already full).\n• Tacos 100 · Margaritas 250 · Enemies 50 or 150.\n• Bonuses for beating the boss fast, hearts left and taking no damage.\n• Your best score is saved for each world and each difficulty.\n• EASY / NORMAL / HARD: choose on the menu before you play.'],
    ];
    const body = this.add.text(W / 2 - 740, 340, '', { fontFamily: BODY, fontStyle: 'bold', fontSize: 40, color: INK, lineSpacing: 18, wordWrap: { width: 1480 } });
    o.add(body);
    const tabObjs = tabs.map(([name, text], i) => {
      const x = W / 2 + (i - 1.5) * 380, y = 252;
      const b = this.add.rectangle(x, y, 350, 70, 0x0e1614, 1).setStrokeStyle(4, 0xece6f5, 0.5).setInteractive({ useHandCursor: true });
      const t = this.add.text(x, y, name, { fontFamily: FONT, fontSize: 32, color: INK }).setOrigin(0.5);
      b.on('pointerdown', () => pick(i));
      o.add([b, t]); return { b, t, text };
    });
    const pick = i => tabObjs.forEach((tb, j) => { const on = i === j; tb.b.setFillStyle(on ? VIOLET : 0x0e1614, 1).setStrokeStyle(4, on ? ACID : 0xece6f5, on ? 1 : 0.5); if (on) body.setText(tb.text); });
    pick(0);
  }
}
