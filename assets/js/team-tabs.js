/* 梯队页顶部页签（懂球帝风格）：新闻 / 球员名单 / 球队信息
   用法：<nav class="team-tabs" data-default="news"
              data-tt-news="#sec-news"
              data-tt-roster="#sec-injuries,#sec-roster"
              data-tt-team="#sec-schedule,#sec-teaminfo">
         <button class="tt-tab active" data-tt="news">📰 新闻</button> ...
         </nav>
   引用的 #sec-* 容器随页签切换显示；未引用区块（页头/概览）始终显示。
   存在页签时隐藏右侧 page-toc（由 CSS 处理）。 */
(function () {
  'use strict';
  function init() {
    var bars = document.querySelectorAll('.team-tabs');
    if (!bars.length) return;
    document.body.classList.add('has-team-tabs');   // 隐藏右侧 page-toc
    bars.forEach(function (bar) {
      var tabs = Array.prototype.slice.call(bar.querySelectorAll('.tt-tab'));
      var mapping = {};
      tabs.forEach(function (t) {
        var name = t.getAttribute('data-tt');
        var sel = bar.getAttribute('data-tt-' + name) || '';
        mapping[name] = sel.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      });
      var names = Object.keys(mapping);
      if (!names.length) return;
      var def = bar.getAttribute('data-default') || names[0];

      function show(name) {
        tabs.forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-tt') === name); });
        names.forEach(function (k) {
          mapping[k].forEach(function (sel) {
            document.querySelectorAll(sel).forEach(function (el) {
              el.style.display = (k === name) ? '' : 'none';
            });
          });
        });
      }

      tabs.forEach(function (t) {
        t.addEventListener('click', function () { show(t.getAttribute('data-tt')); });
      });
      show(def);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
