(function(){
  "use strict";
  const MR = window.MR;
  const CATEGORY_START = MR.games.length;

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
        // floored: this is watch-and-memorize, not a reflex test, so the
        // flashes need to stay legible even as difficulty climbs
        setTimeout(()=>{
          cells[idx].classList.remove('lit');
          step++;
          setTimeout(playStep, Math.max(160, 220/ctx.speedMul));
        }, Math.max(320, 460/ctx.speedMul));
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
    label: 'ODD FLASH',
    desc: 'Watch the colors flash by, then pick the one that flashed twice.',
    word: 'WHICH REPEATED?',
    timeLimit: s => 5000/s,
    start(ctx){
      const palette = ['#3ef5c0','#ff3e7f','#f4e94c'];
      const colors = MR.shuffle(palette).slice(0,2);
      const repeatColor = MR.pick(colors);

      let sequence;
      do {
        sequence = MR.shuffle([...colors, repeatColor]);
      } while(sequence.some((c,i)=> i>0 && sequence[i-1]===c));

      const box = document.createElement('div');
      box.style.width='120px'; box.style.height='120px';
      box.style.borderRadius='16px';
      box.style.background = 'transparent';
      box.style.border = '3px solid var(--dim)';
      box.style.boxSizing = 'border-box';
      MR.stage.appendChild(box);

      // Fixed, generous timing (only lightly speed-scaled) so the
      // 3-flash sequence stays easy to hold in mind even as rounds speed up.
      let step = 0;
      function playStep(){
        if(MR.roundToken() !== ctx.token) return;
        if(step >= sequence.length){ box.remove(); askAnswer(); return; }
        box.style.background = sequence[step];
        setTimeout(()=>{
          if(MR.roundToken() !== ctx.token) return;
          box.style.background = 'transparent';
          step++;
          setTimeout(playStep, Math.max(260, 320/Math.sqrt(ctx.speedMul)));
        }, Math.max(550, 650/Math.sqrt(ctx.speedMul)));
      }
      setTimeout(playStep, 500);

      function askAnswer(){
        const wrap = document.createElement('div');
        wrap.style.display='flex'; wrap.style.flexDirection='column';
        wrap.style.alignItems='center'; wrap.style.gap='20px'; wrap.style.width='100%';

        const label = document.createElement('div');
        label.className='prompt-word'; label.style.fontSize='20px';
        label.textContent = 'which color repeated?';
        wrap.appendChild(label);

        const row = document.createElement('div');
        row.style.display='flex'; row.style.gap='18px';
        MR.shuffle(colors).forEach(c=>{
          const cell = document.createElement('div');
          cell.className='cell';
          cell.style.width='90px'; cell.style.height='90px';
          cell.style.background=c; cell.style.cursor='pointer';
          cell.addEventListener('click', ()=>{
            if(c===repeatColor) ctx.onWin(); else ctx.onLose();
          });
          row.appendChild(cell);
        });
        wrap.appendChild(row);
        MR.stage.appendChild(wrap);
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


  MR.games.push({
    label: 'POSITION',
    desc: 'Memorize where the dot flashed, then tap the matching spot.',
    word: 'REMEMBER WHERE',
    timeLimit: s => 3600/s,
    start(ctx){
      // Keep the dot (and every candidate) well inside the stage so the
      // flash and the later tap targets never clip against an edge.
      const targetPos = { x: MR.rand(12,88), y: MR.rand(12,80) };

      const dot = document.createElement('div');
      dot.style.position='absolute';
      dot.style.width='28px'; dot.style.height='28px';
      dot.style.borderRadius='50%';
      dot.style.background='var(--flash)';
      dot.style.left = targetPos.x+'%'; dot.style.top = targetPos.y+'%';
      dot.style.transform = 'translate(-50%,-50%)';
      MR.stage.appendChild(dot);

      setTimeout(()=>{
        if(MR.roundToken() !== ctx.token) return;
        dot.remove();
        spawnDistractors(askAnswer);
      }, 700);

      // Fires a burst of decoy dots (dim, not the flash color) at random
      // spots for about a second before the answer options appear, so the
      // player has to hold the real position in mind through visual noise.
      function spawnDistractors(done){
        const total = 6;
        let spawned = 0;
        function spawnOne(){
          if(MR.roundToken() !== ctx.token) return;
          if(spawned >= total){ done(); return; }
          spawned++;
          const d = document.createElement('div');
          d.style.position='absolute';
          d.style.width='24px'; d.style.height='24px';
          d.style.borderRadius='50%';
          d.style.background='var(--flash)';
          d.style.left = MR.rand(10,90)+'%'; d.style.top = MR.rand(10,85)+'%';
          d.style.transform = 'translate(-50%,-50%)';
          MR.stage.appendChild(d);
          setTimeout(()=>{ d.remove(); }, 220);
          setTimeout(spawnOne, 160);
        }
        spawnOne();
      }

      function askAnswer(){
        // Build the true spot plus three decoys, each kept a minimum
        // distance from every other so the options are never ambiguous.
        const positions = [targetPos];
        while(positions.length < 4){
          const cand = { x: MR.rand(10,90), y: MR.rand(10,82) };
          const tooClose = positions.some(p => Math.hypot(p.x-cand.x, p.y-cand.y) < 22);
          if(!tooClose) positions.push(cand);
        }
        const shuffled = MR.shuffle(positions);

        const label = document.createElement('div');
        label.className='prompt-word'; label.style.fontSize='18px';
        label.style.position='absolute'; label.style.top='4%'; label.style.left='50%';
        label.style.transform='translateX(-50%)';
        label.textContent = 'where was it?';
        MR.stage.appendChild(label);

        shuffled.forEach(p=>{
          const marker = document.createElement('div');
          marker.className='cell';
          marker.style.position='absolute';
          marker.style.width='44px'; marker.style.height='44px';
          marker.style.borderRadius='50%';
          marker.style.left = p.x+'%'; marker.style.top = p.y+'%';
          marker.style.transform = 'translate(-50%,-50%)';
          marker.style.cursor='pointer';
          marker.addEventListener('click', ()=>{
            if(p===targetPos) ctx.onWin(); else ctx.onLose();
          });
          MR.stage.appendChild(marker);
        });
      }
    }
  });


  MR.games.push({
    label: 'CARD PEEK',
    desc: 'Peek at all 6 cards, then find the one that matches the flipped card.',
    word: 'MEMORIZE THE CARDS',
    timeLimit: s => 4200/s,
    start(ctx){
      const colors = ['#3ef5c0','#ff3e7f','#f4e94c'];
      const arrangement = MR.shuffle([...colors, ...colors]); // 3 pairs, 6 cards

      const grid = document.createElement('div');
      grid.style.display='grid';
      grid.style.gridTemplateColumns='repeat(3, 1fr)';
      grid.style.gridTemplateRows='repeat(2, 1fr)';
      grid.style.gap='12px';
      grid.style.width='80%';
      grid.style.height='60%';

      const cards = arrangement.map(color=>{
        const card = document.createElement('div');
        card.className='cell';
        card.style.background = color;
        card.style.transition = 'background 0.2s';
        grid.appendChild(card);
        return card;
      });
      MR.stage.appendChild(grid);

      // Peek phase: show all 6 face up, then flip every card face down.
      setTimeout(()=>{
        if(MR.roundToken() !== ctx.token) return;
        cards.forEach(c=>{ c.style.background='var(--dim)'; });
        revealTarget();
      }, 1100);

      function revealTarget(){
        const targetIdx = Math.floor(Math.random()*arrangement.length);
        const pairIdx = arrangement.findIndex((c,i)=> i!==targetIdx && c===arrangement[targetIdx]);

        cards[targetIdx].style.background = arrangement[targetIdx];
        cards[targetIdx].style.cursor = 'default';

        cards.forEach((c,i)=>{
          if(i===targetIdx) return;
          c.style.cursor = 'pointer';
          c.addEventListener('click', ()=>{
            if(i===pairIdx) ctx.onWin(); else ctx.onLose();
          });
        });
      }
    }
  });


  for(let i=CATEGORY_START;i<MR.games.length;i++) MR.games[i].category = 'memory';

})();
