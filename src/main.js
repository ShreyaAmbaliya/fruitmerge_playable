import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-900.css';
import './style.css';
import { Game } from './game.js';

const canvas = document.getElementById('game-canvas');

if (!canvas) {
  throw new Error('Game canvas not found');
}

if (window.__fruitPopFusion?.destroy) {
  window.__fruitPopFusion.destroy();
}

const game = new Game(canvas);
window.__fruitPopFusion = game;
