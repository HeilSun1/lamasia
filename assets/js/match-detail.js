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

  /* ═══ 球员卡片入口（阵容/比赛进程里的巴萨球员名可点击弹卡）═══ */
  var curTier = "";   // 当前比赛的梯队（由 m.cacheRef 推出）
  var curMatch = null; // 当前比赛对象（视频/球员集锦用）
  function sfKey(pid) {
    return (curTier && pid) ? "sf:" + curTier + ":" + pid : "";
  }
  // 若该球员在本站卡片索引中（巴萨球员），包装成可点击入口；否则返回纯文本
  function cardA(pid, name) {
    var key = sfKey(pid);
    var txt = esc(name || "");
    if (key && window.PlayerCard && window.PlayerCard.findByKey(key)) {
      return '<span class="pc-link" data-player-key="' + esc(key) + '" title="点击查看球员卡片">' + txt + "</span>";
    }
    return txt;
  }

  function lineupSide(list) {
    // Sofascore 阵容结构：home/away 是 { players:[...] } 对象，兼容直接传数组
    if (list && !Array.isArray(list) && list.players) list = list.players;
    if (!list || !list.length) return null;
    var starters = list.filter(function (x) { return !x.substitute; });
    var bench = list.filter(function (x) { return x.substitute; });
    function item(x) {
      var p = x.player || {};
      var ini = esc(initials(p.name)) || "·";
      // 阵容头像：Sofascore 球员头像，加载失败回退首字母
      var av = p.id
        ? '<img src="https://img.sofascore.com/api/v1/player/' + esc(p.id) + '/image" alt="' + esc(p.name || "") + '" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">' +
          '<span class="md-lu-ini" style="display:none">' + ini + "</span>"
        : '<span class="md-lu-ini">' + ini + "</span>";
      return '<div class="md-lu-item">' +
        '<span class="md-lu-num">' + esc(x.jerseyNumber || "") + "</span>" +
        '<span class="md-lu-av">' + av + "</span>" +
        '<span class="md-lu-name">' + cardA(p.id, p.name) + "</span>" +
        // 🎬 徽标：该球员本场有个人集锦，可点击直接播放
        (matchPlayerVids[p.id]
          ? '<button class="md-lu-hl" type="button" data-hl-pid="' + esc(p.id) + '" title="本场有个人集锦，点击播放">🎬</button>'
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
    var home = lineupSide(l.home);
    var away = lineupSide(l.away);
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
    var pn = cardA(x.player && x.player.id, x.player && x.player.name);
    if (x.incidentType === "goal" || x.incidentType === "penalty") {
      var why = "";
      if (x.reason && REASON_ZH[x.reason] != null) why = REASON_ZH[x.reason];
      else if (x.incidentClass && GOAL_CLASS_ZH[x.incidentClass] != null) why = GOAL_CLASS_ZH[x.incidentClass];
      else if (x.reason && x.reason !== "Normal" && x.reason !== "Kick") why = String(x.reason);
      var t = pn;
      var sc = (x.homeScore != null && x.awayScore != null) ? " " + x.homeScore + "-" + x.awayScore : "";
      return t + (why ? "（" + esc(why) + "）" : "") + sc;
    }
    if (x.incidentType === "card") {
      var c = String(x.incidentClass || x.reason || "").toLowerCase();
      var lbl = c.indexOf("red") !== -1 ? "红牌" : "黄牌";
      return pn + " · " + lbl;
    }
    if (x.incidentType === "substitution") {
      var pin = cardA(x.playerIn && x.playerIn.id, x.playerIn && x.playerIn.name);
      var pout = cardA(x.playerOut && x.playerOut.id, x.playerOut && x.playerOut.name);
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

  /* 巴萨梯队对应的 Sofascore 团队 id（判断本场巴萨是主/客） */
  var TIER_TEAM = { b: "24343", u19: "90128", u18: "", u16: "" };

  /* 🎥 全场集锦：直接展开显示；发布时间的逻辑校验——
     全场集锦必须在本场"开赛 ±2 天"到"赛后 14 天"内发布，否则判定为别的比赛 / 旧视频 / 直播流，不显示。
     下方 #md-player-videos 是本场球员个人集锦占位（lineups 加载后填充） */
  function matchVideosHtml(key) {
    if (!window.VideosUI) return "";
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
    var html = window.VideosUI.groupHtml(list, "🎥 全场集锦");
    return html + '<div id="md-player-videos"></div>';
  }

  /* 本场球员个人集锦映射：Sofascore 球员 id → { name, vids:[...] }。
     取巴萨侧阵容球员，查其按场集锦（发布于本场 ±14 天内）。
     先算好 → 阵容里的 🎬 徽标 与底部"本场球员个人集锦"分区共用。 */
  var matchPlayerVids = {};
  function computeMatchPlayerVideos(lineups) {
    matchPlayerVids = {};
    if (!curMatch || !window.VideosUI) return;
    var teamId = TIER_TEAM[curTier] || "";
    var side = null;
    if (teamId && lineups) {
      if (String(curMatch.homeId) === teamId) side = lineups.home;
      else if (String(curMatch.awayId) === teamId) side = lineups.away;
    }
    var list = (side && side.players) || null;
    if (!list) return;
    var startMs = parseInt(curMatch.start, 10) * 1000;
    if (!startMs) return;
    var lo = startMs - 14 * 864e5, hi = startMs + 14 * 864e5;
    list.forEach(function (x) {
      var p = (x && x.player) || {};
      var pid = p.id;
      var pkey = pid ? sfKey(pid) : "";
      if (!pkey) return;
      var vids = window.VideosUI.resolve("players", pkey).filter(function (v) {
        var t = Date.parse(v.published + "T00:00:00Z");
        return t >= lo && t <= hi;
      });
      if (!vids.length) return;
      matchPlayerVids[pid] = { name: p.name || "", vids: vids };
    });
  }

  /* ⭐ 本场球员个人集锦：复用 computeMatchPlayerVideos 算好的映射渲染分区（默认折叠为一条） */
  function fillMatchPlayerVideos(lineups, body) {
    var wrap = body.querySelector("#md-player-videos");
    if (!wrap) return;
    var html = "", any = false;
    Object.keys(matchPlayerVids).forEach(function (pid) {
      var rec = matchPlayerVids[pid];
      any = true;
      html += '<div class="md-pv-player">' +
        '<div class="md-pv-name">' + cardA(pid, rec.name) + "</div>" +
        '<div class="vid-grid">' + rec.vids.map(window.VideosUI.videoCardHtml).join("") + "</div>" +
      "</div>";
    });
    wrap.innerHTML = any
      ? '<section class="md-sec"><details class="md-vids-fold">' +
          "<summary>⭐ 本场球员个人集锦</summary>" +
          '<div class="md-vids-fold-body">' + html + "</div>" +
        "</details></section>"
      : "";
  }

  /* 拉取结果 → 填充 #md-load；无任何分区时显示友好提示 */
  function applyDetail(res, body) {
    var load = body.querySelector(".md-load");
    if (!load) return;
    var l = res[0], i = res[1], s = res[2], h = res[3];
    computeMatchPlayerVideos(l);   // 先算个人集锦映射（阵容里的 🎬 徽标需要它）
    var html = "", any = false;
    var lu = l ? lineupsHtml(l) : "";
    if (lu) { html += lu; any = true; }
    var inc = i ? incidentsHtml(i) : "";
    if (inc) { html += inc; any = true; }
    var st = s ? statsHtml(s) : "";
    if (st) { html += st; any = true; }
    var hh = h ? h2hHtml(h) : "";
    if (hh) { html += hh; any = true; }
    load.innerHTML = any
      ? html
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

  function open(key) {
    var m = REG[key];
    if (!m) return;
    curTier = { DQD_U19_CACHE: "u19", DQD_U18_CACHE: "u18", DQD_U16_CACHE: "u16", DQD_BARCA_ATLETIC_SF_CACHE: "b" }[m.cacheRef] || "";
    curMatch = m;
    var modal = ensureModal();
    var body = modal.querySelector(".md-body");
    body.innerHTML = headerHtml(m) +
      matchVideosHtml(key) +
      '<div class="md-load"><div class="md-loading">正在加载比赛详情…</div></div>' +
      footerHtml(m);
    modal.classList.add("open");
    modal.scrollTop = 0;   // 弹窗复用：每次打开新比赛都回到最上方，不残留上次关闭时的滚动位置
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
