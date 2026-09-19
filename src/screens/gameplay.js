import { showScreen } from '../router.js';
import { synth, scheduleSong } from '../audio.js';
import { NoteTrack, applyMeterShift } from '../noteTrack.js';
import { renderResults } from './results.js';
import { renderSongSelect } from './songSelect.js';

const TRAVEL_TIME = 1.5; // seconds a note takes to rise from the bottom to the receptor row
const RECEPTOR_Y_RATIO = 0.16; // receptors sit near the top, FNF-style
const FLASH_DURATION = 140; // ms a receptor stays "pressed" after a hit
// left, down, up, right — matches ARROW_KEYS / WASD_KEYS lane order
const LANE_COLORS = ['#c650ff', '#00c2ff', '#3ddc84', '#ff4d5e'];
const LANE_ANGLES = [180, 90, -90, 0]; // degrees to rotate a right-pointing chevron per lane
const LANE_GLYPHS = ['←', '↓', '↑', '→'];

const ARROW_KEYS = ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'];
const WASD_KEYS = ['a', 's', 'w', 'd'];

const CPU_DRAIN_WEIGHT = { Easy: 0.25, Normal: 0.35, Hard: 0.5 };

// mode: 'cpu' (single player vs CPU, health/fail), 'twoPlayer' (Arrows vs WASD,
// no fail), 'practice' (solo, no meter, no rewards).
export function renderGameplay(container, song, mode = 'cpu') {
  // Create/resume the AudioContext synchronously inside this click-triggered
  // call so browsers' autoplay policy allows it (must trace to a user gesture).
  synth.ensureCtx();

  const configs = buildConfigs(song, mode);
  const meterEnabled = mode !== 'practice';
  const cpuDrainWeight = CPU_DRAIN_WEIGHT[song.difficulty] || 0.35;

  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'screen gameplay-screen' + (mode === 'practice' ? ' solo' : '');
  wrap.innerHTML = `
    <div class="hud">${hudTemplate(configs)}</div>
    ${meterEnabled ? '<div class="meter-wrap"><div class="meter-bar"><div class="meter-fill" id="meter-fill"></div></div></div>' : ''}
    <canvas id="note-canvas"></canvas>
    <div class="judgement-pop left" id="pop-left"></div>
    <div class="judgement-pop right" id="pop-right"></div>
    <div class="lane-buttons">${laneButtonsTemplate(configs)}</div>
    <div class="countdown-overlay" id="countdown">3</div>
  `;
  container.appendChild(wrap);

  const canvas = wrap.querySelector('#note-canvas');
  const ctx2d = canvas.getContext('2d');
  function resize() {
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
  }
  resize();
  window.addEventListener('resize', resize);

  const meterFillEl = wrap.querySelector('#meter-fill');
  let meter = 50;

  let started = false;
  let finished = false;
  let startTime = 0; // audioCtx time corresponding to song beat 0
  let rafId = null;

  const scoreEls = { left: wrap.querySelector('#score-left'), right: wrap.querySelector('#score-right') };
  const comboEls = { left: wrap.querySelector('#combo-left'), right: wrap.querySelector('#combo-right') };
  const popEls = { left: wrap.querySelector('#pop-left'), right: wrap.querySelector('#pop-right') };
  const countdownEl = wrap.querySelector('#countdown');

  function showJudgement(hudKey, text, cls) {
    const el = popEls[hudKey];
    if (!el) return;
    el.textContent = text;
    el.className = `judgement-pop ${hudKey} show ${cls}`;
    setTimeout(() => el.classList.remove('show'), 220);
  }

  function refreshHud() {
    configs.forEach((c) => {
      if (scoreEls[c.hudKey]) scoreEls[c.hudKey].textContent = 'Score: ' + c.track.score;
      if (comboEls[c.hudKey]) comboEls[c.hudKey].textContent = c.track.combo > 1 ? c.track.combo + ' combo' : '';
    });
  }

  function handleResult(config, note) {
    const result = note.result;
    config.flash[note.lane] = performance.now() + FLASH_DURATION;
    if (meterEnabled) {
      const weight = config.track.isAuto ? cpuDrainWeight : 1;
      meter = applyMeterShift(meter, result, config.side === 'left' ? 'left' : 'right', weight);
    }
    if (!config.track.isAuto) {
      showJudgement(config.hudKey, result.toUpperCase() + (result === 'perfect' ? '!' : ''), result);
      synth.playHitSound(result);
    }
  }

  function handleInput(config, lane) {
    if (!started || finished) return;
    const now = synth.ctx.currentTime - startTime;
    const note = config.track.hit(lane, now);
    if (note) handleResult(config, note);
  }

  wrap.querySelectorAll('.lane-btn').forEach((btn) => {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const config = configs.find((c) => c.hudKey === btn.dataset.hudkey);
      if (config) handleInput(config, Number(btn.dataset.lane));
    });
  });

  function keyHandler(e) {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    for (const config of configs) {
      if (!config.keys) continue;
      const idx = config.keys.indexOf(key);
      if (idx !== -1) {
        e.preventDefault();
        handleInput(config, idx);
      }
    }
  }
  window.addEventListener('keydown', keyHandler);

  function teardown() {
    window.removeEventListener('keydown', keyHandler);
    window.removeEventListener('resize', resize);
    if (rafId) cancelAnimationFrame(rafId);
  }

  wrap.querySelector('#quit-btn').onclick = () => {
    finished = true;
    teardown();
    synth.reset();
    showScreen(renderSongSelect, mode);
  };

  function laneX(config, lane, canvasWidth) {
    const [x0, x1] = config.region;
    const regionX = x0 * canvasWidth;
    const regionWidth = (x1 - x0) * canvasWidth;
    return regionX + ((lane + 0.5) / 4) * regionWidth;
  }

  function drawTrack(config, now) {
    const receptorY = canvas.height * RECEPTOR_Y_RATIO;
    const spawnY = canvas.height * 1.08;
    const laneWidth = ((config.region[1] - config.region[0]) * canvas.width) / 4;
    const noteRadius = Math.min(laneWidth * 0.32, canvas.height * 0.045);
    const nowMs = performance.now();

    for (let lane = 0; lane < 4; lane++) {
      const x = laneX(config, lane, canvas.width);
      const flashing = nowMs < config.flash[lane];
      drawArrow(ctx2d, x, receptorY, flashing ? noteRadius * 1.15 : noteRadius, lane, {
        color: LANE_COLORS[lane],
        alpha: flashing ? 1 : 0.4,
        outline: !flashing,
      });
    }

    config.track.notes.forEach((n) => {
      if (n.judged) return;
      const progress = 1 - (n.time - now) / TRAVEL_TIME;
      if (progress < -0.05 || progress > 1.15) return;
      const y = spawnY - progress * (spawnY - receptorY);
      const x = laneX(config, n.lane, canvas.width);
      drawArrow(ctx2d, x, y, noteRadius, n.lane, { color: LANE_COLORS[n.lane], alpha: 1, outline: false });
    });
  }

  function draw(now) {
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    configs.forEach((c) => drawTrack(c, now));
    if (configs.length > 1) {
      ctx2d.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx2d.lineWidth = 2;
      ctx2d.beginPath();
      ctx2d.moveTo(canvas.width / 2, 0);
      ctx2d.lineTo(canvas.width / 2, canvas.height);
      ctx2d.stroke();
    }
  }

  function failSong() {
    finished = true;
    teardown();
    synth.reset();
    showScreen(renderResults, song, mode, { failed: true, tracksData: gatherTracksData() });
  }

  function gatherTracksData() {
    return configs.map((c) => ({
      side: c.side,
      hudKey: c.hudKey,
      label: c.label,
      score: c.track.score,
      accuracy: c.track.accuracy,
      maxCombo: c.track.maxCombo,
      fullCombo: c.track.fullCombo,
      perfect: c.track.perfect,
      good: c.track.good,
      ok: c.track.ok,
      miss: c.track.miss,
      isAuto: c.track.isAuto,
    }));
  }

  const songLastNoteTime = configs[0].track.lastNoteTime;

  function loop() {
    if (finished) return;
    const now = synth.ctx.currentTime - startTime;

    configs.forEach((config) => {
      const judgedNotes = config.track.update(now);
      judgedNotes.forEach((note) => handleResult(config, note));
    });
    refreshHud();
    if (meterEnabled && meterFillEl) meterFillEl.style.left = meter + '%';

    if (meterEnabled && mode === 'cpu' && meter <= 0) {
      failSong();
      return;
    }

    draw(now);

    if (now > songLastNoteTime + 1.0) {
      endSong();
      return;
    }
    rafId = requestAnimationFrame(loop);
  }

  function endSong() {
    finished = true;
    teardown();
    synth.reset();
    showScreen(renderResults, song, mode, { failed: false, tracksData: gatherTracksData() });
  }

  let count = 3;
  countdownEl.textContent = count;
  const countdownTimer = setInterval(() => {
    count--;
    if (count > 0) {
      countdownEl.textContent = count;
    } else if (count === 0) {
      countdownEl.textContent = 'GO!';
    } else {
      clearInterval(countdownTimer);
      countdownEl.classList.add('hide');
      beginSong();
    }
  }, 700);

  function beginSong() {
    const ctxAudio = synth.ensureCtx();
    startTime = ctxAudio.currentTime + TRAVEL_TIME + 0.15;
    scheduleSong(song, startTime);
    started = true;
    rafId = requestAnimationFrame(loop);
  }
}

