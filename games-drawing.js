(function(){
  "use strict";
  const MR = window.MR;
  const CATEGORY_START = MR.games.length;

  // ---------- SHARED DRAWING/TRACE ENGINE ----------
  // Both games below are the same core interaction — drag a stroke along a
  // dashed guide path from a green start dot to a red finish dot, covering
  // enough of it to count as "traced" — so the path generation, coverage
  // sampling, SVG rendering, and pointer plumbing all live here once.
  // cfg.hazards turns on the one behavioral difference: red zones that end
  // the round immediately on contact, with the path's own coverage samples
  // thinned out near each hazard so the player is expected to swerve wide
  // of that stretch rather than still having to "touch" it.
  //
  // cfg:
  //   promptText   - small label shown above the stage
  //   hazards      - true to spawn dodge zones (default false)
  //   coverRadius  - px radius counted as "covering" a sample point (default 24)
  //   hazardRadius - px radius of each hazard circle (default 20, hazards only)
  //   coverThreshold - fraction of required samples that must be covered (default 0.90)
  //   customPath   - optional array of {x,y} points normalized to a 0-1 unit
  //                  square (0,0 = top-left). When given, this replaces the
  //                  random zigzag path below — same margin box, same
  //                  sampling/coverage/rendering, just a fixed shape instead
  //                  of a generated one. This is how MATCH THE LETTER draws
  //                  actual glyphs through this same engine.
  function buildDrawingGame(ctx, cfg){
    cfg = cfg || {};
    const hazardsOn = !!cfg.hazards;
    const COVER_RADIUS = cfg.coverRadius || 24;
    const HAZARD_RADIUS = cfg.hazardRadius || 20;
    const COVER_THRESHOLD = cfg.coverThreshold || 0.90;

    const rect = MR.stage.getBoundingClientRect();
    const W = rect.width, H = rect.height;

    const marginX = W * 0.14, marginY = H * 0.16;
    let path;
    if(cfg.customPath){
      // fixed shape (e.g. a glyph) — scaled into the same margin box the
      // random path below would use, so it sits in exactly the same safe
      // drawing area regardless of which kind of path this round has.
      path = cfg.customPath.map(p => ({
        x: marginX + p.x * (W - 2*marginX),
        y: marginY + p.y * (H - 2*marginY)
      }));
    } else {
      // Generate a 3-4 point path, x evenly spaced left-to-right so it
      // always reads as a single traceable line rather than a shape that
      // doubles back on itself (which pointer-based coverage checking
      // can't disambiguate).
      const n = 3 + Math.floor(Math.random()*2);
      path = [];
      for(let i=0;i<n;i++){
        const x = marginX + (W - 2*marginX) * (i/(n-1));
        const y = MR.rand(marginY, H - marginY);
        path.push({ x, y });
      }
    }
    const start = path[0], finish = path[path.length-1];

    // Sample points along every segment (shared vertices counted once)
    // so "coverage" can be measured as a simple fraction regardless of
    // how many bends the path has.
    const SPACING = 14;
    const samples = [];
    for(let i=0;i<path.length-1;i++){
      const a = path[i], b = path[i+1];
      const segLen = Math.hypot(b.x-a.x, b.y-a.y);
      const steps = Math.max(1, Math.round(segLen/SPACING));
      for(let s = (i===0 ? 0 : 1); s<=steps; s++){
        const t = s/steps;
        samples.push({ x: a.x+(b.x-a.x)*t, y: a.y+(b.y-a.y)*t });
      }
    }

    // Hazards: one per interior-ish segment (1 for a 2-segment path, 2 for
    // a 3-segment path), offset just off the straight line so a naive
    // straight-line trace runs right through it — the player has to
    // actually bow their stroke away from the guide to survive.
    let hazards = [];
    if(hazardsOn){
      const numHazards = Math.max(1, path.length - 2);
      const segIndices = MR.shuffle(Array.from({length: path.length-1}, (_,i)=>i)).slice(0, numHazards);
      hazards = segIndices.map(segIdx=>{
        const a = path[segIdx], b = path[segIdx+1];
        const t = MR.rand(0.35, 0.65);
        const bx = a.x+(b.x-a.x)*t, by = a.y+(b.y-a.y)*t;
        const dx = b.x-a.x, dy = b.y-a.y;
        const len = Math.hypot(dx,dy) || 1;
        const px = -dy/len, py = dx/len;
        const sign = Math.random()<0.5 ? 1 : -1;
        const offset = COVER_RADIUS * 0.65;
        return { x: bx+px*offset*sign, y: by+py*offset*sign, radius: HAZARD_RADIUS };
      });
    }

    // Samples too close to a hazard are excluded from the coverage
    // requirement entirely — the player is expected to swerve wide of
    // them, not thread the needle to still "touch" that stretch of the
    // original line. With no hazards this is just every sample.
    const EXCLUDE_RADIUS = COVER_RADIUS + HAZARD_RADIUS + 6;
    const requiredSamples = samples
      .filter(s => !hazards.some(h => Math.hypot(s.x-h.x, s.y-h.y) <= EXCLUDE_RADIUS))
      .map(s => ({ x:s.x, y:s.y, covered:false }));
    let coveredCount = 0;

    const label = MR.makeEl('prompt-word', { position:'absolute', top:'4%', left:'50%', transform:'translateX(-50%)', fontSize:'16px' });
    label.textContent = cfg.promptText || 'drag start \u2192 finish';
    MR.stage.appendChild(label);

    // Overlay div is the actual pointer-event surface; it's destroyed
    // with the rest of the stage at the start of the next round, so its
    // listeners can never leak into a later drawing round.
    const overlay = MR.makeEl('', { position:'absolute', left:'0', top:'0', width:'100%', height:'100%', touchAction:'none', cursor:'crosshair' });
    MR.stage.appendChild(overlay);

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width','100%');
    svg.setAttribute('height','100%');
    MR.styleEl(svg, { position:'absolute', left:'0', top:'0', pointerEvents:'none' });
    overlay.appendChild(svg);

    const guideLine = document.createElementNS(svgNS,'polyline');
    guideLine.setAttribute('points', path.map(p=>p.x+','+p.y).join(' '));
    guideLine.setAttribute('fill','none');
    guideLine.setAttribute('stroke','var(--dim)');
    guideLine.setAttribute('stroke-width','4');
    guideLine.setAttribute('stroke-dasharray','7 8');
    guideLine.setAttribute('stroke-linecap','round');
    guideLine.setAttribute('stroke-linejoin','round');
    svg.appendChild(guideLine);

    const tracedLine = document.createElementNS(svgNS,'polyline');
    tracedLine.setAttribute('fill','none');
    tracedLine.setAttribute('stroke','var(--flash)');
    tracedLine.setAttribute('stroke-width','6');
    tracedLine.setAttribute('stroke-linecap','round');
    tracedLine.setAttribute('stroke-linejoin','round');
    svg.appendChild(tracedLine);

    function marker(p, color, size){
      const m = MR.makeEl('', {
        position:'absolute', left:p.x+'px', top:p.y+'px',
        width:size+'px', height:size+'px', borderRadius:'50%',
        background:color, transform:'translate(-50%,-50%)',
        boxShadow:'0 0 0 4px rgba(0,0,0,0.25)'
      });
      overlay.appendChild(m);
      return m;
    }
    marker(start, 'var(--go)', 28);
    marker(finish, 'var(--flash)', 26);

    hazards.forEach(h=>{
      const el = MR.makeEl('cell hazard-lava', {
        position:'absolute', left:h.x+'px', top:h.y+'px',
        width:(h.radius*2)+'px', height:(h.radius*2)+'px',
        borderRadius:'50%', transform:'translate(-50%,-50%)'
      });
      overlay.appendChild(el);
    });

    const tracedPts = [];
    let tracing = false;
    let done = false;

    function dist(ax,ay,bx,by){ return Math.hypot(ax-bx, ay-by); }
    function toLocal(e){ return { x: e.clientX - rect.left, y: e.clientY - rect.top }; }
    function updateTracedLine(){ tracedLine.setAttribute('points', tracedPts.map(p=>p.x+','+p.y).join(' ')); }

    function hitHazard(x,y){
      return hazards.some(h => dist(x,y,h.x,h.y) <= h.radius);
    }

    function markCoverage(x,y){
      for(const s of requiredSamples){
        if(!s.covered && dist(x,y,s.x,s.y) <= COVER_RADIUS){
          s.covered = true;
          coveredCount++;
        }
      }
      if(!done && coveredCount/requiredSamples.length >= COVER_THRESHOLD) finish_();
    }

    function finish_(){
      if(done) return;
      done = true;
      tracing = false;
      ctx.onWin();
    }
    function fail_(){
      if(done) return;
      done = true;
      tracing = false;
      ctx.onLose();
    }

    function onPointerDown(e){
      if(done) return;
      const { x, y } = toLocal(e);
      if(hitHazard(x,y)){ fail_(); return; }
      if(dist(x,y,start.x,start.y) <= 24){
        tracing = true;
        tracedPts.length = 0;
        tracedPts.push({x,y});
        updateTracedLine();
        markCoverage(x,y);
        try{ overlay.setPointerCapture(e.pointerId); }catch(err){}
      }
    }
    function onPointerMove(e){
      if(!tracing || done) return;
      const { x, y } = toLocal(e);
      if(hitHazard(x,y)){ fail_(); return; }
      tracedPts.push({x,y});
      updateTracedLine();
      markCoverage(x,y);
    }
    function endStroke(){
      if(!tracing || done) return;
      // Released before covering enough of the path — doesn't count.
      fail_();
    }
    overlay.addEventListener('pointerdown', onPointerDown);
    overlay.addEventListener('pointermove', onPointerMove);
    overlay.addEventListener('pointerup', endStroke);
    overlay.addEventListener('pointercancel', endStroke);
    overlay.addEventListener('pointerleave', ()=>{
      // A finger sliding just past the cabinet edge shouldn't instantly
      // fail the round the way lifting the pointer does — only pointerup/
      // cancel end the stroke; leave is ignored (capture keeps move
      // events coming even while outside the element's bounds).
    });

    ctx.onCleanup = ()=>{ done = true; tracing = false; };
  }


  MR.games.push({
    label: 'TRACE',
    desc: 'Drag your finger or mouse along the dashed path from start to finish.',
    word: 'TRACE THE PATH',
    timeLimit: s => 7000/s,
    start(ctx){
      buildDrawingGame(ctx, { promptText: 'drag start \u2192 finish' });
    }
  });


  MR.games.push({
    label: 'DODGE-TRACE',
    desc: 'Trace the path start to finish without touching the red hazard zones.',
    word: 'DODGE THE HAZARDS',
    timeLimit: s => 8000/s,
    start(ctx){
      buildDrawingGame(ctx, { promptText: 'avoid the red zones', hazards: true });
    }
  });


  // ---------- LETTER/DIGIT GLYPHS ----------
  // Single-stroke shapes only (drawable without lifting the pen) so they
  // work as-is through buildDrawingGame's existing straight-segment path
  // rendering — no curve support needed, just enough vertices per glyph
  // that the straight segments between them still read as the letter.
  // Points are normalized to a 0-1 unit square; buildDrawingGame scales
  // them into its margin box at runtime (see cfg.customPath above).
  const GLYPHS = {
    L: [{x:0,y:0},{x:0,y:1},{x:1,y:1}],
    V: [{x:0,y:0},{x:0.5,y:1},{x:1,y:0}],
    N: [{x:0,y:1},{x:0,y:0},{x:1,y:1},{x:1,y:0}],
    M: [{x:0,y:1},{x:0,y:0},{x:0.5,y:0.6},{x:1,y:0},{x:1,y:1}],
    W: [{x:0,y:0},{x:0.25,y:1},{x:0.5,y:0.4},{x:0.75,y:1},{x:1,y:0}],
    Z: [{x:0,y:0},{x:1,y:0},{x:0,y:1},{x:1,y:1}],
    C: [{x:1,y:0.15},{x:0.6,y:0},{x:0.2,y:0.15},{x:0,y:0.5},{x:0.2,y:0.85},{x:0.6,y:1},{x:1,y:0.85}],
    U: [{x:0,y:0},{x:0,y:0.7},{x:0.15,y:1},{x:0.85,y:1},{x:1,y:0.7},{x:1,y:0}],
    S: [{x:1,y:0.1},{x:0.3,y:0},{x:0,y:0.25},{x:0.3,y:0.45},{x:0.7,y:0.55},{x:1,y:0.75},{x:0.7,y:1},{x:0,y:0.9}],
    '1': [{x:0.3,y:0.2},{x:0.5,y:0},{x:0.5,y:1}],
    '7': [{x:0,y:0},{x:1,y:0},{x:0.35,y:1}],
    '2': [{x:0,y:0.2},{x:0.3,y:0},{x:0.7,y:0},{x:1,y:0.25},{x:0.1,y:1},{x:1,y:1}]
  };
  const GLYPH_KEYS = Object.keys(GLYPHS);

  MR.games.push({
    label: 'MATCH THE LETTER',
    desc: 'A letter or digit is shown as a dashed outline \u2014 trace it start to finish, same as TRACE, just shaped like the glyph instead of a random path.',
    word: 'TRACE THE GLYPH',
    timeLimit: s => 9000/s,
    start(ctx){
      const glyph = MR.pick(GLYPH_KEYS);
      buildDrawingGame(ctx, {
        customPath: GLYPHS[glyph],
        promptText: 'trace the letter \u201c' + glyph + '\u201d',
        // glyph strokes bend more sharply than the random zigzag path, so
        // a slightly larger radius keeps corner-cutting from feeling unfair
        coverRadius: 26
      });
    }
  });


  // ---------- LASSO ENGINE ----------
  // A different core interaction from the trace games above: instead of
  // following a fixed guide path, the player free-draws a closed loop
  // around a scatter of dots, trying to enclose every star (target) while
  // keeping every X (decoy) outside. Win/lose is a point-in-polygon test
  // against the released loop rather than a path-coverage percentage, so
  // this gets its own small engine rather than reusing buildDrawingGame.
  //
  // Catching a decoy ends the round immediately (like touching a hazard in
  // DODGE-TRACE). Missing a target just clears the loop and lets the
  // player try again — there's no fixed path to "get wrong", so a
  // do-over costs time but nothing else, right up until the clock runs
  // out (this is not a survival game: running out the clock without ever
  // landing a clean loop is a loss).
  function buildLassoGame(ctx, cfg){
    cfg = cfg || {};
    const rect = MR.stage.getBoundingClientRect();
    const W = rect.width, H = rect.height;

    const DOT_RADIUS = 18;
    const targetCount = cfg.targetCount || (2 + Math.floor(Math.random()*2)); // 2-3 stars
    const decoyCount = cfg.decoyCount || (1 + Math.floor(Math.random()*2)); // 1-2 X's
    const MIN_DOT_DIST = DOT_RADIUS*2 + 46; // keeps dots far enough apart to loop around cleanly
    const margin = Math.max(50, DOT_RADIUS*2.5);

    function farEnough(p, dots){
      return dots.every(d => Math.hypot(p.x-d.x, p.y-d.y) >= MIN_DOT_DIST);
    }
    function placeDot(existing){
      let p, attempts = 0;
      do{
        p = { x: MR.rand(margin, W-margin), y: MR.rand(margin, H-margin) };
        attempts++;
      } while(attempts < 200 && !farEnough(p, existing));
      return p;
    }

    // targets placed first so decoys are the ones that get pushed away
    // from them when the random-attempt budget runs tight, not the other
    // way around — keeps targets comfortably loop-able.
    const dots = [];
    for(let i=0;i<targetCount;i++){
      const p = placeDot(dots);
      dots.push({ x:p.x, y:p.y, isTarget:true });
    }
    for(let i=0;i<decoyCount;i++){
      const p = placeDot(dots);
      dots.push({ x:p.x, y:p.y, isTarget:false });
    }

    const label = MR.makeEl('prompt-word', { position:'absolute', top:'4%', left:'50%', transform:'translateX(-50%)', fontSize:'16px' });
    label.textContent = cfg.promptText || 'loop the stars \u2014 avoid the X\'s';
    MR.stage.appendChild(label);

    const overlay = MR.makeEl('', { position:'absolute', left:'0', top:'0', width:'100%', height:'100%', touchAction:'none', cursor:'crosshair' });
    MR.stage.appendChild(overlay);

    dots.forEach(d=>{
      const el = MR.makeEl('', {
        position:'absolute', left:d.x+'px', top:d.y+'px',
        width:(DOT_RADIUS*2)+'px', height:(DOT_RADIUS*2)+'px', borderRadius:'50%',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:(DOT_RADIUS*1.1)+'px', fontWeight:'900',
        background: d.isTarget ? 'var(--go)' : 'var(--danger)',
        color:'#0b0b10', transform:'translate(-50%,-50%)',
        boxShadow:'0 0 0 4px rgba(0,0,0,0.25)'
      });
      // shape carries the meaning too (star vs X), not just color, same
      // reasoning as the shooting games' crook/bystander tells
      el.textContent = d.isTarget ? '\u2605' : '\u2715';
      overlay.appendChild(el);
      d.el = el;
    });

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS,'svg');
    svg.setAttribute('width','100%'); svg.setAttribute('height','100%');
    MR.styleEl(svg, { position:'absolute', left:'0', top:'0', pointerEvents:'none' });
    overlay.appendChild(svg);

    // <polygon> (not <polyline>) so the browser always draws the closing
    // segment back to the first point live, matching how it'll actually
    // be scored on release.
    const loopShape = document.createElementNS(svgNS,'polygon');
    loopShape.setAttribute('fill','rgba(255,255,255,0.08)');
    loopShape.setAttribute('stroke','var(--flash)');
    loopShape.setAttribute('stroke-width','5');
    loopShape.setAttribute('stroke-linecap','round');
    loopShape.setAttribute('stroke-linejoin','round');
    svg.appendChild(loopShape);

    const MIN_POINTS = 8; // below this it's a tap/scribble, not a loop
    const MIN_AREA = (DOT_RADIUS*2) * (DOT_RADIUS*2) * 2; // floor so a tiny scribble can't count
    const MIN_STEP = 4; // px between recorded points - keeps the array small and the shape smooth

    let tracedPts = [];
    let tracing = false;
    let done = false;

    function toLocal(e){ return { x: e.clientX-rect.left, y: e.clientY-rect.top }; }
    function updateLoop(){ loopShape.setAttribute('points', tracedPts.map(p=>p.x+','+p.y).join(' ')); }

    function polygonArea(poly){
      let a = 0;
      for(let i=0, j=poly.length-1; i<poly.length; j=i++){
        a += (poly[j].x + poly[i].x) * (poly[j].y - poly[i].y);
      }
      return Math.abs(a/2);
    }
    // standard ray-casting test; the i/j wraparound implicitly closes the
    // polygon from the last traced point back to the first, so tracedPts
    // never needs an explicit closing point appended.
    function pointInPolygon(pt, poly){
      let inside = false;
      for(let i=0, j=poly.length-1; i<poly.length; j=i++){
        const xi=poly[i].x, yi=poly[i].y, xj=poly[j].x, yj=poly[j].y;
        const intersect = ((yi>pt.y) !== (yj>pt.y)) &&
          (pt.x < (xj-xi) * (pt.y-yi) / (yj-yi) + xi);
        if(intersect) inside = !inside;
      }
      return inside;
    }

    function resetLoop(){
      tracedPts = [];
      updateLoop();
    }

    function finish_(){
      if(done) return;
      done = true; tracing = false;
      ctx.onWin();
    }
    function fail_(){
      if(done) return;
      done = true; tracing = false;
      ctx.onLose();
    }

    function evaluateLoop(){
      if(tracedPts.length < MIN_POINTS || polygonArea(tracedPts) < MIN_AREA){
        // too small/short to count as a real loop - let them try again
        resetLoop();
        return;
      }
      const decoyCaught = dots.some(d => !d.isTarget && pointInPolygon(d, tracedPts));
      if(decoyCaught){ fail_(); return; }
      const allTargets = dots.every(d => !d.isTarget || pointInPolygon(d, tracedPts));
      if(allTargets){ finish_(); return; }
      // missed one or more targets - reset and let them try again before time runs out
      resetLoop();
    }

    overlay.addEventListener('pointerdown', (e)=>{
      if(done) return;
      const p = toLocal(e);
      tracing = true;
      tracedPts = [p];
      updateLoop();
      try{ overlay.setPointerCapture(e.pointerId); }catch(err){}
    });
    overlay.addEventListener('pointermove', (e)=>{
      if(!tracing || done) return;
      const p = toLocal(e);
      const last = tracedPts[tracedPts.length-1];
      if(Math.hypot(p.x-last.x, p.y-last.y) >= MIN_STEP){
        tracedPts.push(p);
        updateLoop();
      }
    });
    function endStroke(){
      if(!tracing || done) return;
      tracing = false;
      evaluateLoop();
    }
    overlay.addEventListener('pointerup', endStroke);
    overlay.addEventListener('pointercancel', endStroke);
    overlay.addEventListener('pointerleave', ()=>{
      // same reasoning as the trace games above: capture keeps move events
      // flowing even past the element's edge, so only an actual
      // release/cancel should end the stroke
    });

    ctx.onCleanup = ()=>{ done = true; tracing = false; };
  }

  MR.games.push({
    label: 'LASSO',
    desc: 'Drag a closed loop around every star while keeping every red X outside it, then let go to close the loop. Catching an X ends the round immediately \u2014 missing a star just clears the loop so you can try again before time runs out.',
    word: 'LASSO THE TARGETS',
    timeLimit: s => 7000/s,
    start(ctx){
      buildLassoGame(ctx);
    }
  });


  MR.games.push({
    label: 'LONE STAR',
    // Same buildLassoGame engine as LASSO, just a different targetCount/
    // decoyCount split: one star buried among three X's instead of a
    // small cluster of stars among a couple of decoys. Plays less like
    // "circle the group" and more like "thread the one target out of a
    // crowd" \u2014 a tighter, more deliberate loop is needed since a wide
    // sloppy one is far more likely to clip a decoy with three of them on
    // the stage. Slightly longer timeLimit than LASSO since a bad first
    // attempt is more likely with more decoys to dodge.
    desc: 'Only one star this time, hiding among three red X\'s. Loop it out cleanly without catching any of the X\'s \u2014 missing the star just clears the loop so you can retry before time runs out.',
    word: 'FIND THE ONE',
    timeLimit: s => 7000/s,
    start(ctx){
      buildLassoGame(ctx, { targetCount: 1, decoyCount: 3 });
    }
  });


  // ---------- CUT ENGINE ----------
  // A third distinct drawing mechanic: static rectangles sit on the stage
  // — some marked as cut targets, some as bombs — and the player swipes a
  // straight-ish stroke to slice through every target without the stroke
  // ever touching a bomb. Unlike buildDrawingGame's coverage sampling or
  // buildLassoGame's point-in-polygon test, "cutting" a rectangle is a
  // line-segment/rectangle intersection problem: a target only counts as
  // cut once the stroke has crossed two of its four edges (entered
  // through one side and exited through another), so a graze that dips in
  // and stops doesn't count, but a genuine swipe straight through does.
  // Touching a bomb rectangle at all — including starting a stroke on top
  // of one — ends the round immediately, same hard-fail shape as LASSO's
  // decoys. Missing a target just leaves it alone for another swipe;
  // this is not a survival game, so running out the clock with targets
  // still uncut is a loss, matching LASSO's timeout behavior.
  //
  // cfg:
  //   targetCount - number of cut targets (default 2-3)
  //   bombCount   - number of bomb rectangles (default 1-2)
  // ---------- SHARED CUT-GEOMETRY HELPERS ----------
  // Used by buildCutGame below for both its static (STATIC CUT) and
  // falling (FALLING CUTS) modes — moving vs. static only changes how
  // often a rectangle's x/y get updated before these run, not the test
  // itself.
  function pointInRect(p, r){ return p.x>=r.x && p.x<=r.x+r.w && p.y>=r.y && p.y<=r.y+r.h; }
  // standard proper-intersection test between segments AB and CD
  function ccw(A,B,C){ return (C.y-A.y)*(B.x-A.x) > (B.y-A.y)*(C.x-A.x); }
  function segsIntersect(A,B,C,D){ return (ccw(A,C,D)!==ccw(B,C,D)) && (ccw(A,B,C)!==ccw(A,B,D)); }
  function rectEdges(r){
    const tl={x:r.x,y:r.y}, tr={x:r.x+r.w,y:r.y}, br={x:r.x+r.w,y:r.y+r.h}, bl={x:r.x,y:r.y+r.h};
    return [[tl,tr],[tr,br],[br,bl],[bl,tl]];
  }
  // any contact at all — crossing an edge, or an endpoint already inside
  // — counts as "touched", used for bombs where a graze is as fatal as
  // a clean pass-through
  function segmentTouchesRect(p1,p2,r){
    if(pointInRect(p1,r) || pointInRect(p2,r)) return true;
    return rectEdges(r).some(([a,b]) => segsIntersect(p1,p2,a,b));
  }
  // edge-crossing count only (not "starts inside") — a target needs two
  // distinct edge crossings across the stroke (enter one side, exit
  // another) to count as genuinely cut, not just dipped into
  function segmentCrossings(p1,p2,r){
    let n = 0;
    rectEdges(r).forEach(([a,b]) => { if(segsIntersect(p1,p2,a,b)) n++; });
    return n;
  }

  // buildCutGame powers both STATIC CUT and FALLING CUTS. cfg.falling
  // switches between the two shapes of the game:
  //   falling: false (default, STATIC CUT) - a fixed set of rectangles is
  //     placed up front and sits still; win once every target has been
  //     cut, a timeout with targets remaining is a loss (ctx.survivalGame
  //     stays false so games-core's own timeout handling treats it that
  //     way).
  //   falling: true (FALLING CUTS) - rectangles spawn continuously from
  //     the top and drift down on their own timers, closer in shape to
  //     RUSH ALLEY's endless spawn-and-remove loop; a target reaching the
  //     bottom uncut ends the round, a bomb reaching the bottom is
  //     harmless clutter that just despawns, and ctx.survivalGame is set
  //     so lasting to the buzzer is itself a win. Cutting winCutCount
  //     targets cleanly (default 3) wins the round immediately instead
  //     of requiring the player to wait out the clock.
  // Both modes share the same cut rule (a target needs two distinct edge
  // crossings from the stroke to count as cut; touching a bomb anywhere
  // fails instantly) via the geometry helpers above, and the same
  // pointer-tracing/rendering plumbing below; only shape placement/timing
  // and the win/loss wiring differ.
  function buildCutGame(ctx, cfg){
    cfg = cfg || {};
    const falling = !!cfg.falling;
    if(falling) ctx.survivalGame = true;

    const rect = MR.stage.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    const margin = falling ? 20 : 40;
    const GAP = 24;

    const label = MR.makeEl('prompt-word', { position:'absolute', top:'4%', left:'50%', transform:'translateX(-50%)', fontSize:'16px' });
    label.textContent = cfg.promptText || (falling
      ? 'cut every \u2702 before it lands \u2014 never touch \uD83D\uDCA3'
      : 'cut every \u2702 \u2014 avoid every \uD83D\uDCA3');
    MR.stage.appendChild(label);

    const overlay = MR.makeEl('', { position:'absolute', left:'0', top:'0', width:'100%', height:'100%', touchAction:'none', cursor:'crosshair' });
    MR.stage.appendChild(overlay);

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS,'svg');
    svg.setAttribute('width','100%'); svg.setAttribute('height','100%');
    MR.styleEl(svg, { position:'absolute', left:'0', top:'0', pointerEvents:'none' });
    overlay.appendChild(svg);

    const cutLine = document.createElementNS(svgNS,'polyline');
    cutLine.setAttribute('fill','none');
    cutLine.setAttribute('stroke','var(--flash)');
    cutLine.setAttribute('stroke-width','5');
    cutLine.setAttribute('stroke-linecap','round');
    cutLine.setAttribute('stroke-linejoin','round');
    svg.appendChild(cutLine);

    // shapes is the live set of rectangles under test: a fixed list built
    // once for STATIC CUT, or a set that grows on spawn and shrinks on
    // cut/despawn for FALLING CUTS. Either way processSegment/pointerdown
    // just iterate over whatever's currently in it.
    let shapes = [];
    let targetsRemaining = 0;
    let targetsCut = 0;
    // set inside the falling branch below; declared here (rather than
    // with const inside that block) so markCut — which lives in this
    // outer scope, above the branch — can actually see it. A const
    // scoped to the if(falling){...} block would be invisible from here
    // and throw a ReferenceError the first time a target got cut.
    let winCutCount = 3;
    let done = false;
    let tracing = false;
    let tracedPts = [];

    function randSize(){
      return falling ? { w: MR.rand(70,120), h: MR.rand(50,80) } : { w: MR.rand(70,130), h: MR.rand(50,90) };
    }

    function makeShapeEl(r){
      const el = MR.makeEl('', {
        position:'absolute', left:r.x+'px', top:r.y+'px', width:r.w+'px', height:r.h+'px',
        border: '3px solid ' + (r.isTarget ? 'var(--go)' : 'var(--danger)'),
        background: r.isTarget ? 'rgba(62,245,192,0.12)' : 'rgba(255,60,60,0.15)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize: (falling ? '20px' : '22px'), transition:'transform 220ms ease, opacity 220ms ease, border-color 220ms ease'
      });
      // shape carries meaning via icon too, not just border color, same
      // reasoning as LASSO's star/X dots
      el.textContent = r.isTarget ? '\u2702' : '\uD83D\uDCA3';
      overlay.appendChild(el);
      return el;
    }

    function removeShape(r){
      const i = shapes.indexOf(r);
      if(i > -1) shapes.splice(i,1);
    }

    // shared non-intersection test (with a GAP buffer) used both to place
    // STATIC CUT's fixed layout and to pick a spawn x for FALLING CUTS —
    // see the falling branch below for why checking this once at spawn
    // time is enough to guarantee two falling rectangles never overlap
    // for their entire time on screen.
    function overlaps(a,b){
      return !(a.x+a.w+GAP < b.x || b.x+b.w+GAP < a.x || a.y+a.h+GAP < b.y || b.y+b.h+GAP < a.y);
    }

    function toLocal(e){ return { x: e.clientX-rect.left, y: e.clientY-rect.top }; }
    function updateLine(){ cutLine.setAttribute('points', tracedPts.map(p=>p.x+','+p.y).join(' ')); }

    // Once a swipe ended, the traced line just sat there forever (only
    // ever replaced when the next swipe began). Clear it a beat after
    // release so old cut-lines don't linger and clutter the stage —
    // cancel the pending clear if the player starts tracing again first.
    let clearLineTimer = null;
    function scheduleLineClear(){
      clearTimeout(clearLineTimer);
      clearLineTimer = setTimeout(()=>{
        if(!tracing){ tracedPts = []; updateLine(); }
      }, 400);
    }

    function finish_(){
      if(done) return;
      done = true; tracing = false;
      ctx.onWin();
    }
    function fail_(){
      if(done) return;
      done = true; tracing = false;
      ctx.onLose();
    }

    function markCut(r){
      r.cut = true;
      MR.styleEl(r.el, { transform:'scale(' + (falling ? 0.8 : 0.82) + ')', opacity:(falling ? '0.25' : '0.3'), borderColor:'var(--flash)' });
      if(falling){
        removeShape(r);
        setTimeout(()=>{ if(r.el) r.el.remove(); }, 220);
        // Unlike plain survival, racking up winCutCount clean cuts ends
        // the round in a win right away — no need to wait out the timer
        // once the player's proven they can hit the target quota.
        targetsCut++;
        if(targetsCut >= winCutCount) finish_();
      } else {
        targetsRemaining--;
        if(targetsRemaining <= 0) finish_();
      }
    }

    function processSegment(p1, p2){
      for(const r of shapes){
        if(!r.isTarget && segmentTouchesRect(p1,p2,r)){ fail_(); return; }
      }
      for(const r of shapes){
        if(r.isTarget && !r.cut){
          const n = segmentCrossings(p1,p2,r);
          if(n > 0){
            r.crossCount += n;
            if(r.crossCount >= 2) markCut(r);
          }
        }
      }
    }

    overlay.addEventListener('pointerdown', (e)=>{
      if(done) return;
      const p = toLocal(e);
      if(shapes.some(r => !r.isTarget && pointInRect(p,r))){ fail_(); return; }
      tracing = true;
      clearTimeout(clearLineTimer);
      tracedPts = [p];
      updateLine();
      // fresh swipe — uncut targets get a clean crossing count so a
      // previous failed swipe's partial crossing can't carry over
      shapes.forEach(r => { if(r.isTarget && !r.cut) r.crossCount = 0; });
      try{ overlay.setPointerCapture(e.pointerId); }catch(err){}
    });
    overlay.addEventListener('pointermove', (e)=>{
      if(!tracing || done) return;
      const p = toLocal(e);
      const last = tracedPts[tracedPts.length-1];
      tracedPts.push(p);
      updateLine();
      processSegment(last, p);
    });
    function endStroke(){
      // releasing mid-swipe isn't a failure here — unlike the trace games,
      // there's no path-coverage percentage to fall short of, just
      // targets still waiting to be cut on a later swipe
      tracing = false;
      scheduleLineClear();
    }
    overlay.addEventListener('pointerup', endStroke);
    overlay.addEventListener('pointercancel', endStroke);
    overlay.addEventListener('pointerleave', ()=>{
      // same reasoning as the other drawing games: capture keeps move
      // events flowing past the element's edge, so only an actual
      // release/cancel should end the stroke
    });

    if(falling){
      const targetChance = cfg.targetChance || 0.65;
      // Cutting this many targets cleanly ends the round in an instant
      // win, same "prove it and move on" shape as the fixed-count games
      // rather than making the player wait out the whole clock.
      winCutCount = cfg.winCutCount || 3;
      // 0.2px/ms (up from the original 0.055, and a further bump from an
      // earlier 0.16) so a rectangle crosses the stage in just a couple
      // seconds — with the round timer around 9s and an instant win now
      // available at winCutCount, the fall needs to be brisk enough that
      // three clean cuts is a real race, not a formality.
      const fallSpeed = (cfg.fallSpeed || 0.2) * ctx.speedMul; // px/ms
      const spawnEvery = Math.max(600, (cfg.spawnEvery || 950) / ctx.speedMul);
      let spawnTimer = null;
      let rafId = null;

      function spawnOne(){
        if(done) return;
        const size = randSize();
        const isTarget = Math.random() < targetChance;
        // Two rectangles fall at the same fallSpeed, so once spawned their
        // vertical separation never changes — checking for overlap once
        // here, against every rectangle currently on screen, is therefore
        // enough to guarantee this new one never intersects an existing
        // one at any later point in its fall, not just at spawn time.
        let x, attempts = 0, candidate;
        do{
          x = MR.rand(margin, Math.max(margin, W-margin-size.w));
          candidate = { x, y: -size.h, w: size.w, h: size.h };
          attempts++;
        } while(attempts < 40 && shapes.some(s => overlaps(candidate, s)));
        const r = { x, y: -size.h, w: size.w, h: size.h, isTarget, cut: false, crossCount: 0 };
        r.el = makeShapeEl(r);
        shapes.push(r);
      }

      function trySpawn(){
        if(done) return;
        spawnOne();
        spawnTimer = setTimeout(trySpawn, spawnEvery);
      }

      let lastT = performance.now();
      function loop(t){
        if(done) return;
        const dt = t - lastT; lastT = t;
        for(let i = shapes.length-1; i >= 0; i--){
          const r = shapes[i];
          r.y += fallSpeed * dt;
          r.el.style.top = r.y + 'px';
          if(r.y > H){
            // reached the bottom edge unresolved
            removeShape(r);
            r.el.remove();
            if(r.isTarget){ fail_(); return; }
          }
        }
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);

      trySpawn();

      ctx.onCleanup = ()=>{
        done = true;
        tracing = false;
        clearTimeout(clearLineTimer);
        clearTimeout(spawnTimer);
        if(rafId) cancelAnimationFrame(rafId);
        shapes.forEach(r => { if(r.el) r.el.remove(); });
        shapes = [];
      };
    } else {
      const targetCount = cfg.targetCount || (2 + Math.floor(Math.random()*2)); // 2-3
      const bombCount = cfg.bombCount || (1 + Math.floor(Math.random()*2)); // 1-2

      function placeRect(existing){
        const size = randSize();
        let r, attempts = 0;
        do{
          r = { x: MR.rand(margin, Math.max(margin, W-margin-size.w)), y: MR.rand(margin, Math.max(margin, H-margin-size.h)), w: size.w, h: size.h };
          attempts++;
        } while(attempts < 200 && existing.some(e => overlaps(r,e)));
        return r;
      }

      // targets placed first, same reasoning as LASSO's dot placement — any
      // spacing compromise from a tight attempt budget falls on the bombs,
      // not the shapes the player actually needs room to swipe through.
      for(let i=0;i<targetCount;i++){
        const r = placeRect(shapes);
        r.isTarget = true; r.cut = false; r.crossCount = 0;
        shapes.push(r);
      }
      for(let i=0;i<bombCount;i++){
        const r = placeRect(shapes);
        r.isTarget = false;
        shapes.push(r);
      }
      targetsRemaining = targetCount;
      shapes.forEach(r => { r.el = makeShapeEl(r); });

      ctx.onCleanup = ()=>{ done = true; tracing = false; clearTimeout(clearLineTimer); };
    }
  }

  MR.games.push({
    label: 'STATIC CUT',
    desc: 'A handful of rectangles sit still on the stage, some marked with scissors (cut them) and some marked as bombs (avoid them entirely). Swipe a straight stroke all the way through a scissors rectangle \u2014 in one side, out the other \u2014 to cut it; grazing it or stopping partway doesn\u2019t count, but you can always swipe again. Touching a bomb rectangle with your stroke at any point ends the round immediately. Cut every target before time runs out to win.',
    word: 'MAKE THE CUT',
    timeLimit: s => 7000/s,
    start(ctx){
      buildCutGame(ctx);
    }
  });


  MR.games.push({
    label: 'FALLING CUTS',
    desc: 'Scissors-marked and bomb-marked rectangles drift down from the top of the stage. Slice clean through a scissors rectangle \u2014 in one side and out another \u2014 before it reaches the bottom edge; letting one land uncut ends the round. Touching a bomb rectangle with your stroke at any point also ends it instantly, though a bomb reaching the bottom on its own is harmless. Cut 3 scissors rectangles cleanly and you win on the spot \u2014 otherwise, survive until the buzzer to win.',
    word: 'INCOMING CUTS',
    timeLimit: s => 9000,
    start(ctx){
      buildCutGame(ctx, { falling: true });
    }
  });

  for(let i=CATEGORY_START;i<MR.games.length;i++) MR.games[i].category = 'drawing';

})();
