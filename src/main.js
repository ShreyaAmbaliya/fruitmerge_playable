import './style.css';
import { Game } from './game.js';

const canvas = document.getElementById('game-canvas');

if (!canvas) {
  throw new Error('Game canvas not found');
}

// Boot the game
const game = new Game(canvas);

// Expose for debugging in local development
if (import.meta.env.DEV) {
  window.__fruitPopFusion = game;
}