function buildConfigs(song, mode) {
  if (mode === 'practice') {
    return [{ side: 'solo', hudKey: 'right', label: 'Practice', keys: ARROW_KEYS, track: new NoteTrack(song), region: [0, 1], flash: [0, 0, 0, 0] }];
  }
  if (mode === 'twoPlayer') {
    return [
      { side: 'left', hudKey: 'left', label: 'Player 1', keys: ARROW_KEYS, track: new NoteTrack(song), region: [0, 0.5], flash: [0, 0, 0, 0] },
      { side: 'right', hudKey: 'right', label: 'Player 2', keys: WASD_KEYS, track: new NoteTrack(song), region: [0.5, 1], flash: [0, 0, 0, 0] },
    ];
  }
  // 'cpu' mode
  return [
    { side: 'left', hudKey: 'left', label: 'CPU 🤖', keys: null, track: new NoteTrack(song, { isAuto: true }), region: [0, 0.5], flash: [0, 0, 0, 0] },
    { side: 'right', hudKey: 'right', label: 'You', keys: ARROW_KEYS, track: new NoteTrack(song), region: [0.5, 1], flash: [0, 0, 0, 0] },
  ];
}

// Draws a colored arrow "note": a circular body with a chevron pointing in the
// lane's direction. outline:true draws a dim receptor-style ring instead of a
// filled note (used for the static targets at the top of each lane).
function drawArrow(ctx, x, y, radius, lane, { color, alpha = 1, outline = false }) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  if (outline) {
    ctx.lineWidth = radius * 0.22;
    ctx.strokeStyle = color;
    ctx.stroke();
  } else {
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = radius * 0.16;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.stroke();
  }

  ctx.rotate((LANE_ANGLES[lane] * Math.PI) / 180);
  const s = radius * 0.85;
  ctx.beginPath();
  ctx.moveTo(-s * 0.32, -s * 0.42);
  ctx.lineTo(s * 0.45, 0);
  ctx.lineTo(-s * 0.32, s * 0.42);
  ctx.lineTo(-s * 0.05, 0);
  ctx.closePath();
  ctx.fillStyle = outline ? color : 'rgba(255,255,255,0.95)';
  ctx.fill();

  ctx.restore();
}

