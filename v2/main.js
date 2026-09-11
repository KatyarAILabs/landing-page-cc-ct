(function(){
'use strict';
var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
var raf = requestAnimationFrame;

/* ---------- shared: in-view observer ---------- */
function io(sel, cb, opts){
  var els = typeof sel === 'string' ? document.querySelectorAll(sel) : sel;
  if(!('IntersectionObserver' in window)){ Array.prototype.forEach.call(els,function(e){cb(e,true)}); return; }
  var o = new IntersectionObserver(function(entries){
    entries.forEach(function(en){ cb(en.target, en.isIntersecting); });
  }, opts || {rootMargin:'-5% 0px -8% 0px'});
  Array.prototype.forEach.call(els, function(e){ o.observe(e); });
}
function fmt(n){ return Math.round(n).toLocaleString('en-US'); }

/* ---------- reveals ---------- */
io('.rv, .mask', function(el, vis){ if(vis) el.classList.add('in'); });
setTimeout(function(){ document.querySelectorAll('.hero .mask, .hero .rv').forEach(function(e){e.classList.add('in')}); }, 120);

/* ---------- scroll progress ---------- */
var prog = document.getElementById('prog');
addEventListener('scroll', function(){
  var h = document.documentElement.scrollHeight - innerHeight;
  prog.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + '%';
}, {passive:true});

/* =========================================================
   1. HERO — the refinery: traces → verifier gates → golden set
   ========================================================= */
(function(){
  var cv = document.getElementById('field'); if(!cv) return;
  var ctx = cv.getContext('2d');
  var aside = document.querySelector('.hero .pt');
  var W=0, H=0, dpr=1, x0=0, x1=0, gates=[], stack={}, pulses=[], flashes=[];
  var mouse={x:-9999,y:-9999}, live=true, t=0;
  var nIn=0, nGold=0, nRej=0, setV=14;
  var elIn=document.getElementById('hIn'), elGold=document.getElementById('hGold'),
      elRej=document.getElementById('hRej'), elSet=document.getElementById('hSet');
  var GATE_NAMES = ['V1 · SCHEMA','V2 · OUTCOME','V3 · DOMAIN'];

  function build(){
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    if(!W || !H) return;
    cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    x1 = W - 24;
    if(aside && aside.offsetParent !== null && innerWidth > 680){
      var cr = cv.getBoundingClientRect(), ar = aside.getBoundingClientRect();
      x1 = Math.max(W*0.5, ar.left - cr.left - 24);
    }
    x0 = 0;
    var span = x1 - x0;
    gates = [0.3, 0.52, 0.74].map(function(f){ return x0 + span*f; });
    var sx = x0 + span*0.84, sw = x1 - sx;
    var cell = 9, cols = Math.max(3, Math.min(10, Math.floor(sw / cell))), rows = Math.max(6, Math.floor(H*0.3 / cell));
    // on phones the copy covers the canvas, so golden pulses dock off-screen
    if(innerWidth <= 680) sx = W + 40;
    stack = {x:sx, y:H*0.7, cell:cell, cols:cols, rows:rows, filled:0, flash:0};
    pulses = [];
    var n = Math.max(12, Math.min(34, Math.round(W/46)));
    for(var i=0;i<n;i++) pulses.push(mk(true));
  }
  function mk(scatter){
    var r = Math.random();
    var x = scatter ? Math.random()*gates[2] : -8 - Math.random()*60;
    var gate = gates.filter(function(g){ return g <= x; }).length;
    var failAt = r < 0.14 ? 0 : r < 0.24 ? 1 : r < 0.32 ? 2 : -1;
    return {
      x: x, y0: H*0.1 + Math.random()*H*0.8, ph: Math.random()*6.28,
      sp: 0.7 + Math.random()*0.7,
      failAt: failAt < gate ? -1 : failAt,
      st: 'run', vy: 0, a: 1, gate: gate, trail: [], tx:0, ty:0
    };
  }
  function hud(){
    if(elIn) elIn.textContent = fmt(1284000 + nIn);
    if(elGold) elGold.textContent = fmt(212480 + nGold);
    if(elRej) elRej.textContent = fmt(18204 + nRej);
    if(elSet) elSet.textContent = 'v' + setV;
  }
  function slot(k){
    var c = k % stack.cols, r = Math.floor(k / stack.cols);
    return {x: stack.x + c*stack.cell + stack.cell/2, y: stack.y - r*stack.cell - stack.cell/2};
  }
  function update(p){
    if(p.st === 'run' || p.st === 'gold'){
      p.x += p.sp;
      var y = p.y0 + Math.sin(p.ph + p.x*0.012)*10;
      while(p.gate < 3 && p.x >= gates[p.gate]){
        if(p.failAt === p.gate){
          p.st = 'fail'; nRej++; nIn++;
          flashes.push({x:gates[p.gate], y:y, r:0, c:'211,58,38'});
          break;
        }
        p.gate++;
        if(p.gate === 3){ p.st = 'gold'; flashes.push({x:gates[2], y:y, r:0, c:'213,162,79'}); }
      }
      p.y = y;
      if(p.st === 'gold' && p.x >= stack.x - 30){
        var s = slot(stack.filled++);
        p.st = 'dock'; p.tx = s.x; p.ty = s.y;
      }
    } else if(p.st === 'fail'){
      p.vy += 0.09; p.y += p.vy; p.x += p.sp*0.3; p.a -= 0.018;
      if(p.a <= 0 || p.y > H + 10) reset(p);
    } else if(p.st === 'dock'){
      p.x += (p.tx - p.x)*0.14; p.y += (p.ty - p.y)*0.14;
      if(Math.abs(p.tx-p.x) < 0.8 && Math.abs(p.ty-p.y) < 0.8){
        nGold++; nIn++;
        reset(p);
        if(stack.filled >= stack.cols*stack.rows){ stack.filled = 0; stack.flash = 1; setV++; }
      }
    }
    p.trail.push([p.x, p.y]); if(p.trail.length > 14) p.trail.shift();
  }
  function reset(p){ var n = mk(false); for(var k in n) p[k] = n[k]; hud(); }

  function draw(){
    ctx.clearRect(0,0,W,H);
    // dot field
    var gap = 28;
    for(var gx=gap/2; gx<x1; gx+=gap){
      for(var gy=gap/2; gy<H; gy+=gap){
        var d = Math.hypot(gx-mouse.x, gy-mouse.y), g = Math.max(0, 1 - d/170);
        ctx.fillStyle = 'rgba(12,12,13,' + (0.09 + g*0.4).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(gx, gy, 0.9 + g*1.5, 0, 6.2832); ctx.fill();
      }
    }
    // gates
    ctx.font = '500 9px "IBM Plex Mono", monospace';
    gates.forEach(function(x, i){
      ctx.setLineDash([6,7]); ctx.lineDashOffset = -(t/2.2)%13;
      ctx.strokeStyle = 'rgba(12,12,13,.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, H*0.08); ctx.lineTo(x, H*0.92); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(12,12,13,.38)';
      ctx.fillText(GATE_NAMES[i], x + 6, H*0.08 + 10);
    });
    // golden stack
    var cap = stack.cols*stack.rows;
    ctx.strokeStyle = 'rgba(168,116,28,.35)';
    ctx.strokeRect(stack.x - 3, stack.y - stack.rows*stack.cell - 3, stack.cols*stack.cell + 6, stack.rows*stack.cell + 6);
    for(var k=0;k<stack.filled && k<cap;k++){
      var s = slot(k);
      ctx.fillStyle = 'rgba(213,162,79,.85)';
      ctx.fillRect(s.x-3.2, s.y-3.2, 6.4, 6.4);
    }
    if(stack.flash > 0){
      ctx.fillStyle = 'rgba(213,162,79,' + (stack.flash*0.35).toFixed(3) + ')';
      ctx.fillRect(stack.x - 3, stack.y - stack.rows*stack.cell - 3, stack.cols*stack.cell + 6, stack.rows*stack.cell + 6);
      stack.flash = Math.max(0, stack.flash - 0.02);
    }
    ctx.fillStyle = 'rgba(168,116,28,.8)';
    ctx.fillText('GOLDEN SET V' + setV, stack.x - 3, stack.y + 16);
    // pulses
    for(var i=0;i<pulses.length;i++){
      var p = pulses[i];
      if(!RM) update(p);
      var col = p.st === 'fail' ? '211,58,38' : (p.st === 'gold' || p.st === 'dock') ? '190,138,50' : '12,12,13';
      for(var q=1;q<p.trail.length;q++){
        var al = (q/p.trail.length) * 0.34 * p.a;
        ctx.strokeStyle = 'rgba(' + col + ',' + al.toFixed(3) + ')';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(p.trail[q-1][0], p.trail[q-1][1]); ctx.lineTo(p.trail[q][0], p.trail[q][1]); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(' + col + ',' + Math.max(0,p.a).toFixed(3) + ')';
      if(p.st === 'gold' || p.st === 'dock'){ ctx.fillRect(p.x-2.6, p.y-2.6, 5.2, 5.2); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, 6.2832); ctx.fill(); }
    }
    // flashes
    for(i=flashes.length-1;i>=0;i--){
      var f = flashes[i];
      f.r += 1.4;
      var a3 = Math.max(0, 1 - f.r/40);
      ctx.strokeStyle = 'rgba(' + f.c + ',' + (a3*0.8).toFixed(3) + ')';
      ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.2832); ctx.stroke();
      if(a3 <= 0) flashes.splice(i,1);
    }
    ctx.lineWidth = 1;
  }
  function loop(){ if(!live) return; t++; draw(); raf(loop); }

  build(); hud();
  addEventListener('resize', function(){ build(); if(RM) draw(); });
  cv.parentElement.addEventListener('pointermove', function(e){
    var r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  cv.parentElement.addEventListener('pointerleave', function(){ mouse.x = -9999; mouse.y = -9999; });

  if(RM){
    for(var s=0;s<400;s++) pulses.forEach(update);
    draw();
  } else {
    io([cv], function(el, vis){ live = vis; if(vis) loop(); }, {rootMargin:'0px'});
    document.addEventListener('visibilitychange', function(){ live = !document.hidden; if(live) loop(); });
  }
})();

/* =========================================================
   2. HERO — parity tracker
   ========================================================= */
(function(){
  var box = document.getElementById('ptRows'); if(!box) return;
  var owned = document.getElementById('ptOwned');
  var START = [
    {n:'order-lookup', tr:'41k', v:96.2},
    {n:'refund-triage', tr:'28k', v:95.4},
    {n:'sql-reports', tr:'9k', v:88.1},
    {n:'contract-review', tr:'3k', v:71.6},
    {n:'escalations', tr:'6k', v:null}
  ];
  var tasks;
  function reset(){ tasks = START.map(function(o){ return {n:o.n, tr:o.tr, v:o.v}; }); }
  function state(v){ return v === null ? ['frontier',''] : v >= 95 ? ['owned','go'] : v >= 85 ? ['shadow','sh'] : ['training','']; }
  function render(){
    box.innerHTML = tasks.map(function(k){
      var s = state(k.v);
      return '<div class="pt-row"><div class="pt-top"><span class="n">'+k.n+'</span><span class="s '+s[1]+'">'+s[0]+'</span></div>'
        + '<div class="pt-bar"><i class="'+(s[1]==='go'?'go':'')+'" style="width:'+(k.v===null?0:k.v)+'%"></i><b style="left:95%"></b></div>'
        + '<div class="pt-sub"><span>'+k.tr+' traces / wk</span><span>'+(k.v===null?'not verifiable':k.v.toFixed(1)+'% of frontier')+'</span></div></div>';
    }).join('');
    if(owned) owned.textContent = tasks.filter(function(k){ return k.v !== null && k.v >= 95; }).length;
  }
  reset(); render();
  if(RM) return;
  var hold = 0;
  setInterval(function(){
    if(document.hidden) return;
    var climbing = tasks.filter(function(k){ return k.v !== null && k.v < 95; });
    if(!climbing.length){ if(++hold > 3){ hold = 0; reset(); } render(); return; }
    climbing.forEach(function(k){ k.v = Math.min(99, k.v + 0.3 + Math.random()*0.9); });
    tasks.forEach(function(k){ if(k.v !== null && k.v >= 95 && k.v < 99.4) k.v = Math.min(99.4, k.v + Math.random()*0.15); });
    render();
  }, 1400);
})();

/* =========================================================
   2b. THESIS — what you pay for vs what you keep, fed by a live call stream
   ========================================================= */
(function(){
  var books = document.getElementById('books'); if(!books) return;
  var feed = document.getElementById('cvFeed');
  var calls = document.getElementById('bkCalls'), spend = document.getElementById('bkSpend'), ex = document.getElementById('bkEx');
  var BASE = {calls: 1284000, spend: 154080, ex: 212480};
  var k = 0, add = {calls: 0, spend: 0, ex: 0}, id = 88214;
  // fixed rhythm instead of a coin flip, so the feed never shows a long run with nothing kept
  var KEPT = [0, 1, 0, 0, 1, 0, 1, 0, 0, 1], turn = 0;
  var TASKS = ['refund-triage', 'order-lookup', 'sql-report', 'ticket-reply', 'contract-review'];
  var WHY = ['failed a check', 'duplicate', 'no outcome yet', 'number didn’t match'];
  function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
  function paint(){
    calls.textContent = fmt(BASE.calls*k + add.calls);
    spend.textContent = '$' + fmt(BASE.spend*k + add.spend);
    ex.textContent = fmt(BASE.ex*k + add.ex);
  }
  // one call enters the feed; after a beat it's kept (+1 verified example) or not kept, with the reason.
  // count=false seeds already-resolved rows without touching the totals.
  function call(count){
    var cost = 0.04 + Math.random()*0.27, kept = KEPT[turn++ % KEPT.length] === 1;
    var r = document.createElement('div');
    r.className = 'cv-row';
    r.innerHTML = '<span class="m">#' + fmt(id++) + ' · ' + pick(TASKS) + '<em>$' + cost.toFixed(2) + ' paid</em></span><span class="f">checking</span>';
    feed.appendChild(r);
    while(feed.children.length > 5) feed.removeChild(feed.firstChild);
    if(count){ add.calls++; add.spend += cost; paint(); }
    function resolve(){
      r.classList.add(kept ? 'kept' : 'gone');
      r.querySelector('.f').textContent = kept ? 'kept' : 'not kept';
      r.querySelector('em').textContent = '$' + cost.toFixed(2) + ' paid · ' + (kept ? '+1 verified example' : pick(WHY));
      if(kept && count){ add.ex++; paint(); }
    }
    if(count) setTimeout(resolve, 700); else resolve();
  }
  for(var i = 0; i < 5; i++) call(false);
  if(RM){ k = 1; paint(); return; }
  paint();
  var timer = null, started = false;
  io([books], function(el, vis){
    if(vis && !started){
      started = true;
      var t0 = performance.now();
      (function step(now){
        k = 1 - Math.pow(1 - Math.min(1, (now - t0)/1600), 3);
        paint();
        if(k < 1) raf(step);
      })(t0);
    }
    clearInterval(timer);
    timer = vis ? setInterval(function(){ if(!document.hidden) call(true); }, 1100) : null;
  });
})();

/* =========================================================
   3. PARITY CURVE — scroll scrubbed
   ========================================================= */
(function(){
  var svg = document.getElementById('dvsvg'); if(!svg) return;
  var lA = document.getElementById('lA'), lB = document.getElementById('lB'),
      dA = document.getElementById('dA'), dB = document.getElementById('dB'),
      cwr = document.getElementById('cwr'), gapLab = document.getElementById('gapLab'),
      nB = document.getElementById('nB');
  var LA = lA.getTotalLength(), LB = lB.getTotalLength();
  lA.style.strokeDasharray = LA; lB.style.strokeDasharray = LB;
  function set(p){
    p = Math.max(0, Math.min(1, p));
    lA.style.strokeDashoffset = LA*(1-p);
    lB.style.strokeDashoffset = LB*(1-p);
    var a = lA.getPointAtLength(LA*p), b = lB.getPointAtLength(LB*p);
    dA.setAttribute('cx', a.x); dA.setAttribute('cy', a.y);
    dB.setAttribute('cx', b.x); dB.setAttribute('cy', b.y);
    cwr.setAttribute('width', 60 + 900*p);
    var ga = p < 0.2 ? 0 : p < 0.3 ? (p-0.2)*10 : p < 0.7 ? 1 : Math.max(0, 1-(p-0.7)*6);
    gapLab.setAttribute('opacity', ga.toFixed(2));
    nB.textContent = (0.41 + 0.52*p).toFixed(2);
  }
  if(RM){ set(1); return; }
  function onScroll(){
    var r = svg.getBoundingClientRect();
    set((innerHeight*0.86 - r.top) / (r.height*0.55 + innerHeight*0.55));
  }
  set(0);
  addEventListener('scroll', onScroll, {passive:true});
  addEventListener('resize', onScroll);
  onScroll();
})();

/* =========================================================
   4. STAGE 01 — capture
   ========================================================= */
(function(){
  var fig = document.getElementById('capFig'); if(!fig) return;
  var lines = fig.querySelectorAll('.code .ln'), srcs = fig.querySelectorAll('.srcline div');
  var st = document.getElementById('capSt'), timers = [];
  var DONE = 'captured · queued';
  function clear(){ timers.forEach(clearTimeout); timers = []; }
  function run(){
    clear();
    srcs.forEach(function(s){ s.classList.remove('on'); });
    lines.forEach(function(l){ l.classList.remove('on'); });
    st.textContent = 'listening';
    srcs.forEach(function(s,i){ timers.push(setTimeout(function(){ s.classList.add('on'); }, 260 + i*300)); });
    lines.forEach(function(l,i){
      timers.push(setTimeout(function(){ l.classList.add('on'); st.textContent = 'recording ' + (i+1) + '/' + lines.length; }, 1200 + i*260));
    });
    var end = 1200 + lines.length*260;
    timers.push(setTimeout(function(){ st.textContent = DONE; }, end + 300));
    timers.push(setTimeout(run, end + 4200));
  }
  if(RM){ srcs.forEach(function(s){s.classList.add('on')}); lines.forEach(function(l){l.classList.add('on')}); st.textContent = DONE; return; }
  io([fig], function(el, vis){ if(vis) run(); else clear(); });
})();

/* =========================================================
   5. STAGE 02 — verification matrix
   ========================================================= */
(function(){
  var g = document.getElementById('mxg'); if(!g) return;
  var vers = ['Schema','Tools','Outcome','Policy','PII','Domain'];
  var traces = ['refund · a91f','sql · b204','refund · b311','lookup · c07e','contract · c19a','refund · d552','sql · d6f0','lookup · e113'];
  var fails = {1:2, 4:5, 6:1};
  var st = document.getElementById('mxSt'), nEl = document.getElementById('mxN');
  var html = '<span></span>';
  vers.forEach(function(v){ html += '<span class="ch">'+v+'</span>'; });
  html += '<span class="ch" style="text-align:right">verdict</span>';
  traces.forEach(function(tr, ri){
    html += '<span class="rh">'+tr+'</span>';
    vers.forEach(function(){ html += '<i class="cell"></i>'; });
    html += '<span class="vd">—</span>';
  });
  g.innerHTML = html;
  var rhs = g.querySelectorAll('.rh'), vds = g.querySelectorAll('.vd'), cells = g.querySelectorAll('.cell');
  function rowCells(ri){ return Array.prototype.slice.call(cells, ri*6, ri*6+6); }

  var timers = [];
  function clear(){ timers.forEach(clearTimeout); timers = []; }
  function at(ms, fn){ timers.push(setTimeout(fn, ms)); }
  function reset(){
    cells.forEach(function(c){ c.className = 'cell'; });
    rhs.forEach(function(r){ r.classList.remove('on'); });
    vds.forEach(function(v){ v.className = 'vd'; v.textContent = '—'; });
    nEl.textContent = '0'; st.textContent = 'verifying…'; st.className = 'st';
  }
  function finalRow(ri){
    var bad = fails[ri] !== undefined;
    vds[ri].textContent = bad ? 'rejected' : 'golden';
    vds[ri].className = 'vd ' + (bad ? 'r' : 'g');
    if(!bad) rowCells(ri).forEach(function(c){ c.className = 'cell gd'; });
  }
  function run(){
    clear(); reset();
    var ms = 240, checks = 0, gold = 0, rej = 0;
    traces.forEach(function(_, ri){
      at(ms, function(){ rhs[ri].classList.add('on'); });
      var stop = fails[ri] !== undefined ? fails[ri] : 5;
      rowCells(ri).forEach(function(c, ci){
        if(ci > stop) return;
        at(ms, function(){ c.classList.add('scan'); nEl.textContent = ++checks; });
        at(ms + 180, function(){
          c.classList.remove('scan');
          if(fails[ri] === ci){ c.classList.add('fail'); st.textContent = 'rejected: ' + vers[ci].toLowerCase() + ' check'; st.className = 'st r'; }
          else c.classList.add('ok');
        });
        ms += 70;
      });
      at(ms + 200, function(){
        finalRow(ri);
        if(fails[ri] === undefined) gold++; else rej++;
        st.textContent = gold + ' golden · ' + rej + ' rejected'; st.className = 'st g';
      });
      ms += 260;
    });
    at(ms + 5200, run);
  }
  if(RM){
    traces.forEach(function(_, ri){
      rhs[ri].classList.add('on');
      rowCells(ri).forEach(function(c, ci){ var f = fails[ri]; c.className = 'cell ' + (f === undefined ? '' : ci === f ? 'fail' : ci < f ? 'ok' : ''); });
      finalRow(ri);
    });
    nEl.textContent = '41'; st.textContent = '5 golden · 3 rejected'; st.className = 'st g';
    return;
  }
  io([g], function(el, vis){ if(vis) run(); else clear(); });
})();

/* =========================================================
   6. STAGE 03 — refinement funnel
   ========================================================= */
(function(){
  var box = document.getElementById('fn'); if(!box) return;
  var st = document.getElementById('fnSt');
  var rows = [
    ['Collected', 'raw traces', 1284000],
    ['Deduplicated', 'near-copies merged', 612400],
    ['Verified', 'every check passed', 248900],
    ['Conflicts resolved', 'contradictions dropped', 231700],
    ['Golden set v14', 'admitted', 212480, 1]
  ];
  var max = rows[0][2];
  box.innerHTML = rows.map(function(r){
    return '<div class="fn-row'+(r[3]?' gd':'')+'"><span class="k">'+r[0]+'<em>'+r[1]+'</em></span><span class="fn-track"><i></i></span><span class="v">0</span></div>';
  }).join('');
  var bars = box.querySelectorAll('.fn-track i'), vals = box.querySelectorAll('.v');
  var timers = [];
  function clear(){ timers.forEach(clearTimeout); timers = []; }
  function fill(i, instant){
    bars[i].style.width = Math.max(2, rows[i][2]/max*100) + '%';
    if(instant){ vals[i].textContent = fmt(rows[i][2]); return; }
    var t0 = performance.now();
    (function step(now){
      var k = Math.min(1, (now - t0)/1100), e = 1 - Math.pow(1-k, 3);
      vals[i].textContent = fmt(rows[i][2]*e);
      if(k < 1) raf(step);
    })(t0);
  }
  function run(){
    clear();
    bars.forEach(function(b){ b.style.transition = 'none'; b.style.width = '0'; });
    vals.forEach(function(v){ v.textContent = '0'; });
    void box.offsetWidth;
    bars.forEach(function(b){ b.style.transition = ''; });
    st.textContent = 'refining';
    rows.forEach(function(_, i){ timers.push(setTimeout(function(){ fill(i); st.textContent = rows[i][0].toLowerCase(); }, 200 + i*520)); });
    timers.push(setTimeout(function(){ st.textContent = 'cycle 14 complete'; }, 200 + rows.length*520 + 900));
  }
  if(RM){ rows.forEach(function(_, i){ fill(i, true); }); st.textContent = 'cycle 14 complete'; return; }
  io([box], function(el, vis){ if(vis) run(); else clear(); });
})();

/* =========================================================
   7. STAGE 04 — training curve
   ========================================================= */
(function(){
  var svg = document.getElementById('rcsvg'); if(!svg) return;
  var ev = document.getElementById('rcEval'), rw = document.getElementById('rcRew'), dot = document.getElementById('rcDot');
  var stepEl = document.getElementById('rcStep'), evV = document.getElementById('rcEvalV'),
      rwV = document.getElementById('rcRewV'), gapV = document.getElementById('rcGapV');
  var N = 120, E, R, live = false, k = 0, last = 0, hold = 0;
  function X(i){ return 40 + (i/(N-1))*510; }
  function Y(v){ return 20 + (1-v)*250; }
  function gen(){
    E = []; R = [];
    var ne = 0, nr = 0;
    for(var i=0;i<N;i++){
      var s = i/(N-1);
      ne = ne*0.7 + (Math.random()-0.5)*0.02;
      nr = nr*0.6 + (Math.random()-0.5)*0.05;
      E.push(Math.min(0.97, 0.41 + 0.53*(1-Math.exp(-s*3.2)) + ne));
      R.push(Math.min(0.99, 0.38 + 0.58*(1-Math.exp(-s*3.6)) + nr));
    }
  }
  function show(n){
    var pe = [], pr = [];
    for(var i=0;i<n;i++){ pe.push(X(i).toFixed(1)+','+Y(E[i]).toFixed(1)); pr.push(X(i).toFixed(1)+','+Y(R[i]).toFixed(1)); }
    ev.setAttribute('points', pe.join(' ')); rw.setAttribute('points', pr.join(' '));
    var j = Math.max(0, n-1);
    dot.setAttribute('cx', X(j)); dot.setAttribute('cy', Y(E[j]));
    stepEl.textContent = fmt(j/(N-1)*2400);
    evV.textContent = E[j].toFixed(2); rwV.textContent = R[j].toFixed(2);
    var gp = E[j] - 0.92;
    gapV.textContent = (gp >= 0 ? '+' : '−') + Math.abs(gp).toFixed(2);
    gapV.style.color = gp >= -0.005 ? 'var(--gold)' : '';
  }
  gen();
  if(RM){ show(N); return; }
  function tick(ts){
    if(!live) return;
    if(!last) last = ts;
    var dt = ts - last;
    if(k >= N){
      hold += dt;
      if(hold > 2600){ hold = 0; k = 0; gen(); }
    } else if(dt > 55){
      k++; show(k);
    }
    if(dt > 55 || k >= N) last = ts;
    raf(tick);
  }
  show(1);
  io([svg], function(el, vis){ live = vis; last = 0; if(vis) raf(tick); });
})();

/* =========================================================
   8. STAGE 05 — hand off
   ========================================================= */
(function(){
  var box = document.getElementById('ho'); if(!box) return;
  var own = document.getElementById('splitOwn'), fr = document.getElementById('splitFr');
  var rows = [
    ['Order lookup', 41, 99],
    ['Refund triage', 28, 97],
    ['SQL reports', 9, 91],
    ['Contract clause review', 3, 74],
    ['Escalations', 6, null]
  ];
  function state(v){ return v === null ? ['frontier',''] : v >= 95 ? ['owned','go'] : v >= 85 ? ['shadow','sh'] : ['training','']; }
  box.innerHTML = rows.map(function(r){
    var s = state(r[2]);
    return '<div class="ho-row"><span class="k">'+r[0]+'<em>'+r[1]+'k traces / wk · '+(r[2]===null?'not verifiable':r[2]+'% of frontier')+'</em></span>'
      + '<span class="ho-bar"><i class="'+(s[1]==='go'?'go':'')+'" data-w="'+(r[2]||0)+'"></i><b></b></span>'
      + '<span class="s '+s[1]+'">'+s[0]+'</span></div>';
  }).join('');
  var total = rows.reduce(function(a,r){ return a + r[1]; }, 0);
  var ownedShare = Math.round(rows.reduce(function(a,r){ return a + (r[2] !== null && r[2] >= 95 ? r[1] : 0); }, 0) / total * 100);
  var bars = box.querySelectorAll('.ho-bar i');
  function go(on){
    bars.forEach(function(b, i){
      b.style.transitionDelay = on ? (i*0.12) + 's' : '0s';
      b.style.width = on ? b.getAttribute('data-w') + '%' : '0';
    });
    own.style.flexBasis = on ? ownedShare + '%' : '0%';
    own.textContent = 'your model ' + (on ? ownedShare : 0) + '%';
    fr.textContent = 'frontier ' + (on ? 100 - ownedShare : 100) + '%';
  }
  if(RM){ go(true); return; }
  io([box], function(el, vis){ go(vis); });
})();

/* =========================================================
   9. CC / CT loop — orbiting comet
   ========================================================= */
(function(){
  var svg = document.getElementById('ring'); if(!svg) return;
  var comet = document.getElementById('comet'), halo = document.getElementById('cometHalo'),
      nodesG = document.getElementById('ringNodes');
  var legend = Array.prototype.slice.call(document.querySelectorAll('#legend .lgi'));
  var cx=260, cy=260, R=188, angs = [-90,-30,30,90,150,210];
  var COLS = ['#1c46d6','#1c46d6','#0c0c0d','#a8741c','#0c0c0d','#1c46d6'];
  nodesG.innerHTML = angs.map(function(a,i){
    var x = cx + R*Math.cos(a*Math.PI/180), y = cy + R*Math.sin(a*Math.PI/180);
    return '<circle id="rn'+i+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="14" fill="'+(i===3?'#f5ead3':'#f1f0ed')+'" stroke="'+COLS[i]+'" stroke-width="1.4"/>'
      + '<text x="'+x.toFixed(1)+'" y="'+(y+4).toFixed(1)+'" fill="'+COLS[i]+'">'+(i+1)+'</text>';
  }).join('');
  var rn = angs.map(function(_,i){ return document.getElementById('rn'+i); });
  var a = -90, live = false, last = 0, cur = -1;
  function place(){
    var rad = a*Math.PI/180, x = cx + R*Math.cos(rad), y = cy + R*Math.sin(rad);
    comet.setAttribute('cx', x.toFixed(1)); comet.setAttribute('cy', y.toFixed(1));
    halo.setAttribute('cx', x.toFixed(1)); halo.setAttribute('cy', y.toFixed(1));
    var best = 0, bd = 1e9;
    angs.forEach(function(na, i){ var d = Math.abs(((a - na + 540) % 360) - 180); if(d < bd){ bd = d; best = i; } });
    if(best !== cur){
      cur = best;
      legend.forEach(function(l,i){ l.classList.toggle('on', i === best); });
      rn.forEach(function(n,i){ n.setAttribute('r', i === best ? 17 : 14); });
    }
  }
  function tick(ts){
    if(!live) return;
    if(!last) last = ts;
    var dt = Math.min(50, ts - last); last = ts;
    a = (a + dt*0.028) % 360;
    place(); raf(tick);
  }
  place();
  if(RM){ legend.forEach(function(l){l.classList.add('on')}); return; }
  io([svg], function(el, vis){ live = vis; last = 0; if(vis) raf(tick); });
})();

/* =========================================================
   10. Verifier at work — answer → plain-language checks → reward
   ========================================================= */
(function(){
  var fig = document.getElementById('vb'); if(!fig) return;
  var ans = document.getElementById('vbAns'), q = document.getElementById('vbQ'), src = document.getElementById('vbSrc'),
      list = document.getElementById('vbChecks'), fillEl = document.getElementById('vbFill'), n = document.getElementById('vbN'),
      verdict = document.getElementById('vbVerdict'), st = document.getElementById('vbSt');
  var tabs = Array.prototype.slice.call(document.querySelectorAll('#vbTabs button'));
  var cards = Array.prototype.slice.call(document.querySelectorAll('#verifiers .vc[data-v]'));
  // [question, evidence, passed?] — a failed check ends the run; later checks are skipped
  var EX = [
    { src: 'library · support ops',
      q: '“Refunded $48.20 for order #4471 — the parcel was lost in transit.”',
      checks: [['Did it use the refund tool?', 'refund issued', 1], ['Did money actually move?', 'ledger −$48.20', 1],
               ['Is it inside the refund policy?', 'day 12 of 45', 1], ['Is personal data kept out?', 'none found', 1]],
      yes: '<b>Admitted to the golden set.</b> This answer becomes an example your model learns from.' },
    { src: 'library · sql & analytics',
      q: '“EMEA revenue last quarter was $4.1M, up 12% on the quarter before.”',
      checks: [['Does the query run?', 'ran in 1.2s', 1], ['Does the number match the warehouse?', 'warehouse says $3.8M', 0],
               ['Is the growth figure right?', '', 0], ['Is personal data kept out?', '', 0]],
      no: '<b>Rejected.</b> It sounded confident, but it was wrong — so it never trains your model.' },
    { src: 'yours · assay protocols', yours: true,
      q: '“Run ELISA on samples S-221 to S-240 and incubate at 37°C for two hours.”',
      checks: [['Are the reagents in stock?', 'kit A-19 · 4 left', 1], ['Is 37°C allowed by the SOP?', 'SOP 14.2 · 35–38°C', 1],
               ['Do those samples exist?', '20 of 20 in LIMS', 1]],
      yes: '<b>Admitted.</b> Checked against rules only your lab knows — written by your scientists, not by us.' }
  ];
  var timers = [], cur = 0;
  function clear(){ timers.forEach(clearTimeout); timers = []; }
  function at(ms, f){ timers.push(setTimeout(f, ms)); }

  function select(i){
    cur = i;
    tabs.forEach(function(b, k){ b.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
    cards.forEach(function(c){ c.classList.toggle('on', +c.getAttribute('data-v') === i); });
  }
  function setup(ex){
    q.textContent = ex.q;
    src.textContent = ex.src;
    src.className = 'src' + (ex.yours ? ' yours' : '');
    list.innerHTML = ex.checks.map(function(c){
      return '<li class="vb-c"><span class="dot"></span><span class="q">' + c[0] + '</span><span class="e"></span></li>';
    }).join('');
    fillEl.style.width = '0'; fillEl.className = '';
    n.textContent = '—'; n.className = 'vb-n';
    verdict.className = 'vb-verdict'; verdict.textContent = 'Waiting for a verdict…';
    return Array.prototype.slice.call(list.children);
  }
  function mark(li, c, failedBefore){
    li.classList.remove('scan');
    var e = li.querySelector('.e'), dot = li.querySelector('.dot');
    if(failedBefore){ li.classList.add('skip'); e.textContent = 'not needed'; return; }
    li.classList.add(c[2] ? 'ok' : 'no');
    dot.textContent = c[2] ? '✓' : '✕';
    e.textContent = c[1];
  }
  function finish(ex){
    var pass = ex.checks.every(function(c){ return c[2]; });
    fillEl.className = pass ? '' : 'no';
    fillEl.style.width = pass ? '100%' : '3%';
    n.textContent = pass ? '1.00' : '0.00'; n.className = 'vb-n ' + (pass ? 'g' : 'r');
    verdict.className = 'vb-verdict ' + (pass ? 'g' : 'r');
    verdict.innerHTML = pass ? ex.yes : ex.no;
    st.textContent = pass ? 'golden' : 'rejected';
  }

  function run(i){
    clear(); select(i);
    var ex = EX[i];
    ans.classList.add('out');
    at(320, function(){
      var lis = setup(ex);
      ans.classList.remove('out');
      st.textContent = 'reading the answer';
      var ms = 700, failed = false;
      ex.checks.forEach(function(c, k){
        at(ms, function(){ lis[k].classList.add('in'); });
        if(failed){
          at(ms + 120, function(){ mark(lis[k], c, true); });
          ms += 160;
          return;
        }
        at(ms + 80, function(){ lis[k].classList.add('scan'); st.textContent = 'check ' + (k+1) + ' of ' + ex.checks.length; });
        at(ms + 820, function(){ mark(lis[k], c, false); });
        if(!c[2]) failed = true;
        ms += 950;
      });
      at(ms + 200, function(){ finish(ex); });
      at(ms + 4600, function(){ run((i + 1) % EX.length); });
    });
  }
  function still(i){
    clear(); select(i);
    var ex = EX[i], lis = setup(ex), failed = false;
    ex.checks.forEach(function(c, k){ lis[k].classList.add('in'); mark(lis[k], c, failed); if(!c[2]) failed = true; });
    finish(ex);
  }

  tabs.forEach(function(b){
    b.addEventListener('click', function(){ var i = +b.getAttribute('data-i'); RM ? still(i) : run(i); });
  });
  if(RM){ still(0); return; }
  still(0);
  // start once per entry into view; repeated "visible" callbacks must not restart a run mid-check
  var playing = false;
  io([fig], function(el, vis){
    if(vis && !playing){ playing = true; run(cur); }
    else if(!vis){ playing = false; clear(); }
  });
})();

/* =========================================================
   11. L1 ramp — playhead through the four stages
   ========================================================= */
(function(){
  var ramp = document.getElementById('ramp'); if(!ramp) return;
  var stages = Array.prototype.slice.call(ramp.querySelectorAll('.stage'));
  var fill = document.getElementById('rampFill'), ph = document.getElementById('rampPh');
  function allOn(){ stages.forEach(function(s){ s.classList.add('on'); }); fill.style.width = '100%'; ph.style.left = '100%'; }
  if(RM || matchMedia('(max-width:680px)').matches){ allOn(); return; }
  var p = 0, live = false, last = 0, hold = 0;
  function apply(){
    var x = Math.min(100, p);
    fill.style.width = x + '%'; ph.style.left = x + '%';
    stages.forEach(function(s, i){ s.classList.toggle('on', x >= i*25 + 2); });
  }
  function tick(ts){
    if(!live) return;
    if(!last) last = ts;
    var dt = Math.min(50, ts - last); last = ts;
    if(p >= 100){ hold += dt; if(hold > 2600){ hold = 0; p = 0; } }
    else p += dt * 0.009;
    apply(); raf(tick);
  }
  apply();
  io([ramp], function(el, vis){ live = vis; last = 0; if(vis) raf(tick); });
})();

/* =========================================================
   12. Sticky rail highlight
   ========================================================= */
(function(){
  var rail = document.getElementById('rail'); if(!rail) return;
  var links = Array.prototype.slice.call(rail.querySelectorAll('a'));
  var secs = links.map(function(l){ return document.getElementById(l.getAttribute('data-t')); });
  function on(){
    var best = 0, bd = 1e9;
    secs.forEach(function(s,i){
      var d = Math.abs(s.getBoundingClientRect().top - innerHeight*0.34);
      if(d < bd){ bd = d; best = i; }
    });
    links.forEach(function(l,i){ l.classList.toggle('on', i === best); });
  }
  addEventListener('scroll', on, {passive:true}); addEventListener('resize', on); on();
})();

/* =========================================================
   13. CTA halftone field
   ========================================================= */
(function(){
  var cv = document.getElementById('dots'); if(!cv) return;
  var ctx = cv.getContext('2d');
  var W, H, dpr, m = {x:-9999,y:-9999}, live = false, t = 0;
  function size(){
    dpr = Math.min(2, devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    if(!W||!H) return;
    cv.width = W*dpr; cv.height = H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function draw(){
    if(!W||!H) return;
    ctx.clearRect(0,0,W,H);
    var gap = 15;
    for(var x=gap/2; x<W; x+=gap){
      for(var y=gap/2; y<H; y+=gap){
        var near = Math.max(0, 1 - Math.hypot(x-m.x, y-m.y)/230);
        var wave = 0.5 + 0.5*Math.sin((x*0.012) + (y*0.016) + t*0.012);
        ctx.fillStyle = 'rgba(241,240,237,'+(0.05 + wave*0.10 + near*0.5).toFixed(3)+')';
        ctx.beginPath(); ctx.arc(x, y, 0.5 + wave*0.9 + near*2.4, 0, 6.2832); ctx.fill();
      }
    }
  }
  function loop(){ if(!live) return; t++; draw(); raf(loop); }
  size(); draw();
  addEventListener('resize', function(){ size(); draw(); });
  cv.parentElement.addEventListener('pointermove', function(e){
    var r = cv.getBoundingClientRect(); m.x = e.clientX - r.left; m.y = e.clientY - r.top;
  });
  cv.parentElement.addEventListener('pointerleave', function(){ m.x=-9999; m.y=-9999; });
  if(RM) return;
  io([cv], function(el, vis){ live = vis; if(vis) loop(); });
})();

/* ---------- form ---------- */
var f = document.getElementById('f');
if(f) f.addEventListener('submit', function(e){
  e.preventDefault(); f.reset();
  document.getElementById('msg').hidden = false;
});
})();
