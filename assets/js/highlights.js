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

  var deckEl = document.getElementById("hl-deck");
  var tabsWrap = document.getElementById("hl-deck-tabs");
  var stage = document.getElementById("hl-deck-stage");
  if (!deckEl || !tabsWrap || !stage || !window.DQD_VIDEOS_CACHE || !window.VideosUI) return;
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
    u14: "U14–U13 · Infantil A/B/C",
    other: "其他"
  };
  var LOCAL_TIER = {
    "juvenil-a": "u19", "juvenil-b": "u18", cadete: "u16",
    "cadete-b": "u15", infantil: "u14", "infantil-b": "u14", "infantil-c": "u14"
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
  var B_KEYS = { b: "sfb:", u19: "sofascore:", u18: "sofascore:", u16: "sofascore:" };
  var ended = [];
  var endedByKey = {};   // 比赛键 → 该场分组信息（视频带 matchKey 时直接认键，不再按日期猜）
  Object.keys(SF_CFG).forEach(function (tier) {
    var c = window[SF_CFG[tier]];
    (c && Array.isArray(c.matches) ? c.matches : []).forEach(function (mt) {
      if (mt.status === "Ended" && mt.start) {
        var em = { tier: tier, start: parseInt(mt.start, 10) * 1000, label: matchLabel(mt), dateStr: matchDateStr(mt.start) };
        ended.push(em);
        if (mt.id != null) endedByKey[B_KEYS[tier] + mt.id] = em;
      }
    });
  });

  // 赛程相关个人视频 → 分组。
  // 有 matchKey（爬虫标注）就认键；没有才退回「±14 天内最近的已完赛」的旧猜法。
  function groupSched(videos, tier) {
    var groups = [], unmatched = [];
    videos.forEach(function (v) {
      var em = v.matchKey ? endedByKey[v.matchKey] : null;
      if (!em) {
        if (v.matchKey) { unmatched.push(v); return; }   // 标注了但该场不在缓存 → 不瞎猜
        var vd = Date.parse(v.published + "T00:00:00Z");
        if (!vd) { unmatched.push(v); return; }
        var best = null, bestDiff = Infinity;
        ended.forEach(function (e2) {
          if (e2.tier !== tier) return;
          var diff = Math.abs(e2.start - vd);
          if (diff <= 14 * 864e5 && diff < bestDiff) { bestDiff = diff; best = e2; }
        });
        em = best;
      }
      if (em) {
        var hit = null;
        for (var i = 0; i < groups.length; i++) if (groups[i].label === em.label) { hit = groups[i]; break; }
        if (hit) hit.videos.push(v);
        else groups.push({ date: em.dateStr, label: em.label, match: true, videos: [v] });
      } else unmatched.push(v);
    });
    return { groups: groups, unmatched: unmatched };
  }

  // 全场/直播类不进个人集锦（数据侧已过滤，这里兜底）。
  // 判据与比赛弹窗的分区共用一份，见 videos-ui.js 的 isFullMatchTitle。
  function isFullMatch(t) {
    return window.VideosUI.isFullMatchTitle(t);
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
    if (!byName[nm]) byName[nm] = { zh: "", en: "", order: 9, key: "", teams: {}, keys: {}, names: {}, groups: [] };
    var o = byName[nm];
    if (!o.zh && e.nameZh) o.zh = e.nameZh;
    if (!o.en) o.en = e.nameEn;
    var ord = TIER_ORDER[e.tier] != null ? TIER_ORDER[e.tier] : 9;
    if (ord < o.order) { o.order = ord; o.key = e.key; }   // 主梯队 = 最高级
    if (e.team) o.teams[e.team] = true;
    o.keys[e.key] = true;
    if (e.nameEn) o.names[e.nameEn] = true;
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
      nameEn: o.en,
      keys: Object.keys(o.keys),
      names: Object.keys(o.names),
      tier: tier,
      teams: Object.keys(o.teams),
      groups: groups,
      count: groups.reduce(function (s, g) { return s + g.videos.length; }, 0)
    };
    (byTier[p.tier] = byTier[p.tier] || []).push(p);
  });

  // ⑤ 渲染：与「比赛信息」页同一套 deck 交互。
  //    顶部吸顶页签（全部 + 各梯队），同一时间只显示一张卡片；
  //    卡片内用表格式行展示球员，点行展开该球员的比赛分组，再点分组出视频。
  var TIER_CHIP = { b: "B队", u19: "U19", u18: "U18", u16: "U16", u15: "U15", u14: "U14", other: "其他" };
  var TIER_ICO = { b: "🟡🔵", u19: "🎓", u18: "🎓", u16: "🎓", u15: "🎓", u14: "🎓", other: "⚽" };
  var tierNames = Object.keys(TIER_ORDER).filter(function (t) { return byTier[t]; });
  var totalP = 0, totalV = 0;
  tierNames.forEach(function (t) {
    totalP += byTier[t].length;
    byTier[t].forEach(function (p) { totalV += p.count; });
  });

  function tierVideos(t) {
    return byTier[t].reduce(function (s, p) { return s + p.count; }, 0);
  }
  function hasNewVideos(p) {
    return p.groups.some(function (g) {
      return g.videos.some(function (v) { return window.VideosUI && window.VideosUI.vidIsNew(v.published, v.videoId); });
    });
  }
  function initialsOf(name) {
    var s = String(name || "");
    if (/[一-鿿]/.test(s)) return s.charAt(0);
    return s.split(/\s+/).filter(Boolean).slice(0, 2)
      .map(function (w) { return w.charAt(0); }).join("").toUpperCase();
  }
  // 球员行下的比赛分组（沿用原来的折叠样式）
  function groupFoldsHtml(p) {
    return p.groups.map(function (g) {
      var pre = g.label.indexOf("📹") === 0 ? "" : "⚽ ";
      var gNew = g.videos.some(function (v) { return window.VideosUI && window.VideosUI.vidIsNew(v.published, v.videoId); });
      return '<details class="md-vids-fold hl-match"' + (gNew ? ' data-gnew="1"' : "") + ">" +
        "<summary>" + (gNew ? '<span class="vg-dot" aria-label="有新集锦"></span>' : "") + pre + esc(g.label) +
          ' <span class="vid-count">' + g.videos.length + "</span></summary>" +
        '<div class="md-vids-fold-body"><div class="vid-grid">' +
          g.videos.map(window.VideosUI.videoCardHtml).join("") +
        "</div></div></details>";
    }).join("");
  }
  function playerRowsHtml(players) {
    return players.map(function (p) {
      // 主键可能没有照片（或 Sofascore 图 404），而该球员的名单键/别名键有照片：
      // 收集全部候选，src 用第一张，其余交给 PC_IMG_FALLBACK 逐张重试。
      var ph = (window.PlayerCard && window.PlayerCard.photosFor)
        ? window.PlayerCard.photosFor(p.key, p.names, p.keys)
        : [];
      var ini = esc(initialsOf(p.name));
      var av = ph.length
        ? '<span class="hl-p-av"><img src="' + esc(ph[0]) + '" alt="" loading="lazy" referrerpolicy="no-referrer"' +
          (ph.length > 1 ? ' data-alt="' + esc(ph.slice(1).join("|")) + '"' : "") +
          ' onerror="window.PC_IMG_FALLBACK(this)">' +
          '<span class="hl-p-ini" style="display:none">' + ini + "</span></span>"
        : '<span class="hl-p-av"><span class="hl-p-ini">' + ini + "</span></span>";
      var hasNew = hasNewVideos(p);
      return '<tr class="hl-prow">' +
        '<td class="hl-c-player"><span class="hl-p-main">' + av +
          '<button class="hl-name-btn' + (hasNew ? " hl-new" : "") + '" type="button" data-pc-open="' + esc(p.key) + '" title="点击查看球员卡片">' +
            esc(p.name) + (hasNew ? '<span class="hl-dot" aria-label="有新集锦"></span>' : "") +
          "</button></span></td>" +
        '<td class="hl-c-team">' + esc(p.teams.join(" · ")) + "</td>" +
        '<td class="hl-c-count"><b>' + p.count + "</b> 条</td>" +
        '<td class="hl-c-toggle"><span class="hl-caret">▸</span></td>' +
      "</tr>" +
      '<tr class="hl-prow-detail" hidden><td colspan="4"><div class="hl-groups">' + groupFoldsHtml(p) + "</div></td></tr>";
    }).join("");
  }
  function tierCardHtml(t) {
    var players = byTier[t].slice().sort(function (a, b) { return b.count - a.count; });
    return '<section class="panel deck-card" id="hl-sec-' + esc(t) + '" role="tabpanel">' +
      '<div class="panel-title-row"><h3>' + (TIER_ICO[t] || "🎓") + " " + esc(TIER_LABEL[t]) +
        ' <span class="tag">球员集锦</span></h3>' +
        '<span class="badge blue">' + players.length + " 名球员 · " + tierVideos(t) + " 条集锦</span></div>" +
      '<div class="p-body" style="margin-top:10px"><div class="table-wrap"><table class="hl-table">' +
        "<thead><tr><th>球员</th><th>梯队</th><th>集锦</th><th></th></tr></thead><tbody>" +
        playerRowsHtml(players) + "</tbody></table></div></div></section>";
  }

  var summaryRows = tierNames.map(function (t) {
    return '<tr class="hl-tier-row" data-target="hl-sec-' + esc(t) + '">' +
      '<td class="hl-c-tier"><span class="hl-tier-ico">' + (TIER_ICO[t] || "🎓") + "</span><b>" + esc(TIER_LABEL[t]) + "</b></td>" +
      '<td class="hl-c-count"><b>' + byTier[t].length + "</b> 名</td>" +
      '<td class="hl-c-count"><b>' + tierVideos(t) + "</b> 条</td>" +
      '<td class="hl-c-toggle">查看 →</td></tr>';
  }).join("");

  tabsWrap.innerHTML = [{ id: "all", ico: "🎥", label: "全部", n: totalP }]
    .concat(tierNames.map(function (t) {
      return { id: t, ico: TIER_ICO[t] || "🎓", label: TIER_CHIP[t] || t, n: byTier[t].length };
    }))
    .map(function (d, i) {
      return '<button type="button" class="deck-tab' + (i === 0 ? " is-active" : "") + '" role="tab" aria-selected="' + (i === 0) +
        '" data-target="hl-sec-' + esc(d.id) + '"><span class="dt-ico">' + d.ico + "</span>" + esc(d.label) +
        ' <span class="hl-tab-n">' + d.n + "</span></button>";
    }).join("");

  stage.innerHTML =
    '<section class="panel deck-card is-active" id="hl-sec-all" role="tabpanel">' +
      '<div class="panel-title-row"><h3>🎥 全部梯队 <span class="tag">点梯队查看球员集锦</span></h3>' +
        '<span class="badge gray">' + totalP + " 名球员 · " + totalV + " 条集锦</span></div>" +
      '<div class="p-body" style="margin-top:10px"><div class="table-wrap"><table class="hl-table hl-summary">' +
        "<thead><tr><th>梯队</th><th>球员</th><th>集锦</th><th></th></tr></thead><tbody>" +
        summaryRows + "</tbody></table></div></div></section>" +
    tierNames.map(tierCardHtml).join("");

  var empty = document.getElementById("hl-empty");
  if (!totalP) {
    deckEl.style.display = "none";
    if (empty) empty.style.display = "";
    return;
  }
  if (empty) empty.style.display = "none";
  deckEl.classList.add("is-ready");
  if (window.VideosUI.attachReadAll) window.VideosUI.attachReadAll(stage);

  /* ── deck 切换 / 行展开 ── */
  var cards = Array.prototype.slice.call(stage.querySelectorAll(".deck-card"));
  var tabs = Array.prototype.slice.call(tabsWrap.querySelectorAll(".deck-tab"));
  var posEl = document.getElementById("hl-deck-pos");
  var prevBtn = document.getElementById("hl-deck-prev");
  var nextBtn = document.getElementById("hl-deck-next");
  var topBtn = document.getElementById("hl-deck-top");
  var current = 0;

  function indexOfCard(id) {
    for (var i = 0; i < cards.length; i++) if (cards[i].id === id) return i;
    return -1;
  }
  function syncTabs(i) {
    tabs.forEach(function (tab) {
      var on = indexOfCard(tab.getAttribute("data-target")) === i;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      if (on) {
        // 页签条横向滚到可见（不触发整页纵向滚动）
        var left = tab.offsetLeft, right = left + tab.offsetWidth;
        if (left < tabsWrap.scrollLeft) tabsWrap.scrollTo({ left: Math.max(0, left - 8), behavior: "smooth" });
        else if (right > tabsWrap.scrollLeft + tabsWrap.clientWidth) {
          tabsWrap.scrollTo({ left: right - tabsWrap.clientWidth + 8, behavior: "smooth" });
        }
      }
    });
  }
  function show(i, dir) {
    i = Math.max(0, Math.min(cards.length - 1, i));
    var next = cards[i];
    if (i !== current) {
      next.classList.remove("is-active", "from-left", "from-right");
      void next.offsetWidth;
      next.classList.add(dir < 0 ? "from-left" : "from-right");
    }
    cards.forEach(function (c, n) {
      c.classList.toggle("is-active", n === i);
      c.setAttribute("aria-hidden", n === i ? "false" : "true");
    });
    current = i;
    syncTabs(i);
    if (posEl) posEl.textContent = (i + 1) + " / " + cards.length;
    if (prevBtn) prevBtn.disabled = i === 0;
    if (nextBtn) nextBtn.disabled = i === cards.length - 1;
  }
  function userShow(i, dir) {
    show(i, dir);
    var navH = window.innerWidth <= 680 ? 48 : 60;
    var top = deckEl.getBoundingClientRect().top;
    if (top < navH) window.scrollTo({ top: Math.max(0, window.pageYOffset + top - navH - 8), behavior: "smooth" });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var i = indexOfCard(tab.getAttribute("data-target"));
      if (i >= 0) userShow(i, i > current ? 1 : -1);
    });
  });
  if (prevBtn) prevBtn.addEventListener("click", function () { userShow(current - 1, -1); });
  if (nextBtn) nextBtn.addEventListener("click", function () { userShow(current + 1, 1); });
  if (topBtn) topBtn.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });

  // 键盘 ←→（输入框里打字时不抢键）
  document.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && t.closest && t.closest("input, textarea, select, [contenteditable='true']")) return;
    e.preventDefault();
    if (e.key === "ArrowLeft") userShow(current - 1, -1);
    else userShow(current + 1, 1);
  });

  // 点摘要行 → 切到对应梯队卡；点球员行 → 展开/收起比赛分组；点名字 → 弹球员卡（交给下方全局处理）
  stage.addEventListener("click", function (e) {
    if (!e.target || !e.target.closest) return;
    if (e.target.closest(".hl-name-btn")) return;
    var tierRow = e.target.closest(".hl-tier-row");
    if (tierRow) {
      var ti = indexOfCard(tierRow.getAttribute("data-target"));
      if (ti >= 0) userShow(ti, ti > current ? 1 : -1);
      return;
    }
    var row = e.target.closest(".hl-prow");
    if (!row) return;
    var det = row.nextElementSibling;
    if (!det || !det.classList.contains("hl-prow-detail")) return;
    var open = det.hidden;
    det.hidden = !open;
    row.classList.toggle("is-open", open);
  });

  show(0, 0);

  // ⑥ 点球员名 → 弹球员卡片（阻止该行展开/收起）
  document.addEventListener("click", function (e) {
    var btn = e.target && e.target.closest ? e.target.closest(".hl-name-btn") : null;
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var key = btn.getAttribute("data-pc-open");
    if (key && window.PlayerCard) window.PlayerCard.open(key);
  });
})();
