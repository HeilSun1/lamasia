/* 外部链接处理：PWA 独立窗口（添加到主屏幕）下，外部链接强制用新浏览器标签打开，
   避免当前 App 窗口被导航走（出现"点出去再返回就退出网站"的问题）。
   普通浏览器不干预（target=_blank / 同页打开按原样工作）。 */
(function () {
  'use strict';
  function isStandalone() {
    return window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  }
  document.addEventListener('click', function (e) {
    if (!isStandalone()) return;
    var a = e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || !/^https?:/i.test(href)) return;
    var u;
    try { u = new URL(href, location.href); } catch (err) { return; }
    if (u.origin === location.origin) return;   // 站内链接不干预
    e.preventDefault();
    window.open(href, '_blank', 'noopener');
  });
})();
