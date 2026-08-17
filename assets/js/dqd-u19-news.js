/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 巴萨U19（Juvenil A）球队资讯渲染
   ─────────────────────────────────────────────────────────────
   数据来自懂球帝「巴塞罗那U19」球队资讯页，由 update_u19_news.ps1
   每日生成缓存。懂球帝页面未开放 CORS，前端只渲染每日缓存。
   缓存为滚动存档（上限 50 条）：初始展示最近 8 条，点「查看更多」展开。
   仅用于 teams/juvenil-a.html
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const el = document.getElementById("u19-news");
  if (!el) return;
  const statusEl = document.getElementById("u19-news-status");

  const INITIAL = 8;   // 初始展示条数，其余点「查看更多」

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function renderItems(items) {
    let html = "";
    items.forEach(function (n) {
      const nkey = n.id || n.url;
      html +=
        '<a class="news-item" data-key="' + esc(nkey) + '" href="' + esc(n.url) + '" target="_blank" rel="noopener">' +
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
    if (window.NewsRead) NewsRead.decorate(el);
  }

  const data = window.DQD_U19_NEWS;
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

  renderItems(news.slice(0, INITIAL));
  if (news.length > INITIAL) {
    const more = document.createElement("button");
    more.className = "news-more";
    more.type = "button";
    more.textContent = "查看更多（还有 " + (news.length - INITIAL) + " 条）";
    more.addEventListener("click", function () {
      renderItems(news);
      more.remove();
    });
    el.appendChild(more);
  }
})();
