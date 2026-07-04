(function(){
  "use strict";
  const MR = window.MR;
  const CATEGORY_START = MR.games.length;

  // MOTION / RUNNER -- endless-runner-style survival games

  MR.games.push({
    label: 'DINOJUMP',
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
      // floored: jumpDur/duckDur are fixed (the physical animation length),
      // so the time gap between obstacles must never drop below that or a
      // player can still be mid-jump when the next obstacle needs a duck —
      // an unavoidable forced collision. jumpDur(620) + margin = 720.
      const spawnEvery = Math.max(720, 900 / ctx.speedMul);
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
    label: 'LAVA',
    desc: 'The floor is lava — hop off tiles before they flash red then burn.',
    word: 'FLOOR IS LAVA',
    timeLimit: s => 5200/s,
    start(ctx){
      const COLS = 4, ROWS = 6;
      const GAP = 5;
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

      // floored: this is the reaction window to step off a warned tile
      // before it turns lethal, so it shouldn't shrink all the way down
      // with difficulty — spawnEvery below already carries that instead
      const WARN_MS = Math.max(600, 800 / ctx.speedMul);
      const LAVA_MS = 5000 / ctx.speedMul;
      let sinceSpawn = 0;
      const maxHot = Math.min(cells.length - 3, 16); // always leave a few safe tiles
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
        const spawnEvery = Math.max(120, 420 / ctx.speedMul);
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
    label: 'SWIM',
    desc: 'Only up/down control \u2014 dodge the reef gaps as they scroll in. Arrow keys, or hold the top/bottom half of the screen.',
    word: 'SWIM!',
    timeLimit: s => 5200 / s,
    start(ctx){
      const w = MR.screen.clientWidth - 26, h = MR.screen.clientHeight - 26;
      const playerR = 12;
      const px = Math.round(w * 0.22); // fixed horizontal position, like DINOJUMP's runner
      let py = h/2;

      const player = document.createElement('div');
      player.style.position = 'absolute';
      player.style.width = (playerR*2)+'px'; player.style.height = (playerR*2)+'px';
      player.style.borderRadius = '50%';
      player.style.background = 'var(--go)';
      player.style.boxShadow = '0 0 10px var(--go)';
      MR.stage.appendChild(player);
      function placePlayer(){
        player.style.left = (px-playerR)+'px';
        player.style.top = (py-playerR)+'px';
      }
      placePlayer();

      // Vertical control speed is fixed, deliberately NOT scaled by
      // ctx.speedMul — same rationale as CATCH's basketSpeed: a human's
      // reaction overhead doesn't shrink just because the round got harder,
      // so scaling the *control* would quietly erode the safety margin at
      // high difficulty. Difficulty instead comes from obstacleSpeed and
      // spawnEvery below, and every gap is placed within fixed-speed reach
      // of the player's actual position at spawn time (see spawnObstacle).
      const playerSpeed = 0.42; // px/ms

      let goUp = false, goDown = false;
      function onKeyDown(e){
        if(e.key==='ArrowUp') goUp = true;
        if(e.key==='ArrowDown') goDown = true;
      }
      function onKeyUp(e){
        if(e.key==='ArrowUp') goUp = false;
        if(e.key==='ArrowDown') goDown = false;
      }
      MR.setKeyHandler(onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      // tap-and-hold zones live on elements created fresh each round, wiped by clearStage()
      const topZone = document.createElement('div');
      const bottomZone = document.createElement('div');
      [topZone, bottomZone].forEach(z=>{
        z.style.position='absolute'; z.style.left='0'; z.style.right='0'; z.style.height='50%';
        z.style.cursor='pointer'; z.style.touchAction='none';
      });
      topZone.style.top='0';
      bottomZone.style.bottom='0';
      topZone.addEventListener('pointerdown', ()=>{ goUp = true; });
      bottomZone.addEventListener('pointerdown', ()=>{ goDown = true; });
      function releaseUp(){ goUp = false; }
      function releaseDown(){ goDown = false; }
      topZone.addEventListener('pointerup', releaseUp);
      topZone.addEventListener('pointerleave', releaseUp);
      topZone.addEventListener('pointercancel', releaseUp);
      bottomZone.addEventListener('pointerup', releaseDown);
      bottomZone.addEventListener('pointerleave', releaseDown);
      bottomZone.addEventListener('pointercancel', releaseDown);
      MR.stage.appendChild(topZone);
      MR.stage.appendChild(bottomZone);

      const obstacles = [];
      let alive = true;
      const obW = 18;
      const gapH = Math.max(70, h*0.32);
      const obstacleSpeed = 0.30 * ctx.speedMul; // px/ms — the actual difficulty knob

      function makeObstacle(x, gapY){
        const wrap = document.createElement('div');
        wrap.style.position = 'absolute';
        wrap.style.left = x+'px'; wrap.style.top = '0px';
        wrap.style.width = obW+'px'; wrap.style.height = h+'px';
        const top = document.createElement('div');
        top.className = 'box';
        top.style.position = 'absolute'; top.style.left = '0'; top.style.top = '0';
        top.style.width = obW+'px'; top.style.height = Math.max(0, gapY-gapH/2)+'px';
        top.style.background = 'var(--danger)';
        const bottom = document.createElement('div');
        bottom.className = 'box';
        bottom.style.position = 'absolute'; bottom.style.left = '0';
        bottom.style.top = (gapY+gapH/2)+'px';
        bottom.style.width = obW+'px'; bottom.style.height = Math.max(0, h-(gapY+gapH/2))+'px';
        bottom.style.background = 'var(--danger)';
        wrap.appendChild(top);
        wrap.appendChild(bottom);
        MR.stage.appendChild(wrap);
        obstacles.push({ el: wrap, x, gapY, w: obW });
      }

      // Reachability: same technique as CATCH's spawnDrop — bias the new
      // gap's position to stay within what the fixed-speed player can
      // actually cover in the time it'll take the obstacle to arrive, with
      // slack for reaction time. Guarantees the round never demands a move
      // faster than playerSpeed allows, no matter how high speedMul gets.
      function spawnObstacle(){
        const arrivalDist = w - px;
        const timeToArrival = arrivalDist / obstacleSpeed;
        const maxReach = playerSpeed * timeToArrival * 0.7;
        const lo = Math.max(gapH/2, py - maxReach);
        const hi = Math.min(h - gapH/2, py + maxReach);
        const gapY = hi > lo ? MR.rand(lo, hi) : Math.max(gapH/2, Math.min(h-gapH/2, py));
        makeObstacle(w, gapY);
      }

      // numerator shares the same ratio as obstacleSpeed's 0.30 constant,
      // so pixel spacing between obstacles stays ~constant across the
      // 0.8\u20131.6 range (same trick used for DINOJUMP's spawnEvery); the
      // floor only engages right at the top of that range.
      const spawnEvery = Math.max(650, 950 / ctx.speedMul);
      let spawnTimer = null;
      function trySpawn(){
        if(!alive) return;
        spawnObstacle();
        spawnTimer = setTimeout(trySpawn, spawnEvery);
      }

      let lastT = performance.now();
      function loop(t){
        if(!alive) return;
        const dt = t-lastT; lastT = t;

        if(goUp) py -= playerSpeed*dt;
        if(goDown) py += playerSpeed*dt;
        py = Math.max(playerR, Math.min(h-playerR, py));
        placePlayer();

        for(const o of obstacles){
          o.x -= obstacleSpeed*dt;
          o.el.style.left = o.x+'px';
        }

        for(const o of obstacles){
          if(o.x < px+playerR && o.x+o.w > px-playerR){
            const top = o.gapY - gapH/2, bottom = o.gapY + gapH/2;
            if(py-playerR < top || py+playerR > bottom){ alive=false; ctx.onLose(); return; }
          }
        }
        for(let i=obstacles.length-1;i>=0;i--){
          if(obstacles[i].x + obstacles[i].w < -10){ obstacles[i].el.remove(); obstacles.splice(i,1); }
        }
        MR.rafId = requestAnimationFrame(loop);
      }
      MR.rafId = requestAnimationFrame(loop);

      trySpawn();

      ctx.onCleanup = ()=>{
        alive = false;
        clearTimeout(spawnTimer);
        if(MR.rafId) cancelAnimationFrame(MR.rafId);
        window.removeEventListener('keyup', onKeyUp);
        obstacles.forEach(o=>o.el.remove());
      };
      // survive the whole round = win, handled by engine timeout
      ctx.survivalGame = true;
    }
  });


  MR.games.push({
    label: 'CLIMB',
    desc: 'Use left or right \u2014 arrow keys or tap either half of the screen, in any order \u2014 to scale the wall, sliding across its 7 lanes to dodge falling rocks, before the crumble below catches up. You can\u2019t move past the wall\u2019s outer edges.',
    word: 'CLIMB!',
    timeLimit: s => 7000 / s,
    start(ctx){
      const w = MR.screen.clientWidth - 26, h = MR.screen.clientHeight - 26;

      // The wall is now split into 7 horizontal lanes the climber can slide
      // between (left/right presses shift one lane at a time) to dodge the
      // falling rocks. preferredCellW is the ideal width per lane; on
      // narrow phones the whole strip shrinks to fit rather than overflow.
      const numLanesH = 7;
      const laneGapH = 6;
      const preferredCellW = 32;
      const laneW = Math.min(w - 10, numLanesH * preferredCellW + (numLanesH - 1) * laneGapH);
      const laneX = (w - laneW) / 2;
      const cellW = (laneW - (numLanesH - 1) * laneGapH) / numLanesH;
      function laneCenterX(i){ return i * (cellW + laneGapH) + cellW / 2; }

      const wrap = document.createElement('div');
      wrap.style.position = 'absolute';
      wrap.style.left = laneX+'px'; wrap.style.top = '0px';
      wrap.style.width = laneW+'px'; wrap.style.height = h+'px';
      wrap.style.background = 'var(--panel)';
      wrap.style.borderRadius = '10px';
      wrap.style.boxShadow = 'inset 0 0 0 1px var(--line)';
      wrap.style.overflow = 'hidden';
      MR.stage.appendChild(wrap);

      // Lane strips: drawn as separate cells (rather than one solid wall)
      // with a visible gap of the panel's background color between each,
      // so all 7 lanes read clearly at a glance.
      for(let i=0;i<numLanesH;i++){
        const laneCell = document.createElement('div');
        laneCell.style.position = 'absolute';
        laneCell.style.left = (i*(cellW+laneGapH))+'px';
        laneCell.style.top = '0'; laneCell.style.bottom = '0';
        laneCell.style.width = cellW+'px';
        laneCell.style.background = 'var(--bezel)';
        laneCell.style.borderRadius = '6px';
        laneCell.style.boxShadow = 'inset 0 0 0 1px var(--line)';
        wrap.appendChild(laneCell);
      }

      const danger = document.createElement('div');
      danger.style.position = 'absolute';
      danger.style.left = '0'; danger.style.bottom = '0';
      danger.style.width = laneW+'px'; danger.style.height = '0px';
      danger.style.background = 'var(--danger)';
      danger.style.opacity = '0.88';
      wrap.appendChild(danger);

      // One-time keyframe for the "your turn" pulse on the active grip.
      // Injected once into <head> and reused across rounds/games.
      if(!document.getElementById('climbGripPulseStyle')){
        const style = document.createElement('style');
        style.id = 'climbGripPulseStyle';
        style.textContent = '@keyframes climbGripPulse {'
          + '0%,100%{ transform: scaleX(1); }'
          + '50%{ transform: scaleX(1.22); }'
          + '}';
        document.head.appendChild(style);
      }

      const leftGrip = document.createElement('div');
      const rightGrip = document.createElement('div');
      const leftLabel = document.createElement('div');
      const rightLabel = document.createElement('div');
      [leftGrip, rightGrip].forEach(g=>{
        g.style.position = 'absolute';
        g.style.top = '0'; g.style.bottom = '0';
        g.style.width = '26px';
        g.style.borderRadius = '6px';
        g.style.transition = 'opacity 120ms ease, background 120ms ease, box-shadow 120ms ease';
        g.style.transformOrigin = 'center';
      });
      [leftLabel, rightLabel].forEach(l=>{
        l.style.position = 'absolute';
        l.style.top = '50%'; l.style.left = '50%';
        l.style.transform = 'translate(-50%,-50%)';
        l.style.fontWeight = '800';
        l.style.fontSize = '13px';
        l.style.transition = 'color 120ms ease';
        l.style.pointerEvents = 'none';
      });
      leftLabel.textContent = 'L';
      rightLabel.textContent = 'R';
      leftGrip.style.left = '4px';
      rightGrip.style.right = '4px';
      leftGrip.appendChild(leftLabel);
      rightGrip.appendChild(rightLabel);
      wrap.appendChild(leftGrip);
      wrap.appendChild(rightGrip);

      const playerR = Math.max(9, Math.min(13, Math.floor(cellW / 2) - 3));
      let currentLane = Math.floor(numLanesH / 2); // start in the middle lane
      const player = document.createElement('div');
      player.style.position = 'absolute';
      player.style.left = (laneCenterX(currentLane) - playerR)+'px';
      player.style.width = (playerR*2)+'px'; player.style.height = (playerR*2)+'px';
      player.style.borderRadius = '50%';
      player.style.background = 'var(--go)';
      player.style.boxShadow = '0 0 10px var(--go)';
      player.style.zIndex = '2';
      wrap.appendChild(player);

      const stageLabelEl = document.getElementById('stageLabel');
      function updateHud(){
        if(stageLabelEl) stageLabelEl.textContent = 'CLIMB \u00b7 ' + stepsClimbed + '/' + numSteps;
      }

      // 20 steps to climb: the wall requires exactly numSteps alternations
      // to reach the top — climbStep is derived from climbTarget so 20
      // successful alternations always reach the top, on any screen height.
      // climbTarget now tracks the full available wall height (h, minus a
      // small margin so the player dot doesn't clip the top edge) instead of
      // being capped at 220px — so the rungs spread out to actually span
      // the whole screen rather than stopping partway up it.
      // Deliberately NOT scaled by ctx.speedMul — same rationale as SWIM's
      // playerSpeed and CATCH's basketSpeed: how far a correct alternating
      // input moves you is a control-feel constant, not something that
      // should quietly get stingier as difficulty rises. Difficulty instead
      // comes entirely from dangerSpeed below: the crumble line below just
      // rises faster, demanding a quicker tempo of alternation rather than
      // a bigger payoff per input.
      const numSteps = 20;
      const climbTarget = Math.max(120, h - 30);
      const climbStep = climbTarget / numSteps;
      let stepsClimbed = 0;
      let py = 0;
      function placePlayer(){ player.style.bottom = py+'px'; }
      placePlayer();

      // 9 lane markers give a coarser visual guide up the wall, spaced
      // wider apart than the 20 actual gameplay steps (numLanes < numSteps,
      // so laneGap > climbStep) — drawing all 20 steps as rungs would be
      // too cramped to read. Lit continuously off py rather than off
      // stepsClimbed, since lanes and steps no longer share a 1:1 mapping.
      const numLanes = 9;
      const laneGap = climbTarget / numLanes;
      const rungInset = 30;
      const rungs = [];
      for(let i=1;i<=numLanes;i++){
        const rung = document.createElement('div');
        rung.style.position = 'absolute';
        rung.style.left = rungInset+'px';
        rung.style.width = Math.max(0, laneW - rungInset*2)+'px';
        rung.style.height = '3px';
        rung.style.bottom = (laneGap*i - 1)+'px';
        rung.style.background = 'var(--line)';
        rung.style.borderRadius = '2px';
        rung.style.zIndex = '1';
        wrap.appendChild(rung);
        rungs.push(rung);
      }
      function updateRungs(){
        rungs.forEach((rung, i)=>{
          rung.style.background = (py >= laneGap*(i+1) - 0.5) ? 'var(--go)' : 'var(--line)';
        });
      }
      updateRungs();

      function setGripState(grip, label, isActive){
        grip.style.opacity = isActive ? '1' : '0.35';
        grip.style.background = isActive ? '#ffb020' : 'var(--line)';
        grip.style.boxShadow = 'none';
        grip.style.animation = isActive ? 'climbGripPulse 0.55s ease-in-out infinite' : 'none';
        label.style.color = isActive ? 'var(--bg)' : 'rgba(242,240,234,0.4)';
      }
      // Grips no longer show a "required next side" — either side can be
      // used at any time. They're only dimmed when the climber is pressed
      // up against that edge of the wall and there's nowhere left to move.
      function updateGrip(){
        setGripState(leftGrip, leftLabel, currentLane > 0);
        setGripState(rightGrip, rightLabel, currentLane < numLanesH - 1);
      }
      updateGrip();

      let alive = true;
      function attemptClimb(side){
        if(!alive) return;
        // No forced alternation — left or right can be used at any time.
        // The only restriction is the wall itself: you can't move further
        // left from the leftmost lane, or further right from the rightmost.
        if(side === 'L' && currentLane === 0) return;
        if(side === 'R' && currentLane === numLanesH - 1) return;
        currentLane = side === 'L' ? currentLane - 1 : currentLane + 1;
        player.style.left = (laneCenterX(currentLane) - playerR)+'px';
        stepsClimbed = Math.min(numSteps, stepsClimbed + 1);
        py = stepsClimbed * climbStep;
        placePlayer();
        updateGrip();
        updateRungs();
        updateHud();
        if(stepsClimbed >= numSteps){
          alive = false;
          ctx.onWin();
        }
      }

      MR.setKeyHandler((e)=>{
        if(e.repeat) return;
        if(e.key==='ArrowLeft') attemptClimb('L');
        if(e.key==='ArrowRight') attemptClimb('R');
      });

      const leftZone = document.createElement('div');
      const rightZone = document.createElement('div');
      [leftZone, rightZone].forEach(z=>{
        z.style.position='absolute'; z.style.top='0'; z.style.bottom='0'; z.style.width='50%';
        z.style.cursor='pointer'; z.style.touchAction='none';
      });
      leftZone.style.left='0';
      rightZone.style.right='0';
      leftZone.addEventListener('pointerdown', ()=> attemptClimb('L'));
      rightZone.addEventListener('pointerdown', ()=> attemptClimb('R'));
      MR.stage.appendChild(leftZone);
      MR.stage.appendChild(rightZone);

      updateHud();

      // The actual difficulty knob: the crumble line's rise speed, tuned so
      // it crosses the whole wall in ~6.3s at speedMul=1. Scaled
      // proportionally to climbTarget (rather than a fixed pixel constant
      // tuned for the old 220px-max wall) so a taller wall doesn't make the
      // crumble comparatively slower.
      const dangerSpeed = (climbTarget/220) * 0.035 * ctx.speedMul; // px/ms
      // Head start: the crumble doesn't start rising at all until this many
      // ms into the round, so there's always a guaranteed beat before it's
      // a threat. Scales inversely with speedMul like the round's own
      // timeLimit does, so faster/shorter rounds still get a proportional
      // head start rather than losing it to the clock.
      const dangerHeadStartMs = 1500 / ctx.speedMul;

      // A few loose rocks drop from the top of the wall over the course of
      // the round. Like the crumble below, getting hit ends the round —
      // this is a second way to fail, not just extra friction. Fall speed
      // scales gently with ctx.speedMul; spawn cadence stays roughly
      // constant so harder (and therefore shorter) rounds still only see
      // "a few" of them.
      const obstacles = [];
      const obstacleFallSpeed = 0.15 * ctx.speedMul; // px/ms
      let spawnTimer = null;
      function spawnObstacle(){
        if(!alive) return;
        const size = Math.min(cellW - 6, MR.rand(12, 18));
        const lane = Math.floor(MR.rand(0, numLanesH));
        const x = laneCenterX(lane) - size/2;
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.left = x+'px';
        el.style.width = size+'px'; el.style.height = size+'px';
        el.style.background = 'var(--danger)';
        el.style.borderRadius = '3px';
        el.style.transform = 'rotate(45deg)';
        el.style.boxShadow = '0 0 8px var(--danger)';
        el.style.zIndex = '3';
        wrap.appendChild(el);
        obstacles.push({ el, lane, size, y: h + size });
        spawnTimer = setTimeout(spawnObstacle, MR.rand(1000, 1700));
      }
      spawnTimer = setTimeout(spawnObstacle, MR.rand(500, 900));

      let lastT = performance.now();
      const startT = lastT;
      function loop(t){
        if(!alive) return;
        const dt = t-lastT; lastT = t;
        // dangerHeight is now the single source of truth for both what's
        // drawn AND what's checked for collision — previously the display
        // used dangerY+dangerOffset (effectively starting from 0 immediately)
        // while collision checked the raw, still-deeply-negative dangerY
        // against py. That mismatch meant the red bar could visibly rise
        // well past the player without ever registering a hit, since the
        // real kill threshold sat far above what was on screen. Driving both
        // off elapsed time removes that gap entirely.
        const elapsed = t - startT;
        const dangerHeight = Math.max(0, dangerSpeed * (elapsed - dangerHeadStartMs));
        danger.style.height = dangerHeight+'px';
        // Mercy period: lava can't kill until the player has cleared the
        // third step.
        if(stepsClimbed >= 3 && dangerHeight >= py){
          alive=false;
          player.style.background = 'var(--danger)';
          player.style.boxShadow = '0 0 14px var(--danger)';
          ctx.onLose();
          return;
        }

        for(let i=obstacles.length-1;i>=0;i--){
          const o = obstacles[i];
          o.y -= obstacleFallSpeed*dt;
          o.el.style.bottom = o.y+'px';
          if(o.lane === currentLane && Math.abs(o.y - py) < (playerR + o.size/2)){
            alive = false;
            player.style.background = 'var(--danger)';
            player.style.boxShadow = '0 0 14px var(--danger)';
            ctx.onLose();
            return;
          }
          if(o.y < -o.size){
            o.el.remove();
            obstacles.splice(i,1);
          }
        }

        MR.rafId = requestAnimationFrame(loop);
      }
      MR.rafId = requestAnimationFrame(loop);

      ctx.onCleanup = ()=>{
        alive = false;
        clearTimeout(spawnTimer);
        if(MR.rafId) cancelAnimationFrame(MR.rafId);
        obstacles.forEach(o=>o.el.remove());
      };
      // Success is either reaching the top before time runs out (py>=climbTarget
      // fires ctx.onWin() directly, above) or simply still being alive when the
      // clock runs out — i.e. not caught by the crumble and not hit by a rock.
      // survivalGame tells the engine to treat an un-ended round's timeout as a
      // win rather than its default loss.
      ctx.survivalGame = true;
    }
  });


  for(let i=CATEGORY_START;i<MR.games.length;i++) MR.games[i].category = 'motion';

})();
