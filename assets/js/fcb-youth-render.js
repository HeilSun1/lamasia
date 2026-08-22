/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 官方站青年梯队赛程渲染器
   ─────────────────────────────────────────────────────────────
   读取 assets/js/fcb-youth-schedules.js 的 window.LAMASIA_SCHEDULES，
   把 cadete / cadete-b / infantil / infantil-b 四队赛程渲染成
   与 B队/U19 一致的 dqd-group 表格（复用 style.css）。
   差异点：无 Sofascore 队标、时间待定显示「待定」、FC Barcelona A 显示为「巴萨 A」。
   数据源为官方站，无 Sofascore 阵容/统计详情 → match-detail 弹窗只显示基本信息。
   依赖：roster.js（可选）、match-detail.js（可选）
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function fmtTime(unix) {
    const t = new Date(parseInt(unix, 10) * 1000);
    if (isNaN(t.getTime())) return "";
    const pad = function (n) { return String(n).padStart(2, "0"); };
    return t.getFullYear() + "-" + pad(t.getMonth() + 1) + "-" + pad(t.getDate()) + " " + pad(t.getHours()) + ":" + pad(t.getMinutes());
  }

  /* 时间待定 → 只显示日期 + 「待定」 */
  function fmtKick(m) {
    return m.tbd ? (String(m.date || "").trim() + " 待定") : fmtTime(m.start);
  }

  /* 显示层队名：官方站本队写作 "FC Barcelona A"，省宽度显示「巴萨 A」 */
  function disp(name) {
    const n = String(name || "").trim();
    if (/^FC Barcelona/.test(n)) return "巴萨 A";
    return n;
  }

  /* 官方队徽（resources.fcbarcelona.pulselive.com）；对手徽章常被防盗链 403 → 回退默认徽章 */
  function badgeUrl(id) {
    return id ? "https://resources.fcbarcelona.pulselive.com/badges/fby/40/t" + id + ".png" : "";
  }
  function teamCell(name, id) {
    const b = badgeUrl(id);
    return '<td><span class="match-team">' +
      (b ? '<img class="match-logo" src="' + esc(b) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src=\'https://resources.fcbarcelona.pulselive.com/badges/club/40/default.png\'">' : "") +
      esc(disp(name)) + "</span></td>";
  }

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

  function row(m, tierSlug) {
    const playedNow = m.status === "Ended";
    const score = playedNow ? (esc(m.hs || "0") + " : " + esc(m.as || "0")) : "vs";
    const key = "fcb:" + m.id;
    // 注册最小详情（无 Sofascore 阵容/统计 → match-detail 只显示基本信息 + 官网外链）
    if (!window.LAMASIA_MATCHES) window.LAMASIA_MATCHES = {};
    if (!window.LAMASIA_MATCHES[key]) {
      window.LAMASIA_MATCHES[key] = {
        source: "fcb", id: m.id, slug: tierSlug,
        comp: m.comp || "", round: m.round || "",
        start: m.start, date: m.date || "", tbd: m.tbd,
        home: m.home || "", away: m.away || "",
        hs: m.hs || "", as: m.as || "", status: m.status, isHome: m.isHome,
        venue: m.venue || "", homeLogo: badgeUrl(m.homeId), awayLogo: badgeUrl(m.awayId)
      };
    }
    return '<tr data-match-key="' + key + '" class="match-row" title="点击查看（官方赛程 · 无阵容详情）">' +
      '<td class="num">' + esc(fmtKick(m)) + "</td>" +
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

  function data() {
    return (window.LAMASIA_SCHEDULES && window.LAMASIA_SCHEDULES.matches) || null;
  }

  /* 渲染赛程到容器 elId */
  function render(tier, elId, opts) {
    opts = opts || {};
    const el = document.getElementById(elId);
    if (!el) return;
    const matches = (data() && data()[tier]) || [];
    if (!matches.length) {
      el.innerHTML = '<div class="match-list-empty">暂无赛程数据（运行每日脚本后生成）</div>';
      return;
    }
    const played   = matches.filter(function (m) { return m.status !== "Not started"; })
                            .sort(function (a, b) { return parseInt(b.start, 10) - parseInt(a.start, 10); });
    const upcoming = matches.filter(function (m) { return m.status === "Not started"; })
                            .sort(function (a, b) { return parseInt(a.start, 10) - parseInt(b.start, 10); });
    let html = "";
    if (played.length)   html += group("🏁 已完场", played, true, "结果");
    if (upcoming.length) html += group("📅 未开赛", upcoming, false, "状态");
    el.innerHTML = html || '<div class="match-list-empty">暂无赛程数据</div>';

    if (opts.statusEl) {
      const st = document.getElementById(opts.statusEl);
      if (st) {
        const updated = (window.LAMASIA_SCHEDULES && window.LAMASIA_SCHEDULES.updated) || "";
        st.className = "note-box blue";
        st.innerHTML = '<span>📡 <b>数据来源：FC Barcelona 官网</b>（calendario 每日抓取）' +
          (opts.fallback ? " · Sofascore 赛程暂缺，已用官方数据兜底" : "") +
          (updated ? " · 更新于 " + esc(updated) : "") + "。</span>";
      }
    }
  }

  /* 球队信息（简单 stats-row：联赛中文/英文 + 数据源） */
  function renderTeamInfo(tier, elId) {
    const el = document.getElementById(elId);
    if (!el) return;
    const t = (window.LAMASIA_SCHEDULES && window.LAMASIA_SCHEDULES.teams && window.LAMASIA_SCHEDULES.teams[tier]) || null;
    const comp = t ? t.comp : "";
    const compEn = t ? t.compEn : "";
    el.innerHTML =
      '<div class="stats-row">' +
        '<div class="stat-tile"><div class="st-label">数据源</div><div class="st-value" style="font-size:20px">FC Barcelona 官网</div><div class="st-note">calendario 每日自动抓取</div></div>' +
        (comp ? '<div class="stat-tile"><div class="st-label">赛事</div><div class="st-value" style="font-size:20px">' + esc(comp) + "</div>" +
          (compEn ? '<div class="st-note">' + esc(compEn) + "</div>" : "") + "</div>" : "") +
      "</div>";
  }

  window.LAMASIA_SCHEDULE_RENDER = { render: render, renderTeamInfo: renderTeamInfo };
})();
