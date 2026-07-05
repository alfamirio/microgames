(function(){
  "use strict";
  const MR = window.MR;
  const CATEGORY_START = MR.games.length;

  // Cardboard-cutout cast: crooks carry the "tell" (mask/shades/loot),
  // bystanders don't. Kept as simple emoji so no image assets are needed —
  // consistent with the rest of the cartridge, which is all CSS/DOM shapes.
  const CROOKS = ['👹', '🦹', '🧌'];
  const CIVILIANS = ['🧑', '👩', '👨', '👵', '👴', '👩‍🦰', '🧑‍🦱', '👩‍🦳'];

  MR.games.push({
    label: 'QUICKDRAW',
    desc: 'Wait for the flash, then tap as fast as you can. Jump early and you lose instantly.',
    word: 'WAIT FOR IT',
    timeLimit: s => 4000/s,
    start(ctx){
      const btn = document.createElement('div');
      btn.className = 'target';
      btn.style.width='160px'; btn.style.height='160px';
      btn.style.background = 'var(--danger)';
      btn.style.cursor='pointer';
      btn.style.fontFamily='var(--display)'; btn.style.fontSize='20px';
      btn.style.color='#0b0b10'; btn.style.fontWeight='900';
      btn.textContent = 'WAIT';
      MR.stage.appendChild(btn);

      let goState = false;
      let alive = true;
      let cueTimer = null;

      function scheduleGo(){
        if(!alive) return;
        goState = false;
        btn.style.background = 'var(--danger)';
        btn.textContent = 'WAIT';
        const delay = MR.rand(700,1600) / ctx.speedMul;
        cueTimer = setTimeout(()=>{
          if(!alive) return;
          triggerGo();
        }, delay);
      }

      function triggerGo(){
        if(!alive) return;
        goState = true;
        btn.style.background = 'var(--go)';
        btn.textContent = 'GO!';
        const goWindow = MR.rand(500,850) / ctx.speedMul;
        cueTimer = setTimeout(()=>{
          if(!alive) return;
          scheduleGo();
        }, goWindow);
      }

      scheduleGo();

      btn.addEventListener('click', ()=>{
        if(!alive) return;
        alive = false;
        clearTimeout(cueTimer);
        if(goState) ctx.onWin(); else ctx.onLose();
      });

      ctx.onCleanup = ()=>{ alive=false; clearTimeout(cueTimer); };
    }
  });


  MR.games.push({
    label: 'ALLEY',
    desc: 'Alley-style quick draw: 6 cardboard cutouts pop up in a 2\u00d73 grid, 1\u20133 of them crooks. Shoot every crook, leave the bystanders standing \u2014 one wrong hit ends it. Click/tap a cutout, or steer the crosshair with arrow keys and fire with space/enter.',
    word: 'DRAW!',
    timeLimit: s => 5200 / s,
    start(ctx){
      const ROWS = 2, COLS = 3, GAP = 10;
      const w = MR.screen.clientWidth - 32, h = MR.screen.clientHeight - 32;
      const cellW = (w - (COLS - 1) * GAP) / COLS;
      const cellH = (h - (ROWS - 1) * GAP) / ROWS;

      const wrap = document.createElement('div');
      wrap.style.position = 'absolute';
      wrap.style.left = '16px';
      wrap.style.top = '16px';
      wrap.style.width = w + 'px';
      wrap.style.height = h + 'px';
      MR.stage.appendChild(wrap);

      // 1-3 crooks among the 6 slots, positions randomized
      const crookCount = Math.floor(MR.rand(1, 4));
      const order = MR.shuffle([0, 1, 2, 3, 4, 5]);
      const crookSet = new Set(order.slice(0, crookCount));

      let remainingCrooks = crookCount;
      let alive = true;
      let selR = 0, selC = 0;

      const figs = [];
      for(let i = 0; i < 6; i++){
        const r = Math.floor(i / COLS), c = i % COLS;
        const isCrook = crookSet.has(i);
        const el = document.createElement('div');
        el.className = 'cell';
        el.style.position = 'absolute';
        el.style.width = cellW + 'px';
        el.style.height = cellH + 'px';
        el.style.left = (c * (cellW + GAP)) + 'px';
        el.style.top = (r * (cellH + GAP)) + 'px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.fontSize = Math.min(cellW, cellH) * 0.46 + 'px';
        el.style.background = '#c9a876';
        el.style.cursor = 'pointer';
        el.style.transition = 'transform 140ms ease, opacity 140ms ease, background 140ms ease';
        // pop-up entrance, staggered slightly per cutout for a quick-draw feel
        el.style.transform = 'translateY(14px) scale(0.9)';
        el.style.opacity = '0';
        el.textContent = isCrook ? MR.pick(CROOKS) : MR.pick(CIVILIANS);
        wrap.appendChild(el);
        figs.push({ el, isCrook, hit: false, r, c });
        el.addEventListener('click', () => shoot(i));
        setTimeout(() => {
          if(!alive) return;
          el.style.transform = 'translateY(0) scale(1)';
          el.style.opacity = '1';
        }, 30 + i * 45);
      }

      function updateSelection(){
        figs.forEach(f => {
          if(f.hit) return;
          f.el.style.boxShadow = (f.r === selR && f.c === selC)
            ? '0 0 0 3px var(--flash)'
            : 'inset 0 0 0 1px var(--line)';
        });
      }

      function shoot(i){
        if(!alive) return;
        const f = figs[i];
        if(!f || f.hit) return;
        f.hit = true;
        if(f.isCrook){
          f.el.style.transform = 'scale(0.75) rotate(10deg)';
          f.el.style.opacity = '0.2';
          remainingCrooks--;
          if(remainingCrooks <= 0){
            alive = false;
            ctx.onWin();
          }
        } else {
          f.el.style.background = 'var(--danger)';
          f.el.style.boxShadow = 'none';
          alive = false;
          ctx.onLose();
        }
      }

      MR.setKeyHandler((e) => {
        if(e.key === 'ArrowLeft'){ selC = Math.max(0, selC - 1); updateSelection(); }
        if(e.key === 'ArrowRight'){ selC = Math.min(COLS - 1, selC + 1); updateSelection(); }
        if(e.key === 'ArrowUp'){ selR = Math.max(0, selR - 1); updateSelection(); }
        if(e.key === 'ArrowDown'){ selR = Math.min(ROWS - 1, selR + 1); updateSelection(); }
        if(e.key === ' ' || e.key === 'Enter'){
          e.preventDefault();
          shoot(selR * COLS + selC);
        }
      });

      ctx.onCleanup = () => { alive = false; };
    }
  });

  MR.games.push({
    label: 'RUSH ALLEY',
    desc: 'Open, fast-paced gallery: crooks and bystanders keep popping up and ducking back down at random across the 2\u00d73 board, sometimes more than one at once. Shoot every crook before it drops and never touch a bystander \u2014 survive to the bell. Click/tap a raised cutout, or steer the crosshair with arrow keys and fire with space/enter.',
    word: 'STAY SHARP!',
    timeLimit: s => 6000 / s,
    start(ctx){
      const ROWS = 2, COLS = 3, GAP = 10;
      const w = MR.screen.clientWidth - 32, h = MR.screen.clientHeight - 32;
      const cellW = (w - (COLS - 1) * GAP) / COLS;
      const cellH = (h - (ROWS - 1) * GAP) / ROWS;

      const wrap = document.createElement('div');
      wrap.style.position = 'absolute';
      wrap.style.left = '16px';
      wrap.style.top = '16px';
      wrap.style.width = w + 'px';
      wrap.style.height = h + 'px';
      MR.stage.appendChild(wrap);

      // six independent slots — each one pops a crook or a bystander at
      // random, on its own timer, so multiple can be up (or ducking) at once
      const slots = [];
      for(let i = 0; i < 6; i++){
        const r = Math.floor(i / COLS), c = i % COLS;
        const el = document.createElement('div');
        el.className = 'cell';
        el.style.position = 'absolute';
        el.style.width = cellW + 'px';
        el.style.height = cellH + 'px';
        el.style.left = (c * (cellW + GAP)) + 'px';
        el.style.top = (r * (cellH + GAP)) + 'px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.fontSize = Math.min(cellW, cellH) * 0.46 + 'px';
        el.style.overflow = 'hidden';
        wrap.appendChild(el);
        slots.push({ el, r, c, active: null });
      }

      let alive = true;
      let selR = 0, selC = 0;
      let spawnTimer = null;

      // scales down with speedMul — later rounds are noticeably quicker
      // floored: this is the window to spot+click a crook before a miss
      // ends the round, so it must never shrink below a reasonable human
      // reaction time — difficulty instead comes from spawnEvery/maxConcurrent
      const showDur = Math.max(1200, 1200 / ctx.speedMul);
      const spawnEvery = 500 / ctx.speedMul;
      const maxConcurrent = 2;
      const crookChance = 0.45;

      function updateSelection(){
        slots.forEach(s => {
          s.el.style.boxShadow = (s.r === selR && s.c === selC)
            ? '0 0 0 3px var(--flash)'
            : 'inset 0 0 0 1px var(--line)';
        });
      }

      function popDown(slot){
        const el = slot.el;
        el.style.transform = 'translateY(14px) scale(0.85)';
        el.style.opacity = '0';
        el.style.cursor = 'default';
      }

      function spawnAt(slot){
        const isCrook = Math.random() < crookChance;
        const el = slot.el;
        el.style.background = '#c9a876';
        el.style.cursor = 'pointer';
        el.style.transition = 'transform 100ms ease, opacity 100ms ease, background 100ms ease';
        el.style.transform = 'translateY(14px) scale(0.85)';
        el.style.opacity = '0';
        el.textContent = isCrook ? MR.pick(CROOKS) : MR.pick(CIVILIANS);

        function onClick(){ shoot(slot); }
        el.addEventListener('click', onClick);
        const rec = { isCrook, shot: false, onClick, hideTimeout: null };
        slot.active = rec;

        requestAnimationFrame(() => {
          if(slot.active !== rec) return;
          el.style.transform = 'translateY(0) scale(1)';
          el.style.opacity = '1';
        });

        rec.hideTimeout = setTimeout(() => {
          el.removeEventListener('click', onClick);
          popDown(slot);
          const wasCrook = rec.isCrook;
          slot.active = null;
          // reaching this timeout means it was never shot — shoot() always
          // clears hideTimeout first, so a shot target can't land here
          if(wasCrook){
            alive = false;
            ctx.onLose();
          }
        }, showDur);
      }

      function shoot(slot){
        if(!alive || !slot.active || slot.active.shot) return;
        const rec = slot.active;
        rec.shot = true;
        clearTimeout(rec.hideTimeout);
        slot.el.removeEventListener('click', rec.onClick);
        if(rec.isCrook){
          slot.el.style.transform = 'scale(0.7) rotate(10deg)';
          slot.el.style.opacity = '0.15';
          setTimeout(() => { if(slot.active === rec) slot.active = null; }, 140);
        } else {
          slot.el.style.background = 'var(--danger)';
          alive = false;
          ctx.onLose();
        }
      }

      function trySpawn(){
        if(!alive) return;
        const occupied = slots.filter(s => s.active).length;
        const free = slots.filter(s => !s.active);
        if(occupied < maxConcurrent && free.length){
          spawnAt(MR.pick(free));
        }
        spawnTimer = setTimeout(trySpawn, spawnEvery);
      }

      MR.setKeyHandler((e) => {
        if(e.key === 'ArrowLeft'){ selC = Math.max(0, selC - 1); updateSelection(); }
        if(e.key === 'ArrowRight'){ selC = Math.min(COLS - 1, selC + 1); updateSelection(); }
        if(e.key === 'ArrowUp'){ selR = Math.max(0, selR - 1); updateSelection(); }
        if(e.key === 'ArrowDown'){ selR = Math.min(ROWS - 1, selR + 1); updateSelection(); }
        if(e.key === ' ' || e.key === 'Enter'){
          e.preventDefault();
          const slot = slots.find(s => s.r === selR && s.c === selC);
          if(slot) shoot(slot);
        }
      });

      trySpawn();
      // surviving to the round timeout (no missed crook, no shot bystander)
      // counts as a win — same pattern as HURDLE/GAUNTLET
      ctx.survivalGame = true;

      ctx.onCleanup = () => {
        alive = false;
        clearTimeout(spawnTimer);
        slots.forEach(s => { if(s.active) clearTimeout(s.active.hideTimeout); });
      };
    }
  });


  MR.games.push({
    label: 'BIRD HUNT',
    desc: 'Bird hunt. One duck darts around the sky in sharp zig-zags, bouncing off the edges instead of ever slipping away — click/tap it, or steer the crosshair with arrow keys and fire with space, before you run out of shots.',
    word: 'PULL!',
    timeLimit: s => 3000/s,
    start(ctx){
      const w = MR.screen.clientWidth - 26, h = MR.screen.clientHeight - 26;
      const stageLabelEl = document.getElementById('stageLabel');

      const NEEDED = 1, TOTAL_DUCKS = 1, START_AMMO = 3;
      let ammo = START_AMMO, hits = 0, alive = true;
      const ducks = [];

      MR.stage.style.cursor = 'crosshair';

      function updateHud(){
        if(stageLabelEl) stageLabelEl.textContent = 'HUNT \u00b7 \uD83C\uDFAF ' + hits + '/' + NEEDED + ' \u00b7 ammo ' + ammo;
      }
      updateHud();

      // ---- keyboard-driven crosshair (mouse/tap works directly on ducks too) ----
      let rx = w/2, ry = h*0.4;
      const reticle = document.createElement('div');
      reticle.style.position = 'absolute';
      reticle.style.width = '22px'; reticle.style.height = '22px';
      reticle.style.marginLeft = '-11px'; reticle.style.marginTop = '-11px';
      reticle.style.border = '2px solid var(--flash)';
      reticle.style.borderRadius = '50%';
      reticle.style.boxShadow = '0 0 6px var(--flash)';
      reticle.style.pointerEvents = 'none';
      reticle.style.zIndex = 9;
      MR.stage.appendChild(reticle);
      function placeReticle(){ reticle.style.left = rx+'px'; reticle.style.top = ry+'px'; }
      placeReticle();

      const STEP = 30;
      MR.setKeyHandler((e)=>{
        if(e.key==='ArrowLeft'){ rx = Math.max(0, rx-STEP); placeReticle(); }
        if(e.key==='ArrowRight'){ rx = Math.min(w, rx+STEP); placeReticle(); }
        if(e.key==='ArrowUp'){ ry = Math.max(0, ry-STEP); placeReticle(); }
        if(e.key==='ArrowDown'){ ry = Math.min(h, ry+STEP); placeReticle(); }
        if(e.key===' ' || e.key==='Enter'){ e.preventDefault(); fireAt(rx, ry); }
      });

      // ---- duck visuals & flight ----
      // Beak is fixed pointing along the body's local +x axis; the whole
      // element gets rotated to match its current heading, so it always
      // visually faces the direction it's flying.
      function makeDuckEl(){
        const bodyW = 30, bodyH = 18;
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.width = bodyW+'px';
        el.style.height = bodyH+'px';
        el.style.borderRadius = '50%';
        el.style.background = 'var(--go)';
        el.style.boxShadow = '0 0 8px rgba(62,245,192,0.55)';
        el.style.zIndex = 6;
        const beak = document.createElement('div');
        beak.style.position = 'absolute';
        beak.style.top = (bodyH/2 - 4)+'px';
        beak.style.left = (bodyW - 1)+'px';
        beak.style.width = '0'; beak.style.height = '0';
        beak.style.borderTop = '4px solid transparent';
        beak.style.borderBottom = '4px solid transparent';
        beak.style.borderLeft = '8px solid var(--flash)';
        el.appendChild(beak);
        MR.stage.appendChild(el);
        return { el, bodyW, bodyH };
      }

      const MIN_LEG_LEN = 150, MAX_LEG_LEN = 300;
      const TURN_SPREAD = Math.PI * 0.7; // ~126° cone used when re-aiming off a wall

      // The duck lives entirely inside [0,w]x[0,h] for its whole life —
      // it never gets a chance to slip through a border. Whenever a wall
      // clamp actually changes its position this frame, it immediately
      // picks a fresh random heading biased back into the room (using the
      // wall(s) it just touched to build that bias), so a bounce always
      // looks like a believable carom rather than a stop-dead-at-the-edge.
      function wallBiasAngle(x, y, bodyW, bodyH){
        let vx = 0, vy = 0, any = false;
        if(x <= 0.5){ vx += 1; any = true; }
        if(x >= w-bodyW-0.5){ vx -= 1; any = true; }
        if(y <= 0.5){ vy += 1; any = true; }
        if(y >= h-bodyH-0.5){ vy -= 1; any = true; }
        return any ? Math.atan2(vy, vx) : null;
      }

      function spawnDuck(){
        const { el, bodyW, bodyH } = makeDuckEl();
        const speedBase = 0.20 * ctx.speedMul; // px/ms — a bit brisker than before
        const d = {
          el, bodyW, bodyH, speedBase,
          x: MR.rand(10, w-bodyW-10),
          y: MR.rand(10, h-bodyH-10),
          angle: MR.rand(0, Math.PI*2),
          segLen: MR.rand(MIN_LEG_LEN, MAX_LEG_LEN),
          segTraveled: 0,
          flapT: 0,
          flapped: false,
          alive: true,
          _cx: 0, _cy: 0
        };
        ducks.push(d);
        placeDuck(d);
        applyHeading(d);
      }

      function placeDuck(d){
        d.el.style.left = d.x+'px';
        d.el.style.top = d.y+'px';
        d._cx = d.x + d.bodyW/2;
        d._cy = d.y + d.bodyH/2;
      }

      function applyHeading(d){
        const deg = d.angle * 180/Math.PI;
        const flap = d.flapped ? 0.65 : 1;
        d.el.style.transform = `rotate(${deg}deg) scaleY(${flap})`;
      }

      function removeDuck(d){
        const i = ducks.indexOf(d);
        if(i>-1) ducks.splice(i,1);
      }

      function playHitFx(d){
        d.alive = false;
        removeDuck(d);
        d.el.style.transition = 'transform 320ms ease-in, opacity 320ms ease-in';
        d.el.style.transform = 'translateY(46px) rotate(75deg)';
        d.el.style.opacity = '0';
        d.el.style.background = 'var(--danger)';
        setTimeout(()=>{ d.el.remove(); }, 340);
      }

      function showMuzzleFlash(x,y){
        const f = document.createElement('div');
        f.style.position = 'absolute';
        f.style.left = (x-9)+'px'; f.style.top = (y-9)+'px';
        f.style.width = '18px'; f.style.height = '18px';
        f.style.borderRadius = '50%';
        f.style.background = 'var(--flash)';
        f.style.opacity = '0.85';
        f.style.pointerEvents = 'none';
        f.style.zIndex = 10;
        f.style.transition = 'transform 220ms ease-out, opacity 220ms ease-out';
        MR.stage.appendChild(f);
        requestAnimationFrame(()=>{ f.style.transform = 'scale(2.2)'; f.style.opacity = '0'; });
        setTimeout(()=>f.remove(), 240);
      }

      function fireAt(x, y){
        if(!alive) return;
        showMuzzleFlash(x, y);
        let target = null;
        for(const d of ducks){
          if(!d.alive) continue;
          const dx = x-d._cx, dy = y-d._cy;
          const hitR = Math.max(d.bodyW, d.bodyH)/2 + 10;
          if(dx*dx+dy*dy <= hitR*hitR){ target = d; break; }
        }
        if(target){
          hits++;
          playHitFx(target);
          updateHud();
          if(hits>=NEEDED){
            alive = false;
            setTimeout(()=> ctx.onWin(), 240);
          }
        } else {
          ammo--;
          updateHud();
          if(ammo<=0 && hits<NEEDED){
            alive = false;
            ctx.onLose();
          }
        }
      }

      function pointFromEvent(e){
        const r = MR.stage.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      }
      function onPointerDown(e){
        const p = pointFromEvent(e);
        fireAt(p.x, p.y);
      }
      MR.stage.addEventListener('pointerdown', onPointerDown);

      let lastT = performance.now();
      function loop(t){
        if(!alive){ return; }
        const dt = t - lastT; lastT = t;
        for(let i=ducks.length-1;i>=0;i--){
          const d = ducks[i];
          if(!d.alive) continue;

          const dist = d.speedBase*dt;
          let nx = d.x + Math.cos(d.angle)*dist;
          let ny = d.y + Math.sin(d.angle)*dist;
          const maxX = w-d.bodyW, maxY = h-d.bodyH;
          let hitWall = false;
          if(nx < 0){ nx = 0; hitWall = true; }
          else if(nx > maxX){ nx = maxX; hitWall = true; }
          if(ny < 0){ ny = 0; hitWall = true; }
          else if(ny > maxY){ ny = maxY; hitWall = true; }
          d.x = nx; d.y = ny;

          if(hitWall){
            const bias = wallBiasAngle(d.x, d.y, d.bodyW, d.bodyH);
            d.angle = (bias !== null ? bias : MR.rand(0, Math.PI*2)) + MR.rand(-TURN_SPREAD/2, TURN_SPREAD/2);
            d.segLen = MR.rand(MIN_LEG_LEN, MAX_LEG_LEN);
            d.segTraveled = 0;
          } else {
            d.segTraveled += dist;
            if(d.segTraveled >= d.segLen){
              d.angle = MR.rand(0, Math.PI*2);
              d.segLen = MR.rand(MIN_LEG_LEN, MAX_LEG_LEN);
              d.segTraveled = 0;
            }
          }

          d.flapT += dt;
          if(d.flapT > 130){
            d.flapT = 0;
            d.flapped = !d.flapped;
          }
          applyHeading(d);
          placeDuck(d);
        }
        MR.rafId = requestAnimationFrame(loop);
      }
      MR.rafId = requestAnimationFrame(loop);

      spawnDuck();

      ctx.onCleanup = ()=>{
        alive = false;
        if(MR.rafId) cancelAnimationFrame(MR.rafId);
        MR.stage.removeEventListener('pointerdown', onPointerDown);
        MR.stage.style.cursor = '';
        ducks.forEach(d=>d.el.remove());
      };
      // no survivalGame/stopIsWin flag: a timeout before the duck is hit
      // is a loss, matching the engine's default endRound(false) on timeout
    }
  });


  MR.games.push({
    label: 'SKEET',
    desc: 'Clay targets arc up from the bottom \u2014 shoot each one before it comes back down. Click/tap a clay, or steer the crosshair with arrow keys and fire with space/enter.',
    word: 'PULL!',
    timeLimit: s => 6200 / s,
    start(ctx){
      const w = MR.screen.clientWidth - 26, h = MR.screen.clientHeight - 26;
      const NEEDED = 2;
      let hits = 0, alive = true;
      const clays = [];

      MR.stage.style.cursor = 'crosshair';

      const stageLabelEl = document.getElementById('stageLabel');
      function updateHud(){
        if(stageLabelEl) stageLabelEl.textContent = 'SKEET \u00b7 \uD83C\uDFAF ' + hits + '/' + NEEDED;
      }
      updateHud();

      // ---- keyboard-driven crosshair (mouse/tap works directly on clays too) ----
      let rx = w/2, ry = h*0.6;
      const reticle = document.createElement('div');
      reticle.style.position = 'absolute';
      reticle.style.width = '22px'; reticle.style.height = '22px';
      reticle.style.marginLeft = '-11px'; reticle.style.marginTop = '-11px';
      reticle.style.border = '2px solid var(--flash)';
      reticle.style.borderRadius = '50%';
      reticle.style.boxShadow = '0 0 6px var(--flash)';
      reticle.style.pointerEvents = 'none';
      reticle.style.zIndex = 9;
      MR.stage.appendChild(reticle);
      function placeReticle(){ reticle.style.left = rx+'px'; reticle.style.top = ry+'px'; }
      placeReticle();

      const STEP = 30;
      MR.setKeyHandler((e)=>{
        if(e.key==='ArrowLeft'){ rx = Math.max(0, rx-STEP); placeReticle(); }
        if(e.key==='ArrowRight'){ rx = Math.min(w, rx+STEP); placeReticle(); }
        if(e.key==='ArrowUp'){ ry = Math.max(0, ry-STEP); placeReticle(); }
        if(e.key==='ArrowDown'){ ry = Math.min(h, ry+STEP); placeReticle(); }
        if(e.key===' ' || e.key==='Enter'){ e.preventDefault(); fireAt(rx, ry); }
      });

      // ---- clay visuals & flight ----
      // Flight time (T) is a fixed reaction-time budget, deliberately NOT
      // scaled by ctx.speedMul — a target that's airborne for less time the
      // harder the round gets would be punishing reflexes, not skill.
      // Difficulty instead comes entirely from spawnEvery below: clays
      // launch more often at higher speedMul, so more are in the air at
      // once, without any single clay ever becoming unfairly quick to spot.
      const T = 1550;
      const claySize = 26;

      function makeClayEl(){
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.width = claySize+'px'; el.style.height = claySize+'px';
        el.style.borderRadius = '50%';
        el.style.background = '#d9772e';
        el.style.boxShadow = 'inset 0 -4px 0 rgba(0,0,0,0.25), 0 0 8px rgba(217,119,46,0.5)';
        el.style.zIndex = 6;
        MR.stage.appendChild(el);
        return el;
      }

      function spawnClay(){
        const el = makeClayEl();
        const startX = MR.rand(claySize, w-claySize);
        const drift = (Math.random()<0.5?-1:1) * MR.rand(40,140);
        const endX = Math.max(claySize, Math.min(w-claySize, startX+drift));
        const apex = MR.rand(h*0.45, h*0.8);
        const spin = MR.rand(180,540) * (Math.random()<0.5?-1:1);
        const c = { el, startX, endX, apex, spin, t: 0, alive: true, hit: false, x: startX, y: 0 };
        clays.push(c);
        placeClay(c);
      }

      function placeClay(c){
        const p = c.t / T;
        c.x = c.startX + (c.endX - c.startX) * p;
        c.y = c.apex * 4 * p * (1 - p); // height above the bottom edge; 0 at launch/landing, apex at p=0.5
        c.el.style.left = (c.x - claySize/2) + 'px';
        c.el.style.bottom = c.y + 'px';
        c.el.style.transform = 'rotate(' + (c.spin * p) + 'deg)';
      }

      function removeClay(c){
        const i = clays.indexOf(c);
        if(i > -1) clays.splice(i, 1);
      }

      function playHitFx(c){
        c.hit = true; c.alive = false;
        removeClay(c);
        c.el.style.transition = 'transform 260ms ease-in, opacity 260ms ease-in';
        c.el.style.transform += ' scale(1.6)';
        c.el.style.opacity = '0';
        c.el.style.background = '#8a8a8a';
        setTimeout(()=>c.el.remove(), 280);
      }

      function playMissFx(c){
        c.alive = false;
        removeClay(c);
        c.el.remove();
      }

      function showMuzzleFlash(x,y){
        const f = document.createElement('div');
        f.style.position = 'absolute';
        f.style.left = (x-9)+'px'; f.style.top = (y-9)+'px';
        f.style.width = '18px'; f.style.height = '18px';
        f.style.borderRadius = '50%';
        f.style.background = 'var(--flash)';
        f.style.opacity = '0.85';
        f.style.pointerEvents = 'none';
        f.style.zIndex = 10;
        f.style.transition = 'transform 220ms ease-out, opacity 220ms ease-out';
        MR.stage.appendChild(f);
        requestAnimationFrame(()=>{ f.style.transform = 'scale(2.2)'; f.style.opacity = '0'; });
        setTimeout(()=>f.remove(), 240);
      }

      function fireAt(x, y){
        if(!alive) return;
        showMuzzleFlash(x, y);
        let target = null;
        for(const c of clays){
          if(!c.alive || c.hit) continue;
          const cy = h - c.y; // convert bottom-offset height to a top-down y to compare with pointer coords
          const dx = x-c.x, dy = y-cy;
          const hitR = claySize/2 + 10;
          if(dx*dx+dy*dy <= hitR*hitR){ target = c; break; }
        }
        if(target){
          hits++;
          playHitFx(target);
          updateHud();
          if(hits>=NEEDED){
            alive = false;
            setTimeout(()=> ctx.onWin(), 220);
          }
        }
      }

      function pointFromEvent(e){
        const r = MR.stage.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      }
      function onPointerDown(e){
        const p = pointFromEvent(e);
        fireAt(p.x, p.y);
      }
      MR.stage.addEventListener('pointerdown', onPointerDown);

      // difficulty knob: launches come more often as speedMul climbs. The
      // numerator/denominator here (1050, 6200 on timeLimit above) share the
      // same ratio so the number of launch opportunities per round stays
      // ~constant across the whole 0.8\u20131.6 range; the floor only ever
      // engages right at the top of that range, so it doesn't skew the ratio.
      const spawnEvery = Math.max(650, 1050 / ctx.speedMul);
      let spawnTimer = null;
      function trySpawn(){
        if(!alive) return;
        spawnClay();
        spawnTimer = setTimeout(trySpawn, spawnEvery);
      }

      let lastT = performance.now();
      function loop(t){
        if(!alive) return;
        const dt = t - lastT; lastT = t;
        for(let i=clays.length-1;i>=0;i--){
          const c = clays[i];
          if(!c.alive) continue;
          c.t += dt;
          if(c.t >= T){
            playMissFx(c);
            continue;
          }
          placeClay(c);
        }
        MR.rafId = requestAnimationFrame(loop);
      }
      MR.rafId = requestAnimationFrame(loop);

      trySpawn();

      ctx.onCleanup = ()=>{
        alive = false;
        clearTimeout(spawnTimer);
        if(MR.rafId) cancelAnimationFrame(MR.rafId);
        MR.stage.removeEventListener('pointerdown', onPointerDown);
        MR.stage.style.cursor = '';
        clays.forEach(c=>c.el.remove());
      };
      // no survivalGame/stopIsWin flag: a timeout before NEEDED hits is a
      // loss, matching HUNT's pattern above
    }
  });


  for(let i = CATEGORY_START; i < MR.games.length; i++) MR.games[i].category = 'shooting';

})();
