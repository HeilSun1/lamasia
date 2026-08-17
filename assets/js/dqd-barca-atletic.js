/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 巴萨B队（Barça Atlètic）懂球帝实时数据
   ─────────────────────────────────────────────────────────────
   行为：
     1. 页面打开时实时请求懂球帝接口 → 渲染 球员名单 / 赛程 / 球队信息
     2. 请求失败（离线或接口变动）→ 自动回退到本地缓存
        window.DQD_BARCA_ATLETIC（由 scripts/update_barca_atletic.ps1 每日生成）
     3. 两者皆无 → 显示提示
   依赖：roster.js（提供照片灯箱 .pl-avatar 点击放大）
   仅用于 teams/barca-atletic.html
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const TEAM_ID = "50001839";                    // 懂球帝 巴塞罗那竞技
  const API     = "https://pc.dongqiudi.com";
  const IMG_BASE = "../assets/img/players/dqd/"; // 本地照片目录（相对本页面所在 teams/ 目录）

  const POS_ORDER = ["coach", "attacker", "midfielder", "defender", "goalkeeper"];
  const POS_TITLE = { goalkeeper: "🧤 门将", defender: "🛡 后卫", midfielder: "⚙️ 中场", attacker: "🎯 前锋", coach: "🧑‍🏫 教练组" };
  const POS_CLASS = { goalkeeper: "gk", defender: "df", midfielder: "mf", attacker: "fw", coach: "other" };
  const POS_ZH    = { goalkeeper: "门将", defender: "后卫", midfielder: "中场", attacker: "前锋", coach: "教练" };

  const $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function initials(name) {
    return String(name || "").split(/[\s.-]+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join("");
  }

  function statString(stats) {
    if (!Array.isArray(stats)) return "";
    return stats.map(function (s) {
      const k = Object.keys(s)[0];
      return esc(k) + " " + esc(s[k]);
    }).join(" · ");
  }

  /* 照片地址归一化：缓存模式是"assets/img/players/dqd/x.jpg"（根目录相对），
     需换算成相对本页面的路径；实时模式是 CDN 绝对地址，原样使用。 */
  function photoSrc(p) {
    const pl = p.person_logo || "";
    if (pl.indexOf("assets/img/players/dqd/") === 0) {
      return IMG_BASE + pl.split("/").pop();
    }
    return pl;
  }

  /* ── 球员名单（按位置分组） ── */
  function renderRoster(data) {
    const el = $("dqd-roster");
    const badge = $("dqd-count-badge");
    if (!el) return;
    if (!data || !data.list) {
      el.innerHTML = '<div class="match-list-empty">暂无名单数据</div>';
      if (badge) badge.textContent = "暂无";
      return;
    }

    const groups = {};
    data.list.forEach(function (g) { groups[g.type] = g; });

    let total = 0;
    let html = "";
    POS_ORDER.forEach(function (code) {
      const g = groups[code];
      if (!g || !g.data) return;
      const ps = g.data;
      total += ps.length;
      html += '<div class="pl-group">' + (POS_TITLE[code] || esc(code)) +
              ' <span style="opacity:.55;font-weight:600">· ' + ps.length + ' 人</span></div>';
      ps.forEach(function (p) {
        const name   = p.person_name || "";
        const en     = p.person_en_name || "";
        const num    = p.shirtnumber || "—";
        const src    = photoSrc(p);
        const srcUrl = p.person_logo_url || src;       // 版权来源（CDN 原地址）
        const ini    = esc(initials(en || name)) || "·";
        // 伤病标记（数据来自每日缓存，按 person_id 匹配）
        const inj = (window.DQD_BARCA_ATLETIC && window.DQD_BARCA_ATLETIC.injuries_map)
          ? window.DQD_BARCA_ATLETIC.injuries_map[p.person_id] : null;
        const injBadge = (inj && inj.status === "out")
          ? '<span class="pl-inj" title="伤病：' + esc(inj.injury || "") +
            '（' + esc(inj.date_from || "") + ' ~ ' + esc(inj.date_until || "归期未定") + '）">伤</span>'
          : "";
        const avatar =
          '<span class="pl-avatar">' +
            (src ? '<img src="' + esc(src) + '" alt="' + esc(name) + '" loading="lazy"' +
              ' data-zh="' + esc(name) + '" data-credit="懂球帝 Dongqiudi" data-src-url="' + esc(srcUrl) + '"' +
              ' onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">' : "") +
            '<span class="pl-init" style="' + (src ? "display:none" : "display:grid") + '">' + ini + '</span>' +
          '</span>';
        html +=
          '<div class="pl-row">' +
            '<span class="pl-num">' + esc(num) + '</span>' +
            avatar +
            '<span class="pl-name"><span class="zh">' + esc(name) + injBadge + '</span><span class="en">' + esc(en) + '</span></span>' +
            '<span class="pl-pos ' + (POS_CLASS[code] || "other") + '">' + (POS_ZH[code] || "") + '</span>' +
            '<span class="pl-nation">' + esc(p.nationality_name || "") + '</span>' +
            '<span class="pl-dob">' + esc(p.age || "") + '</span>' +
            '<span class="pl-note">' + statString(p.statistic) + '</span>' +
          '</div>';
      });
    });
    el.innerHTML = html || '<div class="match-list-empty">暂无名单数据</div>';
    if (badge) badge.textContent = total + " 人";
  }

  /* ── 伤病名单（数据来自每日缓存；实时模式下也读取该缓存） ── */
  function renderInjuries() {
    const el = $("dqd-injuries");
    if (!el) return;
    const c = window.DQD_BARCA_ATLETIC;
    const list    = (c && c.injuries_list) || [];
    const updated = (c && c.updated) || "";

    if (!list.length) {
      el.innerHTML = '<div class="match-list-empty">✅ 目前无伤病球员' +
        (updated ? ' <span style="color:var(--faint)">（伤病数据每日更新 · ' + esc(updated) + '）</span>' : '') +
        '</div>';
      return;
    }

    let html = '<div class="pl-group">🤕 伤病名单 · ' + list.length + ' 人' +
      (updated ? ' <span style="opacity:.55;font-weight:600">（每日更新 · ' + esc(updated) + '）</span>' : '') +
      '</div>';
    list.forEach(function (p) {
      const src    = p.photo || "";
      const ini    = esc(initials(p.en || p.name)) || "·";
      const avatar = '<span class="pl-avatar">' +
        (src ? '<img src="' + esc(photoSrc({ person_logo: src })) + '" alt="' + esc(p.name) + '" loading="lazy"' +
          ' onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">' : "") +
        '<span class="pl-init" style="' + (src ? "display:none" : "display:grid") + '">' + ini + '</span>' +
        '</span>';
      html +=
        '<div class="dqd-inj-row">' + avatar +
        '<div class="dqd-inj-info">' +
          '<div class="dqd-inj-name">' + esc(p.name) + ' <span class="pl-inj">伤</span></div>' +
          '<div class="dqd-inj-type">' + esc(p.injury || "伤病") +
            (p.days ? ' · 缺阵约 ' + esc(p.days) + " 天" : "") +
            (p.games_missed ? ' · 缺席 ' + esc(p.games_missed) + " 场" : "") + '</div>' +
          '<div class="dqd-inj-meta">' + (p.date_until ? "预计 " + esc(p.date_until) + " 复出" : "归期未定") + '</div>' +
        '</div></div>';
    });
    el.innerHTML = html;
  }

  /* ── 赛程（未开赛 + 已完场） ── */
  function renderSchedule(sched) {
    const el = $("dqd-schedule");
    if (!el) return;
    const list = (sched && sched.data) || [];
    if (!list.length) { el.innerHTML = '<div class="match-list-empty">暂无赛程数据</div>'; return; }

    function isBar(m) { return String(m.team_A_id) === TEAM_ID || String(m.team_B_id) === TEAM_ID; }
    function barIsA(m) { return String(m.team_A_id) === TEAM_ID; }

    function pill(m) {
      const st = String(m.status || "");
      if (st === "Played") {
        const a = parseInt(m.fs_A, 10), b = parseInt(m.fs_B, 10);
        if (isBar(m)) {
          if (a === b) return '<span class="pos-pill other">平</span>';
          const win = barIsA(m) ? a > b : b > a;
          return win ? '<span class="pos-pill fw">胜</span>' : '<span class="pos-pill other">负</span>';
        }
        return '<span class="pos-pill other">已完场</span>';
      }
      const live = /live|ing|进行/i.test(st) || (m.minute && String(m.minute).replace(/[^\d]/g, "") > 0);
      return live ? '<span class="pos-pill mf">进行中</span>' : '<span class="pos-pill other">未开赛</span>';
    }

    function row(m) {
      const played = String(m.status) === "Played";
      const score  = played ? (esc(m.fs_A || "0") + " : " + esc(m.fs_B || "0")) : "vs";
      const comp   = m.competition_name ? esc(m.competition_name) : "";
      const round  = m.round_name ? '<span style="color:var(--faint);font-size:12px">' + esc(m.round_name) + "</span>" : "";
      const teamCell = function (name, logo) {
        return '<td><span class="match-team">' +
          '<img class="match-logo" src="' + esc(logo || "") + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">' +
          esc(name || "") + "</span></td>";
      };
      // 注册到比赛详情注册表，供 match-detail.js 弹窗使用（懂球帝只显示对阵+外链）
      const key = "dqd:" + m.match_id;
      if (!window.LAMASIA_MATCHES) window.LAMASIA_MATCHES = {};
      window.LAMASIA_MATCHES[key] = {
        source: "dqd", match_id: m.match_id, id: m.match_id,
        comp: m.competition_name || m.match_title || "", round: m.round_name || m.gameweek || "",
        startText: m.start_play || "",
        home: m.team_A_name || "", away: m.team_B_name || "",
        homeLogo: m.team_A_logo || "", awayLogo: m.team_B_logo || "",
        hs: m.fs_A || "", as: m.fs_B || "", status: m.status
      };
      return '<tr data-match-key="' + key + '" class="match-row" title="点击查看详情">' +
        '<td class="num">' + esc((m.start_play || "").replace(" ", " ").slice(0, 16)) + "</td>" +
        "<td>" + comp + round + "</td>" +
        teamCell(m.team_A_name, m.team_A_logo) +
        '<td class="num" style="text-align:center;width:72px">' + score + "</td>" +
        teamCell(m.team_B_name, m.team_B_logo) +
        "<td>" + pill(m) + "</td>" +
        "</tr>";
    }

    const played   = list.filter(function (m) { return String(m.status) === "Played"; })
                         .sort(function (a, b) { return String(b.start_play).localeCompare(String(a.start_play)); });
    const upcoming = list.filter(function (m) { return String(m.status) !== "Played"; })
                         .sort(function (a, b) { return String(a.start_play).localeCompare(String(b.start_play)); });

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
    // 已完场（含结果）置顶、默认展开；未开赛默认收起，点击展开
    if (played.length)   html += group("🏁 已完场", played, true, "结果");
    if (upcoming.length) html += group("📅 未开赛", upcoming, false, "状态");
    el.innerHTML = html || '<div class="match-list-empty">暂无赛程数据</div>';
  }

  /* ── 球队信息 ── */
  function renderTeamInfo(info) {
    const el = $("dqd-teaminfo");
    if (!el) return;
    const b = (info && info.base_info) || {};
    const logo = $("dqd-team-logo");
    if (logo && b.team_logo) { logo.src = b.team_logo; logo.style.display = "block"; }
    if (logo && b.team_name) logo.alt = b.team_name;

    const tiles = [
      b.founded      && { l: "成立年份", v: b.founded, n: "" },
      b.city         && { l: "所在城市", v: b.city, n: "" },
      b.venue_name   && { l: "主场", v: b.venue_name, n: b.venue_capacity ? "可容纳 " + b.venue_capacity + " 人" : "" },
      b.country      && { l: "国家/地区", v: b.country, n: "" }
    ].filter(Boolean);

    el.innerHTML = tiles.length
      ? '<div class="stats-row">' + tiles.map(function (t) {
          return '<div class="stat-tile">' +
                   '<div class="st-label">' + esc(t.l) + "</div>" +
                   '<div class="st-value" style="font-size:20px">' + esc(t.v) + "</div>" +
                   (t.n ? '<div class="st-note">' + esc(t.n) + "</div>" : "") +
                 "</div>";
        }).join("") + "</div>"
      : "";
  }

  /* ── 数据源状态条 ── */
  function setStatus(mode, updated) {
    const el = $("dqd-status");
    if (!el) return;
    if (mode === "live") {
      el.className = "note-box blue";
      el.innerHTML = '<span>📡 <b>数据来源：懂球帝</b>（实时拉取）· 更新于 ' + esc(updated) +
                     "。联网时每次打开页面均为最新数据。</span>";
    } else if (mode === "cache") {
      el.className = "note-box";
      el.innerHTML = '<span>💾 <b>当前显示本地缓存</b>（懂球帝 · 更新于 ' + esc(updated || "未知") +
                     "）——联网后刷新会自动切换到实时数据。</span>";
    } else {
      el.className = "note-box";
      el.innerHTML = '<span>⚠️ <b>暂时无法获取懂球帝数据</b>（离线或接口变动）。请联网后刷新重试；如需离线归档，可运行 <code>scripts/update_barca_atletic.ps1</code> 更新本地缓存。</span>';
    }
  }

  function stamp(now) {
    const pad = function (n) { return String(n).padStart(2, "0"); };
    return now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) +
           " " + pad(now.getHours()) + ":" + pad(now.getMinutes());
  }

  async function load() {
    const urls = [
      API + "/sport-data/soccer/biz/dqd/v1/team/member_v2/" + TEAM_ID + "?app=dqd&lang=zh-cn",
      API + "/sport-data/soccer/biz/dqd/team/schedule/" + TEAM_ID + "?app=dqd&lang=zh-cn",
      API + "/api/data/v1/detail/team/" + TEAM_ID + "?app=dqd&lang=zh-cn"
    ];
    try {
      const results = await Promise.all(urls.map(function (u) {
        return fetch(u, { credentials: "omit" }).then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        });
      }));
      renderRoster(results[0].data);
      renderInjuries();
      renderSchedule(results[1]);
      renderTeamInfo(results[2]);
      setStatus("live", stamp(new Date()));
    } catch (err) {
      const c = window.DQD_BARCA_ATLETIC;
      if (c && c.roster) {
        renderRoster(c.roster);
        renderInjuries();
        renderSchedule(c.schedule);
        renderTeamInfo(c.teamInfo);
        setStatus("cache", c.updated);
      } else {
        renderRoster(null);
        renderInjuries();
        renderSchedule(null);
        renderTeamInfo(null);
        setStatus("none");
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
