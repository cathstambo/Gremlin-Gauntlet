// Background music. Off by default; the speaker button turns it on and off (remembered on this device).
// The tracks are only downloaded the first time music is switched on, so the game still starts fast.
//   Running stages: instrumental 1 + 2 joined, on a loop, quiet.
//   Boss arena:     boss chorus + boss 2 once, then the instrumental loop, a little louder.
const FILES = {
  music_run: ['assets/audio/music_run.opus', 'assets/audio/music_run.mp3'],
  music_boss_intro: ['assets/audio/music_boss_intro.opus', 'assets/audio/music_boss_intro.mp3'],
};
const TRACKS = {
  run: { vol: 0.22, parts: [['music_run', true]] },
  boss: { vol: 0.32, parts: [['music_boss_intro', false], ['music_run', true]] },
};
const STORE = 'gremlinGauntlet.music';

export const Music = {
  on: false, want: null, playing: null, snd: null, loading: false,

  init() { try { this.on = localStorage.getItem(STORE) === 'on'; } catch (e) { this.on = false; } },

  /** Called by each game scene: which music belongs here. Keeps playing if it's already the right track. */
  play(scene, track) {
    this.want = track;
    if (!track) { this.stop(); return; }   // a world with no music of its own yet: silence
    if (this.on) this.start(scene);
  },

  toggle(scene) {
    this.on = !this.on;
    try { localStorage.setItem(STORE, this.on ? 'on' : 'off'); } catch (e) { /* private mode: just this session */ }
    if (this.on) this.start(scene); else this.stop();
    return this.on;
  },

  pause(p) { if (this.snd) p ? this.snd.pause() : this.snd.resume(); },

  start(scene) {
    if (!this.want || this.playing === this.want) return;
    const missing = Object.keys(FILES).filter(k => !scene.cache.audio.exists(k));
    if (missing.length) { this.load(scene.game, missing); return; }
    this.stop();
    this.playing = this.want;
    this.playPart(scene.sound, TRACKS[this.want], 0, this.want);
  },

  /** Download + decode the music directly (independent of scene restarts), then start whatever is wanted. */
  load(game, keys) {
    if (this.loading) return;
    const ctx = game.sound.context; if (!ctx) return;   // no Web Audio: no music
    this.loading = true;
    const opus = !!document.createElement('audio').canPlayType('audio/ogg; codecs="opus"');
    Promise.all(keys.map(k => fetch(FILES[k][opus ? 0 : 1]).then(r => r.arrayBuffer())
      .then(b => new Promise((res, rej) => ctx.decodeAudioData(b, res, rej))).then(buf => game.cache.audio.add(k, buf))))
      .then(() => { this.loading = false; if (this.on) this.start(game.scene.getScene('UI')); })
      .catch(e => { this.loading = false; console.warn('music failed to load', e); });
  },

  playPart(sound, tr, i, name) {
    const [key, loop] = tr.parts[i];
    const s = sound.add(key, { volume: tr.vol, loop });
    this.snd = s;
    if (!loop) s.once('complete', () => { if (this.playing === name && this.snd === s) { s.destroy(); this.playPart(sound, tr, i + 1, name); } });
    s.play();
  },

  stop() {
    if (this.snd) { this.snd.stop(); this.snd.destroy(); this.snd = null; }
    this.playing = null;
  },
};

// Sound effects (Grunt's cat noises). Always on (the speaker button is for music only); they follow the phone's volume.
const SFX = ['yowl_long', 'yowl', 'yowl2', 'hiss_growl', 'growl', 'screech', 'meow', 'meow2', 'mrrrp', 'snarl'];
const SFX_VOL = 0.55;
export const Sfx = {
  loading: false, last: {},
  /** Play a sound if sound is on (pick one at random from a list). gap = don't repeat the same sound within this many seconds. */
  play(scene, names, gap = 0) {
    if (!scene.sound.context) return;
    const name = Array.isArray(names) ? names[Math.floor(Math.random() * names.length)] : names;
    const now = scene.time.now / 1000;
    if (gap && this.last[name] && now - this.last[name] < gap) return;
    if (!scene.cache.audio.exists('sfx_' + name)) { this.load(scene.game); return; }
    this.last[name] = now;
    scene.sound.play('sfx_' + name, { volume: SFX_VOL });
  },
  load(game) {
    if (this.loading) return; this.loading = true;
    const ctx = game.sound.context;
    Promise.all(SFX.map(n => fetch(`assets/sfx/${n}.mp3`).then(r => r.arrayBuffer())
      .then(b => new Promise((res, rej) => ctx.decodeAudioData(b, res, rej))).then(buf => game.cache.audio.add('sfx_' + n, buf))))
      .catch(e => { this.loading = false; console.warn('sounds failed to load', e); });
  },
};
