/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 集锦汇总页渲染（highlights.html）
   ─────────────────────────────────────────────────────────────
   遍历 DQD_VIDEOS_CACHE.feed.players（非赛程集锦，每日更新）。
   按梯队分节；同一球员跨梯队（如 B队+U19）合并为一组；
   视频按 videoId 去重、同比赛分组合并；点球员名弹球员卡片。
   复用：VideosUI.feedFor / videoCardHtml（videos-ui.js）、
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

  var wrap = document.getElementById("hl-list");
  if (!wrap || !window.DQD_VIDEOS_CACHE || !window.VideosUI) return;

  var feed = (window.DQD_VIDEOS_CACHE.feed && window.DQD_VIDEOS_CACHE.feed.players) || {};
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
  /* feed 键 → 展示梯队：sf:{tier}:{id} / b:{id} / local:{tier}:{name} */
  function tierOf(k) {
    var m = /^sf:([a-z0-9]+):\d+$/.exec(k);
    if (m) return m[1];
    if (/^b:\d+$/.test(k)) return "b";
    var l = /^local:([a-z0-9-]+):/.exec(k);
    if (l) return LOCAL_TIER[l[1]] || "other";
    return "other";
  }

  // ① 收集每个 feed 键的信息
  var entries = [];
  Object.keys(feed).forEach(function (k) {
    var groups = window.VideosUI.feedFor(k);
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
  });

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
      else out.push({ date: g.date || "", label: g.label, videos: list });
    });
    out.sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0); });
    return out;
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
            return '<details class="md-vids-fold hl-match">' +
              "<summary>⚽ " + esc(g.label) + ' <span class="vid-count">' + g.videos.length + "</span></summary>" +
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
