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
      const colors = ['#3ef5c0','#ff3e7f','#f4e94c','#6b6580'];
      const baseColor = MR.pick(colors);
      let oddColor = MR.pick(colors.filter(c=>c!==baseColor));
      const n = 12;
      const oddIdx = Math.floor(Math.random()*n);
      const { wrap, cells } = MR.makeGrid(3, 4, { cellStyles: { aspectRatio: '1', cursor: 'pointer' } });
      cells.forEach((cell,i)=>{
        cell.style.background = (i===oddIdx? oddColor : baseColor);
        cell.addEventListener('click', ()=>{
          if(i===oddIdx) ctx.onWin(); else ctx.onLose();
        });
      });
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
      const btn = MR.makeEl('target', { width: '140px', height: '140px', fontFamily: 'var(--display)', fontSize: '38px', color: '#0b0b10', fontWeight: '900', cursor: 'pointer' });
      btn.textContent = need;
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
      const litIdx = Math.floor(Math.random()*9);
      const { wrap: grid, cells } = MR.makeGrid(3, 3, { gap: '12px', cellStyles: { aspectRatio: '1', cursor: 'pointer' } });
      cells.forEach((cell,i)=>{
        if(i===litIdx) cell.classList.add('lit');
        cell.addEventListener('click', ()=>{
          if(i===litIdx) ctx.onWin(); else ctx.onLose();
        });
      });
      MR.stage.appendChild(grid);
    }
  });


  MR.games.push({
    label: 'CATCH',
    desc: 'Click the target before it shrinks away to nothing.',
    word: 'CATCH IT',
    timeLimit: s => 2600/s,
    start(ctx){
      const target = MR.makeEl('target', { width: '90px', height: '90px', left: MR.rand(10,60)+'%', top: MR.rand(10,60)+'%', cursor: 'pointer' });
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
      const target = MR.makeEl('target', { background: isGreen ? 'var(--go)' : 'var(--danger)', width: '120px', height: '120px', cursor: 'pointer', fontFamily: 'var(--display)', fontSize: '16px', color: '#0b0b10', fontWeight: '900' });
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
        const d = MR.makeEl('target', { width: '44px', height: '44px', left: MR.rand(6,80)+'%', top: MR.rand(6,78)+'%', cursor: 'pointer', transition: 'transform .12s, opacity .12s' });
        d.addEventListener('click', ()=>{
          if(d.dataset.popped) return;
          d.dataset.popped = '1';
          MR.styleEl(d, { transform: 'scale(0)', opacity: '0' });
          remaining--;
          if(remaining<=0) ctx.onWin();
        });
        MR.stage.appendChild(d);
      }
    }
  });


  MR.games.push({
    label: 'COMBO',
    desc: 'Press the arrows in order — tap the on-screen keys or use your keyboard.',
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

      const wrap = MR.makeEl('', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px' });

      const seqRow = MR.makeEl('', { display: 'flex', gap: '12px' });
      const boxes = sequence.map(dir=>{
        const box = MR.makeEl('cell', { width: '58px', height: '58px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: '28px', fontWeight: '900' });
        box.textContent = dir.glyph;
        seqRow.appendChild(box);
        return box;
      });
      wrap.appendChild(seqRow);

      const padRow = MR.makeEl('', { display: 'flex', gap: '10px' });
      const arrowEls = {};
      DIRS.forEach(dir=>{
        const key = MR.makeEl('arrow-key', { cursor: 'pointer' });
        key.textContent = dir.glyph;
        key.addEventListener('click', ()=> handleInput(dir.key));
        padRow.appendChild(key);
        arrowEls[dir.key] = key;
      });
      wrap.appendChild(padRow);

      MR.stage.appendChild(wrap);

      function refresh(){
        boxes.forEach((box,i)=>{
          if(i < index){ MR.styleEl(box, { background: 'var(--go)', color: '#0b0b10' }); }
          else if(i === index){ MR.styleEl(box, { background: 'var(--flash)', color: '#0b0b10' }); }
          else { MR.styleEl(box, { background: '', color: 'var(--ink)' }); }
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
      const wrap = MR.makeEl('', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' });

      const light = MR.makeEl('', { width: '70px', height: '70px', borderRadius: '50%', background: 'var(--go)' });
      wrap.appendChild(light);

      const track = MR.makeEl('', { width: '100%', height: '18px', borderRadius: '9px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' });
      const fill = MR.makeEl('', { height: '100%', width: '0%', background: 'var(--go)', transition: 'background .15s' });
      track.appendChild(fill);
      wrap.appendChild(track);

      const btn = MR.makeEl('target', { width: '140px', height: '60px', borderRadius: '14px', cursor: 'pointer', fontFamily: 'var(--display)', fontSize: '14px', color: '#0b0b10', fontWeight: '900' });
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
