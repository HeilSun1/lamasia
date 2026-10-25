/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 官方站青年梯队赛程渲染器
   ─────────────────────────────────────────────────────────────
   读取 assets/js/fcb-youth-schedules.js 的 window.LAMASIA_SCHEDULES，
   把 cadete / cadete-b / infantil / infantil-b / infantil-c / juvenil-b 各队赛程
   渲染成与 B队/U19 一致的 dqd-group 表格（复用 style.css）。
   差异点：无 Sofascore 队标、时间待定显示「待定」、FC Barcelona A 显示为「巴萨 A」。
   数据源为官网赛事接口，无 Sofascore 阵容/统计详情 → match-detail 弹窗只显示基本信息。
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

  /* 时间待定 → 只显示日期 + 「待定」；日期统一 "MM-DD" 紧凑格式（赛季内年号省略） */
  function shortDate(dateStr) {
    const m = String(dateStr || "").match(/^\d{4}-(\d{2})-(\d{2})/);
    return m ? m[1] + "-" + m[2] : String(dateStr || "").trim();
  }
  function fmtKick(m) {
    if (m.tbd) return shortDate(m.date) + " 待定";
    const t = new Date(parseInt(m.start, 10) * 1000);
    if (isNaN(t.getTime())) return shortDate(m.date);
    const pad = function (n) { return String(n).padStart(2, "0"); };
    return pad(t.getMonth() + 1) + "-" + pad(t.getDate()) + " " + pad(t.getHours()) + ":" + pad(t.getMinutes());
  }

  /* 各梯队 U 年龄段（对应 fcb-youth-schedules 的 tier 键） */
  var U_AGE = { cadete: "U16", "cadete-b": "U15", infantil: "U14", "infantil-b": "U13", "infantil-c": "U12", "juvenil-b": "U19B" };

  /* 有 elfutbol 逐场阵容/进球缓存的梯队（scripts/update_elfutbol_details.ps1 -Tier 生成）。
     cacheRef 名字按 match-detail.js 的规则就能推出缓存文件与全局名。 */
  var DETAIL_REF = {
    "cadete-b": "ELFUTBOL_CADETE_B_CACHE",
    "cadete": "ELFUTBOL_CADETE_CACHE",
    "juvenil-b": "ELFUTBOL_JUVENIL_B_CACHE",
    "infantil": "ELFUTBOL_INFANTIL_CACHE",
    "infantil-b": "ELFUTBOL_INFANTIL_B_CACHE",
    "infantil-c": "ELFUTBOL_INFANTIL_C_CACHE"
  };

  /* 显示层队名：官方站本队写作 "FC Barcelona A"，按梯队显示「巴萨 U16/U15…」（与 U19 命名一致） */
  function disp(name, tier) {
    const n = String(name || "").trim();
    if (/^FC Barcelona/.test(n)) return "巴萨 " + (U_AGE[tier] || "A");
    return n;
  }

  /* 官方队徽（resources.fcbarcelona.pulselive.com）；对手徽章常被防盗链 403 → 回退默认徽章。
     各梯队的对手队徽优先走 elfutbol 托管的真队徽（elfutbol-crests-cache.js 按 pulselive 队号落键，
     由 scripts/update_elfutbol_details.ps1 生成）；没加载该表时行为与原来一致。 */
  function badgeUrl(id) {
    var reg = window.ELFUTBOL_CRESTS;
    if (reg && id != null && reg[String(id)]) return reg[String(id)];
    return id ? "https://resources.fcbarcelona.pulselive.com/badges/fby/40/t" + id + ".png" : "";
  }
  function teamCell(name, id, tier, logoOverride) {
    const b = logoOverride || badgeUrl(id);
    return '<td><span class="match-team">' +
      (b ? '<img class="match-logo" src="' + esc(b) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src=\'https://resources.fcbarcelona.pulselive.com/badges/club/40/default.png\'">' : "") +
      esc(disp(name, tier)) + "</span></td>";
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

  function row(m, tier, tierSlug) {
    const playedNow = m.status === "Ended";
    const score = playedNow ? (esc(m.hs || "0") + " : " + esc(m.as || "0")) : "vs";
    const key = m.key || m.id;   // 官方缓存 id 已带 "fcb:" 前缀；external 场次自带 key
    // 有 elfutbol.co 逐场阵容/进球缓存的梯队（U15/U19B/U16/U14）带上 cacheRef，
    // match-detail.js 会按需懒加载对应 elfutbol-*-details-cache.js；
    // 其余梯队仍是最小详情（无阵容 → 只显示基本信息 + 官网外链）。
    const dtRef = m.detailRef || DETAIL_REF[tier] || "";
    if (!window.LAMASIA_MATCHES) window.LAMASIA_MATCHES = {};
    if (!window.LAMASIA_MATCHES[key]) {
      window.LAMASIA_MATCHES[key] = {
        source: "fcb", id: m.id, slug: tierSlug || tier,
        comp: m.comp || "", round: m.round || "",
        start: m.start, date: m.date || "", tbd: m.tbd,
        home: m.home || "", away: m.away || "",
        hs: m.hs || "", as: m.as || "", status: m.status, isHome: m.isHome,
        venue: m.venue || "", homeLogo: badgeUrl(m.homeId), awayLogo: badgeUrl(m.awayId),
        cacheRef: dtRef
      };
    }
    return '<tr data-match-key="' + key + '" class="match-row" title="' +
      (dtRef ? "点击查看（阵容 / 进球）" : "点击查看（官方赛程 · 无阵容详情）") + '">' +
      '<td class="num">' + esc(fmtKick(m)) + "</td>" +
      "<td>" + esc(m.comp || "") + (m.round ? ' <span style="color:var(--faint);font-size:12px">R' + esc(m.round) + "</span>" : "") + "</td>" +
      teamCell(m.home, m.homeId, tier, m.homeLogo) +
      '<td class="num" style="text-align:center;width:72px">' + score + "</td>" +
      teamCell(m.away, m.awayId, tier, m.awayLogo) +
      "<td>" + pill(m) + "</td>" +
      "</tr>";
  }

  function group(title, rows, open, headLabel, tier, tierSlug) {
    return '<details class="dqd-group"' + (open ? " open" : "") + ">" +
      "<summary><span>" + title + "</span>" +
      '<span class="dqd-side"><span class="dqd-count">' + rows.length + " 场</span>" +
      '<span class="dqd-state"></span></span></summary>' +
      '<div class="dqd-body"><div class="table-wrap"><table class="roster-table">' +
      "<thead><tr><th>时间</th><th>赛事</th><th>主队</th><th>比分</th><th>客队</th><th>" + headLabel + "</th></tr></thead>" +
      "<tbody>" + rows.map(function (m) { return row(m, tier, tierSlug); }).join("") + "</tbody></table></div></div></details>";
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
    // extraPlayed：外部来源（如 U19B 的 Sofascore 八月热身赛）并进同一个「已完场」分组，
    // 避免页面上出现两个「已完场」标题。
    const extra = (opts && opts.extraPlayed) || [];
    const played   = matches.filter(function (m) { return m.status !== "Not started"; })
                            .concat(extra)
                            .sort(function (a, b) { return parseInt(b.start, 10) - parseInt(a.start, 10); });
    const upcoming = matches.filter(function (m) { return m.status === "Not started"; })
                            .sort(function (a, b) { return parseInt(a.start, 10) - parseInt(b.start, 10); });
    const tierSlug = (opts && opts.tierSlug) || tier;
    let html = "";
    if (played.length)   html += group("🏁 已完场", played, true, "结果", tier, tierSlug);
    if (upcoming.length) html += group("📅 未开赛", upcoming, false, "状态", tier, tierSlug);
    el.innerHTML = html || '<div class="match-list-empty">暂无赛程数据</div>';

    if (opts.statusEl) {
      const st = document.getElementById(opts.statusEl);
      if (st) {
        const updated = (window.LAMASIA_SCHEDULES && window.LAMASIA_SCHEDULES.updated) || "";
        st.className = "note-box blue";
        st.innerHTML = '<span>📡 <b>数据来源：FC Barcelona 官网</b>（赛事接口每日抓取，含赛果）' +
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
        '<div class="stat-tile"><div class="st-label">数据源</div><div class="st-value" style="font-size:20px">FC Barcelona 官网</div><div class="st-note">赛事接口每日自动抓取</div></div>' +
        (comp ? '<div class="stat-tile"><div class="st-label">赛事</div><div class="st-value" style="font-size:20px">' + esc(comp) + "</div>" +
          (compEn ? '<div class="st-note">' + esc(compEn) + "</div>" : "") + "</div>" : "") +
      "</div>";
  }

  window.LAMASIA_SCHEDULE_RENDER = { render: render, renderTeamInfo: renderTeamInfo };
})();
