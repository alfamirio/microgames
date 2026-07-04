(function(){
  "use strict";
  const MR = window.MR;

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
      const arr = Array.from(opts).sort(()=>Math.random()-0.5);
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

  const SCRAMBLE_WORDS = ['CODE','GAME','LEAP','QUICK','BRAVE','STORM','LIGHT','FLASH','TRACK','PIXEL'];


  MR.games.push({
    label: 'SCRAMBLE',
    desc: 'Tap the scrambled letters in the right order to spell the word.',
    word: 'UNSCRAMBLE',
    timeLimit: s => 4400/s,
    start(ctx){
      const word = MR.pick(SCRAMBLE_WORDS);
      const letters = word.split('');
      let scrambled;
      do {
        scrambled = [...letters].sort(()=>Math.random()-0.5);
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

      let next = 0;
      scrambled.forEach(ch=>{
        const tile = document.createElement('div');
        tile.className='cell';
        tile.style.width='38px'; tile.style.height='46px'; tile.style.cursor='pointer';
        tile.style.display='flex'; tile.style.alignItems='center'; tile.style.justifyContent='center';
        tile.style.fontFamily='var(--display)'; tile.style.fontSize='20px'; tile.style.fontWeight='900';
        tile.textContent = ch;
        tile.addEventListener('click', ()=>{
          if(tile.dataset.used) return;
          if(ch === word[next]){
            tile.dataset.used = '1';
            tile.style.opacity='0.25'; tile.style.pointerEvents='none';
            slotEls[next].textContent = ch;
            next++;
            if(next>=word.length) ctx.onWin();
          } else {
            ctx.onLose();
          }
        });
        bank.appendChild(tile);
      });
      wrap.appendChild(bank);
      MR.stage.appendChild(wrap);
    }
  });


  MR.games.push({
    label: 'ORDER',
    desc: 'Tap the scattered numbers in ascending order.',
    word: 'IN ORDER',
    timeLimit: s => 3600/s,
    start(ctx){
      const n = 4;
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


})();
