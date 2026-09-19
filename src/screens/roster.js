import { showScreen } from '../router.js';
import { state, setEquipped } from '../state.js';
import { topBar } from '../ui.js';
import { CHARACTERS, RARITIES } from '../characters.js';
import { renderMenu } from './menu.js';

export function renderRoster(container) {
  container.appendChild(topBar(state.catFood, { onBack: () => showScreen(renderMenu) }));
  const wrap = document.createElement('div');
  wrap.className = 'screen roster-screen';
  wrap.innerHTML = `
    <h2>My Cats</h2>
    <p class="roster-hint">Equip a cat to boost your Score &amp; Cat Food in Vs CPU mode.</p>
    <div class="roster-grid"></div>
  `;
  container.appendChild(wrap);

  const grid = wrap.querySelector('.roster-grid');
  CHARACTERS.forEach((c) => {
    const count = state.owned[c.id] || 0;
    const owned = count > 0;
    const isEquipped = state.equippedId === c.id;
    const card = document.createElement('div');
    card.className = 'roster-card rarity-' + c.rarity + (owned ? '' : ' locked') + (isEquipped ? ' equipped' : '');
    card.innerHTML = `
      <div class="roster-emoji">${owned ? c.emoji : '❓'}</div>
      <div class="roster-name">${owned ? c.name : '???'}</div>
      <div class="roster-rarity" style="color:${RARITIES[c.rarity].color}">${RARITIES[c.rarity].label}</div>
      ${
        owned
          ? `<div class="roster-count">x${count}</div>
             <div class="roster-mult">x${RARITIES[c.rarity].scoreMultiplier.toFixed(2)} score</div>
             <div class="roster-flavor">${c.flavor}</div>
             <button class="equip-btn" ${isEquipped ? 'disabled' : ''}>${isEquipped ? 'Equipped ✓' : 'Equip'}</button>`
          : ''
      }
    `;
    if (owned) {
      card.querySelector('.equip-btn').addEventListener('click', () => {
        setEquipped(c.id);
        showScreen(renderRoster);
      });
    }
    grid.appendChild(card);
  });
}
