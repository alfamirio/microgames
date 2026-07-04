(function(){
  "use strict";
  const MR = window.MR;

  MR.games.push({
    label: 'DODGE',
    desc: 'Move side to side to dodge the falling blocks.',
    word: 'DODGE!',
    timeLimit: s => 3600/s,
    start(ctx){
      const w = MR.screen.clientWidth - 36, h = MR.screen.clientHeight - 36;
      const player = document.createElement('div');
      player.className='box';
      player.style.width='34px'; player.style.height='34px';
      player.style.background='var(--go)';
      let px = w/2 - 17;
      player.style.left = px+'px';
      player.style.bottom = '10px';
      MR.stage.appendChild(player);

      const blocks = [];
      let alive = true;
      let elapsed = 0;
      const spawnEvery = 420 / ctx.speedMul;
      let sinceSpawn = 0;

      function spawnBlock(){
        const b = document.createElement('div');
        b.className='box';
        b.style.width='30px'; b.style.height='16px';
        b.style.background='var(--danger)';
        const bx = MR.rand(0, w-30);
        b.style.left = bx+'px';
        b.style.top = '-16px';
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
      const leftZone = document.createElement('div');
      const rightZone = document.createElement('div');
      [leftZone, rightZone].forEach(z=>{
        z.style.position='absolute'; z.style.top='0'; z.style.bottom='0'; z.style.width='50%';
        z.style.cursor='pointer';
      });
      leftZone.style.left='0';
      rightZone.style.right='0';
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
        const speed = 0.32 * ctx.speedMul;
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
    label: 'BALANCE',
    desc: 'Nudge left/right to keep the drifting ball centered.',
    word: 'STAY CENTERED',
    timeLimit: s => 3800/s,
    start(ctx){
      const w = MR.screen.clientWidth - 36;
      const track = document.createElement('div');
      track.style.position='absolute'; track.style.left='18px'; track.style.right='18px';
      track.style.top='50%'; track.style.height='10px'; track.style.marginTop='-5px';
      track.style.background='var(--bezel)'; track.style.borderRadius='6px';
      track.style.boxShadow='inset 0 0 0 1px var(--line)';
      MR.stage.appendChild(track);

      const centerZone = document.createElement('div');
      centerZone.style.position='absolute'; centerZone.style.left='42%'; centerZone.style.width='16%';
      centerZone.style.top='0'; centerZone.style.bottom='0';
      centerZone.style.background='var(--go)'; centerZone.style.opacity='0.35'; centerZone.style.borderRadius='6px';
      track.appendChild(centerZone);

      const ball = document.createElement('div');
      ball.style.position='absolute'; ball.style.width='22px'; ball.style.height='22px';
      ball.style.borderRadius='50%'; ball.style.background='var(--flash)';
      ball.style.top='-6px';
      track.appendChild(ball);

      let posPct = 50;
      let drift = MR.rand(-1,1) < 0 ? -0.55 : 0.55;
      let alive = true;

      function move(dx){ posPct = Math.max(0, Math.min(100, posPct+dx)); }

      const leftZone = document.createElement('div');
      const rightZone = document.createElement('div');
      [leftZone, rightZone].forEach(z=>{
        z.style.position='absolute'; z.style.top='0'; z.style.bottom='0'; z.style.width='50%';
        z.style.cursor='pointer';
      });
      leftZone.style.left='0'; rightZone.style.right='0';
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
    label: 'TRACE',
    desc: 'Keep the dot inside a corridor that sways side to side.',
    word: 'STAY INSIDE',
    timeLimit: s => 4200/s,
    start(ctx){
      const track = document.createElement('div');
      track.style.position='relative';
      track.style.width='100%'; track.style.height='100%';
      track.style.touchAction='none';
      MR.stage.appendChild(track);

      const corridor = document.createElement('div');
      corridor.style.position='absolute';
      corridor.style.top='6%'; corridor.style.bottom='6%';
      corridor.style.width='26%';
      corridor.style.background='var(--go)';
      corridor.style.opacity='0.28';
      corridor.style.borderRadius='10px';
      track.appendChild(corridor);

      const dot = document.createElement('div');
      dot.style.position='absolute';
      dot.style.width='20px'; dot.style.height='20px';
      dot.style.borderRadius='50%';
      dot.style.background='var(--flash)';
      dot.style.top='50%'; dot.style.marginTop='-10px';
      dot.style.transition='background .1s';
      track.appendChild(dot);

      let dotPct = 50;
      let alive = true;
      let started = false;
      const t0 = performance.now();

      function setPointerPct(clientX){
        const r = track.getBoundingClientRect();
        dotPct = Math.max(0, Math.min(100, (clientX-r.left)/r.width*100));
        started = true;
      }
      track.addEventListener('pointermove', (e)=>setPointerPct(e.clientX));
      track.addEventListener('pointerdown', (e)=>setPointerPct(e.clientX));

      function loop(t){
        if(!alive) return;
        const elapsed = (t-t0)/1000;
        const centerPct = 50 + 34*Math.sin(elapsed * 1.6 * ctx.speedMul);
        corridor.style.left = (centerPct - 13) + '%';
        dot.style.left = 'calc(' + dotPct + '% - 10px)';
        const inside = Math.abs(dotPct - centerPct) <= 13;
        dot.style.background = inside ? 'var(--flash)' : 'var(--danger)';
        if(started && !inside){
          alive = false;
          ctx.onLose();
          return;
        }
        MR.rafId = requestAnimationFrame(loop);
      }
      MR.rafId = requestAnimationFrame(loop);
      ctx.onCleanup = ()=>{ alive=false; if(MR.rafId) cancelAnimationFrame(MR.rafId); };
      ctx.survivalGame = true;
    }
  });


  MR.games.push({
    label: 'LANES',
    desc: 'Switch lanes to dodge the falling block.',
    word: 'DODGE THE LANE',
    timeLimit: s => 2800/s,
    start(ctx){
      const w = MR.screen.clientWidth - 36, h = MR.screen.clientHeight - 36;
      const laneCount = 3;
      const laneWidth = w/laneCount;
      let playerLane = 1;

      const lanesWrap = document.createElement('div');
      lanesWrap.style.position='absolute'; lanesWrap.style.inset='0';
      lanesWrap.style.display='flex';
      for(let i=0;i<laneCount;i++){
        const lane = document.createElement('div');
        lane.style.flex='1';
        lane.style.borderLeft = i>0 ? '1px dashed var(--line)' : 'none';
        lane.style.cursor='pointer';
        lane.addEventListener('click', ()=>{ playerLane=i; updatePlayer(); });
        lanesWrap.appendChild(lane);
      }
      MR.stage.appendChild(lanesWrap);

      const dangerLane = Math.floor(Math.random()*laneCount);
      const block = document.createElement('div');
      block.className='box';
      block.style.width = (laneWidth-16)+'px'; block.style.height='26px';
      block.style.background='var(--danger)';
      block.style.top='-30px';
      block.style.left = (dangerLane*laneWidth+8)+'px';
      MR.stage.appendChild(block);

      const player = document.createElement('div');
      player.className='box';
      player.style.width='30px'; player.style.height='30px';
      player.style.background='var(--go)';
      player.style.bottom='10px';
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
        by += 0.24*ctx.speedMul*dt;
        block.style.top = by+'px';
        if(by+26 >= h-10){
          alive=false;
          if(playerLane===dangerLane) ctx.onLose(); else ctx.onWin();
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
      const wrap = document.createElement('div');
      wrap.style.width='100%';
      wrap.style.display='flex'; wrap.style.flexDirection='column';
      wrap.style.alignItems='center'; wrap.style.gap='22px';

      const track = document.createElement('div');
      track.style.position='relative';
      track.style.width='100%'; track.style.height='16px';
      track.style.background='var(--bezel)';
      track.style.borderRadius='8px';
      track.style.boxShadow='inset 0 0 0 1px var(--line)';

      const zoneStart = MR.rand(30,60);
      const zoneWidth = 16;
      const zone = document.createElement('div');
      zone.style.position='absolute'; zone.style.top='0'; zone.style.bottom='0';
      zone.style.left = zoneStart+'%'; zone.style.width = zoneWidth+'%';
      zone.style.background='var(--go)'; zone.style.borderRadius='8px';
      track.appendChild(zone);

      const marker = document.createElement('div');
      marker.style.position='absolute'; marker.style.top='-5px';
      marker.style.width='6px'; marker.style.height='26px';
      marker.style.background='var(--flash)'; marker.style.borderRadius='3px';
      track.appendChild(marker);

      wrap.appendChild(track);

      const btn = document.createElement('div');
      btn.className='cell';
      btn.style.padding='14px 30px'; btn.style.cursor='pointer';
      btn.style.fontFamily='var(--display)'; btn.style.fontSize='16px';
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
      const wrap = document.createElement('div');
      wrap.style.display='flex'; wrap.style.alignItems='center'; wrap.style.justifyContent='center';
      wrap.style.gap='26px'; wrap.style.width='100%'; wrap.style.height='100%';

      const gauge = document.createElement('div');
      gauge.style.position='relative';
      gauge.style.width='30px'; gauge.style.height='72%';
      gauge.style.background='var(--bezel)';
      gauge.style.borderRadius='8px';
      gauge.style.boxShadow='inset 0 0 0 1px var(--line)';
      gauge.style.overflow='hidden';

      const zoneWidth = 18;
      const zoneStart = MR.rand(50, 74);
      const zone = document.createElement('div');
      zone.style.position='absolute'; zone.style.left='0'; zone.style.right='0';
      zone.style.bottom = zoneStart+'%'; zone.style.height = zoneWidth+'%';
      zone.style.background='var(--go)'; zone.style.opacity='0.4';
      gauge.appendChild(zone);

      const fill = document.createElement('div');
      fill.style.position='absolute'; fill.style.left='0'; fill.style.right='0'; fill.style.bottom='0';
      fill.style.height='0%';
      fill.style.background='var(--flash)';
      gauge.appendChild(fill);

      const balloon = document.createElement('div');
      balloon.style.width='96px'; balloon.style.height='96px';
      balloon.style.borderRadius='50%';
      balloon.style.background='var(--danger)';
      balloon.style.transformOrigin='center';
      balloon.style.transform='scale(0.55)';
      balloon.style.cursor='pointer';
      balloon.style.touchAction='none';
      balloon.style.display='flex'; balloon.style.alignItems='center'; balloon.style.justifyContent='center';
      balloon.style.fontFamily='var(--display)'; balloon.style.fontWeight='900';
      balloon.style.fontSize='13px'; balloon.style.color='#0b0b10';
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

      balloon.addEventListener('pointerdown', (e)=>{
        if(!alive) return;
        holding = true;
        balloon.setPointerCapture(e.pointerId);
      });
      function release(){
        if(!alive || !holding) return;
        holding = false;
        alive = false;
        if(MR.rafId) cancelAnimationFrame(MR.rafId);
        if(pct >= zoneStart && pct <= zoneStart+zoneWidth) ctx.onWin();
        else ctx.onLose();
      }
      balloon.addEventListener('pointerup', release);
      balloon.addEventListener('pointercancel', release);

      ctx.onCleanup = ()=>{ alive=false; holding=false; if(MR.rafId) cancelAnimationFrame(MR.rafId); };
    }
  });


  MR.games.push({
    label: 'DRAG',
    desc: 'Drag the shape into its matching socket.',
    word: 'DRAG IT IN',
    timeLimit: s => 3800/s,
    start(ctx){
      const stageRect = () => MR.stage.getBoundingClientRect();

      const sPct = { x: MR.rand(15,58), y: MR.rand(10,55) };
      const socket = document.createElement('div');
      socket.style.position='absolute';
      socket.style.left = sPct.x+'%'; socket.style.top = sPct.y+'%';
      socket.style.width='76px'; socket.style.height='76px';
      socket.style.borderRadius='50%';
      socket.style.border='3px dashed var(--dim)';
      socket.style.boxSizing='border-box';
      MR.stage.appendChild(socket);

      let startX, startY;
      do {
        startX = MR.rand(8,70); startY = MR.rand(8,68);
      } while(Math.hypot(startX-sPct.x, startY-sPct.y) < 32);

      const shape = document.createElement('div');
      shape.style.position='absolute';
      shape.style.left = startX+'%'; shape.style.top = startY+'%';
      shape.style.width='56px'; shape.style.height='56px';
      shape.style.borderRadius='50%';
      shape.style.background='var(--flash)';
      shape.style.cursor='grab';
      shape.style.touchAction='none';
      shape.style.zIndex='10';
      MR.stage.appendChild(shape);

      let dragging = false, dx=0, dy=0, alive=true;

      function setShapePx(px, py){
        shape.style.left = px+'px';
        shape.style.top = py+'px';
      }

      shape.addEventListener('pointerdown', (e)=>{
        if(!alive) return;
        dragging = true;
        shape.setPointerCapture(e.pointerId);
        shape.style.cursor='grabbing';
        const r = shape.getBoundingClientRect();
        dx = e.clientX - r.left; dy = e.clientY - r.top;
      });
      shape.addEventListener('pointermove', (e)=>{
        if(!dragging || !alive) return;
        const r = stageRect();
        let px = e.clientX - r.left - dx;
        let py = e.clientY - r.top - dy;
        px = Math.max(0, Math.min(r.width-56, px));
        py = Math.max(0, Math.min(r.height-56, py));
        setShapePx(px, py);
      });
      function finishDrag(){
        if(!dragging || !alive) return;
        dragging = false;
        shape.style.cursor='grab';
        const shapeRect = shape.getBoundingClientRect();
        const socketRect = socket.getBoundingClientRect();
        const scx = shapeRect.left + shapeRect.width/2;
        const scy = shapeRect.top + shapeRect.height/2;
        const ocx = socketRect.left + socketRect.width/2;
        const ocy = socketRect.top + socketRect.height/2;
        const dist = Math.hypot(scx-ocx, scy-ocy);
        if(dist < socketRect.width/2 + 4){
          alive = false;
          socket.style.borderColor = 'var(--go)';
          ctx.onWin();
        } else {
          const r = stageRect();
          setShapePx(r.width*(startX/100), r.height*(startY/100));
        }
      }
      shape.addEventListener('pointerup', finishDrag);
      shape.addEventListener('pointercancel', finishDrag);

      ctx.onCleanup = ()=>{ alive=false; };
    }
  });


})();
