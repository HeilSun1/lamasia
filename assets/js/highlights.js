/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 集锦汇总页渲染（highlights.html）
   ─────────────────────────────────────────────────────────────
   遍历 DQD_VIDEOS_CACHE.feed.players（非赛程集锦，每日更新），
   按球员分组渲染可折叠列表。
   复用：VideosUI.feedFor / videoCardHtml（videos-ui.js）、
         PlayerCard.findByKey（player-card.js，取中文名/梯队）。
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  var wrap = document.getElementById("hl-list");
  if (!wrap || !window.DQD_VIDEOS_CACHE || !window.VideosUI) return;

  var feed = (window.DQD_VIDEOS_CACHE.feed && window.DQD_VIDEOS_CACHE.feed.players) || {};
  var keys = Object.keys(feed).sort();
  var html = "";
  var totalVideos = 0;
  var playerCount = 0;

  keys.forEach(function (k) {
    var groups = window.VideosUI.feedFor(k);
    if (!groups.length) return;
    var rec = (window.PlayerCard && window.PlayerCard.findByKey(k)) || null;
    var name = (rec && (rec.nameZh || rec.nameEn)) || k;
    var team = (rec && rec.team) || "";
    var n = groups.reduce(function (s, g) { return s + g.videos.length; }, 0);
    totalVideos += n;
    playerCount++;
    html += '<details class="dqd-group hl-player">' +
      "<summary>" +
        '<span class="hl-left">' +
          '<span class="hl-name">' + esc(name) + "</span>" +
          (team ? '<span class="hl-tier">' + esc(team) + "</span>" : "") +
        "</span>" +
        '<span class="dqd-side"><span class="dqd-count">' + n + ' 条</span><span class="dqd-state"></span></span>' +
      "</summary>" +
      '<div class="dqd-body">' +
        groups.map(function (g) {
          return '<div class="pc-mv-match"><div class="pc-mv-title">⚽ ' + esc(g.label) + "</div>" +
            '<div class="vid-grid">' + g.videos.map(window.VideosUI.videoCardHtml).join("") + "</div></div>";
        }).join("") +
      "</div>" +
    "</details>";
  });

  var empty = document.getElementById("hl-empty");
  var countEl = document.getElementById("hl-count");
  if (playerCount) {
    wrap.innerHTML = html;
    if (empty) empty.style.display = "none";
    if (countEl) countEl.textContent = playerCount + " 名球员 · " + totalVideos + " 条视频";
  } else if (empty) {
    empty.style.display = "";
  }
})();
