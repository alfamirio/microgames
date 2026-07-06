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

      const player = MR.makeEl('box', { width: playerW+'px', background: 'var(--go)', left: px+'px' });
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
        MR.styleEl(player, { height: (state==='duck' ? duckH : standH)+'px', bottom: currentPlayerBottom()+'px' });
      }
      applyVisual();

      function doJump(){ if(state!=='jump'){ state='jump'; jumpT=0; } }
      function doDuck(){ if(state!=='jump'){ state='duck'; duckT=0; } }

      MR.setKeyHandler((e)=>{
        if(e.key==='ArrowUp') doJump();
        if(e.key==='ArrowDown') doDuck();
      });

      // tap zones live on elements created fresh each round, wiped by clearStage()
      const [topZone, bottomZone] = MR.splitZones(false);
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
        const el = MR.makeEl('box', { background: isBird ? 'var(--flash)' : 'var(--danger)', width: ow+'px', height: oh+'px', borderRadius: isBird ? '8px' : '4px', bottom: bottom+'px', left: x+'px' });
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
    label: 'SWIM',
    desc: 'Only up/down control \u2014 dodge the reef gaps as they scroll in. Arrow keys, or hold the top/bottom half of the screen.',
    word: 'SWIM!',
    timeLimit: s => 5200 / s,
    start(ctx){
      const w = MR.screen.clientWidth - 26, h = MR.screen.clientHeight - 26;
      const playerR = 12;
      const px = Math.round(w * 0.22); // fixed horizontal position, like DINOJUMP's runner
      let py = h/2;

      const player = MR.makeEl('', { position: 'absolute', width: (playerR*2)+'px', height: (playerR*2)+'px', borderRadius: '50%', background: 'var(--go)', boxShadow: '0 0 10px var(--go)' });
      MR.stage.appendChild(player);
      function placePlayer(){
        MR.styleEl(player, { left: (px-playerR)+'px', top: (py-playerR)+'px' });
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
      const [topZone, bottomZone] = MR.splitZones(false);
      MR.holdable(topZone, ()=>{ goUp = true; }, ()=>{ goUp = false; });
      MR.holdable(bottomZone, ()=>{ goDown = true; }, ()=>{ goDown = false; });
      MR.stage.appendChild(topZone);
      MR.stage.appendChild(bottomZone);

      const obstacles = [];
      let alive = true;
      const obW = 18;
      const gapH = Math.max(70, h*0.32);
      const obstacleSpeed = 0.30 * ctx.speedMul; // px/ms — the actual difficulty knob

      function makeObstacle(x, gapY){
        const wrap = MR.makeEl('', { position: 'absolute', left: x+'px', top: '0px', width: obW+'px', height: h+'px' });
        const top = MR.makeEl('box', { position: 'absolute', left: '0', top: '0', width: obW+'px', height: Math.max(0, gapY-gapH/2)+'px', background: 'var(--danger)' });
        const bottom = MR.makeEl('box', { position: 'absolute', left: '0', top: (gapY+gapH/2)+'px', width: obW+'px', height: Math.max(0, h-(gapY+gapH/2))+'px', background: 'var(--danger)' });
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
      const { styleEl } = MR;
      const w = MR.screen.clientWidth - 26, h = MR.screen.clientHeight - 26;

      // The wall is split into 7 horizontal lanes the climber can slide
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

      const wrap = MR.makeEl('', {
        position:'absolute', left: laneX+'px', top:'0px',
        width: laneW+'px', height: h+'px',
        background:'var(--panel)', borderRadius:'10px',
        boxShadow:'inset 0 0 0 1px var(--line)', overflow:'hidden'
      });
      MR.stage.appendChild(wrap);

      // Lane strips: drawn as separate cells (rather than one solid wall)
      // with a visible gap of the panel's background color between each,
      // so all 7 lanes read clearly at a glance.
      for(let i=0;i<numLanesH;i++){
        wrap.appendChild(MR.makeEl('', {
          position:'absolute', left:(i*(cellW+laneGapH))+'px', top:'0', bottom:'0',
          width: cellW+'px', background:'var(--bezel)', borderRadius:'6px',
          boxShadow:'inset 0 0 0 1px var(--line)'
        }));
      }

      const danger = MR.makeEl('', {
        position:'absolute', left:'0', bottom:'0',
        width: laneW+'px', height:'0px', background:'var(--danger)', opacity:'0.88'
      });
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

      // Grip + its "L"/"R" label are built together since both sides are
      // identical apart from which screen edge they sit on.
      function makeGrip(text, edgeStyle){
        const label = MR.makeEl('', {
          position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
          fontWeight:'800', fontSize:'13px', transition:'color 120ms ease', pointerEvents:'none'
        });
        label.textContent = text;
        const grip = MR.makeEl('', {
          position:'absolute', top:'0', bottom:'0', width:'26px', borderRadius:'6px',
          transition:'opacity 120ms ease, background 120ms ease, box-shadow 120ms ease',
          transformOrigin:'center', ...edgeStyle
        });
        grip.appendChild(label);
        wrap.appendChild(grip);
        return { grip, label };
      }
      const { grip: leftGrip, label: leftLabel } = makeGrip('L', { left:'4px' });
      const { grip: rightGrip, label: rightLabel } = makeGrip('R', { right:'4px' });

      const playerR = Math.max(9, Math.min(13, Math.floor(cellW / 2) - 3));
      let currentLane = Math.floor(numLanesH / 2); // start in the middle lane
      const player = MR.makeEl('', {
        position:'absolute', left:(laneCenterX(currentLane) - playerR)+'px',
        width:(playerR*2)+'px', height:(playerR*2)+'px', borderRadius:'50%',
        background:'var(--go)', boxShadow:'0 0 10px var(--go)', zIndex:'2'
      });
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
        const rung = MR.makeEl('', {
          position:'absolute', left: rungInset+'px',
          width: Math.max(0, laneW - rungInset*2)+'px', height:'3px',
          bottom:(laneGap*i - 1)+'px', background:'var(--line)',
          borderRadius:'2px', zIndex:'1'
        });
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
        MR.styleEl(grip, { opacity: isActive ? '1' : '0.35', background: isActive ? '#ffb020' : 'var(--line)', boxShadow: 'none', animation: isActive ? 'climbGripPulse 0.55s ease-in-out infinite' : 'none' });
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

      const [leftZone, rightZone] = MR.splitZones(true);
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
        const el = MR.makeEl('', {
          position:'absolute', left:(laneCenterX(lane) - size/2)+'px',
          width: size+'px', height: size+'px', background:'var(--danger)',
          borderRadius:'3px', transform:'rotate(45deg)',
          boxShadow:'0 0 8px var(--danger)', zIndex:'3'
        });
        wrap.appendChild(el);
        obstacles.push({ el, lane, size, y: h + size });
        spawnTimer = setTimeout(spawnObstacle, MR.rand(1000, 1700));
      }
      spawnTimer = setTimeout(spawnObstacle, MR.rand(500, 900));

      // Shared lose path for both the crumble and a falling rock.
      function die(){
        alive = false;
        styleEl(player, { background:'var(--danger)', boxShadow:'0 0 14px var(--danger)' });
        ctx.onLose();
      }

      let lastT = performance.now();
      const startT = lastT;
      function loop(t){
        if(!alive) return;
        const dt = t-lastT; lastT = t;
        // dangerHeight is the single source of truth for both what's drawn
        // AND what's checked for collision — driving both off elapsed time
        // keeps the visible red bar and the real kill threshold in sync.
        const elapsed = t - startT;
        const dangerHeight = Math.max(0, dangerSpeed * (elapsed - dangerHeadStartMs));
        danger.style.height = dangerHeight+'px';
        // Mercy period: lava can't kill until the player has cleared the
        // third step.
        if(stepsClimbed >= 3 && dangerHeight >= py){ die(); return; }

        for(let i=obstacles.length-1;i>=0;i--){
          const o = obstacles[i];
          o.y -= obstacleFallSpeed*dt;
          o.el.style.bottom = o.y+'px';
          if(o.lane === currentLane && Math.abs(o.y - py) < (playerR + o.size/2)){
            die();
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

  MR.games.push({
    label: 'LANES',
    desc: 'Switch lanes to dodge the falling blocks.',
    word: 'DODGE THE LANES',
    timeLimit: s => 1500/s,
    start(ctx){
      const w = MR.screen.clientWidth - 36, h = MR.screen.clientHeight - 36;
      const laneCount = 5;
      const dangerCount = 3;
      const laneWidth = w/laneCount;
      let playerLane = Math.floor(laneCount/2);

      const lanesWrap = MR.makeEl('', { position: 'absolute', inset: '0', display: 'flex' });
      for(let i=0;i<laneCount;i++){
        const lane = MR.makeEl('', { flex: '1', borderLeft: i>0 ? '1px dashed var(--line)' : 'none', cursor: 'pointer' });
        lane.addEventListener('click', ()=>{ playerLane=i; updatePlayer(); });
        lanesWrap.appendChild(lane);
      }
      MR.stage.appendChild(lanesWrap);

      const allLanes = Array.from({length:laneCount}, (_,i)=>i);
      for(let i=allLanes.length-1;i>0;i--){
        const j = Math.floor(Math.random()*(i+1));
        [allLanes[i], allLanes[j]] = [allLanes[j], allLanes[i]];
      }
      const dangerLanes = allLanes.slice(0, dangerCount);

      const blocks = dangerLanes.map(laneIdx=>{
        const block = MR.makeEl('box', { width: (laneWidth-16)+'px', height: '26px', background: 'var(--danger)', top: '-30px', left: (laneIdx*laneWidth+8)+'px' });
        MR.stage.appendChild(block);
        return block;
      });

      const player = MR.makeEl('box', { width: '30px', height: '30px', background: 'var(--go)', bottom: '10px' });
      MR.stage.appendChild(player);

      function updatePlayer(){
        player.style.left = (playerLane*laneWidth + laneWidth/2 - 15)+'px';
      }
      updatePlayer();

      MR.setKeyHandler((e)=>{
        if(e.key==='ArrowLeft') playerLane = Math.max(0, playerLane-1);
        if(e.key==='ArrowRight') playerLane = Math.min(laneCount-1, playerLane+1);
        updatePlayer();
      });

      let alive = true;
      let by = -30;
      let lastT = performance.now();
      function loop(t){
        if(!alive) return;
        const dt = t-lastT; lastT=t;
        by += 0.50*ctx.speedMul*dt;
        blocks.forEach(block=>{ block.style.top = by+'px'; });
        if(by+26 >= h-10){
          alive=false;
          if(dangerLanes.includes(playerLane)) ctx.onLose(); else ctx.onWin();
          return;
        }
        MR.rafId = requestAnimationFrame(loop);
      }
      MR.rafId = requestAnimationFrame(loop);
      ctx.onCleanup = ()=>{ alive=false; if(MR.rafId) cancelAnimationFrame(MR.rafId); };
    }
  });


  MR.games.push({
    label: 'DODGE',
    desc: 'Move side to side to dodge the falling blocks.',
    word: 'DODGE!',
    timeLimit: s => 3600/s,
    start(ctx){
      const w = MR.screen.clientWidth - 36, h = MR.screen.clientHeight - 36;
      const player = MR.makeEl('box', { width: '34px', height: '34px', background: 'var(--go)' });
      let px = w/2 - 17;
      MR.styleEl(player, { left: px+'px', bottom: '10px' });
      MR.stage.appendChild(player);

      const blocks = [];
      let alive = true;
      let elapsed = 0;
      const spawnEvery = 320 / ctx.speedMul;
      let sinceSpawn = 0;

      function spawnBlock(){
        const bx = MR.rand(0, w-30);
        const b = MR.makeEl('box', { width: '30px', height: '16px', background: 'var(--danger)', left: bx+'px', top: '-16px' });
        MR.stage.appendChild(b);
        blocks.push({el:b, x:bx, y:-16});
      }

      function move(dx){
        px = Math.max(0, Math.min(w-34, px+dx));
        player.style.left = px+'px';
      }
      MR.setKeyHandler((e)=>{
        if(e.key==='ArrowLeft') move(-28);
        if(e.key==='ArrowRight') move(28);
      });
      // tap zones live on an element created fresh each round, so they're
      // wiped by clearStage() and never pile up across repeated rounds
      const leftZone = MR.makeEl('', { position: 'absolute', top: '0', bottom: '0', width: '50%', cursor: 'pointer', left: '0' });
      const rightZone = MR.makeEl('', { position: 'absolute', top: '0', bottom: '0', width: '50%', cursor: 'pointer', right: '0' });
      leftZone.addEventListener('click', ()=>move(-34));
      rightZone.addEventListener('click', ()=>move(34));
      MR.stage.appendChild(leftZone);
      MR.stage.appendChild(rightZone);

      let lastT = performance.now();
      function loop(t){
        if(!alive) return;
        const dt = t-lastT; lastT=t;
        sinceSpawn += dt;
        if(sinceSpawn > spawnEvery){ sinceSpawn=0; spawnBlock(); }
        const speed = 0.40 * ctx.speedMul;
        for(const b of blocks){
          b.y += speed*dt;
          b.el.style.top = b.y+'px';
        }
        // collision
        for(const b of blocks){
          if(b.y+16 > h-10 && b.y < h+10){
            if(b.x < px+34 && b.x+30 > px){
              alive=false; ctx.onLose(); return;
            }
          }
        }
        for(let i=blocks.length-1;i>=0;i--){
          if(blocks[i].y > h){ blocks[i].el.remove(); blocks.splice(i,1); }
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
    label: 'ORBIT',
    desc: 'Keep the dot inside the ring, dodge the asteroids crossing the screen, and steer clear of the fixed obstacle sitting on the ring — hold up/down (or the tap zones) to nudge its orbit in or out as it drifts.',
    word: 'HOLD THE ORBIT',
    timeLimit: s => 5200/s,
    start(ctx){
      const w = MR.screen.clientWidth, h = MR.screen.clientHeight;
      const cx = w/2, cy = h/2;
      const targetR = Math.min(w,h) * 0.28;
      const tolerance = Math.min(w,h) * 0.07; // half-width of the safe band
      const hardOut = tolerance * 3.4; // deviation from target that's an instant bust

      // safe-band ring, drawn once and never touched again — only the
      // orbiting dot's color communicates in/out-of-band state as it moves
      const band = MR.makeEl('', { position: 'absolute', left: (cx-targetR-tolerance)+'px', top: (cy-targetR-tolerance)+'px', width: (2*(targetR+tolerance))+'px', height: (2*(targetR+tolerance))+'px', borderRadius: '50%', boxShadow: 'inset 0 0 0 '+(2*tolerance)+'px rgba(62,245,192,0.14)', border: '1px solid rgba(62,245,192,0.4)' });
      MR.stage.appendChild(band);

      // still pivot marker at the center
      const pivot = MR.makeEl('dot', { width: '6px', height: '6px', background: 'var(--dim)', left: (cx-3)+'px', top: (cy-3)+'px' });
      MR.stage.appendChild(pivot);

      const dot = MR.makeEl('dot', { width: '22px', height: '22px' });
      MR.stage.appendChild(dot);

      let r = targetR;
      let theta = Math.random()*Math.PI*2;
      const angularSpeed = 0.0016 * ctx.speedMul; // rad/ms — the orbit itself speeds up with difficulty

      // one static obstacle, fixed in place right on the target ring — the
      // orbit passes through its spot every lap, so it's a hazard the
      // player learns and times for, distinct from the crossing asteroids
      const staticSize = 20;
      const staticHitDist = staticSize/2 + 11 + 3; // obstacle radius + dot radius + a little buffer
      const staticAngle = theta + Math.PI + MR.rand(-0.4,0.4); // opposite the dot's start, so it isn't an instant hit
      // radius wanders anywhere inside the safe band (with a little inset so
      // it doesn't visually poke past the band's own edge), not just dead
      // center on the ring
      const staticInset = staticSize/2;
      const staticRange = Math.max(4, tolerance-staticInset);
      const staticR = targetR + MR.rand(-staticRange, staticRange);
      const staticX = cx + Math.cos(staticAngle)*staticR;
      const staticY = cy + Math.sin(staticAngle)*staticR;
      const staticEl = MR.makeEl('', { position: 'absolute', width: staticSize+'px', height: staticSize+'px', left: (staticX-staticSize/2)+'px', top: (staticY-staticSize/2)+'px', borderRadius: '50%', background: 'var(--life)', boxShadow: '0 0 10px rgba(181,101,245,0.65)' });
      MR.stage.appendChild(staticEl);

      // asteroids that spawn off one edge of the screen and fly straight
      // across to roughly the opposite side — genuinely crossing the play
      // area (including the orbit itself) rather than just sitting still,
      // so avoiding one means timing a radius dodge to whenever it happens
      // to be passing through
      const astSize = 16;
      const astHitDist = astSize/2 + 11 + 1; // asteroid radius + dot radius + a little buffer
      const asteroids = [];
      function spawnAsteroid(){
        const edge = Math.floor(Math.random()*4);
        const pad = astSize*1.5;
        let sx, sy, tx, ty;
        if(edge===0){ sx = MR.rand(0,w); sy = -pad; tx = MR.rand(0,w); ty = h+pad; }
        else if(edge===1){ sx = MR.rand(0,w); sy = h+pad; tx = MR.rand(0,w); ty = -pad; }
        else if(edge===2){ sx = -pad; sy = MR.rand(0,h); tx = w+pad; ty = MR.rand(0,h); }
        else { sx = w+pad; sy = MR.rand(0,h); tx = -pad; ty = MR.rand(0,h); }
        const dx = tx-sx, dy = ty-sy;
        const dist = Math.hypot(dx,dy);
        // shorter crossing time at higher difficulty = a visibly faster rock
        const crossTime = MR.rand(1500,2300) / ctx.speedMul;
        const speed = dist/crossTime; // px/ms
        const el = MR.makeEl('', { position: 'absolute', width: astSize+'px', height: astSize+'px', borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 10px rgba(255,62,127,0.6)' });
        MR.stage.appendChild(el);
        asteroids.push({ x: sx, y: sy, vx: dx/dist*speed, vy: dy/dist*speed, el });
      }
      let sinceSpawn = 0;
      // first one arrives a bit sooner than the steady-state gap, so a round
      // doesn't sit empty for its opening second; steady-state gap tightens
      // (more asteroids in flight at once) as difficulty climbs
      let nextSpawnGap = MR.rand(1000,1600) / ctx.speedMul;

      // the radius drifts on its own via frequent, randomly re-rolled
      // impulses — both direction and strength reroll on a short, jittery
      // timer, so the push in/out is genuinely unpredictable rather than a
      // slow, telegraphed back-and-forth
      let driftV = 0; // px/ms, signed
      let sinceReroll = 999;
      const driftMax = 0.05 * ctx.speedMul; // px/ms, upper bound on drift speed

      // fixed, not scaled by ctx.speedMul — same rationale as BASKET's
      // basketSpeed: the player's own control feel should stay constant,
      // with difficulty showing up in how aggressively the radius drifts
      // instead of in how sluggish the player's counter-nudge feels.
      const nudgeSpeed = 0.075; // px/ms

      let holdOut = false, holdIn = false;
      let dotCx = 0, dotCy = 0;

      function place(){
        const x = cx + Math.cos(theta)*r;
        const y = cy + Math.sin(theta)*r;
        dotCx = x; dotCy = y;
        MR.styleEl(dot, { left: (x-11)+'px', top: (y-11)+'px' });
        const dev = Math.abs(r-targetR);
        const inBand = dev <= tolerance;
        dot.style.background = inBand ? 'var(--go)' : (dev > hardOut ? 'var(--danger)' : 'var(--flash)');
        // only counts as a win at the buzzer if the dot is actually inside
        // the safe band right then — being out in the yellow/red when time
        // runs out should not silently succeed
        ctx.stopIsWin = inBand;
      }
      place();

      function onKeyDown(e){
        if(e.key==='ArrowUp') holdOut = true;
        if(e.key==='ArrowDown') holdIn = true;
      }
      function onKeyUp(e){
        if(e.key==='ArrowUp') holdOut = false;
        if(e.key==='ArrowDown') holdIn = false;
      }
      MR.setKeyHandler(onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      // tap-and-hold zones, top half nudges the orbit out, bottom half in —
      // wiped along with everything else in #stage by clearStage()
      const outZone = MR.makeEl('', { position: 'absolute', left: '0', right: '0', height: '50%', cursor: 'pointer', touchAction: 'none', display: 'flex', justifyContent: 'center', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(242,240,234,0.16)', top: '0', alignItems: 'flex-start', paddingTop: '10px' });
      outZone.textContent = '↑ out';
      const inZone = MR.makeEl('', { position: 'absolute', left: '0', right: '0', height: '50%', cursor: 'pointer', touchAction: 'none', display: 'flex', justifyContent: 'center', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(242,240,234,0.16)', bottom: '0', alignItems: 'flex-end', paddingBottom: '10px' });
      inZone.textContent = '↓ in';
      outZone.addEventListener('pointerdown', ()=>{ holdOut = true; });
      inZone.addEventListener('pointerdown', ()=>{ holdIn = true; });
      function releaseOut(){ holdOut = false; }
      function releaseIn(){ holdIn = false; }
      outZone.addEventListener('pointerup', releaseOut);
      outZone.addEventListener('pointerleave', releaseOut);
      outZone.addEventListener('pointercancel', releaseOut);
      inZone.addEventListener('pointerup', releaseIn);
      inZone.addEventListener('pointerleave', releaseIn);
      inZone.addEventListener('pointercancel', releaseIn);
      MR.stage.appendChild(outZone);
      MR.stage.appendChild(inZone);

      let alive = true;
      let lastT = performance.now();
      function loop(t){
        if(!alive) return;
        const dt = t-lastT; lastT = t;

        theta += angularSpeed*dt;

        sinceReroll += dt;
        if(sinceReroll > MR.rand(180,420)){
          driftV = MR.rand(-driftMax, driftMax);
          sinceReroll = 0;
        }
        r += driftV*dt;

        const nudge = (holdOut?1:0) - (holdIn?1:0);
        if(nudge !== 0) r += nudge*nudgeSpeed*dt;

        const minR = 14, maxR = Math.min(w,h)/2 - 14;
        r = Math.max(minR, Math.min(maxR, r));

        place();

        if(Math.abs(r-targetR) > hardOut){ alive=false; ctx.onLose(); return; }

        {
          const dx = dotCx-staticX, dy = dotCy-staticY;
          if(dx*dx + dy*dy < staticHitDist*staticHitDist){ alive=false; ctx.onLose(); return; }
        }

        sinceSpawn += dt;
        if(sinceSpawn > nextSpawnGap){
          spawnAsteroid();
          sinceSpawn = 0;
          nextSpawnGap = MR.rand(1400,2200) / ctx.speedMul;
        }
        for(let i=asteroids.length-1;i>=0;i--){
          const a = asteroids[i];
          a.x += a.vx*dt; a.y += a.vy*dt;
          a.el.style.left = (a.x-astSize/2)+'px';
          a.el.style.top = (a.y-astSize/2)+'px';
          if(a.x < -astSize*3 || a.x > w+astSize*3 || a.y < -astSize*3 || a.y > h+astSize*3){
            a.el.remove();
            asteroids.splice(i,1);
            continue;
          }
          const dx = dotCx-a.x, dy = dotCy-a.y;
          if(dx*dx + dy*dy < astHitDist*astHitDist){ alive=false; ctx.onLose(); return; }
        }

        MR.rafId = requestAnimationFrame(loop);
      }
      MR.rafId = requestAnimationFrame(loop);
      ctx.onCleanup = ()=>{
        alive=false;
        if(MR.rafId) cancelAnimationFrame(MR.rafId);
        window.removeEventListener('keyup', onKeyUp);
      };
      // timeout outcome is decided dynamically above via ctx.stopIsWin,
      // which tracks whether the dot is inside the safe band at that
      // instant; hitting an asteroid, the static obstacle, or busting the
      // hard-out deviation ends the round immediately via ctx.onLose()
    }
  });


  for(let i=CATEGORY_START;i<MR.games.length;i++) MR.games[i].category = 'motion-runner';

})();
