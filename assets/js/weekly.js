/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 拉玛西亚周报渲染
   数据：assets/js/weekly-news.js 的 window.WEEKLY_ALBUM（合集入口）
         + window.WEEKLY_NEWS（单篇，手动维护）。
   仅用于 weekly.html
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var el = document.getElementById("weekly-list");
  if (!el) return;
  var statusEl = document.getElementById("weekly-status");

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  var album = window.WEEKLY_ALBUM || null;
  var news = window.WEEKLY_NEWS || [];

  if (statusEl) {
    statusEl.innerHTML = '<span>💾 <b>拉玛西亚周报</b>（微信公众号「飞翔的拉杆箱」· 手动录入）。点击标题跳转微信原文。</span>';
    statusEl.style.display = "block";
  }

  var html = "";

  // 合集入口（常驻顶部）
  if (album && album.url) {
    html +=
      '<a class="weekly-album" href="' + esc(album.url) + '" target="_blank" rel="noopener">' +
        '<span class="weekly-album__icon">📚</span>' +
        '<span class="weekly-album__body">' +
          '<span class="weekly-album__title">' + esc(album.title) + '</span>' +
          '<span class="weekly-album__note">' + esc(album.note || "点击进入合集") + '</span>' +
        '</span>' +
      '</a>';
  }

  if (!news.length) {
    html += '<div class="match-list-empty">暂无单篇周报，等博主发布后录入。</div>';
    el.innerHTML = html;
    return;
  }

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
