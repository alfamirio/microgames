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

      const player = document.createElement('div');
      player.className = 'dot';
      player.style.width = (playerR*2)+'px'; player.style.height = (playerR*2)+'px';
      player.style.background = 'var(--go)';
      player.style.boxShadow = '0 0 10px var(--go)';
      player.style.touchAction = 'none';
      MR.stage.appendChild(player);

      function placePlayer(){
        player.style.left = (px-playerR)+'px';
        player.style.top = (py-playerR)+'px';
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
      function pointerToStage(e){
        const r = MR.stage.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      }
      function onPointerDown(e){
        dragging = true;
        MR.stage.setPointerCapture(e.pointerId);
        const p = pointerToStage(e);
        px = Math.max(playerR, Math.min(w-playerR, p.x));
        py = Math.max(playerR, Math.min(h-playerR, p.y));
        placePlayer();
      }
      function onPointerMove(e){
        if(!dragging) return;
        const p = pointerToStage(e);
        px = Math.max(playerR, Math.min(w-playerR, p.x));
        py = Math.max(playerR, Math.min(h-playerR, p.y));
        placePlayer();
      }
      function onPointerUp(){ dragging = false; }
      MR.stage.addEventListener('pointerdown', onPointerDown);
      MR.stage.addEventListener('pointermove', onPointerMove);
      MR.stage.addEventListener('pointerup', onPointerUp);
      MR.stage.addEventListener('pointercancel', onPointerUp);

      const bullets = [];
      let alive = true;
      let elapsed = 0;

      function spawnBullet(x, y, vx, vy, color){
        const el = document.createElement('div');
        el.className = 'dot';
        el.style.width = (bulletR*2)+'px'; el.style.height = (bulletR*2)+'px';
        el.style.background = color || 'var(--danger)';
        el.style.left = (x-bulletR)+'px'; el.style.top = (y-bulletR)+'px';
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
      const w = MR.screen.clientWidth - 36, h = MR.screen.clientHeight - 36;
      const cellW = (w - (COLS-1)*GAP) / COLS;
      const cellH = (h - (ROWS-1)*GAP) / ROWS;

      function key(r,c){ return r*COLS+c; }

      // pick a start/target pair far enough apart, then scatter walls,
      // retrying until a BFS confirms a walkable path still exists —
      // guarantees the round is always solvable, never a soft-lock
      function bfsReachable(walls, start, target){
        const seen = new Set([key(start.r,start.c)]);
        const queue = [start];
        while(queue.length){
          const cur = queue.shift();
          if(cur.r===target.r && cur.c===target.c) return true;
          const neighbors = [[cur.r-1,cur.c],[cur.r+1,cur.c],[cur.r,cur.c-1],[cur.r,cur.c+1]];
          for(const [nr,nc] of neighbors){
            if(nr<0||nr>=ROWS||nc<0||nc>=COLS) continue;
            const k = key(nr,nc);
            if(seen.has(k) || walls.has(k)) continue;
            seen.add(k);
            queue.push({r:nr,c:nc});
          }
        }
        return false;
      }

      function generateLayout(){
        const minDist = Math.floor((COLS+ROWS)/2);
        for(let attempt=0; attempt<40; attempt++){
          const start = { r: Math.floor(MR.rand(0,ROWS)), c: Math.floor(MR.rand(0,COLS)) };
          const target = { r: Math.floor(MR.rand(0,ROWS)), c: Math.floor(MR.rand(0,COLS)) };
          const dist = Math.abs(start.r-target.r) + Math.abs(start.c-target.c);
          if(dist < minDist) continue;
          const walls = new Set();
          const wallBudget = Math.floor(COLS*ROWS*0.28);
          let guard = 0;
          while(walls.size < wallBudget && guard < 200){
            guard++;
            const r = Math.floor(MR.rand(0,ROWS)), c = Math.floor(MR.rand(0,COLS));
            const k = key(r,c);
            if((r===start.r&&c===start.c) || (r===target.r&&c===target.c)) continue;
            walls.add(k);
          }
          if(bfsReachable(walls, start, target)) return { start, target, walls };
        }
        return { start:{r:0,c:0}, target:{r:ROWS-1,c:COLS-1}, walls:new Set() };
      }

      const { start, target, walls } = generateLayout();
      let pr = start.r, pc = start.c;

      const wrap = document.createElement('div');
      wrap.style.position = 'absolute';
      wrap.style.left = '18px'; wrap.style.top = '18px';
      wrap.style.width = w+'px'; wrap.style.height = h+'px';
      MR.stage.appendChild(wrap);

      const cellEls = [];
      for(let r=0;r<ROWS;r++){
        for(let c=0;c<COLS;c++){
          const el = document.createElement('div');
          el.className = 'cell';
          el.style.position = 'absolute';
          el.style.width = cellW+'px'; el.style.height = cellH+'px';
          el.style.left = (c*(cellW+GAP))+'px';
          el.style.top = (r*(cellH+GAP))+'px';
          const isWall = walls.has(key(r,c));
          if(isWall){
            el.style.background = 'repeating-linear-gradient(45deg, var(--bezel), var(--bezel) 6px, rgba(0,0,0,0.35) 6px, rgba(0,0,0,0.35) 12px)';
          } else {
            el.style.cursor = 'pointer';
            el.addEventListener('click', ()=> tryMoveTo(r,c));
          }
          wrap.appendChild(el);
          cellEls[key(r,c)] = el;
        }
      }

      const flag = document.createElement('div');
      flag.style.position = 'absolute';
      flag.style.width = (cellW*0.5)+'px'; flag.style.height = (cellH*0.5)+'px';
      flag.style.borderRadius = '6px';
      flag.style.background = 'var(--flash)';
      flag.style.boxShadow = '0 0 10px var(--flash)';
      flag.style.left = (target.c*(cellW+GAP) + cellW/2 - (cellW*0.25))+'px';
      flag.style.top = (target.r*(cellH+GAP) + cellH/2 - (cellH*0.25))+'px';
      wrap.appendChild(flag);

      const player = document.createElement('div');
      player.style.position = 'absolute';
      player.style.width = (cellW*0.5)+'px'; player.style.height = (cellW*0.5)+'px';
      player.style.borderRadius = '50%';
      player.style.background = 'var(--go)';
      player.style.boxShadow = '0 0 10px var(--go)';
      player.style.transition = 'left 90ms ease, top 90ms ease';
      wrap.appendChild(player);

      function placePlayer(){
        player.style.left = (pc*(cellW+GAP) + cellW/2 - player.clientWidth/2)+'px';
        player.style.top = (pr*(cellH+GAP) + cellH/2 - player.clientHeight/2)+'px';
      }
      placePlayer();

      let alive = true;

      function tryMoveTo(r,c){
        if(!alive) return;
        if(r<0||r>=ROWS||c<0||c>=COLS) return;
        if(walls.has(key(r,c))) return;
        // only step to orthogonally adjacent cells — no teleporting through walls
        if(Math.abs(r-pr)+Math.abs(c-pc) !== 1) return;
        pr = r; pc = c;
        placePlayer();
        if(pr===target.r && pc===target.c){
          alive = false;
          ctx.onWin();
        }
      }
      function move(dr,dc){ tryMoveTo(pr+dr, pc+dc); }

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
      const w = MR.screen.clientWidth - 36, h = MR.screen.clientHeight - 36;
      const cellW = (w - (COLS-1)*GAP) / COLS;
      const cellH = (h - (ROWS-1)*GAP) / ROWS;

      function key(r,c){ return r*COLS+c; }
      function neighborsOf(r,c){ return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]; }

      // same solvability guarantee as PATH: retry layouts until a BFS
      // confirms the ghost's start can actually reach the player's start,
      // so the maze itself is never the thing that traps you
      function bfsReachable(walls, from, to){
        const seen = new Set([key(from.r,from.c)]);
        const queue = [from];
        while(queue.length){
          const cur = queue.shift();
          if(cur.r===to.r && cur.c===to.c) return true;
          for(const [nr,nc] of neighborsOf(cur.r,cur.c)){
            if(nr<0||nr>=ROWS||nc<0||nc>=COLS) continue;
            const k = key(nr,nc);
            if(seen.has(k) || walls.has(k)) continue;
            seen.add(k);
            queue.push({r:nr,c:nc});
          }
        }
        return false;
      }

      // BFS from the ghost toward the player, returning just the *next*
      // step along the shortest path (or the ghost's current cell if
      // already there / unreachable) — recomputed every tick so the ghost
      // re-routes live as the player moves instead of committing to a
      // stale path.
      function bfsNextStep(walls, from, to){
        if(from.r===to.r && from.c===to.c) return from;
        const seen = new Set([key(from.r,from.c)]);
        const queue = [[from]];
        while(queue.length){
          const path = queue.shift();
          const cur = path[path.length-1];
          if(cur.r===to.r && cur.c===to.c) return path[1];
          for(const [nr,nc] of neighborsOf(cur.r,cur.c)){
            if(nr<0||nr>=ROWS||nc<0||nc>=COLS) continue;
            const k = key(nr,nc);
            if(seen.has(k) || walls.has(k)) continue;
            seen.add(k);
            queue.push(path.concat([{r:nr,c:nc}]));
          }
        }
        return from;
      }

      function generateLayout(){
        const minDist = Math.floor((COLS+ROWS)/2);
        for(let attempt=0; attempt<40; attempt++){
          const start = { r: Math.floor(MR.rand(0,ROWS)), c: Math.floor(MR.rand(0,COLS)) };
          const ghostStart = { r: Math.floor(MR.rand(0,ROWS)), c: Math.floor(MR.rand(0,COLS)) };
          const dist = Math.abs(start.r-ghostStart.r) + Math.abs(start.c-ghostStart.c);
          if(dist < minDist) continue;
          const walls = new Set();
          const wallBudget = Math.floor(COLS*ROWS*0.2);
          let guard = 0;
          while(walls.size < wallBudget && guard < 200){
            guard++;
            const r = Math.floor(MR.rand(0,ROWS)), c = Math.floor(MR.rand(0,COLS));
            const k = key(r,c);
            if((r===start.r&&c===start.c) || (r===ghostStart.r&&c===ghostStart.c)) continue;
            walls.add(k);
          }
          if(bfsReachable(walls, ghostStart, start)) return { start, ghostStart, walls };
        }
        return { start:{r:0,c:0}, ghostStart:{r:ROWS-1,c:COLS-1}, walls:new Set() };
      }

      const { start, ghostStart, walls } = generateLayout();
      let pr = start.r, pc = start.c;
      let gr = ghostStart.r, gc = ghostStart.c;

      const wrap = document.createElement('div');
      wrap.style.position = 'absolute';
      wrap.style.left = '18px'; wrap.style.top = '18px';
      wrap.style.width = w+'px'; wrap.style.height = h+'px';
      MR.stage.appendChild(wrap);

      const openCells = [];
      const cellEls = [];
      for(let r=0;r<ROWS;r++){
        for(let c=0;c<COLS;c++){
          const el = document.createElement('div');
          el.className = 'cell';
          el.style.position = 'absolute';
          el.style.width = cellW+'px'; el.style.height = cellH+'px';
          el.style.left = (c*(cellW+GAP))+'px';
          el.style.top = (r*(cellH+GAP))+'px';
          const k = key(r,c);
          const isWall = walls.has(k);
          if(isWall){
            el.style.background = 'repeating-linear-gradient(45deg, var(--bezel), var(--bezel) 6px, rgba(0,0,0,0.35) 6px, rgba(0,0,0,0.35) 12px)';
          } else {
            el.style.cursor = 'pointer';
            el.addEventListener('click', ()=> tryMoveTo(r,c));
            openCells.push({r,c});
          }
          wrap.appendChild(el);
          cellEls[k] = el;
        }
      }

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
        const k = key(cell.r, cell.c);
        dots.add(k);
        const dot = document.createElement('div');
        dot.style.position = 'absolute';
        dot.style.width = '24%'; dot.style.height = '24%';
        dot.style.borderRadius = '50%';
        dot.style.background = 'var(--flash)';
        dot.style.left = '50%'; dot.style.top = '50%';
        dot.style.transform = 'translate(-50%,-50%)';
        dot.style.boxShadow = '0 0 6px var(--flash)';
        cellEls[k].appendChild(dot);
        dotEls[k] = dot;
      });
      let dotsRemaining = dots.size;

      const player = document.createElement('div');
      player.style.position = 'absolute';
      player.style.width = (cellW*0.55)+'px'; player.style.height = (cellH*0.55)+'px';
      player.style.borderRadius = '50%';
      player.style.background = 'var(--go)';
      player.style.boxShadow = '0 0 10px var(--go)';
      player.style.transition = 'left 90ms ease, top 90ms ease';
      wrap.appendChild(player);

      const ghost = document.createElement('div');
      ghost.style.position = 'absolute';
      ghost.style.width = (cellW*0.6)+'px'; ghost.style.height = (cellH*0.6)+'px';
      ghost.style.borderRadius = '50% 50% 10% 10%';
      ghost.style.background = 'var(--danger)';
      ghost.style.boxShadow = '0 0 10px var(--danger)';
      ghost.style.transition = 'left 240ms linear, top 240ms linear';
      wrap.appendChild(ghost);

      function placeAt(el, r, c){
        el.style.left = (c*(cellW+GAP) + cellW/2 - el.clientWidth/2)+'px';
        el.style.top = (r*(cellH+GAP) + cellH/2 - el.clientHeight/2)+'px';
      }
      function placePlayer(){ placeAt(player, pr, pc); }
      function placeGhost(){ placeAt(ghost, gr, gc); }
      placePlayer(); placeGhost();

      let alive = true;

      function eatDotAt(r,c){
        const k = key(r,c);
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

      function tryMoveTo(r,c){
        if(!alive) return;
        if(r<0||r>=ROWS||c<0||c>=COLS) return;
        if(walls.has(key(r,c))) return;
        if(Math.abs(r-pr)+Math.abs(c-pc) !== 1) return;
        pr = r; pc = c;
        placePlayer();
        eatDotAt(pr,pc);
        checkCollision();
      }
      function move(dr,dc){ tryMoveTo(pr+dr, pc+dc); }

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
        const next = bfsNextStep(walls, {r:gr,c:gc}, {r:pr,c:pc});
        if(next.r!==gr || next.c!==gc){
          gr = next.r; gc = next.c;
          placeGhost();
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
      const w = MR.screen.clientWidth - 30, h = MR.screen.clientHeight - 30;
      const cellW = w/COLS, cellH = h/ROWS;

      function key(r,c){ return r*COLS+c; }

      const wrap = document.createElement('div');
      wrap.style.position = 'absolute';
      wrap.style.left = '15px'; wrap.style.top = '15px';
      wrap.style.width = w+'px'; wrap.style.height = h+'px';
      MR.stage.appendChild(wrap);

      function makeSegEl(){
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.width = Math.max(2,cellW-2)+'px'; el.style.height = Math.max(2,cellH-2)+'px';
        el.style.borderRadius = '4px';
        el.style.background = 'var(--go)';
        return el;
      }
      function positionEl(el, r, c){
        el.style.left = (c*cellW+1)+'px';
        el.style.top = (r*cellH+1)+'px';
      }
      // head gets a glow so it reads as the "front" of the snake at a glance
      function refreshHeadStyle(){
        bodyEls.forEach((el,i)=>{
          const isHead = i === bodyEls.length-1;
          el.style.boxShadow = isHead ? '0 0 8px var(--go)' : 'none';
          el.style.opacity = isHead ? '1' : '0.82';
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
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.width = (cellW*0.5)+'px'; el.style.height = (cellH*0.5)+'px';
        el.style.left = (cell.c*cellW + cellW*0.25)+'px';
        el.style.top = (cell.r*cellH + cellH*0.25)+'px';
        el.style.borderRadius = round ? '50%' : '3px';
        el.style.background = color;
        el.style.boxShadow = '0 0 8px '+color;
        wrap.appendChild(el);
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
