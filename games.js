(function(){
  "use strict";

  const stage = document.getElementById('stage');
  const screen = document.getElementById('screen');
  const instructionEl = document.getElementById('instruction');
  const instructionText = document.getElementById('instructionText');
  const overlay = document.getElementById('overlay');
  const timerbar = document.getElementById('timerbar');
  const scoreVal = document.getElementById('scoreVal');
  const bestVal = document.getElementById('bestVal');
  const livesEl = document.getElementById('lives');
  const livesCount = document.getElementById('livesCount');
  const speedVal = document.getElementById('speedVal');
  const streakHint = document.getElementById('streakHint');
  const bgMusic = document.getElementById('bgMusic');

  let musicOk = true;
  let musicStarted = false;
  if(bgMusic){
    bgMusic.volume = 0.55;
    // if microgames_music.opus isn't present (or fails to load for any
    // reason), quietly give up on it — the game runs identically without it
    bgMusic.addEventListener('error', ()=>{ musicOk = false; });
  } else {
    musicOk = false;
  }

  function startMusic(){
    if(!musicOk || musicStarted || !bgMusic) return;
    musicStarted = true;
    const p = bgMusic.play();
    if(p && typeof p.catch === 'function'){
      p.catch(()=>{ musicOk = false; musicStarted = false; });
    }
  }
  const stageLabel = document.getElementById('stageLabel');
  const rosterList = document.getElementById('rosterList');

  const STORAGE_KEY = 'microrush_best';
  let best = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
  bestVal.textContent = best;

  const DIFF_KEY = 'microrush_diff';
  const DIFFICULTIES = [
    { name: 'CHILL',  lives: 6, base: 0.7,  growth: 0.030, streakForLife: 2 },
    { name: 'EASY',   lives: 5, base: 0.85, growth: 0.038, streakForLife: 3 },
    { name: 'NORMAL', lives: 4, base: 1.0,  growth: 0.045, streakForLife: 4 },
    { name: 'HARD',   lives: 3, base: 1.2,  growth: 0.060, streakForLife: 5 },
    { name: 'INSANE', lives: 2, base: 1.4,  growth: 0.080, streakForLife: 6 }
  ];
  let diffIndex = parseInt(localStorage.getItem(DIFF_KEY) || '2', 10);
  if(isNaN(diffIndex) || diffIndex < 0 || diffIndex >= DIFFICULTIES.length) diffIndex = 2;

  function renderDiffPicker(container){
    if(!container) return;
    container.innerHTML =
      '<div class="diff-caption">difficulty — <span class="diff-name">' + DIFFICULTIES[diffIndex].name + '</span> · life every ' + DIFFICULTIES[diffIndex].streakForLife + '</div>' +
      '<div class="diff-row">' +
        DIFFICULTIES.map((d,i)=>'<div class="diff-pill' + (i===diffIndex?' active':'') + '" data-index="'+i+'">'+(i+1)+'</div>').join('') +
      '</div>';
    container.querySelectorAll('.diff-pill').forEach(pill=>{
      pill.addEventListener('click', ()=>{
        diffIndex = parseInt(pill.dataset.index, 10);
        localStorage.setItem(DIFF_KEY, String(diffIndex));
        renderDiffPicker(container);
      });
    });
  }

  const STATS_KEY = 'microrush_stats';
  function loadStats(){
    try{
      const raw = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
      return (raw && typeof raw === 'object') ? raw : {};
    }catch(e){ return {}; }
  }
  let gameStats = loadStats();

  function recordResult(label, win){
    const s = gameStats[label] || (gameStats[label] = { score:0, plays:0, wins:0, losses:0 });
    s.plays++;
    if(win){ s.wins++; s.score++; } else { s.losses++; }
    try{ localStorage.setItem(STATS_KEY, JSON.stringify(gameStats)); }catch(e){}
  }

  let score = 0;
  let lives = 3;
  let streak = 0;
  let activeDiffIndex = diffIndex;
  function streakForLife(){ return DIFFICULTIES[activeDiffIndex].streakForLife; }
  let running = false;
  let roundToken = 0;
  let speedMul = 1;
  let rafId = null;
  let roundTimeout = null;
  let flashTimeout = null;
  let keyHandler = null;
  let currentGame = null;
  let runHistory = [];
  let dailyRun = false;
  let pinnedLabels = new Set();

  let maxLives = DIFFICULTIES[activeDiffIndex].lives;

  function renderLives(justRecovered){
    livesEl.innerHTML = '';
    for(let i=0;i<maxLives;i++){
      const d = document.createElement('div');
      d.className = 'life' + (i < lives ? '' : ' lost');
      if(justRecovered && i === lives-1) d.classList.add('recovered');
      livesEl.appendChild(d);
    }
    if(livesCount) livesCount.textContent = lives + '/' + maxLives;
    updateStreakHint();
  }

  function updateSpeedDisplay(){
    if(speedVal) speedVal.textContent = speedMul.toFixed(2) + '×';
  }

  function updateStreakHint(){
    if(!streakHint) return;
    if(lives >= maxLives){
      streakHint.innerHTML = '';
      return;
    }
    const need = streakForLife();
    const toNext = need - (streak % need);
    streakHint.innerHTML = 'streak <b>' + streak + '</b> · ' + toNext + ' to next life';
  }

  function clearStage(){
    stage.innerHTML = '';
    stageLabel.textContent = '';
    if(keyHandler){ window.removeEventListener('keydown', keyHandler); keyHandler = null; }
  }

  function rand(min,max){ return Math.random()*(max-min)+min; }
  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  // ---------- MICROGAMES ----------
  // Each game: { label, word, timeLimit(speedMul)=>ms, start(ctx) }
  // ctx has: onWin(), onLose(), speedMul

  const games = [];

  games.push({
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
      const baseColor = pick(colors);
      let oddColor = pick(colors.filter(c=>c!==baseColor));
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
      stage.appendChild(wrap);
    }
  });

  games.push({
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
      stage.appendChild(btn);
    }
  });

  games.push({
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
      stage.appendChild(grid);
    }
  });

  games.push({
    label: 'DODGE',
    desc: 'Move side to side to dodge the falling blocks.',
    word: 'DODGE!',
    timeLimit: s => 3600/s,
    start(ctx){
      const w = screen.clientWidth - 36, h = screen.clientHeight - 36;
      const player = document.createElement('div');
      player.className='box';
      player.style.width='34px'; player.style.height='34px';
      player.style.background='var(--go)';
      let px = w/2 - 17;
      player.style.left = px+'px';
      player.style.bottom = '10px';
      stage.appendChild(player);

      const blocks = [];
      let alive = true;
      let elapsed = 0;
      const spawnEvery = 420 / ctx.speedMul;
      let sinceSpawn = 0;

      function spawnBlock(){
        const b = document.createElement('div');
        b.className='box';
        b.style.width='30px'; b.style.height='16px';
        b.style.background='var(--danger)';
        const bx = rand(0, w-30);
        b.style.left = bx+'px';
        b.style.top = '-16px';
        stage.appendChild(b);
        blocks.push({el:b, x:bx, y:-16});
      }

      function move(dx){
        px = Math.max(0, Math.min(w-34, px+dx));
        player.style.left = px+'px';
      }
      keyHandler = (e)=>{
        if(e.key==='ArrowLeft') move(-28);
        if(e.key==='ArrowRight') move(28);
      };
      window.addEventListener('keydown', keyHandler);
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
      stage.appendChild(leftZone);
      stage.appendChild(rightZone);

      let lastT = performance.now();
      function loop(t){
        if(!alive) return;
        const dt = t-lastT; lastT=t;
        sinceSpawn += dt;
        if(sinceSpawn > spawnEvery){ sinceSpawn=0; spawnBlock(); }
        const speed = 0.32 * ctx.speedMul;
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
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);
      ctx.onCleanup = ()=>{ alive=false; if(rafId) cancelAnimationFrame(rafId); };
      // survive whole round = win, handled by engine timeout
      ctx.survivalGame = true;
    }
  });

  games.push({
    label: 'HURDLE',
    desc: 'Jump the cacti (watch for tall ones and pairs), duck the low birds — arrow keys or tap top / bottom. High birds clear a standing runner but punish a mistimed jump.',
    word: 'RUN!',
    timeLimit: s => 4400/s,
    start(ctx){
      const w = screen.clientWidth - 36, h = screen.clientHeight - 36;
      const standH = 34, duckH = 18;
      const groundY = Math.round(h/2 - standH/2);
      const playerW = 24;
      const px = Math.round((w - playerW) / 2);

      const player = document.createElement('div');
      player.className = 'box';
      player.style.width = playerW+'px';
      player.style.background = 'var(--go)';
      player.style.left = px+'px';
      stage.appendChild(player);

      let state = 'stand'; // 'stand' | 'jump' | 'duck'
      let jumpT = 0, duckT = 0;
      const jumpDur = 620, duckDur = 520;
      const jumpHeight = Math.max(30, Math.min(78, h - (groundY + standH) - 8));

      function currentPlayerBottom(){
        if(state==='jump'){
          const p = Math.min(jumpT/jumpDur, 1);
          return groundY + Math.sin(p*Math.PI)*jumpHeight;
        }
        return groundY;
      }
      function applyVisual(){
        player.style.height = (state==='duck' ? duckH : standH)+'px';
        player.style.bottom = currentPlayerBottom()+'px';
      }
      applyVisual();

      function doJump(){ if(state!=='jump'){ state='jump'; jumpT=0; } }
      function doDuck(){ if(state!=='jump'){ state='duck'; duckT=0; } }

      keyHandler = (e)=>{
        if(e.key==='ArrowUp') doJump();
        if(e.key==='ArrowDown') doDuck();
      };
      window.addEventListener('keydown', keyHandler);

      // tap zones live on elements created fresh each round, wiped by clearStage()
      const topZone = document.createElement('div');
      const bottomZone = document.createElement('div');
      [topZone, bottomZone].forEach(z=>{
        z.style.position='absolute'; z.style.left='0'; z.style.right='0'; z.style.height='50%';
        z.style.cursor='pointer';
      });
      topZone.style.top='0';
      bottomZone.style.bottom='0';
      topZone.addEventListener('click', doJump);
      bottomZone.addEventListener('click', doDuck);
      stage.appendChild(topZone);
      stage.appendChild(bottomZone);

      const obstacles = [];
      let alive = true;
      const spawnEvery = 900 / ctx.speedMul;
      let sinceSpawn = spawnEvery*0.5;

      function makeObstacle(x, ow, oh, bottom, isBird){
        const el = document.createElement('div');
        el.className='box';
        el.style.background = isBird ? 'var(--flash)' : 'var(--danger)';
        el.style.width = ow+'px';
        el.style.height = oh+'px';
        el.style.borderRadius = isBird ? '8px' : '4px';
        el.style.bottom = bottom+'px';
        el.style.left = x+'px';
        stage.appendChild(el);
        obstacles.push({ el, x, w:ow, h:oh, bottom });
      }

      function spawnObstacle(){
        // weighted pool: plain/tall/paired cacti need a jump, low birds need
        // a duck, high birds fly clear of a standing runner but still punish
        // a mistimed jump
        const kind = pick(['cactus','cactus','cactus_tall','cactus_pair','bird_low','bird_low','bird_high']);
        if(kind === 'cactus_pair'){
          const ow = 16, oh = 26, gap = 8;
          makeObstacle(w, ow, oh, groundY, false);
          makeObstacle(w + ow + gap, ow, oh, groundY, false);
        } else if(kind === 'cactus_tall'){
          makeObstacle(w, 20, 42, groundY, false);
        } else if(kind === 'bird_high'){
          makeObstacle(w, 26, 16, groundY + standH + 8, true);
        } else if(kind === 'bird_low'){
          makeObstacle(w, 26, 16, groundY + (duckH + standH)/2, true);
        } else {
          makeObstacle(w, 18, 26, groundY, false);
        }
      }

      let lastT = performance.now();
      function loop(t){
        if(!alive) return;
        const dt = t-lastT; lastT=t;
        if(state==='jump'){ jumpT += dt; if(jumpT>=jumpDur) state='stand'; }
        if(state==='duck'){ duckT += dt; if(duckT>=duckDur) state='stand'; }
        applyVisual();

        sinceSpawn += dt;
        if(sinceSpawn > spawnEvery){ sinceSpawn=0; spawnObstacle(); }

        const speed = 0.30 * ctx.speedMul;
        for(const o of obstacles){
          o.x -= speed*dt;
          o.el.style.left = o.x+'px';
        }

        const playerBottom = currentPlayerBottom();
        const playerTop = playerBottom + (state==='duck' ? duckH : standH);
        for(const o of obstacles){
          if(o.x < px+playerW && o.x+o.w > px){
            const overlapV = playerTop > o.bottom && playerBottom < o.bottom+o.h;
            if(overlapV){ alive=false; ctx.onLose(); return; }
          }
        }
        for(let i=obstacles.length-1;i>=0;i--){
          if(obstacles[i].x + obstacles[i].w < -10){ obstacles[i].el.remove(); obstacles.splice(i,1); }
        }
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);
      ctx.onCleanup = ()=>{ alive=false; if(rafId) cancelAnimationFrame(rafId); };
      // survive whole round = win, handled by engine timeout
      ctx.survivalGame = true;
    }
  });

  games.push({
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
      stage.appendChild(wrap);

      keyHandler = (e)=>{
        const pressedIdx = keys.indexOf(e.key);
        if(pressedIdx===-1) return;
        keyEls[pressedIdx].classList.add('active');
        if(pressedIdx===idx) ctx.onWin(); else ctx.onLose();
      };
      window.addEventListener('keydown', keyHandler);
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

  games.push({
    label: 'COUNT',
    desc: 'Memorize how many dots flash, then pick the matching number.',
    word: 'COUNT!',
    timeLimit: s => 3600/s,
    start(ctx){
      const n = 3 + Math.floor(Math.random()*6);
      const dotsWrap = document.createElement('div');
      dotsWrap.style.position='relative';
      dotsWrap.style.width='100%'; dotsWrap.style.height='60%';
      for(let i=0;i<n;i++){
        const d = document.createElement('div');
        d.className='dot';
        d.style.width='22px'; d.style.height='22px';
        d.style.background='var(--flash)';
        d.style.left = rand(5,85)+'%';
        d.style.top = rand(5,80)+'%';
        dotsWrap.appendChild(d);
      }
      stage.appendChild(dotsWrap);
      setTimeout(()=>{
        if(roundToken !== ctx.token) return;
        clearStage_partial(dotsWrap);
        askAnswer();
      }, 900);

      function clearStage_partial(el){ el.remove(); }

      function askAnswer(){
        const options = new Set([n]);
        while(options.size<4){
          options.add(Math.max(1, n + Math.floor(rand(-3,4))));
        }
        const opts = Array.from(options).sort(()=>Math.random()-0.5);
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
        stage.appendChild(q);
      }
    }
  });

  games.push({
    label: 'CATCH',
    desc: 'Click the target before it shrinks away to nothing.',
    word: 'CATCH IT',
    timeLimit: s => 2600/s,
    start(ctx){
      const target = document.createElement('div');
      target.className='target';
      target.style.width='90px'; target.style.height='90px';
      target.style.left = rand(10,60)+'%';
      target.style.top = rand(10,60)+'%';
      target.style.cursor='pointer';
      stage.appendChild(target);
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
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);
      ctx.onCleanup = ()=>{ alive=false; if(rafId) cancelAnimationFrame(rafId); };
    }
  });

  games.push({
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
      stage.appendChild(target);
      target.addEventListener('click', ()=>{
        if(isGreen) ctx.onWin(); else ctx.onLose();
      });
      // if it's a stop sign, surviving without clicking = win
      ctx.stopIsWin = !isGreen;
    }
  });

  games.push({
    label: 'ORDER',
    desc: 'Tap the scattered numbers in ascending order.',
    word: 'IN ORDER',
    timeLimit: s => 3600/s,
    start(ctx){
      const n = 4;
      const positions = [];
      for(let i=0;i<n;i++){
        positions.push({x: rand(8,78), y: rand(8,70)});
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
        stage.appendChild(b);
      });
    }
  });

  games.push({
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
      stage.appendChild(wrap);

      const sequence = [];
      const seqLen = 2 + Math.floor(Math.random()*2);
      while(sequence.length < seqLen){
        const idx = Math.floor(Math.random()*4);
        if(sequence[sequence.length-1] !== idx) sequence.push(idx);
      }

      let playback = true;
      let step = 0;
      function playStep(){
        if(roundToken !== ctx.token) return;
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

  games.push({
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

      const zoneStart = rand(30,60);
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
      stage.appendChild(wrap);

      let pos = 0, dir = 1, alive = true;
      let lastT = performance.now();
      function loop(t){
        if(!alive) return;
        const dt = (t-lastT); lastT = t;
        pos += dir * dt * 0.09 * ctx.speedMul;
        if(pos > 100){ pos=100; dir=-1; }
        if(pos < 0){ pos=0; dir=1; }
        marker.style.left = pos+'%';
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);
      ctx.onCleanup = ()=>{ alive=false; if(rafId) cancelAnimationFrame(rafId); };

      btn.addEventListener('click', ()=>{
        if(!alive) return;
        alive = false;
        if(rafId) cancelAnimationFrame(rafId);
        if(pos >= zoneStart && pos <= zoneStart+zoneWidth) ctx.onWin();
        else ctx.onLose();
      });
    }
  });

  games.push({
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
        d.style.left = rand(6,80)+'%';
        d.style.top = rand(6,78)+'%';
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
        stage.appendChild(d);
      }
    }
  });

  games.push({
    label: 'BALANCE',
    desc: 'Nudge left/right to keep the drifting ball centered.',
    word: 'STAY CENTERED',
    timeLimit: s => 3800/s,
    start(ctx){
      const w = screen.clientWidth - 36;
      const track = document.createElement('div');
      track.style.position='absolute'; track.style.left='18px'; track.style.right='18px';
      track.style.top='50%'; track.style.height='10px'; track.style.marginTop='-5px';
      track.style.background='var(--bezel)'; track.style.borderRadius='6px';
      track.style.boxShadow='inset 0 0 0 1px var(--line)';
      stage.appendChild(track);

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
      let drift = rand(-1,1) < 0 ? -0.55 : 0.55;
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
      stage.appendChild(leftZone);
      stage.appendChild(rightZone);

      keyHandler = (e)=>{
        if(e.key==='ArrowLeft') move(-9);
        if(e.key==='ArrowRight') move(9);
      };
      window.addEventListener('keydown', keyHandler);

      let lastT = performance.now();
      function loop(t){
        if(!alive) return;
        const dt = (t-lastT); lastT = t;
        posPct += drift * (dt/1000) * 10 * ctx.speedMul;
        if(Math.random() < 0.01) drift = rand(-1,1) < 0 ? -0.7 : 0.7;
        ball.style.left = 'calc(' + posPct + '% - 11px)';
        if(posPct <= 0 || posPct >= 100){ alive=false; ctx.onLose(); return; }
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);
      ctx.onCleanup = ()=>{ alive=false; if(rafId) cancelAnimationFrame(rafId); };
      ctx.survivalGame = true;
    }
  });

  games.push({
    label: 'MATCH',
    desc: 'Memorize a color, then pick it out of a grid.',
    word: 'REMEMBER THIS',
    timeLimit: s => 3600/s,
    start(ctx){
      const colors = ['#3ef5c0','#ff3e7f','#f4e94c','#6b6580'];
      const target = pick(colors);
      const shown = document.createElement('div');
      shown.style.width='90px'; shown.style.height='90px';
      shown.style.borderRadius='16px';
      shown.style.background = target;
      stage.appendChild(shown);

      setTimeout(()=>{
        if(roundToken !== ctx.token) return;
        shown.remove();
        const opts = [...colors].sort(()=>Math.random()-0.5);
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
        stage.appendChild(grid);
      }, 750);
    }
  });

  games.push({
    label: 'DRAG',
    desc: 'Drag the shape into its matching socket.',
    word: 'DRAG IT IN',
    timeLimit: s => 3800/s,
    start(ctx){
      const stageRect = () => stage.getBoundingClientRect();

      const sPct = { x: rand(15,58), y: rand(10,55) };
      const socket = document.createElement('div');
      socket.style.position='absolute';
      socket.style.left = sPct.x+'%'; socket.style.top = sPct.y+'%';
      socket.style.width='76px'; socket.style.height='76px';
      socket.style.borderRadius='50%';
      socket.style.border='3px dashed var(--dim)';
      socket.style.boxSizing='border-box';
      stage.appendChild(socket);

      let startX, startY;
      do {
        startX = rand(8,70); startY = rand(8,68);
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
      stage.appendChild(shape);

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

  games.push({
    label: 'TRACE',
    desc: 'Keep the dot inside a corridor that sways side to side.',
    word: 'STAY INSIDE',
    timeLimit: s => 4200/s,
    start(ctx){
      const track = document.createElement('div');
      track.style.position='relative';
      track.style.width='100%'; track.style.height='100%';
      track.style.touchAction='none';
      stage.appendChild(track);

      const corridor = document.createElement('div');
      corridor.style.position='absolute';
      corridor.style.top='6%'; corridor.style.bottom='6%';
      corridor.style.width='26%';
      corridor.style.background='var(--go)';
      corridor.style.opacity='0.28';
      corridor.style.borderRadius='10px';
      track.appendChild(corridor);

      const dot = document.createElement('div');
      dot.style.position='absolute';
      dot.style.width='20px'; dot.style.height='20px';
      dot.style.borderRadius='50%';
      dot.style.background='var(--flash)';
      dot.style.top='50%'; dot.style.marginTop='-10px';
      dot.style.transition='background .1s';
      track.appendChild(dot);

      let dotPct = 50;
      let alive = true;
      let started = false;
      const t0 = performance.now();

      function setPointerPct(clientX){
        const r = track.getBoundingClientRect();
        dotPct = Math.max(0, Math.min(100, (clientX-r.left)/r.width*100));
        started = true;
      }
      track.addEventListener('pointermove', (e)=>setPointerPct(e.clientX));
      track.addEventListener('pointerdown', (e)=>setPointerPct(e.clientX));

      function loop(t){
        if(!alive) return;
        const elapsed = (t-t0)/1000;
        const centerPct = 50 + 34*Math.sin(elapsed * 1.6 * ctx.speedMul);
        corridor.style.left = (centerPct - 13) + '%';
        dot.style.left = 'calc(' + dotPct + '% - 10px)';
        const inside = Math.abs(dotPct - centerPct) <= 13;
        dot.style.background = inside ? 'var(--flash)' : 'var(--danger)';
        if(started && !inside){
          alive = false;
          ctx.onLose();
          return;
        }
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);
      ctx.onCleanup = ()=>{ alive=false; if(rafId) cancelAnimationFrame(rafId); };
      ctx.survivalGame = true;
    }
  });

  games.push({
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
      const zoneStart = rand(50, 74);
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
      stage.appendChild(wrap);

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
        if(rafId) cancelAnimationFrame(rafId);
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
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);

      balloon.addEventListener('pointerdown', (e)=>{
        if(!alive) return;
        holding = true;
        balloon.setPointerCapture(e.pointerId);
      });
      function release(){
        if(!alive || !holding) return;
        holding = false;
        alive = false;
        if(rafId) cancelAnimationFrame(rafId);
        if(pct >= zoneStart && pct <= zoneStart+zoneWidth) ctx.onWin();
        else ctx.onLose();
      }
      balloon.addEventListener('pointerup', release);
      balloon.addEventListener('pointercancel', release);

      ctx.onCleanup = ()=>{ alive=false; holding=false; if(rafId) cancelAnimationFrame(rafId); };
    }
  });

  games.push({
    label: 'MATH',
    desc: 'Solve the quick arithmetic problem.',
    word: 'SOLVE IT',
    timeLimit: s => 3400/s,
    start(ctx){
      const useSub = Math.random() < 0.35;
      let a, b, answer, opStr;
      if(useSub){
        a = Math.floor(rand(5,18));
        b = Math.floor(rand(1,a));
        answer = a-b;
        opStr = '-';
      } else {
        a = Math.floor(rand(1,12));
        b = Math.floor(rand(1,12));
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
        const cand = answer + Math.floor(rand(-5,6));
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
      stage.appendChild(wrap);
    }
  });

  const SCRAMBLE_WORDS = ['CODE','GAME','LEAP','QUICK','BRAVE','STORM','LIGHT','FLASH','TRACK','PIXEL'];

  games.push({
    label: 'SCRAMBLE',
    desc: 'Tap the scrambled letters in the right order to spell the word.',
    word: 'UNSCRAMBLE',
    timeLimit: s => 4400/s,
    start(ctx){
      const word = pick(SCRAMBLE_WORDS);
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
      stage.appendChild(wrap);
    }
  });

  games.push({
    label: 'SPOT',
    desc: 'Find the tile that changed color between the two rows.',
    word: 'FIND THE SWAP',
    timeLimit: s => 3400/s,
    start(ctx){
      const colors = ['#3ef5c0','#ff3e7f','#f4e94c','#6b6580','#7a8cff','#ff9f4a'];
      const n = 6;
      const row1 = [];
      for(let i=0;i<n;i++) row1.push(pick(colors));
      const diffCol = Math.floor(Math.random()*n);
      const row2 = [...row1];
      let alt;
      do { alt = pick(colors); } while(alt===row1[diffCol]);
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
      stage.appendChild(wrap);
    }
  });

  games.push({
    label: 'PATTERN',
    desc: 'Figure out what number comes next in the sequence.',
    word: "WHAT'S NEXT",
    timeLimit: s => 3800/s,
    start(ctx){
      const start = Math.floor(rand(1,10));
      const step = Math.floor(rand(2,6)) * (Math.random()<0.5?1:-1);
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
        const cand = answer + Math.floor(rand(-4,5));
        if(cand!==answer) opts.add(cand);
      }
      const arr = Array.from(opts).sort(()=>Math.random()-0.5);
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
      stage.appendChild(wrap);
    }
  });

  games.push({
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

      stage.appendChild(wrap);

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
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);

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
            if(rafId) cancelAnimationFrame(rafId);
            ctx.onWin();
          }
        } else {
          alive=false;
          if(rafId) cancelAnimationFrame(rafId);
          ctx.onLose();
        }
      });

      ctx.onCleanup = ()=>{ alive=false; if(rafId) cancelAnimationFrame(rafId); };
    }
  });

  games.push({
    label: 'LANES',
    desc: 'Switch lanes to dodge the falling block.',
    word: 'DODGE THE LANE',
    timeLimit: s => 2800/s,
    start(ctx){
      const w = screen.clientWidth - 36, h = screen.clientHeight - 36;
      const laneCount = 3;
      const laneWidth = w/laneCount;
      let playerLane = 1;

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
      stage.appendChild(lanesWrap);

      const dangerLane = Math.floor(Math.random()*laneCount);
      const block = document.createElement('div');
      block.className='box';
      block.style.width = (laneWidth-16)+'px'; block.style.height='26px';
      block.style.background='var(--danger)';
      block.style.top='-30px';
      block.style.left = (dangerLane*laneWidth+8)+'px';
      stage.appendChild(block);

      const player = document.createElement('div');
      player.className='box';
      player.style.width='30px'; player.style.height='30px';
      player.style.background='var(--go)';
      player.style.bottom='10px';
      stage.appendChild(player);

      function updatePlayer(){
        player.style.left = (playerLane*laneWidth + laneWidth/2 - 15)+'px';
      }
      updatePlayer();

      keyHandler = (e)=>{
        if(e.key==='ArrowLeft') playerLane = Math.max(0, playerLane-1);
        if(e.key==='ArrowRight') playerLane = Math.min(laneCount-1, playerLane+1);
        updatePlayer();
      };
      window.addEventListener('keydown', keyHandler);

      let alive = true;
      let by = -30;
      let lastT = performance.now();
      function loop(t){
        if(!alive) return;
        const dt = t-lastT; lastT=t;
        by += 0.24*ctx.speedMul*dt;
        block.style.top = by+'px';
        if(by+26 >= h-10){
          alive=false;
          if(playerLane===dangerLane) ctx.onLose(); else ctx.onWin();
          return;
        }
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);
      ctx.onCleanup = ()=>{ alive=false; if(rafId) cancelAnimationFrame(rafId); };
    }
  });

  games.push({
    label: 'FLIP',
    desc: 'Click the rapidly flipping card only when it matches the target color.',
    word: 'CATCH THE COLOR',
    timeLimit: s => 3000/s,
    start(ctx){
      const colors = ['#3ef5c0','#ff3e7f','#f4e94c','#7a8cff','#ff9f4a'];
      const target = pick(colors);

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

      stage.appendChild(wrap);

      let current = pick(colors);
      card.style.background = current;
      let alive = true;
      const flipEvery = 160/ctx.speedMul;
      const flipTimer = setInterval(()=>{
        if(!alive) return;
        current = pick(colors);
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

  // ---------- ENGINE ----------

  function setScore(v){
    score = v;
    scoreVal.textContent = score;
  }

  function buildRunBreakdown(){
    const order = [];
    const byLabel = {};
    runHistory.forEach(entry=>{
      if(!byLabel[entry.label]){
        byLabel[entry.label] = { won:0, lost:0 };
        order.push(entry.label);
      }
      if(entry.win) byLabel[entry.label].won++; else byLabel[entry.label].lost++;
    });
    return order.map(label=>({ label, ...byLabel[label] }));
  }

  function renderRunBreakdownMarkup(){
    if(!runHistory.length) return '';
    const rows = buildRunBreakdown().map(r=>{
      return `<tr>
        <td>${r.label}</td>
        <td class="run-won">${r.won ? '✓ '+r.won : '—'}</td>
        <td class="run-lost">${r.lost ? '✗ '+r.lost : '—'}</td>
      </tr>`;
    }).join('');
    const sequence = runHistory.map(entry=>
      `<span class="run-pip ${entry.win?'win':'lose'}" title="${entry.label} — ${entry.win?'won':'lost'}"></span>`
    ).join('');
    return `
      <div class="run-breakdown">
        <div class="run-breakdown-heading">this run</div>
        <div class="run-pip-row">${sequence}</div>
        <div class="run-breakdown-scroll">
          <table class="stats-table run-table">
            <thead><tr><th>game</th><th>won</th><th>lost</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function showOverlayEnd(){
    running = false;
    if(score > best){
      best = score;
      localStorage.setItem(STORAGE_KEY, String(best));
    }
    bestVal.textContent = best;
    if(dailyRun){
      saveDailyResult();
      Math.random = nativeRandom;
    }
    renderGameOverOverlay();
  }

  function renderGameOverOverlay(){
    const isDaily = dailyRun;
    overlay.innerHTML = `
      <h1>${isDaily ? "DAILY COMPLETE" : "GAME OVER"}</h1>
      ${isDaily ? `<p class="daily-tag">DAILY — ${todayKey()} · ${DIFFICULTIES[activeDiffIndex].name}</p>` : ''}
      <div class="score">${score}</div>
      <p>${score>=15?'certified reflex machine.':'the mash reflex will save you. try again.'}</p>
      ${renderRunBreakdownMarkup()}
      ${isDaily ? `
        <button class="arcade" id="shareDailyBtn">copy share result</button>
        <div id="shareFallback" class="share-fallback" style="display:none">
          <textarea readonly onclick="this.select()">${dailyShareText(todaysDailyResult() || currentRunResultShape())}</textarea>
        </div>
      ` : `<div class="diff-picker" id="diffPickerEnd"></div>`}
      <button class="arcade${isDaily?' secondary':''}" id="retryBtn">${isDaily ? 'back to menu' : 'retry'}</button>
      <button class="arcade secondary" id="statsBtnEnd">per-game stats</button>
    `;
    overlay.classList.remove('hidden');
    if(!isDaily) renderDiffPicker(document.getElementById('diffPickerEnd'));
    document.getElementById('retryBtn').addEventListener('click', ()=>{
      if(isDaily) renderStartOverlay(); else startRun();
    });
    if(isDaily){
      document.getElementById('shareDailyBtn').addEventListener('click', ()=>{
        copyDailyShareText(todaysDailyResult() || currentRunResultShape());
      });
    }
    document.getElementById('statsBtnEnd').addEventListener('click', ()=>{
      renderStatsView(renderGameOverOverlay);
    });
  }

  function renderStartOverlay(){
    const daily = todaysDailyResult();
    overlay.innerHTML = `
      <h1>MICRO/RUSH</h1>
      <p>a rapid-fire stack of tiny games.<br>tap, click, or use arrow keys.<br>read the word. react fast. survive.</p>
      <div class="diff-picker" id="diffPickerStart"></div>
      <button class="arcade" id="startBtn">start</button>
      <div class="daily-block">
        <div class="daily-heading">DAILY — ${todayKey()}</div>
        <p class="daily-note">same game sequence for everyone today — pick a difficulty above, then compare scores.</p>
        ${daily ? `<div class="daily-played">today's score: <b>${daily.score}</b> <span class="daily-diff-tag">(${daily.difficulty || DIFFICULTIES[diffIndex].name})</span></div>` : ''}
        <button class="arcade secondary" id="dailyBtn">${daily ? 'replay daily' : "play today's run"}</button>
        ${daily ? `<button class="arcade secondary" id="shareDailyBtnStart">share result</button>` : ''}
      </div>
      <button class="arcade secondary" id="statsBtnStart">per-game stats</button>
    `;
    overlay.classList.remove('hidden');
    renderDiffPicker(document.getElementById('diffPickerStart'));
    document.getElementById('startBtn').addEventListener('click', ()=> startRun());
    document.getElementById('dailyBtn').addEventListener('click', ()=> startRun({ daily:true }));
    if(daily){
      document.getElementById('shareDailyBtnStart').addEventListener('click', ()=>{
        copyDailyShareText(daily);
        const btn = document.getElementById('shareDailyBtnStart');
        if(btn) btn.textContent = 'copied!';
      });
    }
    document.getElementById('statsBtnStart').addEventListener('click', ()=>{
      renderStatsView(renderStartOverlay);
    });
  }

  function downloadStatsJson(){
    const payload = {
      exportedAt: new Date().toISOString(),
      best: best,
      difficulty: DIFFICULTIES[diffIndex].name,
      games: games.map(g=>{
        const s = gameStats[g.label] || { score:0, plays:0, wins:0, losses:0 };
        return {
          label: g.label,
          score: s.score,
          plays: s.plays,
          wins: s.wins,
          losses: s.losses,
          successRate: s.plays ? +(s.wins/s.plays).toFixed(4) : 0,
          errorRate: s.plays ? +(s.losses/s.plays).toFixed(4) : 0
        };
      })
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'microrush-stats.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }

  function renderStatsView(backCb){
    const rows = games.map(g=>{
      const s = gameStats[g.label] || { score:0, plays:0, wins:0, losses:0 };
      const successPct = s.plays ? Math.round((s.wins/s.plays)*100) : 0;
      const errorPct = s.plays ? Math.round((s.losses/s.plays)*100) : 0;
      return `<tr>
        <td>${g.label}</td>
        <td>${s.score}</td>
        <td>${s.plays}</td>
        <td>${successPct}%</td>
        <td>${errorPct}%</td>
      </tr>`;
    }).join('');
    overlay.innerHTML = `
      <h1>PER-GAME STATS</h1>
      <div class="stats-view">
        <div class="stats-scroll">
          <table class="stats-table">
            <thead>
              <tr><th>game</th><th>score</th><th>plays</th><th>ok</th><th>err</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div class="stats-actions">
          <button class="arcade secondary" id="resetStatsBtn">reset</button>
          <button class="arcade secondary" id="downloadStatsBtn">download json</button>
          <button class="arcade" id="statsBackBtn">back</button>
        </div>
      </div>
    `;
    overlay.classList.remove('hidden');
    document.getElementById('statsBackBtn').addEventListener('click', backCb);
    document.getElementById('downloadStatsBtn').addEventListener('click', downloadStatsJson);
    document.getElementById('resetStatsBtn').addEventListener('click', ()=>{
      gameStats = {};
      try{ localStorage.removeItem(STATS_KEY); }catch(e){}
      renderStatsView(backCb);
    });
  }

  function flashInstruction(word, cb){
    instructionText.textContent = word;
    instructionText.className = '';
    void instructionText.offsetWidth;
    instructionText.classList.add('show');
    flashTimeout = setTimeout(()=>{
      instructionText.classList.remove('show');
      cb();
    }, 620);
  }

  function endRound(win){
    const myToken = roundToken;
    clearTimeout(roundTimeout);
    if(rafId) cancelAnimationFrame(rafId);
    if(myToken !== roundToken) return;
    roundToken++; // invalidate further callbacks from this round
    if(currentGame){
      recordResult(currentGame.label, win);
      runHistory.push({ label: currentGame.label, win: win });
    }
    clearStage();
    if(win){
      setScore(score+1);
      speedMul = DIFFICULTIES[activeDiffIndex].base + score*DIFFICULTIES[activeDiffIndex].growth;
      updateSpeedDisplay();
      streak++;
      let recovered = false;
      if(streak % streakForLife() === 0 && lives < maxLives){
        lives++;
        recovered = true;
      }
      renderLives(recovered);
      timerbar.style.transition = 'none';
      timerbar.style.background = 'var(--go)';
      timerbar.style.transform = 'scaleX(1)';
      setTimeout(nextRound, 260);
    } else {
      streak = 0;
      lives--;
      renderLives();
      timerbar.style.transition = 'none';
      timerbar.style.background = 'var(--danger)';
      timerbar.style.transform = 'scaleX(1)';
      if(lives<=0){
        setTimeout(showOverlayEnd, 420);
      } else {
        setTimeout(nextRound, 500);
      }
    }
  }

  function populateRoster(){
    if(!rosterList) return;
    rosterList.innerHTML = '';
    games.forEach(g=>{
      const li = document.createElement('li');
      li.dataset.label = g.label;
      if(g.desc) li.dataset.desc = g.desc;
      li.style.cursor = 'pointer';
      const labelSpan = document.createElement('span');
      labelSpan.className = 'roster-label';
      labelSpan.textContent = g.label;
      li.appendChild(labelSpan);
      li.addEventListener('click', ()=> toggleForcedGame(g));
      rosterList.appendChild(li);
    });
  }

  function setActiveRoster(label){
    if(!rosterList) return;
    rosterList.querySelectorAll('li').forEach(li=>{
      li.classList.toggle('active', li.dataset.label === label);
      li.classList.toggle('pinned', pinnedLabels.has(li.dataset.label));
    });
  }

  // Picking games from the roster pins them so every following round draws
  // only from that pinned pool instead of the full shuffle; toggling a game
  // off (or during a daily run, where the sequence must stay seeded/fair)
  // removes it from the pool, and an empty pool falls back to the full set.
  function toggleForcedGame(g){
    if(pinnedLabels.has(g.label)) pinnedLabels.delete(g.label);
    else pinnedLabels.add(g.label);
    if(!running){
      setActiveRoster(currentGame ? currentGame.label : null);
      return;
    }
    if(dailyRun) return; // don't let pins disturb a seeded daily sequence
    // jump straight into a fresh round reflecting the updated pool
    roundToken++;
    clearTimeout(roundTimeout);
    clearTimeout(flashTimeout);
    if(rafId) cancelAnimationFrame(rafId);
    clearStage();
    nextRound();
  }

  function nextRound(){
    if(!running) return;
    const myToken = roundToken;
    clearStage();
    const usePinned = pinnedLabels.size > 0 && !dailyRun;
    const pool = usePinned ? games.filter(g=>pinnedLabels.has(g.label)) : games;
    const game = pick(pool);
    currentGame = game;
    stageLabel.textContent = game.label;
    setActiveRoster(game.label);
    flashInstruction(game.word, ()=>{
      if(myToken !== roundToken || !running) return;
      const limit = game.timeLimit(speedMul);
      const ctx = {
        speedMul,
        token: myToken,
        onCleanup: null,
        stopIsWin: false,
        survivalGame: false,
        onWin(){ if(roundToken===myToken) endRound(true); },
        onLose(){ if(roundToken===myToken) endRound(false); }
      };
      game.start(ctx);
      timerbar.style.transition = 'none';
      timerbar.style.transform = 'scaleX(1)';
      timerbar.style.background = 'var(--flash)';
      requestAnimationFrame(()=>{
        timerbar.style.transition = `transform ${limit}ms linear`;
        timerbar.style.transform = 'scaleX(0)';
      });
      roundTimeout = setTimeout(()=>{
        if(roundToken!==myToken) return;
        if(ctx.onCleanup) ctx.onCleanup();
        const timeoutIsWin = ctx.survivalGame || ctx.stopIsWin;
        endRound(timeoutIsWin);
      }, limit);
    });
  }

  // ---------- DAILY SEED ----------
  // Overriding Math.random for the duration of a daily run is deliberate:
  // every pick()/rand() call and every ad-hoc Math.random() inside the
  // individual microgames all route through it, so the whole run — which
  // games appear, in what order, and every randomized detail inside them —
  // becomes fully deterministic from the date alone, with zero changes
  // needed at each of the ~20 call sites scattered through the games.
  const nativeRandom = Math.random;

  function mulberry32(seed){
    return function(){
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seedFromString(str){
    let h = 1779033703 ^ str.length;
    for(let i=0;i<str.length;i++){
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }

  function todayKey(){
    const d = new Date();
    const mm = String(d.getUTCMonth()+1).padStart(2,'0');
    const dd = String(d.getUTCDate()).padStart(2,'0');
    return d.getUTCFullYear() + '-' + mm + '-' + dd;
  }

  const DAILY_RESULT_KEY = 'microrush_daily_result';
  function loadDailyResult(){
    try{ return JSON.parse(localStorage.getItem(DAILY_RESULT_KEY) || 'null'); }
    catch(e){ return null; }
  }
  function saveDailyResult(){
    const result = {
      date: todayKey(),
      score: score,
      difficulty: DIFFICULTIES[activeDiffIndex].name,
      pips: runHistory.map(e=>e.win),
      breakdown: buildRunBreakdown()
    };
    try{ localStorage.setItem(DAILY_RESULT_KEY, JSON.stringify(result)); }catch(e){}
    return result;
  }
  function todaysDailyResult(){
    const r = loadDailyResult();
    return (r && r.date === todayKey()) ? r : null;
  }

  function currentRunResultShape(){
    // fallback shape matching a saved daily result, built from the live
    // in-progress state — used if the saved copy isn't available for
    // whatever reason (e.g. localStorage write failed)
    return {
      date: todayKey(),
      score: score,
      difficulty: DIFFICULTIES[activeDiffIndex].name,
      pips: runHistory.map(e=>e.win),
      breakdown: buildRunBreakdown()
    };
  }

  function dailyShareText(result){
    const pips = result.pips.map(w=>w?'🟩':'🟥').join('');
    const difficulty = result.difficulty || DIFFICULTIES[diffIndex].name;
    const breakdown = (result.breakdown || []).map(r=>{
      const label = r.label.padEnd(9, ' ');
      return `${label} ${r.won}W-${r.lost}L`;
    }).join('\n');
    return `MICRO/RUSH — DAILY ${result.date}\nDifficulty: ${difficulty}\nScore: ${result.score}\n${pips}` +
      (breakdown ? `\n\nPer-game:\n${breakdown}` : '');
  }

  function copyDailyShareText(result){
    const text = dailyShareText(result);
    const done = (ok)=>{
      const btn = document.getElementById('shareDailyBtn') || document.getElementById('shareDailyBtnStart');
      if(btn) btn.textContent = ok ? 'copied!' : 'copy failed — see below';
      const fallback = document.getElementById('shareFallback');
      if(fallback) fallback.style.display = ok ? 'none' : 'block';
    };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(()=>done(true)).catch(()=>done(false));
    } else {
      done(false);
    }
  }

  function startRun(opts){
    opts = opts || {};
    dailyRun = !!opts.daily;
    activeDiffIndex = diffIndex;
    Math.random = dailyRun ? mulberry32(seedFromString('microrush-' + todayKey())) : nativeRandom;
    overlay.classList.add('hidden');
    startMusic();
    setScore(0);
    maxLives = DIFFICULTIES[activeDiffIndex].lives;
    lives = maxLives;
    streak = 0;
    runHistory = [];
    speedMul = DIFFICULTIES[activeDiffIndex].base;
    updateSpeedDisplay();
    renderLives();
    running = true;
    roundToken++;
    nextRound();
  }

  renderLives();
  populateRoster();
  renderStartOverlay();

})();
