/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 视频集锦渲染（match-detail.js / player-card.js 共享）
   ─────────────────────────────────────────────────────────────
   数据来源：
     · dqd-videos-cache.js（自动搜索，每日更新）→ window.DQD_VIDEOS_CACHE
     · videos-data.js（人工覆盖层）→ window.VIDEOS_DATA
   行为：
     1. VideosUI.resolve(kind, key) 解析视频列表：
        人工 pin（VIDEOS_DATA.matches/players）在前 → 自动候选随后 → blocked 拉黑
     2. 视频卡片缩略图 + 时长；缩略图加载失败（如国内无代理）保留文字可点
     3. 点击卡片 → 本站内嵌播放器直接播放（youtube-nocookie 隐私增强模式）
     4. 卡片 ↗ 直达 YouTube 原站
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var VIDEOS = window.DQD_VIDEOS_CACHE || {};
  var DATA = window.VIDEOS_DATA || {};

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* 解析某键的视频列表：人工 pin 在前（优先生效），自动候选随后，拉黑的不显示 */
  function resolve(kind, key) {
    if (!kind || !key) return [];
    var auto = VIDEOS[kind] || {};
    var cur = DATA[kind] || {};
    var blocked = (DATA.blocked || {})[key] || [];
    var blockedSet = {};
    blocked.forEach(function (id) { blockedSet[id] = true; });

    var autoList = Array.isArray(auto[key]) ? auto[key] : [];
    var autoById = {};
    autoList.forEach(function (v) { if (v && v.videoId) autoById[v.videoId] = v; });

    var out = [], seen = {};
    function push(id, base) {
      if (!id || seen[id] || blockedSet[id]) return;
      seen[id] = true;
      var a = autoById[id] || {};
      out.push({
        videoId: id,
        title: (base && base.title) || a.title || "",
        channel: a.channel || "",
        published: a.published || "",
        durationSec: a.durationSec || "",
        site: (base && base.site) || a.site || "yt",   // "yt" / "bili"
        pic: a.pic || ""
      });
    }
    (Array.isArray(cur[key]) ? cur[key] : []).forEach(function (v) { if (v && v.videoId) push(v.videoId, v); });
    autoList.forEach(function (v) { if (v && v.videoId) push(v.videoId, null); });
    // B站（国内直连可播放）排在 YouTube 前
    out.sort(function (x, y) { return (x.site === "bili" ? 0 : 1) - (y.site === "bili" ? 0 : 1); });
    return out;
  }

  /* 秒 → "m:ss" / "h:mm:ss" */
  function fmtDur(sec) {
    sec = parseInt(sec, 10);
    if (!sec || sec <= 0) return "";
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? h + ":" + pad(m) + ":" + pad(s) : m + ":" + pad(s);
  }

  var YT_THUMB = "https://i.ytimg.com/vi/{id}/hqdefault.jpg";
  var YT_WATCH = "https://www.youtube.com/watch?v={id}";
  var BILI_WATCH = "https://www.bilibili.com/video/{id}";

  function videoCardHtml(v) {
    var id = esc(v.videoId);
    var dur = fmtDur(v.durationSec);
    var isBili = v.site === "bili";
    var thumb = isBili ? (v.pic || "") : YT_THUMB.replace("{id}", id);
    var watch = (isBili ? BILI_WATCH : YT_WATCH).replace("{id}", id);
    var badge = isBili ? '<span class="vid-badge bili">B站</span>' : '<span class="vid-badge">YT</span>';
    var thumbHtml = thumb
      ? '<img src="' + esc(thumb) + '" alt="' + esc(v.title || "") + '" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\';this.parentElement.classList.add(\'noimg\')">'
      : '<span class="vid-noimg">▶</span>';
    return '<div class="vid-card' + (isBili ? " vid-bili" : "") + '" data-video-id="' + id + '" data-video-site="' + (isBili ? "bili" : "yt") + '" title="点击在本站播放">' +
      '<span class="vid-thumb">' + thumbHtml +
        (dur ? '<span class="vid-dur">' + dur + "</span>" : "") +
        '<span class="vid-play">▶</span>' + badge +
      "</span>" +
      '<span class="vid-title">' + esc(v.title || "视频") + "</span>" +
      '<span class="vid-row">' +
        '<span class="vid-channel">' + esc(v.channel || (isBili ? "B站" : "YouTube")) + (v.published ? " · " + esc(v.published) : "") + "</span>" +
        '<a class="vid-ext" href="' + esc(watch) + '" target="_blank" rel="noopener" title="在' + (isBili ? "B站" : "YouTube") + '打开">↗</a>' +
      "</span>" +
    "</div>";
  }

  /* 视频分组块（比赛弹窗 / 球员卡片通用），无视频时返回空串 */
  function groupHtml(list, label) {
    if (!list || !list.length) return "";
    return '<div class="vid-block">' +
      '<div class="vid-block-title">' + esc(label) + ' <span class="vid-count">' + list.length + "</span></div>" +
      '<div class="vid-grid">' + list.map(videoCardHtml).join("") + "</div>" +
    "</div>";
  }

  /* ═══ 本站内嵌播放器灯箱（YouTube / B站） ═══ */
  var playerEl = null;
  function embedSrc(videoId, site) {
    if (site === "bili") {
      return "https://player.bilibili.com/player.html?bvid=" + encodeURIComponent(videoId) + "&page=1&autoplay=1";
    }
    return "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(videoId) + "?rel=0&modestbranding=1";
  }
  function openPlayer(videoId, site) {
    site = site || "yt";
    if (!videoId) return;
    if (!playerEl) {
      playerEl = document.createElement("div");
      playerEl.className = "vid-player";
      playerEl.innerHTML =
        '<div class="vid-player-inner">' +
          '<button class="vid-player-close" title="关闭">✕</button>' +
          '<div class="vid-frame"></div>' +
          '<div class="vid-player-foot"><span class="vid-player-ext"></span></div>' +
        "</div>";
      document.body.appendChild(playerEl);
      playerEl.addEventListener("click", function (e) {
        if (e.target === playerEl || (e.target.classList && e.target.classList.contains("vid-player-close"))) closePlayer();
      });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePlayer(); });
    }
    var siteLabel = site === "bili" ? "B站" : "YouTube";
    var watch = (site === "bili" ? BILI_WATCH : YT_WATCH).replace("{id}", encodeURIComponent(videoId));
    playerEl.querySelector(".vid-frame").innerHTML =
      '<iframe src="' + embedSrc(videoId, site) + '" title="集锦" loading="lazy" ' +
      'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
    playerEl.querySelector(".vid-player-ext").innerHTML =
      '<a href="' + esc(watch) + '" target="_blank" rel="noopener">在' + siteLabel + '打开 →</a>';
    playerEl.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closePlayer() {
    if (!playerEl) return;
    playerEl.classList.remove("open");
    playerEl.querySelector(".vid-frame").innerHTML = "";   // 停止播放，释放资源
    document.body.style.overflow = "";
  }

  /* 委托点击：↗ 外链不拦截；其余落在 .vid-card 上 → 站内播放 */
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest(".vid-ext")) return;
    var card = e.target.closest ? e.target.closest(".vid-card") : null;
    if (!card) return;
    e.preventDefault();
    openPlayer(card.getAttribute("data-video-id"), card.getAttribute("data-video-site") || "yt");
  });

  window.VideosUI = {
    resolve: resolve,
    videoCardHtml: videoCardHtml,
    groupHtml: groupHtml,
    openPlayer: openPlayer,
    closePlayer: closePlayer
  };
})();
