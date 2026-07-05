(function(){
  "use strict";
  const MR = window.MR;
  const CATEGORY_START = MR.games.length;

  // REFLEX / MOVE -- steering, precision-timing, and small dodge mechanics

  MR.games.push({
    label: 'BALANCE',
    desc: 'Nudge left/right to keep the drifting ball centered.',
    word: 'STAY CENTERED',
    timeLimit: s => 3800/s,
    start(ctx){
      const w = MR.screen.clientWidth - 36;
      const track = MR.makeEl('', { position: 'absolute', left: '18px', right: '18px', top: '50%', height: '10px', marginTop: '-5px', background: 'var(--bezel)', borderRadius: '6px', boxShadow: 'inset 0 0 0 1px var(--line)' });
      MR.stage.appendChild(track);

      const centerZone = MR.makeEl('', { position: 'absolute', left: '42%', width: '16%', top: '0', bottom: '0', background: 'var(--go)', opacity: '0.35', borderRadius: '6px' });
      track.appendChild(centerZone);

      const ball = MR.makeEl('', { position: 'absolute', width: '22px', height: '22px', borderRadius: '50%', background: 'var(--flash)', top: '-6px' });
      track.appendChild(ball);

      let posPct = 50;
      let drift = MR.rand(-1,1) < 0 ? -0.55 : 0.55;
      let alive = true;

      function move(dx){ posPct = Math.max(0, Math.min(100, posPct+dx)); }

      const leftZone = MR.makeEl('', { position: 'absolute', top: '0', bottom: '0', width: '50%', cursor: 'pointer', left: '0' });
      const rightZone = MR.makeEl('', { position: 'absolute', top: '0', bottom: '0', width: '50%', cursor: 'pointer', right: '0' });
      leftZone.addEventListener('click', ()=>move(-9));
      rightZone.addEventListener('click', ()=>move(9));
      MR.stage.appendChild(leftZone);
      MR.stage.appendChild(rightZone);

      MR.setKeyHandler((e)=>{
        if(e.key==='ArrowLeft') move(-9);
        if(e.key==='ArrowRight') move(9);
      });

      let lastT = performance.now();
      function loop(t){
        if(!alive) return;
        const dt = (t-lastT); lastT = t;
        posPct += drift * (dt/1000) * 10 * ctx.speedMul;
        if(Math.random() < 0.01) drift = MR.rand(-1,1) < 0 ? -0.7 : 0.7;
        ball.style.left = 'calc(' + posPct + '% - 11px)';
        if(posPct <= 0 || posPct >= 100){ alive=false; ctx.onLose(); return; }
        MR.rafId = requestAnimationFrame(loop);
      }
      MR.rafId = requestAnimationFrame(loop);
      ctx.onCleanup = ()=>{ alive=false; if(MR.rafId) cancelAnimationFrame(MR.rafId); };
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
    label: 'AIM',
    desc: 'Stop the sliding marker while it is inside the green zone.',
    word: 'STOP IN THE ZONE',
    timeLimit: s => 3400/s,
    start(ctx){
      const wrap = MR.makeEl('', { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '22px' });

      const track = MR.makeEl('', { position: 'relative', width: '100%', height: '16px', background: 'var(--bezel)', borderRadius: '8px', boxShadow: 'inset 0 0 0 1px var(--line)' });

      const zoneStart = MR.rand(30,60);
      const zoneWidth = 16;
      const zone = MR.makeEl('', { position: 'absolute', top: '0', bottom: '0', left: zoneStart+'%', width: zoneWidth+'%', background: 'var(--go)', borderRadius: '8px' });
      track.appendChild(zone);

      const marker = MR.makeEl('', { position: 'absolute', top: '-5px', width: '6px', height: '26px', background: 'var(--flash)', borderRadius: '3px' });
      track.appendChild(marker);

      wrap.appendChild(track);

      const btn = MR.makeEl('cell', { padding: '14px 30px', cursor: 'pointer', fontFamily: 'var(--display)', fontSize: '16px' });
      btn.textContent='STOP';
      wrap.appendChild(btn);
      MR.stage.appendChild(wrap);

      let pos = 0, dir = 1, alive = true;
      let lastT = performance.now();
      function loop(t){
        if(!alive) return;
        const dt = (t-lastT); lastT = t;
        pos += dir * dt * 0.09 * ctx.speedMul;
        if(pos > 100){ pos=100; dir=-1; }
        if(pos < 0){ pos=0; dir=1; }
        marker.style.left = pos+'%';
        MR.rafId = requestAnimationFrame(loop);
      }
      MR.rafId = requestAnimationFrame(loop);
      ctx.onCleanup = ()=>{ alive=false; if(MR.rafId) cancelAnimationFrame(MR.rafId); };

      btn.addEventListener('click', ()=>{
        if(!alive) return;
        alive = false;
        if(MR.rafId) cancelAnimationFrame(MR.rafId);
        if(pos >= zoneStart && pos <= zoneStart+zoneWidth) ctx.onWin();
        else ctx.onLose();
      });
    }
  });


  MR.games.push({
    label: 'BALLOON',
    desc: 'Hold to fill the gauge, release inside the green zone.',
    word: 'FILL & RELEASE',
    timeLimit: s => 3600/s,
    start(ctx){
      const wrap = MR.makeEl('', { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '26px', width: '100%', height: '100%' });

      const gauge = MR.makeEl('', { position: 'relative', width: '30px', height: '72%', background: 'var(--bezel)', borderRadius: '8px', boxShadow: 'inset 0 0 0 1px var(--line)', overflow: 'hidden' });

      const zoneWidth = 18;
      const zoneStart = MR.rand(50, 74);
      const zone = MR.makeEl('', { position: 'absolute', left: '0', right: '0', bottom: zoneStart+'%', height: zoneWidth+'%', background: 'var(--go)', opacity: '0.4' });
      gauge.appendChild(zone);

      const fill = MR.makeEl('', { position: 'absolute', left: '0', right: '0', bottom: '0', height: '0%', background: 'var(--flash)' });
      gauge.appendChild(fill);

      const balloon = MR.makeEl('', { width: '96px', height: '96px', borderRadius: '50%', background: 'var(--danger)', transformOrigin: 'center', transform: 'scale(0.55)', cursor: 'pointer', touchAction: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontWeight: '900', fontSize: '13px', color: '#0b0b10' });
      balloon.textContent='HOLD';

      wrap.appendChild(gauge);
      wrap.appendChild(balloon);
      MR.stage.appendChild(wrap);

      let pct = 0;
      let holding = false;
      let alive = true;
      let lastT = performance.now();

      function render(){
        fill.style.height = pct+'%';
        balloon.style.transform = 'scale(' + (0.55 + pct/100*0.95) + ')';
        balloon.textContent = (!holding && pct===0) ? 'HOLD' : '';
      }

      function pop(){
        alive = false;
        balloon.textContent = 'POP';
        if(MR.rafId) cancelAnimationFrame(MR.rafId);
        ctx.onLose();
      }

      function loop(t){
        if(!alive) return;
        const dt = t-lastT; lastT = t;
        if(holding){
          pct += dt * 0.05 * ctx.speedMul;
          if(pct >= 100){ pct = 100; render(); pop(); return; }
        }
        render();
        MR.rafId = requestAnimationFrame(loop);
      }
      MR.rafId = requestAnimationFrame(loop);

      const capture = MR.pointerCaptureTracker(balloon);
      balloon.addEventListener('pointerdown', (e)=>{
        if(!alive) return;
        holding = true;
        capture.onDown(e);
      });
      function release(e){
        capture.onUp(e);
        if(!alive || !holding) return;
        holding = false;
        alive = false;
        if(MR.rafId) cancelAnimationFrame(MR.rafId);
        if(pct >= zoneStart && pct <= zoneStart+zoneWidth) ctx.onWin();
        else ctx.onLose();
      }
      balloon.addEventListener('pointerup', release);
      balloon.addEventListener('pointercancel', release);

      ctx.onCleanup = ()=>{
        alive=false; holding=false;
        if(MR.rafId) cancelAnimationFrame(MR.rafId);
        // pop() can end the round via the timer while the balloon is still
        // physically held down, i.e. before any pointerup/pointercancel
        // fires — release() above never runs in that case, so do it here.
        capture.release();
      };
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
    label: 'RICOCHET',
    desc: 'Breakout paddle — arrow keys or tap left/right, keep the ball off the floor for the whole round.',
    word: 'BOUNCE!',
    timeLimit: s => 2000/s,
    start(ctx){
      const w = MR.screen.clientWidth - 36, h = MR.screen.clientHeight - 36;
      const paddleW = 58, paddleH = 10;
      const paddleBottom = 12; // distance from stage bottom
      let padX = w/2 - paddleW/2;

      const paddle = MR.makeEl('box', { width: paddleW+'px', height: paddleH+'px', background: 'var(--go)', bottom: paddleBottom+'px', left: padX+'px' });
      MR.stage.appendChild(paddle);

      function movePaddle(dx){
        padX = Math.max(0, Math.min(w-paddleW, padX+dx));
        paddle.style.left = padX+'px';
      }
      MR.setKeyHandler((e)=>{
        if(e.key==='ArrowLeft') movePaddle(-32);
        if(e.key==='ArrowRight') movePaddle(32);
      });
      // tap zones live on elements created fresh each round, wiped by clearStage()
      const leftZone = MR.makeEl('', { position: 'absolute', top: '0', bottom: '0', width: '50%', cursor: 'pointer', left: '0' });
      const rightZone = MR.makeEl('', { position: 'absolute', top: '0', bottom: '0', width: '50%', cursor: 'pointer', right: '0' });
      leftZone.addEventListener('click', ()=>movePaddle(-38));
      rightZone.addEventListener('click', ()=>movePaddle(38));
      MR.stage.appendChild(leftZone);
      MR.stage.appendChild(rightZone);

      const r = 7;
      const ball = MR.makeEl('dot', { width: (r*2)+'px', height: (r*2)+'px', background: 'var(--flash)' });
      MR.stage.appendChild(ball);

      // paddle sits near the bottom, in the same top-down coordinate space
      // (y=0 at the top of the stage) used for the ball's position/physics
      const paddleTopY = h - paddleBottom - paddleH;

      // ball serves toward the player first — it has to hit the paddle
      // before it can bounce back up toward the top of the field
      let bxp = w/2, byp = h*0.22;
      let baseSpeed = 0.30 * ctx.speedMul;
      const launchAngle = MR.rand(-0.5, 0.5);
      let vx = Math.sin(launchAngle) * baseSpeed;
      let vy = Math.cos(launchAngle) * baseSpeed;

      function placeBall(){
        MR.styleEl(ball, { left: (bxp-r)+'px', top: (byp-r)+'px' });
      }
      placeBall();

      let alive = true;
      let lastT = performance.now();
      function loop(t){
        if(!alive) return;
        const dt = t-lastT; lastT = t;
        bxp += vx*dt;
        byp += vy*dt;

        if(bxp - r < 0){ bxp = r; vx = Math.abs(vx); }
        if(bxp + r > w){ bxp = w - r; vx = -Math.abs(vx); }
        if(byp - r < 0){ byp = r; vy = Math.abs(vy); }

        // paddle bounce: only when moving downward and overlapping the
        // paddle's band, so a ball that's already past it can't re-trigger
        if(vy > 0 && byp + r >= paddleTopY && byp - r <= paddleTopY + paddleH &&
           bxp + r > padX && bxp - r < padX + paddleW){
          const hitOffset = Math.max(-1, Math.min(1, (bxp - (padX+paddleW/2)) / (paddleW/2)));
          const speedMag = Math.min(Math.hypot(vx,vy) * 1.04, baseSpeed * 1.9);
          const angle = hitOffset * 1.05; // radians off straight-up
          vx = Math.sin(angle) * speedMag;
          vy = -Math.abs(Math.cos(angle) * speedMag);
          byp = paddleTopY - r;
        }

        if(byp - r > h){ alive=false; ctx.onLose(); return; }

        placeBall();
        MR.rafId = requestAnimationFrame(loop);
      }
      MR.rafId = requestAnimationFrame(loop);
      ctx.onCleanup = ()=>{ alive=false; if(MR.rafId) cancelAnimationFrame(MR.rafId); };
      // survive the whole round without missing the ball = win
      ctx.survivalGame = true;
    }
  });


  MR.games.push({
    label: 'BASKET',
    desc: 'Hold left/right (arrow keys or the tap zones) to slide the basket. Catch enough green drops to win — let a red one land in it and you lose.',
    word: 'CATCH!',
    timeLimit: s => 5000/s,
    start(ctx){
      const w = MR.screen.clientWidth - 36, h = MR.screen.clientHeight - 36;
      const basketW = 54, basketH = 14;
      let bx = w/2 - basketW/2;
      const basketY = 10; // distance from bottom

      const basket = MR.makeEl('box', { width: basketW+'px', height: basketH+'px', background: 'var(--flash)', borderRadius: '4px 4px 10px 10px', bottom: basketY+'px', left: bx+'px' });
      MR.stage.appendChild(basket);

      // Continuous, hold-to-move control (rather than a fixed step per
      // keypress) — this is what makes "catch every drop" an achievable
      // guarantee rather than a matter of OS key-repeat timing: the basket
      // can reliably close any horizontal distance within a drop's fall
      // time (see spawnDrop's reachability math below).
      // Fixed, not scaled by ctx.speedMul — matches how other games (e.g.
      // DODGE's per-keypress step) keep the *control* feel constant and
      // let difficulty instead show up in obstacle speed/pacing. Scaling
      // this with speedMul was the other half of the old bug: it made the
      // basket faster at high difficulty too, but a human's reaction-time
      // overhead doesn't shrink to match, so the effective safety margin
      // quietly got worse the harder the game got.
      const basketSpeed = 0.40; // px/ms
      let goLeft = false, goRight = false;
      function onKeyDown(e){
        if(e.key==='ArrowLeft') goLeft = true;
        if(e.key==='ArrowRight') goRight = true;
      }
      function onKeyUp(e){
        if(e.key==='ArrowLeft') goLeft = false;
        if(e.key==='ArrowRight') goRight = false;
      }
      MR.setKeyHandler(onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      // tap-and-hold zones live on elements created fresh each round, wiped by clearStage()
      const leftZone = MR.makeEl('', { position: 'absolute', top: '0', bottom: '0', width: '50%', cursor: 'pointer', touchAction: 'none', left: '0' });
      const rightZone = MR.makeEl('', { position: 'absolute', top: '0', bottom: '0', width: '50%', cursor: 'pointer', touchAction: 'none', right: '0' });
      leftZone.addEventListener('pointerdown', ()=>{ goLeft = true; });
      rightZone.addEventListener('pointerdown', ()=>{ goRight = true; });
      function releaseLeft(){ goLeft = false; }
      function releaseRight(){ goRight = false; }
      leftZone.addEventListener('pointerup', releaseLeft);
      leftZone.addEventListener('pointerleave', releaseLeft);
      leftZone.addEventListener('pointercancel', releaseLeft);
      rightZone.addEventListener('pointerup', releaseRight);
      rightZone.addEventListener('pointerleave', releaseRight);
      rightZone.addEventListener('pointercancel', releaseRight);
      MR.stage.appendChild(leftZone);
      MR.stage.appendChild(rightZone);

      const MIN_GOOD = 2;
      let goodCaught = 0;
      const progress = MR.makeEl('', { position: 'absolute', top: '8px', left: '0', right: '0', textAlign: 'center', fontSize: '11px', letterSpacing: '0.08em', color: 'var(--dim)' });
      function renderProgress(){
        progress.innerHTML = 'CAUGHT <span style="color:var(--go);font-weight:700">' + goodCaught + '</span>/' + MIN_GOOD;
      }
      renderProgress();
      MR.stage.appendChild(progress);

      // Only ever one drop in flight at a time — with two drops falling
      // together the basket could need to be in two places at once, which
      // no control scheme fixes.
      //
      // Fall time is deliberately defined as a fraction of the round's own
      // time limit (both scale by ctx.speedMul the same way) rather than
      // derived from pixel-distance ÷ a fixed px/ms speed. That guarantees
      // roughly the same number of drop-cycles always fits inside a round
      // regardless of screen size or difficulty — otherwise the two clocks
      // can silently drift apart (e.g. on a tall screen the physical fall
      // distance is longer, so each drop takes noticeably longer, and far
      // fewer of them fit before the round's timer runs out than MIN_GOOD
      // actually needs).
      const dropSize = 22;
      const desiredFallTime = 700 / ctx.speedMul; // ms, ~6 cycles fit in the round's timeLimit
      const gapAfterResolve = 150 / ctx.speedMul;
      let active = null;
      let sinceResolved = 999;

      function spawnDrop(){
        const bad = Math.random() < 0.3;
        const fallDist = (h - basketY) + dropSize; // top spawn to below the catch band
        const fallSpeed = fallDist / desiredFallTime; // px/ms, tuned to land in exactly desiredFallTime
        const maxReach = basketSpeed * desiredFallTime * 0.6; // 0.6 = slack for reaction time
        const basketCenter = bx + basketW/2;
        const lo = Math.max(0, basketCenter - maxReach);
        const hi = Math.min(w-dropSize, basketCenter + maxReach - dropSize);
        const dx = hi > lo ? MR.rand(lo, hi) : Math.max(0, Math.min(w-dropSize, basketCenter - dropSize/2));
        const el = MR.makeEl(bad ? 'box' : 'dot', { width: dropSize+'px', height: dropSize+'px', background: bad ? 'var(--danger)' : 'var(--go)', left: dx+'px', top: '-'+dropSize+'px' });
        if(bad){ MR.styleEl(el, { transform: 'rotate(45deg)', borderRadius: '4px' }); }
        MR.stage.appendChild(el);
        active = { el, x:dx, y:-dropSize, bad, fallSpeed };
      }

      let alive = true;
      let lastT = performance.now();
      function loop(t){
        if(!alive) return;
        const dt = t-lastT; lastT = t;

        const dir = (goRight?1:0) - (goLeft?1:0);
        if(dir !== 0){
          bx = Math.max(0, Math.min(w-basketW, bx + dir*basketSpeed*dt));
          basket.style.left = bx+'px';
        }

        if(!active){
          sinceResolved += dt;
          if(sinceResolved > gapAfterResolve) spawnDrop();
        } else {
          active.y += active.fallSpeed*dt;
          active.el.style.top = active.y+'px';

          const basketBottomY = h - basketY;
          if(active.y + dropSize > basketBottomY - basketH && active.y < basketBottomY){
            const overlap = active.x < bx+basketW && active.x+dropSize > bx;
            if(overlap){
              if(active.bad){ alive=false; ctx.onLose(); return; }
              goodCaught++;
              renderProgress();
              ctx.stopIsWin = goodCaught >= MIN_GOOD;
              active.el.remove(); active = null; sinceResolved = 0;
            }
          }
          if(active && active.y > h){ active.el.remove(); active = null; sinceResolved = 0; }
        }
        MR.rafId = requestAnimationFrame(loop);
      }
      MR.rafId = requestAnimationFrame(loop);
      ctx.onCleanup = ()=>{
        alive=false;
        if(MR.rafId) cancelAnimationFrame(MR.rafId);
        window.removeEventListener('keyup', onKeyUp);
      };
      // default outcome if time runs out is decided dynamically above via
      // ctx.stopIsWin once enough greens are caught; catching a red ends
      // the round immediately via ctx.onLose()
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
      const staticSize = 30;
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
      const astSize = 24;
      const astHitDist = astSize/2 + 11 + 3; // asteroid radius + dot radius + a little buffer
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


  for(let i=CATEGORY_START;i<MR.games.length;i++) MR.games[i].category = 'reflex';

})();
