(function(){
  "use strict";

  const $ = (id)=> document.getElementById(id);

  const stage = $('stage');
  const screen = $('screen');
  const cabinet = $('cabinet');
  const instructionText = $('instructionText');
  const overlay = $('overlay');
  const timerbar = $('timerbar');
  const scoreVal = $('scoreVal');
  const bestVal = $('bestVal');
  const livesEl = $('lives');
  const livesCount = $('livesCount');
  const speedVal = $('speedVal');
  const streakHint = $('streakHint');
  const bgMusic = $('bgMusic');

  // ---------- LOCAL STORAGE HELPERS ----------
  // Every read/write in this file goes through these instead of touching
  // localStorage directly, so a disabled/full/unavailable store (private
  // browsing, quota exceeded, etc.) just silently no-ops instead of
  // throwing and taking a whole handler down with it.
  function lsGet(key, fallback){
    try{ const v = localStorage.getItem(key); return v === null ? fallback : v; }
    catch(e){ return fallback; }
  }
  function lsSet(key, value){
    try{ localStorage.setItem(key, value); return true; }
    catch(e){ return false; }
  }
  function lsRemove(key){
    try{ localStorage.removeItem(key); }catch(e){}
  }
  function lsGetJSON(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    }catch(e){ return fallback; }
  }
  function lsSetJSON(key, value){
    return lsSet(key, JSON.stringify(value));
  }

  const MUSIC_KEY = 'microrush_music_enabled';
  let musicEnabled = lsGet(MUSIC_KEY, null);
  musicEnabled = musicEnabled === null ? false : musicEnabled === '1';

  // List of background music tracks to pick from at random. Add more
  // entries here (e.g. 'music/microgames_music_05.opus') to grow the pool.
  const MUSIC_TRACKS = [
    'music/microgames_music_01.opus',
    'music/microgames_music_02.opus',
    'music/microgames_music_03.opus',
    'music/microgames_music_04.opus'
  ];

  function pickRandomTrack(){
    return MUSIC_TRACKS[Math.floor(Math.random() * MUSIC_TRACKS.length)];
  }

  let musicOk = true;
  let musicStarted = false;
  if(bgMusic){
    bgMusic.volume = 0.55;
    // if the chosen track isn't present (or fails to load for any
    // reason), quietly give up on it — the game runs identically without it
    bgMusic.addEventListener('error', ()=>{ musicOk = false; });
    // when a track finishes, roll again for the next one (no built-in
    // loop attribute, so this is what keeps the music going continuously)
    bgMusic.addEventListener('ended', ()=>{
      bgMusic.src = pickRandomTrack();
      if(musicEnabled) bgMusic.play().catch(()=>{ musicOk = false; musicStarted = false; });
    });
    bgMusic.src = pickRandomTrack();
  } else {
    musicOk = false;
  }

  function startMusic(){
    if(!musicOk || musicStarted || !bgMusic || !musicEnabled) return;
    musicStarted = true;
    const p = bgMusic.play();
    if(p && typeof p.catch === 'function'){
      p.catch(()=>{ musicOk = false; musicStarted = false; });
    }
  }

  // Called from the side-panel music toggle. Handles three states: no run
  // has started yet (nothing to do but flip the flag — startRun's own
  // startMusic() call will respect it later), a run is active but music
  // hasn't started (fresh start), and a run is active with music already
  // started but paused (resume in place rather than restarting the track).
  function setMusicEnabled(on){
    musicEnabled = on;
    lsSet(MUSIC_KEY, on ? '1' : '0');
    if(!bgMusic) return;
    if(on){
      if(running) startMusic();
      if(musicStarted) bgMusic.play().catch(()=>{});
    } else {
      bgMusic.pause();
    }
  }

  const HOTKEYS_KEY = 'microrush_hotkeys_enabled';
  let hotkeysEnabled = lsGet(HOTKEYS_KEY, null);
  hotkeysEnabled = hotkeysEnabled === null ? false : hotkeysEnabled === '1';

  // Purely a dispatch gate + a CSS class — the badges themselves are
  // always built (see MR.addKeyHint), just hidden via .hotkeys-off so
  // toggling this mid-round doesn't require touching any live game state.
  function setHotkeysEnabled(on){
    hotkeysEnabled = on;
    lsSet(HOTKEYS_KEY, on ? '1' : '0');
    document.body.classList.toggle('hotkeys-off', !on);
  }
  const stageLabel = $('stageLabel');
  const rosterList = $('rosterList');

  const STORAGE_KEY = 'microrush_best';
  let best = parseInt(lsGet(STORAGE_KEY, '0'), 10);
  bestVal.textContent = best;

  const DIFF_KEY = 'microrush_diff';
  const DIFFICULTIES = [
    { name: 'CHILL',  lives: 6, base: 0.8,  growth: 0.020, streakForLife: 2, maxSpeed: 1.2 },
    { name: 'EASY',   lives: 5, base: 0.9,  growth: 0.030, streakForLife: 3, maxSpeed: 1.3 },
    { name: 'NORMAL', lives: 4, base: 1.0,  growth: 0.040, streakForLife: 4, maxSpeed: 1.4 },
    { name: 'HARD',   lives: 3, base: 1.1,  growth: 0.050, streakForLife: 5, maxSpeed: 1.5 },
    { name: 'INSANE', lives: 2, base: 1.2,  growth: 0.060, streakForLife: 6, maxSpeed: 1.6 }
  ];
  let diffIndex = parseInt(lsGet(DIFF_KEY, '2'), 10);
  if(isNaN(diffIndex) || diffIndex < 0 || diffIndex >= DIFFICULTIES.length) diffIndex = 2;
  // activeDiff() is the difficulty locked in for the run in progress
  // (set once per startRun()); selectedDiff() is whatever the picker is
  // currently showing, which can move around between runs without
  // affecting one already underway.
  function activeDiff(){ return DIFFICULTIES[activeDiffIndex]; }
  function selectedDiff(){ return DIFFICULTIES[diffIndex]; }

  function renderDiffPicker(container){
    if(!container) return;
    container.innerHTML =
      '<div class="diff-caption">difficulty — <span class="diff-name">' + selectedDiff().name + '</span> · life every ' + selectedDiff().streakForLife + '</div>' +
      '<div class="diff-row">' +
        DIFFICULTIES.map((d,i)=>'<div class="diff-pill' + (i===diffIndex?' active':'') + '" data-index="'+i+'">'+(i+1)+'</div>').join('') +
      '</div>';
    container.querySelectorAll('.diff-pill').forEach(pill=>{
      pill.addEventListener('click', ()=>{
        diffIndex = parseInt(pill.dataset.index, 10);
        lsSet(DIFF_KEY, String(diffIndex));
        renderDiffPicker(container);
      });
    });
  }

  const STATS_KEY = 'microrush_stats';
  function loadStats(){
    const raw = lsGetJSON(STATS_KEY, {});
    return (raw && typeof raw === 'object') ? raw : {};
  }
  let gameStats = loadStats();

  function recordResult(label, win){
    const s = gameStats[label] || (gameStats[label] = { score:0, plays:0, wins:0, losses:0 });
    s.plays++;
    if(win){ s.wins++; s.score++; } else { s.losses++; }
    lsSetJSON(STATS_KEY, gameStats);
  }

  let score = 0;
  let lives = 3;
  let streak = 0;
  let activeDiffIndex = diffIndex;
  function streakForLife(){ return activeDiff().streakForLife; }
  let running = false;
  let roundToken = 0;
  let speedMul = 1;
  let roundTimeout = null;
  let flashTimeout = null;
  let cabinetFlashTimeout = null;
  let keyHandler = null;
  // Backing store for MR.registerKey (see the "SHARED INPUT HELPERS" block
  // below) — reset every round so stale bindings from the previous game
  // can't leak into the next one.
  let keyRegistry = null;
  let currentGame = null;
  let currentCtx = null;
  let runHistory = [];
  let dailyRun = false;
  let dailyRoundIndex = 0;
  let pinnedLabels = new Set();
  // Games already played this run get a yellow side-marker in the roster
  // (see setActiveRoster / the .played CSS rule) so a glance at the panel
  // shows the full run history, not just whichever game is live right now.
  let playedLabels = new Set();

  let maxLives = activeDiff().lives;

  function renderLives(justRecovered){
    livesEl.innerHTML = '';
    for(let i=0;i<maxLives;i++){
      const d = window.MR.makeEl('life' + (i < lives ? '' : ' lost'));
      if(justRecovered && i === lives-1) d.classList.add('recovered');
      livesEl.appendChild(d);
    }
    if(livesCount) livesCount.textContent = lives + '/' + maxLives;
    updateStreakHint();
  }

  function updateSpeedDisplay(){
    if(speedVal) speedVal.textContent = speedMul.toFixed(2) + '×';
  }

  function updateStreakHint(){
    if(!streakHint) return;
    if(lives >= maxLives){
      streakHint.innerHTML = '';
      return;
    }
    const need = streakForLife();
    const toNext = need - (streak % need);
    streakHint.innerHTML = 'streak <b>' + streak + '</b> · ' + toNext + ' to next life';
  }

  function clearStage(){
    stage.innerHTML = '';
    stageLabel.textContent = '';
    if(keyHandler){ window.removeEventListener('keydown', keyHandler); keyHandler = null; }
    keyRegistry = null;
  }

  function rand(min,max){ return Math.random()*(max-min)+min; }
  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
  // Picks a game so that each *category* is equally likely regardless of
  // how many games it contains, and each game within the chosen category
  // is equally likely too. A flat pick(pool) would instead weight by raw
  // game count — e.g. reflex (18 games) would come up ~4.5x as often as
  // motion (4 games) purely because it has more entries, not because
  // that's a fair 1-in-N-categories draw.
  function pickUniformByCategory(pool){
    const byCat = {};
    const order = [];
    pool.forEach(g=>{
      const cat = g.category || 'uncategorized';
      if(!byCat[cat]){ byCat[cat] = []; order.push(cat); }
      byCat[cat].push(g);
    });
    return pick(byCat[pick(order)]);
  }
  // Fisher-Yates. NOT the same as arr.sort(() => Math.random()-0.5), which
  // is a common but genuinely biased shuffle — a sort comparator has to be
  // transitive/consistent, and a random one isn't, so the actual output
  // distribution ends up shaped by whatever sort algorithm the engine uses
  // internally rather than being a fair, uniform permutation. This walks
  // the array once and swaps each slot with a uniformly random remaining
  // one, which is the standard proof-uniform approach.
  function shuffle(arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  // ---------- MICROGAMES ----------
  // Each game: { label, word, timeLimit(speedMul)=>ms, start(ctx) }
  // ctx has: onWin(), onLose(), speedMul

  const games = [];


  // ---------- SHARED GAME API ----------
  // Individual microgames live in separate files, grouped by category
  // (games-reflex.js, games-motion.js, games-memory.js, games-logic.js).
  // Each of those files is a small IIFE that pushes its game defs onto
  // window.MR.games and reaches back into this engine's private state
  // (stage/screen refs, rand/pick helpers, the shared key handler slot,
  // and the current round token) through this namespace object.
  window.MR = {
    games: games,
    stage: stage,
    screen: screen,
    rand: rand,
    pick: pick,
    shuffle: shuffle,
    pickUniformByCategory: pickUniformByCategory,
    setKeyHandler(fn){
      if(keyHandler){ window.removeEventListener('keydown', keyHandler); }
      keyHandler = fn;
      window.addEventListener('keydown', keyHandler);
    },

    // ---------- SHARED INPUT HELPERS ----------
    // Goal: every discrete on-screen control a game builds (a tile, a
    // button, a hold-target) can be wired with ONE call that gives it both
    // a click/tap handler and, where it makes sense, a matching keyboard
    // shortcut — instead of each game file hand-rolling its own pairing of
    // addEventListener('click', ...) and MR.setKeyHandler(...) (the COMBO
    // game's arrow-key/arrow-button pairing was the one place this was
    // already done manually; these helpers generalize that pattern).
    //
    // NOTE — this is infrastructure only, added for review before any of
    // the existing games are switched over to use it. Nothing below
    // changes behavior for games that don't opt in.
    //
    // Key-value convention: pass the exact `event.key` string an element
    // should respond to ('1', 'ArrowLeft', ' ' for space, etc). ' ' is
    // normalized to the label "Space" for display purposes only; matching
    // still happens on the real key value.

    _normalizeKeyLabel(key){
      return (key === ' ') ? 'Space' : key;
    },

    // Registers a single-press (keydown) shortcut. Multiple calls stack
    // into one shared dispatcher rather than clobbering each other the way
    // repeated raw setKeyHandler() calls would — this is what lets a grid
    // of 9 cells each claim their own number key without fighting over the
    // one keydown listener slot. Cleared automatically at the start of the
    // next round (see clearStage above).
    registerKey(key, handler){
      if(!keyRegistry){
        keyRegistry = {};
        this.setKeyHandler((e)=>{
          if(!hotkeysEnabled) return;
          const h = keyRegistry[e.key];
          if(h){ e.preventDefault(); h(e); }
        });
      }
      keyRegistry[key] = handler;
    },

    // Small corner badge showing which key activates `el` (e.g. "1",
    // "→", "Space"). Purely visual — forces el to position:relative first
    // if it doesn't already establish its own positioning context, so the
    // badge (position:absolute) anchors to el itself.
    // Deliberately checks el.style.position (not getComputedStyle) — this
    // runs before el is necessarily attached to the document, and a
    // not-yet-attached element's *computed* position can't be trusted to
    // report 'static' correctly. Without this, every badge falls through
    // to the nearest ancestor that IS positioned (typically the stage
    // itself) and they all stack on top of each other in one corner.
    addKeyHint(el, label){
      const pos = el.style.position;
      if(!pos || pos === 'static') el.style.position = 'relative';
      const hint = this.makeEl('key-hint');
      hint.textContent = this._normalizeKeyLabel(label);
      el.appendChild(hint);
      return hint;
    },

    // The one-call version for a plain click-or-press control: wires
    // click, and — if opts.key is given — the matching keyboard shortcut
    // plus (by default) a visible hint badge so players can discover it.
    // handler receives the triggering event (click event or keydown event).
    // opts: { key, showHint (default true), hintLabel (defaults to key) }
    bindActivate(el, handler, opts){
      opts = opts || {};
      el.addEventListener('click', (e)=> handler(e));
      if(opts.key){
        this.registerKey(opts.key, handler);
        if(opts.showHint !== false) this.addKeyHint(el, opts.hintLabel || opts.key);
      }
      return el;
    },


    // Convenience for the grid/selection-game shape (ODD ONE, WHACK,
    // MATCH, SPOT, CARD PEEK, buildOptionGrid, etc): binds click + number
    // keys 1..N to `cells` in order, with hint badges. Only cells[0..8]
    // get a shortcut (there's no natural single-digit key past 9).
    // onPick(index, cell) is called the same way whether the player
    // clicked or pressed the number key.
    // opts: { showHints (default true) }
    bindGridActivate(cells, onPick, opts){
      opts = opts || {};
      cells.forEach((cell,i)=>{
        const key = i < 9 ? String(i+1) : null;
        this.bindActivate(cell, ()=> onPick(i, cell), key ? { key, showHint: opts.showHints !== false } : {});
      });
    },
    roundToken(){ return roundToken; },
    // Shorthand for bulk-assigning inline styles, e.g.
    // MR.styleEl(el, { position:'absolute', top:'0', width:'26px' })
    // instead of one el.style.x = 'y' line per property. Individual
    // games can still fall back to direct el.style.x assignment for
    // one-off tweaks (e.g. inside a per-frame animation loop).
    styleEl(el, styles){ Object.assign(el.style, styles); return el; },

    makeEl(className, styles){
      const el = document.createElement('div');
      if(className) el.className = className;
      if(styles) this.styleEl(el, styles);
      return el;
    },

    // Builds an NROWS x NCOLS CSS grid of cell elements (the layout reused
    // by ODD ONE, WHACK, MEMORY, MATCH, SPOT, CARD PEEK, MISSING PIECE, and
    // the logic odd-shape-out game — each currently rebuilds this same
    // grid-container-plus-cells pattern independently). Returns the wrapper
    // element (not yet appended) and the array of cell elements in row-major
    // order; callers style/populate/wire up each cell themselves.
    // opts: { cellClass, gap, width, height, wrapStyles, cellStyles }
    makeGrid(nrows, ncols, opts){
      opts = opts || {};
      const wrap = this.makeEl('', Object.assign({
        display: 'grid',
        gridTemplateColumns: 'repeat(' + ncols + ', 1fr)',
        gridTemplateRows: 'repeat(' + nrows + ', 1fr)',
        gap: opts.gap || '10px',
        width: opts.width || '100%'
      }, opts.height ? { height: opts.height } : {}, opts.wrapStyles || {}));

      const cells = [];
      for(let i=0;i<nrows*ncols;i++){
        const cell = this.makeEl(opts.cellClass !== undefined ? opts.cellClass : 'cell', opts.cellStyles);
        wrap.appendChild(cell);
        cells.push(cell);
      }
      return { wrap, cells };
    },

    // Shared math for any COLS x ROWS grid laid out inside the stage with a
    // fixed outer margin and a gap between cells. Several games rebuilt this
    // same formula independently (ESCAPE, MAZE-MUNCH, LAVA, ALLEY, RUSH
    // ALLEY) — centralized here so the arithmetic only lives in one place.
    gridMetrics(cols, rows, gap, margin){
      const w = this.screen.clientWidth - margin;
      const h = this.screen.clientHeight - margin;
      const cellW = (w - (cols-1)*gap) / cols;
      const cellH = (h - (rows-1)*gap) / rows;
      return { w, h, cellW, cellH };
    },

    // Builds an absolute-positioned COLSxROWS pixel grid inside the stage —
    // the wrap-plus-per-cell-div loop duplicated (with only cosmetic
    // renames) across ESCAPE, MAZE-MUNCH, LAVA, and SNAKE. Cell sizing
    // comes from gridMetrics; this creates the actual DOM on top of that
    // and hands back the bookkeeping every one of those games needs:
    // a row-major `cells` array (index = key(r,c)), and two placement
    // helpers for moving sprites around on top of the grid.
    // opts: { gap (default 6), margin (default 36), cellClass, cellStyles,
    //   wrapStyles, onCellClick }
    //   cellClass: CSS class applied to every cell div (default 'cell',
    //     which is the bordered/background tile look used elsewhere).
    //     Pass '' or false for plain borderless cells — SNAKE wants the
    //     pixel grid's math without any visible per-cell tile.
    //   onCellClick(r,c): if given, wired as a click handler on every
    //     cell (including ones a caller later marks as walls/hazards —
    //     same as today, where the move-validation logic itself is what
    //     rejects a click on a blocked cell, not the DOM wiring).
    makeCellGrid(cols, rows, opts){
      opts = opts || {};
      const gap = opts.gap !== undefined ? opts.gap : 6;
      const margin = opts.margin !== undefined ? opts.margin : 36;
      const { w, h, cellW, cellH } = this.gridMetrics(cols, rows, gap, margin);
      const offset = margin/2;

      const wrap = this.makeEl('', Object.assign({
        position: 'absolute', left: offset+'px', top: offset+'px',
        width: w+'px', height: h+'px'
      }, opts.wrapStyles || {}));
      this.stage.appendChild(wrap);

      const cellClass = opts.cellClass !== undefined ? opts.cellClass : 'cell';
      const key = (r,c)=> r*cols+c;
      const cells = [];
      for(let r=0;r<rows;r++){
        for(let c=0;c<cols;c++){
          const el = this.makeEl(cellClass || '', Object.assign({
            position: 'absolute', width: cellW+'px', height: cellH+'px',
            left: (c*(cellW+gap))+'px', top: (r*(cellH+gap))+'px'
          }, opts.cellStyles || {}));
          wrap.appendChild(el);
          cells[key(r,c)] = { r, c, el };
        }
      }
      if(opts.onCellClick){
        cells.forEach(cd=> cd.el.addEventListener('click', ()=> opts.onCellClick(cd.r, cd.c)));
      }

      // Centers `el` inside cell (r,c) — the placePlayer/placeAt/placeGhost
      // pattern each game rebuilt for its moving sprites. Reads el's own
      // current size, so call it after the sprite's width/height are set.
      function placeCenter(el, r, c){
        Object.assign(el.style, {
          left: (c*(cellW+gap) + cellW/2 - el.clientWidth/2)+'px',
          top: (r*(cellH+gap) + cellH/2 - el.clientHeight/2)+'px'
        });
      }
      // Top-left aligns `el` with cell (r,c) — for full-tile overlays or
      // sprites (like SNAKE's segments) sized to fill the cell themselves.
      function placeCell(el, r, c){
        Object.assign(el.style, {
          left: (c*(cellW+gap))+'px',
          top: (r*(cellH+gap))+'px'
        });
      }

      return { wrap, cellW, cellH, cells, key, placeCenter, placeCell };
    },

    // General "N points + scattered walls, retried until every point can
    // reach every other one" layout generator.
    //
    // Picks `pointCount` random cells each at least minDist from every
    // other chosen point, scatters a wall budget around them (never on a
    // point), and retries the *whole* layout — not just the walls —
    // until bfsReachable confirms every point can reach points[0]. Falls
    // back to an evenly-spread, wall-free layout if nothing solvable
    // turns up within `attempts`, so a round can never soft-lock on an
    // unsolvable maze.
    // opts: { pointCount (default 2), wallDensity (default 0.28),
    //   minDist (default floor((cols+rows)/pointCount)), attempts
    //   (default 40), wallGuard (default 200, the retry cap for both
    //   placing points far enough apart and placing individual walls) }
    // returns { points: [{r,c}, ...], walls }
    generateLayoutWithPoints(cols, rows, opts){
      opts = opts || {};
      const pointCount = opts.pointCount !== undefined ? opts.pointCount : 2;
      const wallDensity = opts.wallDensity !== undefined ? opts.wallDensity : 0.28;
      const minDist = opts.minDist !== undefined ? opts.minDist : Math.floor((cols+rows)/pointCount);
      const attempts = opts.attempts !== undefined ? opts.attempts : 40;
      const wallGuard = opts.wallGuard !== undefined ? opts.wallGuard : 200;
      const key = (r,c)=> r*cols+c;
      const farEnough = (points, cand)=> points.every(p=> Math.abs(p.r-cand.r)+Math.abs(p.c-cand.c) >= minDist);

      for(let attempt=0; attempt<attempts; attempt++){
        const points = [];
        let placeGuard = 0;
        while(points.length < pointCount && placeGuard < wallGuard){
          placeGuard++;
          const cand = { r: Math.floor(this.rand(0,rows)), c: Math.floor(this.rand(0,cols)) };
          if(points.length === 0 || farEnough(points, cand)) points.push(cand);
        }
        if(points.length < pointCount) continue; // couldn't fit them far enough apart — retry the whole layout

        const walls = new Set();
        const wallBudget = Math.floor(cols*rows*wallDensity);
        let guard = 0;
        while(walls.size < wallBudget && guard < wallGuard){
          guard++;
          const r = Math.floor(this.rand(0,rows)), c = Math.floor(this.rand(0,cols));
          const k = key(r,c);
          if(points.some(p=> p.r===r && p.c===c)) continue;
          walls.add(k);
        }
        const allReachable = points.every((p,i)=> i===0 || this.bfsReachable(cols, rows, walls, points[0], p));
        if(allReachable) return { points, walls };
      }
      // fallback: spread points evenly along the top/bottom rows, no walls
      const fallbackPoints = [];
      for(let i=0;i<pointCount;i++){
        fallbackPoints.push({
          r: i%2===0 ? 0 : rows-1,
          c: pointCount>1 ? Math.round(i*(cols-1)/(pointCount-1)) : 0
        });
      }
      return { points: fallbackPoints, walls: new Set() };
    },

    // Breadth-first search over a COLSxROWS grid of cells, treating `walls`
    // (a Set of r*cols+c keys) as blocked. bfsReachable just answers whether
    // `to` can be reached from `from`; bfsNextStep returns the next cell
    // along the shortest such path (or `from` itself if already there / no
    // path exists) — used to make a chaser re-route live every tick instead
    // of committing to a stale path. Both were previously duplicated
    // (with only cosmetic renames) between the ESCAPE and MAZE-MUNCH games.
    bfsReachable(cols, rows, walls, from, to){
      const key = (r,c)=> r*cols+c;
      const seen = new Set([key(from.r,from.c)]);
      const queue = [from];
      while(queue.length){
        const cur = queue.shift();
        if(cur.r===to.r && cur.c===to.c) return true;
        const neighbors = [[cur.r-1,cur.c],[cur.r+1,cur.c],[cur.r,cur.c-1],[cur.r,cur.c+1]];
        for(const [nr,nc] of neighbors){
          if(nr<0||nr>=rows||nc<0||nc>=cols) continue;
          const k = key(nr,nc);
          if(seen.has(k) || walls.has(k)) continue;
          seen.add(k);
          queue.push({r:nr,c:nc});
        }
      }
      return false;
    },
    bfsNextStep(cols, rows, walls, from, to){
      if(from.r===to.r && from.c===to.c) return from;
      const key = (r,c)=> r*cols+c;
      const seen = new Set([key(from.r,from.c)]);
      const queue = [[from]];
      while(queue.length){
        const path = queue.shift();
        const cur = path[path.length-1];
        if(cur.r===to.r && cur.c===to.c) return path[1];
        const neighbors = [[cur.r-1,cur.c],[cur.r+1,cur.c],[cur.r,cur.c-1],[cur.r,cur.c+1]];
        for(const [nr,nc] of neighbors){
          if(nr<0||nr>=rows||nc<0||nc>=cols) continue;
          const k = key(nr,nc);
          if(seen.has(k) || walls.has(k)) continue;
          seen.add(k);
          queue.push(path.concat([{r:nr,c:nc}]));
        }
      }
      return from;
    },

    // ---------- GENERIC GRID ENTITY SYSTEM ----------
    // Generalizes the player/target/hazard/enemy/collectible plumbing that
    // ESCAPE, FOG MAZE, MAZE-MUNCH, and REVERSE MUNCH each hand-rolled with
    // only cosmetic differences: a moving player div, one or more other
    // sprites, a checkCollision() function, a win/lose call. A caller
    // describes *what's on the grid* — types, counts, movement behavior,
    // look — and this owns the DOM, movement rules, per-frame updates, and
    // contact resolution for all of it. The caller still owns the round
    // itself (ctx.onWin/onLose, the countdown timer) and just wires this
    // controller's callbacks into those.
    //
    // opts:
    //   gap, margin         -> forwarded to makeCellGrid
    //   walls                  Set of blocked cell keys (r*cols+c), e.g.
    //                           from generateLayoutWithPoints
    //   onWin(), onLose()      called when a type with onContact:'win' or
    //                           'lose' touches the player
    //   onAllCollected(name)   called once every entity of a 'collect'
    //                           type (by that type's name) has been picked up
    //   types: {
    //     <name>: {
    //       count,                // how many to place (ignored if `at` given)
    //       at: [{r,c}, ...],     // explicit starting cells
    //       isPlayer: true,       // exactly one type should set this
    //       static: true|false,   // false = moves under `behavior`
    //       behavior: 'input' | 'patrol' | 'chase' | 'pulse',
    //         // input:  arrow keys / adjacent-cell clicks move it (the player)
    //         // patrol: steps around `waypoints` on repeat, `stepMs` per hop
    //         //         — a fixed closed loop, not pathfinding
    //         // chase:  BFS-repaths toward the player every `stepMs`
    //         // pulse:  toggles safe/unsafe on `pulsePeriod`/`pulseUnsafe`,
    //         //         each instance phase-offset at random so a group
    //         //         doesn't flare in sync
    //       waypoints, stepMs, pulsePeriod, pulseUnsafe,
    //       onContact: 'win' | 'lose' | 'collect' | fn(entity),
    //       onMove(entity, dr, dc),  // optional per-step visual hook (e.g.
    //                                // rotating a pacman sprite to face dr/dc)
    //       render: {
    //         shape: 'circle'|'square'|'diamond', color, size (fraction of
    //           a cell, default 0.5), glow (default true), transition,
    //         fillCell: true,   // covers the whole cell (hazards like fire);
    //                           // pinned to its starting cell — don't combine
    //                           // with a moving behavior
    //         inCell: true,     // small icon centered inside its cell
    //                           // (collectibles like dots); same pin caveat
    //         makeEl(cellW,cellH): el, // full custom element instead of the above
    //         styles: {}        // extra inline styles merged in last
    //       }
    //     }
    //   }
    //
    // Returns { grid, entities, move(dr,dc), tryMoveTo(r,c), destroy() }.
    // entities[name] is the live array of { r, c, el, def } records for
    // that type — 'collect' entities are spliced out as they're picked up.
    makeEntityGrid(cols, rows, opts){
      opts = opts || {};
      const self = this;
      const walls = opts.walls || new Set();
      const types = opts.types || {};

      const grid = this.makeCellGrid(cols, rows, {
        gap: opts.gap, margin: opts.margin,
        onCellClick: (r,c)=> controller.tryMoveTo(r,c)
      });
      const { wrap, cellW, cellH, key } = grid;

      grid.cells.forEach(cd=>{
        if(walls.has(key(cd.r,cd.c))){
          cd.el.style.background = 'repeating-linear-gradient(45deg, var(--bezel), var(--bezel) 6px, rgba(0,0,0,0.35) 6px, rgba(0,0,0,0.35) 12px)';
        } else {
          cd.el.style.cursor = 'pointer';
        }
      });

      function makeEntityEl(def){
        const r = def.render || {};
        if(r.makeEl) return r.makeEl(cellW, cellH);
        const color = r.color || 'var(--go)';
        const glow = r.glow !== false;
        if(r.fillCell){
          return self.makeEl('', Object.assign({
            position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
            borderRadius: r.shape==='circle' ? '50%' : '4px',
            background: color, pointerEvents: 'none', opacity: '0',
            boxShadow: '0 0 0px ' + color,
            transition: 'opacity 150ms ease, box-shadow 150ms ease'
          }, r.styles || {}));
        }
        if(r.inCell){
          const size = r.size !== undefined ? r.size : 0.24;
          return self.makeEl('', Object.assign({
            position: 'absolute', left: '50%', top: '50%',
            width: (size*100)+'%', height: (size*100)+'%',
            transform: 'translate(-50%,-50%)',
            borderRadius: r.shape==='square' ? '4px' : '50%',
            background: color, pointerEvents: 'none',
            boxShadow: glow ? ('0 0 6px ' + color) : 'none'
          }, r.styles || {}));
        }
        const size = r.size !== undefined ? r.size : 0.5;
        const style = {
          position: 'absolute',
          width: (cellW*size)+'px', height: (cellH*size)+'px',
          background: color,
          transition: r.transition !== undefined ? r.transition : 'left 90ms ease, top 90ms ease'
        };
        style.borderRadius = r.shape==='square' ? '6px' : '50%';
        if(r.shape==='diamond') style.transform = 'rotate(45deg)';
        if(glow) style.boxShadow = '0 0 10px ' + color;
        return self.makeEl('', Object.assign(style, r.styles || {}));
      }

      const openCells = grid.cells.filter(cd=> !walls.has(key(cd.r,cd.c)));
      const claimed = new Set();
      const entities = {};
      let playerName = null;
      const createdAt = performance.now(); // so chase/patrol's first hop waits a full stepMs, same as the old setInterval-based version

      // Insertion order matters: types placed earlier (e.g. player,
      // target) claim their `at` cells first, so a later count-based type
      // (e.g. scattered hazards/pickups) never lands on top of them.
      Object.keys(types).forEach(name=>{
        const def = types[name];
        if(def.isPlayer) playerName = name;
        let cellsForType;
        if(def.at && def.at.length){
          cellsForType = def.at;
        } else {
          const candidates = self.shuffle(openCells.filter(cd=> !claimed.has(key(cd.r,cd.c))));
          cellsForType = candidates.slice(0, def.count || 0).map(cd=> ({ r: cd.r, c: cd.c }));
        }
        entities[name] = cellsForType.map(p=>{
          claimed.add(key(p.r, p.c));
          const el = makeEntityEl(def);
          const pinned = !!(def.render && (def.render.fillCell || def.render.inCell));
          if(pinned){ grid.cells[key(p.r,p.c)].el.appendChild(el); }
          else { wrap.appendChild(el); grid.placeCenter(el, p.r, p.c); }
          return { r: p.r, c: p.c, el, def, pinned, phase: self.rand(0, def.pulsePeriod || 1000), waypointIndex: 0, lastStepAt: createdAt };
        });
      });

      const remaining = {};
      Object.keys(entities).forEach(name=>{
        if(types[name].onContact === 'collect') remaining[name] = entities[name].length;
      });

      let alive = true;

      function moveEntityTo(e, r, c){
        e.r = r; e.c = c;
        if(e.pinned) return; // fillCell/inCell entities stay put on their starting cell
        grid.placeCenter(e.el, r, c);
      }

      function isPulseUnsafe(def, e, t){
        const period = def.pulsePeriod || 1800;
        const unsafe = def.pulseUnsafe || 700;
        return ((t + e.phase) % period) < unsafe;
      }

      function handleContact(name, e, t){
        const def = types[name];
        if(def.behavior === 'pulse' && !isPulseUnsafe(def, e, t)) return; // safe right now
        if(typeof def.onContact === 'function'){ def.onContact(e); return; }
        if(def.onContact === 'win'){ alive = false; opts.onWin && opts.onWin(); }
        else if(def.onContact === 'lose'){ alive = false; opts.onLose && opts.onLose(); }
        else if(def.onContact === 'collect'){
          e.el.remove();
          entities[name].splice(entities[name].indexOf(e), 1);
          remaining[name]--;
          if(remaining[name] <= 0 && opts.onAllCollected) opts.onAllCollected(name);
        }
      }

      function resolveContacts(t){
        if(!alive || !playerName) return;
        const p = entities[playerName][0];
        for(const name in entities){
          if(name === playerName) continue;
          for(const e of entities[name].slice()){ // slice: handleContact may splice the live array
            if(e.r === p.r && e.c === p.c) handleContact(name, e, t);
            if(!alive) return;
          }
        }
      }

      const controller = {
        grid, entities,
        tryMoveTo(r, c){
          if(!alive || !playerName) return;
          const p = entities[playerName][0];
          if(r<0||r>=rows||c<0||c>=cols) return;
          if(walls.has(key(r,c))) return;
          if(Math.abs(r-p.r)+Math.abs(c-p.c) !== 1) return;
          const dr = r-p.r, dc = c-p.c;
          moveEntityTo(p, r, c);
          const def = types[playerName];
          if(def.onMove) def.onMove(p, dr, dc);
          resolveContacts(performance.now());
        },
        move(dr, dc){
          if(!playerName) return;
          const p = entities[playerName][0];
          controller.tryMoveTo(p.r+dr, p.c+dc);
        },
        destroy(){
          alive = false;
          if(rafId) cancelAnimationFrame(rafId);
        }
      };

      if(playerName && types[playerName].behavior === 'input'){
        this.setKeyHandler((e)=>{
          if(e.key==='ArrowLeft') controller.move(0,-1);
          if(e.key==='ArrowRight') controller.move(0,1);
          if(e.key==='ArrowUp') controller.move(-1,0);
          if(e.key==='ArrowDown') controller.move(1,0);
        });
      }

      let rafId = null;
      function frame(t){
        if(!alive) return;
        for(const name in types){
          const def = types[name];
          const list = entities[name];
          if(def.behavior === 'pulse'){
            const color = (def.render && def.render.color) || 'var(--danger)';
            list.forEach(e=>{
              const unsafe = isPulseUnsafe(def, e, t);
              e.el.style.opacity = unsafe ? '0.85' : '0';
              e.el.style.boxShadow = unsafe ? ('0 0 14px ' + color) : ('0 0 0px ' + color);
            });
          } else if(def.behavior === 'chase'){
            const stepMs = def.stepMs || 400;
            const p = playerName && entities[playerName][0];
            if(p){
              list.forEach(e=>{
                if(t - e.lastStepAt < stepMs) return;
                e.lastStepAt = t;
                const next = self.bfsNextStep(cols, rows, walls, {r:e.r,c:e.c}, {r:p.r,c:p.c});
                if(next.r!==e.r || next.c!==e.c) moveEntityTo(e, next.r, next.c);
              });
            }
          } else if(def.behavior === 'patrol' && def.waypoints && def.waypoints.length){
            const stepMs = def.stepMs || 500;
            list.forEach(e=>{
              if(t - e.lastStepAt < stepMs) return;
              e.lastStepAt = t;
              e.waypointIndex = (e.waypointIndex+1) % def.waypoints.length;
              const wp = def.waypoints[e.waypointIndex];
              moveEntityTo(e, wp.r, wp.c);
            });
          }
        }
        resolveContacts(t);
        if(alive) rafId = requestAnimationFrame(frame);
      }
      rafId = requestAnimationFrame(frame);

      return controller;
    },

    // A keyboard-steerable reticle: arrow keys nudge it by `step` px
    // (clamped to [0,w]x[0,h]), space/enter fires at its current position.
    // Was previously copy-pasted, including the exact CSS, between the
    // HUNT and SKEET shooting games.
    createCrosshair({ x, y, w, h, step, onFire }){
      let rx = x, ry = y;
      step = step || 30;
      const reticle = this.makeEl('', {
        position:'absolute', width:'22px', height:'22px',
        marginLeft:'-11px', marginTop:'-11px',
        border:'2px solid var(--flash)', borderRadius:'50%',
        boxShadow:'0 0 6px var(--flash)', pointerEvents:'none', zIndex:9
      });
      this.stage.appendChild(reticle);
      function place(){ reticle.style.left = rx+'px'; reticle.style.top = ry+'px'; }
      place();
      this.setKeyHandler((e)=>{
        if(e.key==='ArrowLeft'){ rx = Math.max(0, rx-step); place(); }
        if(e.key==='ArrowRight'){ rx = Math.min(w, rx+step); place(); }
        if(e.key==='ArrowUp'){ ry = Math.max(0, ry-step); place(); }
        if(e.key==='ArrowDown'){ ry = Math.min(h, ry+step); place(); }
        if(e.key===' ' || e.key==='Enter'){ e.preventDefault(); if(onFire) onFire(rx,ry); }
      });
      return { get x(){ return rx; }, get y(){ return ry; }, place, el: reticle };
    },

    // A brief expanding-dot "shot fired" flash at (x,y). Was previously
    // defined identically twice inside games-shooting.js.
    muzzleFlash(x, y){
      const f = this.makeEl('', {
        position:'absolute', left:(x-9)+'px', top:(y-9)+'px',
        width:'18px', height:'18px', borderRadius:'50%',
        background:'var(--flash)', opacity:'0.85', pointerEvents:'none',
        zIndex:10, transition:'transform 220ms ease-out, opacity 220ms ease-out'
      });
      this.stage.appendChild(f);
      requestAnimationFrame(()=>{ f.style.transform = 'scale(2.2)'; f.style.opacity = '0'; });
      setTimeout(()=> f.remove(), 240);
    },

    // Converts a pointer event to coordinates relative to `el` (defaults to
    // the stage) — the getBoundingClientRect()-and-subtract boilerplate that
    // kept reappearing wherever a game needed "where on the stage was that
    // click/tap".
    pointerPos(e, el){
      const r = (el || this.stage).getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    },

    // Wires a "press and hold" control: onPress fires on pointerdown,
    // onRelease fires on pointerup/pointerleave/pointercancel — covering
    // every way a hold can end (including dragging off the element), which
    // several games previously re-wired by hand, one listener at a time.
    holdable(el, onPress, onRelease){
      el.addEventListener('pointerdown', onPress);
      const release = ()=> onRelease();
      el.addEventListener('pointerup', release);
      el.addEventListener('pointerleave', release);
      el.addEventListener('pointercancel', release);
      return el;
    },

    // Bookkeeping for setPointerCapture/releasePointerCapture on a single
    // draggable element. Capture-without-release is an easy leak: a round
    // can end (win/lose/timeout) while the pointer is still physically
    // down, so no pointerup/pointercancel ever fires to release it. That's
    // usually masked because the captured element gets destroyed by the
    // next clearStage(), which implicitly drops capture too — except for
    // an element that survives across rounds (like MR.stage itself in
    // BULLET HELL), where there's no such fallback and capture can get
    // stuck on it forever, silently breaking pointer/click routing on
    // every later round. Relying on that implicit-release-on-removal
    // fallback at all is also inconsistent across browsers/WebViews, so
    // this releases explicitly on every path either way.
    //
    // Usage: call onDown(e) from the element's pointerdown handler,
    // onUp(e) from pointerup/pointercancel, and release() unconditionally
    // from ctx.onCleanup (covers the round-ends-mid-drag case where
    // neither pointerup nor pointercancel ever fired).
    pointerCaptureTracker(el){
      let pointerId = null;
      return {
        onDown(e){
          pointerId = e.pointerId;
          el.setPointerCapture(e.pointerId);
        },
        onUp(e){
          if(e && e.pointerId !== undefined){
            try{ el.releasePointerCapture(e.pointerId); }catch(err){}
          }
          pointerId = null;
        },
        release(){
          if(pointerId !== null){
            try{ el.releasePointerCapture(pointerId); }catch(err){}
            pointerId = null;
          }
        }
      };
    },

    // Splits the stage into two equal, absolutely-positioned tap/hold
    // zones — top+bottom (vertical=false) or left+right (vertical=true).
    // Returns [zoneA, zoneB] (top/left first); the caller wires whatever
    // listeners it needs (plain 'click' for a momentary trigger, or
    // MR.holdable for press-and-hold). Previously each of DINOJUMP, SWIM,
    // BALANCE, and ORBIT built this same pair of divs from scratch.
    splitZones(vertical){
      const base = vertical
        ? { position:'absolute', top:'0', bottom:'0', width:'50%', cursor:'pointer', touchAction:'none' }
        : { position:'absolute', left:'0', right:'0', height:'50%', cursor:'pointer', touchAction:'none' };
      const a = this.makeEl('', base);
      const b = this.makeEl('', base);
      if(vertical){ a.style.left = '0'; b.style.right = '0'; }
      else { a.style.top = '0'; b.style.bottom = '0'; }
      return [a, b];
    },

    // Builds `count` distinct option values around `answer` (always
    // includes `answer` itself), each a random offset within +/-spread,
    // optionally floored at `min`, then shuffled. The "correct answer plus
    // a few plausible distractors" quiz pattern was previously duplicated
    // (with slightly different spreads/mins) across MATH, COUNT, and the
    // memory number-guess game.
    distractorOptions(answer, count, spread, min){
      const opts = new Set([answer]);
      let guard = 0;
      while(opts.size < count && guard++ < 1000){
        let cand = answer + Math.floor(this.rand(-spread, spread+1));
        if(min !== undefined) cand = Math.max(min, cand);
        if(cand !== answer) opts.add(cand);
      }
      return this.shuffle(Array.from(opts));
    },

    // Renders `options` as a clickable 2-column grid (the quiz-answer
    // layout reused by MATH, COUNT, SPOT-THE-NUMBER, etc). Clicking a cell
    // — or pressing its number key (1..N, via bindGridActivate) — calls
    // onPick(value). Returns the row element — append it yourself.
    buildOptionGrid(options, onPick, opts){
      opts = opts || {};
      const row = this.makeEl('', {
        display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'10px',
        width: opts.width || '70%'
      });
      const cells = options.map(o=>{
        const cell = this.makeEl('cell', {
          padding:'16px', textAlign:'center', cursor:'pointer',
          fontFamily:'var(--display)', fontSize: opts.fontSize || '22px'
        });
        cell.textContent = o;
        row.appendChild(cell);
        return cell;
      });
      this.bindGridActivate(cells, (i)=> onPick(options[i]));
      return row;
    },

    // Arrow-key + space/enter driven selection over a ROWSxCOLS grid of
    // slots (each { el, r, c }). Highlights the selected slot and calls
    // onFire(r, c) on space/enter. Was previously duplicated (identical
    // update/keydown logic) between the ALLEY and RUSH ALLEY shooting games.
    gridSelector(rows, cols, slotEls, onFire, isSkipped){
      let selR = 0, selC = 0;
      function update(){
        slotEls.forEach(s=>{
          if(isSkipped && isSkipped(s)) return;
          s.el.style.boxShadow = (s.r===selR && s.c===selC)
            ? '0 0 0 3px var(--flash)'
            : 'inset 0 0 0 1px var(--line)';
        });
      }
      update();
      this.setKeyHandler((e)=>{
        if(e.key==='ArrowLeft'){ selC = Math.max(0, selC-1); update(); }
        if(e.key==='ArrowRight'){ selC = Math.min(cols-1, selC+1); update(); }
        if(e.key==='ArrowUp'){ selR = Math.max(0, selR-1); update(); }
        if(e.key==='ArrowDown'){ selR = Math.min(rows-1, selR+1); update(); }
        if(e.key===' ' || e.key==='Enter'){ e.preventDefault(); onFire(selR, selC); }
      });
      return { get r(){ return selR; }, get c(){ return selC; }, update };
    },

    rafId: null
  };
  // ---------- ENGINE ----------

  function setScore(v){
    score = v;
    scoreVal.textContent = score;
  }

  function buildRunBreakdown(){
    const order = [];
    const byLabel = {};
    runHistory.forEach(entry=>{
      if(!byLabel[entry.label]){
        byLabel[entry.label] = { won:0, lost:0 };
        order.push(entry.label);
      }
      if(entry.win) byLabel[entry.label].won++; else byLabel[entry.label].lost++;
    });
    return order.map(label=>({ label, ...byLabel[label] }));
  }

  function renderRunBreakdownMarkup(){
    if(!runHistory.length) return '';
    const rows = buildRunBreakdown().map(r=>{
      return `<tr>
        <td>${r.label}</td>
        <td class="run-won">${r.won ? '✓ '+r.won : '—'}</td>
        <td class="run-lost">${r.lost ? '✗ '+r.lost : '—'}</td>
      </tr>`;
    }).join('');
    const sequence = runHistory.map(entry=>
      `<span class="run-pip ${entry.win?'win':'lose'}" title="${entry.label} — ${entry.win?'won':'lost'}"></span>`
    ).join('');
    return `
      <div class="run-breakdown">
        <div class="run-breakdown-heading">this run</div>
        <div class="run-pip-row">${sequence}</div>
        <div class="run-breakdown-scroll">
          <table class="stats-table run-table">
            <thead><tr><th>game</th><th>won</th><th>lost</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function showOverlayEnd(){
    running = false;
    if(score > best){
      best = score;
      lsSet(STORAGE_KEY, String(best));
    }
    bestVal.textContent = best;
    if(dailyRun){
      saveDailyResult();
      Math.random = nativeRandom;
    }
    renderGameOverOverlay();
  }

  function renderGameOverOverlay(){
    const isDaily = dailyRun;
    overlay.innerHTML = `
      <h1>${isDaily ? "DAILY COMPLETE" : "GAME OVER"}</h1>
      ${isDaily ? `<p class="daily-tag">DAILY — ${todayKey()} · ${activeDiff().name}</p>` : ''}
      <div class="score">${score}</div>
      <p>${score>=15?'certified reflex machine.':'the mash reflex will save you. try again.'}</p>
      ${renderRunBreakdownMarkup()}
      ${isDaily ? `
        <button class="arcade" id="shareDailyBtn">copy share result</button>
        <div id="shareFallback" class="share-fallback" style="display:none">
          <textarea readonly onclick="this.select()">${dailyShareText(todaysDailyResult() || currentRunResultShape())}</textarea>
        </div>
      ` : `<div class="diff-picker" id="diffPickerEnd"></div>`}
      <button class="arcade${isDaily?' secondary':''}" id="retryBtn">${isDaily ? 'back to menu' : 'retry'}</button>
      <button class="arcade secondary" id="statsBtnEnd">per-game stats</button>
    `;
    overlay.classList.remove('hidden');
    if(!isDaily) renderDiffPicker($('diffPickerEnd'));
    $('retryBtn').addEventListener('click', ()=>{
      if(isDaily) renderStartOverlay(); else startRun();
    });
    if(isDaily){
      $('shareDailyBtn').addEventListener('click', ()=>{
        copyDailyShareText(todaysDailyResult() || currentRunResultShape());
      });
    }
    $('statsBtnEnd').addEventListener('click', ()=>{
      renderStatsView(renderGameOverOverlay);
    });
  }

  function renderStartOverlay(){
    const daily = todaysDailyResult();
    overlay.innerHTML = `
      <h1>MICRO/RUSH</h1>
      <p>a rapid-fire stack of tiny games.<br>tap, click, or use arrow keys.<br>read the word. react fast. survive.</p>
      <div class="diff-picker" id="diffPickerStart"></div>
      <button class="arcade" id="startBtn">start</button>
      <div class="daily-block">
        <div class="daily-heading">DAILY — ${todayKey()}</div>
        <p class="daily-note">same game sequence for everyone today — pick a difficulty above, then compare scores.</p>
        ${daily ? `<div class="daily-played">today's score: <b>${daily.score}</b> <span class="daily-diff-tag">(${daily.difficulty || selectedDiff().name})</span></div>` : ''}
        <button class="arcade secondary" id="dailyBtn">${daily ? 'replay daily' : "play today's run"}</button>
        ${daily ? `<button class="arcade secondary" id="shareDailyBtnStart">share result</button>` : ''}
      </div>
      <button class="arcade secondary" id="statsBtnStart">per-game stats</button>
    `;
    overlay.classList.remove('hidden');
    renderDiffPicker($('diffPickerStart'));
    $('startBtn').addEventListener('click', ()=> startRun());
    $('dailyBtn').addEventListener('click', ()=> startRun({ daily:true }));
    if(daily){
      $('shareDailyBtnStart').addEventListener('click', ()=>{
        copyDailyShareText(daily);
        const btn = $('shareDailyBtnStart');
        if(btn) btn.textContent = 'copied!';
      });
    }
    $('statsBtnStart').addEventListener('click', ()=>{
      renderStatsView(renderStartOverlay);
    });
  }

  function downloadStatsJson(){
    const payload = {
      exportedAt: new Date().toISOString(),
      best: best,
      difficulty: selectedDiff().name,
      games: games.map(g=>{
        const s = gameStats[g.label] || { score:0, plays:0, wins:0, losses:0 };
        return {
          label: g.label,
          score: s.score,
          plays: s.plays,
          wins: s.wins,
          losses: s.losses,
          successRate: s.plays ? +(s.wins/s.plays).toFixed(4) : 0,
          errorRate: s.plays ? +(s.losses/s.plays).toFixed(4) : 0
        };
      })
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'microrush-stats.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }

  function renderStatsView(backCb){
    const rows = games.map(g=>{
      const s = gameStats[g.label] || { score:0, plays:0, wins:0, losses:0 };
      const successPct = s.plays ? Math.round((s.wins/s.plays)*100) : 0;
      const errorPct = s.plays ? Math.round((s.losses/s.plays)*100) : 0;
      return `<tr>
        <td>${g.label}</td>
        <td>${s.score}</td>
        <td>${s.plays}</td>
        <td>${successPct}%</td>
        <td>${errorPct}%</td>
      </tr>`;
    }).join('');
    overlay.innerHTML = `
      <h1>PER-GAME STATS</h1>
      <div class="stats-view">
        <div class="stats-scroll">
          <table class="stats-table">
            <thead>
              <tr><th>game</th><th>score</th><th>plays</th><th>ok</th><th>err</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div class="stats-actions">
          <button class="arcade secondary" id="resetStatsBtn">reset</button>
          <button class="arcade secondary" id="downloadStatsBtn">download json</button>
          <button class="arcade" id="statsBackBtn">back</button>
        </div>
      </div>
    `;
    overlay.classList.remove('hidden');
    $('statsBackBtn').addEventListener('click', backCb);
    $('downloadStatsBtn').addEventListener('click', downloadStatsJson);
    $('resetStatsBtn').addEventListener('click', ()=>{
      gameStats = {};
      lsRemove(STATS_KEY);
      renderStatsView(backCb);
    });
  }

  function flashInstruction(word, cb){
    instructionText.textContent = word;
    instructionText.className = '';
    void instructionText.offsetWidth;
    instructionText.classList.add('show');
    flashTimeout = setTimeout(()=>{
      instructionText.classList.remove('show');
      cb();
    }, 620);
  }

  function flashCabinet(cls){
    if(!cabinet) return;
    cabinet.classList.remove('flash-win','flash-lose','flash-win-double');
    void cabinet.offsetWidth; // restart animation even if same class as before
    cabinet.classList.add(cls);
    clearTimeout(cabinetFlashTimeout);
    const duration = cls==='flash-win-double' ? 700 : 400;
    cabinetFlashTimeout = setTimeout(()=>{ cabinet.classList.remove(cls); }, duration);
  }

  // Snaps the timer bar to full width in a given color with no transition
  // — the "reset before re-animating" step needed both when a fresh round
  // starts (flash color) and right after a round ends (go/danger color),
  // previously written out as the same three-line block in three places.
  function setTimerBarState(color){
    timerbar.style.transition = 'none';
    timerbar.style.background = color;
    timerbar.style.transform = 'scaleX(1)';
  }

  function endRound(win){
    const myToken = roundToken;
    clearTimeout(roundTimeout);
    if(MR.rafId) cancelAnimationFrame(MR.rafId);
    if(myToken !== roundToken) return;
    roundToken++; // invalidate further callbacks from this round
    // Run the round's own cleanup exactly once here, regardless of *why*
    // the round ended (win, lose, or timeout). Games that attach listeners
    // directly to persistent nodes (window, MR.stage) instead of going
    // through MR.setKeyHandler rely on ctx.onCleanup to remove them —
    // previously this only ran from the timeout branch below, so any game
    // that ends via an immediate ctx.onWin()/ctx.onLose() (the common case)
    // leaked those listeners forever, one more stale copy per round.
    if(currentCtx && currentCtx.onCleanup){
      currentCtx.onCleanup();
    }
    currentCtx = null;
    if(currentGame){
      recordResult(currentGame.label, win);
      runHistory.push({ label: currentGame.label, win: win });
      playedLabels.add(currentGame.label);
      setActiveRoster(currentGame.label);
    }
    clearStage();
    if(win){
      setScore(score+1);
      speedMul = Math.min(activeDiff().base + score*activeDiff().growth, activeDiff().maxSpeed);
      updateSpeedDisplay();
      streak++;
      let recovered = false;
      if(streak % streakForLife() === 0 && lives < maxLives){
        lives++;
        recovered = true;
      }
      renderLives(recovered);
      flashCabinet(recovered ? 'flash-win-double' : 'flash-win');
      setTimerBarState('var(--go)');
      setTimeout(nextRound, 260);
    } else {
      streak = 0;
      lives--;
      renderLives();
      flashCabinet('flash-lose');
      setTimerBarState('var(--danger)');
      if(lives<=0){
        setTimeout(showOverlayEnd, 420);
      } else {
        setTimeout(nextRound, 500);
      }
    }
  }

  function populateRoster(){
    if(!rosterList) return;
    rosterList.innerHTML = '';
    games.forEach(g=>{
      const li = document.createElement('li');
      li.dataset.label = g.label;
      if(g.desc) li.dataset.desc = g.desc;
      li.style.cursor = 'pointer';
      const labelSpan = document.createElement('span');
      labelSpan.className = 'roster-label';
      labelSpan.textContent = g.label;
      li.appendChild(labelSpan);
      li.addEventListener('click', ()=> toggleForcedGame(g));
      rosterList.appendChild(li);
    });
  }

  function setActiveRoster(label){
    if(!rosterList) return;
    rosterList.querySelectorAll('li').forEach(li=>{
      li.classList.toggle('active', li.dataset.label === label);
      li.classList.toggle('pinned', pinnedLabels.has(li.dataset.label));
      li.classList.toggle('played', playedLabels.has(li.dataset.label));
    });
  }

  // Picking games from the roster pins them so every following round draws
  // only from that pinned pool instead of the full shuffle; toggling a game
  // off (or during a daily run, where the sequence must stay seeded/fair)
  // removes it from the pool, and an empty pool falls back to the full set.
  function toggleForcedGame(g){
    if(pinnedLabels.has(g.label)) pinnedLabels.delete(g.label);
    else pinnedLabels.add(g.label);
    if(!running){
      setActiveRoster(currentGame ? currentGame.label : null);
      return;
    }
    if(dailyRun) return; // don't let pins disturb a seeded daily sequence
    // jump straight into a fresh round reflecting the updated pool
    roundToken++;
    clearTimeout(roundTimeout);
    clearTimeout(flashTimeout);
    if(MR.rafId) cancelAnimationFrame(MR.rafId);
    if(currentCtx && currentCtx.onCleanup) currentCtx.onCleanup();
    currentCtx = null;
    clearStage();
    nextRound();
  }

  function nextRound(){
    if(!running) return;
    const myToken = roundToken;
    clearStage();
    // Reseed fresh for every round of a daily run, keyed off the round
    // index rather than letting one continuous stream run for the whole
    // run. Some microgames (e.g. RED LIGHT) keep drawing random numbers
    // for as long as the round lasts in real time, so how quickly a
    // player wins or loses a round changes how many draws get consumed
    // before the next one. With a single shared stream that shifts every
    // later pick out of sync, so the "same" daily seed could still hand
    // out a different game order depending on how someone played the
    // earlier rounds. Reseeding per round makes each round's game pick
    // (and its internal setup) depend only on the date and round number,
    // so the sequence is identical for everyone no matter how any round
    // actually played out.
    if(dailyRun){
      Math.random = mulberry32(seedFromString('microrush-' + todayKey() + '-round' + dailyRoundIndex));
      dailyRoundIndex++;
    }
    const usePinned = pinnedLabels.size > 0 && !dailyRun;
    const pool = usePinned ? games.filter(g=>pinnedLabels.has(g.label)) : games;
    const game = pickUniformByCategory(pool);
    currentGame = game;
    stageLabel.textContent = game.label;
    setActiveRoster(game.label);
    flashInstruction(game.word, ()=>{
      if(myToken !== roundToken || !running) return;
      const limit = game.timeLimit(speedMul);
      const ctx = {
        speedMul,
        token: myToken,
        onCleanup: null,
        stopIsWin: false,
        survivalGame: false,
        onWin(){ if(roundToken===myToken) endRound(true); },
        onLose(){ if(roundToken===myToken) endRound(false); }
      };
      currentCtx = ctx;
      game.start(ctx);
      setTimerBarState('var(--flash)');
      requestAnimationFrame(()=>{
        timerbar.style.transition = `transform ${limit}ms linear`;
        timerbar.style.transform = 'scaleX(0)';
      });
      roundTimeout = setTimeout(()=>{
        if(roundToken!==myToken) return;
        const timeoutIsWin = ctx.survivalGame || ctx.stopIsWin;
        endRound(timeoutIsWin);
      }, limit);
    });
  }

  // ---------- DAILY SEED ----------
  // Overriding Math.random for the duration of a daily run is deliberate:
  // every pick()/rand() call and every ad-hoc Math.random() inside the
  // individual microgames all route through it, so each round — which
  // game appears and every randomized detail inside it — becomes fully
  // deterministic from the date and round number alone, with zero
  // changes needed at each of the ~20 call sites scattered through the
  // games. It's reseeded per round (in nextRound(), keyed on date+round
  // index) rather than once for the whole run, since some microgames
  // keep consuming random draws for as long as the round lasts in real
  // time — a single run-long stream would let a player's own timing
  // shift every later round's pick out of sync with everyone else's.
  const nativeRandom = Math.random;

  function mulberry32(seed){
    return function(){
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seedFromString(str){
    let h = 1779033703 ^ str.length;
    for(let i=0;i<str.length;i++){
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }

  function todayKey(){
    const d = new Date();
    const mm = String(d.getUTCMonth()+1).padStart(2,'0');
    const dd = String(d.getUTCDate()).padStart(2,'0');
    return d.getUTCFullYear() + '-' + mm + '-' + dd;
  }

  const DAILY_RESULT_KEY = 'microrush_daily_result';
  function loadDailyResult(){
    return lsGetJSON(DAILY_RESULT_KEY, null);
  }
  // Both the "just finished a daily run" save and the "show me the result
  // as it stands right now" fallback need the exact same shape — build it
  // in one place so they can't drift apart.
  function buildDailyResultShape(){
    return {
      date: todayKey(),
      score: score,
      difficulty: activeDiff().name,
      pips: runHistory.map(e=>e.win),
      breakdown: buildRunBreakdown()
    };
  }
  function saveDailyResult(){
    const result = buildDailyResultShape();
    lsSetJSON(DAILY_RESULT_KEY, result);
    return result;
  }
  function todaysDailyResult(){
    const r = loadDailyResult();
    return (r && r.date === todayKey()) ? r : null;
  }

  function currentRunResultShape(){
    // fallback shape matching a saved daily result, built from the live
    // in-progress state — used if the saved copy isn't available for
    // whatever reason (e.g. localStorage write failed)
    return buildDailyResultShape();
  }

  function dailyShareText(result){
    const pips = result.pips.map(w=>w?'🟩':'🟥').join('');
    const difficulty = result.difficulty || selectedDiff().name;
    const breakdown = (result.breakdown || []).map(r=>{
      const label = r.label.padEnd(9, ' ');
      return `${label} ${r.won}W-${r.lost}L`;
    }).join('\n');
    return `MICRO/RUSH — DAILY ${result.date}\nDifficulty: ${difficulty}\nScore: ${result.score}\n${pips}` +
      (breakdown ? `\n\nPer-game:\n${breakdown}` : '');
  }

  function copyDailyShareText(result){
    const text = dailyShareText(result);
    const done = (ok)=>{
      const btn = $('shareDailyBtn') || $('shareDailyBtnStart');
      if(btn) btn.textContent = ok ? 'copied!' : 'copy failed — see below';
      const fallback = $('shareFallback');
      if(fallback) fallback.style.display = ok ? 'none' : 'block';
    };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(()=>done(true)).catch(()=>done(false));
    } else {
      done(false);
    }
  }

  function startRun(opts){
    opts = opts || {};
    dailyRun = !!opts.daily;
    dailyRoundIndex = 0;
    activeDiffIndex = diffIndex;
    // nextRound() reseeds per-round for daily runs (see its own comment
    // there), so this just needs to make sure a non-daily run is on
    // native random.
    if(!dailyRun) Math.random = nativeRandom;
    overlay.classList.add('hidden');
    startMusic();
    setScore(0);
    maxLives = activeDiff().lives;
    lives = maxLives;
    streak = 0;
    runHistory = [];
    playedLabels = new Set();
    speedMul = activeDiff().base;
    updateSpeedDisplay();
    renderLives();
    running = true;
    roundToken++;
    nextRound();
  }

  // Needs to run after the category files (games-reflex.js, games-motion.js,
  // games-memory.js, games-logic.js) have finished pushing into MR.games.
  // Those are plain blocking <script> tags loaded right after this one, so
  // waiting on 'DOMContentLoaded' is a spec-guaranteed barrier: the browser
  // does not fire it until every blocking script has finished executing,
  // no matter how slow or uneven the network is for each file.
  //
  // (A setTimeout(fn, 0) here would NOT be a reliable substitute — it's
  // just a queued task, and the browser can run it in a gap between two
  // script fetches, before every category file has had a chance to run.
  // That's an intermittent bug, not a hard failure, so it can look fine
  // on a fast/cached load and randomly drop games on a slower one.)
  function initRosterAndOverlay(){
    renderLives();
    populateRoster();
    renderStartOverlay();
    bindPanelToggles();
  }

  // The two side-panel slide toggles (music, number hotkeys). Reflects
  // whatever was persisted from a previous visit, and applies the
  // hotkeys-off class immediately so badges are hidden from the very
  // first round if that's the stored preference — not just after the
  // first time someone flips the switch.
  function bindPanelToggles(){
    const musicToggle = $('musicToggle');
    if(musicToggle){
      musicToggle.checked = musicEnabled;
      musicToggle.addEventListener('change', ()=> setMusicEnabled(musicToggle.checked));
    }
    const hotkeysToggle = $('hotkeysToggle');
    if(hotkeysToggle){
      hotkeysToggle.checked = hotkeysEnabled;
      hotkeysToggle.addEventListener('change', ()=> setHotkeysEnabled(hotkeysToggle.checked));
    }
    document.body.classList.toggle('hotkeys-off', !hotkeysEnabled);
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initRosterAndOverlay);
  } else {
    // DOMContentLoaded already fired by the time this ran (e.g. this
    // script was injected/executed late) — the barrier already passed,
    // so it's safe to just run immediately.
    initRosterAndOverlay();
  }

})();
