/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 拉玛西亚周报渲染（动态聚合）
   ─────────────────────────────────────────────────────────────
   数据：
     window.WEEKLY_ALBUM        —— 公众号「飞翔的拉杆箱」系列合集入口（置顶）
     window.DQD_BARCA_NEWS      —— 懂球帝 B队 球队资讯（每日更新）
     window.DQD_U19_NEWS        —— 懂球帝 U19 球队资讯（每日更新）
     window.WEEKLY_NEWS         —— 手动录入的公众号单篇周报
   三路动态合并后按时间倒序展示。
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

  // 统一条目结构，附上来源
  function withSource(n, source) {
    return {
      id: n.id || "", title: n.title || "", url: n.url || "",
      time: n.time || n.date || "",
      tag: n.tag || "", img: n.img || "",
      issue: n.issue || "", source: source
    };
  }

  var album = window.WEEKLY_ALBUM || null;
  var items = [];

  // 手动周报（公众号单篇）
  (window.WEEKLY_NEWS || []).forEach(function (n) { items.push(withSource(n, "周报")); });
  // 懂球帝 B队
  var barca = window.DQD_BARCA_NEWS && window.DQD_BARCA_NEWS.news;
  if (barca) barca.forEach(function (n) { items.push(withSource(n, "B队")); });
  // 懂球帝 U19
  var u19 = window.DQD_U19_NEWS && window.DQD_U19_NEWS.news;
  if (u19) u19.forEach(function (n) { items.push(withSource(n, "U19")); });

  // 按 URL 去重（同一篇新闻可能同时出现在 B队 与 U19 源）
  var seen = {};
  items = items.filter(function (n) { if (seen[n.url]) return false; seen[n.url] = true; return true; });

  // 按时间倒序（新→旧）
  items.sort(function (a, b) { return String(b.time).localeCompare(String(a.time)); });

  if (statusEl) {
    statusEl.innerHTML = '<span>💾 <b>动态聚合</b>：懂球帝 B队/U19 每日更新 + 公众号「飞翔的拉杆箱」周报。点击标题跳转原文。</span>';
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

  if (!items.length) {
    html += '<div class="match-list-empty">暂无动态，稍后自动更新。</div>';
    el.innerHTML = html;
    return;
  }

  items.forEach(function (n) {
    var srcClass = n.source === "U19" ? "u" : (n.source === "B队" ? "b" : "w");
    var nkey = n.id || n.url;
    html +=
      '<a class="news-item" data-key="' + esc(nkey) + '" href="' + esc(n.url) + '" target="_blank" rel="noopener">' +
        (n.img ? '<img class="news-item__img" src="' + esc(n.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">' : '') +
        '<span class="news-item__body">' +
          '<span class="news-item__title">' + esc(n.title) + '</span>' +
          '<span class="news-item__meta">' +
            '<span class="news-item__src news-item__src--' + srcClass + '">' + esc(n.source) + '</span>' +
            (n.issue ? '<span class="news-item__tag">第 ' + esc(n.issue) + ' 期</span>' : '') +
            (n.tag && n.tag !== "足球" ? '<span class="news-item__tag">' + esc(n.tag) + '</span>' : '') +
            '<span class="news-item__time">' + esc(n.time) + '</span>' +
          '</span>' +
        '</span>' +
      '</a>';
  });
  el.innerHTML = html;
  if (window.NewsRead) {
    NewsRead.visit(el, items.map(function (n) { return { key: n.id || n.url, time: n.time }; }));
    NewsRead.attachReadAll(el.closest(".panel"), el, items.map(function (n) { return n.id || n.url; }));
  }
})();
