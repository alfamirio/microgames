(function(){
  "use strict";

  const stage = document.getElementById('stage');
  const screen = document.getElementById('screen');
  const cabinet = document.getElementById('cabinet');
  const instructionEl = document.getElementById('instruction');
  const instructionText = document.getElementById('instructionText');
  const overlay = document.getElementById('overlay');
  const timerbar = document.getElementById('timerbar');
  const scoreVal = document.getElementById('scoreVal');
  const bestVal = document.getElementById('bestVal');
  const livesEl = document.getElementById('lives');
  const livesCount = document.getElementById('livesCount');
  const speedVal = document.getElementById('speedVal');
  const streakHint = document.getElementById('streakHint');
  const bgMusic = document.getElementById('bgMusic');

  const MUSIC_KEY = 'microrush_music_enabled';
  let musicEnabled = localStorage.getItem(MUSIC_KEY);
  musicEnabled = musicEnabled === null ? true : musicEnabled === '1';

  let musicOk = true;
  let musicStarted = false;
  if(bgMusic){
    bgMusic.volume = 0.55;
    // if microgames_music.opus isn't present (or fails to load for any
    // reason), quietly give up on it — the game runs identically without it
    bgMusic.addEventListener('error', ()=>{ musicOk = false; });
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
    try{ localStorage.setItem(MUSIC_KEY, on ? '1' : '0'); }catch(e){}
    if(!bgMusic) return;
    if(on){
      if(running) startMusic();
      if(musicStarted) bgMusic.play().catch(()=>{});
    } else {
      bgMusic.pause();
    }
  }

  const HOTKEYS_KEY = 'microrush_hotkeys_enabled';
  let hotkeysEnabled = localStorage.getItem(HOTKEYS_KEY);
  hotkeysEnabled = hotkeysEnabled === null ? false : hotkeysEnabled === '1';

  // Purely a dispatch gate + a CSS class — the badges themselves are
  // always built (see MR.addKeyHint), just hidden via .hotkeys-off so
  // toggling this mid-round doesn't require touching any live game state.
  function setHotkeysEnabled(on){
    hotkeysEnabled = on;
    try{ localStorage.setItem(HOTKEYS_KEY, on ? '1' : '0'); }catch(e){}
    document.body.classList.toggle('hotkeys-off', !on);
  }
  const stageLabel = document.getElementById('stageLabel');
  const rosterList = document.getElementById('rosterList');

  const STORAGE_KEY = 'microrush_best';
  let best = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
  bestVal.textContent = best;

  const DIFF_KEY = 'microrush_diff';
  const DIFFICULTIES = [
    { name: 'CHILL',  lives: 6, base: 0.8,  growth: 0.020, streakForLife: 2, maxSpeed: 1.2 },
    { name: 'EASY',   lives: 5, base: 0.9,  growth: 0.030, streakForLife: 3, maxSpeed: 1.3 },
    { name: 'NORMAL', lives: 4, base: 1.0,  growth: 0.040, streakForLife: 4, maxSpeed: 1.4 },
    { name: 'HARD',   lives: 3, base: 1.1,  growth: 0.050, streakForLife: 5, maxSpeed: 1.5 },
    { name: 'INSANE', lives: 2, base: 1.2,  growth: 0.060, streakForLife: 6, maxSpeed: 1.6 }
  ];
  let diffIndex = parseInt(localStorage.getItem(DIFF_KEY) || '2', 10);
  if(isNaN(diffIndex) || diffIndex < 0 || diffIndex >= DIFFICULTIES.length) diffIndex = 2;

  function renderDiffPicker(container){
    if(!container) return;
    container.innerHTML =
      '<div class="diff-caption">difficulty — <span class="diff-name">' + DIFFICULTIES[diffIndex].name + '</span> · life every ' + DIFFICULTIES[diffIndex].streakForLife + '</div>' +
      '<div class="diff-row">' +
        DIFFICULTIES.map((d,i)=>'<div class="diff-pill' + (i===diffIndex?' active':'') + '" data-index="'+i+'">'+(i+1)+'</div>').join('') +
      '</div>';
    container.querySelectorAll('.diff-pill').forEach(pill=>{
      pill.addEventListener('click', ()=>{
        diffIndex = parseInt(pill.dataset.index, 10);
        localStorage.setItem(DIFF_KEY, String(diffIndex));
        renderDiffPicker(container);
      });
    });
  }

  const STATS_KEY = 'microrush_stats';
  function loadStats(){
    try{
      const raw = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
      return (raw && typeof raw === 'object') ? raw : {};
    }catch(e){ return {}; }
  }
  let gameStats = loadStats();

  function recordResult(label, win){
    const s = gameStats[label] || (gameStats[label] = { score:0, plays:0, wins:0, losses:0 });
    s.plays++;
    if(win){ s.wins++; s.score++; } else { s.losses++; }
    try{ localStorage.setItem(STATS_KEY, JSON.stringify(gameStats)); }catch(e){}
  }

  let score = 0;
  let lives = 3;
  let streak = 0;
  let activeDiffIndex = diffIndex;
  function streakForLife(){ return DIFFICULTIES[activeDiffIndex].streakForLife; }
  let running = false;
  let roundToken = 0;
  let speedMul = 1;
  let roundTimeout = null;
  let flashTimeout = null;
  let cabinetFlashTimeout = null;
  let keyHandler = null;
  // Backing store for MR.registerKey/MR.registerHoldKey (see the "SHARED
  // INPUT HELPERS" block below) — reset every round so stale bindings from
  // the previous game can't leak into the next one.
  let keyRegistry = null;
  let extraKeyListeners = [];
  let currentGame = null;
  let currentCtx = null;
  let runHistory = [];
  let dailyRun = false;
  let dailyRoundIndex = 0;
  let pinnedLabels = new Set();

  let maxLives = DIFFICULTIES[activeDiffIndex].lives;

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
    extraKeyListeners.forEach(({target,type,fn})=> target.removeEventListener(type, fn));
    extraKeyListeners = [];
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

    // Registers a hold shortcut: onStart fires on keydown, onEnd fires on
    // keyup, mirroring pointerdown/pointerup. Ignores key-repeat autofire
    // (holding a key sends repeated keydowns) so onStart only fires once
    // per physical press. Uses its own window listeners (independent of
    // the registerKey dispatcher above, since it needs the keyup half
    // too) — tracked in extraKeyListeners so clearStage can tear them down
    // between rounds same as everything else.
    registerHoldKey(key, onStart, onEnd){
      let holding = false;
      const down = (e)=>{
        if(!hotkeysEnabled) return;
        if(e.key !== key || holding) return;
        holding = true;
        onStart(e);
      };
      const up = (e)=>{
        if(e.key !== key || !holding) return;
        holding = false;
        onEnd(e);
      };
      window.addEventListener('keydown', down);
      window.addEventListener('keyup', up);
      extraKeyListeners.push({ target: window, type: 'keydown', fn: down });
      extraKeyListeners.push({ target: window, type: 'keyup', fn: up });
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

    // Hold-control version of bindActivate: pointer hold (down/up/leave/
    // cancel) paired with an optional matching hold-key. onStart/onEnd
    // receive the triggering event.
    // opts: { key, showHint (default true), hintLabel (defaults to key) }
    bindHold(el, onStart, onEnd, opts){
      opts = opts || {};
      el.addEventListener('pointerdown', (e)=> onStart(e));
      el.addEventListener('pointerup', (e)=> onEnd(e));
      el.addEventListener('pointerleave', (e)=> onEnd(e));
      el.addEventListener('pointercancel', (e)=> onEnd(e));
      if(opts.key){
        this.registerHoldKey(opts.key, onStart, onEnd);
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

    // Shared "two points + scattered walls, retried until provably
    // solvable" layout generator behind ESCAPE (start/target) and
    // MAZE-MUNCH (start/ghostStart) — previously duplicated with only
    // cosmetic renames. Picks two random cells at least minDist apart,
    // scatters a wall budget around them (never on either point), and
    // retries the *whole* layout — not just the walls — until
    // bfsReachable confirms `b` can still reach `a`. Falls back to
    // opposite corners with no walls if nothing solvable turns up within
    // `attempts`, so a round can never soft-lock on an unsolvable maze.
    // opts: { wallDensity (default 0.28), minDist (default
    //   floor((cols+rows)/2)), attempts (default 40), wallGuard (default
    //   200, the retry cap for placing individual walls) }
    generateSolvableLayout(cols, rows, opts){
      opts = opts || {};
      const wallDensity = opts.wallDensity !== undefined ? opts.wallDensity : 0.28;
      const minDist = opts.minDist !== undefined ? opts.minDist : Math.floor((cols+rows)/2);
      const attempts = opts.attempts !== undefined ? opts.attempts : 40;
      const wallGuard = opts.wallGuard !== undefined ? opts.wallGuard : 200;
      const key = (r,c)=> r*cols+c;

      for(let attempt=0; attempt<attempts; attempt++){
        const a = { r: Math.floor(this.rand(0,rows)), c: Math.floor(this.rand(0,cols)) };
        const b = { r: Math.floor(this.rand(0,rows)), c: Math.floor(this.rand(0,cols)) };
        const dist = Math.abs(a.r-b.r) + Math.abs(a.c-b.c);
        if(dist < minDist) continue;
        const walls = new Set();
        const wallBudget = Math.floor(cols*rows*wallDensity);
        let guard = 0;
        while(walls.size < wallBudget && guard < wallGuard){
          guard++;
          const r = Math.floor(this.rand(0,rows)), c = Math.floor(this.rand(0,cols));
          const k = key(r,c);
          if((r===a.r&&c===a.c) || (r===b.r&&c===b.c)) continue;
          walls.add(k);
        }
        if(this.bfsReachable(cols, rows, walls, a, b)) return { a, b, walls };
      }
      return { a:{r:0,c:0}, b:{r:rows-1,c:cols-1}, walls:new Set() };
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
      localStorage.setItem(STORAGE_KEY, String(best));
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
      ${isDaily ? `<p class="daily-tag">DAILY — ${todayKey()} · ${DIFFICULTIES[activeDiffIndex].name}</p>` : ''}
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
    if(!isDaily) renderDiffPicker(document.getElementById('diffPickerEnd'));
    document.getElementById('retryBtn').addEventListener('click', ()=>{
      if(isDaily) renderStartOverlay(); else startRun();
    });
    if(isDaily){
      document.getElementById('shareDailyBtn').addEventListener('click', ()=>{
        copyDailyShareText(todaysDailyResult() || currentRunResultShape());
      });
    }
    document.getElementById('statsBtnEnd').addEventListener('click', ()=>{
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
        ${daily ? `<div class="daily-played">today's score: <b>${daily.score}</b> <span class="daily-diff-tag">(${daily.difficulty || DIFFICULTIES[diffIndex].name})</span></div>` : ''}
        <button class="arcade secondary" id="dailyBtn">${daily ? 'replay daily' : "play today's run"}</button>
        ${daily ? `<button class="arcade secondary" id="shareDailyBtnStart">share result</button>` : ''}
      </div>
      <button class="arcade secondary" id="statsBtnStart">per-game stats</button>
    `;
    overlay.classList.remove('hidden');
    renderDiffPicker(document.getElementById('diffPickerStart'));
    document.getElementById('startBtn').addEventListener('click', ()=> startRun());
    document.getElementById('dailyBtn').addEventListener('click', ()=> startRun({ daily:true }));
    if(daily){
      document.getElementById('shareDailyBtnStart').addEventListener('click', ()=>{
        copyDailyShareText(daily);
        const btn = document.getElementById('shareDailyBtnStart');
        if(btn) btn.textContent = 'copied!';
      });
    }
    document.getElementById('statsBtnStart').addEventListener('click', ()=>{
      renderStatsView(renderStartOverlay);
    });
  }

  function downloadStatsJson(){
    const payload = {
      exportedAt: new Date().toISOString(),
      best: best,
      difficulty: DIFFICULTIES[diffIndex].name,
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
    document.getElementById('statsBackBtn').addEventListener('click', backCb);
    document.getElementById('downloadStatsBtn').addEventListener('click', downloadStatsJson);
    document.getElementById('resetStatsBtn').addEventListener('click', ()=>{
      gameStats = {};
      try{ localStorage.removeItem(STATS_KEY); }catch(e){}
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
    }
    clearStage();
    if(win){
      setScore(score+1);
      speedMul = Math.min(DIFFICULTIES[activeDiffIndex].base + score*DIFFICULTIES[activeDiffIndex].growth, DIFFICULTIES[activeDiffIndex].maxSpeed);
      updateSpeedDisplay();
      streak++;
      let recovered = false;
      if(streak % streakForLife() === 0 && lives < maxLives){
        lives++;
        recovered = true;
      }
      renderLives(recovered);
      flashCabinet(recovered ? 'flash-win-double' : 'flash-win');
      timerbar.style.transition = 'none';
      timerbar.style.background = 'var(--go)';
      timerbar.style.transform = 'scaleX(1)';
      setTimeout(nextRound, 260);
    } else {
      streak = 0;
      lives--;
      renderLives();
      flashCabinet('flash-lose');
      timerbar.style.transition = 'none';
      timerbar.style.background = 'var(--danger)';
      timerbar.style.transform = 'scaleX(1)';
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
      timerbar.style.transition = 'none';
      timerbar.style.transform = 'scaleX(1)';
      timerbar.style.background = 'var(--flash)';
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
    try{ return JSON.parse(localStorage.getItem(DAILY_RESULT_KEY) || 'null'); }
    catch(e){ return null; }
  }
  function saveDailyResult(){
    const result = {
      date: todayKey(),
      score: score,
      difficulty: DIFFICULTIES[activeDiffIndex].name,
      pips: runHistory.map(e=>e.win),
      breakdown: buildRunBreakdown()
    };
    try{ localStorage.setItem(DAILY_RESULT_KEY, JSON.stringify(result)); }catch(e){}
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
    return {
      date: todayKey(),
      score: score,
      difficulty: DIFFICULTIES[activeDiffIndex].name,
      pips: runHistory.map(e=>e.win),
      breakdown: buildRunBreakdown()
    };
  }

  function dailyShareText(result){
    const pips = result.pips.map(w=>w?'🟩':'🟥').join('');
    const difficulty = result.difficulty || DIFFICULTIES[diffIndex].name;
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
      const btn = document.getElementById('shareDailyBtn') || document.getElementById('shareDailyBtnStart');
      if(btn) btn.textContent = ok ? 'copied!' : 'copy failed — see below';
      const fallback = document.getElementById('shareFallback');
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
    maxLives = DIFFICULTIES[activeDiffIndex].lives;
    lives = maxLives;
    streak = 0;
    runHistory = [];
    speedMul = DIFFICULTIES[activeDiffIndex].base;
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
    const musicToggle = document.getElementById('musicToggle');
    if(musicToggle){
      musicToggle.checked = musicEnabled;
      musicToggle.addEventListener('change', ()=> setMusicEnabled(musicToggle.checked));
    }
    const hotkeysToggle = document.getElementById('hotkeysToggle');
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
