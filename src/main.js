// Gremlin Gauntlet: game entry point.
// Landscape 16:9 logical play area (1920×1080) scaled to fit any screen.
import { Boot } from './scenes/Boot.js';
import { Run } from './scenes/Run.js';
import { UI } from './scenes/UI.js';

window.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#13201c',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1920, height: 1080 },
  render: { antialias: true, powerPreference: 'high-performance' },
  input: { activePointers: 4 },
  fps: { target: 60 },
  scene: [Boot, Run, UI],
});
