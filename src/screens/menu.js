import { showScreen } from '../router.js';
import { state, addCatFood } from '../state.js';
import { topBar } from '../ui.js';
import { renderModeSelect } from './modeSelect.js';
import { renderGacha } from './gachaScreen.js';
import { renderRoster } from './roster.js';

export function renderMenu(container) {
  container.appendChild(topBar(state.catFood));
  const wrap = document.createElement('div');
  wrap.className = 'screen menu-screen';
  wrap.innerHTML = `
    <h1 class="title">🐾 Battle Cats: Rhythm Rumble 🐾</h1>
    <p class="subtitle">Tap to the beat, earn Cat Food, summon new cats!</p>
    <div class="menu-buttons">
      <button class="big-btn" id="play-btn">🎵 Play</button>
      <button class="big-btn" id="gacha-btn">🎰 Cat Capsule</button>
      <button class="big-btn" id="roster-btn">🐱 My Cats</button>
    </div>
    <button class="debug-btn" id="debug-food-btn">🧪 +9999 Cat Food (testing)</button>
  `;
  container.appendChild(wrap);
  wrap.querySelector('#play-btn').onclick = () => showScreen(renderModeSelect);
  wrap.querySelector('#gacha-btn').onclick = () => showScreen(renderGacha);
  wrap.querySelector('#roster-btn').onclick = () => showScreen(renderRoster);
  wrap.querySelector('#debug-food-btn').onclick = () => {
    addCatFood(9999);
    showScreen(renderMenu);
  };
}
