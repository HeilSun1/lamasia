/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 比赛详情弹窗
   ─────────────────────────────────────────────────────────────
   依赖：各赛程渲染脚本把比赛对象写入 window.LAMASIA_MATCHES
     key = "{source}:{matchId}"（source = sofascore / dqd）
   行为：
     1. 点击带 [data-match-key] 的比赛行 → 弹出该场详情
     2. 头部信息立即从注册表渲染（离线可用）
     3. sofascore 场次优先读每日缓存中的详情（线上/离线均可用；
        线上 GitHub Pages 域直连 Sofascore 会被反爬拦截，故详情须来自缓存）
     4. 缓存无该场时尽力实时拉取（本地 file:// 等可直连场合生效），
        失败则保留头部 + 显示提示 + 原站外链
     5. dqd 场次显示对阵信息 + 「在懂球帝查看」外链
   关闭：✕ 按钮 / 遮罩点击 / Esc（与照片灯箱交互一致）
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var REG = (window.LAMASIA_MATCHES = window.LAMASIA_MATCHES || {});
  var API = "https://www.sofascore.com/api/v1";
  var detailCache = {};            // 会话内按 event id 缓存拉取结果，避免重复请求
  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function initials(name) {
    return String(name || "").split(/[\s.]+/).filter(Boolean).slice(0, 2)
      .map(function (w) { return w[0].toUpperCase(); }).join("");
  }

  /* epoch 秒 → 北京时间 "YYYY-MM-DD HH:mm"（与 matches-upcoming.js 一致，UTC+8） */
  function bj(ms) {
    var d = new Date(parseInt(ms, 10) * 1000 + 8 * 3600 * 1000);
    if (isNaN(d.getTime())) return "";
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()) +
           " " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes());
  }

  /* 比赛状态 → 中文 */
  function statusZh(m) {
    var s = String(m.status || "");
    if (s === "Ended" || s === "Played") return "已完场";
    if (s === "Not started" || s === "Fixture") return "未开赛";
    if (/live|ing|进行/i.test(s)) return "进行中";
    return s || "";
  }

  /* 是否展示比分（未开赛显示 vs） */
  function scoreOf(m) {
    if (statusZh(m) === "未开赛") return "vs";
    return esc(m.hs || "0") + " : " + esc(m.as || "0");
  }

  function getJson(url) {
    return fetch(url, { credentials: "omit" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  /* 缓存里的详情各块以对象字面量嵌入（PS 侧原始 JSON 直接写入），直接用即可 */

  /* ═══ 弹窗骨架 ═══ */
  function ensureModal() {
    var el = $("lamasia-match-detail");
    if (el) return el;
    el = document.createElement("div");
    el.id = "lamasia-match-detail";
    el.className = "match-detail";
    el.innerHTML =
      '<div class="match-detail-inner">' +
        '<button class="match-detail-close" title="关闭">✕</button>' +
        '<div class="md-body"></div>' +
      "</div>";
    document.body.appendChild(el);
    el.addEventListener("click", function (e) {
      if (e.target === el || (e.target.classList && e.target.classList.contains("match-detail-close"))) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
    return el;
  }

  function close() {
    var el = $("lamasia-match-detail");
    if (el) el.classList.remove("open");
  }

  function teamSide(m, which) {
    var home = which === "home";
    var name = home ? m.home : m.away;
    var logo = home ? m.homeLogo : m.awayLogo;
    return '<div class="md-team">' +
      // 队徽加载失败时回退通用徽章，而不是直接隐藏（pulselive 的对手队徽是 403 防盗链）
      (logo ? '<img class="md-logo" src="' + esc(logo) + '" alt="' + esc(name || "") + '" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src=\'https://resources.fcbarcelona.pulselive.com/badges/club/40/default.png\'">' : "") +
      '<span class="md-name">' + esc(name || "") + "</span></div>";
  }

  function headerHtml(m) {
    var roundTxt = m.round ? " · R" + esc(m.round) : "";
    var kickoff = m.source === "dqd" ? (m.startText || "")
      : (m.source === "fcb" ? (m.tbd ? (m.date + " 待定") : bj(m.start)) : bj(m.start));
    return '<div class="md-head">' +
      '<div class="md-scorebar">' +
        teamSide(m, "home") +
        '<div class="md-mid">' +
          '<div class="md-score">' + scoreOf(m) + "</div>" +
          '<div class="md-kick">' + esc(kickoff) + "</div>" +
        "</div>" +
        teamSide(m, "away") +
      "</div>" +
      '<div class="md-meta">' +
        '<span class="md-comp">' + esc(m.comp || "") + roundTxt + "</span>" +
        '<span class="md-status">' + esc(statusZh(m)) + "</span>" +
      "</div>" +
    "</div>";
  }

  function footerHtml(m) {
    var url, label;
    if (m.source === "fcb") {
      url = "https://www.fcbarcelona.es/es/futbol/formativo-masculino/" + esc(m.slug || "") + "/calendario";
      label = "在巴塞罗那官网查看赛程";
    } else if (m.source === "dqd") {
      url = "https://www.dongqiudi.com/match/" + esc(m.match_id || m.id);
      label = "在懂球帝查看完整比赛";
    } else {
      url = "https://www.sofascore.com/event/" + esc(m.id);
      label = "在 Sofascore 查看完整比赛";
    }
    return '<div class="md-foot"><a class="md-link" href="' + url + '" target="_blank" rel="noopener">' + esc(label) + " →</a></div>";
  }

  /* ═══ 阵容 ═══ */
  var POS_ZH = { G: "门将", GK: "门将", D: "后卫", DF: "后卫", M: "中场", MF: "中场", F: "前锋", FW: "前锋" };
  function posZh(pos) {
    if (typeof pos === "string") return POS_ZH[pos.toUpperCase()] || pos;
    if (pos && pos.abbreviation) return POS_ZH[pos.abbreviation.toUpperCase()] || pos.abbreviation;
    return (pos && pos.translated) ? pos.translated : "";
  }

  /* ═══ 球员卡片入口（阵容/比赛进程里的巴萨球员名可点击弹卡）═══ */
  var curTier = "";   // 当前比赛的梯队（由 m.cacheRef 推出）
  var curMatch = null; // 当前比赛对象（视频/球员集锦用）
  var curMatchKey = ""; // 当前比赛键（"sfb:{id}" / "sofascore:{id}"），查本场球员集锦用
  var curNameMap = "";  // 只有「靠姓名映射卡片」的来源才置为梯队名（见 localKeyFor）
  /* 低龄梯队：Sofascore 卡键 → data.js 梯队名（手动补图的 local 键用） */
  var LOCAL_TIER = { u19: "juvenil-a", u18: "juvenil-b", u16: "cadete",
                     "cadete-b": "cadete-b", infantil: "infantil",
                     "infantil-b": "infantil-b", "infantil-c": "infantil-c" };
  var PHOTO_BASE = /\/teams\//.test(window.location.pathname) ? "../" : "";
  // 手动补的照片（photo-tool.html 写入的 local:{梯队}:{英文名归一化} 键）。
  // 必须排在上游头像前面：Sofascore 的低龄球员头像大量 404，手动补图就是用来盖掉它的。
  function localPhotoUrl(src) {
    if (!src) return "";
    return /^(https?:|data:|blob:)/.test(src) ? src : PHOTO_BASE + src.replace(/^\.\.\//, "");
  }
  function manualPhotoFor(p, isBarca) {
    if (!isBarca || !p || !p.name) return "";
    var t = LOCAL_TIER[curTier];
    if (!t) return "";
    // elfutbol 的姓名是 "Guardado Rodriguez, Alex"，data.js 是 "Álex Guardado"，
    // 不能拿原名直接归一化当键，必须走 localKeyFor 的双向前缀匹配。
    var lk = localKeyFor(p.name, t);
    var keys = [];
    if (p.id && curTier) keys.push(curTier + ":" + p.id);   // u18:{id} / u16:{id}
    if (lk) keys.push(lk);
    keys.push("local:" + t + ":" + normName(p.name));
    if (window.ManualPhoto) {
      for (var i = 0; i < keys.length; i++) {
        var src = window.ManualPhoto(keys[i]);
        if (src) return localPhotoUrl(src);
      }
    }
    // 没有手动补图 → 用 data.js 官方名单里现成的本地头像（p.img，如 U15 名单图）
    if (lk && window.PlayerCard) {
      var rec = window.PlayerCard.findByKey(lk);
      if (rec && rec.photo) return rec.photo;
    }
    return "";
  }
  function sfKey(pid) {
    return (curTier && pid) ? "sf:" + curTier + ":" + pid : "";
  }

  /* ── 按姓名映射回本站球员卡（elfutbol 这样只给姓名、没有球员 id 的来源用）──
     本站卡片键是 local:{梯队}:{归一化姓名}，而 data.js 名单是「名 + 首姓」缩写
     （"Álex Guardado"），elfutbol 给的是全名（"Guardado Rodriguez, Alex"）
     → 归一化后两边不会相等，故做「互为前缀」的双向匹配。 */
  // 注：归一化函数 normName 复用于下方的集锦分区段（同一 IIFE 内，靠函数提升可见）
  function localKeyFor(rawName, tierOverride) {
    var tier = tierOverride || curNameMap;
    if (!tier || !rawName || !window.PlayerCard || !window.PlayerCard.INDEX) return "";
    var n = String(rawName).trim();
    // "Surname1 Surname2, First" → "First Surname1 Surname2"
    var m = n.match(/^(.*?),\s*(.+)$/);
    var cands = [];
    if (m) cands.push(normName(m[2] + " " + m[1]));
    cands.push(normName(n));
    var pre = "local:" + tier + ":";
    var keys = Object.keys(window.PlayerCard.INDEX);
    for (var ci = 0; ci < cands.length; ci++) {
      var c = cands[ci];
      if (c.length < 6) continue;      // 太短容易误配（"Enzo" 这种）
      for (var i = 0; i < keys.length; i++) {
        if (keys[i].indexOf(pre) !== 0) continue;
        var tail = keys[i].slice(pre.length);
        if (tail.length >= 6 && (tail === c || c.indexOf(tail) === 0 || tail.indexOf(c) === 0)) return keys[i];
      }
    }
    // 兜底：按词匹配（容忍中间名）。elfutbol 写作 "Seijo Rigueira, Gael José"，
    // data.js 是 "Gael Seijo" —— 前缀法对不上，但 data.js 的两个词都在全名里。
    var rawToks = nameTokenList(n);
    if (m) rawToks = rawToks.concat(nameTokenList(m[1]), nameTokenList(m[2]));
    for (var k = 0; k < keys.length; k++) {
      if (keys[k].indexOf(pre) !== 0) continue;
      var rec = window.PlayerCard.INDEX[keys[k]];
      var lt = nameTokenList(rec && rec.nameEn);
      if (lt.length < 2) continue;
      var allIn = true;
      for (var ti = 0; ti < lt.length; ti++) {
        if (rawToks.indexOf(lt[ti]) === -1) { allIn = false; break; }
      }
      if (allIn) return keys[k];
    }
    return "";
  }
  // 该侧是否巴萨（只有巴萨一侧才做姓名映射，免得撞上对手的姓氏）
  function isBarcaSide(x) {
    return !!(curMatch && x.isHome !== undefined && (!!x.isHome === !!curMatch.isHome));
  }
  // 比赛进程里的球员名：有 id 走原路，没有则按姓名映射（同为 elfutbol 来源）
  function cardIp(p, x) {
    if (!p) return "";
    if (p.id) return cardA(p.id, p.name);
    if (p.dqdId) return cardAKey("b:" + p.dqdId, p.name);
    return cardAKey(isBarcaSide(x) ? localKeyFor(p.name) : "", p.name);
  }
  // 若该球员在本站卡片索引中（巴萨球员），包装成可点击入口；否则返回纯文本
  function cardA(pid, name) {
    return cardAKey(sfKey(pid), name);
  }
  // 同上，但直接给球员键（集锦条目可能挂在 local:/b: 键下，不只是 sf:）
  function cardAKey(key, name) {
    var txt = esc(name || "");
    if (key && window.PlayerCard && window.PlayerCard.findByKey(key)) {
      return '<span class="pc-link" data-player-key="' + esc(key) + '" title="点击查看球员卡片">' + txt + "</span>";
    }
    return txt;
  }

  function lineupSide(list, isBarca) {
    // Sofascore 阵容结构：home/away 是 { players:[...] } 对象，兼容直接传数组
    if (list && !Array.isArray(list) && list.players) list = list.players;
    if (!list || !list.length) return null;
    var starters = list.filter(function (x) { return !x.substitute; });
    var bench = list.filter(function (x) { return x.substitute; });
    function item(x) {
      var p = x.player || {};
      var pid = String(p.id || "");        // Sofascore 球员 id（懂球帝阵容需前端桥接才有）
      var photo = p.photo || "";           // 懂球帝 CDN 头像（桥不上时用它）
      var ini = esc(initials(p.name)) || "·";
      // 头像四级降级：⓪ 手动补图 → ① Sofascore id → ② 源自带 photo（懂球帝）→ ③ 首字母
      var manual = manualPhotoFor(p, isBarca);
      var img = manual || (pid ? "https://img.sofascore.com/api/v1/player/" + esc(pid) + "/image" : photo);
      var av = img
        ? '<img src="' + esc(img) + '" alt="' + esc(p.name || "") + '" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">' +
          '<span class="md-lu-ini" style="display:none">' + ini + "</span>"
        : '<span class="md-lu-ini">' + ini + "</span>";
      // 卡片键：优先 Sofascore 键；桥不上退回懂球帝名单键 b:{dqdId}（每日更新的名单，最可靠）；
      // 都没有则按姓名映射（elfutbol 来源）——只对巴萨一侧做，避免撞上对手同姓球员
      var ck = pid ? sfKey(pid) : (p.dqdId ? "b:" + p.dqdId : (isBarca ? localKeyFor(p.name) : ""));
      // Sofascore 名单里没有该球员（青年队名单变动频繁）→ 回退到 data.js 官方名单的 local 键，
      // 否则阵容里点名字没反应，手动补的头像也永远看不到。
      if (isBarca && (!ck || !(window.PlayerCard && window.PlayerCard.findByKey(ck)))) {
        ck = localKeyFor(p.name, LOCAL_TIER[curTier]) || ck;
      }
      return '<div class="md-lu-item">' +
        '<span class="md-lu-num">' + esc(x.jerseyNumber || "") + "</span>" +
        '<span class="md-lu-av">' + av + "</span>" +
        '<span class="md-lu-name">' + cardAKey(ck, p.name) + "</span>" +
        // 🎬 徽标：该球员本场有个人集锦，可点击直接播放
        (pid && matchPlayerVids[pid]
          ? '<button class="md-lu-hl" type="button" data-hl-pid="' + esc(pid) + '" title="本场有个人集锦，点击播放">🎬</button>'
          : "") +
        '<span class="md-lu-pos">' + esc(posZh(x.position)) + "</span>" +
      "</div>";
    }
    return '<div class="md-lu-side">' +
      (starters.length ? '<div class="md-lu-label">首发 · ' + starters.length + "</div>" + starters.map(item).join("") : "") +
      (bench.length ? '<div class="md-lu-label">替补 · ' + bench.length + "</div>" + bench.map(item).join("") : "") +
      "</div>";
  }

  function lineupsHtml(l) {
    var hasMatch = !!curMatch;
    var barcaHome = !!(curMatch && curMatch.isHome);
    var home = lineupSide(l.home, hasMatch && barcaHome);
    var away = lineupSide(l.away, hasMatch && !barcaHome);
    if (!home && !away) return "";
    if (!home) home = '<div class="md-lu-side md-empty">阵容未公布</div>';
    if (!away) away = '<div class="md-lu-side md-empty">阵容未公布</div>';
    return '<section class="md-sec"><h4>🧑‍🤝‍🧑 首发与替补</h4>' +
      '<div class="md-lu-grid">' + home + away + "</div></section>";
  }

  /* ═══ 比赛进程 ═══ */
  var REASON_ZH = { "Penalty": "点球", "Own goal": "乌龙球", "Header": "头球", "Free kick": "任意球", "Normal": "", "Kick": "", "Counter attack": "反击" };
  var GOAL_CLASS_ZH = { "penalty": "点球", "own_goal": "乌龙球", "header": "头球", "free_kick": "任意球", "direct_freekick": "任意球", "counter_attack": "反击", "shot": "" };
  function incidentIcon(x) {
    var t = x.incidentType;
    if (t === "goal" || t === "penalty") return "⚽";
    if (t === "card") {
      var c = String(x.incidentClass || x.reason || "").toLowerCase();
      // "card" = elfutbol 的中性牌（该站不区分黄/红）→ 用灰色方块，别假装是黄牌
      if (c === "card") return "▫";
      if (c.indexOf("red") !== -1) return c.indexOf("yellow") !== -1 ? "🟨🟥" : "🟥";
      return "🟨";
    }
    if (t === "yellowcard") return "🟨";
    if (t === "yellowredcard") return "🟨🟥";
    if (t === "redcard") return "🟥";
    if (t === "substitution") return "🔁";
    return "•";
  }
  function incidentText(x) {
    var pn = cardIp(x.player, x);
    if (x.incidentType === "goal" || x.incidentType === "penalty") {
      var why = "";
      if (x.reason && REASON_ZH[x.reason] != null) why = REASON_ZH[x.reason];
      else if (x.incidentClass && GOAL_CLASS_ZH[x.incidentClass] != null) why = GOAL_CLASS_ZH[x.incidentClass];
      else if (x.reason && x.reason !== "Normal" && x.reason !== "Kick") why = String(x.reason);
      // 懂球帝只有事件类型 + 比分（没有进球者）：空段一律丢掉，
      // 否则会渲染出 " · 黄牌" / 前导空格这种半截内容
      var parts = [];
      if (pn) parts.push(pn);
      if (why) parts.push("（" + esc(why) + "）");
      if (x.homeScore != null && x.awayScore != null) parts.push(x.homeScore + "-" + x.awayScore);
      return parts.join(" ") || "进球";
    }
    if (x.incidentType === "card") {
      var c = String(x.incidentClass || x.reason || "").toLowerCase();
      // "card" 是 elfutbol 的中性标记 —— 该站把黄/红牌都画成同一种灰块，分不出来，
      // 所以只标「牌」，不猜颜色（Sofascore / 懂球帝的数据仍是红/黄牌）
      var lbl = c === "card" ? "牌" : (c.indexOf("red") !== -1 ? "红牌" : "黄牌");
      return pn ? pn + " · " + lbl : lbl;
    }
    if (x.incidentType === "substitution") {
      var pin = cardIp(x.playerIn, x);
      var pout = cardIp(x.playerOut, x);
      return (pout ? "↓ " + pout : "") + (pin ? " ↑ " + pin : "");
    }
    return pn;
  }
  function incidentMin(x) {
    var t = x.time;
    if (x.addedTime) return esc(t) + "'+" + esc(x.addedTime);
    return esc(t) + "'";
  }

  function incidentsHtml(inc) {
    var list = Array.isArray(inc) ? inc : (inc && Array.isArray(inc.incidents) ? inc.incidents : []);
    var evs = list.filter(function (x) {
      return x && x.incidentType && x.incidentType !== "period" && x.incidentType !== "soccerPeriod" && x.incidentType !== "stoppage";
    });
    if (!evs.length) return "";
    var html = evs.map(function (x) {
      var side = x.isHome ? "home" : "away";
      return '<div class="md-ev md-ev--' + side + '">' +
        '<span class="md-ev-min">' + incidentMin(x) + "</span>" +
        '<span class="md-ev-ic">' + incidentIcon(x) + "</span>" +
        '<span class="md-ev-tx">' + incidentText(x) + "</span></div>";
    }).join("");
    return '<section class="md-sec"><h4>🎬 比赛进程</h4><div class="md-tl">' + html + "</div></section>";
  }

  /* ═══ 技术统计 ═══ */
  var STATS_ZH = {
    "Ball possession": "控球率", "Total shots": "射门", "Shots on goal": "射正",
    "Shots off goal": "射偏", "Blocked shots": "被封堵射门", "Shots inside box": "禁区内射门",
    "Shots outside box": "禁区外射门", "Corner kicks": "角球", "Fouls": "犯规",
    "Yellow cards": "黄牌", "Red cards": "红牌", "Offsides": "越位", "Free kicks": "任意球",
    "Goalkeeper saves": "门将扑救", "Total passes": "传球", "Accurate passes": "传球成功",
    "Big chances": "绝佳机会", "Hit woodwork": "击中门框", "Expected goals (xG)": "预期进球 (xG)",
    "Tackles": "抢断", "Interceptions": "拦截", "Clearances": "解围",
    "Aerials won": "争顶成功", "Ground duels won": "地面争抢成功", "Throw-ins": "界外球",
    "Total contests": "对抗", "Total duels won": "对抗成功", "Accurate long balls": "长传成功",
    "Accurate crosses": "传中成功", "Saves": "扑救", "Goal kicks": "球门球"
  };
  var GROUP_ZH = {
    "Match stats": "全场数据", "Match overview": "全场数据", "Team stats": "球队数据", "Attack": "进攻",
    "Discipline": "纪律", "Passes": "传球", "Defence": "防守", "Fair play": "公平竞赛", "Other": "其他"
  };
  /* 归一化技术统计为 [{name, items:[{name,home,away}]}]，兼容真实接口
     形状 { statistics:[ {period, groups:[{groupName, statisticsItems:[...]}]} ] } 与旧假设形状 */
  function normalizeStats(s) {
    var groups = [];
    if (!s) return groups;
    if (Array.isArray(s)) {
      s.forEach(function (per) {
        if (per && Array.isArray(per.statistics)) {
          per.statistics.forEach(function (g) {
            if (g && g.groupName) groups.push({ name: g.groupName, items: g.statistics });
          });
        } else if (per && per.groupName) {
          groups.push({ name: per.groupName, items: per.statisticsItems || per.statistics });
        }
      });
    } else if (Array.isArray(s.statistics)) {
      s.statistics.forEach(function (per) {
        (per.groups || []).forEach(function (g) {
          if (g && g.groupName) groups.push({ name: g.groupName, items: g.statisticsItems });
        });
      });
    }
    return groups;
  }
  function statsHtml(s) {
    var groups = normalizeStats(s);
    var sections = groups.map(function (g) {
      var stats = (g.items || []).filter(function (st) { return st && st.name; });
      if (!stats.length) return "";
      var gname = GROUP_ZH[g.name] || g.name || "";
      var rows = stats.map(function (st) {
        return "<tr>" +
          '<td class="md-st-v">' + esc(st.home == null ? "-" : st.home) + "</td>" +
          '<td class="md-st-n">' + esc(STATS_ZH[st.name] || st.name) + "</td>" +
          '<td class="md-st-v">' + esc(st.away == null ? "-" : st.away) + "</td></tr>";
      }).join("");
      return (gname ? '<div class="md-st-group">' + esc(gname) + "</div>" : "") +
        '<table class="md-st"><tbody>' + rows + "</tbody></table>";
    }).join("");
    return sections ? '<section class="md-sec"><h4>📊 技术统计</h4>' + sections + "</section>" : "";
  }

  /* ═══ 近期交锋 ═══ */
  function h2hHtml(h) {
    var html = "";
    // 交锋战绩（真实接口返回 teamDuel：主队胜/平/客队胜）
    if (h && h.teamDuel) {
      var td = h.teamDuel;
      var hw = td.homeWins != null ? td.homeWins : 0;
      var aw = td.awayWins != null ? td.awayWins : 0;
      var dr = td.draws != null ? td.draws : 0;
      if (hw + aw + dr > 0) {
        html += '<div class="md-h2h-duel">近年双方：主队胜 <b>' + esc(hw) + "</b> · 平 <b>" + esc(dr) +
                "</b> · 客队胜 <b>" + esc(aw) + "</b></div>";
      }
    }
    // 交锋列表（兼容 {home.matches}/{away.matches} 形状）
    var list = null;
    if (h && Array.isArray(h.matches)) list = h.matches;
    else if (h && h.home && Array.isArray(h.home.matches)) list = h.home.matches;
    else if (h && h.away && Array.isArray(h.away.matches)) list = h.away.matches;
    if (list && list.length) {
      var rows = list.slice(0, 6).map(function (e) {
        var ht = e.homeTeam || {}, at = e.awayTeam || {};
        var hs = (e.homeScore && e.homeScore.current) || 0;
        var as = (e.awayScore && e.awayScore.current) || 0;
        var tn = (e.tournament && e.tournament.name) || "";
        return "<tr>" +
          '<td class="num">' + esc(bj(e.startTimestamp)) + "</td>" +
          "<td>" + esc(tn) + "</td>" +
          "<td>" + esc(ht.name || "") + "</td>" +
          '<td class="num" style="text-align:center;width:52px">' + esc(hs) + ":" + esc(as) + "</td>" +
          "<td>" + esc(at.name || "") + "</td></tr>";
      }).join("");
      html += '<div class="table-wrap"><table class="roster-table"><thead><tr><th>时间</th><th>赛事</th><th>主队</th><th>比分</th><th>客队</th></tr></thead><tbody>' +
        rows + "</tbody></table></div>";
    }
    return html ? '<section class="md-sec"><h4>🤝 交锋</h4>' + html + "</section>" : "";
  }

  /* ═══ 视频集锦（videos-ui.js）═══ */

  /* 巴萨梯队对应的团队 id（判断本场巴萨是主/客）。
     ⚠️ 值是数组：B队的详情可能来自 Sofascore(24343) 或懂球帝(50001839)，两套 id 都要认。 */
  var TIER_TEAM = { b: ["24343", "50001839"], u19: ["90128"], u18: [], u16: [] };

  /* 🎥 全场集锦：直接展开显示；发布时间的逻辑校验——
     全场集锦必须在本场"开赛 ±2 天"到"赛后 14 天"内发布，否则判定为别的比赛 / 旧视频 / 直播流，不显示。
     下方 #md-player-videos 是本场球员个人集锦占位（lineups 加载后填充） */
  /* matches 桶由爬虫按场搜索落库，难免混进球员个人集锦（见下面 classifyMatchBucket 的说明）。
     分类要扫阵容名单，而阵容是异步到的，所以这里只做窗口过滤 + 暂存原始列表，
     先整块渲染出来，等阵容到位再由 renderMatchVideos 就地重排。 */
  var matchBucketStash = { key: "", list: [] };   // 带 key 是防串场：上一场的详情缓存迟到时 curMatchKey 已经变了
  var matchBucketFull = [];                       // 分类后留在「全场集锦」里的

  function matchVideosHtml(key) {
    matchBucketStash = { key: key, list: [] };
    matchBucketFull = [];
    var wrappers = '<div id="md-match-videos"></div><div id="md-player-videos"></div>';
    if (!window.VideosUI) return wrappers;
    var list = window.VideosUI.resolve("matches", key);
    var startMs = curMatch ? parseInt(curMatch.start, 10) * 1000 : 0;
    if (list.length && startMs) {
      var lo = startMs - 2 * 864e5, hi = startMs + 14 * 864e5;
      list = list.filter(function (v) {
        if (!v.published) return true;                       // 无发布时间的保守保留
        var t = Date.parse(v.published + "T00:00:00Z");
        return t >= lo && t <= hi;
      });
    }
    matchBucketStash.list = list;
    return '<div id="md-match-videos">' + window.VideosUI.groupHtml(list, "🎥 全场集锦") + "</div>" +
      '<div id="md-player-videos"></div>';
  }

  /* 本场球员个人集锦。两种取法：
     ① 有 matchKey 标注（爬虫重跑后）：直接问 VideosUI.videosForMatch(本场键) —— 精确到比赛，
        不依赖阵容，也不再拿发布日期猜。阵容只用来补 🎬 徽标和中文名。
     ② 没有标注（旧缓存过渡期）：退回原逻辑，但窗口从 ±14 天收窄到 ±4 天 ——
        实测 Aziz 那两条 08-19/08-20 的视频在 ±14 下会挂到 5 场比赛（3 场是错的），±4 下只剩正确的 1 场。
     结果写进 matchPlayerRecs（渲染用）与 matchPlayerVids（阵容 🎬 徽标按 pid 查用）。 */
  var matchPlayerRecs = [];        // [{ playerKey, pid, name, vids }]
  var matchPlayerVids = {};        // pid → rec（仅能对上阵容的）

  function pidOfKey(k) {
    var m = /^sf:[a-z0-9]+:(\d+)$/.exec(k || "");
    return m ? m[1] : "";
  }
  function normName(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "");
  }
  function nameTokenList(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 3; });
  }

  /* ═══ matches 桶再分配：全场集锦 / 球员个人集锦 ═══
     爬虫的「整场集锦」是按场搜索结果，只按队名 token + 日期 + 时长过滤，
     没有「这条是不是球员个人集锦」的判据，所以实测混进过：
       sfb:16741931 → 米尔扎·卡托维奇 vs UD Logrones B | … | 个人精彩集锦（B站）
       sfb:16655584 → Hafiz Gariba 🇬🇭 vs CE Sabadell …（这条无任何标记，只能靠扫阵容名单）
     这些视频只存在于 matches 桶（players / feed 里没有），所以只能搬过去，不能只过滤掉。
     分类结果并回 computeMatchPlayerVideos 的 recs，走它原有的合并 / videoId 去重。 */

  /* 用阵容名单扫标题：归一化后取最长的球员名子串，认不出返回 null。
     ⚠️ k.length >= 6 这道闸必须同时卡在入表和扫描两侧：normName 会把中文等非拉丁名
     整条抹成 ""，byName 里于是可能留下 "" 键，而 indexOf("") 恒为 0 ——
     那样每条无标记视频都会被算到同一个人头上。 */
  function scanLineupName(title, byName) {
    var t = normName(title), best = null;
    Object.keys(byName).forEach(function (k) {
      if (k.length < 6 || t.indexOf(k) === -1) return;
      if (!best || k.length > best.len) best = { len: k.length, rec: byName[k] };
    });
    return best ? best.rec : null;
  }

  /* 单条分类 → { kind:"full" } | { kind:"player", pid, name }。
     顺序是设计的一部分：
       ① 明确的全场标记优先 —— 「全场精彩集锦」是全场，不能被后面的「精彩集锦」抢走；
       ② 扫阵容名单 —— 也必须在个人分支里先查一次，否则同一个人会被拆成两块：
          sfb:16655584 的 "Hafiz Gariba 🇬🇭 vs CE Sabadell …" 无标记靠扫名字，
          同场的 "⚽️ Hafiz Gariba's equalizer …" 命中 equalizer 标记；
       ③ 有个人标记但认不出是谁 → 仍算个人（渲染成「其他」，不丢）；
       ④ 兜底成全场 —— 比赛桶里认不出来，宁可按比赛级展示，也不要伪造球员归属。 */
  function classifyMatchVideo(v, byName) {
    var t = String((v && v.title) || "");
    if (window.VideosUI.isFullMatchTitle(t)) return { kind: "full" };
    var hit = scanLineupName(t, byName);
    if (hit) return { kind: "player", pid: hit.pid, name: hit.name };
    if (window.VideosUI.isPlayerClipTitle(t)) return { kind: "player", pid: "", name: "" };
    return { kind: "full" };
  }

  /* matches 桶 → { full:[…], recs:[{playerKey,pid,name,videos}] }
     recs 与 VideosUI.videosForMatch() 同形状，直接 concat 进 recs 即可。 */
  function classifyMatchBucket(byName) {
    var full = [], recs = [], other = [], byKey = {}, order = [];
    matchBucketStash.list.forEach(function (v) {
      var c = classifyMatchVideo(v, byName);
      if (c.kind === "full") { full.push(v); return; }
      if (!c.pid) { other.push(v); return; }
      // 梯队未知（dqd: 场次等）时 sfKey 返回 ""，用伪键兜底，免得和下面的空键相撞
      var key = sfKey(c.pid) || ("pid:" + c.pid);
      if (!byKey[key]) { byKey[key] = { playerKey: key, pid: c.pid, name: c.name, videos: [] }; order.push(key); }
      byKey[key].videos.push(v);
    });
    order.forEach(function (k) { recs.push(byKey[k]); });
    // 认不出是谁的个人集锦也要能看：合成一条无键记录，排在有归属的球员之后。
    // playerKey 为空串是诚实的（确实没有键），cardAKey("", name) 会渲染成不可点的纯文本。
    if (other.length) recs.push({ playerKey: "", pid: "", name: "本场其他个人集锦", videos: other });
    return { full: full, recs: recs };
  }

  /* 🎥 全场集锦就地重渲染（分类结果可能晚于 open()，要等阵容） */
  function renderMatchVideos(body) {
    var wrap = body && body.querySelector("#md-match-videos");
    if (!wrap || !window.VideosUI) return;
    wrap.innerHTML = window.VideosUI.groupHtml(matchBucketFull, "🎥 全场集锦");
  }
  /* 阵容球员列表。能按 TIER_TEAM 认出巴萨侧就只取巴萨侧；认不出（u18/u16 的 TIER_TEAM 为空、
     或阵容未缓存）就把两队都收进来 —— 反正下面只按球员键/名字去对，不会错认到对手身上。 */
  function lineupPlayers(lineups) {
    var teamIds = TIER_TEAM[curTier] || [];
    var side = null;
    if (teamIds.length && lineups) {
      var hid = String((curMatch && curMatch.homeId) || "");
      var aid = String((curMatch && curMatch.awayId) || "");
      if (teamIds.indexOf(hid) > -1) side = lineups.home;
      else if (teamIds.indexOf(aid) > -1) side = lineups.away;
    }
    if (!side || !Array.isArray(side.players)) {
      // 梯队映射缺失或阵容未缓存：主客两队都收，靠球员键/名字去对
      var all = [];
      [lineups && lineups.home, lineups && lineups.away].forEach(function (s) {
        if (s && Array.isArray(s.players)) all = all.concat(s.players);
      });
      return all;
    }
    return side.players;
  }

  /* ── U15 等「按姓名映射」的来源：集锦管道里没有本场的 matchKey ──
     两个原因：① update_youtube.ps1 的已完赛列表只由 B队/U19/U18 构建；
     ② 这些视频的标题里没有对手名（如「凌空抽射 李昊炎巴萨联赛首球」），
     而分类逻辑靠标题里的对手 token 定位比赛 —— 所以解析不出 matchKey。
     退一步：把「同梯队球员 + 发布日 = 本场日期」的视频当作本场集锦。
     只在 curNameMap 有值时启用（目前仅 U15），不碰其它梯队。
     宁可少挂：只认「同日」，不开 ±N 天窗口 —— 集锦基本都在当天或赛后发。 */
  function sameDayPlayerRecs() {
    var out = [];
    var V = window.DQD_VIDEOS_CACHE;
    if (!curNameMap || !curMatch || !curMatch.date || !V || !V.feed || !V.feed.players) return out;
    var day = String(curMatch.date).slice(0, 10);
    var pre = "local:" + curNameMap + ":";
    Object.keys(V.feed.players).forEach(function (pk) {
      if (pk.indexOf(pre) !== 0) return;
      (V.feed.players[pk] || []).forEach(function (g) {
        if (!g || g.matchKey) return;                 // 已有比赛键的走原路，别重复挂
        if (String(g.date || "") !== day) return;     // 按分组自带的日期比对（非视频 published）
        var vids = (g.videos || []).filter(function (v) { return v && v.videoId; });
        if (!vids.length) return;
        var pc = (window.PlayerCard && window.PlayerCard.INDEX) ? window.PlayerCard.INDEX[pk] : null;
        out.push({
          playerKey: pk,
          pid: "",
          name: (pc && (pc.nameZh || pc.nameEn)) || pk.slice(pre.length),
          videos: vids
        });
      });
    });
    return out;
  }

  function computeMatchPlayerVideos(lineups) {
    matchPlayerRecs = [];
    matchPlayerVids = {};
    matchBucketFull = [];
    if (!window.VideosUI || !curMatchKey) return;
    var list = lineupPlayers(lineups) || [];
    var byName = {};
    list.forEach(function (x) {
      var p = (x && x.player) || {};
      // ⚠️ 懂球帝阵容的 name 可能是中文（"阿萨雷"），归一化后是空串 → 优先用 nameEn
      var nk = normName(p.nameEn || p.name);
      // 短名 / 空名（中文等非拉丁名归一化后是 ""）不进表，见 scanLineupName 的说明
      if (p.id && nk.length >= 6) byName[nk] = { pid: String(p.id), name: p.name || "" };
    });

    var recs;
    if (window.VideosUI.hasMatchRefs()) {
      recs = window.VideosUI.videosForMatch(curMatchKey);
    } else {
      // ── 过渡期（旧缓存）：按 ±4 天窗从 players 段取，与 matchKey 规则无关 ──
      //    没有 start 的场次（dqd: 键）跳过这一段，但不能 return —— 下面的 matches 桶再分配还要跑
      recs = [];
      var startMs = parseInt(curMatch.start, 10) * 1000;
      if (startMs) {
        var lo = startMs - 4 * 864e5, hi = startMs + 4 * 864e5;
        list.forEach(function (x) {
          var p = (x && x.player) || {};
          var pkey = p.id ? sfKey(p.id) : "";
          if (!pkey) return;
          var vids = window.VideosUI.resolve("players", pkey).filter(function (v) {
            var t = Date.parse(v.published + "T00:00:00Z");
            return t >= lo && t <= hi;
          });
          if (vids.length) recs.push({ playerKey: pkey, videos: vids });
        });
      }
    }

    // 比赛桶再分配：全场类的留在 matchBucketFull，个人集锦并进 recs 走同一套合并 / 去重。
    // 暂存的键必须还是当前这一场，否则上一场的详情缓存迟到会把这场的分区结果冲掉。
    if (matchBucketStash.key === curMatchKey) {
      var cls = classifyMatchBucket(byName);
      matchBucketFull = cls.full;
      recs = recs.concat(cls.recs);
    }

    // 按姓名映射的来源（U15）：管道没给本场 matchKey → 按同日补挂，见 sameDayPlayerRecs
    if (curNameMap) recs = recs.concat(sameDayPlayerRecs());

    var merged = {}, order = [];
    recs.forEach(function (r) {
      // r.pid 是比赛桶再分配带出来的（伪键 pid:123 没有 pidOfKey 可解）
      var pid = pidOfKey(r.playerKey) || String(r.pid || "");
      var pc = (window.PlayerCard && window.PlayerCard.findByKey(r.playerKey)) || null;
      // local:/b: 键没有 pid，但可能和阵容里的人同名 → 回连上就能点亮 🎬 徽标
      if (!pid && pc && pc.nameEn && byName[normName(pc.nameEn)]) pid = byName[normName(pc.nameEn)].pid;
      var name = "";
      if (pid) {
        list.some(function (x) {
          var p = (x && x.player) || {};
          if (String(p.id) === pid) { name = p.name || ""; return true; }
          return false;
        });
      }
      // r.name 给「本场其他个人集锦」这类无键记录用
      name = (pc && (pc.nameZh || pc.nameEn)) || name || r.name || r.playerKey;
      // 同一个人常同时挂在 sf:b:2076869 和 local:juvenil-a:hafizgariba 两个键下 ——
      // 按规范化英文名并成一条（两个键的 nameEn 同源，不依赖阵容，阵容为空也能并）。
      var id = (pc && pc.nameEn) ? "n" + normName(pc.nameEn) : (pid ? "p" + pid : "k" + r.playerKey);
      if (!merged[id]) {
        merged[id] = { playerKey: r.playerKey, pid: pid || "", name: name, vids: [] };
        order.push(id);
      } else {
        if (!merged[id].pid && pid) merged[id].pid = pid;   // 补 pid（🎬 徽标要用）
        // 球员键保留 sf: 那条（球员卡片索引里更全）
        if (/^sf:/.test(r.playerKey) && !/^sf:/.test(merged[id].playerKey)) merged[id].playerKey = r.playerKey;
      }
      merged[id].vids = merged[id].vids.concat(r.videos);
    });
    var seenVid = {};
    order.forEach(function (id) {
      var rec = merged[id];
      rec.vids = rec.vids.filter(function (v) {
        if (!v.videoId || seenVid[v.videoId]) return false;
        // 反向闸：全场 / 回放类不该出现在个人集锦里（爬虫侧 IsPlayerIrrelevant 想拦的就是这类，
        // 实测现存 players / feed 共 67 条里 0 命中，这里只是防回归）
        if (window.VideosUI.isFullMatchTitle(v.title)) return false;
        seenVid[v.videoId] = true;
        return true;
      });
      if (!rec.vids.length) return;
      matchPlayerRecs.push(rec);
      if (rec.pid) matchPlayerVids[rec.pid] = rec;
    });
  }

  /* ⭐ 本场球员个人集锦：按 matchPlayerRecs 渲染（阵容为空也照常出，这是关键修复点） */
  function fillMatchPlayerVideos(lineups, body) {
    var wrap = body.querySelector("#md-player-videos");
    if (!wrap) return;
    var html = "";
    matchPlayerRecs.forEach(function (rec) {
      html += '<div class="md-pv-player">' +
        '<div class="md-pv-name">' + cardAKey(rec.playerKey, rec.name || rec.playerKey) + "</div>" +
        '<div class="vid-grid">' + rec.vids.map(window.VideosUI.videoCardHtml).join("") + "</div>" +
      "</div>";
    });
    wrap.innerHTML = matchPlayerRecs.length
      ? '<section class="md-sec"><details class="md-vids-fold">' +
          "<summary>⭐ 本场球员个人集锦</summary>" +
          '<div class="md-vids-fold-body">' + html + "</div>" +
        "</details></section>"
      : "";
  }

  /* 详情内页签：阵容 / 进程 / 数据。
     以前四个分区竖着叠（阵容 880px + 进程 550px + 统计 640px…），
     弹窗一开就是一条 2500px 的长条；现在一次只看一个分区。 */
  function panesHtml(panes) {
    if (panes.length === 1) {
      return '<div class="md-pane is-active" data-pane="' + panes[0].key + '">' + panes[0].html + "</div>";
    }
    var tabs = panes.map(function (p, idx) {
      return '<button type="button" class="md-pane-tab' + (idx === 0 ? " is-active" : "") + '" role="tab" ' +
        'aria-selected="' + (idx === 0) + '" data-pane="' + p.key + '">' + p.label + "</button>";
    }).join("");
    var bodies = panes.map(function (p, idx) {
      return '<div class="md-pane' + (idx === 0 ? " is-active" : "") + '" data-pane="' + p.key + '" role="tabpanel">' +
        p.html + "</div>";
    }).join("");
    return '<div class="md-pane-tabs" role="tablist">' + tabs + "</div>" + bodies;
  }

  /* 拉取结果 → 填充 #md-load；无任何分区时显示友好提示 */
  function applyDetail(res, body) {
    var load = body.querySelector(".md-load");
    if (!load) return;
    var l = res[0], i = res[1], s = res[2], h = res[3];
    computeMatchPlayerVideos(l);   // 先算个人集锦映射（阵容里的 🎬 徽标需要它）
    renderMatchVideos(body);       // 🎥 全场集锦按分类结果重排（open 时只能按关键词粗分）
    var panes = [];
    var lu = l ? lineupsHtml(l) : "";
    if (lu) panes.push({ key: "lineups", label: "🧑‍🤝‍🧑 阵容", html: lu });
    var inc = i ? incidentsHtml(i) : "";
    if (inc) panes.push({ key: "incidents", label: "🎬 进程", html: inc });
    // 统计与交锋都是「数字」类，合进同一个页签，少一个页签也更省高度
    var data = (s ? statsHtml(s) : "") + (h ? h2hHtml(h) : "");
    if (data) panes.push({ key: "stats", label: "📊 数据", html: data });
    load.innerHTML = panes.length
      ? panesHtml(panes)
      : '<div class="note-box" style="margin-top:18px">📋 <span><b>该场详情暂不可用。</b>当前仅显示对阵信息。每日自动更新最近若干场的阵容与比赛进程，明天刷新后即可查看；也可点击下方链接在原站查看。</span></div>';
    fillMatchPlayerVideos(res[0], body);   // ⭐ 本场球员个人集锦（依赖阵容数据）
  }

  function liveFetch(id, body) {
    var no = function () { return Promise.resolve(null); };
    Promise.all([
      getJson(API + "/event/" + id + "/lineups").catch(no),
      getJson(API + "/event/" + id + "/incidents").catch(no),
      getJson(API + "/event/" + id + "/statistics").catch(no),
      getJson(API + "/event/" + id + "/h2h").catch(no)
    ]).then(function (res) {
      detailCache[id] = res;
      applyDetail(res, body);
    }).catch(function () {
      applyDetail([null, null, null, null], body);
    });
  }

  /* 详情缓存文件名 / 全局名推导：cacheRef "DQD_U19_CACHE" → 文件 "dqd-u19-details-cache.js"、
     全局 window.DQD_U19_DETAILS_CACHE。按需懒加载，避免每页都下载详情数据。 */
  function detailsFileName(m) {
    return m.cacheRef.toLowerCase().replace(/_/g, "-").replace(/-cache$/, "-details-cache") + ".js";
  }
  function detailsGlobal(m) {
    return (m.cacheRef || "").replace(/CACHE$/, "DETAILS_CACHE");
  }
  function detailsFileBase() {
    var src = "";
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var s = scripts[i].getAttribute("src") || "";
      if (s.indexOf("match-detail.js") !== -1) { src = s; break; }
    }
    return src.replace(/match-detail\.js.*$/, "");
  }
  function loadDetailCache(m) {
    var name = detailsGlobal(m);
    if (window[name]) return Promise.resolve(window[name]);
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = detailsFileBase() + detailsFileName(m);
      s.onload = function () { resolve(window[name] || null); };
      s.onerror = function () { reject(new Error("detail cache load failed")); };
      document.head.appendChild(s);
    });
  }
  function fallbackToLive(id, body) {
    var load = body.querySelector(".md-load");
    if (load) load.innerHTML = '<div class="md-loading">正在获取该场详情…</div>';
    liveFetch(id, body);
  }
  function loadSofascoreDetail(m, body) {
    var id = m.id;
    if (detailCache[id]) { applyDetail(detailCache[id], body); return; }
    // ① 优先读每日详情缓存（线上/离线均可用）
    loadDetailCache(m).then(function (dc) {
      var d = dc ? dc[id] : null;
      if (d) {
        detailCache[id] = [
          d.lineups || null, d.incidents || null,
          d.statistics || null, d.h2h || null
        ];
        applyDetail(detailCache[id], body);
        return;
      }
      // ② 无该场缓存 → 尽力实时拉取（本地 file:// 等可直连场合生效）
      fallbackToLive(id, body);
    }).catch(function () {
      // ③ 详情缓存文件加载失败（离线等）→ 尽力实时拉取
      fallbackToLive(id, body);
    });
  }

  /* 懂球帝场次 → Sofascore 事件 id（开球时间 ±1 小时内唯一匹配）。
     B队赛程回退懂球帝后详情的「比赛进程」没有进球者姓名 —— 懂球帝 overview
     接口对西协乙这类比赛 person/person_id 直接返回空值（不是前端漏读）。
     Sofascore 详情缓存里有姓名，按时间对上同一场时借过来用。 */
  function bridgeSfEventId(m) {
    var sf = window.DQD_BARCA_ATLETIC_SF_CACHE;
    var ms = (sf && sf.matches) || [];
    var s = parseInt(m && m.start, 10);
    if (!s || !ms.length) return "";
    var hit = null;
    for (var i = 0; i < ms.length; i++) {
      var x = ms[i];
      if (!x || Math.abs(parseInt(x.start, 10) - s) > 3600) continue;
      if (hit && String(hit.id) !== String(x.id)) return "";   // 时间窗内不止一场 → 宁缺毋错
      hit = x;
    }
    if (!hit) return "";
    // 比分做最后一道校验：两边都完场且比分不同，说明不是同一场
    var finished = /Ended|Awarded|Played/i.test(String(m.status || ""));
    if (finished && m.hs != null && m.as != null && hit.hs != null && hit.as != null &&
        (String(m.hs) !== String(hit.hs) || String(m.as) !== String(hit.as))) return "";
    return String(hit.id);
  }

  /* 懂球帝详情：只读本地缓存，不做实时拉取（归一化在 PS 侧完成，前端不重复实现）。
     缓存形状与 Sofascore 详情缓存一致，所以能直接走 applyDetail 的四个渲染函数。 */
  function loadDqdDetail(m, body) {
    var id = String(m.id || "");
    // ⚠️ 会话缓存必须加命名空间：Sofascore event id 与懂球帝 match_id 都是纯数字，会撞车
    var ck = "dqd:" + id;
    if (detailCache[ck]) { applyDetail(detailCache[ck], body); return; }
    var sfId = bridgeSfEventId(m);
    loadDetailCache(m).then(function (dc) {
      var d = dc ? (dc[id] || dc[m.id]) : null;
      if (!d) { dqdEmpty(body); return; }
      bridgeDqdLineups(d.lineups);   // 唯一一处就地改写：懂球帝 person_id → Sofascore id
      var res = [d.lineups || null, d.incidents || null, d.statistics || null, d.h2h || null];
      if (!sfId) { detailCache[ck] = res; applyDetail(res, body); return; }
      // 借 Sofascore 的「比赛进程」补进球者姓名；懂球帝缺失的其它分区也顺手补上
      loadDetailCache({ cacheRef: "DQD_BARCA_ATLETIC_SF_CACHE" }).then(function (sfc) {
        var sd = sfc ? sfc[sfId] : null;
        if (sd) {
          if (sd.incidents) res[1] = sd.incidents;
          if (!res[0] && sd.lineups) res[0] = sd.lineups;
          if (!res[2] && sd.statistics) res[2] = sd.statistics;
          if (!res[3] && sd.h2h) res[3] = sd.h2h;
        }
        detailCache[ck] = res;
        applyDetail(res, body);
      }).catch(function () {
        detailCache[ck] = res;
        applyDetail(res, body);
      });
    }).catch(function () { dqdEmpty(body); });
  }

  function dqdEmpty(body) {
    var load = body.querySelector(".md-load");
    if (load) load.innerHTML = '<div class="note-box" style="margin-top:18px">📋 <span><b>懂球帝暂未收录该场的阵容与比赛进程。</b>可点击下方链接到懂球帝查看。</span></div>';
  }

  /* FC Barcelona 官网场次（目前只有 U15/cadete-b）：阵容与进球/换人/牌时间轴
     由 scripts/update_elfutbol_details.ps1 从 elfutbol.co 抓成每日缓存。
     缓存形状与 dqd-*-details-cache 一致 → 渲染直接复用 applyDetail，无需新代码。 */
  function loadFcbDetail(m, body) {
    var id = String(m.id || "");
    var ck = "elf:" + id;   // 会话缓存加命名空间，避免与 sf:/dqd: 的纯数字 id 撞车
    if (detailCache[ck]) { applyDetail(detailCache[ck], body); return; }
    loadDetailCache(m).then(function (dc) {
      var d = dc ? (dc[id] || dc[m.id]) : null;
      if (!d) { fcbEmpty(body); return; }
      detailCache[ck] = [d.lineups || null, d.incidents || null, d.statistics || null, d.h2h || null];
      applyDetail(detailCache[ck], body);
    }).catch(function () { fcbEmpty(body); });
  }

  function fcbEmpty(body) {
    var load = body.querySelector(".md-load");
    if (load) load.innerHTML = '<div class="note-box" style="margin-top:18px">📋 <span><b>该场暂无阵容/进球详情。</b>本站每日更新青年梯队最近若干场的阵容与比赛进程，明天刷新后即可查看；也可点击下方链接在原站查看。</span></div>';
  }

  /* 懂球帝阵容球员 → 补上 Sofascore id（有才补，不强求）。
     必须赶在 applyDetail 之前完成：🎬 个人集锦徽标与球员卡都按 Sofascore id 查表。
     桥接表由 player-card.js 用两份名单按姓名三级匹配建起来（dqdToSf）；桥不上就降级，
     头像退回懂球帝 CDN、卡片退回 b:{dqdId} 键，不会因此报错。 */
  function bridgeDqdLineups(l) {
    if (!l || !window.PlayerCard || !window.PlayerCard.sfIdFor) return;
    [l.home, l.away].forEach(function (side) {
      if (!side || !Array.isArray(side.players)) return;
      side.players.forEach(function (x) {
        var p = x && x.player;
        if (!p || p.id || !p.dqdId) return;
        var sid = window.PlayerCard.sfIdFor("b:" + p.dqdId);
        if (sid) p.id = sid;
      });
    });
  }

  function open(key) {
    var m = REG[key];
    if (!m) return;
    curTier = { DQD_U19_CACHE: "u19", DQD_U18_CACHE: "u18", DQD_U16_CACHE: "u16",
                DQD_BARCA_ATLETIC_SF_CACHE: "b", DQD_BARCA_ATLETIC_CACHE: "b",
                ELFUTBOL_CADETE_B_CACHE: "cadete-b" }[m.cacheRef] || "";
    // 只有 elfutbol 来源缺球员 id、需要按姓名映射；Sofascore/懂球帝本来就有 id，不启用
    curNameMap = (m.cacheRef === "ELFUTBOL_CADETE_B_CACHE") ? "cadete-b" : "";
    curMatch = m;
    // 本场集锦按此键取：懂球帝场次通过 videoKey 桥到 "sfb:{Sofascore id}"（视频缓存按 SF id 落库）
    curMatchKey = m.videoKey || key;
    var modal = ensureModal();
    var body = modal.querySelector(".md-body");
    body.innerHTML = headerHtml(m) +
      matchVideosHtml(curMatchKey) +
      '<div class="md-load"><div class="md-loading">正在加载比赛详情…</div></div>' +
      footerHtml(m);
    modal.classList.add("open");
    modal.scrollTop = 0;   // 弹窗复用：每次打开新比赛都回到最上方，不残留上次关闭时的滚动位置
    // 阵容还没到，先按标题关键词粗分一次：个人集锦立刻从 🎥 挪进 ⭐（扫阵容名单那一步要等详情）。
    // 也是 dqd: / fcb: 这类永远走不到 applyDetail 的场次的唯一分区机会。
    // 幂等：computeMatchPlayerVideos 自己重置三个模块变量，fillMatchPlayerVideos 整体换 innerHTML。
    computeMatchPlayerVideos(null);
    renderMatchVideos(body);
    fillMatchPlayerVideos(null, body);
    if (m.source === "sofascore") {
      loadSofascoreDetail(m, body);
    } else if (m.source === "fcb") {
      if (m.cacheRef) {
        // U15：走 elfutbol 详情缓存（阵容 + 进球/换人/牌）
        loadFcbDetail(m, body);
      } else {
        var load = body.querySelector(".md-load");
        load.innerHTML = '<div class="note-box" style="margin-top:18px">🔗 <span><b>该场赛程来自 FC Barcelona 官网。</b>本站未收录青年梯队逐场阵容/统计详情，请到原站查看赛程与比分。</span></div>';
      }
    } else if (m.source === "dqd" && m.cacheRef) {
      // 懂球帝场次且带详情缓存引用 → 走本地缓存渲染完整详情
      loadDqdDetail(m, body);
    } else {
      var load = body.querySelector(".md-load");
      load.innerHTML = '<div class="note-box" style="margin-top:18px">🔗 <span><b>该场比赛详情请在懂球帝查看。</b>本站每日缓存仅含对阵、比分与时间等基本信息。</span></div>';
    }
  }

  /* 行内链接（外链 / 梯队跳转）优先，不拦截；其余落在 [data-match-key] 行上则打开详情 */
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a") : null;
    if (a) return;
    var tr = e.target.closest ? e.target.closest("[data-match-key]") : null;
    if (!tr) return;
    var key = tr.getAttribute("data-match-key");
    if (key && REG[key]) {
      e.preventDefault();
      open(key);
    }
  });

  /* 详情内页签：阵容 / 进程 / 数据（一次只显示一个分区） */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest(".md-pane-tab") : null;
    if (!btn) return;
    var load = btn.closest(".md-load");
    if (!load) return;
    e.preventDefault();
    var key = btn.getAttribute("data-pane");
    Array.prototype.forEach.call(load.querySelectorAll(".md-pane-tab"), function (t) {
      var on = t === btn;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    Array.prototype.forEach.call(load.querySelectorAll(".md-pane"), function (p) {
      p.classList.toggle("is-active", p.getAttribute("data-pane") === key);
    });
    // 换分区后回到顶部，别停在上一个分区的高度上
    var modal = btn.closest(".match-detail");
    if (modal && modal.scrollTop > 0) modal.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* 🎬 阵容里的个人集锦徽标点击 → 直接播放该球员本场第一条集锦 */
  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-hl-pid]") : null;
    if (!b) return;
    var rec = matchPlayerVids[b.getAttribute("data-hl-pid")];
    if (!rec || !rec.vids.length || !window.VideosUI) return;
    e.preventDefault();
    var v = rec.vids[0];
    window.VideosUI.openPlayer(v.videoId, v.site);
  });

  window.LAMASIA_MATCH_DETAIL = { open: open, close: close };
})();
