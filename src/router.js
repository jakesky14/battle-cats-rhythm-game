let appEl = null;

export function initRouter(el) {
  appEl = el;
}

export function showScreen(renderFn, ...args) {
  appEl.innerHTML = '';
  renderFn(appEl, ...args);
  window.scrollTo(0, 0);
}
