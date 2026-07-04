(function(){
  "use strict";
  const MR = window.MR;
  const CATEGORY_START = MR.games.length;


  MR.games.push({
    label: 'HURDLE',
    desc: 'Jump the cacti (watch for tall ones and pairs), duck the low birds — arrow keys or tap top / bottom. High birds clear a standing runner but punish a mistimed jump.',
    word: 'RUN!',
    timeLimit: s => 4400/s,
    start(ctx){
      const w = MR.screen.clientWidth - 36, h = MR.screen.clientHeight - 36;
      const standH = 34, duckH = 18;
      const groundY = Math.round(h/2 - standH/2);
      const playerW = 24;
      const px = Math.round((w - playerW) / 2);

      const player = document.createElement('div');
      player.className = 'box';
      player.style.width = playerW+'px';
      player.style.background = 'var(--go)';
      player.style.left = px+'px';
      MR.stage.appendChild(player);

      let state = 'stand'; // 'stand' | 'jump' | 'duck'
      let jumpT = 0, duckT = 0;
      const jumpDur = 620, duckDur = 520;
      const jumpHeight = Math.max(30, Math.min(78, h - (groundY + standH) - 8));

      function currentPlayerBottom(){
        if(state==='jump'){
          const p = Math.min(jumpT/jumpDur, 1);
          return groundY + Math.sin(p*Math.PI)*jumpHeight;
        }
        return groundY;
      }
      function applyVisual(){
        player.style.height = (state==='duck' ? duckH : standH)+'px';
        player.style.bottom = currentPlayerBottom()+'px';
      }
      applyVisual();

      function doJump(){ if(state!=='jump'){ state='jump'; jumpT=0; } }
      function doDuck(){ if(state!=='jump'){ state='duck'; duckT=0; } }

      MR.setKeyHandler((e)=>{
        if(e.key==='ArrowUp') doJump();
        if(e.key==='ArrowDown') doDuck();
      });

      // tap zones live on elements created fresh each round, wiped by clearStage()
      const topZone = document.createElement('div');
      const bottomZone = document.createElement('div');
      [topZone, bottomZone].forEach(z=>{
        z.style.position='absolute'; z.style.left='0'; z.style.right='0'; z.style.height='50%';
        z.style.cursor='pointer';
      });
      topZone.style.top='0';
      bottomZone.style.bottom='0';
      topZone.addEventListener('click', doJump);
      bottomZone.addEventListener('click', doDuck);
      MR.stage.appendChild(topZone);
      MR.stage.appendChild(bottomZone);

      const obstacles = [];
      let alive = true;
      const spawnEvery = 900 / ctx.speedMul;
      let sinceSpawn = spawnEvery*0.5;

      function makeObstacle(x, ow, oh, bottom, isBird){
        const el = document.createElement('div');
        el.className='box';
        el.style.background = isBird ? 'var(--flash)' : 'var(--danger)';
        el.style.width = ow+'px';
        el.style.height = oh+'px';
        el.style.borderRadius = isBird ? '8px' : '4px';
        el.style.bottom = bottom+'px';
        el.style.left = x+'px';
        MR.stage.appendChild(el);
        obstacles.push({ el, x, w:ow, h:oh, bottom });
      }

      function spawnObstacle(){
        // weighted pool: plain/tall/paired cacti need a jump, low birds need
        // a duck, high birds fly clear of a standing runner but still punish
        // a mistimed jump
        const kind = MR.pick(['cactus','cactus','cactus_tall','cactus_pair','bird_low','bird_low','bird_high']);
        if(kind === 'cactus_pair'){
          const ow = 16, oh = 26, gap = 8;
          makeObstacle(w, ow, oh, groundY, false);
          makeObstacle(w + ow + gap, ow, oh, groundY, false);
        } else if(kind === 'cactus_tall'){
          makeObstacle(w, 20, 42, groundY, false);
        } else if(kind === 'bird_high'){
          makeObstacle(w, 26, 16, groundY + standH + 8, true);
        } else if(kind === 'bird_low'){
          makeObstacle(w, 26, 16, groundY + (duckH + standH)/2, true);
        } else {
          makeObstacle(w, 18, 26, groundY, false);
        }
      }

      let lastT = performance.now();
      function loop(t){
        if(!alive) return;
        const dt = t-lastT; lastT=t;
        if(state==='jump'){ jumpT += dt; if(jumpT>=jumpDur) state='stand'; }
        if(state==='duck'){ duckT += dt; if(duckT>=duckDur) state='stand'; }
        applyVisual();

        sinceSpawn += dt;
        if(sinceSpawn > spawnEvery){ sinceSpawn=0; spawnObstacle(); }

        const speed = 0.30 * ctx.speedMul;
        for(const o of obstacles){
          o.x -= speed*dt;
          o.el.style.left = o.x+'px';
        }

        const playerBottom = currentPlayerBottom();
        const playerTop = playerBottom + (state==='duck' ? duckH : standH);
        for(const o of obstacles){
          if(o.x < px+playerW && o.x+o.w > px){
            const overlapV = playerTop > o.bottom && playerBottom < o.bottom+o.h;
            if(overlapV){ alive=false; ctx.onLose(); return; }
          }
        }
        for(let i=obstacles.length-1;i>=0;i--){
          if(obstacles[i].x + obstacles[i].w < -10){ obstacles[i].el.remove(); obstacles.splice(i,1); }
        }
        MR.rafId = requestAnimationFrame(loop);
      }
      MR.rafId = requestAnimationFrame(loop);
      ctx.onCleanup = ()=>{ alive=false; if(MR.rafId) cancelAnimationFrame(MR.rafId); };
      // survive whole round = win, handled by engine timeout
      ctx.survivalGame = true;
    }
  });


  MR.games.push({
    label: 'GAUNTLET',
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
    label: 'LAVA',
    desc: 'The floor is lava — hop off tiles before they flash red then burn.',
    word: 'FLOOR IS LAVA',
    timeLimit: s => 5200/s,
    start(ctx){
      const COLS = 3, ROWS = 5;
      const GAP = 6;
      const w = MR.screen.clientWidth - 36, h = MR.screen.clientHeight - 36;
      const cellW = (w - (COLS-1)*GAP) / COLS;
      const cellH = (h - (ROWS-1)*GAP) / ROWS;

      const wrap = document.createElement('div');
      wrap.style.position = 'absolute';
      wrap.style.left = '18px'; wrap.style.top = '18px';
      wrap.style.width = w+'px'; wrap.style.height = h+'px';
      MR.stage.appendChild(wrap);

      // state per cell: 'safe' -> 'warn' (flashing) -> 'lava' (deadly) -> back to 'safe'
      const cells = [];
      for(let r=0;r<ROWS;r++){
        for(let c=0;c<COLS;c++){
          const el = document.createElement('div');
          el.className = 'cell';
          el.style.position = 'absolute';
          el.style.width = cellW+'px'; el.style.height = cellH+'px';
          el.style.left = (c*(cellW+GAP))+'px';
          el.style.top = (r*(cellH+GAP))+'px';
          el.style.cursor = 'pointer';
          const cellData = { r, c, el, state:'safe', t:0 };
          el.addEventListener('click', ()=> tryMoveTo(cellData.r, cellData.c));
          wrap.appendChild(el);
          cells.push(cellData);
        }
      }
      function cellAt(r,c){ return cells[r*COLS+c]; }

      let pr = ROWS-1, pc = 1; // start bottom-middle

      const player = document.createElement('div');
      player.style.position = 'absolute';
      player.style.width = (cellW*0.5)+'px'; player.style.height = (cellW*0.5)+'px';
      player.style.borderRadius = '50%';
      player.style.background = 'var(--go)';
      player.style.boxShadow = '0 0 10px var(--go)';
      player.style.transition = 'left 90ms ease, top 90ms ease';
      wrap.appendChild(player);

      function placePlayer(){
        const cd = cellAt(pr,pc);
        player.style.left = (cd.el.offsetLeft + cellW/2 - player.clientWidth/2)+'px';
        player.style.top = (cd.el.offsetTop + cellH/2 - player.clientHeight/2)+'px';
      }
      placePlayer();

      let alive = true;

      function loseIfLava(cd){
        if(cd.state === 'lava'){ alive = false; ctx.onLose(); return true; }
        return false;
      }

      function tryMoveTo(r,c){
        if(!alive) return;
        if(r<0||r>=ROWS||c<0||c>=COLS) return;
        pr = r; pc = c;
        placePlayer();
        loseIfLava(cellAt(pr,pc));
      }
      function move(dr,dc){ tryMoveTo(pr+dr, pc+dc); }

      MR.setKeyHandler((e)=>{
        if(e.key==='ArrowLeft') move(0,-1);
        if(e.key==='ArrowRight') move(0,1);
        if(e.key==='ArrowUp') move(-1,0);
        if(e.key==='ArrowDown') move(1,0);
      });

      const WARN_MS = 900 / ctx.speedMul;
      const LAVA_MS = 2600 / ctx.speedMul;
      let sinceSpawn = 0;
      const maxHot = Math.min(cells.length - 3, 8); // always leave a few safe tiles
      function hotCount(){ return cells.filter(cd=>cd.state!=='safe').length; }

      function spawnWarn(){
        const candidates = cells.filter(cd=>cd.state==='safe');
        if(!candidates.length) return;
        const cd = MR.pick(candidates);
        cd.state = 'warn'; cd.t = 0;
        cd.el.classList.add('hazard-warn');
      }

      let lastT = performance.now();
      function loop(t){
        if(!alive) return;
        const dt = t - lastT; lastT = t;

        sinceSpawn += dt;
        const spawnEvery = Math.max(180, 420 / ctx.speedMul);
        if(sinceSpawn > spawnEvery && hotCount() < maxHot){
          sinceSpawn = 0;
          spawnWarn();
        }

        cells.forEach(cd=>{
          if(cd.state==='warn'){
            cd.t += dt;
            if(cd.t >= WARN_MS){
              cd.state = 'lava'; cd.t = 0;
              cd.el.classList.remove('hazard-warn');
              cd.el.classList.add('hazard-lava');
              if(cd.r===pr && cd.c===pc){ alive=false; ctx.onLose(); return; }
            }
          } else if(cd.state==='lava'){
            cd.t += dt;
            if(cd.t >= LAVA_MS){
              cd.state = 'safe'; cd.t = 0;
              cd.el.classList.remove('hazard-lava');
            }
          }
        });
        if(!alive) return;

        MR.rafId = requestAnimationFrame(loop);
      }
      MR.rafId = requestAnimationFrame(loop);
      ctx.onCleanup = ()=>{ alive=false; if(MR.rafId) cancelAnimationFrame(MR.rafId); };
      // survive the whole round without standing on lava = win
      ctx.survivalGame = true;
    }
  });


  MR.games.push({
    label: 'PATH',
    desc: 'Navigate the grid from start to the flag before time runs out. Walls block the way.',
    word: 'REACH THE FLAG',
    timeLimit: s => 5000/s,
    start(ctx){
      const COLS = 5, ROWS = 5;
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


  for(let i=CATEGORY_START;i<MR.games.length;i++) MR.games[i].category = 'motion';

})();