function hudTemplate(configs) {
  const left = configs.find((c) => c.hudKey === 'left');
  const right = configs.find((c) => c.hudKey === 'right');
  return `
    <div class="hud-side hud-left" ${left ? '' : 'style="visibility:hidden"'}>
      <div class="hud-label">${left ? left.label : ''}</div>
      <div class="hud-score" id="score-left">Score: 0</div>
      <div class="hud-combo" id="combo-left"></div>
    </div>
    <button class="quit-btn" id="quit-btn">✕</button>
    <div class="hud-side hud-right">
      <div class="hud-label">${right ? right.label : ''}</div>
      <div class="hud-score" id="score-right">Score: 0</div>
      <div class="hud-combo" id="combo-right"></div>
    </div>
  `;
}

function laneButtonsTemplate(configs) {
  return configs
    .map((c) => {
      if (!c.keys) return `<div class="lane-group empty"><span class="lane-group-label">${c.label}</span></div>`;
      const glyphs = c.keys === WASD_KEYS ? ['◀', '▼', '▲', '▶'] : LANE_GLYPHS;
      return `<div class="lane-group">${glyphs
        .map((g, i) => `<button class="lane-btn" data-hudkey="${c.hudKey}" data-lane="${i}">${g}</button>`)
        .join('')}</div>`;
    })
    .join('');
}
