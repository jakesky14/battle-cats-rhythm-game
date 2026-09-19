import { initRouter, showScreen } from './router.js';
import { renderMenu } from './screens/menu.js';

initRouter(document.getElementById('app'));
showScreen(renderMenu);
