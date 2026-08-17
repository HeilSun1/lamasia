/* 比赛信息页 · 即将到来的比赛（各梯队未开赛汇总，按时间排序）
   读取 B队(dongqiudi) + U19/U18/U16(Sofascore) 四个缓存，提取未开赛比赛，
   统一转成北京时间排序显示。由 matches.html 引入。 */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  // epoch 毫秒 → 北京时间 "MM-DD HH:mm"
  function bj(ms) {
    const d = new Date(ms + 8 * 3600 * 1000);
    return pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()) + " " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes());
  }
  function now() { return Date.now(); }

  function collect() {
    const out = [];
    // B队：懂球帝，status === "Fixture"（赛程在 schedule.data 数组里）
    const B = window.DQD_BARCA_ATLETIC;
    if (B && B.schedule && Array.isArray(B.schedule.data)) {
      B.schedule.data.forEach(function (m) {
        if (String(m.status) !== "Fixture") return;
        const t = new Date(String(m.start_play || "").replace(" ", "T") + "+08:00").getTime();
        if (!t || t < now() - 3600e3) return; // 剔除已过期
        // 注册详情（仅当赛程渲染器未注册过，保留更完整的对象）
        const key = "dqd:" + m.match_id;
        if (!window.LAMASIA_MATCHES) window.LAMASIA_MATCHES = {};
        if (!window.LAMASIA_MATCHES[key]) {
          window.LAMASIA_MATCHES[key] = {
            source: "dqd", match_id: m.match_id, id: m.match_id,
            comp: m.competition_name || m.match_title || "", round: m.round_name || m.gameweek || "",
            startText: m.start_play || "",
            home: m.team_A_name || "", away: m.team_B_name || "",
            homeLogo: m.team_A_logo || "", awayLogo: m.team_B_logo || "",
            hs: m.fs_A || "", as: m.fs_B || "", status: m.status
          };
        }
        out.push({
          team: "B队", href: "teams/barca-atletic.html",
          key: key,
          start: t, comp: m.competition_name || m.match_title || "", round: m.round_name || "",
          home: m.team_A_name || "", away: m.team_B_name || "",
          homeLogo: m.team_A_logo || "", awayLogo: m.team_B_logo || "",
        });
      });
    }
    // Sofascore 三队：status === "Not started"
    [
      { key: "DQD_U19_CACHE", team: "Juvenil A", href: "teams/juvenil-a.html" },
      { key: "DQD_U18_CACHE", team: "Juvenil B", href: "teams/juvenil-b.html" },
      { key: "DQD_U16_CACHE", team: "Cadete A",  href: "teams/cadete.html" },
    ].forEach(function (cfg) {
      const c = window[cfg.key];
      if (!c || !Array.isArray(c.matches)) return;
      c.matches.forEach(function (m) {
        if (String(m.status) !== "Not started") return;
        const t = parseInt(m.start, 10) * 1000;
        if (!t || t < now() - 3600e3) return;
        // 注册详情（仅当赛程渲染器未注册过，保留更完整的对象）
        const key = "sofascore:" + m.id;
        if (!window.LAMASIA_MATCHES) window.LAMASIA_MATCHES = {};
        if (!window.LAMASIA_MATCHES[key]) {
          window.LAMASIA_MATCHES[key] = {
            source: "sofascore", id: m.id, comp: m.comp, round: m.round, start: m.start,
            home: m.home, away: m.away, homeId: m.homeId, awayId: m.awayId,
            hs: m.hs, as: m.as, status: m.status, isHome: m.isHome,
            homeLogo: "https://img.sofascore.com/api/v1/team/" + (m.homeId || 0) + "/image",
            awayLogo: "https://img.sofascore.com/api/v1/team/" + (m.awayId || 0) + "/image"
          };
        }
        out.push({
          team: cfg.team, href: cfg.href, key: key,
          start: t, comp: m.comp || "", round: m.round || "",
          home: m.home || "", away: m.away || "",
          homeLogo: "https://img.sofascore.com/api/v1/team/" + (m.homeId || 0) + "/image",
          awayLogo: "https://img.sofascore.com/api/v1/team/" + (m.awayId || 0) + "/image",
        });
      });
    });
    out.sort(function (a, b) { return a.start - b.start; });
    return out;
  }

  function teamBadge(x) {
    return '<a href="' + esc(x.href) + '" style="white-space:nowrap;color:var(--primary);font-weight:600;text-decoration:none">' + esc(x.team) + "</a>";
  }
  function teamCell(name, logo) {
    return '<td><span class="match-team">' +
      '<img class="match-logo" src="' + esc(logo || "") + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">' +
      esc(name || "") + "</span></td>";
  }
  function row(x) {
    return '<tr data-match-key="' + esc(x.key || "") + '" class="match-row" title="点击查看详情">' +
      '<td class="num">' + esc(bj(x.start)) + "</td>" +
      "<td>" + teamBadge(x) + "</td>" +
      "<td>" + esc(x.comp || "") + (x.round ? ' <span style="color:var(--faint);font-size:12px">R' + esc(x.round) + "</span>" : "") + "</td>" +
      teamCell(x.home, x.homeLogo) +
      '<td class="num" style="text-align:center;width:48px">vs</td>' +
      teamCell(x.away, x.awayLogo) +
      "</tr>";
  }

  function render() {
    const el = $("upcoming-list");
    if (!el) return;
    const list = collect();
    if (!list.length) { el.innerHTML = '<div class="match-list-empty">暂无已公布的未开赛赛程</div>'; return; }

    function table(items) {
      return '<div class="table-wrap"><table class="roster-table">' +
        "<thead><tr><th>时间(北京)</th><th>梯队</th><th>赛事</th><th>主队</th><th></th><th>客队</th></tr></thead>" +
        "<tbody>" + items.map(row).join("") + "</tbody></table></div>";
    }
    // 默认只展示未来 7 天，其余折叠
    const WEEK = 7 * 24 * 3600 * 1000;
    const weekEnd = now() + WEEK;
    const week = list.filter(function (x) { return x.start <= weekEnd; });
    const rest = list.filter(function (x) { return x.start > weekEnd; });

    let html = "";
    if (week.length) {
      html += '<div class="p-desc" style="margin-bottom:8px">📅 未来 7 天 · ' + week.length + " 场</div>" + table(week);
    } else {
      html += '<div class="match-list-empty">未来 7 天内暂无已公布的比赛</div>';
    }
    if (rest.length) {
      html += '<details class="dqd-group" style="margin-top:10px"><summary><span>更远的赛程（' + rest.length + " 场）</span>" +
        '<span class="dqd-side"><span class="dqd-state"></span></span></summary>' + table(rest) + "</details>";
    }
    el.innerHTML = html;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
})();
