import { showScreen } from '../router.js';
import { synth, scheduleSong } from '../audio.js';
import { NoteTrack, applyMeterShift } from '../noteTrack.js';
import { renderResults } from './results.js';
import { renderSongSelect } from './songSelect.js';

const TRAVEL_TIME = 1.5; // seconds a note takes to fall from top to the hit line
const LANE_COLORS = ['#ff6b6b', '#4fc3f7', '#81c784', '#ffd54f'];
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

  function handleResult(config, result) {
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
    const result = config.track.hit(lane, now);
    if (result) handleResult(config, result);
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
    const [x0, x1] = config.region;
    const regionX = x0 * canvas.width;
    const regionWidth = (x1 - x0) * canvas.width;
    const hitY = canvas.height * 0.85;
    const laneWidth = regionWidth / 4;
    const noteRadius = laneWidth * 0.28;

    ctx2d.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx2d.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      const x = regionX + (i / 4) * regionWidth;
      ctx2d.beginPath();
      ctx2d.moveTo(x, 0);
      ctx2d.lineTo(x, canvas.height);
      ctx2d.stroke();
    }

    ctx2d.strokeStyle = '#ffd35c';
    ctx2d.lineWidth = 4;
    ctx2d.beginPath();
    ctx2d.moveTo(regionX, hitY);
    ctx2d.lineTo(regionX + regionWidth, hitY);
    ctx2d.stroke();

    config.track.notes.forEach((n) => {
      if (n.judged) return;
      const progress = 1 - (n.time - now) / TRAVEL_TIME;
      if (progress < -0.05 || progress > 1.15) return;
      const y = progress * hitY;
      const x = laneX(config, n.lane, canvas.width);
      ctx2d.fillStyle = LANE_COLORS[n.lane];
      ctx2d.beginPath();
      ctx2d.arc(x, y, noteRadius, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.fillStyle = 'rgba(0,0,0,0.55)';
      ctx2d.font = `bold ${noteRadius}px sans-serif`;
      ctx2d.textAlign = 'center';
      ctx2d.textBaseline = 'middle';
      ctx2d.fillText(LANE_GLYPHS[n.lane], x, y);
    });
  }

  function draw(now) {
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    configs.forEach((c) => drawTrack(c, now));
    if (configs.length > 1) {
      ctx2d.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx2d.lineWidth = 3;
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
      const results = config.track.update(now);
      results.forEach((result) => handleResult(config, result));
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
    return [{ side: 'solo', hudKey: 'right', label: 'Practice', keys: ARROW_KEYS, track: new NoteTrack(song), region: [0, 1] }];
  }
  if (mode === 'twoPlayer') {
    return [
      { side: 'left', hudKey: 'left', label: 'Player 1', keys: ARROW_KEYS, track: new NoteTrack(song), region: [0, 0.5] },
      { side: 'right', hudKey: 'right', label: 'Player 2', keys: WASD_KEYS, track: new NoteTrack(song), region: [0.5, 1] },
    ];
  }
  // 'cpu' mode
  return [
    { side: 'left', hudKey: 'left', label: 'CPU 🤖', keys: null, track: new NoteTrack(song, { isAuto: true }), region: [0, 0.5] },
    { side: 'right', hudKey: 'right', label: 'You', keys: ARROW_KEYS, track: new NoteTrack(song), region: [0.5, 1] },
  ];
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
