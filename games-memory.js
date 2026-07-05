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
      const dotsWrap = MR.makeEl('', { position: 'relative', width: '100%', height: '60%' });
      for(let i=0;i<n;i++){
        const d = MR.makeEl('dot', { width: '22px', height: '22px', background: 'var(--flash)', left: MR.rand(5,85)+'%', top: MR.rand(5,80)+'%' });
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
        const opts = MR.distractorOptions(n, 4, 3, 1);
        const q = MR.makeEl('', { display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' });
        const label = MR.makeEl('prompt-word', { fontSize: '22px' });
        label.textContent = 'how many?';
        q.appendChild(label);
        const row = MR.buildOptionGrid(opts, (o)=>{
          if(o===n) ctx.onWin(); else ctx.onLose();
        }, { fontSize: '24px' });
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
      const { wrap, cells } = MR.makeGrid(2, 2, { gap: '12px', width: '70%', cellStyles: { aspectRatio: '1' } });
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

      const box = MR.makeEl('', { width: '120px', height: '120px', borderRadius: '16px', background: 'transparent', border: '3px solid var(--dim)', boxSizing: 'border-box' });
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
        const wrap = MR.makeEl('', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' });

        const label = MR.makeEl('prompt-word', { fontSize: '20px' });
        label.textContent = 'which color repeated?';
        wrap.appendChild(label);

        const row = MR.makeEl('', { display: 'flex', gap: '18px' });
        MR.shuffle(colors).forEach(c=>{
          const cell = MR.makeEl('cell', { width: '90px', height: '90px', background: c, cursor: 'pointer' });
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
      const shown = MR.makeEl('', { width: '90px', height: '90px', borderRadius: '16px', background: target });
      MR.stage.appendChild(shown);

      setTimeout(()=>{
        if(MR.roundToken() !== ctx.token) return;
        shown.remove();
        const opts = MR.shuffle(colors);
        const { wrap: grid, cells } = MR.makeGrid(2, 2, { gap: '14px', width: '70%', cellStyles: { aspectRatio: '1', cursor: 'pointer' } });
        cells.forEach((cell,i)=>{
          const c = opts[i];
          cell.style.background = c;
          cell.addEventListener('click', ()=>{
            if(c===target) ctx.onWin(); else ctx.onLose();
          });
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

      const wrap = MR.makeEl('', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', width: '100%' });

      const row = MR.makeEl('', { display: 'flex', gap: '14px', alignItems: 'center' });
      [...seq, '?'].forEach(v=>{
        const cell = MR.makeEl('cell', { width: '52px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: '20px', fontWeight: '900', color: v==='?' ? 'var(--flash)' : 'var(--ink)' });
        cell.textContent = v;
        row.appendChild(cell);
      });
      wrap.appendChild(row);

      const opts = MR.distractorOptions(answer, 4, 4);
      const optRow = MR.buildOptionGrid(opts, (o)=>{
        if(o===answer) ctx.onWin(); else ctx.onLose();
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

      const wrap = MR.makeEl('', { display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' });

      function buildRow(colorArr){
        const { wrap: r, cells } = MR.makeGrid(1, n, { gap: '8px', cellStyles: { aspectRatio: '1', cursor: 'pointer' } });
        cells.forEach((cell,i)=>{
          cell.style.background = colorArr[i];
          cell.addEventListener('click', ()=>{
            if(i===diffCol) ctx.onWin(); else ctx.onLose();
          });
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

      const dot = MR.makeEl('', { position: 'absolute', width: '28px', height: '28px', borderRadius: '50%', background: 'var(--flash)', left: targetPos.x+'%', top: targetPos.y+'%', transform: 'translate(-50%,-50%)' });
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
          const d = MR.makeEl('', { position: 'absolute', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--flash)', left: MR.rand(10,90)+'%', top: MR.rand(10,85)+'%', transform: 'translate(-50%,-50%)' });
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

        const label = MR.makeEl('prompt-word', { fontSize: '18px', position: 'absolute', top: '4%', left: '50%', transform: 'translateX(-50%)' });
        label.textContent = 'where was it?';
        MR.stage.appendChild(label);

        shuffled.forEach(p=>{
          const marker = MR.makeEl('cell', { position: 'absolute', width: '44px', height: '44px', borderRadius: '50%', left: p.x+'%', top: p.y+'%', transform: 'translate(-50%,-50%)', cursor: 'pointer' });
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

      const { wrap: grid, cells: cards } = MR.makeGrid(2, 3, { gap: '12px', width: '80%', height: '60%', cellStyles: { transition: 'background 0.2s' } });
      cards.forEach((card,i)=>{ card.style.background = arrangement[i]; });
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
