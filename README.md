# MICRO/RUSH

A rapid-fire browser microgame arcade: a shuffled stack of tiny challenges, each just a few seconds long. Read the word, react fast, survive as long as you can.

Pure HTML/CSS/vanilla JS — no build step, no dependencies. Open `index.html` in a browser (or serve the folder) and play.

## How it plays

- Each round drops you into a random microgame with a one-word instruction (e.g. "SOLVE IT", "PRESS IT", "DODGE") and a shrinking timer bar.
- Win the round and your streak and score go up; the game speeds up slightly (`speedMul`) as your score climbs, so rounds get faster and timers get shorter over a run.
- Lose a round (wrong answer, timeout, or getting hit) and you lose a life. Run out of lives and the run ends.
- Build a long enough streak and you earn a life back — how long depends on difficulty.
- Controls: arrow keys or direct click/tap on the stage — every microgame supports both.

## Difficulty

Five presets (persisted in `localStorage`), each tuning starting lives, base speed, how fast speed ramps up, how high speed can climb, and how long a streak needs to be to earn a life back:

| Difficulty | Lives | Base speed | Max speed | Streak for life |
|---|---|---|---|---|
| CHILL | 6 | 0.80× | 1.2× | 2 |
| EASY | 5 | 0.90× | 1.3× | 3 |
| NORMAL | 4 | 1.00× | 1.4× | 4 |
| HARD | 3 | 1.10× | 1.5× | 5 |
| INSANE | 2 | 1.20× | 1.6× | 6 |

## Daily challenge

A seeded daily run: the date is hashed into a seed (`mulberry32`) that temporarily overrides `Math.random` for the run's duration, so every game pick and every randomized detail inside each microgame is fully deterministic for everyone playing that day. Results (score, per-game win/loss breakdown, win/loss pips) are saved locally and can be copied as shareable text (🟩/🟥 pips, like Wordle).

## Roster pinning

The side panel (desktop/wide viewports only) lists every microgame. Tapping one pins it — the run then draws only from the pinned pool instead of the full shuffle, letting you drill a specific game or subset. Unpin everything to go back to the full mix. Pinning is disabled mid-daily-run to keep the seeded sequence fair.

## Stats

Per-game play counts, wins, and losses persist across sessions in `localStorage`, viewable from the end-of-run screen.

## Project structure

```
index.html              — markup, styling, difficulty/stats UI
games-core.js            — engine: round loop, scoring, lives/streak, timer bar,
                           difficulty & stats persistence, daily-seed logic,
                           roster panel, the shared MR namespace all games use
games-reflex-tap.js      — single-beat reaction tests (ODD ONE, MASH, WHACK,
                           CATCH, GO/STOP, POP, COMBO, RED LIGHT)
games-reflex-move.js     — reflex games with sustained movement/aiming
                           (BALANCE, LANES, AIM, BALLOON, DODGE, BREAKOUT,
                           BASKET, ORBIT, MINI GOLF)
games-motion-runner.js   — side-on runner/obstacle games (DINOJUMP, LAVA,
                           SWIM, CLIMB)
games-motion-arcade.js   — top-down arcade/chase games (BULLET HELL, ESCAPE,
                           FOG MAZE, MAZE-MUNCH, REVERSE MUNCH,
                           DOUBLE TROUBLE, SNAKE)
games-shooting.js        — aim-and-shoot games (QUICKDRAW, ALLEY, RUSH ALLEY,
                           BIRD HUNT, SKEET, SHMUP, INVADERS, BOSS RUN)
games-memory.js          — memory/observation games (COUNT, MEMORY, ODD FLASH,
                           MATCH, PATTERN, SPOT, POSITION, CARD PEEK)
games-logic.js           — logic/puzzle games (MATH, SCRAMBLE, ORDER, SORT IT,
                           MATCH TYPE, DRAG, MORE DOTS, MISSING PIECE,
                           MIRROR MATCH, GROUP BY RULE)
music/                   — optional background track (microgames_music.opus);
                           the game runs fine if it's missing
```

## Adding a new microgame

Each microgame is a plain object pushed onto `window.MR.games` from within an IIFE in one of the `games-*.js` files:

```js
MR.games.push({
  label: 'SHORTNAME',        // shown in the roster / stage label
  desc: 'One-line description shown as a roster tooltip.',
  word: 'INSTRUCTION',       // flashed before the round starts
  timeLimit: s => 3000/s,    // ms allowed, scaled by the current speed multiplier
  start(ctx){
    // Build DOM into MR.stage, wire up input, and call:
    //   ctx.onWin()   — round won
    //   ctx.onLose()  — round lost
    // Optional: ctx.onCleanup() for teardown (timers/intervals) if the
    // round times out; ctx.speedMul for scaling animation speed;
    // MR.rand(min,max) / MR.pick(arr) for randomness; MR.roundToken()
    // to check the round is still current before acting on an async callback.
  }
});
```

Drop the new game in whichever `games-*.js` category file fits best (or a new file, referenced from `index.html` after `games-core.js`), and it's automatically included in the shuffle and the roster panel — no other registration needed.
