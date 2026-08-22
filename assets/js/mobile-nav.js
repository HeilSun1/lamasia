/* 手机端底部导航（Sofascore/OneFootball 风格），JS 动态注入，桌面端不显示 */
(function () {
  'use strict';
  if (!window.matchMedia || window.matchMedia('(min-width: 681px)').matches) return;   // 桌面不需要

  var inTeams = /\/teams\//.test(location.pathname);   // 是否在 teams/ 子目录（决定 ../ 前缀）
  var p = inTeams ? '../' : '';
  var tabs = [
    { href: p + 'index.html',               ico: '🏠', label: '首页',   test: /(^|\/)index\.html$/ },
    { href: (inTeams ? '' : 'teams/') + 'index.html', ico: '⚽', label: '梯队', test: /\/teams\// },
    { href: p + 'matches.html',             ico: '📅', label: '比赛',   test: /\/matches\.html$/ },
    { href: p + 'highlights.html',          ico: '🎥', label: '集锦',   test: /\/highlights\.html$/ },
    { href: p + 'search.html',              ico: '🔍', label: '搜索',   test: /\/search\.html$/ }
  ];

  var nav = document.createElement('nav');
  nav.className = 'mb-nav';
  nav.setAttribute('aria-label', '移动端主导航');
  tabs.forEach(function (t) {
    var a = document.createElement('a');
    a.className = 'mb-link' + (t.test.test(location.pathname) ? ' active' : '');
    a.href = t.href;
    a.innerHTML = '<span class="mb-ico">' + t.ico + '</span><span class="mb-label">' + t.label + '</span>';
    nav.appendChild(a);
  });
  document.body.appendChild(nav);

  // 底部导航占位：给 body 加 padding，避免内容被固定栏遮挡
  document.body.classList.add('has-mb-nav');
})();
