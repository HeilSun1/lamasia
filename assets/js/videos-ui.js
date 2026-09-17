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
        pic: a.pic || "",
        matchKey: (base && base.matchKey) || a.matchKey || ""   // 属于哪场比赛（爬虫标注），空 = 非赛程
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
          pic: v.pic || "",
          matchKey: v.matchKey || g.matchKey || ""   // 分组级 matchKey 是爬虫算的，视频级优先
        });
      });
      return { label: g.label || "", opp: g.opp || "", date: g.date || "", matchKey: g.matchKey || "", videos: list };
    }).filter(function (g) { return g.videos.length; });
  }

  /* ═══ 比赛 ↔ 球员集锦：按爬虫标注的 matchKey 关联 ═══
     数据侧（update_youtube.ps1）在产出时就把「这条集锦属于哪场比赛」定下来了：
       · players 段    → 每条视频带 matchKey
       · feed.players 段 → 每个分组带 matchKey
     前端只认这个键，不再拿发布日期去猜（旧做法 ±14 天窗会把同一条视频挂到好几场比赛上）。 */

  /* 拉黑表按球员键组织，但同一条视频常挂多个球员键（sf:b:xxx 与 local:juvenil-a:xxx）。
     只要它在**任一**键下被拉黑就不显示，否则人工否决会失效。 */
  function isBlockedForAny(playerKeys, videoId) {
    var blocked = DATA.blocked || {};
    for (var i = 0; i < playerKeys.length; i++) {
      var ids = blocked[playerKeys[i]];
      if (Array.isArray(ids) && ids.indexOf(videoId) !== -1) return true;
    }
    return false;
  }
  /* 同一条视频挂在多个球员键下时归谁：Sofascore 键优先 —— 比赛详情弹窗的阵容是按
     sf:{tier}:{pid} 查的，归给 sf: 键才能点亮 🎬 徽标。 */
  function ownerRank(k) {
    if (/^sf:/.test(k)) return 0;
    if (/^b:/.test(k)) return 1;
    if (/^local:/.test(k)) return 2;
    return 3;
  }
  function pickVideo(v) {
    return {
      videoId: v.videoId, title: v.title || "", channel: v.channel || "",
      published: v.published || "", durationSec: v.durationSec || "",
      site: v.site || "yt", pic: v.pic || "", matchKey: v.matchKey || ""
    };
  }

  var matchIndex = null;   // matchKey → { videoId → { video, keys:{球员键:true} } }
  function buildMatchIndex() {
    var idx = {};
    function add(mk, pk, v) {
      if (!mk || !v || !v.videoId) return;
      var m = idx[mk] || (idx[mk] = {});
      var e = m[v.videoId];
      if (!e) { e = m[v.videoId] = { video: pickVideo(v), keys: {} }; }
      e.keys[pk] = true;
    }
    var feed = (VIDEOS.feed && VIDEOS.feed.players) || {};
    Object.keys(feed).forEach(function (pk) {
      (feed[pk] || []).forEach(function (g) {
        (g.videos || []).forEach(function (v) { add(g.matchKey, pk, v); });
      });
    });
    Object.keys(VIDEOS.players || {}).forEach(function (pk) {
      (VIDEOS.players[pk] || []).forEach(function (v) { add(v.matchKey, pk, v); });
    });
    return idx;
  }

  /* 该场比赛的球员个人集锦 → [{playerKey, videos:[…]}]，按视频条数倒序。
     球员中文名由调用方用 PlayerCard.findByKey(playerKey) 取（这里不依赖 player-card.js）。 */
  function videosForMatch(matchKey) {
    if (!matchKey) return [];
    if (!matchIndex) matchIndex = buildMatchIndex();
    var byVid = matchIndex[matchKey];
    if (!byVid) return [];
    var owner = {};
    Object.keys(byVid).forEach(function (vid) {
      var e = byVid[vid];
      var ks = Object.keys(e.keys).sort(function (a, b) { return ownerRank(a) - ownerRank(b); });
      if (isBlockedForAny(ks, vid)) return;
      (owner[ks[0]] = owner[ks[0]] || []).push(e.video);
    });
    return Object.keys(owner).map(function (k) {
      return { playerKey: k, videos: owner[k] };
    }).sort(function (a, b) { return b.videos.length - a.videos.length; });
  }

  /* 缓存里有没有 matchKey 标注（爬虫重跑前没有）→ 调用方据此决定是否走过渡期的旧逻辑 */
  var matchRefsFlag = null;
  function hasMatchRefs() {
    if (matchRefsFlag !== null) return matchRefsFlag;
    var feed = (VIDEOS.feed && VIDEOS.feed.players) || {};
    matchRefsFlag = Object.keys(feed).some(function (pk) {
      return (feed[pk] || []).some(function (g) { return !!g.matchKey; });
    }) || Object.keys(VIDEOS.players || {}).some(function (pk) {
      return (VIDEOS.players[pk] || []).some(function (v) { return !!v.matchKey; });
    });
    return matchRefsFlag;
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
    if (window.requestAnimationFrame) window.requestAnimationFrame(function () { refreshAllDots(container); });
    else refreshAllDots(container);
  }
  /* 分组红点：该组（md-vids-fold）内还有未读新视频吗，有就保留/补点，没了就消点 */
  function refreshGroupDot(group) {
    if (!group) return;
    var sum = group.querySelector("summary");
    if (!sum) return;
    var dot = group.querySelector(".vg-dot");
    if (group.querySelector(".vid-dot")) {
      if (!dot) {
        dot = document.createElement("span");
        dot.className = "vg-dot";
        dot.setAttribute("aria-label", "有新集锦");
        sum.insertBefore(dot, sum.firstChild);
      }
    } else if (dot) {
      dot.remove();
    }
  }
  /* 该球员名下还有未读新视频吗 → 刷新球员名字红点（点掉视频/一键已读后调用） */
  function refreshPlayerDots(container) {
    if (!container) return;
    var players = [];
    if (container.classList && container.classList.contains("hl-player")) players.push(container);
    Array.prototype.forEach.call(container.querySelectorAll(".hl-player"), function (p) { players.push(p); });
    players.forEach(function (player) {
      var btn = player.querySelector(".hl-name-btn");
      if (!btn) return;
      var stillNew = !!player.querySelector(".vid-dot");
      if (stillNew) {
        if (!btn.classList.contains("hl-new")) {
          btn.classList.add("hl-new");
          if (!btn.querySelector(".hl-dot")) {
            var d = document.createElement("span");
            d.className = "hl-dot";
            d.setAttribute("aria-label", "有新集锦");
            btn.appendChild(d);
          }
        }
      } else {
        btn.classList.remove("hl-new");
        var d = btn.querySelector(".hl-dot");
        if (d) d.remove();
      }
    });
  }
  /* 统一刷新：单卡点掉后刷新所在分组+球员红点；容器则全刷 */
  function refreshAllDots(el) {
    if (!el) return;
    if (el.classList && el.classList.contains("vid-card")) {
      refreshGroupDot(el.closest ? el.closest(".md-vids-fold") : null);
      refreshPlayerDots(el.closest ? el.closest(".hl-player") : null);
      return;
    }
    Array.prototype.forEach.call(el.querySelectorAll(".md-vids-fold"), refreshGroupDot);
    refreshPlayerDots(el);
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

  /* ═══ 标题分类：整场比赛 vs 球员个人 ═══
     match-detail.js（比赛弹窗的分区）与 highlights.js（集锦页的兜底过滤）共用这一份，
     避免三处各写一套正则各自漂移。纯函数，不读任何缓存，可随处调用。

     两条实测反例决定了正则的边界，改之前先看一眼：
       · 别把裸 highlights 当成全场标记 —— players 桶里有
         "Barca Atletic 1-0 CE Europa | Highlights | Ebrima Shines | Aziz Issah" 这条球员集锦。
       · 别把 live match 当成全场标记 —— 直播流目前按维护者的选择留在全场区。
       · 「全触球集锦」是球员集锦（如"加里巴VS萨瓦德尔 加泰杯决赛全触球集锦"），
         所以只认「全场」，不要放宽成 /全.集锦/ 之类。 */
  var RX_FULL_MATCH = /全场|回放|完整|比赛录像|full ?match|full ?game|live ?stream|watch ?live|res[uú]m|all ?goals|高光/i;
  var RX_PLAYER_CLIP = /个人|精彩集锦|个人集锦|skills|reel|debut|首秀|equalizer/i;
  function isFullMatchTitle(t) { return RX_FULL_MATCH.test(String(t || "")); }
  function isPlayerClipTitle(t) { return RX_PLAYER_CLIP.test(String(t || "")); }

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
    refreshAllDots(card);
    openPlayer(vid, card.getAttribute("data-video-site") || "yt");
  });

  window.VideosUI = {
    resolve: resolve,
    feedFor: feedFor,
    videosForMatch: videosForMatch,
    hasMatchRefs: hasMatchRefs,
    videoCardHtml: videoCardHtml,
    groupHtml: groupHtml,
    isFullMatchTitle: isFullMatchTitle,
    isPlayerClipTitle: isPlayerClipTitle,
    openPlayer: openPlayer,
    closePlayer: closePlayer,
    markAllRead: vMarkAllRead,
    attachReadAll: vAttachReadAll,
    vidIsNew: vIsNew
  };
})();
