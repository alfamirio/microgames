(function(){
  "use strict";
  const MR = window.MR;
  const CATEGORY_START = MR.games.length;

  // MOTION / ARCADE -- grid-based retro-arcade riffs

  MR.games.push({
    label: 'BULLET HELL',
    desc: 'Bullet hell — steer the dot away from everything onscreen. Arrow keys for free movement, or drag it directly with mouse/finger.',
    word: 'DODGE!',
    timeLimit: s => 5200/s,
    start(ctx){
      const w = MR.screen.clientWidth - 26, h = MR.screen.clientHeight - 26;
      const playerR = 10, bulletR = 5;
      let px = w/2, py = h/2;

      const player = MR.makeEl('dot', { width: (playerR*2)+'px', height: (playerR*2)+'px', background: 'var(--go)', boxShadow: '0 0 10px var(--go)', touchAction: 'none' });
      MR.stage.appendChild(player);

      function placePlayer(){
        MR.styleEl(player, { left: (px-playerR)+'px', top: (py-playerR)+'px' });
      }
      placePlayer();

      const STEP = 26;
      function move(dx, dy){
        px = Math.max(playerR, Math.min(w-playerR, px+dx));
        py = Math.max(playerR, Math.min(h-playerR, py+dy));
        placePlayer();
      }
      MR.setKeyHandler((e)=>{
        if(e.key==='ArrowLeft') move(-STEP, 0);
        if(e.key==='ArrowRight') move(STEP, 0);
        if(e.key==='ArrowUp') move(0, -STEP);
        if(e.key==='ArrowDown') move(0, STEP);
      });

      // drag the dot directly, for touch/mouse — works from anywhere on
      // the stage, not just the dot itself, since a bullet-hell field
      // makes precisely grabbing a 20px target under fire unreasonable
      let dragging = false;
      const capture = MR.pointerCaptureTracker(MR.stage);
      function onPointerDown(e){
        dragging = true;
        capture.onDown(e);
        const p = MR.pointerPos(e);
        px = Math.max(playerR, Math.min(w-playerR, p.x));
        py = Math.max(playerR, Math.min(h-playerR, p.y));
        placePlayer();
      }
      function onPointerMove(e){
        if(!dragging) return;
        const p = MR.pointerPos(e);
        px = Math.max(playerR, Math.min(w-playerR, p.x));
        py = Math.max(playerR, Math.min(h-playerR, p.y));
        placePlayer();
      }
      function onPointerUp(e){
        dragging = false;
        capture.onUp(e);
      }
      MR.stage.addEventListener('pointerdown', onPointerDown);
      MR.stage.addEventListener('pointermove', onPointerMove);
      MR.stage.addEventListener('pointerup', onPointerUp);
      MR.stage.addEventListener('pointercancel', onPointerUp);

      const bullets = [];
      let alive = true;
      let elapsed = 0;

      function spawnBullet(x, y, vx, vy, color){
        const el = MR.makeEl('dot', { width: (bulletR*2)+'px', height: (bulletR*2)+'px', background: color || 'var(--danger)', left: (x-bulletR)+'px', top: (y-bulletR)+'px' });
        MR.stage.appendChild(el);
        bullets.push({ el, x, y, vx, vy });
      }

      // stream of bullets fired in from random edges, generally aimed
      // toward the far side of the field so they actually cross it
      let sinceStream = 0;
      const streamEvery = () => Math.max(90, 300 - elapsed*0.012) / ctx.speedMul;
      function spawnStreamBullet(){
        const speed = (0.16 + MR.rand(0,0.06)) * ctx.speedMul;
        const side = Math.floor(MR.rand(0,4));
        let x,y,tx,ty;
        if(side===0){ x=MR.rand(0,w); y=-bulletR; tx=MR.rand(0,w); ty=h; }
        else if(side===1){ x=MR.rand(0,w); y=h+bulletR; tx=MR.rand(0,w); ty=0; }
        else if(side===2){ x=-bulletR; y=MR.rand(0,h); tx=w; ty=MR.rand(0,h); }
        else { x=w+bulletR; y=MR.rand(0,h); tx=0; ty=MR.rand(0,h); }
        const ang = Math.atan2(ty-y, tx-x);
        spawnBullet(x, y, Math.cos(ang)*speed, Math.sin(ang)*speed);
      }

      // periodic radial bursts from a random point, for the classic
      // "ring expanding outward" bullet-hell beat
      let sinceBurst = 0;
      const burstEvery = 1650;
      function spawnBurst(){
        const bx = MR.rand(w*0.25, w*0.75);
        const by = MR.rand(h*0.25, h*0.75);
        const count = 10;
        const speed = 0.15 * ctx.speedMul;
        const offset = MR.rand(0, Math.PI*2);
        for(let i=0;i<count;i++){
          const ang = offset + (i/count)*Math.PI*2;
          spawnBullet(bx, by, Math.cos(ang)*speed, Math.sin(ang)*speed, 'var(--flash)');
        }
      }

      let lastT = performance.now();
      function loop(t){
        if(!alive) return;
        const dt = t-lastT; lastT = t;
        elapsed += dt;

        sinceStream += dt;
        const need = streamEvery();
        while(sinceStream > need){ sinceStream -= need; spawnStreamBullet(); }

        sinceBurst += dt;
        if(sinceBurst > burstEvery / ctx.speedMul){ sinceBurst = 0; spawnBurst(); }

        for(const b of bullets){
          b.x += b.vx*dt; b.y += b.vy*dt;
          b.el.style.left = (b.x-bulletR)+'px';
          b.el.style.top = (b.y-bulletR)+'px';
        }

        for(const b of bullets){
          const dist = Math.hypot(b.x-px, b.y-py);
          if(dist < playerR+bulletR){ alive=false; ctx.onLose(); return; }
        }

        for(let i=bullets.length-1;i>=0;i--){
          const b = bullets[i];
          if(b.x < -30 || b.x > w+30 || b.y < -30 || b.y > h+30){
            b.el.remove(); bullets.splice(i,1);
          }
        }
        MR.rafId = requestAnimationFrame(loop);
      }
      MR.rafId = requestAnimationFrame(loop);
      ctx.onCleanup = ()=>{
        alive = false;
        if(MR.rafId) cancelAnimationFrame(MR.rafId);
        MR.stage.removeEventListener('pointerdown', onPointerDown);
        MR.stage.removeEventListener('pointermove', onPointerMove);
        MR.stage.removeEventListener('pointerup', onPointerUp);
        MR.stage.removeEventListener('pointercancel', onPointerUp);
        // Round can end (timeout, or onLose from the rAF loop hitting a
        // bullet) while the pointer is still physically down — release()
        // covers that even though neither pointerup nor pointercancel
        // fired to reach onPointerUp above.
        capture.release();
      };
      // survive the whole round = win, handled by engine timeout
      ctx.survivalGame = true;
    }
  });


  MR.games.push({
    label: 'ESCAPE',
    desc: 'Navigate the grid from start to the flag before time runs out. Walls block the way.',
    word: 'REACH THE FLAG',
    timeLimit: s => 5000/s,
    start(ctx){
      const COLS = 6, ROWS = 6;
      const GAP = 6;

      // a = start, b = target — same wallDensity/BFS-retry guarantee this
      // game used before, now shared with MAZE-MUNCH via generateSolvableLayout
      const { a: start, b: target, walls } = MR.generateSolvableLayout(COLS, ROWS, { wallDensity: 0.28 });
      let pr = start.r, pc = start.c;
      let alive = true;

      function tryMoveTo(r,c){
        if(!alive) return;
        if(r<0||r>=ROWS||c<0||c>=COLS) return;
        if(walls.has(grid.key(r,c))) return;
        // only step to orthogonally adjacent cells — no teleporting through walls
        if(Math.abs(r-pr)+Math.abs(c-pc) !== 1) return;
        pr = r; pc = c;
        grid.placeCenter(player, pr, pc);
        if(pr===target.r && pc===target.c){
          alive = false;
          ctx.onWin();
        }
      }
      function move(dr,dc){ tryMoveTo(pr+dr, pc+dc); }

      const grid = MR.makeCellGrid(COLS, ROWS, { gap: GAP, onCellClick: (r,c)=> tryMoveTo(r,c) });
      const { wrap, cellW, cellH } = grid;

      grid.cells.forEach(cd=>{
        if(walls.has(grid.key(cd.r,cd.c))){
          cd.el.style.background = 'repeating-linear-gradient(45deg, var(--bezel), var(--bezel) 6px, rgba(0,0,0,0.35) 6px, rgba(0,0,0,0.35) 12px)';
        } else {
          cd.el.style.cursor = 'pointer';
        }
      });

      const flag = MR.makeEl('', { position: 'absolute', width: (cellW*0.5)+'px', height: (cellH*0.5)+'px', borderRadius: '6px', background: 'var(--flash)', boxShadow: '0 0 10px var(--flash)' });
      wrap.appendChild(flag);
      grid.placeCenter(flag, target.r, target.c);

      const player = MR.makeEl('', { position: 'absolute', width: (cellW*0.5)+'px', height: (cellW*0.5)+'px', borderRadius: '50%', background: 'var(--go)', boxShadow: '0 0 10px var(--go)', transition: 'left 90ms ease, top 90ms ease' });
      wrap.appendChild(player);
      grid.placeCenter(player, pr, pc);

      MR.setKeyHandler((e)=>{
        if(e.key==='ArrowLeft') move(0,-1);
        if(e.key==='ArrowRight') move(0,1);
        if(e.key==='ArrowUp') move(-1,0);
        if(e.key==='ArrowDown') move(1,0);
      });
    }
  });


  MR.games.push({
    label: 'MAZE-MUNCH',
    desc: 'Pac-style chase — steer the muncher through the maze, gobble every dot, and stay out of the ghost\'s reach. Arrow keys or tap an adjacent open cell to move.',
    word: 'CHOMP!',
    timeLimit: s => 6800/s,
    start(ctx){
      const COLS = 6, ROWS = 6;
      const GAP = 5;

      // a = start, b = ghostStart — same solvability guarantee as ESCAPE
      // (reachability is symmetric either direction), now shared via
      // generateSolvableLayout instead of a second copy of the retry loop
      const { a: start, b: ghostStart, walls } = MR.generateSolvableLayout(COLS, ROWS, { wallDensity: 0.2 });
      let pr = start.r, pc = start.c;
      let gr = ghostStart.r, gc = ghostStart.c;
      let alive = true;

      function tryMoveTo(r,c){
        if(!alive) return;
        if(r<0||r>=ROWS||c<0||c>=COLS) return;
        if(walls.has(grid.key(r,c))) return;
        if(Math.abs(r-pr)+Math.abs(c-pc) !== 1) return;
        pr = r; pc = c;
        grid.placeCenter(player, pr, pc);
        eatDotAt(pr,pc);
        checkCollision();
      }
      function move(dr,dc){ tryMoveTo(pr+dr, pc+dc); }

      const grid = MR.makeCellGrid(COLS, ROWS, { gap: GAP, onCellClick: (r,c)=> tryMoveTo(r,c) });
      const { wrap, cellW, cellH } = grid;

      const openCells = [];
      grid.cells.forEach(cd=>{
        if(walls.has(grid.key(cd.r,cd.c))){
          cd.el.style.background = 'repeating-linear-gradient(45deg, var(--bezel), var(--bezel) 6px, rgba(0,0,0,0.35) 6px, rgba(0,0,0,0.35) 12px)';
        } else {
          cd.el.style.cursor = 'pointer';
          openCells.push({ r: cd.r, c: cd.c });
        }
      });

      // scatter a handful of dots rather than one on every open cell —
      // keeps a round clearable inside the timer instead of demanding a
      // full-board sweep
      const dotCount = Math.max(3, Math.min(4, openCells.length - 2));
      const dotCandidates = MR.shuffle(openCells.filter(cell =>
        !(cell.r===start.r && cell.c===start.c) && !(cell.r===ghostStart.r && cell.c===ghostStart.c)
      ));
      const dots = new Set();
      const dotEls = {};
      dotCandidates.slice(0, dotCount).forEach(cell=>{
        const k = grid.key(cell.r, cell.c);
        dots.add(k);
        const dot = MR.makeEl('', { position: 'absolute', width: '24%', height: '24%', borderRadius: '50%', background: 'var(--flash)', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', boxShadow: '0 0 6px var(--flash)' });
        grid.cells[k].el.appendChild(dot);
        dotEls[k] = dot;
      });
      let dotsRemaining = dots.size;

      const player = MR.makeEl('', { position: 'absolute', width: (cellW*0.55)+'px', height: (cellH*0.55)+'px', borderRadius: '50%', background: 'var(--go)', boxShadow: '0 0 10px var(--go)', transition: 'left 90ms ease, top 90ms ease' });
      wrap.appendChild(player);
      grid.placeCenter(player, pr, pc);

      const ghost = MR.makeEl('', { position: 'absolute', width: (cellW*0.6)+'px', height: (cellH*0.6)+'px', borderRadius: '50% 50% 10% 10%', background: 'var(--danger)', boxShadow: '0 0 10px var(--danger)', transition: 'left 240ms linear, top 240ms linear' });
      wrap.appendChild(ghost);
      grid.placeCenter(ghost, gr, gc);

      function eatDotAt(r,c){
        const k = grid.key(r,c);
        if(!dots.has(k)) return;
        dots.delete(k);
        dotEls[k].remove();
        delete dotEls[k];
        dotsRemaining--;
        if(dotsRemaining<=0 && alive){
          alive = false;
          ctx.onWin();
        }
      }

      function checkCollision(){
        if(alive && pr===gr && pc===gc){
          alive = false;
          ctx.onLose();
        }
      }

      MR.setKeyHandler((e)=>{
        if(e.key==='ArrowLeft') move(0,-1);
        if(e.key==='ArrowRight') move(0,1);
        if(e.key==='ArrowUp') move(-1,0);
        if(e.key==='ArrowDown') move(1,0);
      });

      // ghost re-pathfinds and takes one step every tick — interval
      // shortens with speedMul so later, faster rounds hunt harder
      const ghostStepMs = Math.max(230, 480/ctx.speedMul);
      const ghostTimer = setInterval(()=>{
        if(!alive) return;
        const next = MR.bfsNextStep(COLS, ROWS, walls, {r:gr,c:gc}, {r:pr,c:pc});
        if(next.r!==gr || next.c!==gc){
          gr = next.r; gc = next.c;
          grid.placeCenter(ghost, gr, gc);
        }
        checkCollision();
      }, ghostStepMs);

      ctx.onCleanup = ()=>{ alive=false; clearInterval(ghostTimer); };
      // clearing the board before the ghost catches you = win; timing out
      // with dots still up (or getting caught) both fall through to a loss
    }
  });


  MR.games.push({
    label: 'SNAKE',
    desc: 'Classic slither — arrow keys or tap a direction relative to your head to steer. Eat at least one fruit and survive to the buzzer; touching poison, a wall, or your own tail is an instant loss.',
    word: 'SSSLITHER',
    timeLimit: s => 4000/s,
    start(ctx){
      const COLS = 12, ROWS = 12;

      // SNAKE doesn't want the bordered `.cell` tile look — same pixel
      // grid math (and same 30px margin/no-gap layout) as before, just
      // borderless cells via the shared grid builder's cellClass option
      const grid = MR.makeCellGrid(COLS, ROWS, { gap: 0, margin: 30, cellClass: '' });
      const { wrap, cellW, cellH } = grid;
      const key = grid.key;

      function makeSegEl(){
        return MR.makeEl('', { position: 'absolute', width: Math.max(2,cellW-2)+'px', height: Math.max(2,cellH-2)+'px', borderRadius: '4px', background: 'var(--go)' });
      }
      function positionEl(el, r, c){
        MR.styleEl(el, { left: (c*cellW+1)+'px', top: (r*cellH+1)+'px' });
      }
      // head gets a glow so it reads as the "front" of the snake at a glance
      function refreshHeadStyle(){
        bodyEls.forEach((el,i)=>{
          const isHead = i === bodyEls.length-1;
          MR.styleEl(el, { boxShadow: isHead ? '0 0 8px var(--go)' : 'none', opacity: isHead ? '1' : '0.82' });
        });
      }

      // segments ordered tail -> head; occupied mirrors it as a lookup set
      // (dropping the vacated tail key is handled per-move, see tick())
      const startR = Math.floor(ROWS/2), startC = Math.floor(COLS/3);
      let dir = { dx:1, dy:0 };
      let pendingDir = dir;
      let segments = [
        { r:startR, c:startC-2 },
        { r:startR, c:startC-1 },
        { r:startR, c:startC   }
      ];
      const occupied = new Set(segments.map(s=>key(s.r,s.c)));
      const bodyEls = segments.map(seg=>{
        const el = makeSegEl();
        positionEl(el, seg.r, seg.c);
        wrap.appendChild(el);
        return el;
      });
      refreshHeadStyle();

      const fruitEls = new Map();
      const poisonEls = new Map();
      const fruitSet = new Set();
      const poisonSet = new Set();

      function randomOpenCell(){
        for(let tries=0; tries<200; tries++){
          const r = Math.floor(MR.rand(0,ROWS));
          const c = Math.floor(MR.rand(0,COLS));
          const k = key(r,c);
          if(!occupied.has(k) && !fruitSet.has(k) && !poisonSet.has(k)) return { r, c, k };
        }
        return null;
      }
      function makePelletEl(cell, color, round){
        const el = MR.makeEl('', { position: 'absolute', width: (cellW*0.5)+'px', height: (cellH*0.5)+'px', borderRadius: round ? '50%' : '3px', background: color, boxShadow: '0 0 8px '+color });
        wrap.appendChild(el);
        grid.placeCenter(el, cell.r, cell.c);
        return el;
      }
      function spawnFruit(){
        const cell = randomOpenCell();
        if(!cell) return;
        fruitSet.add(cell.k);
        fruitEls.set(cell.k, makePelletEl(cell, 'var(--flash)', true));
      }
      function spawnPoison(){
        const cell = randomOpenCell();
        if(!cell) return;
        poisonSet.add(cell.k);
        poisonEls.set(cell.k, makePelletEl(cell, 'var(--danger)', false));
      }

      for(let i=0;i<3;i++) spawnFruit();
      for(let i=0;i<3;i++) spawnPoison();

      let fruitsEaten = 0;
      let alive = true;

      function applyDir(d){
        // block reversing straight into your own neck
        if(segments.length>1 && d.dx===-dir.dx && d.dy===-dir.dy) return;
        pendingDir = d;
      }
      MR.setKeyHandler((e)=>{
        const d = { ArrowLeft:{dx:-1,dy:0}, ArrowRight:{dx:1,dy:0}, ArrowUp:{dx:0,dy:-1}, ArrowDown:{dx:0,dy:1} }[e.key];
        if(d) applyDir(d);
      });

      // touch/mouse: tap anywhere and steer toward that point relative to
      // the current head, picking whichever axis has the bigger offset —
      // no swipe-gesture tracking needed, just "aim where you tapped"
      function onPointerDown(e){
        const r = wrap.getBoundingClientRect();
        const tapX = e.clientX - r.left, tapY = e.clientY - r.top;
        const head = segments[segments.length-1];
        const headX = head.c*cellW + cellW/2, headY = head.r*cellH + cellH/2;
        const ddx = tapX-headX, ddy = tapY-headY;
        if(Math.abs(ddx) > Math.abs(ddy)) applyDir({ dx: ddx>0?1:-1, dy:0 });
        else applyDir({ dx:0, dy: ddy>0?1:-1 });
      }
      MR.stage.addEventListener('pointerdown', onPointerDown);

      const moveEvery = Math.max(300, 260/ctx.speedMul);
      let acc = 0;
      let lastT = performance.now();

      function tick(){
        dir = pendingDir;
        const head = segments[segments.length-1];
        const nr = head.r+dir.dy, nc = head.c+dir.dx;
        if(nr<0||nr>=ROWS||nc<0||nc>=COLS){ alive=false; ctx.onLose(); return; }
        const nk = key(nr,nc);
        if(poisonSet.has(nk)){ alive=false; ctx.onLose(); return; }
        const isGrow = fruitSet.has(nk);
        const tail = segments[0];
        const vacatedTailKey = isGrow ? null : key(tail.r,tail.c);
        if(occupied.has(nk) && nk!==vacatedTailKey){ alive=false; ctx.onLose(); return; }

        segments.push({ r:nr, c:nc });
        occupied.add(nk);
        const headEl = makeSegEl();
        positionEl(headEl, nr, nc);
        wrap.appendChild(headEl);
        bodyEls.push(headEl);

        if(isGrow){
          fruitSet.delete(nk);
          const fEl = fruitEls.get(nk);
          if(fEl){ fEl.remove(); fruitEls.delete(nk); }
          fruitsEaten++;
          // quota met — a clean timeout from here on counts as a win
          // (see the engine's ctx.stopIsWin check on round timeout)
          ctx.stopIsWin = true;
          spawnFruit();
        } else {
          segments.shift();
          occupied.delete(vacatedTailKey);
          bodyEls.shift().remove();
        }
        refreshHeadStyle();
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
      };
      // no fruit yet — reaching the round timer without one is a loss,
      // flipped to a win the moment the first fruit lands (see tick())
      ctx.stopIsWin = false;
    }
  });


  for(let i=CATEGORY_START;i<MR.games.length;i++) MR.games[i].category = 'motion';

})();
