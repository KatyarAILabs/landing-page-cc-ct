(function(){
'use strict';

/* ---------- sidebar: open on desktop, collapsible "Browse docs" on small screens ---------- */
var browse = document.querySelector('.dbrowse');
var wide = matchMedia('(min-width:1041px)');
if(browse){
  browse.open = wide.matches;
  wide.addEventListener('change', function(){ browse.open = wide.matches; });
}

/* ---------- search: filter sidebar links by title + keywords ---------- */
var input = document.getElementById('docSearch');
var res = document.getElementById('dRes');
var nav = document.querySelector('.dnav');
if(input && nav){
  var items = Array.prototype.slice.call(nav.querySelectorAll('li'));
  var groups = Array.prototype.slice.call(nav.querySelectorAll('.dgroup'));
  var empty = nav.querySelector('.dempty');

  var filter = function(){
    var raw = input.value.trim(), q = raw.toLowerCase(), shown = 0;
    var words = q ? q.split(/\s+/) : [];
    items.forEach(function(li){
      var a = li.querySelector('a');
      var hay = (a.textContent + ' ' + (a.getAttribute('data-k') || '')).toLowerCase();
      var hit = words.every(function(w){ return hay.indexOf(w) >= 0; });
      li.hidden = !hit;
      if(hit) shown++;
    });
    groups.forEach(function(g){ g.hidden = !g.querySelector('li:not([hidden])'); });
    empty.hidden = shown > 0;
    empty.querySelector('b').textContent = raw;
    res.textContent = !q ? '' : shown ? shown + (shown === 1 ? ' page matches' : ' pages match') : 'No pages match';
    // on small screens the list lives in a closed <details>; open it so results are visible
    if(q && browse && !wide.matches) browse.open = true;
  };
  input.addEventListener('input', filter);

  document.addEventListener('keydown', function(e){
    var tag = document.activeElement && document.activeElement.tagName;
    if(e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(tag)){ e.preventDefault(); input.focus(); }
    if(e.key === 'Escape' && document.activeElement === input){ input.value = ''; filter(); input.blur(); }
  });
}

/* ---------- on this page: highlight the section being read ---------- */
var links = Array.prototype.slice.call(document.querySelectorAll('.dtoc ul a'));
var heads = links.map(function(a){ return document.getElementById(a.getAttribute('href').slice(1)); });
if(links.length){
  var spy = function(){
    var cur = 0;
    heads.forEach(function(h, i){ if(h && h.getBoundingClientRect().top < 140) cur = i; });
    links.forEach(function(a, i){ a.classList.toggle('on', i === cur); });
  };
  addEventListener('scroll', spy, {passive:true});
  addEventListener('resize', spy);
  spy();
}

/* ---------- was this helpful ---------- */
var fb = document.querySelector('.dfeedback');
if(fb){
  var btns = Array.prototype.slice.call(fb.querySelectorAll('button'));
  btns.forEach(function(b){
    b.addEventListener('click', function(){
      btns.forEach(function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); x.disabled = true; });
      fb.querySelector('.dthanks').hidden = false;
    });
  });
}
})();
