/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 比赛详情弹窗
   ─────────────────────────────────────────────────────────────
   依赖：各赛程渲染脚本把比赛对象写入 window.LAMASIA_MATCHES
     key = "{source}:{matchId}"（source = sofascore / dqd）
   行为：
     1. 点击带 [data-match-key] 的比赛行 → 弹出该场详情
     2. 头部信息立即从注册表渲染（离线可用）
     3. sofascore 场次实时拉取 阵容 / 比赛进程 / 技术统计 / 近期交锋
     4. dqd 场次显示对阵信息 + 「在懂球帝查看」外链
     5. 任一详情接口失败 → 保留头部，提示需联网
   关闭：✕ 按钮 / 遮罩点击 / Esc（与照片灯箱交互一致）
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var REG = (window.LAMASIA_MATCHES = window.LAMASIA_MATCHES || {});
  var API = "https://api.sofascore.com/api/v1";
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
      if (e.target === el) close();
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
      (logo ? '<img class="md-logo" src="' + esc(logo) + '" alt="' + esc(name || "") + '" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">' : "") +
      '<span class="md-name">' + esc(name || "") + "</span></div>";
  }

  function headerHtml(m) {
    var roundTxt = m.round ? " · R" + esc(m.round) : "";
    var kickoff = m.source === "dqd" ? (m.startText || "") : bj(m.start);
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
    if (m.source === "dqd") {
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

  function lineupSide(list) {
    if (!list || !list.length) return null;
    var starters = list.filter(function (x) { return !x.substitute; });
    var bench = list.filter(function (x) { return x.substitute; });
    function item(x) {
      var p = x.player || {};
      var ini = esc(initials(p.name)) || "·";
      return '<div class="md-lu-item">' +
        '<span class="md-lu-num">' + esc(x.jerseyNumber || "") + "</span>" +
        '<span class="md-lu-av">' + ini + "</span>" +
        '<span class="md-lu-name">' + esc(p.name || "") + "</span>" +
        '<span class="md-lu-pos">' + esc(posZh(x.position)) + "</span>" +
      "</div>";
    }
    return '<div class="md-lu-side">' +
      (starters.length ? '<div class="md-lu-label">首发 · ' + starters.length + "</div>" + starters.map(item).join("") : "") +
      (bench.length ? '<div class="md-lu-label">替补 · ' + bench.length + "</div>" + bench.map(item).join("") : "") +
      "</div>";
  }

  function lineupsHtml(l) {
    var home = lineupSide(l.home);
    var away = lineupSide(l.away);
    if (!home && !away) return "";
    if (!home) home = '<div class="md-lu-side md-empty">阵容未公布</div>';
    if (!away) away = '<div class="md-lu-side md-empty">阵容未公布</div>';
    return '<section class="md-sec"><h4>🧑‍🤝‍🧑 首发与替补</h4>' +
      '<div class="md-lu-grid">' + home + away + "</div></section>";
  }

  /* ═══ 比赛进程 ═══ */
  var REASON_ZH = { "Penalty": "点球", "Own goal": "乌龙球", "Header": "头球", "Free kick": "任意球", "Normal": "", "Kick": "" };
  function incidentIcon(x) {
    switch (x.incidentType) {
      case "goal": return "⚽";
      case "penalty": return "⚽";
      case "yellowcard": return "🟨";
      case "yellowredcard": return "🟨🟥";
      case "redcard": return "🟥";
      case "substitution": return "🔁";
      default: return "•";
    }
  }
  function incidentText(x) {
    var p = x.player && x.player.name;
    if (x.incidentType === "goal") {
      var t = p || "";
      var sc = (x.homeScore != null && x.awayScore != null) ? " " + x.homeScore + "-" + x.awayScore : "";
      var why = REASON_ZH[x.reason] != null ? REASON_ZH[x.reason] : x.reason;
      if (why) t += "（" + esc(why) + "）";
      return t + sc;
    }
    if (x.incidentType === "penalty") {
      return (p || "点球") + (x.reason ? "（" + esc(x.reason) + "）" : "");
    }
    if (x.incidentType === "substitution") {
      var pin = x.playerIn && x.playerIn.name;
      var pout = x.playerOut && x.playerOut.name;
      return (pout ? "↓ " + esc(pout) : "") + (pin ? " ↑ " + esc(pin) : "");
    }
    return p || "";
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
    "Match stats": "全场数据", "Team stats": "球队数据", "Attack": "进攻", "Discipline": "纪律",
    "Passes": "传球", "Defence": "防守", "Fair play": "公平竞赛", "Other": "其他"
  };
  function statsHtml(s) {
    var sections = s.map(function (g) {
      var stats = (g && g.statistics) || [];
      stats = stats.filter(function (st) { return st && st.name; });
      if (!stats.length) return "";
      var gname = GROUP_ZH[g.groupName] || g.groupName || "";
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
    var list = null;
    if (h && Array.isArray(h.matches)) list = h.matches;
    else if (h && h.home && Array.isArray(h.home.matches)) list = h.home.matches;
    else if (h && h.away && Array.isArray(h.away.matches)) list = h.away.matches;
    if (!list || !list.length) return "";
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
    return '<section class="md-sec"><h4>🤝 近期交锋</h4>' +
      '<div class="table-wrap"><table class="roster-table"><thead><tr><th>时间</th><th>赛事</th><th>主队</th><th>比分</th><th>客队</th></tr></thead><tbody>' +
      rows + "</tbody></table></div></section>";
  }

  /* 拉取结果 → 填充 #md-load */
  function applyDetail(res, body) {
    var load = body.querySelector(".md-load");
    if (!load) return;
    var l = res[0], i = res[1], s = res[2], h = res[3];
    var html = "", any = false;
    var lu = l ? lineupsHtml(l) : "";
    if (lu) { html += lu; any = true; }
    var inc = i ? incidentsHtml(i) : "";
    if (inc) { html += inc; any = true; }
    var st = s && Array.isArray(s) ? statsHtml(s) : "";
    if (st) { html += st; any = true; }
    var hh = h ? h2hHtml(h) : "";
    if (hh) { html += hh; any = true; }
    load.innerHTML = any
      ? html
      : '<div class="note-box" style="margin-top:18px">⚠️ <span><b>详情需联网。</b>当前仅显示本地缓存的该场对阵信息；联网后重新点击比赛，即可加载首发阵容、进球与换人、技术统计等完整数据。</span></div>';
  }

  function loadSofascoreDetail(m, body) {
    var id = m.id;
    if (detailCache[id]) { applyDetail(detailCache[id], body); return; }
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

  function open(key) {
    var m = REG[key];
    if (!m) return;
    var modal = ensureModal();
    var body = modal.querySelector(".md-body");
    body.innerHTML = headerHtml(m) +
      '<div class="md-load"><div class="md-loading">正在加载比赛详情…</div></div>' +
      footerHtml(m);
    modal.classList.add("open");
    if (m.source === "sofascore") {
      loadSofascoreDetail(m, body);
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

  window.LAMASIA_MATCH_DETAIL = { open: open, close: close };
})();
