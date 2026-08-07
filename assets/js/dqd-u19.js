/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 巴萨U19（Juvenil A）Sofascore 实时数据
   ─────────────────────────────────────────────────────────────
   行为：
     1. 页面打开先渲染本地缓存 window.DQD_U19_CACHE（每日脚本生成，保证离线可看）
     2. 随后尽力实时请求 Sofascore 接口刷新（浏览器可过其反爬）
     3. 实时失败 → 保留缓存显示
   依赖：roster.js（提供照片灯箱）
   仅用于 teams/juvenil-a.html
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const TEAM_ID = "90128";                       // Sofascore 巴萨 U19
  const API     = "https://api.sofascore.com/api/v1";

  const POS_ORDER = ["F", "M", "D", "G"];
  const POS_TITLE = { G: "🧤 门将", D: "🛡 后卫", M: "⚙️ 中场", F: "🎯 前锋" };
  const POS_CLASS = { G: "gk", D: "df", M: "mf", F: "fw" };
  const POS_ZH    = { G: "门将", D: "后卫", M: "中场", F: "前锋" };

  const $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function initials(name) {
    return String(name || "").split(/[\s.]+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join("");
  }

  function stamp(now) {
    const pad = function (n) { return String(n).padStart(2, "0"); };
    return now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) +
           " " + pad(now.getHours()) + ":" + pad(now.getMinutes());
  }

  function fmtTime(unix) {
    const t = new Date(parseInt(unix, 10) * 1000);
    if (isNaN(t.getTime())) return "";
    const pad = function (n) { return String(n).padStart(2, "0"); };
    return t.getFullYear() + "-" + pad(t.getMonth() + 1) + "-" + pad(t.getDate()) + " " + pad(t.getHours()) + ":" + pad(t.getMinutes());
  }

  /* 伤病/赛事英文 → 中文（与脚本一致） */
  const INJ_MAP = {
    "Thigh Injury": "大腿伤势", "Knee Injury": "膝盖伤势", "Muscle Injury": "肌肉损伤",
    "Hamstring Injury": "腘绳肌损伤", "Ankle Injury": "脚踝伤势", "Sprained Ankle": "脚踝扭伤",
    "Groin Injury": "腹股沟伤势", "Calf Injury": "小腿伤势", "Shoulder Injury": "肩部伤势",
    "Adductor Injury": "内收肌损伤", "Ligament Injury": "韧带损伤", "Meniscus Injury": "半月板损伤"
  };
  function injZh(en) { return INJ_MAP[en] || en || ""; }

  const COMP_MAP = {
    "División de Honor Juvenil, Group 3": "西青甲 G3",
    "UEFA Youth League": "青年欧冠",
    "UEFA Youth League, Knockout stage": "青年欧冠 · 淘汰赛",
    "Spain U19 Cup": "西班牙青年杯",
    "Copa Campeones de Division de Honor Juvenil": "青年冠军杯"
  };
  function compZh(en) {
    if (COMP_MAP[en]) return COMP_MAP[en];
    const m = String(en || "").match(/^UEFA Youth League, (Group [A-Z]|Group stage)/);
    if (m) return "青年欧冠 · " + m[1];
    return en || "";
  }

  /* 出生日期 → 年龄（如 "2008-06-18T00:00:00+00:00" → "18岁"） */
  function calcAge(dob) {
    const m = String(dob || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return "";
    const by = parseInt(m[1], 10), bm = parseInt(m[2], 10), bd = parseInt(m[3], 10);
    const now = new Date();
    let a = now.getFullYear() - by;
    if (now.getMonth() + 1 < bm || (now.getMonth() + 1 === bm && now.getDate() < bd)) a--;
    return a + "岁";
  }

  /* 身价（欧元）→ 中文缩写（3300000 → "330万"） */
  function valueZh(v) {
    const n = parseFloat(v);
    if (!isFinite(n) || n <= 0) return "";
    if (n >= 100000000) return (Math.round(n / 100000000 * 10) / 10) + "亿";
    return Math.round(n / 10000) + "万";
  }

  /* 国籍英文 → 中文（映射表见 data.js 的 LAMASIA_DATA.nationZh；未收录则保持原文） */
  function nationZh(en) {
    const map = (window.LAMASIA_DATA && window.LAMASIA_DATA.nationZh) || {};
    return map[en] || en || "";
  }

  /* 姓名归一化（去变音符、统一小写）用于和官方名单匹配中文名 */
  function normKey(s) {
    return String(s || "").toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "");
  }

  /* 姓名分词：转小写、去变音符，按非字母数字拆成词（"Pedro Rodríguez Iglesias" → ["pedro","rodriguez","iglesias"]） */
  function nameTokens(s) {
    return String(s || "").toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9]+/).filter(Boolean);
  }

  /* 从 data.js 全部年龄组名单建立 英文名→中文名/备注 映射，避免页面出现两份名单。
     Sofascore 的 U19/U18/U16 队伍边界与本站年龄组不完全一致，跨队球员也能匹配到中文名。 */
  function buildZhMap(ownTeamId) {
    const map = {};
    const all = window.LAMASIA_DATA && window.LAMASIA_DATA.players;
    if (!all) return map;
    const order = ownTeamId ? [ownTeamId].concat(Object.keys(all).filter(function (t) { return t !== ownTeamId; })) : Object.keys(all);
    order.forEach(function (teamId) {
      (all[teamId] || []).forEach(function (p) {
        const entry = { zh: p.zh || "", note: p.note || "", toks: nameTokens(p.name) };
        const k = normKey(p.name);
        if (k && !map[k]) map[k] = entry;
        // 别名：Sofascore 常用昵称/简称（如 "Paumi Mateos" → "Pau Miguel Mateos"）
        String(p.nameAlias || "").split(",").forEach(function (al) {
          const ak = normKey(al);
          if (ak && !map[ak]) map[ak] = entry;
        });
      });
    });
    return map;
  }

  /* 名单查找：先精确匹配全名；失败则按「名+姓」前缀兜底（Sofascore 常用简写，
     如 "Pedro Rodriguez" 对应全名 "Pedro Rodríguez Iglesias"），仅当双方首词相同才尝试 */
  function lookupZh(name, map) {
    if (!name || !map) return null;
    const hit = map[normKey(name)];
    if (hit) return hit;
    const a = nameTokens(name);
    if (a.length < 2) return null;
    for (const key in map) {
      const b = map[key].toks;
      if (!b || b.length < 2 || a[0] !== b[0]) continue;
      if (a.length <= b.length && a.join(" ") === b.slice(0, a.length).join(" ")) return map[key];
      if (b.length <= a.length && b.join(" ") === a.slice(0, b.length).join(" ")) return map[key];
    }
    return null;
  }

  /* 把实时抓到的原始数据归一化成与缓存一致的形状 */
  function normalizeLive(playersJson, lastJson, nextJson) {
    const players = ((playersJson && playersJson.players) || []).map(function (p) {
      const pr = p.player;
      const id = String(pr.id);
      let injury = null;
      if (pr && pr.injury) {
        const i = pr.injury;
        injury = {
          reason: injZh(i.reason), reasonEn: i.reason, status: i.status,
          expected: i.expectedReturnDateData
            ? (i.expectedReturnDateData.year + "年" + i.expectedReturnDateData.month + "月") : ""
        };
      }
      return {
        name: pr.name, id: id, pos: pr.position || "",
        shirt: p.shirtNumber || "", team: pr.team ? pr.team.name : "",
        nation: pr.country ? pr.country.name : "",
        photo: "https://img.sofascore.com/api/v1/player/" + pr.id + "/image",
        age: calcAge(pr.dateOfBirth),
        value: valueZh(pr.proposedMarketValue),
        injury: injury
      };
    });

    const matches = [];
    [lastJson, nextJson].forEach(function (src) {
      ((src && src.events) || []).forEach(function (e) {
        matches.push({
          id: String(e.id),
          comp: compZh(e.tournament && e.tournament.name),
          round: (e.roundInfo && e.roundInfo.round) ? String(e.roundInfo.round) : "",
          start: String(e.startTimestamp),
          home: (e.homeTeam && e.homeTeam.name) || "", away: (e.awayTeam && e.awayTeam.name) || "",
          homeId: String((e.homeTeam && e.homeTeam.id) || ""), awayId: String((e.awayTeam && e.awayTeam.id) || ""),
          hs: e.homeScore ? String(e.homeScore.current) : "",
          as: e.awayScore ? String(e.awayScore.current) : "",
          status: (e.status && e.status.description) || "",
          isHome: String((e.homeTeam && e.homeTeam.id)) === TEAM_ID
        });
      });
    });
    matches.sort(function (a, b) { return parseInt(a.start, 10) - parseInt(b.start, 10); });

    return {
      updated: stamp(new Date()), source: "sofascore", team: { name: "FC Barcelona U19", id: TEAM_ID, country: "Spain" },
      players: players, matches: matches
    };
  }

  /* ── 球队信息 ── */
  function renderTeam(data) {
    const el = $("u19-team");
    if (!el) return;
    const t = (data && data.team) || {};
    const logo = $("u19-team-logo");
    if (logo && t.logo) { logo.src = t.logo; logo.style.display = "block"; }
    el.innerHTML =
      '<div class="stats-row">' +
        '<div class="stat-tile"><div class="st-label">球队</div><div class="st-value" style="font-size:20px">' + esc(t.name || "FC Barcelona U19") + "</div></div>" +
        '<div class="stat-tile"><div class="st-label">联赛</div><div class="st-value" style="font-size:20px">西青甲 G3</div><div class="st-note">División de Honor Juvenil · Group 3</div></div>' +
        '<div class="stat-tile"><div class="st-label">欧洲赛事</div><div class="st-value" style="font-size:20px">青年欧冠</div><div class="st-note">UEFA Youth League</div></div>' +
        (t.country ? '<div class="stat-tile"><div class="st-label">国家</div><div class="st-value" style="font-size:20px">' + esc(nationZh(t.country)) + "</div></div>" : "") +
      "</div>";
  }

  /* ── 伤病名单 ── */
  function renderInjuries(data) {
    const el = $("u19-injuries");
    if (!el) return;
    const players = (data && data.players) || [];
    const injured = players.filter(function (p) { return p.injury && p.injury.status === "out"; });
    const updated = (data && data.updated) || "";
    const zhMap = buildZhMap("juvenil-a");

    if (!injured.length) {
      el.innerHTML = '<div class="match-list-empty">✅ 目前无伤缺球员' +
        (updated ? ' <span style="color:var(--faint)">（Sofascore 数据每日更新 · ' + esc(updated) + '）</span>' : '') +
        "</div>";
      return;
    }

    let html = '<div class="pl-group">🤕 伤病名单 · ' + injured.length + " 人</div>";
    injured.forEach(function (p) {
      const zh = lookupZh(p.name, zhMap) || {};
      const display = zh.zh || p.name || "";
      const ini = esc(initials(p.name)) || "·";
      const avatar = '<span class="pl-avatar">' +
        (p.photo ? '<img src="' + esc(p.photo) + '" alt="' + esc(display) + '" loading="lazy" referrerpolicy="no-referrer"' +
          ' onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">' : "") +
        '<span class="pl-init" style="' + (p.photo ? "display:none" : "display:grid") + '">' + ini + "</span></span>";
      html +=
        '<div class="dqd-inj-row">' + avatar +
        '<div class="dqd-inj-info">' +
          '<div class="dqd-inj-name">' + esc(display) + ' <span class="pl-inj">伤</span></div>' +
          '<div class="dqd-inj-type">' + esc(p.injury.reason || "伤病") +
            (p.injury.reasonEn && p.injury.reasonEn !== p.injury.reason ? '（' + esc(p.injury.reasonEn) + "）" : "") + "</div>" +
          '<div class="dqd-inj-meta">' + (p.injury.expected ? "预计 " + esc(p.injury.expected) + " 复出" : "归期未定") + "</div>" +
        "</div></div>";
    });
    el.innerHTML = html;
  }

  /* ── 球员名单（按位置分组） ── */
  function renderRoster(data) {
    const el = $("u19-roster");
    const badge = $("u19-count-badge");
    if (!el) return;
    const players = (data && data.players) || [];
    if (!players.length) {
      el.innerHTML = '<div class="match-list-empty">暂无名单数据</div>';
      if (badge) badge.textContent = "暂无";
      return;
    }
    const zhMap = buildZhMap("juvenil-a");

    function statsNote(p) {
      return p.value ? "身价(欧) " + p.value : "";
    }

    let total = 0;
    let html = "";

    // 教练组（置顶，顺序：教练→前锋→中场→后卫→门将，与 B 队一致）
    const coach = (data && data.coach) || (window.DQD_U19_CACHE && window.DQD_U19_CACHE.coach) || null;
    if (coach && coach.name) {
      const c = coach;
      const ini = esc(initials(c.name)) || "·";
      const avatar = '<span class="pl-avatar">' +
        (c.photo ? '<img src="' + esc(c.photo) + '" alt="' + esc(c.name) + '" loading="lazy" referrerpolicy="no-referrer"' +
          ' data-zh="' + esc(c.name) + '" data-credit="Sofascore" data-src-url="' + esc(c.photo) + '"' +
          ' onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">' : "") +
        '<span class="pl-init" style="' + (c.photo ? "display:none" : "display:grid") + '">' + ini + "</span></span>";
      html += '<div class="pl-group">🧑‍🏫 教练组 <span style="opacity:.55;font-weight:600">· 1 人</span></div>' +
        '<div class="pl-row">' +
          '<span class="pl-num">—</span>' + avatar +
          '<span class="pl-name"><span class="zh">' + esc(c.name) + '</span><span class="en">主教练 · Head Coach</span></span>' +
          '<span class="pl-pos other">教练</span>' +
          '<span class="pl-nation">西班牙</span>' +
          '<span class="pl-dob"></span>' +
          '<span class="pl-note">主教练</span>' +
        "</div>";
      total++;
    }

    POS_ORDER.forEach(function (code) {
      const ps = players.filter(function (p) { return p.pos === code; });
      if (!ps.length) return;
      total += ps.length;
      html += '<div class="pl-group">' + POS_TITLE[code] + ' <span style="opacity:.55;font-weight:600">· ' + ps.length + " 人</span></div>";
      ps.forEach(function (p) {
        const zh = lookupZh(p.name, zhMap) || {};
        const display = zh.zh || p.name || "";          // 优先官方名单的中文名
        const ini  = esc(initials(p.name)) || "·";
        const injBadge = (p.injury && p.injury.status === "out")
          ? '<span class="pl-inj" title="伤病：' + esc(p.injury.reason) +
            (p.injury.expected ? "，预计 " + esc(p.injury.expected) + " 复出" : "") + '">伤</span>' : "";
        const teamTag = p.team && p.team !== "Barcelona U19"
          ? '<span class="u19-team-tag" title="Sofascore 当前所属球队">' + esc(p.team.replace("Barcelona ", "巴萨")) + "</span>" : "";
        const avatar = '<span class="pl-avatar">' +
          (p.photo ? '<img src="' + esc(p.photo) + '" alt="' + esc(display) + '" loading="lazy" referrerpolicy="no-referrer"' +
            ' data-zh="' + esc(display) + '" data-credit="Sofascore" data-src-url="' + esc(p.photo) + '"' +
            ' onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">' : "") +
          '<span class="pl-init" style="' + (p.photo ? "display:none" : "display:grid") + '">' + ini + "</span></span>";
        html +=
          '<div class="pl-row">' +
            '<span class="pl-num">' + esc(p.shirt || "—") + "</span>" +
            avatar +
            '<span class="pl-name"><span class="zh">' + esc(display) + injBadge + teamTag + "</span>" +
            '<span class="en">' + esc(p.name || "") + "</span></span>" +
            '<span class="pl-pos ' + (POS_CLASS[code] || "other") + '">' + (POS_ZH[code] || "") + "</span>" +
            '<span class="pl-nation">' + esc(nationZh(p.nation)) + "</span>" +
            '<span class="pl-dob">' + esc(p.age || "") + "</span>" +
            '<span class="pl-note">' + esc([statsNote(p), zh.note].filter(Boolean).join(" · ")) + "</span>" +
          "</div>";
      });
    });
    el.innerHTML = html || '<div class="match-list-empty">暂无名单数据</div>';
    if (badge) badge.textContent = total + " 人";
  }

  /* ── 赛程（已完场置顶 + 可折叠） ── */
  function renderSchedule(data) {
    const el = $("u19-schedule");
    if (!el) return;
    const matches = (data && data.matches) || [];
    if (!matches.length) { el.innerHTML = '<div class="match-list-empty">暂无赛程数据</div>'; return; }

    const played   = matches.filter(function (m) { return m.status !== "Not started"; })
                            .sort(function (a, b) { return parseInt(b.start, 10) - parseInt(a.start, 10); });
    const upcoming = matches.filter(function (m) { return m.status === "Not started"; })
                            .sort(function (a, b) { return parseInt(a.start, 10) - parseInt(b.start, 10); });

    function pill(m) {
      if (m.status === "Ended") {
        const a = parseInt(m.hs, 10), b = parseInt(m.as, 10);
        if (a === b) return '<span class="pos-pill other">平</span>';
        const win = m.isHome ? a > b : b > a;
        return win ? '<span class="pos-pill fw">胜</span>' : '<span class="pos-pill other">负</span>';
      }
      if (m.status && m.status !== "Not started") return '<span class="pos-pill mf">' + esc(m.status) + "</span>";
      return '<span class="pos-pill other">未开赛</span>';
    }

    function row(m) {
      const playedNow = m.status === "Ended";
      const score = playedNow ? (esc(m.hs || "0") + " : " + esc(m.as || "0")) : "vs";
      const teamCell = function (name, id) {
        return '<td><span class="match-team">' +
          '<img class="match-logo" src="' + esc("https://img.sofascore.com/api/v1/team/" + id + "/image") + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">' +
          esc(name || "") + "</span></td>";
      };
      return "<tr>" +
        '<td class="num">' + esc(fmtTime(m.start)) + "</td>" +
        "<td>" + esc(m.comp || "") + (m.round ? ' <span style="color:var(--faint);font-size:12px">R' + esc(m.round) + "</span>" : "") + "</td>" +
        teamCell(m.home, m.homeId) +
        '<td class="num" style="text-align:center;width:72px">' + score + "</td>" +
        teamCell(m.away, m.awayId) +
        "<td>" + pill(m) + "</td>" +
        "</tr>";
    }

    function group(title, rows, open, headLabel) {
      return '<details class="dqd-group"' + (open ? " open" : "") + ">" +
        "<summary><span>" + title + "</span>" +
        '<span class="dqd-side"><span class="dqd-count">' + rows.length + " 场</span>" +
        '<span class="dqd-state"></span></span></summary>' +
        '<div class="dqd-body"><div class="table-wrap"><table class="roster-table">' +
        "<thead><tr><th>时间</th><th>赛事</th><th>主队</th><th>比分</th><th>客队</th><th>" + headLabel + "</th></tr></thead>" +
        "<tbody>" + rows.map(row).join("") + "</tbody></table></div></div></details>";
    }

    let html = "";
    if (played.length)   html += group("🏁 已完场", played, true, "结果");
    if (upcoming.length) html += group("📅 未开赛", upcoming, false, "状态");
    el.innerHTML = html || '<div class="match-list-empty">暂无赛程数据</div>';
  }

  /* ── 数据源状态条 ── */
  function setStatus(mode, updated) {
    const el = $("u19-status");
    if (!el) return;
    if (mode === "live") {
      el.className = "note-box blue";
      el.innerHTML = '<span>📡 <b>数据来源：Sofascore</b>（实时拉取）· 更新于 ' + esc(updated) + "。</span>";
    } else if (mode === "cache") {
      el.className = "note-box";
      el.innerHTML = '<span>💾 <b>当前显示本地缓存</b>（Sofascore · 更新于 ' + esc(updated || "未知") +
        "）——联网后刷新会自动切换实时数据。</span>";
    } else {
      el.className = "note-box";
      el.innerHTML = '<span>⚠️ <b>暂时无法获取 Sofascore 数据</b>（离线或接口变动）。可运行 <code>scripts/update_u19_sofascore.ps1</code> 更新本地缓存。</span>';
    }
  }

  /* ── 主流程：缓存先渲染，再尽力实时刷新 ── */
  async function load() {
    const c = window.DQD_U19_CACHE;
    if (c && c.players) {
      renderTeam(c); renderInjuries(c); renderRoster(c); renderSchedule(c);
      setStatus("cache", c.updated);
    }
    try {
      const [players, lastEv, nextEv] = await Promise.all([
        fetch(API + "/team/" + TEAM_ID + "/players", { credentials: "omit" }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }),
        fetch(API + "/team/" + TEAM_ID + "/events/last/0", { credentials: "omit" }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }),
        fetch(API + "/team/" + TEAM_ID + "/events/next/0", { credentials: "omit" }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      ]);
      const live = normalizeLive(players, lastEv, nextEv);
      renderTeam(live); renderInjuries(live); renderRoster(live); renderSchedule(live);
      setStatus("live", live.updated);
    } catch (err) {
      if (!(c && c.players)) setStatus("none");
      // 已有缓存时保持缓存显示，静默失败
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
