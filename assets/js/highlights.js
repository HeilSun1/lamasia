/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 集锦汇总页渲染（highlights.html）
   ─────────────────────────────────────────────────────────────
   汇总每位球员的「赛程相关个人集锦」（players 段，按已完赛分组）
   与「非赛程集锦」（feed.players 段），按梯队分节。
   同一球员跨梯队（如 B队+U19）合并；视频按 videoId 去重、同比赛合并；
   点球员名弹球员卡片。
   复用：VideosUI.feedFor / resolve / videoCardHtml（videos-ui.js）、
         PlayerCard.findByKey / open（player-card.js）。
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function normKey(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "");
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmtMd(ts) {
    var d = new Date(parseInt(ts, 10) * 1000 + 8 * 3600 * 1000);
    return pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  }
  function matchDateStr(ts) {
    var d = new Date(parseInt(ts, 10) * 1000 + 8 * 3600 * 1000);
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  }
  function matchLabel(mt) {
    var sc = (mt.hs != null && mt.as != null && mt.hs !== "" && mt.as !== "") ? " " + mt.hs + ":" + mt.as : "";
    return (mt.comp ? mt.comp + " · " : "") + fmtMd(mt.start) + " · " + (mt.home || "") + sc + " " + (mt.away || "");
  }

  var wrap = document.getElementById("hl-list");
  if (!wrap || !window.DQD_VIDEOS_CACHE || !window.VideosUI) return;
  var CACHE = window.DQD_VIDEOS_CACHE;
  var feed = (CACHE.feed && CACHE.feed.players) || {};
  var schedPlayers = CACHE.players || {};

  var TIER_ORDER = { b: 0, u19: 1, u18: 2, u16: 3, u15: 4, u14: 5, other: 9 };
  var TIER_LABEL = {
    b: "预备队 · Barça Atlètic",
    u19: "U19 · Juvenil A",
    u18: "U18 · Juvenil B",
    u16: "U16 · Cadete A",
    u15: "U15 · Cadete B",
    u14: "U14 · Infantil A",
    other: "其他"
  };
  var LOCAL_TIER = {
    "juvenil-a": "u19", "juvenil-b": "u18", cadete: "u16",
    "cadete-b": "u15", infantil: "u14", "infantil-b": "u14"
  };
  /* 键 → 展示梯队：sf:{tier}:{id} / b:{id} / local:{tier}:{name} */
  function tierOf(k) {
    var m = /^sf:([a-z0-9]+):\d+$/.exec(k);
    if (m) return m[1];
    if (/^b:\d+$/.test(k)) return "b";
    var l = /^local:([a-z0-9-]+):/.exec(k);
    if (l) return LOCAL_TIER[l[1]] || "other";
    return "other";
  }

  // 已完赛列表（Sofascore 缓存），供赛程集锦按最近比赛分组
  var SF_CFG = { b: "DQD_BARCA_ATLETIC_SF_CACHE", u19: "DQD_U19_CACHE", u18: "DQD_U18_CACHE", u16: "DQD_U16_CACHE" };
  var ended = [];
  Object.keys(SF_CFG).forEach(function (tier) {
    var c = window[SF_CFG[tier]];
    (c && Array.isArray(c.matches) ? c.matches : []).forEach(function (mt) {
      if (mt.status === "Ended" && mt.start) {
        ended.push({ tier: tier, start: parseInt(mt.start, 10) * 1000, label: matchLabel(mt), dateStr: matchDateStr(mt.start) });
      }
    });
  });

  // 赛程相关个人视频 → 按 ±14 天内最近的已完赛分组
  function groupSched(videos, tier) {
    var groups = [], unmatched = [];
    videos.forEach(function (v) {
      var vd = Date.parse(v.published + "T00:00:00Z");
      if (!vd) { unmatched.push(v); return; }
      var best = null, bestDiff = Infinity;
      ended.forEach(function (em) {
        if (em.tier !== tier) return;
        var diff = Math.abs(em.start - vd);
        if (diff <= 14 * 864e5 && diff < bestDiff) { bestDiff = diff; best = em; }
      });
      if (best) {
        var hit = null;
        for (var i = 0; i < groups.length; i++) if (groups[i].label === best.label) { hit = groups[i]; break; }
        if (hit) hit.videos.push(v);
        else groups.push({ date: best.dateStr, label: best.label, match: true, videos: [v] });
      } else unmatched.push(v);
    });
    return { groups: groups, unmatched: unmatched };
  }

  // 全场/直播类不进个人集锦（数据侧已过滤，这里兜底）
  function isFullMatch(t) {
    t = String(t || "").toLowerCase();
    return /全场|回放|完整|比赛录像|full ?match|full ?game|live ?stream|watch ?live/.test(t);
  }
  function cleanVideos(list) {
    return (list || []).filter(function (v) { return !isFullMatch(v.title); });
  }

  // ① 收集条目（feed 段 + players 段）
  var entries = [];
  var seenKey = {};
  function addEntry(k) {
    if (!k || seenKey[k]) return;
    seenKey[k] = true;
    var groups = [];
    window.VideosUI.feedFor(k).forEach(function (g) {
      var list = cleanVideos(g.videos);
      if (list.length) groups.push({ date: g.date, label: g.label, match: !!g.opp, videos: list });
    });
    var m = /^sf:([a-z0-9]+):(\d+)$/.exec(k);
    if (m) {
      var sg = groupSched(cleanVideos(window.VideosUI.resolve("players", k)), m[1]);
      groups = groups.concat(sg.groups);
      if (sg.unmatched.length) groups.push({ date: "", label: "📹 其他 / 未匹配到赛程", match: false, videos: sg.unmatched });
    }
    if (!groups.length) return;
    var rec = (window.PlayerCard && window.PlayerCard.findByKey(k)) || null;
    entries.push({
      key: k,
      tier: tierOf(k),
      groups: groups,
      nameZh: (rec && rec.nameZh) || "",
      nameEn: (rec && rec.nameEn) || k,
      team: (rec && rec.team) || ""
    });
  }
  Object.keys(feed).forEach(addEntry);
  Object.keys(schedPlayers).forEach(addEntry);

  // ② 按规范化英文名合并同一球员（跨梯队去重）
  var byName = {};
  entries.forEach(function (e) {
    var nm = normKey(e.nameEn);
    if (!byName[nm]) byName[nm] = { zh: "", en: "", order: 9, key: "", teams: {}, groups: [] };
    var o = byName[nm];
    if (!o.zh && e.nameZh) o.zh = e.nameZh;
    if (!o.en) o.en = e.nameEn;
    var ord = TIER_ORDER[e.tier] != null ? TIER_ORDER[e.tier] : 9;
    if (ord < o.order) { o.order = ord; o.key = e.key; }   // 主梯队 = 最高级
    if (e.team) o.teams[e.team] = true;
    o.groups = o.groups.concat(e.groups);
  });

  // ③ 合并分组：videoId 去重 + 同比赛分组合并 + 按日期倒序
  function mergeGroups(groups) {
    var seen = {}, out = [];
    groups.forEach(function (g) {
      var list = [];
      g.videos.forEach(function (v) {
        if (!v || !v.videoId || seen[v.videoId]) return;
        seen[v.videoId] = true;
        list.push(v);
      });
      if (!list.length) return;
      var hit = null;
      for (var i = 0; i < out.length; i++) {
        if (out[i].label === g.label) { hit = out[i]; break; }
      }
      if (hit) hit.videos = hit.videos.concat(list);
      else out.push({ date: g.date || "", label: g.label, match: !!g.match, videos: list });
    });
    // 同日比赛组合并（中文/英文同场：开罗国民 与 Al Ahly 归一组）
    var merged = [];
    out.forEach(function (g) {
      var hit = null;
      if (g.match) {
        for (var i = 0; i < merged.length; i++) {
          if (merged[i].match && merged[i].date === g.date) { hit = merged[i]; break; }
        }
      }
      if (hit) {
        if (g.videos.length > hit.videos.length) hit.label = g.label;   // 标签用视频多的那组
        hit.videos = hit.videos.concat(g.videos);
      } else merged.push(g);
    });
    merged.sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0); });
    return merged;
  }

  // ④ 按主梯队分组
  var byTier = {};
  Object.keys(byName).forEach(function (nm) {
    var o = byName[nm];
    var groups = mergeGroups(o.groups);
    if (!groups.length) return;
    var tier = null;
    Object.keys(TIER_ORDER).forEach(function (t) { if (TIER_ORDER[t] === o.order) tier = t; });
    var p = {
      name: o.zh || o.en,
      key: o.key,
      tier: tier,
      teams: Object.keys(o.teams),
      groups: groups,
      count: groups.reduce(function (s, g) { return s + g.videos.length; }, 0)
    };
    (byTier[p.tier] = byTier[p.tier] || []).push(p);
  });

  // ⑤ 渲染
  var tierNames = Object.keys(TIER_ORDER).filter(function (t) { return byTier[t]; });
  var totalP = 0, totalV = 0, html = "";
  tierNames.forEach(function (t) {
    var players = byTier[t].sort(function (a, b) { return b.count - a.count; });
    totalP += players.length;
    html += '<div class="hl-tier-section"><div class="hl-tier-title">' + esc(TIER_LABEL[t]) + "</div>";
    players.forEach(function (p) {
      totalV += p.count;
      html += '<details class="dqd-group hl-player">' +
        "<summary>" +
          '<span class="hl-left">' +
            '<button class="hl-name-btn" type="button" data-pc-open="' + esc(p.key) + '">' + esc(p.name) + "</button>" +
            (p.teams.length ? '<span class="hl-tier">' + esc(p.teams.join(" · ")) + "</span>" : "") +
          "</span>" +
          '<span class="dqd-side"><span class="dqd-count">' + p.count + ' 条</span><span class="dqd-state"></span></span>' +
        "</summary>" +
        '<div class="dqd-body">' +
          p.groups.map(function (g) {
            var pre = g.label.indexOf("📹") === 0 ? "" : "⚽ ";
            return '<details class="md-vids-fold hl-match">' +
              "<summary>" + pre + esc(g.label) + ' <span class="vid-count">' + g.videos.length + "</span></summary>" +
              '<div class="md-vids-fold-body"><div class="vid-grid">' + g.videos.map(window.VideosUI.videoCardHtml).join("") + "</div></div></details>";
          }).join("") +
        "</div>" +
      "</details>";
    });
    html += "</div>";
  });

  var empty = document.getElementById("hl-empty");
  var countEl = document.getElementById("hl-count");
  if (totalP) {
    wrap.innerHTML = html;
    if (empty) empty.style.display = "none";
    if (countEl) countEl.textContent = totalP + " 名球员 · " + totalV + " 条视频";
  } else if (empty) {
    empty.style.display = "";
  }

  // ⑥ 点球员名 → 弹球员卡片（阻止 details 折叠切换）
  document.addEventListener("click", function (e) {
    var btn = e.target && e.target.closest ? e.target.closest(".hl-name-btn") : null;
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var key = btn.getAttribute("data-pc-open");
    if (key && window.PlayerCard) window.PlayerCard.open(key);
  });
})();
