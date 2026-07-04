(function(){
  "use strict";
  const MR = window.MR;
  const CATEGORY_START = MR.games.length;

  // REFLEX / TAP -- quick single-beat reaction tests (react to a signal, hit the target, mash)

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


  for(let i=CATEGORY_START;i<MR.games.length;i++) MR.games[i].category = 'reflex';

})();
