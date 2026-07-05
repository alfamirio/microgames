(function(){
  "use strict";
  const MR = window.MR;
  const CATEGORY_START = MR.games.length;

  MR.games.push({
    label: 'MATH',
    desc: 'Solve the quick arithmetic problem.',
    word: 'SOLVE IT',
    timeLimit: s => 3400/s,
    start(ctx){
      const useSub = Math.random() < 0.35;
      let a, b, answer, opStr;
      if(useSub){
        a = Math.floor(MR.rand(5,18));
        b = Math.floor(MR.rand(1,a));
        answer = a-b;
        opStr = '-';
      } else {
        a = Math.floor(MR.rand(1,12));
        b = Math.floor(MR.rand(1,12));
        answer = a+b;
        opStr = '+';
      }

      const wrap = document.createElement('div');
      wrap.style.display='flex'; wrap.style.flexDirection='column';
      wrap.style.alignItems='center'; wrap.style.gap='22px'; wrap.style.width='100%';

      const q = document.createElement('div');
      q.className='prompt-word';
      q.style.fontSize='42px';
      q.textContent = a + ' ' + opStr + ' ' + b;
      wrap.appendChild(q);

      const opts = new Set([answer]);
      while(opts.size<4){
        const cand = answer + Math.floor(MR.rand(-5,6));
        if(cand!==answer && cand>=0) opts.add(cand);
      }
      const arr = MR.shuffle(Array.from(opts));
      const row = document.createElement('div');
      row.style.display='grid'; row.style.gridTemplateColumns='repeat(2,1fr)';
      row.style.gap='10px'; row.style.width='70%';
      arr.forEach(o=>{
        const cell = document.createElement('div');
        cell.className='cell';
        cell.style.padding='16px'; cell.style.textAlign='center'; cell.style.cursor='pointer';
        cell.style.fontFamily='var(--display)'; cell.style.fontSize='22px';
        cell.textContent = o;
        cell.addEventListener('click', ()=>{
          if(o===answer) ctx.onWin(); else ctx.onLose();
        });
        row.appendChild(cell);
      });
      wrap.appendChild(row);
      MR.stage.appendChild(wrap);
    }
  });

  const SCRAMBLE_WORDS = ['MADRID', 'LONDON', 'PARIS', 'TOKYO', 'BERLIN', 'ROME', 'DUBAI', 'MANILA', 'MOSCOW', 'LIMA'];


  MR.games.push({
    label: 'SCRAMBLE',
    desc: 'Tap the scrambled letters — or just type — in the right order to spell the word.',
    word: 'UNSCRAMBLE',
    timeLimit: s => 4400/s,
    start(ctx){
      const word = MR.pick(SCRAMBLE_WORDS);
      const letters = word.split('');
      let scrambled;
      do {
        scrambled = MR.shuffle(letters);
      } while(scrambled.join('')===word);

      const wrap = document.createElement('div');
      wrap.style.display='flex'; wrap.style.flexDirection='column';
      wrap.style.alignItems='center'; wrap.style.gap='20px'; wrap.style.width='100%';

      const slots = document.createElement('div');
      slots.style.display='flex'; slots.style.gap='8px';
      const slotEls = letters.map(()=>{
        const s = document.createElement('div');
        s.className='cell';
        s.style.width='38px'; s.style.height='46px';
        s.style.display='flex'; s.style.alignItems='center'; s.style.justifyContent='center';
        s.style.fontFamily='var(--display)'; s.style.fontSize='20px'; s.style.fontWeight='900';
        slots.appendChild(s);
        return s;
      });
      wrap.appendChild(slots);

      const bank = document.createElement('div');
      bank.style.display='flex'; bank.style.gap='8px'; bank.style.flexWrap='wrap';
      bank.style.justifyContent='center';

      const hint = document.createElement('div');
      hint.style.fontSize='11px'; hint.style.letterSpacing='0.1em'; hint.style.color='var(--dim)';
      hint.textContent = 'TAP OR TYPE THE LETTERS';
      wrap.appendChild(hint);

      let next = 0;
      let alive = true;

      // Map each letter to its tile elements so typing can find & "press" one.
      const tilesByLetter = {};
      scrambled.forEach(ch=>{
        const tile = document.createElement('div');
        tile.className='cell';
        tile.style.width='38px'; tile.style.height='46px'; tile.style.cursor='pointer';
        tile.style.display='flex'; tile.style.alignItems='center'; tile.style.justifyContent='center';
        tile.style.fontFamily='var(--display)'; tile.style.fontSize='20px'; tile.style.fontWeight='900';
        tile.textContent = ch;
        tile.addEventListener('click', ()=> pressLetter(ch, tile));
        bank.appendChild(tile);
        (tilesByLetter[ch] = tilesByLetter[ch] || []).push(tile);
      });
      wrap.appendChild(bank);
      MR.stage.appendChild(wrap);

      function pressLetter(ch, tileEl){
        if(!alive) return;
        if(tileEl && tileEl.dataset.used) return;
        if(ch === word[next]){
          if(tileEl){
            tileEl.dataset.used = '1';
            tileEl.style.opacity='0.25'; tileEl.style.pointerEvents='none';
          } else {
            // Typed input: find the first unused tile for this letter.
            const t = (tilesByLetter[ch]||[]).find(el=>!el.dataset.used);
            if(t){ t.dataset.used='1'; t.style.opacity='0.25'; t.style.pointerEvents='none'; }
          }
          slotEls[next].textContent = ch;
          next++;
          if(next>=word.length){
            alive = false;
            ctx.onWin();
          }
        } else {
          alive = false;
          ctx.onLose();
        }
      }

      MR.setKeyHandler((e)=>{
        if(!alive) return;
        const k = e.key.toUpperCase();
        if(k.length===1 && k>='A' && k<='Z') pressLetter(k, null);
      });

      ctx.onCleanup = ()=>{ alive = false; };
    }
  });


  MR.games.push({
    label: 'ORDER',
    desc: 'Tap the scattered numbers in ascending order.',
    word: 'IN ORDER',
    timeLimit: s => 3600/s,
    start(ctx){
      const n = Math.floor(Math.random() * 2) + 2;
      const positions = [];
      for(let i=0;i<n;i++){
        positions.push({x: MR.rand(8,78), y: MR.rand(8,70)});
      }
      let next = 1;
      positions.forEach((p,i)=>{
        const b = document.createElement('div');
        b.className='target';
        b.style.width='56px'; b.style.height='56px';
        b.style.left = p.x+'%'; b.style.top = p.y+'%';
        b.style.position='absolute';
        b.style.cursor='pointer';
        b.style.fontFamily='var(--display)'; b.style.fontSize='22px';
        b.style.color='#0b0b10'; b.style.fontWeight='900';
        b.textContent = i+1;
        b.addEventListener('click', ()=>{
          if(i+1 === next){
            b.style.background = 'var(--dim)';
            b.style.pointerEvents='none';
            next++;
            if(next > n) ctx.onWin();
          } else {
            ctx.onLose();
          }
        });
        MR.stage.appendChild(b);
      });
    }
  });


  MR.games.push({
    label: 'SORT IT',
    desc: 'Tap the shapes in order — smallest to largest.',
    word: 'SMALLEST TO LARGEST',
    timeLimit: s => 3800/s,
    start(ctx){
      const n = 3;
      const positions = [];
      for(let i=0;i<n;i++){
        positions.push({x: MR.rand(6,62), y: MR.rand(6,54)});
      }

      const sizes = [30,60,90];
      const shuffled = MR.shuffle(sizes);
      const order = shuffled.map((sz,i)=>i).sort((a,b)=>shuffled[a]-shuffled[b]);

      let next = 0;
      shuffled.forEach((sz,i)=>{
        const b = document.createElement('div');
        b.className = 'target';
        b.style.width = sz+'px'; b.style.height = sz+'px';
        b.style.left = positions[i].x+'%'; b.style.top = positions[i].y+'%';
        b.style.cursor = 'pointer';
        b.addEventListener('click', ()=>{
          if(order[next] === i){
            b.style.opacity = '0.25';
            b.style.pointerEvents = 'none';
            next++;
            if(next >= n) ctx.onWin();
          } else {
            ctx.onLose();
          }
        });
        MR.stage.appendChild(b);
      });
    }
  });

  MR.games.push({
    label: 'MATCH TYPE',
    desc: 'Compare the two icons — tap SAME or DIFFERENT (or use S / D keys).',
    word: 'SAME OR DIFFERENT?',
    timeLimit: s => 3000/s,
    start(ctx){
      const shapeRadii = ['50%','8px'];
      const colors = ['#3ef5c0','#ff3e7f','#f4e94c','#7a8cff','#ff9f4a'];
      const shape1 = MR.pick(shapeRadii);
      const color1 = MR.pick(colors);
      const same = Math.random() < 0.5;
      let shape2, color2;
      if(same){
        shape2 = shape1; color2 = color1;
      } else {
        do {
          shape2 = MR.pick(shapeRadii);
          color2 = MR.pick(colors);
        } while(shape2===shape1 && color2===color1);
      }

      const wrap = document.createElement('div');
      wrap.style.display='flex'; wrap.style.flexDirection='column';
      wrap.style.alignItems='center'; wrap.style.gap='30px';

      const row = document.createElement('div');
      row.style.display='flex'; row.style.gap='36px';
      [[shape1,color1],[shape2,color2]].forEach(([radius,color])=>{
        const icon = document.createElement('div');
        icon.style.width='72px'; icon.style.height='72px';
        icon.style.borderRadius = radius;
        icon.style.background = color;
        row.appendChild(icon);
      });
      wrap.appendChild(row);

      const btnRow = document.createElement('div');
      btnRow.style.display='flex'; btnRow.style.gap='14px';

      let alive = true;
      function choose(isSameChoice){
        if(!alive) return;
        alive = false;
        (isSameChoice === same) ? ctx.onWin() : ctx.onLose();
      }

      const btnSame = document.createElement('div');
      btnSame.className = 'cell';
      btnSame.style.padding='14px 22px'; btnSame.style.cursor='pointer';
      btnSame.style.fontFamily='var(--display)'; btnSame.style.fontSize='14px';
      btnSame.textContent = 'SAME (S)';
      btnSame.addEventListener('click', ()=>choose(true));

      const btnDiff = document.createElement('div');
      btnDiff.className = 'cell';
      btnDiff.style.padding='14px 22px'; btnDiff.style.cursor='pointer';
      btnDiff.style.fontFamily='var(--display)'; btnDiff.style.fontSize='14px';
      btnDiff.textContent = 'DIFFERENT (D)';
      btnDiff.addEventListener('click', ()=>choose(false));

      btnRow.appendChild(btnSame);
      btnRow.appendChild(btnDiff);
      wrap.appendChild(btnRow);

      MR.stage.appendChild(wrap);

      MR.setKeyHandler((e)=>{
        const k = e.key.toLowerCase();
        if(k==='s' || e.key==='ArrowLeft') choose(true);
        else if(k==='d' || e.key==='ArrowRight') choose(false);
      });
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
    label: 'MORE DOTS',
    desc: 'Two clusters of scattered dots — tap the one with more.',
    word: 'WHICH HAS MORE?',
    timeLimit: s => 3200/s,
    start(ctx){
      const leftCount = 4 + Math.floor(MR.rand(0,8));
      let rightCount;
      do {
        rightCount = 4 + Math.floor(MR.rand(0,8));
      } while(Math.abs(rightCount-leftCount) < 3);

      const row = document.createElement('div');
      row.style.display='flex'; row.style.gap='16px';
      row.style.width='100%'; row.style.height='65%';

      function buildCluster(count, isCorrect){
        const box = document.createElement('div');
        box.className='cell';
        box.style.position='relative';
        box.style.flex='1'; box.style.cursor='pointer';
        for(let i=0;i<count;i++){
          const d = document.createElement('div');
          d.className='dot';
          d.style.width='16px'; d.style.height='16px';
          d.style.background='var(--flash)';
          d.style.position='absolute';
          d.style.left = MR.rand(8,80)+'%';
          d.style.top = MR.rand(8,80)+'%';
          box.appendChild(d);
        }
        box.addEventListener('click', ()=>{
          if(isCorrect) ctx.onWin(); else ctx.onLose();
        });
        return box;
      }

      row.appendChild(buildCluster(leftCount, leftCount>rightCount));
      row.appendChild(buildCluster(rightCount, rightCount>leftCount));
      MR.stage.appendChild(row);
    }
  });


  MR.games.push({
    label: 'MISSING PIECE',
    desc: 'A tile is missing from the grid — tap the piece that completes it.',
    word: "WHAT'S MISSING?",
    timeLimit: s => 3400/s,
    start(ctx){
      const colors = ['#3ef5c0','#ff3e7f','#f4e94c','#7a8cff'];
      const arrangement = MR.shuffle(colors);
      const missingIdx = Math.floor(Math.random()*4);
      const missingColor = arrangement[missingIdx];

      const wrap = document.createElement('div');
      wrap.style.display='flex'; wrap.style.flexDirection='column';
      wrap.style.alignItems='center'; wrap.style.gap='26px'; wrap.style.width='100%';

      const grid = document.createElement('div');
      grid.style.display='grid'; grid.style.gridTemplateColumns='repeat(2,1fr)';
      grid.style.gap='10px'; grid.style.width='45%';
      arrangement.forEach((c,i)=>{
        const cell = document.createElement('div');
        cell.style.aspectRatio='1'; cell.style.borderRadius='10px';
        if(i===missingIdx){
          cell.style.border='3px dashed var(--dim)';
          cell.style.boxSizing='border-box';
        } else {
          cell.style.background=c;
        }
        grid.appendChild(cell);
      });
      wrap.appendChild(grid);

      const optRow = document.createElement('div');
      optRow.style.display='flex'; optRow.style.gap='14px';
      MR.shuffle(colors).forEach(c=>{
        const piece = document.createElement('div');
        piece.className='cell';
        piece.style.width='58px'; piece.style.height='58px';
        piece.style.background=c; piece.style.cursor='pointer';
        piece.addEventListener('click', ()=>{
          if(c===missingColor) ctx.onWin(); else ctx.onLose();
        });
        optRow.appendChild(piece);
      });
      wrap.appendChild(optRow);

      MR.stage.appendChild(wrap);
    }
  });


  MR.games.push({
    label: 'MIRROR MATCH',
    desc: 'Compare the shape to two versions — tap the one that\'s flipped.',
    word: 'FIND THE MIRROR',
    timeLimit: s => 3400/s,
    start(ctx){
      const colors = ['#3ef5c0','#ff3e7f','#f4e94c','#7a8cff','#ff9f4a'];
      const color = MR.pick(colors);
      // Asymmetric arrow shape: clearly different from its own mirror image.
      const shapePath = 'polygon(0% 0%, 100% 50%, 0% 100%, 30% 50%)';

      const wrap = document.createElement('div');
      wrap.style.display='flex'; wrap.style.flexDirection='column';
      wrap.style.alignItems='center'; wrap.style.gap='30px';

      const original = document.createElement('div');
      original.style.width='110px'; original.style.height='80px';
      original.style.background=color;
      original.style.clipPath = shapePath;
      wrap.appendChild(original);

      const row = document.createElement('div');
      row.style.display='flex'; row.style.gap='30px';

      const mirroredFirst = Math.random() < 0.5;
      [mirroredFirst, !mirroredFirst].forEach(isMirrored=>{
        const opt = document.createElement('div');
        opt.className='cell';
        opt.style.width='130px'; opt.style.height='100px';
        opt.style.display='flex'; opt.style.alignItems='center'; opt.style.justifyContent='center';
        opt.style.cursor='pointer';
        const shape = document.createElement('div');
        shape.style.width='110px'; shape.style.height='80px';
        shape.style.background=color;
        shape.style.clipPath = shapePath;
        if(isMirrored) shape.style.transform = 'scaleX(-1)';
        opt.appendChild(shape);
        opt.addEventListener('click', ()=>{
          if(isMirrored) ctx.onWin(); else ctx.onLose();
        });
        row.appendChild(opt);
      });
      wrap.appendChild(row);

      MR.stage.appendChild(wrap);
    }
  });



  MR.games.push({
    label: 'GROUP BY RULE',
    desc: 'Five shapes share a trait — color, size, or form. Tap the one that breaks it.',
    word: 'FIND WHAT BREAKS THE PATTERN',
    timeLimit: s => 3800/s,
    start(ctx){
      const colors = ['#3ef5c0','#ff3e7f','#f4e94c','#7a8cff','#ff9f4a','#4ac9ff','#c792ff','#ffe066'];
      const n = 6;
      const oddIdx = Math.floor(Math.random()*n);

      // Every shape form is drawn via clip-path (or none, for the circle/
      // square cases) so any of them can serve as the "base" or the "odd"
      // form on a given round, not just a fixed circle-vs-square pair.
      const shapeForms = [
        { name:'circle',   apply(el){ el.style.borderRadius='50%'; el.style.clipPath='none'; } },
        { name:'square',   apply(el){ el.style.borderRadius='6px'; el.style.clipPath='none'; } },
        { name:'diamond',  apply(el){ el.style.borderRadius='0'; el.style.clipPath='polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'; } },
        { name:'triangle', apply(el){ el.style.borderRadius='0'; el.style.clipPath='polygon(50% 0%, 100% 100%, 0% 100%)'; } },
        { name:'pentagon', apply(el){ el.style.borderRadius='0'; el.style.clipPath='polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)'; } }
      ];

      // Pick which single trait varies this round. Every other trait stays
      // identical across all 6 shapes, so the odd one is only ever wrong
      // in exactly one dimension — the player has to notice which.
      const rule = MR.pick(['color','size','form']);

      const baseColor = MR.pick(colors);
      let oddColor = baseColor;
      if(rule === 'color'){
        do { oddColor = MR.pick(colors); } while(oddColor === baseColor);
      }

      const baseSize = 56;
      const oddSize = rule === 'size' ? baseSize * 0.55 : baseSize;

      const baseForm = MR.pick(shapeForms);
      let oddForm = baseForm;
      if(rule === 'form'){
        do { oddForm = MR.pick(shapeForms); } while(oddForm.name === baseForm.name);
      }

      const grid = document.createElement('div');
      grid.style.display='grid';
      grid.style.gridTemplateColumns='repeat(3, 1fr)';
      grid.style.gridTemplateRows='repeat(2, 1fr)';
      grid.style.gap='22px';
      grid.style.width='80%';
      grid.style.height='55%';
      grid.style.placeItems='center';

      for(let i=0;i<n;i++){
        const isOdd = i===oddIdx;
        const shape = document.createElement('div');
        const size = isOdd ? oddSize : baseSize;
        shape.style.width = size+'px';
        shape.style.height = size+'px';
        shape.style.background = isOdd ? oddColor : baseColor;
        (isOdd ? oddForm : baseForm).apply(shape);
        shape.style.cursor = 'pointer';
        shape.addEventListener('click', ()=>{
          if(isOdd) ctx.onWin(); else ctx.onLose();
        });
        grid.appendChild(shape);
      }
      MR.stage.appendChild(grid);
    }
  });


  for(let i=CATEGORY_START;i<MR.games.length;i++) MR.games[i].category = 'logic';

})();
