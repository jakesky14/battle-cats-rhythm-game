export function topBar(catFood, { onBack } = {}) {
  const div = document.createElement('div');
  div.className = 'topbar';
  div.innerHTML = `
    <button class="back-btn" ${onBack ? '' : 'style="visibility:hidden"'}>&larr; Back</button>
    <div class="food-counter">🍗 <span>${catFood}</span></div>
  `;
  if (onBack) div.querySelector('.back-btn').addEventListener('click', onBack);
  return div;
}
