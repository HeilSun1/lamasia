/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 官方站球队资讯渲染（B队/一队）
   ─────────────────────────────────────────────────────────────
   数据来自 fcbarcelona.com 官方新闻列表（SSR），由 update_fcb_news.ps1
   每日生成缓存 window.LAMASIA_OFFICIAL_NEWS.news.{b,first}。
   容器 <div id="official-news" data-tier="b"> 指定显示哪个梯队。
   复用 news-read.js 红点/一键已读。
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var el = document.getElementById("official-news");
  if (!el) return;
  var statusEl = document.getElementById("official-news-status");
  var tier = el.getAttribute("data-tier") || "b";
  var label = tier === "first" ? "官方·一队" : "官方·B队";

  var data = window.LAMASIA_OFFICIAL_NEWS;
  var news = (data && data.news && data.news[tier]) || [];
  var updated = (data && data.updated) || "";

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  if (statusEl) {
    statusEl.innerHTML = '<span>💾 <b>' + label + '新闻来自官方站</b>' +
      (updated ? '（每日更新 · ' + esc(updated) + '）' : '') +
      '。点击标题跳转官网原文。</span>';
    statusEl.style.display = "block";
  }

  if (!news.length) {
    el.innerHTML = '<div class="match-list-empty">暂无官方新闻数据</div>';
    return;
  }

  var INITIAL = 8;
  function renderItems(items) {
    var html = "";
    items.forEach(function (n) {
      var nkey = n.id || n.url;
      html +=
        '<a class="news-item" data-key="' + esc(nkey) + '" href="' + esc(n.url) + '" target="_blank" rel="noopener">' +
          (n.img ? '<img class="news-item__img" src="' + esc(n.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">' : '') +
          '<span class="news-item__body">' +
            '<span class="news-item__title">' + esc(n.title) + '</span>' +
            '<span class="news-item__meta">' +
              '<span class="news-item__src news-item__src--f">' + label + '</span>' +
              (n.time ? '<span class="news-item__time">' + esc(n.time) + '</span>' : '') +
            '</span>' +
          '</span>' +
        '</a>';
    });
    el.innerHTML = html;
  }

  renderItems(news.slice(0, INITIAL));
  if (window.NewsRead) {
    NewsRead.visit(el, news.map(function (n) { return { key: n.id || n.url, time: n.time }; }));
    NewsRead.attachReadAll(el.closest(".panel"), el, news.map(function (n) { return n.id || n.url; }));
  }
  if (news.length > INITIAL) {
    var more = document.createElement("button");
    more.className = "news-more";
    more.type = "button";
    more.textContent = "查看更多（还有 " + (news.length - INITIAL) + " 条）";
    more.addEventListener("click", function () {
      renderItems(news);
      if (window.NewsRead) NewsRead.decorate(el);
      more.remove();
    });
    el.appendChild(more);
  }
})();
