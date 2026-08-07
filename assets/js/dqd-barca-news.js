/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 巴萨B队（Barça Atlètic）球队资讯渲染
   ─────────────────────────────────────────────────────────────
   数据来自懂球帝球队资讯页，由 update_barca_news.ps1 每日生成缓存。
   懂球帝页面未开放 CORS，前端只渲染每日缓存，不做实时拉取。
   仅用于 teams/barca-atletic.html
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const el = document.getElementById("barca-news");
  if (!el) return;
  const statusEl = document.getElementById("barca-news-status");

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  const data = window.DQD_BARCA_NEWS;
  const news = (data && data.news) || [];
  const updated = (data && data.updated) || "";

  if (statusEl) {
    statusEl.innerHTML = '<span>💾 <b>球队资讯来自懂球帝</b>' +
      (updated ? '（每日更新 · ' + esc(updated) + '）' : '') +
      '。点击标题跳转懂球帝原文。</span>';
    statusEl.style.display = "block";
  }

  if (!news.length) {
    el.innerHTML = '<div class="match-list-empty">暂无新闻数据</div>';
    return;
  }

  let html = "";
  news.forEach(function (n) {
    html +=
      '<a class="news-item" href="' + esc(n.url) + '" target="_blank" rel="noopener">' +
        (n.img ? '<img class="news-item__img" src="' + esc(n.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">' : '') +
        '<span class="news-item__body">' +
          '<span class="news-item__title">' + esc(n.title) + '</span>' +
          '<span class="news-item__meta">' +
            (n.tag ? '<span class="news-item__tag">' + esc(n.tag) + '</span>' : '') +
            '<span class="news-item__time">' + esc(n.time) + '</span>' +
          '</span>' +
        '</span>' +
      '</a>';
  });
  el.innerHTML = html;
})();
