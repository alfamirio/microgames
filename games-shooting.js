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
      const btn = MR.makeEl('target', { width: '160px', height: '160px', background: 'var(--danger)', cursor: 'pointer', fontFamily: 'var(--display)', fontSize: '20px', color: '#0b0b10', fontWeight: '900' });
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

      const wrap = MR.makeEl('', { position: 'absolute', left: '16px', top: '16px', width: w + 'px', height: h + 'px' });
      MR.stage.appendChild(wrap);

      // 1-3 crooks among the 6 slots, positions randomized
      const crookCount = Math.floor(MR.rand(1, 4));
      const order = MR.shuffle([0, 1, 2, 3, 4, 5]);
      const crookSet = new Set(order.slice(0, crookCount));

      let remainingCrooks = crookCount;
      let alive = true;

      const figs = [];
      for(let i = 0; i < 6; i++){
        const r = Math.floor(i / COLS), c = i % COLS;
        const isCrook = crookSet.has(i);
        // pop-up entrance, staggered slightly per cutout for a quick-draw feel
        const el = MR.makeEl('cell', { position: 'absolute', width: cellW + 'px', height: cellH + 'px', left: (c * (cellW + GAP)) + 'px', top: (r * (cellH + GAP)) + 'px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.min(cellW, cellH) * 0.46 + 'px', background: '#c9a876', cursor: 'pointer', transition: 'transform 140ms ease, opacity 140ms ease, background 140ms ease', transform: 'translateY(14px) scale(0.9)', opacity: '0' });
        el.textContent = isCrook ? MR.pick(CROOKS) : MR.pick(CIVILIANS);
        wrap.appendChild(el);
        figs.push({ el, isCrook, hit: false, r, c });
        el.addEventListener('click', () => shoot(i));
        setTimeout(() => {
          if(!alive) return;
          MR.styleEl(el, { transform: 'translateY(0) scale(1)', opacity: '1' });
        }, 30 + i * 45);
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

      MR.gridSelector(ROWS, COLS, figs, (r, c) => shoot(r * COLS + c), f => f.hit);

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

      const wrap = MR.makeEl('', { position: 'absolute', left: '16px', top: '16px', width: w + 'px', height: h + 'px' });
      MR.stage.appendChild(wrap);

      // six independent slots — each one pops a crook or a bystander at
      // random, on its own timer, so multiple can be up (or ducking) at once
      const slots = [];
      for(let i = 0; i < 6; i++){
        const r = Math.floor(i / COLS), c = i % COLS;
        const el = MR.makeEl('cell', { position: 'absolute', width: cellW + 'px', height: cellH + 'px', left: (c * (cellW + GAP)) + 'px', top: (r * (cellH + GAP)) + 'px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.min(cellW, cellH) * 0.46 + 'px', overflow: 'hidden' });
        wrap.appendChild(el);
        slots.push({ el, r, c, active: null });
      }

      let alive = true;
      let spawnTimer = null;

      // scales down with speedMul — later rounds are noticeably quicker
      // floored: this is the window to spot+click a crook before a miss
      // ends the round, so it must never shrink below a reasonable human
      // reaction time — difficulty instead comes from spawnEvery/maxConcurrent
      const showDur = Math.max(1200, 1200 / ctx.speedMul);
      const spawnEvery = 500 / ctx.speedMul;
      const maxConcurrent = 2;
      const crookChance = 0.45;

      function popDown(slot){
        const el = slot.el;
        MR.styleEl(el, { transform: 'translateY(14px) scale(0.85)', opacity: '0', cursor: 'default' });
      }

      function spawnAt(slot){
        const isCrook = Math.random() < crookChance;
        const el = slot.el;
        MR.styleEl(el, { background: '#c9a876', cursor: 'pointer', transition: 'transform 100ms ease, opacity 100ms ease, background 100ms ease', transform: 'translateY(14px) scale(0.85)', opacity: '0' });
        el.textContent = isCrook ? MR.pick(CROOKS) : MR.pick(CIVILIANS);

        function onClick(){ shoot(slot); }
        el.addEventListener('click', onClick);
        const rec = { isCrook, shot: false, onClick, hideTimeout: null };
        slot.active = rec;

        requestAnimationFrame(() => {
          if(slot.active !== rec) return;
          MR.styleEl(el, { transform: 'translateY(0) scale(1)', opacity: '1' });
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

      MR.gridSelector(ROWS, COLS, slots, (r, c) => {
        const slot = slots.find(s => s.r === r && s.c === c);
        if(slot) shoot(slot);
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
      MR.createCrosshair({ x: w/2, y: h*0.4, w, h, onFire: (x,y)=>fireAt(x,y) });

      // ---- duck visuals & flight ----
      // Beak is fixed pointing along the body's local +x axis; the whole
      // element gets rotated to match its current heading, so it always
      // visually faces the direction it's flying.
      function makeDuckEl(){
        const bodyW = 30, bodyH = 18;
        const el = MR.makeEl('', { position: 'absolute', width: bodyW+'px', height: bodyH+'px', borderRadius: '50%', background: 'var(--go)', boxShadow: '0 0 8px rgba(62,245,192,0.55)', zIndex: 6 });
        const beak = MR.makeEl('', { position: 'absolute', top: (bodyH/2 - 4)+'px', left: (bodyW - 1)+'px', width: '0', height: '0', borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '8px solid var(--flash)' });
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

      function fireAt(x, y){
        if(!alive) return;
        MR.muzzleFlash(x, y);
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

      function onPointerDown(e){
        const p = MR.pointerPos(e);
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
      MR.createCrosshair({ x: w/2, y: h*0.6, w, h, onFire: (x,y)=>fireAt(x,y) });

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
        const el = MR.makeEl('', { position: 'absolute', width: claySize+'px', height: claySize+'px', borderRadius: '50%', background: '#d9772e', boxShadow: 'inset 0 -4px 0 rgba(0,0,0,0.25), 0 0 8px rgba(217,119,46,0.5)', zIndex: 6 });
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

      function fireAt(x, y){
        if(!alive) return;
        MR.muzzleFlash(x, y);
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

      function onPointerDown(e){
        const p = MR.pointerPos(e);
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


  MR.games.push({
    label: 'R-TYPE',
    desc: 'Mini side-scrolling shooter: move your ship across the 7 lanes with the up/down arrows (or tap the top/bottom of the screen), and fire with space or by tapping the ship itself. Every 3 shots you burn through a reload \u2014 no firing until it finishes \u2014 so line up shots carefully instead of spraying. Enemies shoot back (at most 2 shots incoming at once), so dodge by switching lanes.',
    word: 'INCOMING!',
    // fixed 7s round regardless of speedMul: difficulty comes from
    // enemySpeed/spawnEvery scaling with ctx.speedMul below, not from
    // squeezing the clock, since NEEDED now needs a stable window to
    // realistically fit 10 spawns + kills into.
    timeLimit: s => 8000,
    start(ctx){
      const w = MR.screen.clientWidth - 36, h = MR.screen.clientHeight - 36;
      const LANE_COUNT = 7, NEEDED = 10;
      // reaching NEEDED kills before the clock runs out ends the round
      // immediately via onWin() below; running the clock out otherwise
      // is now also a win, provided no enemy has reached the left
      // border in the meantime (that's an instant loss, handled where
      // enemies are moved, further down).
      ctx.survivalGame = true;
      const MAG_SIZE = 3, RELOAD_MS = 650;
      const laneH = h / LANE_COUNT;
      const laneY = i => i * laneH + laneH / 2;

      const wrap = MR.makeEl('', { position: 'absolute', inset: '0' });
      MR.stage.appendChild(wrap);

      // cosmetic lane dividers only \u2014 collision logic never touches these
      for(let i = 1; i < LANE_COUNT; i++){
        wrap.appendChild(MR.makeEl('', { position: 'absolute', left: '0', right: '0', top: (i * laneH) + 'px', borderTop: '1px dashed var(--line)' }));
      }

      // lanes are thinner with 7 of them, so ship/enemy height scales down
      // to fit rather than the fixed 20px used when there were only 3
      const shipW = 30, shipH = Math.max(10, Math.min(20, laneH - 10)), shipX = 4;
      let playerLane = 3;
      const player = MR.makeEl('box', { width: shipW + 'px', height: shipH + 'px', background: 'var(--go)', left: shipX + 'px', zIndex: '5' });
      wrap.appendChild(player);

      function updatePlayer(){ player.style.top = (laneY(playerLane) - shipH / 2) + 'px'; }
      updatePlayer();

      function setLane(l){ playerLane = Math.max(0, Math.min(LANE_COUNT - 1, l)); updatePlayer(); }

      let alive = true;
      let kills = 0;
      let ammo = MAG_SIZE;
      let reloading = false;
      let reloadTimer = null;
      const enemies = [];
      const bullets = [];
      // Enemies can shoot back, but at most ENEMY_MAX_SHOOTERS bullets are
      // ever in flight at once \u2014 this caps the incoming threat to a
      // readable amount regardless of how many enemies are on screen,
      // rather than letting a crowded screen turn into unavoidable fire.
      const ENEMY_MAX_SHOOTERS = 1;
      const enemyBullets = [];

      const stageLabelEl = document.getElementById('stageLabel');
      function updateHud(){
        if(!stageLabelEl) return;
        const ammoText = reloading ? 'RELOADING\u2026' : ('ammo ' + ammo + '/' + MAG_SIZE);
        const incomingText = '\u26a0\ufe0f ' + enemyBullets.length + '/' + ENEMY_MAX_SHOOTERS;
        stageLabelEl.textContent = 'R-TYPE \u00b7 \uD83C\uDFAF ' + kills + '/' + NEEDED + ' \u00b7 ' + ammoText + ' \u00b7 ' + incomingText;
      }
      updateHud();

      function spawnBullet(){
        const bw = 10, bh = 4;
        const x = shipX + shipW;
        const el = MR.makeEl('box', { width: bw + 'px', height: bh + 'px', background: 'var(--flash)', top: (laneY(playerLane) - bh / 2) + 'px', left: x + 'px' });
        wrap.appendChild(el);
        bullets.push({ el, lane: playerLane, x, w: bw });
      }

      function startReload(){
        reloading = true;
        updateHud();
        reloadTimer = setTimeout(()=>{
          if(!alive) return;
          reloading = false;
          ammo = MAG_SIZE;
          updateHud();
        }, RELOAD_MS);
      }

      function fire(){
        if(!alive || reloading || ammo <= 0) return;
        spawnBullet();
        ammo--;
        if(ammo <= 0) startReload();
        updateHud();
      }

      MR.setKeyHandler((e)=>{
        if(e.key === 'ArrowUp') setLane(playerLane - 1);
        else if(e.key === 'ArrowDown') setLane(playerLane + 1);
        else if(e.key === ' ' || e.key === 'Enter'){
          e.preventDefault();
          if(!e.repeat) fire(); // ignore key-repeat autofire \u2014 each shot needs its own press
        }
      });

      // tap the ship itself to fire (sits above the move zones via zIndex)
      player.style.cursor = 'pointer';
      player.addEventListener('click', fire);

      // tap zones live on elements created fresh each round, wiped by clearStage()
      const [topZone, bottomZone] = MR.splitZones(false);
      topZone.addEventListener('click', ()=> setLane(playerLane - 1));
      bottomZone.addEventListener('click', ()=> setLane(playerLane + 1));
      wrap.appendChild(topZone);
      wrap.appendChild(bottomZone);

      function spawnEnemy(){
        const lane = Math.floor(Math.random() * LANE_COUNT);
        const ew = 26, eh = shipH;
        const el = MR.makeEl('box', { width: ew + 'px', height: eh + 'px', background: 'var(--danger)', top: (laneY(lane) - eh / 2) + 'px', left: w + 'px' });
        wrap.appendChild(el);
        // fireTimer counts down to this enemy's next shot attempt; staggered
        // per-enemy so shots don't all line up, and re-rolled (see below)
        // whenever an attempt is blocked by the ENEMY_MAX_SHOOTERS cap.
        enemies.push({ el, lane, x: w, w: ew, fireTimer: 500 + Math.random() * 900 });
      }

      function removeEnemy(en){ const i = enemies.indexOf(en); if(i > -1) enemies.splice(i, 1); en.el.remove(); }
      function removeBullet(b){ const i = bullets.indexOf(b); if(i > -1) bullets.splice(i, 1); b.el.remove(); }

      const enemyBulletSpeed = 0.32 * ctx.speedMul;

      function spawnEnemyBullet(en){
        const bw = 10, bh = 4;
        const el = MR.makeEl('box', { width: bw + 'px', height: bh + 'px', background: 'var(--danger)', top: (laneY(en.lane) - bh / 2) + 'px', left: en.x + 'px' });
        wrap.appendChild(el);
        enemyBullets.push({ el, lane: en.lane, x: en.x, w: bw });
      }

      function removeEnemyBullet(b){ const i = enemyBullets.indexOf(b); if(i > -1) enemyBullets.splice(i, 1); b.el.remove(); }

      // enemy speed is a flat px/ms figure (same convention as DINOJUMP's
      // obstacles / BIRD HUNT's duck) rather than normalized to stage
      // width, so difficulty comes purely from ctx.speedMul like everywhere
      // else. Bullets are fixed-speed and comfortably outrun the fastest
      // enemy so a correctly-timed, correctly-loaded shot is always a safe
      // kill \u2014 the risk is reading the spawn lane late or firing dry.
      // With the round now a flat 7000ms, spawnEvery is tuned so at least
      // ~11-12 enemies spawn at baseline speedMul, giving enough shot
      // opportunities to land NEEDED=10 kills even after ammo/reload
      // pauses and the odd missed lane read; higher speedMul (from a
      // winning streak) spawns more often still, which is fine since the
      // player is expected to be scoring faster kills by then too.
      const enemySpeed = 0.20 * ctx.speedMul;
      const bulletSpeed = 0.55;
      const spawnEvery = Math.max(380, 600 / ctx.speedMul);
      let sinceSpawn = 200;

      let lastT = performance.now();
      function loop(t){
        if(!alive) return;
        const dt = t - lastT; lastT = t;

        sinceSpawn += dt;
        if(sinceSpawn > spawnEvery){ sinceSpawn = 0; spawnEnemy(); }

        for(let i = bullets.length - 1; i >= 0; i--){
          const b = bullets[i];
          b.x += bulletSpeed * dt;
          b.el.style.left = b.x + 'px';
          if(b.x > w + 20) removeBullet(b);
        }

        for(let i = enemies.length - 1; i >= 0; i--){
          const en = enemies[i];
          en.x -= enemySpeed * dt;
          en.el.style.left = en.x + 'px';
          if(en.lane === playerLane && en.x < shipX + shipW && en.x + en.w > shipX){
            alive = false; ctx.onLose(); return; // enemy hit the player
          }
          if(en.x <= 0){
            alive = false; ctx.onLose(); return; // enemy reached the left border
          }

          en.fireTimer -= dt;
          if(en.fireTimer <= 0){
            if(enemyBullets.length < ENEMY_MAX_SHOOTERS){
              spawnEnemyBullet(en);
              en.fireTimer = 900 + Math.random() * 1000; // cooldown before its next attempt
            } else {
              en.fireTimer = 150; // shooter slots full \u2014 retry again shortly
            }
          }
        }

        for(let i = enemyBullets.length - 1; i >= 0; i--){
          const b = enemyBullets[i];
          b.x -= enemyBulletSpeed * dt;
          b.el.style.left = b.x + 'px';
          if(b.x < -20){ removeEnemyBullet(b); continue; }
          if(b.lane === playerLane && b.x < shipX + shipW && b.x + b.w > shipX){
            alive = false; ctx.onLose(); return; // hit by enemy fire
          }
        }

        for(let bi = bullets.length - 1; bi >= 0; bi--){
          const b = bullets[bi];
          for(let ei = enemies.length - 1; ei >= 0; ei--){
            const en = enemies[ei];
            if(b.lane === en.lane && b.x < en.x + en.w && b.x + b.w > en.x){
              removeBullet(b);
              removeEnemy(en);
              kills++;
              updateHud();
              if(kills >= NEEDED){ alive = false; ctx.onWin(); return; }
              break;
            }
          }
        }

        MR.rafId = requestAnimationFrame(loop);
      }
      MR.rafId = requestAnimationFrame(loop);

      ctx.onCleanup = ()=>{
        alive = false;
        clearTimeout(reloadTimer);
        if(MR.rafId) cancelAnimationFrame(MR.rafId);
      };
      // ctx.survivalGame = true (set above): running out the clock counts
      // as a win here, unlike HUNT/SKEET, since surviving to the timeout
      // without any enemy reaching the left border (or hitting the ship)
      // is itself a valid win condition alongside reaching NEEDED kills.
    }
  });


  MR.games.push({
    label: 'SPACE INVADERS',
    // R-TYPE's mechanics rotated 90\u00b0: columns instead of lanes, ship
    // slides left/right along the bottom instead of up/down, invaders
    // descend from the top instead of scrolling in from the right. Same
    // win/lose shape as R-TYPE (NEEDED kills OR survive the clock, lose
    // if anything reaches the base level or hits the ship) so the two
    // games feel like a matched pair rather than reskins with different rules.
    desc: 'Mini top-down shooter: slide your ship along the 7 columns with the left/right arrows (or tap the left/right side of the screen), and fire upward with space or by tapping the ship itself. Every 3 shots you burn through a reload \u2014 no firing until it finishes \u2014 so line up shots carefully instead of spraying. Invaders sweep across 7 vertical levels, dropping a level each time they bounce off an edge, and shoot back from the center of their current level (at most 2 shots incoming at once). Only 12 invaders spawn per round, but if even one reaches the base level, they win. One shield appears above the player in a random column each round and soaks up incoming fire there.',
    word: 'INVASION!',
    // fixed 7s round regardless of speedMul, same reasoning as R-TYPE:
    // difficulty comes from enemySpeed/spawnEvery scaling with
    // ctx.speedMul, not from squeezing the clock.
    timeLimit: s => 8000,
    start(ctx){
      const w = MR.screen.clientWidth - 36, h = MR.screen.clientHeight - 36;
      const COL_COUNT = 7, ROW_COUNT = 7, NEEDED = 10;
      // reaching NEEDED kills before the clock runs out ends the round
      // immediately via onWin() below; running the clock out otherwise
      // is now also a win, provided no invader has reached the base
      // level in the meantime (that's an instant loss, handled where
      // invaders are moved, further down).
      ctx.survivalGame = true;
      const MAG_SIZE = 3, RELOAD_MS = 650;
      const colW = w / COL_COUNT;
      const colX = i => i * colW + colW / 2;
      // 7 vertical levels mirror the 7 columns: an invader steps down
      // exactly one level (rowH) each time it bounces off a horizontal
      // edge (see LEVEL_STEP below), and its shots always fire from the
      // vertical center of whichever level it's currently sweeping.
      const rowH = h / ROW_COUNT;
      const rowCenterY = level => level * rowH + rowH / 2;

      const wrap = MR.makeEl('', { position: 'absolute', inset: '0' });
      MR.stage.appendChild(wrap);

      // cosmetic column dividers only \u2014 collision logic never touches these
      for(let i = 1; i < COL_COUNT; i++){
        wrap.appendChild(MR.makeEl('', { position: 'absolute', top: '0', bottom: '0', left: (i * colW) + 'px', borderLeft: '1px dashed var(--line)' }));
      }
      // cosmetic level (row) dividers only \u2014 same deal, purely visual
      for(let i = 1; i < ROW_COUNT; i++){
        wrap.appendChild(MR.makeEl('', { position: 'absolute', left: '0', right: '0', top: (i * rowH) + 'px', borderTop: '1px dashed var(--line)' }));
      }

      // columns are narrower with 7 of them, so ship/invader width scales
      // down to fit rather than a fixed size
      const shipH = 30, shipW = Math.max(10, Math.min(20, colW - 10)), shipY = h - 34;
      let playerCol = 3;
      const player = MR.makeEl('box', { width: shipW + 'px', height: shipH + 'px', background: 'var(--go)', top: shipY + 'px', zIndex: '5' });
      wrap.appendChild(player);

      function updatePlayer(){ player.style.left = (colX(playerCol) - shipW / 2) + 'px'; }
      updatePlayer();

      function setCol(c){ playerCol = Math.max(0, Math.min(COL_COUNT - 1, c)); updatePlayer(); }

      // One shield sits above the player in a random column for the whole
      // round \u2014 it's indestructible and only intercepts incoming invader
      // fire (the player's own shots and invader ships pass through it
      // untouched), giving a free bit of cover in whichever lane it lands.
      const shieldW = Math.max(24, colW - 8), shieldH = 12;
      const shieldCol = Math.floor(Math.random() * COL_COUNT);
      const shieldX = colX(shieldCol) - shieldW / 2, shieldY = shipY - 44;
      const shield = MR.makeEl('box', { width: shieldW + 'px', height: shieldH + 'px', left: shieldX + 'px', top: shieldY + 'px', background: 'var(--go)', opacity: '0.45', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' });
      shield.textContent = '\ud83d\udee1\ufe0f';
      wrap.appendChild(shield);

      let alive = true;
      let kills = 0;
      let ammo = MAG_SIZE;
      let reloading = false;
      let reloadTimer = null;
      const enemies = [];
      const bullets = [];
      // Invaders can shoot back, but at most ENEMY_MAX_SHOOTERS bullets are
      // ever in flight at once \u2014 this caps the incoming threat to a
      // readable amount regardless of how many invaders are on screen,
      // rather than letting a crowded screen turn into unavoidable fire.
      const ENEMY_MAX_SHOOTERS = 1;
      const enemyBullets = [];

      // Invaders no longer sit in one fixed column \u2014 each sweeps back
      // and forth across the full width and only steps down a level when
      // it bounces off an edge, so every hitbox check below is a real
      // pixel-rectangle overlap rather than a column-index match.
      function overlaps(ax, aw, ay, ah, bx, bw, by, bh){
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
      }
      function playerX(){ return colX(playerCol) - shipW / 2; }

      const stageLabelEl = document.getElementById('stageLabel');
      function updateHud(){
        if(!stageLabelEl) return;
        const ammoText = reloading ? 'RELOADING\u2026' : ('ammo ' + ammo + '/' + MAG_SIZE);
        const incomingText = '\u26a0\ufe0f ' + enemyBullets.length + '/' + ENEMY_MAX_SHOOTERS;
        stageLabelEl.textContent = 'SPACE INVADERS \u00b7 \ud83c\udfaf ' + kills + '/' + NEEDED + ' \u00b7 ' + ammoText + ' \u00b7 ' + incomingText;
      }
      updateHud();

      function spawnBullet(){
        const bw = 4, bh = 10;
        const x = colX(playerCol) - bw / 2, y = shipY;
        const el = MR.makeEl('box', { width: bw + 'px', height: bh + 'px', background: 'var(--flash)', left: x + 'px', top: y + 'px' });
        wrap.appendChild(el);
        bullets.push({ el, x, y, w: bw, h: bh });
      }

      function startReload(){
        reloading = true;
        updateHud();
        reloadTimer = setTimeout(()=>{
          if(!alive) return;
          reloading = false;
          ammo = MAG_SIZE;
          updateHud();
        }, RELOAD_MS);
      }

      function fire(){
        if(!alive || reloading || ammo <= 0) return;
        spawnBullet();
        ammo--;
        if(ammo <= 0) startReload();
        updateHud();
      }

      MR.setKeyHandler((e)=>{
        if(e.key === 'ArrowLeft') setCol(playerCol - 1);
        else if(e.key === 'ArrowRight') setCol(playerCol + 1);
        else if(e.key === ' ' || e.key === 'Enter'){
          e.preventDefault();
          if(!e.repeat) fire(); // ignore key-repeat autofire \u2014 each shot needs its own press
        }
      });

      // tap the ship itself to fire (sits above the move zones via zIndex)
      player.style.cursor = 'pointer';
      player.addEventListener('click', fire);

      // tap zones live on elements created fresh each round, wiped by clearStage()
      const [leftZone, rightZone] = MR.splitZones(true);
      leftZone.addEventListener('click', ()=> setCol(playerCol - 1));
      rightZone.addEventListener('click', ()=> setCol(playerCol + 1));
      wrap.appendChild(leftZone);
      wrap.appendChild(rightZone);

      // each invader steps down by one full level (rowH) the moment it
      // bounces off either horizontal edge \u2014 it sweeps the full width,
      // drops a level, sweeps back the other way, drops again, and so on,
      // rather than descending continuously like R-TYPE's enemies do
      // horizontally. LEVEL_STEP matches rowH so it always lands exactly
      // on the next of the 7 levels instead of drifting between them.
      const LEVEL_STEP = rowH;

      function spawnEnemy(){
        const startCol = Math.floor(Math.random() * COL_COUNT);
        const ew = shipW, eh = 26;
        const x = colX(startCol) - ew / 2;
        const dir = Math.random() < 0.5 ? -1 : 1;
        const el = MR.makeEl('box', { width: ew + 'px', height: eh + 'px', background: 'var(--danger)', left: x + 'px', top: '0px' });
        wrap.appendChild(el);
        // fireTimer counts down to this invader's next shot attempt; staggered
        // per-invader so shots don't all line up, and re-rolled (see below)
        // whenever an attempt is blocked by the ENEMY_MAX_SHOOTERS cap.
        // level tracks which of the 7 rows it currently occupies, used to
        // center its shots on that row rather than its exact pixel y.
        enemies.push({ el, x, y: 0, w: ew, h: eh, dir, level: 0, fireTimer: 500 + Math.random() * 900 });
      }

      function removeEnemy(en){ const i = enemies.indexOf(en); if(i > -1) enemies.splice(i, 1); en.el.remove(); }
      function removeBullet(b){ const i = bullets.indexOf(b); if(i > -1) bullets.splice(i, 1); b.el.remove(); }

      const enemyBulletSpeed = 0.32 * ctx.speedMul;

      // Invaders fire from the vertical center of whichever level (row)
      // they're currently sweeping, and from the horizontal center of
      // whichever column lane they're currently over \u2014 not their exact
      // pixel x/y \u2014 so shots always line up cleanly with the grid
      // instead of firing from wherever mid-sweep they happened to be.
      function spawnEnemyBullet(en){
        const bw = 4, bh = 10;
        const col = Math.max(0, Math.min(COL_COUNT - 1, Math.floor((en.x + en.w / 2) / colW)));
        const x = colX(col) - bw / 2, y = rowCenterY(en.level) - bh / 2;
        const el = MR.makeEl('box', { width: bw + 'px', height: bh + 'px', background: 'var(--danger)', left: x + 'px', top: y + 'px' });
        wrap.appendChild(el);
        enemyBullets.push({ el, x, y, w: bw, h: bh });
      }

      function removeEnemyBullet(b){ const i = enemyBullets.indexOf(b); if(i > -1) enemyBullets.splice(i, 1); b.el.remove(); }

      // invader horizontal speed is a flat px/ms figure (same convention
      // as R-TYPE's enemies) rather than normalized to stage width, so
      // difficulty comes purely from ctx.speedMul like everywhere else.
      // Bullets are fixed-speed and comfortably outrun the fastest invader
      // so a correctly-timed, correctly-loaded shot is always a safe kill
      // \u2014 the risk is reading the spawn column late or firing dry.
      // spawnEvery is tuned so at least ~11-12 invaders spawn at baseline
      // speedMul, giving enough shot opportunities to land NEEDED=10 kills
      // even after ammo/reload pauses and the odd missed shot. MAX_ENEMIES
      // caps the round at 12 invaders total \u2014 once that many have spawned,
      // no more appear even if there's still time left.
      const enemyHSpeed = 0.45 * ctx.speedMul;
      const bulletSpeed = 0.60;
      const spawnEvery = Math.max(380, 600 / ctx.speedMul);
      const MAX_ENEMIES = 12;
      let spawnedCount = 0;
      let sinceSpawn = 200;

      let lastT = performance.now();
      function loop(t){
        if(!alive) return;
        const dt = t - lastT; lastT = t;

        if(spawnedCount < MAX_ENEMIES){
          sinceSpawn += dt;
          if(sinceSpawn > spawnEvery){ sinceSpawn = 0; spawnEnemy(); spawnedCount++; }
        }

        for(let i = bullets.length - 1; i >= 0; i--){
          const b = bullets[i];
          b.y -= bulletSpeed * dt;
          b.el.style.top = b.y + 'px';
          if(b.y + b.h < -20) removeBullet(b);
        }

        const pX = playerX();

        for(let i = enemies.length - 1; i >= 0; i--){
          const en = enemies[i];
          en.x += en.dir * enemyHSpeed * dt;
          if(en.x <= 0){
            en.x = 0; en.dir = 1; en.y += LEVEL_STEP; en.level++;
          } else if(en.x + en.w >= w){
            en.x = w - en.w; en.dir = -1; en.y += LEVEL_STEP; en.level++;
          }
          en.el.style.left = en.x + 'px';
          en.el.style.top = en.y + 'px';

          if(overlaps(en.x, en.w, en.y, en.h, pX, shipW, shipY, shipH)){
            alive = false; ctx.onLose(); return; // invader hit the player
          }
          if(en.level >= ROW_COUNT - 1){
            alive = false; ctx.onLose(); return; // invader reached the base level \u2014 they win
          }

          en.fireTimer -= dt;
          if(en.fireTimer <= 0){
            if(enemyBullets.length < ENEMY_MAX_SHOOTERS){
              spawnEnemyBullet(en);
              en.fireTimer = 900 + Math.random() * 1000; // cooldown before its next attempt
            } else {
              en.fireTimer = 150; // shooter slots full \u2014 retry again shortly
            }
          }
        }

        for(let i = enemyBullets.length - 1; i >= 0; i--){
          const b = enemyBullets[i];
          b.y += enemyBulletSpeed * dt;
          b.el.style.top = b.y + 'px';
          if(b.y > h + 20){ removeEnemyBullet(b); continue; }
          if(overlaps(b.x, b.w, b.y, b.h, shieldX, shieldW, shieldY, shieldH)){
            removeEnemyBullet(b); continue; // absorbed by the shield
          }
          if(overlaps(b.x, b.w, b.y, b.h, pX, shipW, shipY, shipH)){
            alive = false; ctx.onLose(); return; // hit by invader fire
          }
        }

        for(let bi = bullets.length - 1; bi >= 0; bi--){
          const b = bullets[bi];
          for(let ei = enemies.length - 1; ei >= 0; ei--){
            const en = enemies[ei];
            if(overlaps(b.x, b.w, b.y, b.h, en.x, en.w, en.y, en.h)){
              removeBullet(b);
              removeEnemy(en);
              kills++;
              updateHud();
              if(kills >= NEEDED){ alive = false; ctx.onWin(); return; }
              break;
            }
          }
        }

        MR.rafId = requestAnimationFrame(loop);
      }
      MR.rafId = requestAnimationFrame(loop);

      ctx.onCleanup = ()=>{
        alive = false;
        clearTimeout(reloadTimer);
        if(MR.rafId) cancelAnimationFrame(MR.rafId);
      };
      // ctx.survivalGame = true (set above): running out the clock counts
      // as a win here, since surviving to the timeout without any invader
      // reaching the base level (or hitting the ship) is itself a
      // valid win condition alongside reaching NEEDED kills.
    }
  });


  for(let i = CATEGORY_START; i < MR.games.length; i++) MR.games[i].category = 'shooting';

})();
