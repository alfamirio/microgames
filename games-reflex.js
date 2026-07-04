(function(){
  "use strict";
  const MR = window.MR;
  const CATEGORY_START = MR.games.length;

  MR.games.push({
    label: 'ODD ONE',
    desc: 'Spot the one tile with a different color and tap it.',
    word: 'FIND IT',
    timeLimit: s => 3200/s,
    start(ctx){
      const wrap = document.createElement('div');
      wrap.style.display='grid';
      wrap.style.gridTemplateColumns='repeat(4, 1fr)';
      wrap.style.gap='10px';
      wrap.style.width='100%';
      const colors = ['#3ef5c0','#ff3e7f','#f4e94c','#6b6580'];
      const baseColor = MR.pick(colors);
      let oddColor = MR.pick(colors.filter(c=>c!==baseColor));
      const n = 12;
      const oddIdx = Math.floor(Math.random()*n);
      for(let i=0;i<n;i++){
        const cell = document.createElement('div');
        cell.className='cell';
        cell.style.aspectRatio='1';
        cell.style.background = (i===oddIdx? oddColor : baseColor);
        cell.style.cursor='pointer';
        cell.addEventListener('click', ()=>{
          if(i===oddIdx) ctx.onWin(); else ctx.onLose();
        });
        wrap.appendChild(cell);
      }
      MR.stage.appendChild(wrap);
    }
  });


  MR.games.push({
    label: 'MASH',
    desc: 'Tap the target as fast as you can to mash the counter to zero.',
    word: 'MASH!',
    timeLimit: s => 2600/s,
    start(ctx){
      const need = Math.round(3 + Math.random()*3);
      let count = 0;
      const btn = document.createElement('div');
      btn.className = 'target';
      btn.style.width='140px'; btn.style.height='140px';
      btn.style.fontFamily='var(--display)';
      btn.style.fontSize='38px'; btn.style.color='#0b0b10'; btn.style.fontWeight='900';
      btn.textContent = need;
      btn.style.cursor='pointer';
      btn.addEventListener('click', ()=>{
        count++;
        btn.textContent = Math.max(need-count,0);
        btn.style.transform = 'scale(0.9)';
        setTimeout(()=>{ btn.style.transform='scale(1)'; },60);
        if(count>=need) ctx.onWin();
      });
      MR.stage.appendChild(btn);
    }
  });


  MR.games.push({
    label: 'WHACK',
    desc: 'Tap the single lit square before time runs out.',
    word: 'TAP LIT',
    timeLimit: s => 2200/s,
    start(ctx){
      const grid = document.createElement('div');
      grid.style.display='grid';
      grid.style.gridTemplateColumns='repeat(3, 1fr)';
      grid.style.gap='12px';
      grid.style.width='100%';
      const litIdx = Math.floor(Math.random()*9);
      for(let i=0;i<9;i++){
        const cell = document.createElement('div');
        cell.className='cell' + (i===litIdx? ' lit':'');
        cell.style.aspectRatio='1';
        cell.style.cursor='pointer';
        cell.addEventListener('click', ()=>{
          if(i===litIdx) ctx.onWin(); else ctx.onLose();
        });
        grid.appendChild(cell);
      }
      MR.stage.appendChild(grid);
    }
  });


  MR.games.push({
    label: 'CATCH',
    desc: 'Click the target before it shrinks away to nothing.',
    word: 'CATCH IT',
    timeLimit: s => 2600/s,
    start(ctx){
      const target = document.createElement('div');
      target.className='target';
      target.style.width='90px'; target.style.height='90px';
      target.style.left = MR.rand(10,60)+'%';
      target.style.top = MR.rand(10,60)+'%';
      target.style.cursor='pointer';
      MR.stage.appendChild(target);
      target.addEventListener('click', ()=>ctx.onWin());
      let scale = 1;
      let alive = true;
      let lastT = performance.now();
      function loop(t){
        if(!alive) return;
        const dt=(t-lastT)/1000; lastT=t;
        scale -= dt * 0.28 * ctx.speedMul;
        if(scale<=0){ alive=false; ctx.onLose(); return; }
        target.style.transform = `scale(${scale})`;
        MR.rafId = requestAnimationFrame(loop);
      }
      MR.rafId = requestAnimationFrame(loop);
      ctx.onCleanup = ()=>{ alive=false; if(MR.rafId) cancelAnimationFrame(MR.rafId); };
    }
  });


  MR.games.push({
    label: 'GO/STOP',
    desc: 'Tap green GO circles — leave red STOP ones alone.',
    word: 'ONLY GREEN',
    timeLimit: s => 2200/s,
    start(ctx){
      const isGreen = Math.random() > 0.4;
      const target = document.createElement('div');
      target.className='target';
      target.style.background = isGreen ? 'var(--go)' : 'var(--danger)';
      target.style.width='120px'; target.style.height='120px';
      target.style.cursor='pointer';
      target.style.fontFamily='var(--display)';
      target.style.fontSize='16px'; target.style.color='#0b0b10'; target.style.fontWeight='900';
      target.textContent = isGreen ? 'GO' : 'STOP';
      MR.stage.appendChild(target);
      target.addEventListener('click', ()=>{
        if(isGreen) ctx.onWin(); else ctx.onLose();
      });
      // if it's a stop sign, surviving without clicking = win
      ctx.stopIsWin = !isGreen;
    }
  });


  MR.games.push({
    label: 'POP',
    desc: 'Pop every dot on screen before the timer ends.',
    word: 'POP THEM ALL',
    timeLimit: s => 3000/s,
    start(ctx){
      const n = Math.floor(Math.random() * 3) + 1;
      let remaining = n;
      for(let i=0;i<n;i++){
        const d = document.createElement('div');
        d.className='target';
        d.style.width='44px'; d.style.height='44px';
        d.style.left = MR.rand(6,80)+'%';
        d.style.top = MR.rand(6,78)+'%';
        d.style.cursor='pointer';
        d.style.transition='transform .12s, opacity .12s';
        d.addEventListener('click', ()=>{
          if(d.dataset.popped) return;
          d.dataset.popped = '1';
          d.style.transform='scale(0)';
          d.style.opacity='0';
          remaining--;
          if(remaining<=0) ctx.onWin();
        });
        MR.stage.appendChild(d);
      }
    }
  });


  MR.games.push({
    label: 'COMBO',
    desc: 'Press the 3 arrows in order — tap the on-screen keys or use your keyboard.',
    word: 'FOLLOW THE ARROWS',
    timeLimit: s => 4200/s,
    start(ctx){
      const DIRS = [
        { key:'ArrowLeft',  glyph:'←' },
        { key:'ArrowRight', glyph:'→' },
        { key:'ArrowUp',    glyph:'↑' },
        { key:'ArrowDown',  glyph:'↓' }
      ];
      const sequence = Array.from({length:3}, ()=> MR.pick(DIRS));
      let index = 0;
      let alive = true;

      const wrap = document.createElement('div');
      wrap.style.display='flex'; wrap.style.flexDirection='column';
      wrap.style.alignItems='center'; wrap.style.gap='30px';

      const seqRow = document.createElement('div');
      seqRow.style.display='flex'; seqRow.style.gap='12px';
      const boxes = sequence.map(dir=>{
        const box = document.createElement('div');
        box.className = 'cell';
        box.style.width='58px'; box.style.height='58px';
        box.style.display='flex'; box.style.alignItems='center'; box.style.justifyContent='center';
        box.style.fontFamily='var(--display)'; box.style.fontSize='28px'; box.style.fontWeight='900';
        box.textContent = dir.glyph;
        seqRow.appendChild(box);
        return box;
      });
      wrap.appendChild(seqRow);

      const padRow = document.createElement('div');
      padRow.style.display='flex'; padRow.style.gap='10px';
      const arrowEls = {};
      DIRS.forEach(dir=>{
        const key = document.createElement('div');
        key.className = 'arrow-key';
        key.style.cursor='pointer';
        key.textContent = dir.glyph;
        key.addEventListener('click', ()=> handleInput(dir.key));
        padRow.appendChild(key);
        arrowEls[dir.key] = key;
      });
      wrap.appendChild(padRow);

      MR.stage.appendChild(wrap);

      function refresh(){
        boxes.forEach((box,i)=>{
          if(i < index){ box.style.background='var(--go)'; box.style.color='#0b0b10'; }
          else if(i === index){ box.style.background='var(--flash)'; box.style.color='#0b0b10'; }
          else { box.style.background=''; box.style.color='var(--ink)'; }
        });
      }
      refresh();

      function flashKey(dirKey){
        const el = arrowEls[dirKey];
        if(!el) return;
        el.classList.add('active');
        setTimeout(()=> el.classList.remove('active'), 140);
      }

      function handleInput(dirKey){
        if(!alive) return;
        flashKey(dirKey);
        if(dirKey === sequence[index].key){
          index++;
          refresh();
          if(index >= sequence.length){
            alive = false;
            ctx.onWin();
          }
        } else {
          alive = false;
          ctx.onLose();
        }
      }

      MR.setKeyHandler((e)=>{
        if(DIRS.some(d=>d.key===e.key)) handleInput(e.key);
      });
    }
  });


  MR.games.push({
    label: 'RED LIGHT',
    desc: 'Hold to advance — only while the light is green. Get caught moving on red and you lose.',
    word: 'GREEN = GO',
    timeLimit: s => 4000/s,
    start(ctx){
      const wrap = document.createElement('div');
      wrap.style.display='flex'; wrap.style.flexDirection='column';
      wrap.style.alignItems='center'; wrap.style.gap='20px'; wrap.style.width='100%';

      const light = document.createElement('div');
      light.style.width='70px'; light.style.height='70px'; light.style.borderRadius='50%';
      light.style.background='var(--go)';
      wrap.appendChild(light);

      const track = document.createElement('div');
      track.style.width='100%'; track.style.height='18px'; track.style.borderRadius='9px';
      track.style.background='rgba(255,255,255,0.08)'; track.style.overflow='hidden';
      const fill = document.createElement('div');
      fill.style.height='100%'; fill.style.width='0%'; fill.style.background='var(--go)';
      fill.style.transition='background .15s';
      track.appendChild(fill);
      wrap.appendChild(track);

      const btn = document.createElement('div');
      btn.className='target';
      btn.style.width='140px'; btn.style.height='60px'; btn.style.borderRadius='14px';
      btn.style.cursor='pointer';
      btn.style.fontFamily='var(--display)'; btn.style.fontSize='14px';
      btn.style.color='#0b0b10'; btn.style.fontWeight='900';
      btn.textContent = 'HOLD';
      wrap.appendChild(btn);

      MR.stage.appendChild(wrap);

      let green = true;
      let holding = false;
      let progress = 0;
      let alive = true;
      let lightTimer = null;
      let lastT = performance.now();

      function finish(win){
        if(!alive) return;
        alive = false;
        clearTimeout(lightTimer);
        if(MR.rafId) cancelAnimationFrame(MR.rafId);
        win ? ctx.onWin() : ctx.onLose();
      }

      function setLight(g){
        green = g;
        light.style.background = g ? 'var(--go)' : 'var(--danger)';
        fill.style.background = g ? 'var(--go)' : 'var(--danger)';
        btn.style.background = g ? 'var(--go)' : 'var(--danger)';
        if(!g && holding) finish(false);
      }

      function warnThenRed(){
        if(!alive) return;
        // floored: 6 flashes at this interval is the whole warning window
        // before red locks in and catches a held button, so it shouldn't
        // shrink all the way down with difficulty
        const flashInterval = Math.max(90, 110 / ctx.speedMul);
        let flashesLeft = 5;
        let flashOn = false;
        function doFlash(){
          if(!alive) return;
          flashOn = !flashOn;
          light.style.background = flashOn ? 'var(--danger)' : 'var(--go)';
          flashesLeft--;
          if(flashesLeft > 0){
            lightTimer = setTimeout(doFlash, flashInterval);
          } else {
            lightTimer = setTimeout(()=>{
              if(!alive) return;
              setLight(false);
              cycle();
            }, flashInterval);
          }
        }
        doFlash();
      }

      function cycle(){
        if(!alive) return;
        if(green){
          const wait = MR.rand(550,950) / ctx.speedMul;
          lightTimer = setTimeout(()=>{
            if(!alive) return;
            warnThenRed();
          }, wait);
        } else {
          const wait = MR.rand(650,1050) / ctx.speedMul;
          lightTimer = setTimeout(()=>{
            if(!alive) return;
            setLight(true);
            cycle();
          }, wait);
        }
      }
      cycle();

      btn.addEventListener('pointerdown', ()=>{
        if(!alive) return;
        holding = true;
        if(!green) finish(false);
      });
      const release = ()=>{ holding = false; };
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointerleave', release);

      function loop(t){
        if(!alive) return;
        const dt = (t-lastT)/1000; lastT = t;
        if(holding && green){
          progress += dt * 70 * ctx.speedMul;
          if(progress>=100){
            progress = 100;
            fill.style.width = '100%';
            finish(true);
            return;
          }
          fill.style.width = progress + '%';
        }
        MR.rafId = requestAnimationFrame(loop);
      }
      MR.rafId = requestAnimationFrame(loop);

      ctx.onCleanup = ()=>{ alive=false; clearTimeout(lightTimer); if(MR.rafId) cancelAnimationFrame(MR.rafId); };
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

      const allLanes = Array.from({length:laneCount}, (_,i)=>i);
      for(let i=allLanes.length-1;i>0;i--){
        const j = Math.floor(Math.random()*(i+1));
        [allLanes[i], allLanes[j]] = [allLanes[j], allLanes[i]];
      }
      const dangerLanes = allLanes.slice(0, dangerCount);

      const blocks = dangerLanes.map(laneIdx=>{
        const block = document.createElement('div');
        block.className='box';
        block.style.width = (laneWidth-16)+'px'; block.style.height='26px';
        block.style.background='var(--danger)';
        block.style.top='-30px';
        block.style.left = (laneIdx*laneWidth+8)+'px';
        MR.stage.appendChild(block);
        return block;
      });

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
      const spawnEvery = 320 / ctx.speedMul;
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

      const paddle = document.createElement('div');
      paddle.className = 'box';
      paddle.style.width = paddleW+'px'; paddle.style.height = paddleH+'px';
      paddle.style.background = 'var(--go)';
      paddle.style.bottom = paddleBottom+'px';
      paddle.style.left = padX+'px';
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
      const leftZone = document.createElement('div');
      const rightZone = document.createElement('div');
      [leftZone, rightZone].forEach(z=>{
        z.style.position='absolute'; z.style.top='0'; z.style.bottom='0'; z.style.width='50%';
        z.style.cursor='pointer';
      });
      leftZone.style.left='0';
      rightZone.style.right='0';
      leftZone.addEventListener('click', ()=>movePaddle(-38));
      rightZone.addEventListener('click', ()=>movePaddle(38));
      MR.stage.appendChild(leftZone);
      MR.stage.appendChild(rightZone);

      const r = 7;
      const ball = document.createElement('div');
      ball.className = 'dot';
      ball.style.width = (r*2)+'px'; ball.style.height = (r*2)+'px';
      ball.style.background = 'var(--flash)';
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
        ball.style.left = (bxp-r)+'px';
        ball.style.top = (byp-r)+'px';
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

      const basket = document.createElement('div');
      basket.className = 'box';
      basket.style.width = basketW+'px'; basket.style.height = basketH+'px';
      basket.style.background = 'var(--flash)';
      basket.style.borderRadius = '4px 4px 10px 10px';
      basket.style.bottom = basketY+'px';
      basket.style.left = bx+'px';
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
      const leftZone = document.createElement('div');
      const rightZone = document.createElement('div');
      [leftZone, rightZone].forEach(z=>{
        z.style.position='absolute'; z.style.top='0'; z.style.bottom='0'; z.style.width='50%';
        z.style.cursor='pointer'; z.style.touchAction='none';
      });
      leftZone.style.left='0';
      rightZone.style.right='0';
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
      const progress = document.createElement('div');
      progress.style.position = 'absolute';
      progress.style.top = '8px'; progress.style.left = '0'; progress.style.right = '0';
      progress.style.textAlign = 'center';
      progress.style.fontSize = '11px'; progress.style.letterSpacing = '0.08em';
      progress.style.color = 'var(--dim)';
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
        const el = document.createElement('div');
        el.className = bad ? 'box' : 'dot';
        el.style.width = dropSize+'px'; el.style.height = dropSize+'px';
        el.style.background = bad ? 'var(--danger)' : 'var(--go)';
        if(bad){ el.style.transform = 'rotate(45deg)'; el.style.borderRadius='4px'; }
        el.style.left = dx+'px';
        el.style.top = '-'+dropSize+'px';
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
      const band = document.createElement('div');
      band.style.position = 'absolute';
      band.style.left = (cx-targetR-tolerance)+'px';
      band.style.top = (cy-targetR-tolerance)+'px';
      band.style.width = (2*(targetR+tolerance))+'px';
      band.style.height = (2*(targetR+tolerance))+'px';
      band.style.borderRadius = '50%';
      band.style.boxShadow = 'inset 0 0 0 '+(2*tolerance)+'px rgba(62,245,192,0.14)';
      band.style.border = '1px solid rgba(62,245,192,0.4)';
      MR.stage.appendChild(band);

      // still pivot marker at the center
      const pivot = document.createElement('div');
      pivot.className = 'dot';
      pivot.style.width='6px'; pivot.style.height='6px';
      pivot.style.background='var(--dim)';
      pivot.style.left=(cx-3)+'px'; pivot.style.top=(cy-3)+'px';
      MR.stage.appendChild(pivot);

      const dot = document.createElement('div');
      dot.className = 'dot';
      dot.style.width='22px'; dot.style.height='22px';
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
      const staticEl = document.createElement('div');
      staticEl.style.position = 'absolute';
      staticEl.style.width = staticSize+'px'; staticEl.style.height = staticSize+'px';
      staticEl.style.left = (staticX-staticSize/2)+'px'; staticEl.style.top = (staticY-staticSize/2)+'px';
      staticEl.style.borderRadius = '50%';
      staticEl.style.background = 'var(--life)';
      staticEl.style.boxShadow = '0 0 10px rgba(181,101,245,0.65)';
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
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.width = astSize+'px'; el.style.height = astSize+'px';
        el.style.borderRadius = '50%';
        el.style.background = 'var(--danger)';
        el.style.boxShadow = '0 0 10px rgba(255,62,127,0.6)';
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
        dot.style.left = (x-11)+'px';
        dot.style.top = (y-11)+'px';
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
      const outZone = document.createElement('div');
      const inZone = document.createElement('div');
      [outZone, inZone].forEach(z=>{
        z.style.position='absolute'; z.style.left='0'; z.style.right='0'; z.style.height='50%';
        z.style.cursor='pointer'; z.style.touchAction='none';
        z.style.display='flex'; z.style.justifyContent='center';
        z.style.fontSize='10px'; z.style.letterSpacing='0.14em'; z.style.textTransform='uppercase';
        z.style.color='rgba(242,240,234,0.16)';
      });
      outZone.style.top='0'; outZone.style.alignItems='flex-start'; outZone.style.paddingTop='10px';
      outZone.textContent = '↑ out';
      inZone.style.bottom='0'; inZone.style.alignItems='flex-end'; inZone.style.paddingBottom='10px';
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
