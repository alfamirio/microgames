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

      const wrap = MR.makeEl('', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '22px', width: '100%' });

      const q = MR.makeEl('prompt-word', { fontSize: '42px' });
      q.textContent = a + ' ' + opStr + ' ' + b;
      wrap.appendChild(q);

      const opts = MR.distractorOptions(answer, 4, 5, 0);
      const row = MR.buildOptionGrid(opts, (o)=>{
        if(o===answer) ctx.onWin(); else ctx.onLose();
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

      const wrap = MR.makeEl('', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' });

      const slots = MR.makeEl('', { display: 'flex', gap: '8px' });
      const slotEls = letters.map(()=>{
        const s = MR.makeEl('cell', { width: '38px', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: '20px', fontWeight: '900' });
        slots.appendChild(s);
        return s;
      });
      wrap.appendChild(slots);

      const bank = MR.makeEl('', { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' });

      const hint = MR.makeEl('', { fontSize: '11px', letterSpacing: '0.1em', color: 'var(--dim)' });
      hint.textContent = 'TAP OR TYPE THE LETTERS';
      wrap.appendChild(hint);

      let next = 0;
      let alive = true;

      // Map each letter to its tile elements so typing can find & "press" one.
      const tilesByLetter = {};
      scrambled.forEach(ch=>{
        const tile = MR.makeEl('cell', { width: '38px', height: '46px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: '20px', fontWeight: '900' });
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
            MR.styleEl(tileEl, { opacity: '0.25', pointerEvents: 'none' });
          } else {
            // Typed input: find the first unused tile for this letter.
            const t = (tilesByLetter[ch]||[]).find(el=>!el.dataset.used);
            if(t){ t.dataset.used='1'; MR.styleEl(t, { opacity: '0.25', pointerEvents: 'none' }); }
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
        const b = MR.makeEl('target', { width: '56px', height: '56px', left: p.x+'%', top: p.y+'%', position: 'absolute', cursor: 'pointer', fontFamily: 'var(--display)', fontSize: '22px', color: '#0b0b10', fontWeight: '900' });
        b.textContent = i+1;
        MR.bindActivate(b, ()=>{
          if(i+1 === next){
            MR.styleEl(b, { background: 'var(--dim)', pointerEvents: 'none' });
            next++;
            if(next > n) ctx.onWin();
          } else {
            ctx.onLose();
          }
        }, { key: String(i+1), showHint: false });
        MR.stage.appendChild(b);
      });
    }
  });


  MR.games.push({
    label: 'MATCH TYPE',
    desc: 'Compare the two icons — tap SAME or DIFFERENT (or press 1 / 2).',
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

      const wrap = MR.makeEl('', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px' });

      const row = MR.makeEl('', { display: 'flex', gap: '36px' });
      [[shape1,color1],[shape2,color2]].forEach(([radius,color])=>{
        const icon = MR.makeEl('', { width: '72px', height: '72px', borderRadius: radius, background: color });
        row.appendChild(icon);
      });
      wrap.appendChild(row);

      const btnRow = MR.makeEl('', { display: 'flex', gap: '14px' });

      let alive = true;
      function choose(isSameChoice){
        if(!alive) return;
        alive = false;
        (isSameChoice === same) ? ctx.onWin() : ctx.onLose();
      }

      const btnSame = MR.makeEl('cell', { padding: '14px 22px', cursor: 'pointer', fontFamily: 'var(--display)', fontSize: '14px' });
      btnSame.textContent = 'SAME';
      MR.bindActivate(btnSame, ()=>choose(true), { key: '1' });

      const btnDiff = MR.makeEl('cell', { padding: '14px 22px', cursor: 'pointer', fontFamily: 'var(--display)', fontSize: '14px' });
      btnDiff.textContent = 'DIFFERENT';
      MR.bindActivate(btnDiff, ()=>choose(false), { key: '2' });

      btnRow.appendChild(btnSame);
      btnRow.appendChild(btnDiff);
      wrap.appendChild(btnRow);

      MR.stage.appendChild(wrap);
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
      const socket = MR.makeEl('', { position: 'absolute', left: sPct.x+'%', top: sPct.y+'%', width: '76px', height: '76px', borderRadius: '50%', border: '3px dashed var(--dim)', boxSizing: 'border-box' });
      MR.stage.appendChild(socket);

      let startX, startY;
      do {
        startX = MR.rand(8,70); startY = MR.rand(8,68);
      } while(Math.hypot(startX-sPct.x, startY-sPct.y) < 32);

      const shape = MR.makeEl('', { position: 'absolute', left: startX+'%', top: startY+'%', width: '56px', height: '56px', borderRadius: '50%', background: 'var(--flash)', cursor: 'grab', touchAction: 'none', zIndex: '10' });
      MR.stage.appendChild(shape);

      let dragging = false, dx=0, dy=0, alive=true;
      const capture = MR.pointerCaptureTracker(shape);

      function setShapePx(px, py){
        MR.styleEl(shape, { left: px+'px', top: py+'px' });
      }

      shape.addEventListener('pointerdown', (e)=>{
        if(!alive) return;
        dragging = true;
        capture.onDown(e);
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
      function finishDrag(e){
        if(!dragging || !alive) return;
        dragging = false;
        if(e) capture.onUp(e);
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

      ctx.onCleanup = ()=>{
        alive=false;
        // The round can time out while the shape is still mid-drag —
        // finishDrag() only runs from pointerup/pointercancel, so that
        // path never releases capture. Cover it here too.
        capture.release();
      };
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

      const row = MR.makeEl('', { display: 'flex', gap: '16px', width: '100%', height: '65%' });

      function buildCluster(count, isCorrect, key){
        const box = MR.makeEl('cell', { position: 'relative', flex: '1', cursor: 'pointer' });
        for(let i=0;i<count;i++){
          const d = MR.makeEl('dot', { width: '16px', height: '16px', background: 'var(--flash)', position: 'absolute', left: MR.rand(8,80)+'%', top: MR.rand(8,80)+'%' });
          box.appendChild(d);
        }
        MR.bindActivate(box, ()=>{
          if(isCorrect) ctx.onWin(); else ctx.onLose();
        }, { key });
        return box;
      }

      row.appendChild(buildCluster(leftCount, leftCount>rightCount, '1'));
      row.appendChild(buildCluster(rightCount, rightCount>leftCount, '2'));
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

      const wrap = MR.makeEl('', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '26px', width: '100%' });

      const { wrap: grid, cells } = MR.makeGrid(2, 2, { gap: '10px', width: '45%', cellClass: '', cellStyles: { aspectRatio: '1', borderRadius: '10px' } });
      cells.forEach((cell,i)=>{
        if(i===missingIdx){
          MR.styleEl(cell, { border: '3px dashed var(--dim)', boxSizing: 'border-box' });
        } else {
          cell.style.background = arrangement[i];
        }
      });
      wrap.appendChild(grid);

      const optRow = MR.makeEl('', { display: 'flex', gap: '14px' });
      const pieceColors = MR.shuffle(colors);
      const pieces = pieceColors.map(c=>{
        const piece = MR.makeEl('cell', { width: '58px', height: '58px', background: c, cursor: 'pointer' });
        optRow.appendChild(piece);
        return piece;
      });
      MR.bindGridActivate(pieces, (i)=>{
        if(pieceColors[i]===missingColor) ctx.onWin(); else ctx.onLose();
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

      const wrap = MR.makeEl('', { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px' });

      const original = MR.makeEl('', { width: '110px', height: '80px', background: color, clipPath: shapePath });
      wrap.appendChild(original);

      const row = MR.makeEl('', { display: 'flex', gap: '30px' });

      const mirroredFirst = Math.random() < 0.5;
      [mirroredFirst, !mirroredFirst].forEach((isMirrored, i)=>{
        const opt = MR.makeEl('cell', { width: '130px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' });
        const shape = MR.makeEl('', { width: '110px', height: '80px', background: color, clipPath: shapePath });
        if(isMirrored) shape.style.transform = 'scaleX(-1)';
        opt.appendChild(shape);
        MR.bindActivate(opt, ()=>{
          if(isMirrored) ctx.onWin(); else ctx.onLose();
        }, { key: String(i+1) });
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
        { name:'circle',   apply(el){ MR.styleEl(el, { borderRadius: '50%', clipPath: 'none' }); } },
        { name:'square',   apply(el){ MR.styleEl(el, { borderRadius: '6px', clipPath: 'none' }); } },
        { name:'diamond',  apply(el){ MR.styleEl(el, { borderRadius: '0', clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }); } },
        { name:'triangle', apply(el){ MR.styleEl(el, { borderRadius: '0', clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }); } },
        { name:'pentagon', apply(el){ MR.styleEl(el, { borderRadius: '0', clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' }); } }
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

      const { wrap: grid, cells } = MR.makeGrid(2, 3, { gap: '22px', width: '80%', height: '55%', wrapStyles: { placeItems: 'center' }, cellClass: '', cellStyles: { cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' } });

      // Each cell is a plain, unclipped wrapper (holds the click/key
      // binding + hint badge); the actual shape — which may have a
      // clip-path applied — lives in a separate inner div. Putting the
      // hint on the shape itself would get clipped away right along with
      // it on the diamond/triangle/pentagon forms.
      const shapes = cells.map(cell=>{
        const inner = MR.makeEl('');
        cell.appendChild(inner);
        return inner;
      });

      shapes.forEach((shape,i)=>{
        const isOdd = i===oddIdx;
        const size = isOdd ? oddSize : baseSize;
        MR.styleEl(shape, { width: size+'px', height: size+'px', background: isOdd ? oddColor : baseColor });
        (isOdd ? oddForm : baseForm).apply(shape);
      });
      MR.bindGridActivate(cells, (i)=>{
        if(i===oddIdx) ctx.onWin(); else ctx.onLose();
      });
      MR.stage.appendChild(grid);
    }
  });


  for(let i=CATEGORY_START;i<MR.games.length;i++) MR.games[i].category = 'logic';

})();
