# Battle Cats: Rhythm Rumble

A browser-based rhythm game with a Battle Cats-inspired theme: tap notes to the beat, earn Cat Food, and summon new cats from a gacha machine.

All characters, names, and music are original creations made in the spirit of Battle Cats — no official assets, audio, or trademarked names are used. Music is generated procedurally in the browser (Web Audio API), so the game is fully self-contained with no external files to download.

## Run it

No dependencies to install — just start the built-in static server:

```
npm run dev
```

Then open http://localhost:5173 in a browser. (ES modules require serving over `http://`, so opening `index.html` directly via `file://` won't work.)

## How to play

- Go to **Play**, pick a song, and hit the **D F J K** keys (or tap the on-screen lane buttons) in time with the falling notes as they cross the yellow hit line.
- Judgement windows: Perfect / Good / Ok / Miss, based on timing accuracy.
- Finishing a song earns **Cat Food** based on your accuracy, grade, and whether you got a full combo.
- Spend Cat Food in the **Cat Capsule** gacha machine to pull new cats (single or 11x pull). Duplicate pulls are refunded as bonus Cat Food.
- View everything you've unlocked in **My Cats**.

Progress (Cat Food, owned cats, high scores) is saved to `localStorage`, so it persists between sessions in the same browser.

## Project structure

```
index.html            entry point
src/
  main.js             boots the app
  router.js           minimal screen router
  state.js            save data (localStorage)
  characters.js        roster + rarities
  gacha.js             pull logic and rates
  songs.js             procedural song/chart generator (3 songs to start)
  audio.js             Web Audio synth + scheduler
  scoring.js           grading and Cat Food reward formula
  ui.js                shared UI bits (top bar)
  screens/             one module per screen (menu, song select, gameplay, results, gacha, roster)
scripts/serve.js        zero-dependency static file server
```

## Extending it

- **Add a song**: add another `generateSong({...})` entry in `src/songs.js` with a new `seed` (charts are deterministic per seed).
- **Add a character**: add an entry to `CHARACTERS` in `src/characters.js` with a rarity, emoji, and `dupeValue`.
- **Tune the gacha economy**: rates live in `RARITIES` (`src/characters.js`), costs in `src/gacha.js`.
- **Tune scoring/rewards**: `src/scoring.js`.
