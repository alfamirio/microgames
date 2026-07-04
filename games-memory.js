(function(){
  "use strict";
  const MR = window.MR;
  const CATEGORY_START = MR.games.length;

  MR.games.push({
    label: 'SIMON',
    desc: 'Press the arrow key or tile that is shown.',
    word: 'PRESS IT',
    timeLimit: s => 2400/s,
    start(ctx){
      const dirs = ['←','↑','→','↓'];
      const keys = ['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'];
      const idx = Math.floor(Math.random()*4);
      const wrap = document.createElement('div');
      wrap.style.display='flex'; wrap.style.flexDirection='column'; wrap.style.alignItems='center'; wrap.style.gap='24px';
      const promptEl = document.createElement('div');
      promptEl.className='prompt-word';
      promptEl.textContent = dirs[idx];
      promptEl.style.fontSize='64px';
      wrap.appendChild(promptEl);
      const row = document.createElement('div');
      row.style.display='flex'; row.style.gap='10px';
      const keyEls = dirs.map((d,i)=>{
        const k = document.createElement('div');
        k.className='arrow-key';
        k.textContent = d;
        row.appendChild(k);
        return k;
      });
      wrap.appendChild(row);
      MR.stage.appendChild(wrap);

      MR.setKeyHandler((e)=>{
        const pressedIdx = keys.indexOf(e.key);
        if(pressedIdx===-1) return;
        keyEls[pressedIdx].classList.add('active');
        if(pressedIdx===idx) ctx.onWin(); else ctx.onLose();
      });
      // touch fallback: tap matching arrow tile
      keyEls.forEach((k,i)=>{
        k.style.cursor='pointer';
        k.addEventListener('click', ()=>{
          k.classList.add('active');
          if(i===idx) ctx.onWin(); else ctx.onLose();
        });
      });
    }
  });


  MR.games.push({
    label: 'COUNT',
    desc: 'Memorize how many dots flash, then pick the matching number.',
    word: 'COUNT!',
    timeLimit: s => 3600/s,
    start(ctx){
      const n = 2 + Math.floor(Math.random()*3);
      const dotsWrap = document.createElement('div');
      dotsWrap.style.position='relative';
      dotsWrap.style.width='100%'; dotsWrap.style.height='60%';
      for(let i=0;i<n;i++){
        const d = document.createElement('div');
        d.className='dot';
        d.style.width='22px'; d.style.height='22px';
        d.style.background='var(--flash)';
        d.style.left = MR.rand(5,85)+'%';
        d.style.top = MR.rand(5,80)+'%';
        dotsWrap.appendChild(d);
      }
      MR.stage.appendChild(dotsWrap);
      setTimeout(()=>{
        if(MR.roundToken() !== ctx.token) return;
        clearStage_partial(dotsWrap);
        askAnswer();
      }, 900);

      function clearStage_partial(el){ el.remove(); }

      function askAnswer(){
        const options = new Set([n]);
        while(options.size<4){
          options.add(Math.max(1, n + Math.floor(MR.rand(-3,4))));
        }
        const opts = MR.shuffle(Array.from(options));
        const q = document.createElement('div');
        q.style.display='flex'; q.style.flexDirection='column'; q.style.gap='16px'; q.style.alignItems='center';
        const label = document.createElement('div');
        label.className='prompt-word'; label.style.fontSize='22px';
        label.textContent = 'how many?';
        q.appendChild(label);
        const row = document.createElement('div');
        row.style.display='grid'; row.style.gridTemplateColumns='repeat(2,1fr)'; row.style.gap='10px';
        opts.forEach(o=>{
          const b = document.createElement('div');
          b.className='cell';
          b.style.padding='16px'; b.style.textAlign='center'; b.style.cursor='pointer';
          b.style.fontFamily='var(--display)'; b.style.fontSize='24px';
          b.textContent = o;
          b.addEventListener('click', ()=>{
            if(o===n) ctx.onWin(); else ctx.onLose();
          });
          row.appendChild(b);
        });
        q.appendChild(row);
        MR.stage.appendChild(q);
      }
    }
  });


  MR.games.push({
    label: 'MEMORY',
    desc: 'Watch the flash sequence, then repeat it back.',
    word: 'WATCH & REPEAT',
    timeLimit: s => 4200/s,
    start(ctx){
      const wrap = document.createElement('div');
      wrap.style.display='grid';
      wrap.style.gridTemplateColumns='repeat(2, 1fr)';
      wrap.style.gap='12px';
      wrap.style.width='70%';
      const cells = [];
      for(let i=0;i<4;i++){
        const c = document.createElement('div');
        c.className='cell';
        c.style.aspectRatio='1';
        cells.push(c);
        wrap.appendChild(c);
      }
      MR.stage.appendChild(wrap);

      const sequence = [];
      const seqLen = 2 + Math.floor(Math.random()*2);
      while(sequence.length < seqLen){
        const idx = Math.floor(Math.random()*4);
        if(sequence[sequence.length-1] !== idx) sequence.push(idx);
      }

      let playback = true;
      let step = 0;
      function playStep(){
        if(MR.roundToken() !== ctx.token) return;
        if(step >= sequence.length){ playback=false; enableInput(); return; }
        const idx = sequence[step];
        cells[idx].classList.add('lit');
        setTimeout(()=>{
          cells[idx].classList.remove('lit');
          step++;
          setTimeout(playStep, 220/ctx.speedMul);
        }, 460/ctx.speedMul);
      }
      setTimeout(playStep, 400);

      function enableInput(){
        let guessIdx = 0;
        cells.forEach((c,i)=>{
          c.style.cursor='pointer';
          c.addEventListener('click', ()=>{
            if(playback) return;
            if(i === sequence[guessIdx]){
              c.classList.add('lit');
              setTimeout(()=>c.classList.remove('lit'),150);
              guessIdx++;
              if(guessIdx >= sequence.length) ctx.onWin();
            } else {
              ctx.onLose();
            }
          });
        });
      }
    }
  });


  MR.games.push({
    label: 'MATCH',
    desc: 'Memorize a color, then pick it out of a grid.',
    word: 'REMEMBER THIS',
    timeLimit: s => 3600/s,
    start(ctx){
      const colors = ['#3ef5c0','#ff3e7f','#f4e94c','#6b6580'];
      const target = MR.pick(colors);
      const shown = document.createElement('div');
      shown.style.width='90px'; shown.style.height='90px';
      shown.style.borderRadius='16px';
      shown.style.background = target;
      MR.stage.appendChild(shown);

      setTimeout(()=>{
        if(MR.roundToken() !== ctx.token) return;
        shown.remove();
        const opts = MR.shuffle(colors);
        const grid = document.createElement('div');
        grid.style.display='grid'; grid.style.gridTemplateColumns='repeat(2, 1fr)';
        grid.style.gap='14px'; grid.style.width='70%';
        opts.forEach(c=>{
          const cell = document.createElement('div');
          cell.className='cell';
          cell.style.aspectRatio='1'; cell.style.background=c; cell.style.cursor='pointer';
          cell.addEventListener('click', ()=>{
            if(c===target) ctx.onWin(); else ctx.onLose();
          });
          grid.appendChild(cell);
        });
        MR.stage.appendChild(grid);
      }, 750);
    }
  });


  MR.games.push({
    label: 'PATTERN',
    desc: 'Figure out what number comes next in the sequence.',
    word: "WHAT'S NEXT",
    timeLimit: s => 3800/s,
    start(ctx){
      const start = Math.floor(MR.rand(1,10));
      const step = Math.floor(MR.rand(2,6)) * (Math.random()<0.5?1:-1);
      const seq = [start, start+step, start+2*step];
      const answer = start+3*step;

      const wrap = document.createElement('div');
      wrap.style.display='flex'; wrap.style.flexDirection='column';
      wrap.style.alignItems='center'; wrap.style.gap='24px'; wrap.style.width='100%';

      const row = document.createElement('div');
      row.style.display='flex'; row.style.gap='14px'; row.style.alignItems='center';
      [...seq, '?'].forEach(v=>{
        const cell = document.createElement('div');
        cell.className='cell';
        cell.style.width='52px'; cell.style.height='52px';
        cell.style.display='flex'; cell.style.alignItems='center'; cell.style.justifyContent='center';
        cell.style.fontFamily='var(--display)'; cell.style.fontSize='20px'; cell.style.fontWeight='900';
        cell.style.color = v==='?' ? 'var(--flash)' : 'var(--ink)';
        cell.textContent = v;
        row.appendChild(cell);
      });
      wrap.appendChild(row);

      const opts = new Set([answer]);
      while(opts.size<4){
        const cand = answer + Math.floor(MR.rand(-4,5));
        if(cand!==answer) opts.add(cand);
      }
      const arr = MR.shuffle(Array.from(opts));
      const optRow = document.createElement('div');
      optRow.style.display='grid'; optRow.style.gridTemplateColumns='repeat(2,1fr)';
      optRow.style.gap='10px'; optRow.style.width='70%';
      arr.forEach(o=>{
        const cell = document.createElement('div');
        cell.className='cell';
        cell.style.padding='16px'; cell.style.textAlign='center'; cell.style.cursor='pointer';
        cell.style.fontFamily='var(--display)'; cell.style.fontSize='22px';
        cell.textContent = o;
        cell.addEventListener('click', ()=>{
          if(o===answer) ctx.onWin(); else ctx.onLose();
        });
        optRow.appendChild(cell);
      });
      wrap.appendChild(optRow);
      MR.stage.appendChild(wrap);
    }
  });


  MR.games.push({
    label: 'SPOT',
    desc: 'Find the tile that changed color between the two rows.',
    word: 'FIND THE SWAP',
    timeLimit: s => 3400/s,
    start(ctx){
      const colors = ['#3ef5c0','#ff3e7f','#f4e94c','#6b6580','#7a8cff','#ff9f4a'];
      const n = 6;
      const row1 = [];
      for(let i=0;i<n;i++) row1.push(MR.pick(colors));
      const diffCol = Math.floor(Math.random()*n);
      const row2 = [...row1];
      let alt;
      do { alt = MR.pick(colors); } while(alt===row1[diffCol]);
      row2[diffCol] = alt;

      const wrap = document.createElement('div');
      wrap.style.display='flex'; wrap.style.flexDirection='column';
      wrap.style.gap='14px'; wrap.style.width='100%';

      function buildRow(colorArr){
        const r = document.createElement('div');
        r.style.display='grid'; r.style.gridTemplateColumns='repeat('+n+',1fr)';
        r.style.gap='8px';
        colorArr.forEach((c,i)=>{
          const cell = document.createElement('div');
          cell.className='cell';
          cell.style.aspectRatio='1'; cell.style.background=c; cell.style.cursor='pointer';
          cell.addEventListener('click', ()=>{
            if(i===diffCol) ctx.onWin(); else ctx.onLose();
          });
          r.appendChild(cell);
        });
        return r;
      }
      wrap.appendChild(buildRow(row1));
      wrap.appendChild(buildRow(row2));
      MR.stage.appendChild(wrap);
    }
  });


  for(let i=CATEGORY_START;i<MR.games.length;i++) MR.games[i].category = 'memory';

})();
