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
    // 国内直连可播放（B站/微博）排在 YouTube 前
    var domFirst = function (s) { return (s === "bili" || s === "weibo") ? 0 : 1; };
    out.sort(function (x, y) { return domFirst(x.site) - domFirst(y.site); });
    return out;
  }

  /* 非赛程集锦分组（feed.players）解析：读自动缓存，套用 blocked 拉黑，
     返回 [{label, opp, date, videos:[…]}]，空组过滤。 */
  function feedFor(key) {
    if (!key) return [];
    var feed = (VIDEOS.feed && VIDEOS.feed.players) ? (VIDEOS.feed.players[key] || []) : [];
    if (!feed.length) return [];
    var blocked = (DATA.blocked || {})[key] || [];
    var blockedSet = {};
    blocked.forEach(function (id) { blockedSet[id] = true; });
    return feed.map(function (g) {
      var list = [];
      (g.videos || []).forEach(function (v) {
        if (!v || !v.videoId || blockedSet[v.videoId]) return;
        list.push({
          videoId: v.videoId,
          title: v.title || "",
          channel: v.channel || "",
          published: v.published || "",
          durationSec: v.durationSec || "",
          site: v.site || "yt",
          pic: v.pic || ""
        });
      });
      return { label: g.label || "", opp: g.opp || "", date: g.date || "", videos: list };
    }).filter(function (g) { return g.videos.length; });
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
  var WEIBO_WATCH = "https://weibo.com/tv/show/{id}";

  /* ═══ 集锦「新更新」红点 + 一键已读（与新闻红点同语义） ═══
     今天/昨天发布且未点开的视频卡片弹红点，点击该卡即消失并持久化；
     容器（集锦页/球员卡片/比赛弹窗）可调 VideosUI.attachReadAll(container) 加「一键已读」。 */
  var VIDREAD_KEY = "lamasia-videos-seen-v1";
  var vSeen = {};
  try {
    var vRaw = localStorage.getItem(VIDREAD_KEY);
    if (vRaw) { var vParsed = JSON.parse(vRaw); if (vParsed && vParsed.seen) vSeen = vParsed.seen; }
  } catch (e) { vSeen = {}; }
  function vSave() {
    try { localStorage.setItem(VIDREAD_KEY, JSON.stringify({ seen: vSeen })); } catch (e) {}
  }
  function vIsNew(published, videoId) {
    if (!videoId || vSeen[videoId]) return false;
    var m = String(published || "").match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return false;
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    var diff = Math.round((new Date() - d) / 86400000);
    return diff >= 0 && diff <= 1;
  }
  function vDismiss(videoId) {
    if (!videoId || vSeen[videoId]) return;
    vSeen[videoId] = true; vSave();
  }
  function vMarkAllRead(container) {
    if (!container) return;
    var n = 0;
    Array.prototype.forEach.call(container.querySelectorAll(".vid-card[data-video-id]"), function (c) {
      var id = c.getAttribute("data-video-id");
      var dot = c.querySelector(".vid-dot");
      if (dot) dot.remove();
      if (id && !vSeen[id]) { vSeen[id] = true; n++; }
    });
    if (n) vSave();
  }
  function vHasNewIn(container) {
    if (!container) return false;
    var has = false;
    Array.prototype.forEach.call(container.querySelectorAll(".vid-card[data-video-id]"), function (c) {
      if (c.querySelector(".vid-dot")) has = true;
    });
    return has;
  }
  function vAttachReadAll(container) {
    if (!container || !vHasNewIn(container)) return;
    var bar = document.createElement("button");
    bar.type = "button";
    bar.className = "news-readall vid-readall";
    bar.textContent = "一键已读";
    bar.title = "标记当前全部集锦视频为已读";
    bar.addEventListener("click", function () {
      vMarkAllRead(container);
      bar.remove();
    });
    container.parentNode.insertBefore(bar, container);
  }

  function videoCardHtml(v) {
    var id = esc(v.videoId);
    var dur = fmtDur(v.durationSec);
    var isBili = v.site === "bili";
    var isWb = v.site === "weibo";
    var thumb = (isBili || isWb) ? (v.pic || "") : YT_THUMB.replace("{id}", id);
    var watch = (isWb ? WEIBO_WATCH : (isBili ? BILI_WATCH : YT_WATCH)).replace("{id}", id);
    var badge = isBili ? '<span class="vid-badge bili">B站</span>' : (isWb ? '<span class="vid-badge wb">微博</span>' : '<span class="vid-badge">YT</span>');
    var dotHtml = vIsNew(v.published, v.videoId) ? '<span class="vid-dot" aria-label="新更新"></span>' : "";
    var thumbHtml = thumb
      ? '<img src="' + esc(thumb) + '" alt="' + esc(v.title || "") + '" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\';this.parentElement.classList.add(\'noimg\')">'
      : '<span class="vid-noimg">▶</span>';
    return '<div class="vid-card' + (isBili ? " vid-bili" : (isWb ? " vid-wb" : "")) + '" data-video-id="' + id + '" data-video-site="' + (isBili ? "bili" : (isWb ? "weibo" : "yt")) + '" title="点击在本站播放">' +
      '<span class="vid-thumb">' + thumbHtml +
        (dur ? '<span class="vid-dur">' + dur + "</span>" : "") +
        '<span class="vid-play">▶</span>' + badge + dotHtml +
      "</span>" +
      '<span class="vid-title">' + esc(v.title || "视频") + "</span>" +
      '<span class="vid-row">' +
        '<span class="vid-channel">' + esc(v.channel || (isWb ? "微博" : (isBili ? "B站" : "YouTube"))) + (v.published ? " · " + esc(v.published) : "") + "</span>" +
        '<a class="vid-ext" href="' + esc(watch) + '" target="_blank" rel="noopener" title="在' + (isWb ? "微博" : (isBili ? "B站" : "YouTube")) + '打开">↗</a>' +
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
    if (site === "weibo") {
      return "https://weibo.com/tv/show/" + encodeURIComponent(videoId);
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
    var isWb = site === "weibo";
    var siteLabel = isWb ? "微博" : (site === "bili" ? "B站" : "YouTube");
    var watch = (isWb ? WEIBO_WATCH : (site === "bili" ? BILI_WATCH : YT_WATCH)).replace("{id}", encodeURIComponent(videoId));
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

  /* 委托点击：↗ 外链不拦截；其余落在 .vid-card 上 → 站内播放 + 消红点 */
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest(".vid-ext")) return;
    var card = e.target.closest ? e.target.closest(".vid-card") : null;
    if (!card) return;
    e.preventDefault();
    var vid = card.getAttribute("data-video-id");
    var dot = card.querySelector(".vid-dot");
    if (dot) dot.remove();
    vDismiss(vid);
    openPlayer(vid, card.getAttribute("data-video-site") || "yt");
  });

  window.VideosUI = {
    resolve: resolve,
    feedFor: feedFor,
    videoCardHtml: videoCardHtml,
    groupHtml: groupHtml,
    openPlayer: openPlayer,
    closePlayer: closePlayer,
    markAllRead: vMarkAllRead,
    attachReadAll: vAttachReadAll,
    vidIsNew: vIsNew
  };
})();
