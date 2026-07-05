(function(){
  "use strict";
  const MR = window.MR;
  const CATEGORY_START = MR.games.length;

  // MOTION / ARCADE -- grid-based retro-arcade riffs

  // ---------- GLOBAL MAZE/CHASE GRID SIZE ----------
  // Single source of truth for ESCAPE, FOG MAZE, MAZE-MUNCH, REVERSE MUNCH,
  // DOUBLE TROUBLE, and TORCH BLITZ (every grid game EXCEPT SNAKE, which
  // plays on its own bigger open board and stays independent below).
  // Bump these two numbers and every one of those six games resizes
  // together -- wall/hazard/dot counts already self-scale since they're all
  // derived from openCount = MAZE_COLS*MAZE_ROWS - walls.size, and
  // generateLayoutWithPoints' default point spacing already scales off
  // cols+rows. The one thing that does NOT auto-scale is anything tuned in
  // real-world seconds (round time limits, torch light-decay window) or in
  // fixed grid-cell units (TORCH BLITZ's minimum torch spacing) -- those are
  // multiplied by MAZE_SCALE below so a bigger board doesn't quietly get
  // harder (more ground to cover in the same old time).
  const MAZE_COLS = 9, MAZE_ROWS = 9;
  // baseline every timeLimit/litMs/minDist number below was originally
  // tuned at (7,7); this ratio keeps them proportionate at any other size
  const MAZE_SCALE = (MAZE_COLS + MAZE_ROWS) / 14;

  // Classic circle-with-a-wedge-missing Pac-Man shape, done as a single
  // div: border-radius:50% makes the box a circle, and clip-path carves
  // a triangular mouth out of its right side (the polygon traces the full
  // box but cuts in to the center between two points on the right edge —
  // intersected with the circular border-radius, that notch reads as a
  // mouth rather than a square bite). Facing defaults to right (0deg);
  // pass a dr/dc move direction to rotate the mouth to face it, same
  // convention as the grid's row/col deltas used elsewhere (dc=1 right,
  // dr=1 down, dc=-1 left, dr=-1 up).
  function makePacman(size, color, glowColor){
    return MR.makeEl('', {
      position: 'absolute', width: size+'px', height: size+'px', borderRadius: '50%',
      background: color, boxShadow: '0 0 10px ' + (glowColor || color),
      clipPath: 'polygon(100% 74%, 44% 48%, 100% 21%, 100% 0%, 0% 0%, 0% 100%, 100% 100%)',
      transition: 'left 90ms ease, top 90ms ease, transform 90ms ease'
    });
  }
  function pacmanFacing(dr, dc){
    if(dc===1) return 0;
    if(dr===1) return 90;
    if(dc===-1) return 180;
    if(dr===-1) return 270;
    return 0;
  }

  // ---------- SHARED GRID-GAME ENGINE ----------
  // Generalizes the maze/chase/collect/fog/torch skeleton that ESCAPE, FOG
  // MAZE, MAZE-MUNCH, REVERSE MUNCH, DOUBLE TROUBLE, and TORCH BLITZ each
  // hand-roll independently in their own start() bodies below — same shape
  // as buildAxisShooter in games-shooting.js: a single function reads a
  // cfg object and owns the layout/DOM/timers/win-lose wiring for the
  // round, while a per-game MR.games.push() entry only supplies numbers,
  // an entity map, and a couple of small callbacks.
  //
  // NOTE: infrastructure only, added for review before any of the six
  // games above are switched over to call it. Nothing here changes any
  // live game's behavior — every existing start() below still hand-rolls
  // its own version exactly as before.
  //
  // cfg:
  //   cols, rows              grid size
  //   layout(cols, rows)      optional custom layout function returning
  //                           { points, walls } (walls = Set of r*cols+c
  //                           keys). Defaults to calling
  //                           MR.generateLayoutWithPoints(cols, rows,
  //                           cfg.layoutOpts) — pass layoutOpts to tweak
  //                           pointCount/wallDensity/minDist/etc without
  //                           writing a custom layout function at all.
  //                           A game with placement needs beyond "N far-
  //                           apart reachable points plus walls" (e.g.
  //                           TORCH BLITZ's extra third torch and its
  //                           separate random start cell) supplies its own
  //                           layout() instead, built from the same public
  //                           MR.rand/MR.bfsReachable primitives.
  //   layoutOpts              forwarded to the default layout call above;
  //                           ignored if cfg.layout is given
  //   gap, margin             forwarded through makeEntityGrid to
  //                           makeCellGrid
  //   buildTypes(points, walls)
  //                           required. Returns the `types` map
  //                           makeEntityGrid expects (see its own doc
  //                           comment above) — the caller fully owns every
  //                           entity's definition, using `points` (whatever
  //                           cfg.layout/generateLayoutWithPoints produced)
  //                           to place them via each type's `at`.
  //   onWin(), onLose()       default straight through to ctx.onWin/
  //                           ctx.onLose; override if a game needs its own
  //                           bookkeeping first
  //   onAllCollected(name)    forwarded to makeEntityGrid as-is (e.g. MAZE-
  //                           MUNCH's "board cleared" win)
  //   fog: { typeName, radius }
  //                           turns on FOG MAZE-style visibility: one
  //                           opaque tile per cell (unseen / remembered /
  //                           lit, by Chebyshev distance from the named
  //                           type's single instance — default typeName
  //                           'player'), refreshed every time that entity
  //                           moves. Wraps that type's own onMove (if any)
  //                           rather than replacing it, so e.g. a pacman-
  //                           facing rotation and fog can coexist.
  //   flee: [{ typeName, targetTypeName, stepMs }, ...]
  //                           drives one or more entities that aren't any
  //                           of makeEntityGrid's built-in behaviors
  //                           (input/patrol/chase/pulse) — the mirror-the-
  //                           pursuit-step evasion REVERSE MUNCH and DOUBLE
  //                           TROUBLE both hand-roll today. Each entry
  //                           re-evaluates and takes one step every
  //                           stepMs (default scales with ctx.speedMul,
  //                           same floor/formula as those two games),
  //                           always moving directly away from
  //                           targetTypeName's current cell (default
  //                           targetTypeName 'player').
  //   torchWin: { typeName, litMs }
  //                           TORCH BLITZ's "light every instance of this
  //                           type at the same instant" win condition.
  //                           Wraps the named type's onContact to stamp
  //                           litUntil on touch, drives a decay loop that
  //                           reverts a torch's visual once its window
  //                           lapses, and calls onWin() the instant every
  //                           instance's litUntil is in the future at once.
  //                           litMs can be a number or a function of
  //                           ctx.speedMul. Assumes that type's
  //                           render.makeEl builds an element exposing
  //                           ._base/._bar/._fill, the same convention
  //                           TORCH BLITZ's own makeTorchEl uses.
  //
  // Returns { grid, entities, destroy() } — same shape makeEntityGrid
  // itself returns, so a caller can keep reaching into the live entities
  // after building, same as every game below already does with its own
  // entityGrid reference.
  function fleeStep(from, target, walls, cols, rows){
    const chase = MR.bfsNextStep(cols, rows, walls, from, target);
    if(chase.r===from.r && chase.c===from.c) return from;
    const mirror = { r: 2*from.r - chase.r, c: 2*from.c - chase.c };
    if(mirror.r>=0 && mirror.r<rows && mirror.c>=0 && mirror.c<cols && !walls.has(mirror.r*cols+mirror.c)){
      return mirror;
    }
    const neighbors = [[from.r-1,from.c],[from.r+1,from.c],[from.r,from.c-1],[from.r,from.c+1]]
      .filter(([r,c])=> r>=0&&r<rows && c>=0&&c<cols && !walls.has(r*cols+c));
    let best = null, bestDist = -1;
    for(const [r,c] of neighbors){
      if(r===chase.r && c===chase.c) continue;
      const d = Math.abs(r-target.r)+Math.abs(c-target.c);
      if(d>bestDist){ bestDist = d; best = { r, c }; }
    }
    return best || chase;
  }

  function buildGridGame(ctx, cfg){
    const cols = cfg.cols, rows = cfg.rows;
    const { points, walls } = cfg.layout ? cfg.layout(cols, rows) : MR.generateLayoutWithPoints(cols, rows, cfg.layoutOpts || {});
    const types = cfg.buildTypes(points, walls);

    let alive = true;

    // ---- fog-of-war (optional) ----
    // refreshFog is a plain reassignable var so the wrapped onMove below
    // (installed before the entity grid — and therefore the fog tiles —
    // exist yet) can safely close over it: by the time a player actually
    // moves and triggers a call, refreshFog has long since been assigned
    // the real implementation further down.
    let refreshFog = ()=>{};
    if(cfg.fog){
      const fogTypeName = cfg.fog.typeName || 'player';
      const def = types[fogTypeName];
      if(def){
        const prevOnMove = def.onMove;
        def.onMove = (e, dr, dc)=>{
          if(prevOnMove) prevOnMove(e, dr, dc);
          refreshFog();
        };
      }
    }

    // ---- torch-decay win condition (optional) ----
    // Same reasoning as fog above: onContact is installed on the type def
    // before makeEntityGrid (and therefore `entities`) exists, so the
    // handler below closes over the `entities` binding itself (assigned
    // after construction) rather than a snapshot of it.
    let entities = null;
    let torchLitMs = 0;
    if(cfg.torchWin){
      const typeName = cfg.torchWin.typeName;
      torchLitMs = typeof cfg.torchWin.litMs === 'function' ? cfg.torchWin.litMs(ctx.speedMul) : (cfg.torchWin.litMs || 3000);
      const def = types[typeName];
      if(def){
        def.onContact = (e)=>{
          e.litUntil = performance.now() + torchLitMs;
          if(e.el._base) MR.styleEl(e.el._base, { background: 'var(--flash)', boxShadow: '0 0 12px var(--flash)' });
          if(e.el._bar) e.el._bar.style.opacity = '1';
          // decay only ever shrinks how many torches are currently lit, so
          // the only moment the "all lit at once" snapshot can newly
          // become true is right when one is (re)lit
          if(alive && entities[typeName].every(other=> other.litUntil > performance.now())){
            alive = false;
            (cfg.onWin || ctx.onWin)();
          }
        };
      }
    }

    const entityGrid = MR.makeEntityGrid(cols, rows, {
      walls, gap: cfg.gap, margin: cfg.margin,
      onWin: cfg.onWin || ctx.onWin,
      onLose: cfg.onLose || ctx.onLose,
      onAllCollected: cfg.onAllCollected,
      types
    });
    const { grid } = entityGrid;
    entities = entityGrid.entities;

    // ---- fog-of-war setup (needs the grid/entities that now exist) ----
    if(cfg.fog){
      const fogTypeName = cfg.fog.typeName || 'player';
      const RADIUS = cfg.fog.radius != null ? cfg.fog.radius : 1;
      const { wrap, cellW, cellH, key } = grid;
      const fogEls = grid.cells.map(cd=>{
        const el = MR.makeEl('', {
          position: 'absolute', width: cellW+'px', height: cellH+'px',
          background: 'var(--bg)', opacity: '1', pointerEvents: 'none',
          transition: 'opacity 220ms ease'
        });
        wrap.appendChild(el);
        grid.placeCell(el, cd.r, cd.c);
        return el;
      });
      const seen = new Set();
      refreshFog = function(){
        const p = entities[fogTypeName] && entities[fogTypeName][0];
        if(!p) return;
        for(let r=0;r<rows;r++){
          for(let c=0;c<cols;c++){
            const k = key(r,c);
            const inRadius = Math.max(Math.abs(r-p.r), Math.abs(c-p.c)) <= RADIUS;
            if(inRadius) seen.add(k);
            fogEls[k].style.opacity = inRadius ? '0' : (seen.has(k) ? '0.78' : '1');
          }
        }
      };
      refreshFog();
    }

    // ---- torch decay loop (needs `entities` for the same reason) ----
    let torchRaf = null;
    if(cfg.torchWin){
      const typeName = cfg.torchWin.typeName;
      entities[typeName].forEach(e=>{ e.litUntil = 0; });
      function torchLoop(t){
        if(!alive) return;
        entities[typeName].forEach(e=>{
          const remain = e.litUntil - t;
          if(remain <= 0){
            if(e.el._bar && e.el._bar.style.opacity !== '0'){
              e.el._bar.style.opacity = '0';
              MR.styleEl(e.el._base, { background: 'var(--bezel)', boxShadow: 'inset 0 0 0 2px rgba(242,240,234,0.15)' });
            }
          } else if(e.el._fill){
            e.el._fill.style.width = (Math.max(0, Math.min(1, remain / torchLitMs)) * 100) + '%';
          }
        });
        torchRaf = requestAnimationFrame(torchLoop);
      }
      torchRaf = requestAnimationFrame(torchLoop);
    }

    // ---- manually-driven "flee" entities (optional) ----
    const fleeTimers = (cfg.flee || []).map(spec=>{
      const typeName = spec.typeName;
      const targetTypeName = spec.targetTypeName || 'player';
      const stepMs = spec.stepMs != null ? spec.stepMs : Math.max(230, 480/ctx.speedMul);
      return setInterval(()=>{
        if(!alive) return;
        const prey = entities[typeName] && entities[typeName][0];
        const target = entities[targetTypeName] && entities[targetTypeName][0];
        if(!prey || !target) return; // round already won/lost/cleaned up
        const next = fleeStep({r:prey.r,c:prey.c}, {r:target.r,c:target.c}, walls, cols, rows);
        if(next.r!==prey.r || next.c!==prey.c){
          prey.r = next.r; prey.c = next.c;
          grid.placeCenter(prey.el, next.r, next.c);
        }
      }, stepMs);
    });

    function destroy(){
      alive = false;
      fleeTimers.forEach(t=> clearInterval(t));
      if(torchRaf) cancelAnimationFrame(torchRaf);
      entityGrid.destroy();
    }
    ctx.onCleanup = destroy;

    return { grid, entities, destroy };
  }


  MR.games.push({
    label: 'ESCAPE',
    desc: 'Navigate the grid from start to the flag before time runs out. Walls block the way — a few cells also flare into fire on their own cycle, so time your crossing.',
    word: 'REACH THE FLAG',
    timeLimit: s => (6000*MAZE_SCALE)/s,
    start(ctx){
      const COLS = MAZE_COLS, ROWS = MAZE_ROWS;
      buildGridGame(ctx, {
        cols: COLS, rows: ROWS,
        layoutOpts: { pointCount: 2, wallDensity: 0.28 },
        buildTypes([start, target], walls){
          // fire hazard count scales with open floor space, same formula as
          // before; makeEntityGrid places them on random open cells itself
          // (excluding start/target automatically, since those are claimed
          // first below)
          const openCount = COLS*ROWS - walls.size;
          const fireCount = Math.min(3, Math.max(1, Math.floor(openCount/6)));
          return {
            // insertion order matters: player/target claim their exact
            // cells first, so the count-based fire type can't land on top
            // of them
            player: {
              isPlayer: true, at: [start], behavior: 'input',
              render: { shape: 'circle', color: 'var(--go)' }
            },
            target: {
              static: true, at: [target], onContact: 'win',
              render: { shape: 'square', color: 'var(--flash)' }
            },
            // pulses between safe and unsafe on its own randomly offset
            // cycle; never permanently blocks the path (solvability is
            // guaranteed by the walls alone) — it just makes you wait out
            // a safe window before crossing
            fire: {
              static: true, count: fireCount, behavior: 'pulse',
              pulsePeriod: 1800, pulseUnsafe: 700, onContact: 'lose',
              render: { fillCell: true, color: 'var(--danger)' }
            }
          };
        }
      });
    }
  });


  MR.games.push({
    label: 'FOG MAZE',
    desc: 'The same kind of maze as ESCAPE, but the lights are out — only cells near you are lit. Feel your way to the flag before time runs out.',
    word: 'FIND THE WAY',
    timeLimit: s => (8000*MAZE_SCALE)/s,
    start(ctx){
      const COLS = MAZE_COLS, ROWS = MAZE_ROWS;
      buildGridGame(ctx, {
        cols: COLS, rows: ROWS,
        gap: 5,
        // exact same layout generator as ESCAPE — only the rendering differs
        layoutOpts: { pointCount: 2, wallDensity: 0.24 },
        fog: { typeName: 'player', radius: 1 }, // Chebyshev radius kept lit around the player
        buildTypes([start, target]){
          return {
            // insertion order matters: player/target claim their exact
            // cells first, same as ESCAPE
            player: {
              isPlayer: true, at: [start], behavior: 'input',
              render: { shape: 'circle', color: 'var(--go)' }
            },
            target: {
              static: true, at: [target], onContact: 'win',
              render: { shape: 'square', color: 'var(--flash)' }
            }
          };
        }
        // fog hides whether a cell is a wall until it's been seen, but
        // that's fine here — walking blind into an unseen wall is exactly
        // the risk this mode is built around, and makeEntityGrid's own
        // tryMoveTo already blocks the step the instant it knows it's
        // blocked
      });
    }
  });


  MR.games.push({
    label: 'MAZE-MUNCH',
    desc: 'Pac-style chase — steer the muncher through the maze, gobble every dot, and stay out of the ghost\'s reach. Arrow keys or tap an adjacent open cell to move.',
    word: 'CHOMP!',
    timeLimit: s => (8000*MAZE_SCALE)/s,
    start(ctx){
      const COLS = MAZE_COLS, ROWS = MAZE_ROWS;
      // ghost re-pathfinds and takes one step every stepMs — shortens with
      // speedMul so later, faster rounds hunt harder
      const ghostStepMs = Math.max(230, 480/ctx.speedMul);
      buildGridGame(ctx, {
        cols: COLS, rows: ROWS, gap: 5,
        layoutOpts: { pointCount: 2, wallDensity: 0.2 },
        // clearing the board before the ghost catches you = win; timing
        // out with dots still up (or getting caught) both fall through to
        // a loss, handled by the engine's own round timeout
        onAllCollected: ()=> ctx.onWin(),
        buildTypes([start, ghostStart], walls){
          // scatter a handful of dots rather than one on every open cell —
          // keeps a round clearable inside the timer instead of demanding a
          // full-board sweep. makeEntityGrid places them on random open
          // cells itself, excluding start/ghostStart automatically since
          // those are claimed first below.
          const openCount = COLS*ROWS - walls.size;
          const dotCount = Math.max(3, Math.min(4, openCount - 2));
          return {
            // insertion order matters: player/ghost claim their exact
            // cells first, so the count-based dots type can't land on
            // top of them
            player: {
              isPlayer: true, at: [start], behavior: 'input',
              onMove: (e, dr, dc)=>{ e.el.style.transform = 'rotate(' + pacmanFacing(dr, dc) + 'deg)'; },
              render: { makeEl: (cellW)=> makePacman(cellW*0.55, 'var(--go)') }
            },
            ghost: {
              at: [ghostStart], behavior: 'chase', stepMs: ghostStepMs, onContact: 'lose',
              render: { color: 'var(--danger)', size: 0.6, transition: 'left 240ms linear, top 240ms linear',
                styles: { borderRadius: '50% 50% 10% 10%' } }
            },
            dots: {
              count: dotCount, onContact: 'collect',
              render: { inCell: true, size: 0.24, color: 'var(--flash)' }
            }
          };
        }
      });
    }
  });


  MR.games.push({
    label: 'REVERSE MUNCH',
    desc: 'MAZE-MUNCH in reverse — you\'re the ghost now. Corner the fleeing dot before time runs out. Arrow keys or tap an adjacent open cell to move.',
    word: 'GET IT!',
    timeLimit: s => (8000*MAZE_SCALE)/s,
    start(ctx){
      const COLS = MAZE_COLS, ROWS = MAZE_ROWS;
      buildGridGame(ctx, {
        cols: COLS, rows: ROWS, gap: 5,
        // same solvable start/prey placement as MAZE-MUNCH's start/ghostStart
        layoutOpts: { pointCount: 2, wallDensity: 0.2 },
        // fleeStep isn't one of makeEntityGrid's built-in behaviors (input/
        // patrol/chase/pulse), so the prey is placed as a plain entity with
        // no `behavior` — buildGridGame's own flee driver moves it instead,
        // re-evaluating and taking one step every stepMs (shortens with
        // speedMul so later, faster rounds are harder to corner, same
        // floor/formula as before). The shared per-frame contact check
        // still catches the catch the moment the prey lands on the
        // player, same as onContact:'win' does for any other type.
        flee: [{ typeName: 'prey', targetTypeName: 'player', stepMs: Math.max(230, 480/ctx.speedMul) }],
        buildTypes([start, preyStart]){
          return {
            // you're styled as the ghost this time; the prey gets the old
            // pac-dot look so the role-swap reads at a glance
            player: {
              isPlayer: true, at: [start], behavior: 'input',
              render: { shape: 'square', color: 'var(--go)', size: 0.6, styles: { borderRadius: '50% 50% 10% 10%' } }
            },
            prey: {
              at: [preyStart], onContact: 'win',
              render: { shape: 'circle', color: 'var(--life)', transition: 'left 220ms linear, top 220ms linear' }
            }
          };
        }
      });
      // catching the prey before the buzzer = win; timing out = loss
    }
  });


  MR.games.push({
    label: 'DOUBLE TROUBLE',
    desc: 'MAZE-MUNCH and REVERSE MUNCH at once — a ghost hunts you while a dot flees from you. Corner the dot before the ghost corners you.',
    word: 'DOUBLE TROUBLE!',
    timeLimit: s => (8000*MAZE_SCALE)/s,
    start(ctx){
      const COLS = MAZE_COLS, ROWS = MAZE_ROWS;
      // ghost hunts the player via makeEntityGrid's built-in 'chase'
      // behavior — the same bfsNextStep chase MAZE-MUNCH's ghost uses.
      // The dot uses buildGridGame's `flee` driver at the same cadence —
      // two threats, one on makeEntityGrid's built-in chase, the other on
      // the shared mirror-step evasion, nothing new to write for either AI.
      const ghostStepMs = Math.max(230, 480/ctx.speedMul);
      buildGridGame(ctx, {
        cols: COLS, rows: ROWS, gap: 5,
        // same generator as MAZE-MUNCH gives us player-start + ghost-start
        // (and the walls) with the usual solvability guarantee between them
        layoutOpts: { pointCount: 2, wallDensity: 0.18 },
        flee: [{ typeName: 'prey', targetTypeName: 'player', stepMs: ghostStepMs }],
        buildTypes([start, ghostStart], walls){
          // third point — the fleeing dot — just needs to be some open
          // cell reachable from the player's start that isn't already the
          // ghost's or the player's; reuses bfsReachable rather than a
          // new generator, and falls back to any open cell if nothing
          // better turns up
          function pickPreyStart(){
            let fallback = null;
            for(let i=0;i<40;i++){
              const r = Math.floor(MR.rand(0,ROWS)), c = Math.floor(MR.rand(0,COLS));
              if(walls.has(r*COLS+c)) continue;
              if((r===start.r&&c===start.c) || (r===ghostStart.r&&c===ghostStart.c)) continue;
              if(!fallback) fallback = { r, c };
              if(MR.bfsReachable(COLS, ROWS, walls, start, { r, c })) return { r, c };
            }
            return fallback || { r: start.r, c: start.c };
          }
          const preyStart = pickPreyStart();
          return {
            player: {
              isPlayer: true, at: [start], behavior: 'input',
              onMove: (e, dr, dc)=>{ e.el.style.transform = 'rotate(' + pacmanFacing(dr, dc) + 'deg)'; },
              render: { makeEl: (cellW)=> makePacman(cellW*0.55, 'var(--go)') }
            },
            ghost: {
              at: [ghostStart], behavior: 'chase', stepMs: ghostStepMs, onContact: 'lose',
              render: { color: 'var(--danger)', size: 0.6, transition: 'left 240ms linear, top 240ms linear',
                styles: { borderRadius: '50% 50% 10% 10%' } }
            },
            prey: {
              at: [preyStart], onContact: 'win',
              render: { shape: 'circle', color: 'var(--flash)', transition: 'left 220ms linear, top 220ms linear' }
            }
          };
        }
      });
      // catching the prey before the ghost catches you (or the buzzer)
      // = win; getting caught, or timing out, is a loss
    }
  });


  MR.games.push({
    label: 'TORCH BLITZ',
    // Same grid/wall/movement skeleton as ESCAPE and FOG MAZE — walls
    // now come from generateLayoutWithPoints via makeEntityGrid — but its
    // two guaranteed-far-apart points become two of three torches instead
    // of a start/target pair; a third point is picked on the same wall
    // layout via a small local helper built from two already-public
    // primitives (MR.rand, MR.bfsReachable), so no engine change was
    // needed to go from 2 torches to 3. Touching a torch lights it for
    // LIT_MS, and it goes dark again if it isn't retouched before that
    // runs out. Getting ALL THREE lit at the same instant is an immediate
    // win — buildGridGame's torchWin option owns that check (since decay
    // can only ever shrink the lit set, never grow it, it re-checks
    // whenever a torch is (re)lit) — a routing puzzle under a decay clock
    // rather than a single-target maze walk. Round length is fixed
    // regardless of speedMul, same reasoning as SHMUP/INVADERS/TURRET
    // SIEGE: difficulty comes from LIT_MS shrinking, not from squeezing
    // the clock on top of that.
    desc: 'Three unlit torches sit in a walled ' + MAZE_COLS + '\u00d7' + MAZE_ROWS + ' room, spread far apart. Step onto one to light it \u2014 it stays lit for a few seconds, then goes dark again unless you touch it again. Light ALL THREE at the same time to win. Arrow keys or tap an adjacent open cell to move.',
    word: 'LIGHT THEM!',
    // fixed round length (scaled with board size) \u2014 a bit more slack than
    // the 2-torch version since a 3-point circuit is a longer trip; the
    // real pressure is LIT_MS.
    timeLimit: s => 8000*MAZE_SCALE,
    start(ctx){
      const COLS = MAZE_COLS, ROWS = MAZE_ROWS;

      // each torch: a base tile (dark unlit / flash-colored lit) plus a
      // small decay bar that drains over LIT_MS — same "shrinking bar
      // reads as time pressure" idea as the round's own timer bar, just
      // scoped to one cell. Built as a single custom element (rather than
      // one of makeEntityGrid's plain shapes) and pinned to its cell via
      // fillCell, same trick ESCAPE's fire hazards use. buildGridGame's
      // torchWin decay loop expects exactly this ._base/._bar/._fill shape.
      function makeTorchEl(){
        const holder = MR.makeEl('', { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' });
        const base = MR.makeEl('', { position: 'absolute', left: '22%', top: '22%', width: '56%', height: '56%', borderRadius: '8px 8px 4px 4px', background: 'var(--bezel)', boxShadow: 'inset 0 0 0 2px rgba(242,240,234,0.15)', transition: 'background 120ms ease, box-shadow 120ms ease' });
        const bar = MR.makeEl('', { position: 'absolute', left: '18%', top: '10%', width: '64%', height: '9%', background: 'rgba(242,240,234,0.15)', borderRadius: '3px', overflow: 'hidden', opacity: '0', transition: 'opacity 120ms ease' });
        const fill = MR.makeEl('', { position: 'absolute', left: '0', top: '0', width: '0%', height: '100%', background: 'var(--flash)' });
        bar.appendChild(fill);
        holder.appendChild(base);
        holder.appendChild(bar);
        holder._base = base; holder._bar = bar; holder._fill = fill;
        return holder;
      }

      buildGridGame(ctx, {
        cols: COLS, rows: ROWS, gap: 6,
        // reuses the same far-apart-points-plus-walls generator as ESCAPE/
        // MAZE-MUNCH for two of the three torches, then adds a third torch
        // on the same wall layout — scoped to "reachable and far from
        // every torch we've already placed" instead of a single pair,
        // built entirely from MR.rand/MR.bfsReachable. Falls back to a
        // looser reachable-only search, then to the first torch's own
        // cell, so a round can never soft-lock even in a heavily-walled
        // corner case.
        layout(cols, rows){
          const { points, walls } = MR.generateLayoutWithPoints(cols, rows, { pointCount: 2, wallDensity: 0.22 });
          const torchPoints = points.slice();
          function pickExtraTorch(minDist){
            for(let tries=0; tries<200; tries++){
              const r = Math.floor(MR.rand(0,rows)), c = Math.floor(MR.rand(0,cols));
              if(walls.has(r*cols+c)) continue;
              if(torchPoints.some(p=> p.r===r && p.c===c)) continue;
              if(torchPoints.every(p=> Math.abs(p.r-r)+Math.abs(p.c-c) >= minDist) && MR.bfsReachable(cols, rows, walls, torchPoints[0], {r,c})){
                return {r,c};
              }
            }
            for(let tries=0; tries<200; tries++){
              const r = Math.floor(MR.rand(0,rows)), c = Math.floor(MR.rand(0,cols));
              if(walls.has(r*cols+c)) continue;
              if(torchPoints.some(p=> p.r===r && p.c===c)) continue;
              if(MR.bfsReachable(cols, rows, walls, torchPoints[0], {r,c})) return {r,c};
            }
            return { r:torchPoints[0].r, c:torchPoints[0].c };
          }
          torchPoints.push(pickExtraTorch(Math.round(4*MAZE_SCALE)));
          return { points: torchPoints, walls };
        },
        // decay window shrinks with speedMul, floored so it never becomes
        // physically impossible to cross the room in time; bumped up from
        // the 2-torch version since the circuit is longer now
        torchWin: { typeName: 'torch', litMs: speedMul => Math.max(2600*MAZE_SCALE, (5200*MAZE_SCALE) / speedMul) },
        buildTypes(torchPoints, walls){
          // player starts on a random open cell that isn't a wall or any
          // torch, so the round always opens with genuine trips to make
          let startCell = null;
          for(let tries=0; tries<200; tries++){
            const r = Math.floor(MR.rand(0,ROWS)), c = Math.floor(MR.rand(0,COLS));
            const k = r*COLS+c;
            if(walls.has(k) || torchPoints.some(p=> p.r*COLS+p.c===k)) continue;
            startCell = { r, c }; break;
          }
          if(!startCell) startCell = { r: Math.floor(ROWS/2), c: Math.floor(COLS/2) };
          return {
            player: {
              isPlayer: true, at: [startCell], behavior: 'input',
              render: { shape: 'circle', color: 'var(--go)' }
            },
            torch: {
              static: true, at: torchPoints,
              render: { makeEl: ()=> makeTorchEl(), fillCell: true }
            }
          };
        }
      });
      // no snapshot yet — reaching the round timeout without ever getting
      // all three torches lit at once is a loss, same shape as SNAKE's
      // stopIsWin (false until the qualifying moment happens)
    }
  });


  MR.games.push({
    label: 'SNAKE',
    desc: 'Classic slither — arrow keys or tap a direction relative to your head to steer. Eat at least one fruit and survive to the buzzer; touching poison, a wall, or your own tail is an instant loss.',
    word: 'SSSLITHER',
    timeLimit: s => 4000/s,
    // Migrated onto the shared grid-game engine. Two simplifications make
    // this fit buildGridGame cleanly: the body is a fixed 3 segments (it
    // never grows on eating), and the fruit/poison are a one-shot set —
    // eaten or not, nothing respawns mid-round. That leaves only two
    // bespoke pieces buildGridGame doesn't already do for any other game:
    // tick-driven body-follow movement (instead of one bump per keypress)
    // and a self-collision check — everything else (board, pellets,
    // win/lose-on-touch) is just buildTypes()/onContact like any other
    // game on this engine.
    start(ctx){
      const COLS = 12, ROWS = 12;
      const startR = Math.floor(ROWS/2), startC = Math.floor(COLS/3);

      let liveEntities = null;
      let fruitsEaten = 0;

      const gg = buildGridGame(ctx, {
        cols: COLS, rows: ROWS, gap: 0, margin: 30,
        // SNAKE plays on an open board — no walls, so no generated layout
        // points are needed either; the body/pellets below place
        // themselves via `at`/`count` instead
        layout(){ return { points: [], walls: new Set() }; },
        buildTypes(){
          return {
            // three explicit cells, head-first: entities.player[0] is the
            // one the shared engine actually tracks for movement/contact
            // (see makeEntityGrid's resolveContacts), so it MUST stay the
            // head — the other two just ride along visually and get
            // repositioned by hand every tick below. Listing all three
            // here (rather than just the head) also reserves the
            // starting mid/tail cells before the count-based pellets get
            // placed, same as any other buildTypes insertion-order claim.
            player: {
              isPlayer: true,
              at: [
                { r: startR, c: startC   },
                { r: startR, c: startC-1 },
                { r: startR, c: startC-2 }
              ],
              render: { shape: 'square', color: 'var(--go)', size: 0.86 }
            },
            // fixed set, never replenished — an instant loss on touch
            poison: {
              count: 3, onContact: 'lose',
              render: { shape: 'circle', color: 'var(--danger)', size: 0.5 }
            },
            // fixed set too; eating even one is enough to flip a clean
            // timeout into a win (ctx.stopIsWin), same rule as before —
            // it just never spawns a replacement once gone
            fruit: {
              count: 3,
              onContact: (e)=>{
                e.el.remove();
                const arr = liveEntities && liveEntities.fruit;
                if(arr){ const i = arr.indexOf(e); if(i>=0) arr.splice(i,1); }
                fruitsEaten++;
                ctx.stopIsWin = true;
              },
              render: { shape: 'circle', color: 'var(--flash)', size: 0.5 }
            }
          };
        }
      });
      const { grid } = gg;
      liveEntities = gg.entities;

      // head/mid/tail elements, in that fixed order (matches the `at`
      // list above) — head keeps an extra glow so it still reads as the
      // "front" of the snake, same as the old hand-rolled version
      const segEls = liveEntities.player.map(e=> e.el);
      const headEntity = liveEntities.player[0];
      MR.styleEl(segEls[0], { boxShadow: '0 0 8px var(--go)' });
      MR.styleEl(segEls[1], { opacity: '0.82' });
      MR.styleEl(segEls[2], { opacity: '0.82' });

      // the shared engine also wires click-on-an-adjacent-cell as a move
      // (for the maze-style games) — SNAKE steers by tap direction
      // instead (see onPointerDown below), so that click path needs to
      // stay silent here. Capturing the click before it reaches any
      // individual cell's own listener does that without touching the
      // engine itself.
      grid.wrap.addEventListener('click', (e)=> e.stopPropagation(), true);

      // segments kept tail -> head, same convention as the old version;
      // fixed length, so every tick shifts one off the tail and pushes
      // one onto the head — never grows, regardless of fruit
      let segments = [
        { r:startR, c:startC-2 },
        { r:startR, c:startC-1 },
        { r:startR, c:startC   }
      ];
      const occupied = new Set(segments.map(s=> s.r*COLS+s.c));

      let dir = { dr:0, dc:1 };
      let pendingDir = dir;
      function applyDir(d){
        // block reversing straight into your own neck
        if(d.dr===-dir.dr && d.dc===-dir.dc) return;
        pendingDir = d;
      }
      MR.setKeyHandler((e)=>{
        const d = { ArrowLeft:{dr:0,dc:-1}, ArrowRight:{dr:0,dc:1}, ArrowUp:{dr:-1,dc:0}, ArrowDown:{dr:1,dc:0} }[e.key];
        if(d) applyDir(d);
      });

      // touch/mouse: tap anywhere and steer toward that point relative to
      // the current head, picking whichever axis has the bigger offset —
      // no swipe-gesture tracking needed, just "aim where you tapped"
      function onPointerDown(e){
        const r = grid.wrap.getBoundingClientRect();
        const tapX = e.clientX - r.left, tapY = e.clientY - r.top;
        const head = segments[segments.length-1];
        const headX = head.c*grid.cellW + grid.cellW/2, headY = head.r*grid.cellH + grid.cellH/2;
        const ddx = tapX-headX, ddy = tapY-headY;
        if(Math.abs(ddx) > Math.abs(ddy)) applyDir({ dr:0, dc: ddx>0?1:-1 });
        else applyDir({ dr: ddy>0?1:-1, dc:0 });
      }
      MR.stage.addEventListener('pointerdown', onPointerDown);

      const moveEvery = Math.max(200, 200/ctx.speedMul);
      let acc = 0;
      let lastT = performance.now();
      let alive = true;

      function tick(){
        dir = pendingDir;
        const head = segments[segments.length-1];
        const nr = head.r+dir.dr, nc = head.c+dir.dc;
        if(nr<0||nr>=ROWS||nc<0||nc>=COLS){ alive=false; ctx.onLose(); return; }
        const nk = nr*COLS+nc;
        const tail = segments[0];
        const vacatedKey = tail.r*COLS+tail.c;
        if(occupied.has(nk) && nk!==vacatedKey){ alive=false; ctx.onLose(); return; }

        segments.shift();
        occupied.delete(vacatedKey);
        segments.push({ r:nr, c:nc });
        occupied.add(nk);

        // reposition the 3 existing elements onto the new segment cells
        // instead of creating/removing DOM each tick — segEls[0] is also
        // the element the shared engine contact-checks (via headEntity),
        // so it's the one that MUST land exactly on the new head cell
        grid.placeCenter(segEls[0], nr, nc);
        headEntity.r = nr; headEntity.c = nc;
        grid.placeCenter(segEls[1], segments[1].r, segments[1].c);
        grid.placeCenter(segEls[2], segments[0].r, segments[0].c);
      }

      function loop(t){
        if(!alive) return;
        const dt = t-lastT; lastT = t;
        acc += dt;
        while(acc >= moveEvery && alive){
          acc -= moveEvery;
          tick();
        }
        if(alive) MR.rafId = requestAnimationFrame(loop);
      }
      MR.rafId = requestAnimationFrame(loop);

      ctx.onCleanup = ()=>{
        alive = false;
        if(MR.rafId) cancelAnimationFrame(MR.rafId);
        MR.stage.removeEventListener('pointerdown', onPointerDown);
        gg.destroy();
      };
      // no fruit eaten yet — reaching the round timer without one is a
      // loss, flipped to a win the moment the first fruit lands (see the
      // fruit onContact above)
      ctx.stopIsWin = false;
    }
  });


  for(let i=CATEGORY_START;i<MR.games.length;i++) MR.games[i].category = 'motion-arcade';

})();
