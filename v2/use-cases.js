// Use cases page: filter the use-case grid by industry.
(function(){
  'use strict';
  var tabs = Array.prototype.slice.call(document.querySelectorAll('#ucTabs button'));
  var cards = Array.prototype.slice.call(document.querySelectorAll('#ucGrid .uc'));
  var count = document.getElementById('ucCount');
  if(!tabs.length || !cards.length) return;

  function inFilter(card, f){ return f === 'all' || card.getAttribute('data-ind') === f; }

  // label each tab with how many use cases it holds
  tabs.forEach(function(b){
    var f = b.getAttribute('data-f');
    var n = cards.filter(function(c){ return inFilter(c, f); }).length;
    b.insertAdjacentHTML('beforeend', ' <span class="n">' + n + '</span>');
  });

  function show(f){
    var n = 0;
    tabs.forEach(function(b){ b.setAttribute('aria-selected', b.getAttribute('data-f') === f ? 'true' : 'false'); });
    cards.forEach(function(c){
      var on = inFilter(c, f);
      c.hidden = !on;
      if(on) n++;
    });
    count.textContent = n + (n === 1 ? ' use case' : ' use cases') + ' · parity illustrative';
  }

  tabs.forEach(function(b){
    b.addEventListener('click', function(){ show(b.getAttribute('data-f')); });
  });
  show('all');
})();
