/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 拉玛西亚周报渲染
   数据：assets/js/weekly-news.js 的 window.WEEKLY_NEWS（手动维护）。
   仅用于 weekly.html
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var el = document.getElementById("weekly-list");
  if (!el) return;

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  var news = window.WEEKLY_NEWS || [];

  if (!news.length) {
    el.innerHTML = '<div class="match-list-empty">暂无周报，等博主「飞翔的拉杆箱」发布后录入。</div>';
    return;
  }

  var html = "";
  news.forEach(function (n) {
    html +=
      '<a class="news-item" href="' + esc(n.url) + '" target="_blank" rel="noopener">' +
        '<span class="news-item__body">' +
          '<span class="news-item__title">' + esc(n.title) + '</span>' +
          '<span class="news-item__meta">' +
            (n.issue ? '<span class="news-item__tag">第 ' + esc(n.issue) + ' 期</span>' : '') +
            (n.date ? '<span class="news-item__time">' + esc(n.date) + '</span>' : '') +
          '</span>' +
        '</span>' +
      '</a>';
  });
  el.innerHTML = html;
})();
