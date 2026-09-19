# Battle Cats: Rhythm Rumble

A browser-based, Friday Night Funkin'-style rhythm game with a Battle Cats theme: hit arrow notes to the beat, battle a CPU opponent (or a friend), earn Cat Food, and summon new cats from a gacha machine.

All characters, names, and music are original creations made in the spirit of Battle Cats — no official assets, audio, or trademarked names are used. Music is generated procedurally in the browser (Web Audio API), so the game is fully self-contained with no external files to download.

## Run it

No dependencies to install — just start the built-in static server:

```
npm run dev
```

Then open http://localhost:5173 in a browser. (ES modules require serving over `http://`, so opening `index.html` directly via `file://` won't work.)

## How to play

Pick **Play**, then a mode:

- **🤖 Vs CPU** — Arrow keys. A CPU highway plays alongside yours. A battle meter tugs between you and the CPU with every hit; drain it to zero and you lose the beat (song ends early, no reward). Clear the song for Cat Food based on accuracy, grade, and full combo.
- **🎮 2 Player** — Player 1 uses **Arrow keys**, Player 2 uses **WASD** (spatially mapped: A/S/W/D ≈ ←/↓/↑/→), both racing the same chart on split highways. Highest score wins; no Cat Food (it's a friendly match).
- **🎯 Practice** — Arrow keys, solo, full-width highway, no fail state, no rewards. Just for learning a chart.

Judgement windows: Perfect / Good / Ok / Miss, based on timing accuracy against the yellow hit line.

- Spend Cat Food in the **Cat Capsule** gacha machine to pull new cats (single or 11x pull). Duplicate pulls are refunded as bonus Cat Food.
- In **My Cats**, **Equip** a cat to boost your Score and Cat Food in Vs CPU mode — the multiplier scales with rarity (Common x1.0 up to Uber Rare x1.2).
- The menu has a **🧪 +9999 Cat Food (testing)** button for quickly trying out the gacha without grinding — remove it before sharing the game more widely if you don't want players to have infinite currency.

Progress (Cat Food, owned cats, equipped cat, high scores) is saved to `localStorage`, so it persists between sessions in the same browser.

## Project structure

```
index.html            entry point
src/
  main.js              boots the app
  router.js             minimal screen router
  state.js              save data (localStorage)
  characters.js         roster, rarities, score multipliers
  gacha.js              pull logic and rates
  songs.js              procedural song/chart generator (3 songs to start)
  audio.js               Web Audio synth + scheduler
  scoring.js             grading and Cat Food reward formula
  noteTrack.js           per-highway judgement engine + battle-meter math (shared by player/CPU/2P tracks)
  ui.js                  shared UI bits (top bar)
  screens/               one module per screen (menu, mode select, song select, gameplay, results, gacha, roster)
scripts/serve.js         zero-dependency static file server
```

## Extending it

- **Add a song**: add another `generateSong({...})` entry in `src/songs.js` with a new `seed` (charts are deterministic per seed).
- **Add a character**: add an entry to `CHARACTERS` in `src/characters.js` with a rarity, emoji, and `dupeValue`.
- **Tune the gacha economy**: rates live in `RARITIES` (`src/characters.js`), costs in `src/gacha.js`.
- **Tune scoring/rewards**: `src/scoring.js`; equip multipliers live on `RARITIES` in `src/characters.js`.
- **Tune CPU difficulty**: `CPU_DRAIN_WEIGHT` in `src/screens/gameplay.js` controls how hard the CPU pushes the battle meter per song difficulty.
