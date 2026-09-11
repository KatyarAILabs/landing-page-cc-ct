(function(){
'use strict';
/* write-ups: filter the list by topic */
var tabs = Array.prototype.slice.call(document.querySelectorAll('#wuTabs button'));
var rows = Array.prototype.slice.call(document.querySelectorAll('#wuList .wu'));
var count = document.getElementById('wuCount');
if(!tabs.length || !rows.length) return;

function show(topic){
  var n = 0;
  tabs.forEach(function(b){ b.setAttribute('aria-selected', b.getAttribute('data-topic') === topic ? 'true' : 'false'); });
  rows.forEach(function(r){
    var on = topic === 'all' || r.getAttribute('data-topic') === topic;
    r.hidden = !on;
    if(on) n++;
  });
  count.textContent = n + (n === 1 ? ' write-up' : ' write-ups');
}
tabs.forEach(function(b){ b.addEventListener('click', function(){ show(b.getAttribute('data-topic')); }); });
show('all');
})();
