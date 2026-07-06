(function(){
  "use strict";
  const MR = window.MR;
  const CATEGORY_START = MR.games.length;

  // REFLEX / MOVE -- steering, precision-timing, and small dodge mechanics

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
    label: 'BRICK BREAKER',
    desc: 'Brick breaker paddle — arrow keys or tap left/right, keep the ball off the floor for the whole round.',
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
    label: 'MINI GOLF',
    desc: 'Mini golf swing: stop the POWER bar inside its green zone, then stop the PRECISION bar inside its (narrower) zone to sink the putt. Watch the ball actually fly the shot — miss POWER and it lands short or long; miss PRECISION and it curves off-line. Nail both and it flies straight into the cup. Tap/click SWING, or press space.',
    word: 'TEE OFF!',
    timeLimit: s => 3000 / s,
    start(ctx){
      const wrap = MR.makeEl('', { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' });

      const heading = MR.makeEl('prompt-word', { fontSize: '18px' });
      heading.textContent = '\u26F3 SINK THE PUTT';
      wrap.appendChild(heading);

      // ---- graphical course: the ball actually FLIES from the tee to its
      // resting spot in a parabolic arc,
      // rather than just rolling flat. Two things are decided independently:
      //  - POWER sets how far along the fairway it travels (x-axis) — miss
      //    the zone and it lands short or long, dead on-line.
      //  - PRECISION sets how much it curves off the straight line to the
      //    hole (y-axis, i.e. the "angle") — miss that zone and it hooks/
      //    slices away from dead-center, regardless of distance.
      // Both correct -> it flies straight into the cup. A weak/short power
      // reads visually as a stubby little dribble (barely leaves the tee),
      // matching a mistimed, "did basically nothing" swing.
      const BALL_START_X = 8;    // % from left — the tee
      const HOLE_X = 84;         // % from left — the cup
      const CENTER_Y = 50;       // % — dead-straight line to the hole
      const MAX_DEVIATE = 34;    // % max sideways curve on a badly-aimed shot
      const ARC_PEAK = 44;       // px, visual flight-arc height at full distance

      const course = MR.makeEl('', {
        position: 'relative', width: '100%', height: '104px',
        borderRadius: '10px', overflow: 'hidden',
        background: 'linear-gradient(180deg, #1f7a4d, #175f3c)',
        boxShadow: 'inset 0 0 0 1px var(--line), inset 0 0 18px rgba(0,0,0,0.35)'
      });
      for(let i=0;i<5;i++){
        course.appendChild(MR.makeEl('', {
          position: 'absolute', top: '0', bottom: '0', width: '20%', left: (i*20)+'%',
          background: i%2===0 ? 'rgba(255,255,255,0.035)' : 'transparent'
        }));
      }
      // straight dashed guide line showing the "ideal" flight path — makes
      // any sideways curve on a bad-precision shot easy to read at a glance
      const guide = MR.makeEl('', {
        position: 'absolute', left: BALL_START_X+'%', top: CENTER_Y+'%', width: (HOLE_X-BALL_START_X)+'%', height: '0',
        borderTop: '1px dashed rgba(255,255,255,0.18)', transform: 'translateY(-0.5px)'
      });
      course.appendChild(guide);
      const pin = MR.makeEl('', {
        position: 'absolute', left: HOLE_X+'%', top: CENTER_Y+'%', width: '2px', height: '30px',
        transform: 'translate(-50%, -100%)'
      });
      pin.appendChild(MR.makeEl('', { position: 'absolute', left: '0', bottom: '0', width: '2px', height: '100%', background: '#e8e4d8' }));
      pin.appendChild(MR.makeEl('', {
        position: 'absolute', left: '2px', top: '0', width: '0', height: '0',
        borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: '11px solid var(--danger)'
      }));
      course.appendChild(pin);
      const hole = MR.makeEl('', {
        position: 'absolute', left: HOLE_X+'%', top: CENTER_Y+'%', width: '15px', height: '15px',
        borderRadius: '50%', background: '#05100a',
        boxShadow: 'inset 0 2px 3px rgba(0,0,0,0.8), 0 0 0 2px rgba(255,255,255,0.15)',
        transform: 'translate(-50%,-50%)', transition: 'box-shadow .3s'
      });
      const shadow = MR.makeEl('', {
        position: 'absolute', left: BALL_START_X+'%', top: CENTER_Y+'%', width: '12px', height: '5px',
        borderRadius: '50%', background: 'rgba(0,0,0,0.45)', transform: 'translate(-50%,-50%)'
      });
      const ball = MR.makeEl('', {
        position: 'absolute', left: BALL_START_X+'%', top: CENTER_Y+'%', width: '11px', height: '11px',
        borderRadius: '50%', background: '#f2f0ea',
        boxShadow: '0 2px 3px rgba(0,0,0,0.5), inset -2px -2px 3px rgba(0,0,0,0.15)',
        transform: 'translate(-50%,-50%)',
        transition: 'opacity .25s ease, width .25s ease, height .25s ease'
      });
      course.appendChild(hole);
      course.appendChild(shadow);
      course.appendChild(ball);
      wrap.appendChild(course);

      // moves the ball+shadow to a ground position (x,y in %) with a
      // visual arc-height (px) lifting the ball sprite above its shadow
      function placeBall(x, y, heightPx){
        shadow.style.left = x + '%';
        shadow.style.top = y + '%';
        const shrink = 1 - Math.min(0.55, (heightPx/ARC_PEAK) * 0.55);
        shadow.style.transform = `translate(-50%,-50%) scale(${shrink})`;
        shadow.style.opacity = String(0.15 + 0.35*shrink);
        ball.style.left = x + '%';
        ball.style.top = y + '%';
        ball.style.transform = `translate(-50%, calc(-50% - ${heightPx}px))`;
      }

      function buildBar(labelText, zoneStart, zoneWidth){
        const col = MR.makeEl('', { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', opacity: '0.35', transition: 'opacity .2s' });
        const label = MR.makeEl('', { fontSize: '12px', letterSpacing: '0.12em', color: 'var(--dim)' });
        label.textContent = labelText;
        col.appendChild(label);
        const track = MR.makeEl('', { position: 'relative', width: '100%', height: '16px', background: 'var(--bezel)', borderRadius: '8px', boxShadow: 'inset 0 0 0 1px var(--line)' });
        const zone = MR.makeEl('', { position: 'absolute', top: '0', bottom: '0', left: zoneStart + '%', width: zoneWidth + '%', background: 'var(--go)', borderRadius: '8px' });
        track.appendChild(zone);
        const marker = MR.makeEl('', { position: 'absolute', top: '-5px', width: '6px', height: '26px', background: 'var(--flash)', borderRadius: '3px', left: '0%' });
        track.appendChild(marker);
        col.appendChild(track);
        return { col, marker, zoneStart, zoneWidth };
      }

      // power zone is wide and forgiving (this bar just needs a decent
      // hit); precision is the actual skill test, hence the narrower zone
      // and slightly slower sweep so it stays humanly stoppable
      const power = buildBar('POWER', MR.rand(50, 74), 15);
      const prec = buildBar('PRECISION', MR.rand(44, 54), 10);
      wrap.appendChild(power.col);
      wrap.appendChild(prec.col);
      power.col.style.opacity = '1';

      const btn = MR.makeEl('cell', { position: 'relative', padding: '14px 34px', cursor: 'pointer', fontFamily: 'var(--display)', fontSize: '16px' });
      btn.textContent = 'SWING';
      wrap.appendChild(btn);

      // always-visible key hint: this is the game's single core action
      // (not a numeric shortcut), so the badge — and the key itself,
      // wired below — stay on regardless of the "number hotkeys" toggle
      const spaceHint = MR.makeEl('key-hint', { display: 'flex' });
      spaceHint.textContent = 'Space';
      btn.appendChild(spaceHint);

      MR.stage.appendChild(wrap);

      let phase = 'power'; // 'power' | 'precision' | 'done'
      let alive = true;
      let flying = false;
      let flightRaf = null;
      let pos = 0, dir = 1;
      let powerGood = false, powerPos = 0;
      let winTimer = null;

      function activeBar(){ return phase === 'power' ? power : prec; }
      function inZone(bar, p){ return p >= bar.zoneStart && p <= bar.zoneStart + bar.zoneWidth; }
      function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
      // -1..1: how far past the zone the stop landed (0 = inside the zone)
      function driftFor(bar, p){
        if(inZone(bar, p)) return 0;
        if(p < bar.zoneStart) return -((bar.zoneStart - p) / bar.zoneStart);
        const overStart = bar.zoneStart + bar.zoneWidth;
        return (p - overStart) / (100 - overStart);
      }

      let lastT = performance.now();
      function loop(t){
        if(!alive) return;
        const dt = t - lastT; lastT = t;
        const bar = activeBar();
        // narrower zone (precision) sweeps a bit slower than the wide
        // power zone, at the same difficulty scaling as everywhere else
        const speed = (bar.zoneWidth < 14 ? 0.075 : 0.10) * ctx.speedMul;
        pos += dir * dt * speed;
        if(pos > 100){ pos = 100; dir = -1; }
        if(pos < 0){ pos = 0; dir = 1; }
        bar.marker.style.left = pos + '%';
        MR.rafId = requestAnimationFrame(loop);
      }
      MR.rafId = requestAnimationFrame(loop);

      // animates the ball from the tee to (toX,toY) along a parabola,
      // sideways deviation eased in with t*t so a bad-precision shot
      // reads as curving away as it travels, like a hook/slice
      function flyBall(toX, toY, duration, heightScale, onDone){
        flying = true;
        const fromX = BALL_START_X, fromY = CENTER_Y;
        const t0 = performance.now();
        function step(now){
          if(!flying) return;
          let t = (now - t0) / duration;
          if(t >= 1) t = 1;
          const x = fromX + (toX - fromX) * t;
          const y = fromY + (toY - fromY) * (t * t);
          const arcH = 4 * ARC_PEAK * heightScale * t * (1 - t);
          placeBall(x, y, arcH);
          if(t < 1){
            flightRaf = requestAnimationFrame(step);
          } else {
            flying = false;
            onDone();
          }
        }
        flightRaf = requestAnimationFrame(step);
      }

      function stop(){
        if(!alive || phase === 'done') return;
        if(phase === 'power'){
          powerGood = inZone(power, pos);
          powerPos = pos;
          power.marker.style.background = powerGood ? 'var(--go)' : 'var(--danger)';
          power.col.style.opacity = '0.5';
          phase = 'precision';
          prec.col.style.opacity = '1';
          btn.textContent = 'PUTT';
          pos = 0; dir = 1;
          return;
        }

        // precision phase — resolve the putt
        const precGood = inZone(prec, pos);
        prec.marker.style.background = precGood ? 'var(--go)' : 'var(--danger)';
        phase = 'done';
        alive = false;
        if(MR.rafId) cancelAnimationFrame(MR.rafId);

        const win = powerGood && precGood;
        const holeDist = HOLE_X - BALL_START_X;
        let travel;
        if(powerGood){
          travel = holeDist;
        } else {
          const d = driftFor(power, powerPos);
          // undershoot: a weak/mistimed swing barely nudges it forward;
          // overshoot: it rolls on past the cup
          travel = d < 0 ? holeDist * clamp(1 + d*0.9, 0.06, 1) : holeDist * (1 + d*0.55);
        }
        const finalX = win ? HOLE_X : clamp(BALL_START_X + travel, 5, 97);
        const aimDrift = (win || precGood) ? 0 : driftFor(prec, pos);
        const finalY = win ? CENTER_Y : clamp(CENTER_Y + aimDrift*MAX_DEVIATE, 12, 88);

        const travelFrac = clamp(travel / holeDist, 0.08, 1.3);
        const heightScale = win ? 1 : clamp(travelFrac, 0.14, 1.15);
        const duration = 560 + 180 * Math.min(1, travelFrac);

        flyBall(finalX, finalY, duration, heightScale, ()=>{
          if(win){
            hole.style.boxShadow = 'inset 0 2px 3px rgba(0,0,0,0.8), 0 0 0 3px var(--go), 0 0 14px rgba(62,245,192,0.8)';
            ball.style.opacity = '0';
            ball.style.width = '4px'; ball.style.height = '4px';
            shadow.style.opacity = '0';
            winTimer = setTimeout(()=> ctx.onWin(), 220);
          } else {
            winTimer = setTimeout(()=> ctx.onLose(), 260);
          }
        });
      }

      btn.addEventListener('click', ()=> stop());
      // space bar always swings — deliberately bypasses MR.registerKey
      // (and the "number hotkeys" toggle that gates it) since this is the
      // game's one core action, discoverable via the badge above, not a
      // numeric grid shortcut
      function onSpace(e){
        if(e.key !== ' ' && e.code !== 'Space') return;
        e.preventDefault();
        stop();
      }
      window.addEventListener('keydown', onSpace);

      ctx.onCleanup = ()=>{
        alive = false;
        flying = false;
        clearTimeout(winTimer);
        if(MR.rafId) cancelAnimationFrame(MR.rafId);
        if(flightRaf) cancelAnimationFrame(flightRaf);
        window.removeEventListener('keydown', onSpace);
      };
    }
  });


  for(let i=CATEGORY_START;i<MR.games.length;i++) MR.games[i].category = 'reflex-move';

})();
