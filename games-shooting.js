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



  // ---------- SHARED AXIS-SHOOTER ICONS ----------
  // Clip-path polygons stand in for sprites, consistent with the rest of
  // the cartridge (no image assets). Shape carries the meaning, color is
  // just an accent on top of it:
  //   triangleRight/triangleUp   player ship — nose points in the fire
  //                              direction, picked from `vertical` below
  //   invader                    shared "grunt" diamond — used by every
  //                              rank-and-file enemy (Enemy A shmup,
  //                              Enemy B invader, BOSS RUN's mini
  //                              boss) so they read as the same kind of
  //                              threat regardless of game or movement
  //   boss                       bulkier hexagon reserved for boss-type
  //                              enemies, so it reads as heavier at a glance
  const ICONS = {
    triangleRight: 'polygon(0% 0%, 100% 50%, 0% 100%)',
    triangleUp: 'polygon(0% 100%, 50% 0%, 100% 100%)',
    invader: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    boss: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
  };
  // clip-path (unprefixed) covers current evergreen browsers; the Webkit
  // variant is kept alongside for older Safari, matching how the rest of
  // this file favors plain CSS over feature-detection.
  function iconStyle(shapeName){
    const shape = ICONS[shapeName];
    return shape ? { clipPath: shape, WebkitClipPath: shape } : {};
  }

  // ---------- SHARED AXIS-SHOOTER ENGINE ----------
  // A ship slides across N lanes, fires toward the far edge, reloads every
  // MAG_SIZE shots — and any number of independent enemy *types* fly in
  // against it. Each type in cfg.enemies fully defines itself: how many
  // lanes it spans, how many hits it takes to kill, how it moves, how it
  // shoots (cadence + how many of its own bullets can be in flight at
  // once), and how it spawns/respawns (how many can be alive together, how
  // many will ever spawn, how often). A classic wave of one-hit grunts, a
  // multi-lane boss that soaks up several hits, and a one-hit mini boss
  // escort the boss calls in are all just different parameter sets on the
  // same TYPES list — nothing here special-cases any of them by name.
  //
  // Everything below is expressed in "along" (the fire/approach axis: real
  // x when firing rightward, real y when firing upward) and "across" (the
  // lane axis: the other one) — both top-left pixel offsets. sizeStyle()/
  // setPos() are the only two places that translate that back into real
  // left/top/width/height, and overlap() is the one place that compares
  // two such rects — a single AABB test that works whether an enemy is
  // locked to one lane or spans several.
  function buildAxisShooter(ctx, cfg){
    const vertical = cfg.vertical; // false = fires right (horizontal shmup-like), true = fires up (invaders-like)
    const w = MR.screen.clientWidth - 36, h = MR.screen.clientHeight - 36;
    const LANE_COUNT = cfg.laneCount, NEEDED = cfg.needed;
    // reaching NEEDED win-eligible kills before the clock runs out ends the
    // round immediately via onWin() below regardless of mode. What happens
    // if the clock runs out first depends on cfg.survivalGame (default
    // true): a survival game counts simply
    // surviving — nothing having reached the player's edge or rammed them —
    // as a win too, since there's an endless wave rather than a fixed
    // objective. A non-survival game (BOSS RUN) has a fixed, killable
    // objective instead, so running out the clock without finishing it off
    // is a loss even if the player never got hit.
    ctx.survivalGame = cfg.survivalGame !== false;
    const MAG_SIZE = cfg.magSize, RELOAD_MS = cfg.reloadMs;

    const laneSpan = vertical ? w : h;
    const laneSize = laneSpan / LANE_COUNT;
    const laneCenter = i => i * laneSize + laneSize / 2;
    // 'sweepDescend' enemies step down through LANE_COUNT levels along the
    // approach axis as they bounce — unused by any other movement pattern.
    const travelSpan = vertical ? h : w;
    const levelSize = travelSpan / LANE_COUNT;
    const levelCenter = lvl => lvl * levelSize + levelSize / 2;

    const wrap = MR.makeEl('', { position: 'absolute', inset: '0' });
    MR.stage.appendChild(wrap);

    // cosmetic lane dividers only — collision logic never touches these
    for(let i = 1; i < LANE_COUNT; i++){
      wrap.appendChild(MR.makeEl('', vertical
        ? { position: 'absolute', top: '0', bottom: '0', left: (i * laneSize) + 'px', borderLeft: '1px dashed var(--line)' }
        : { position: 'absolute', left: '0', right: '0', top: (i * laneSize) + 'px', borderTop: '1px dashed var(--line)' }));
    }
    if(vertical){
      // cosmetic level dividers — sweep mode only, purely visual
      for(let i = 1; i < LANE_COUNT; i++){
        wrap.appendChild(MR.makeEl('', { position: 'absolute', left: '0', right: '0', top: (i * levelSize) + 'px', borderTop: '1px dashed var(--line)' }));
      }
    }

    // ---- coordinate helpers: along = approach axis, across = lane axis ----
    function sizeStyle(alongSize, acrossSize){
      return vertical ? { width: acrossSize + 'px', height: alongSize + 'px' } : { width: alongSize + 'px', height: acrossSize + 'px' };
    }
    function setPos(el, along, across){
      if(vertical){ el.style.left = across + 'px'; el.style.top = along + 'px'; }
      else { el.style.left = along + 'px'; el.style.top = across + 'px'; }
    }
    function alongOverlap(a, b){ return a.along < b.along + b.alongSize && a.along + a.alongSize > b.along; }
    function acrossOverlap(a, b){ return a.across < b.across + b.acrossSize && a.across + a.acrossSize > b.across; }
    // one AABB test covers every case now — a single-lane grunt exactly
    // matches its old lane-index check, and it generalizes cleanly to any
    // enemy spanning multiple lanes too.
    function overlap(a, b){ return alongOverlap(a, b) && acrossOverlap(a, b); }

    // ---- player ----
    const shipAlong = 30, shipAcross = Math.max(10, Math.min(20, laneSize - 10));
    const bulletDir = vertical ? -1 : 1;       // player fire direction along the approach axis
    const approachDir = -bulletDir;            // direction enemies/enemy-fire travel (toward the player)
    const nearAlong = vertical ? (travelSpan - 34) : 4; // player's fixed position along that axis
    let playerLane = Math.floor(LANE_COUNT / 2);

    const shipIcon = vertical ? 'triangleUp' : 'triangleRight'; // nose points toward the far edge, matching bulletDir
    const player = MR.makeEl('box', Object.assign({ background: 'var(--go)', zIndex: '5' }, sizeStyle(shipAlong, shipAcross), iconStyle(shipIcon)));
    wrap.appendChild(player);

    function playerAcross(){ return laneCenter(playerLane) - shipAcross / 2; }
    function updatePlayer(){ setPos(player, nearAlong, playerAcross()); }
    updatePlayer();
    function setLane(l){ playerLane = Math.max(0, Math.min(LANE_COUNT - 1, l)); updatePlayer(); }
    function playerRect(){ return { along: nearAlong, alongSize: shipAlong, across: playerAcross(), acrossSize: shipAcross }; }

    let alive = true, kills = 0, ammo = MAG_SIZE, reloading = false, reloadTimer = null;
    const enemies = [], bullets = [], enemyBullets = [];

    // ---- enemy types ----
    // Each entry in cfg.enemies is a complete, independent enemy
    // definition. Nothing downstream branches on "is this the boss?" —
    // every instance just reads its own type's numbers.
    //   id             label only, doesn't affect behavior
    //   hp             hits to kill (default 1)
    //   lanes          how many lanes wide it is (default 1)
    //   size           along-axis length in px (default 26)
    //   speed          along/across movement speed, scaled by ctx.speedMul like difficulty everywhere else
    //   movement       'approach' (flies straight toward the player, single fixed lane-block),
    //                  'sweepDescend' (bounces across the lane axis, stepping one level closer each bounce),
    //                  'holdSweep' (flies in, then holds and only bounces across the lane axis), or
    //                  'static' (doesn't move at all, just sits and shoots)
    //   stopFrac       holdSweep/static only: where along the approach axis it stops/sits (0-1 of travelSpan)
    //   color / ring   visuals — ring is an optional inset accent border
    //   icon           optional shape name from ICONS ('invader', 'boss') drawn
    //                  via clip-path in place of a plain rectangle (default: none)
    //   maxShooters    how many of THIS type's bullets can be in flight at once (default unlimited)
    //   shooterScope   'perInstance' (each instance gets its own cap) or 'sharedType' (all instances of
    //                  this type share one pool) — default 'perInstance'
    //   fireDelay/fireCooldown   [min,max] ms ranges for first shot / between shots
    //   countsTowardWin   whether killing one of these counts toward cfg.needed (default true)
    //   spawn.concurrent  max instances of this type alive at once (default unlimited)
    //   spawn.count       max instances of this type that will EVER spawn this round (default unlimited)
    //   spawn.every       ms between spawn attempts, scaled by ctx.speedMul (default 600)
    //   spawn.minEvery    floor on the scaled interval above (default 200)
    //   spawn.firstDelay  ms before the first spawn attempt (default 0)
    const TYPES = (cfg.enemies || []).map(t => {
      const rawSpawn = t.spawn || {};
      const spawn = {
        concurrent: rawSpawn.concurrent != null ? rawSpawn.concurrent : Infinity,
        count: rawSpawn.count != null ? rawSpawn.count : Infinity,
        every: Math.max(rawSpawn.minEvery != null ? rawSpawn.minEvery : 200, (rawSpawn.every != null ? rawSpawn.every : 600) / ctx.speedMul),
        firstDelay: rawSpawn.firstDelay != null ? rawSpawn.firstDelay : 0
      };
      return {
        id: t.id || '?',
        hp: t.hp != null ? t.hp : 1,
        lanes: t.lanes || 1,
        size: t.size || 26,
        speed: (t.speed != null ? t.speed : 0.2) * ctx.speedMul,
        movement: t.movement || 'approach',
        stopFrac: t.stopFrac != null ? t.stopFrac : 0.6,
        // optional: pin every instance of this type to one lane-block
        // instead of a random one each spawn (e.g. a floor-mounted
        // turret row). Index is 0-based from the near side of the lane
        // axis; -1 means the far-side lane-block (the "floor"). Default
        // null keeps the existing random-lane behavior every other
        // enemy type already relies on.
        fixedLane: t.fixedLane != null ? t.fixedLane : null,
        color: t.color || 'var(--danger)',
        ring: t.ring || null,
        icon: t.icon || null,
        maxShooters: t.maxShooters != null ? t.maxShooters : Infinity,
        shooterScope: t.shooterScope || 'perInstance',
        // aimed: fires a straight-line shot toward the player's current
        // position instead of a lane-locked shot straight along the
        // approach axis. Default false keeps every existing enemy's
        // straight-shot behavior unchanged.
        aimed: t.aimed === true,
        fireDelay: t.fireDelay || [500, 900],
        fireCooldown: t.fireCooldown || [900, 1900],
        countsTowardWin: t.countsTowardWin !== false,
        spawn,
        _spawned: 0,
        _timer: spawn.firstDelay
      };
    });

    const stageLabelEl = document.getElementById('stageLabel');
    function updateHud(){
      if(!stageLabelEl) return;
      const ammoText = reloading ? 'RELOADING\u2026' : ('ammo ' + ammo + '/' + MAG_SIZE);
      // total incoming capacity is the sum of every active attacker's own
      // cap — a sharedType cap is counted once per type, not once per
      // instance, so several grunts sharing one pool don't inflate it.
      const seenSharedTypes = new Set();
      let shooterCap = 0;
      enemies.forEach(en => {
        const type = en.type;
        if(type.shooterScope === 'sharedType'){
          if(seenSharedTypes.has(type)) return;
          seenSharedTypes.add(type);
        }
        shooterCap += type.maxShooters;
      });
      const capText = shooterCap === Infinity ? '\u221e' : Math.max(shooterCap, 1);
      const incomingText = '\u26a0\ufe0f ' + enemyBullets.length + '/' + capText;
      stageLabelEl.textContent = cfg.hudLabel + ' \u00b7 \ud83c\udfaf ' + kills + '/' + NEEDED + ' \u00b7 ' + ammoText + ' \u00b7 ' + incomingText;
    }
    updateHud();

    // ---- player bullets ----
    const BW_ALONG = 16, BW_ACROSS = 12;
    function spawnBullet(){
      const along = nearAlong + (bulletDir > 0 ? shipAlong : 0);
      const across = laneCenter(playerLane) - BW_ACROSS / 2;
      const el = MR.makeEl('box', Object.assign({ background: 'var(--flash)' }, sizeStyle(BW_ALONG, BW_ACROSS)));
      setPos(el, along, across);
      wrap.appendChild(el);
      bullets.push({ el, along, across, alongSize: BW_ALONG, acrossSize: BW_ACROSS });
    }

    function startReload(){
      reloading = true;
      updateHud();
      reloadTimer = setTimeout(() => {
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

    const decKey = vertical ? 'ArrowLeft' : 'ArrowUp';
    const incKey = vertical ? 'ArrowRight' : 'ArrowDown';
    MR.setKeyHandler((e) => {
      if(e.key === decKey) setLane(playerLane - 1);
      else if(e.key === incKey) setLane(playerLane + 1);
      else if(e.key === ' ' || e.key === 'Enter'){
        e.preventDefault();
        if(!e.repeat) fire(); // ignore key-repeat autofire — each shot needs its own press
      }
    });

    // tap the ship itself to fire (sits above the move zones via zIndex)
    player.style.cursor = 'pointer';
    player.addEventListener('click', fire);

    // tap zones live on elements created fresh each round, wiped by clearStage()
    const [zoneDec, zoneInc] = MR.splitZones(vertical);
    zoneDec.addEventListener('click', () => setLane(playerLane - 1));
    zoneInc.addEventListener('click', () => setLane(playerLane + 1));
    wrap.appendChild(zoneDec);
    wrap.appendChild(zoneInc);

    // ---- enemies ----
    function spawnEnemyOfType(type){
      const acrossSize = Math.max(10, type.lanes * laneSize - 10);
      const alongSize = type.size;
      // pick a valid block of `lanes` contiguous lanes and center the
      // enemy within it — a fixedLane type always uses the same
      // lane-block (e.g. a floor-mounted turret row); everything else
      // picks a fresh random block each spawn, same as before.
      const maxStartLane = LANE_COUNT - type.lanes;
      let startLane;
      if(type.fixedLane != null){
        startLane = type.fixedLane < 0 ? maxStartLane + type.fixedLane + 1 : type.fixedLane;
        startLane = Math.max(0, Math.min(maxStartLane, startLane));
      } else {
        startLane = Math.floor(Math.random() * (maxStartLane + 1));
      }
      const across = startLane * laneSize + (type.lanes * laneSize - acrossSize) / 2;

      let along, phase, level, dir;
      if(type.movement === 'sweepDescend'){ along = 0; level = 0; dir = Math.random() < 0.5 ? -1 : 1; }
      else if(type.movement === 'holdSweep'){ along = travelSpan; phase = 'approach'; dir = Math.random() < 0.5 ? -1 : 1; }
      else if(type.movement === 'static'){ along = travelSpan * type.stopFrac; }
      else { along = travelSpan; } // approach

      const style = Object.assign({ background: type.color }, sizeStyle(alongSize, acrossSize), iconStyle(type.icon));
      if(type.ring) style.boxShadow = 'inset 0 0 0 2px ' + type.ring;
      const el = MR.makeEl('box', style);
      wrap.appendChild(el);
      setPos(el, along, across);

      enemies.push({
        el, type, along, alongSize, across, acrossSize, dir, phase, level,
        hp: type.hp,
        // fireTimer counts down to this instance's next shot attempt,
        // staggered per-instance so shots don't all line up, and re-rolled
        // (see below) whenever an attempt is blocked by its shooter cap.
        fireTimer: MR.rand(type.fireDelay[0], type.fireDelay[1])
      });
    }

    function removeEnemy(en){ const i = enemies.indexOf(en); if(i > -1) enemies.splice(i, 1); en.el.remove(); }
    function removeBullet(b){ const i = bullets.indexOf(b); if(i > -1) bullets.splice(i, 1); b.el.remove(); }
    function removeEnemyBullet(b){ const i = enemyBullets.indexOf(b); if(i > -1) enemyBullets.splice(i, 1); b.el.remove(); }

    function spawnEnemyBullet(en){
      const type = en.type;
      // a sweeping/descending enemy aims from the level it's currently on;
      // everything else aims from wherever it currently sits along-axis
      const along = (vertical && type.movement === 'sweepDescend') ? levelCenter(en.level) - BW_ALONG / 2 : en.along;
      let across;
      if(type.aimed){
        // an aimed shot doesn't need to line up with a lane center — it
        // just leaves from wherever the enemy's own body currently is
        across = en.across + en.acrossSize / 2 - BW_ACROSS / 2;
      } else {
        // aim from whichever lane the enemy's current center sits over —
        // works the same whether it's locked to one lane or spans several
        const nearestLane = Math.max(0, Math.min(LANE_COUNT - 1, Math.floor((en.across + en.acrossSize / 2) / laneSize)));
        across = laneCenter(nearestLane) - BW_ACROSS / 2;
      }
      const el = MR.makeEl('box', Object.assign({ background: 'var(--danger)' }, sizeStyle(BW_ALONG, BW_ACROSS)));
      setPos(el, along, across);
      wrap.appendChild(el);
      const bullet = { el, along, across, alongSize: BW_ALONG, acrossSize: BW_ACROSS, owner: en, ownerType: type };
      if(type.aimed){
        // a straight-line shot toward wherever the player is *right now*
        // — angle is fixed at the moment of firing, not a homing missile,
        // so switching lanes right after the shot leaves is still a
        // clean dodge. velAlong/velAcross replace the plain along-only
        // drift every other bullet uses.
        const targetAlong = nearAlong + shipAlong / 2;
        const targetAcross = playerAcross() + shipAcross / 2;
        const dAlong = targetAlong - (along + BW_ALONG / 2);
        const dAcross = targetAcross - (across + BW_ACROSS / 2);
        const dist = Math.hypot(dAlong, dAcross) || 1;
        bullet.velAlong = (dAlong / dist) * enemyBulletSpeed;
        bullet.velAcross = (dAcross / dist) * enemyBulletSpeed;
      }
      enemyBullets.push(bullet);
    }

    // enemy bullets travel at a flat speed regardless of movement pattern
    const enemyBulletSpeed = (cfg.enemyBulletSpeed != null ? cfg.enemyBulletSpeed : 0.32) * ctx.speedMul;
    // Bullets are fixed-speed and comfortably outrun the fastest enemy so
    // a correctly-timed, correctly-loaded shot is always a safe kill — the
    // risk is reading the spawn lane late or firing dry.
    const bulletSpeed = cfg.bulletSpeed;

    let lastT = performance.now();
    function loop(t){
      if(!alive) return;
      const dt = t - lastT; lastT = t;

      // ---- per-type spawning/respawning ----
      // each type runs its own independent timer/concurrency/total-count
      // budget, so a type that just lost an instance can respawn on its
      // own schedule without touching any other type's pacing.
      TYPES.forEach(type => {
        if(type._spawned >= type.spawn.count) return;
        const aliveOfType = enemies.reduce((n, e) => n + (e.type === type ? 1 : 0), 0);
        if(aliveOfType >= type.spawn.concurrent) return;
        type._timer -= dt;
        if(type._timer <= 0){
          spawnEnemyOfType(type);
          type._spawned++;
          type._timer = type.spawn.every;
        }
      });

      for(let i = bullets.length - 1; i >= 0; i--){
        const b = bullets[i];
        b.along += bulletDir * bulletSpeed * dt;
        setPos(b.el, b.along, b.across);
        if(bulletDir > 0 ? b.along > travelSpan + 20 : b.along + b.alongSize < -20) removeBullet(b);
      }

      const pRect = playerRect();

      for(let i = enemies.length - 1; i >= 0; i--){
        const en = enemies[i];
        const type = en.type;

        if(type.movement === 'approach'){
          en.along += approachDir * type.speed * dt;
          setPos(en.el, en.along, en.across);
          if(approachDir < 0 ? en.along <= 0 : en.along >= travelSpan){ alive = false; ctx.onLose(); return; } // reached the player's edge — it wins
        } else if(type.movement === 'sweepDescend'){
          en.across += en.dir * type.speed * dt;
          if(en.across <= 0){ en.across = 0; en.dir = 1; en.along += levelSize; en.level++; }
          else if(en.across + en.acrossSize >= laneSpan){ en.across = laneSpan - en.acrossSize; en.dir = -1; en.along += levelSize; en.level++; }
          setPos(en.el, en.along, en.across);
          if(en.level >= LANE_COUNT - 1){ alive = false; ctx.onLose(); return; } // reached the base level — it wins
        } else if(type.movement === 'holdSweep'){
          // flies in, then holds that along-axis position and only sweeps
          // back and forth across the lane axis from then on — no
          // "reached the player's edge" auto-loss, since it never gets
          // that far; the only way it beats the player is by ramming or
          // gunning them down.
          if(en.phase === 'approach'){
            en.along += approachDir * type.speed * dt;
            const stopAlong = travelSpan * type.stopFrac;
            if(approachDir < 0 ? en.along <= stopAlong : en.along >= stopAlong){ en.along = stopAlong; en.phase = 'hold'; }
          } else {
            en.across += en.dir * type.speed * dt;
            if(en.across <= 0){ en.across = 0; en.dir = 1; }
            else if(en.across + en.acrossSize >= laneSpan){ en.across = laneSpan - en.acrossSize; en.dir = -1; }
          }
          setPos(en.el, en.along, en.across);
        } else { // 'static' — sits still and shoots
          setPos(en.el, en.along, en.across);
        }

        if(overlap(en, pRect)){ alive = false; ctx.onLose(); return; } // it rammed the player

        en.fireTimer -= dt;
        if(en.fireTimer <= 0){
          // a 'sharedType' cap pools bullets-in-flight across every
          // instance of this type; 'perInstance' (the default) counts only
          // this instance's own bullets — so e.g. a boss and the mini
          // bosses it calls in each keep their own separate budget.
          const scoped = type.shooterScope === 'sharedType';
          const inFlight = enemyBullets.reduce((n, b) => n + ((scoped ? b.ownerType === type : b.owner === en) ? 1 : 0), 0);
          if(inFlight < type.maxShooters){
            spawnEnemyBullet(en);
            en.fireTimer = MR.rand(type.fireCooldown[0], type.fireCooldown[1]); // cooldown before its next attempt
          } else {
            en.fireTimer = 150; // shooter slots full — retry again shortly
          }
        }
      }

      for(let i = enemyBullets.length - 1; i >= 0; i--){
        const b = enemyBullets[i];
        if(b.velAlong != null){ b.along += b.velAlong * dt; b.across += b.velAcross * dt; }
        else b.along += approachDir * enemyBulletSpeed * dt;
        setPos(b.el, b.along, b.across);
        const outAlong = approachDir > 0 ? b.along > travelSpan + 20 : b.along < -20;
        const outAcross = b.across + b.acrossSize < -20 || b.across > laneSpan + 20;
        if(outAlong || outAcross){ removeEnemyBullet(b); continue; }
        if(overlap(b, pRect)){ alive = false; ctx.onLose(); return; } // hit by enemy fire
      }

      for(let bi = bullets.length - 1; bi >= 0; bi--){
        const b = bullets[bi];
        for(let ei = enemies.length - 1; ei >= 0; ei--){
          const en = enemies[ei];
          if(overlap(b, en)){
            removeBullet(b);
            en.hp--;
            if(en.hp > 0){
              // flash instead of dying outright — it takes `hp` hits total
              en.el.style.filter = 'brightness(2.4)';
              setTimeout(() => { if(en.el) en.el.style.filter = ''; }, 90);
            } else {
              removeEnemy(en);
              if(en.type.countsTowardWin){
                kills++;
                updateHud();
                if(kills >= NEEDED){ alive = false; ctx.onWin(); return; }
              }
            }
            break;
          }
        }
      }

      MR.rafId = requestAnimationFrame(loop);
    }
    MR.rafId = requestAnimationFrame(loop);

    ctx.onCleanup = () => {
      alive = false;
      clearTimeout(reloadTimer);
      if(MR.rafId) cancelAnimationFrame(MR.rafId);
    };
    // ctx.survivalGame (set near the top, from cfg.survivalGame) decides
    // what a timeout means: true and running out the clock is itself a
    // valid win alongside reaching NEEDED kills; false and a timeout without
    // NEEDED kills is a loss, since then there's a fixed objective to clear
    // rather than an endless wave to outlast.
  }


  MR.games.push({
    label: 'SHMUP',
    desc: 'Mini side-scrolling shooter: move your ship across the 7 lanes with the up/down arrows (or tap the top/bottom of the screen), and fire with space or by tapping the ship itself. Every 3 shots you burn through a reload \u2014 no firing until it finishes \u2014 so line up shots carefully instead of spraying. Enemies shoot back (at most 1 shot incoming at once), so dodge by switching lanes.',
    word: 'INCOMING!',
    // fixed 7s round regardless of speedMul: difficulty comes from
    // enemyMoveSpeed/spawnEvery scaling with ctx.speedMul inside
    // buildAxisShooter, not from squeezing the clock.
    timeLimit: s => 8000,
    start(ctx){
      buildAxisShooter(ctx, {
        vertical: false, laneCount: 7, needed: 10, magSize: 3, reloadMs: 500, bulletSpeed: 0.60,
        hudLabel: 'SHMUP',
        enemies: [
          { // Enemy A — the standard grunt: 1 lane, dies in 1 hit, flies straight in.
            // Shares the 'invader' icon with INVADERS' invader and BOSS
            // RUN's mini boss, so all three read as the same kind of threat.
            id: 'A', hp: 1, lanes: 1, speed: 0.20, movement: 'approach',
            icon: 'invader', maxShooters: 1, shooterScope: 'sharedType',
            spawn: { every: 600, minEvery: 380 }
          }
        ]
      });
    }
  });


  MR.games.push({
    label: 'INVADERS',
    // buildAxisShooter's mechanics rotated 90\u00b0: columns instead of
    // lanes, ship slides left/right along the bottom instead of up/down,
    // invaders sweep-and-descend from the top instead of flying straight
    // in from the right. Same win/lose shape as SHMUP (NEEDED kills OR
    // survive the clock, lose if anything reaches the player's edge or
    // hits the ship) so the two games feel like a matched pair rather
    // than reskins with different rules.
    desc: 'Mini top-down shooter: slide your ship along the 7 columns with the left/right arrows (or tap the left/right side of the screen), and fire upward with space or by tapping the ship itself. Every 3 shots you burn through a reload \u2014 no firing until it finishes \u2014 so line up shots carefully instead of spraying. Invaders sweep across 7 vertical levels, dropping a level each time they bounce off an edge, and shoot back from the center of their current level (at most 2 shots incoming at once). Only 12 invaders spawn per round, but if even one reaches the base level, they win.',
    word: 'INVASION!',
    // fixed 7s round regardless of speedMul, same reasoning as SHMUP.
    timeLimit: s => 8000,
    start(ctx){
      buildAxisShooter(ctx, {
        vertical: true, laneCount: 7, needed: 10, magSize: 3, reloadMs: 500, bulletSpeed: 0.60,
        hudLabel: 'INVADERS',
        enemies: [
          { // Invader — 1 lane, dies in 1 hit, sweeps across and steps down a
            // level each bounce; capped at 12 spawns total (not 12 alive at
            // once), and every invader shares one 2-shot incoming budget so
            // the HUD's "at most 2 shots incoming" stays a hard cap. Uses the
            // same 'invader' icon as SHMUP's Enemy A and BOSS RUN's mini boss.
            id: 'INVADER', hp: 1, lanes: 1, speed: 0.45, movement: 'sweepDescend',
            icon: 'invader', maxShooters: 2, shooterScope: 'sharedType',
            spawn: { every: 600, minEvery: 380, count: 12 }
          }
        ]
      });
    }
  });


  MR.games.push({
    label: 'BOSS RUN',
    // Same SHMUP control scheme, but a single armored boss instead of a
    // stream of grunts: it spans 2 lanes, rolls in, then holds and only
    // sweeps up/down across those lanes — it takes 5 hits to bring down,
    // and fires back with up to 2 shots in flight at once. Partway through
    // it starts calling in mini bosses too: small single-lane escorts that
    // die in one hit but bring their own bullet in on top of the boss's.
    // Non-survival, unlike SHMUP/INVADERS: there's a fixed, killable
    // objective (the boss), so simply surviving to the buzzer without
    // finishing it off is a loss, not a win (cfg.survivalGame: false).
    desc: 'Mini side-scrolling boss fight: move your ship across the 7 lanes with the up/down arrows (or tap the top/bottom of the screen), and fire with space or by tapping the ship itself. A single armored boss spanning 2 lanes rolls in from the right, then holds position and sweeps up and down \u2014 it takes 5 hits to bring down, and fires back with up to 2 shots in flight at once. It also calls in mini bosses: small single-lane escorts that die in one hit but add one more shot on screen at a time. Every 4 shots you burn through a reload. You must bring the boss down before time runs out \u2014 simply surviving isn\u2019t enough.',
    word: 'BOSS INCOMING!',
    // fixed round length, same reasoning as other alien games \u2014
    // longer than those since there's more health to chew through.
    timeLimit: s => 14000,
    start(ctx){
      buildAxisShooter(ctx, {
        vertical: false, laneCount: 7, needed: 1, magSize: 4, reloadMs: 500, bulletSpeed: 0.60,
        hudLabel: 'BOSS RUN', survivalGame: false,
        enemies: [
          { // Boss — spans 2 lanes, rolls in then holds and only sweeps
            // across those lanes, takes 5 hits to bring down, only one ever
            // spawns, and it counts as the single win-eligible kill. Gets
            // its own bulkier 'boss' icon (a hexagon) instead of the shared
            // grunt shape, plus a purple accent color to match its escorts.
            id: 'BOSS', hp: 10, lanes: 2, speed: 0.20, movement: 'holdSweep', stopFrac: 0.62,
            color: 'var(--life)', icon: 'boss', maxShooters: 2,
            spawn: { count: 1, concurrent: 1 }
          },
          { // Mini boss — single-lane escort the boss calls in partway
            // through, dies in one hit, doesn't count toward the win, and
            // all mini bosses share a single incoming-shot slot (on top of
            // the boss's own 2) so at most one is ever on screen at once.
            // Reuses the shared 'invader' icon (same as Enemy A shmup /
            // Enemy B invader) — the purple accent color is what
            // marks it as part of the boss encounter, not its shape.
            id: 'MINIBOSS', hp: 1, lanes: 1, speed: 0.20, movement: 'approach',
            color: 'var(--life)', icon: 'invader', maxShooters: 1, shooterScope: 'sharedType', countsTowardWin: false,
            spawn: { every: 3200, firstDelay: 2200, concurrent: 1 }
          }
        ]
      });
    }
  });


  MR.games.push({
    label: 'TURRET SIEGE',
    // Horizontal like SHMUP (ship slides up/down the 7 lanes, fires
    // right) rather than INVADERS' vertical layout. Two enemy types
    // share the wave: a floor-mounted TURRET, pinned via fixedLane to
    // the far lane-block instead of a random one each spawn, so it
    // always reads as a fixed ground emplacement rather than just
    // another flying grunt — and it fires 'aimed' shots angled straight
    // at wherever the ship currently sits, rather than the lane-locked
    // shots every other enemy in this file fires. Alongside it is
    // SHMUP's own Enemy A, copied verbatim (same id/stats/spawn), so
    // the two games share a common grunt wave and only differ by the
    // turret line layered on top. Survival like SHMUP/INVADERS, not
    // BOSS RUN: outlasting the clock is itself a win, on top of the
    // early-win kill target.
    desc: 'Mini side-scrolling siege: move your ship across the 7 lanes with the up/down arrows (or tap the top/bottom of the screen), and fire with space or by tapping the ship itself. A row of floor-mounted turrets holds the far lane and fires back \u2014 they take 2 hits each, and aim their shots straight at wherever you are the instant they fire, so switching lanes right after is a clean dodge. Regular grunts fly straight in from the same side. Every 3 shots you burn through a reload \u2014 line up shots carefully instead of spraying. Reach 10 kills or survive to the buzzer to win.',
    word: 'SIEGE!',
    // fixed 8s round regardless of speedMul, matching SHMUP/INVADERS —
    // difficulty comes from speed/spawn scaling, not squeezing the clock.
    timeLimit: s => 8000,
    start(ctx){
      buildAxisShooter(ctx, {
        vertical: false, laneCount: 7, needed: 10, magSize: 3, reloadMs: 500, bulletSpeed: 0.60,
        hudLabel: 'TURRET SIEGE',
        enemies: [
          { // Turret — floor-mounted: fixedLane: -1 locks it to the far
            // lane-block every spawn instead of a random one, so only
            // one can usefully be alive at a time (concurrent: 1) and
            // it reads as a defended lane rather than a roaming enemy.
            // Takes 2 hits. aimed: true means its shots travel in a
            // straight line toward wherever the ship is *at the moment
            // of firing* instead of staying locked to the turret's own
            // lane — the angle is fixed at that instant, not homing, so
            // a lane switch right after the shot leaves still dodges it.
            id: 'TURRET', hp: 2, lanes: 1, movement: 'static', stopFrac: 0.6, fixedLane: -1,
            color: 'var(--danger)', ring: 'var(--flash)', maxShooters: 1, aimed: true,
            spawn: { concurrent: 1, every: 1400, minEvery: 900 }
          },
          { // Enemy A — SHMUP's standard grunt, unchanged: 1 lane, dies
            // in 1 hit, flies straight in. Shares the 'invader' icon
            // with SHMUP/INVADERS/BOSS RUN so it reads as the same
            // familiar threat here too.
            id: 'A', hp: 1, lanes: 1, speed: 0.20, movement: 'approach',
            icon: 'invader', maxShooters: 1, shooterScope: 'sharedType',
            spawn: { concurrent: 6, every: 600, minEvery: 380 }
          }
        ]
      });
    }
  });


  for(let i = CATEGORY_START; i < MR.games.length; i++) MR.games[i].category = 'shooting';

})();
