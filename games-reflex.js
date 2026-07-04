(function(){
  "use strict";
  const MR = window.MR;

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
      const need = Math.round(6 + Math.random()*3);
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
      const n = 5;
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
    label: 'FLIP',
    desc: 'Click the rapidly flipping card only when it matches the target color.',
    word: 'CATCH THE COLOR',
    timeLimit: s => 3000/s,
    start(ctx){
      const colors = ['#3ef5c0','#ff3e7f','#f4e94c','#7a8cff','#ff9f4a'];
      const target = MR.pick(colors);

      const wrap = document.createElement('div');
      wrap.style.display='flex'; wrap.style.flexDirection='column';
      wrap.style.alignItems='center'; wrap.style.gap='22px';

      const label = document.createElement('div');
      label.style.fontSize='11px'; label.style.letterSpacing='0.12em'; label.style.color='var(--dim)';
      label.textContent = 'TARGET';
      wrap.appendChild(label);

      const swatch = document.createElement('div');
      swatch.style.width='34px'; swatch.style.height='34px'; swatch.style.borderRadius='8px';
      swatch.style.background=target;
      wrap.appendChild(swatch);

      const card = document.createElement('div');
      card.style.width='120px'; card.style.height='120px'; card.style.borderRadius='16px';
      card.style.cursor='pointer';
      wrap.appendChild(card);

      MR.stage.appendChild(wrap);

      let current = MR.pick(colors);
      card.style.background = current;
      let alive = true;
      const flipEvery = 160/ctx.speedMul;
      const flipTimer = setInterval(()=>{
        if(!alive) return;
        current = MR.pick(colors);
        card.style.background = current;
      }, flipEvery);

      card.addEventListener('click', ()=>{
        if(!alive) return;
        alive = false;
        clearInterval(flipTimer);
        if(current===target) ctx.onWin(); else ctx.onLose();
      });

      ctx.onCleanup = ()=>{ alive=false; clearInterval(flipTimer); };
    }
  });


  MR.games.push({
    label: 'RHYTHM',
    desc: 'Tap the beacon in time with its pulse, several times in a row.',
    word: 'TAP THE BEAT',
    timeLimit: s => 4400/s,
    start(ctx){
      const wrap = document.createElement('div');
      wrap.style.display='flex'; wrap.style.flexDirection='column';
      wrap.style.alignItems='center'; wrap.style.gap='26px';

      const beacon = document.createElement('div');
      beacon.style.width='90px'; beacon.style.height='90px';
      beacon.style.borderRadius='50%';
      beacon.style.background='var(--go)';
      wrap.appendChild(beacon);

      const btn = document.createElement('div');
      btn.className='cell';
      btn.style.padding='14px 30px'; btn.style.cursor='pointer';
      btn.style.fontFamily='var(--display)'; btn.style.fontSize='16px';
      btn.textContent = 'TAP';
      wrap.appendChild(btn);

      const hintEl = document.createElement('div');
      hintEl.style.fontSize='11px'; hintEl.style.color='var(--dim)'; hintEl.style.letterSpacing='0.1em';
      const need = 3;
      hintEl.textContent = 'HITS: 0 / ' + need;
      wrap.appendChild(hintEl);

      MR.stage.appendChild(wrap);

      const interval = 480 / ctx.speedMul;
      const tolerance = 130;
      let hits = 0;
      let alive = true;
      const t0 = performance.now();

      function loop(t){
        if(!alive) return;
        const phase = ((t-t0) % interval) / interval;
        beacon.style.transform = 'scale(' + (1 + 0.35*(1-phase)) + ')';
        const nearBeat = phase < 0.12 || phase > 0.88;
        beacon.style.background = nearBeat ? 'var(--flash)' : 'var(--go)';
        MR.rafId = requestAnimationFrame(loop);
      }
      MR.rafId = requestAnimationFrame(loop);

      btn.addEventListener('click', ()=>{
        if(!alive) return;
        const t = performance.now();
        const phase = ((t-t0) % interval) / interval;
        const distMs = Math.min(phase, 1-phase) * interval;
        if(distMs <= tolerance){
          hits++;
          hintEl.textContent = 'HITS: ' + hits + ' / ' + need;
          if(hits>=need){
            alive=false;
            if(MR.rafId) cancelAnimationFrame(MR.rafId);
            ctx.onWin();
          }
        } else {
          alive=false;
          if(MR.rafId) cancelAnimationFrame(MR.rafId);
          ctx.onLose();
        }
      });

      ctx.onCleanup = ()=>{ alive=false; if(MR.rafId) cancelAnimationFrame(MR.rafId); };
    }
  });


})();
