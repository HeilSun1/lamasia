/* ═══════════════════════════════════════════════
   拉玛西亚信息站 · 球员名单渲染器
   依赖：assets/js/data.js（window.LAMASIA_DATA）
         assets/js/manual-photos-hook.js（可选：本轮手动补的照片）
   ═══════════════════════════════════════════════ */
(function () {
  const POS_ORDER = [
    ["FW", "前锋"],
    ["MF", "中场"],
    ["DF", "后卫"],
    ["GK", "门将"]
  ];
  const POS_CLASS = { GK: "gk", DF: "df", MF: "mf", FW: "fw" };
  const POS_ZH = { GK: "门将", DF: "后卫", MF: "中场", FW: "前锋" };

  // 球员卡片索引键（与 player-card.js 的 norm 一致）
  /* 归一规则见 assets/js/people.js（全站唯一一份） */
  var normKey = window.People.norm;

  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* 头像与「手动补图」都在 assets/js/avatar.js 里统一处理，
     本文件只负责行结构与灯箱。 */

  /* 梯队 → Sofascore 实时缓存（含 players 数组）。
     data.js 是 2025-26 快照，没有「已升队/已离队」字段，只能靠实时名单对一遍。 */
  const LIVE_CACHE = {
    "juvenil-a": "DQD_U19_CACHE",
    "juvenil-b": "DQD_U18_CACHE",
    "cadete": "DQD_U16_CACHE"
  };

  function render(teamId, elId, imgBase) {
    const base = imgBase || "assets/img/players/";
    const el = document.getElementById(elId);

    if (!el || !window.LAMASIA_DATA || !LAMASIA_DATA.players || !LAMASIA_DATA.players[teamId]) {
      if (el) el.innerHTML = '<div class="match-list-empty">暂无名单数据</div>';
      return;
    }
    const squad = LAMASIA_DATA.players[teamId];
    let html = "";
    for (const [code, title] of POS_ORDER) {
      const ps = squad.filter(p => p.pos === code);
      if (!ps.length) continue;
      html += `<div class="pl-group">${title} <span style="opacity:.55;font-weight:600">· ${ps.length} 人</span></div>`;
      for (const p of ps) {
        const credit = p.imgCredit ? `（图片来源：${p.imgCredit}）` : "";
        // 头像统一走 avatar.js：手动图 → Sofascore → 本地图 → 首字母
        const avatar = window.AvatarHtml({
          name: p.name, en: p.name, zh: p.zh, img: p.img, tier: teamId, base: base,
          alt: `${p.zh || p.name}${credit}`
        }, {
          attrs: `title="点击查看大图" data-zh="${esc(p.zh || p.name)}" data-credit="${esc(p.imgCredit || "")}" data-src-url="${esc(p.imgUrl || "")}"`
        });
        html += `
          <div class="pl-row">
            <span class="pl-num">${esc(p.num || "—")}</span>
            <span class="pl-avatar">${avatar}</span>
            <span class="pl-name" data-player-key="local:${teamId}:${normKey(p.name)}" title="点击查看球员卡片">
              <span class="zh">${esc(p.zh || p.name)}</span>
              <span class="en">${esc(p.name)}</span>
            </span>
            <span class="pl-pos ${POS_CLASS[p.pos]}"${p.role ? ` title="${esc(p.role)}"` : ""}>${POS_ZH[p.pos]}${p.role ? `<span class="pl-role">${esc(p.role)}</span>` : ""}</span>
            <span class="pl-nation">${esc(p.nation)}</span>
            <span class="pl-dob">${esc(p.dob || "—")}</span>
            <span class="pl-note">${esc(p.note || "")}</span>
          </div>`;
      }
    }
    // 照片来源标注（版权合规：为每张照片注明出处链接）
    const withPhoto = squad.filter(p => p.img && p.imgCredit);
    if (withPhoto.length) {
      html += `<div class="pl-credits"><b>照片来源：</b>` +
        withPhoto.map(p =>
          `<a href="${esc(p.imgUrl)}" target="_blank" rel="noopener">${esc(p.zh || p.name)}（${esc(p.imgCredit)}）</a>`
        ).join("、") +
        `。图片版权归原出处/摄影师所有，如需移除请联系本站。`;
    }
    applyPositions(squad);
    el.innerHTML = html;
    /* 徽标人数以前是手写死的（juvenil-b 写 28 人、实际 26 行），这里按真实行数改一次 */
    const badgeEl = el.parentNode ? el.parentNode.querySelector(".badge") : null;
    if (badgeEl) {
      const txt = badgeEl.textContent.trim();
      badgeEl.textContent = /·\s*\d+\s*人$/.test(txt)
        ? txt.replace(/·\s*\d+\s*人$/, "· " + squad.length + " 人")
        : squad.length + " 人";
    }
  }

  /* 阵容位置分布面板（各队页顶部那个横条）以前是手写死数据，改名单就不同步。
     现在由调用方把名单交进来，条数与百分比一律重算。 */
  const POS_ZH2CODE = { "门将": "GK", "后卫": "DF", "中场": "MF", "前锋": "FW" };
  /* 位置码有两套：data.js 用 GK/DF/MF/FW，Sofascore 缓存用 G/D/M/F，统一归一 */
  const POS_NORM = { GK: "GK", DF: "DF", MF: "MF", FW: "FW", G: "GK", D: "DF", M: "MF", F: "FW" };
  function applyPositions(squad) {
    const panel = document.getElementById("sec-positions");
    if (!panel || !squad || !squad.length) return;
    const counts = { GK: 0, DF: 0, MF: 0, FW: 0 };
    squad.forEach(function (p) {
      const c = POS_NORM[p.pos];
      if (c) counts[c]++;
    });
    const total = counts.GK + counts.DF + counts.MF + counts.FW;
    if (!total) return;
    const badge = panel.querySelector(".badge");
    if (badge) badge.textContent = "共 " + total + " 名球员";
    Array.prototype.forEach.call(panel.querySelectorAll(".pos-bar"), function (bar) {
      const lab = bar.querySelector(".pb-label");
      const num = bar.querySelector(".pb-num");
      const fill = bar.querySelector(".pb-fill");
      if (!lab) return;
      const code = POS_ZH2CODE[lab.textContent.trim()];
      if (!code) return;
      const n = counts[code];
      if (num) num.textContent = n;
      if (fill) fill.style.width = (total ? Math.round(n / total * 100) : 0) + "%";
    });
  }

  /* ── 照片灯箱：点击球员照片放大查看 ── */
  function openLightbox(src, zh, credit, url) {
    let lb = document.getElementById("lamasia-lightbox");
    if (!lb) {
      lb = document.createElement("div");
      lb.id = "lamasia-lightbox";
      lb.className = "lightbox";
      lb.innerHTML =
        '<div class="lightbox-inner">' +
        '<button class="lightbox-close" title="关闭">✕</button>' +
        "<img alt=\"\">" +
        '<div class="lightbox-caption"></div>' +
        "</div>";
      document.body.appendChild(lb);
      lb.addEventListener("click", function (e) {
        if (e.target === lb || e.target.classList.contains("lightbox-close")) closeLightbox();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeLightbox();
      });
    }
    lb.querySelector("img").src = src;
    lb.querySelector(".lightbox-caption").innerHTML =
      esc(zh) +
      (credit ? " · " + esc(credit) : "") +
      (url ? ' · <a href="' + esc(url) + '" target="_blank" rel="noopener">查看来源 →</a>' : "");
    lb.classList.add("open");
  }

  function closeLightbox() {
    const lb = document.getElementById("lamasia-lightbox");
    if (lb) lb.classList.remove("open");
  }

  // 委托点击：任意球员头像照片 → 放大
  document.addEventListener("click", function (e) {
    const img = e.target.closest ? e.target.closest(".pl-avatar img") : null;
    if (!img) return;
    e.preventDefault();
    openLightbox(
      img.src,
      img.getAttribute("data-zh") || img.alt || "",
      img.getAttribute("data-credit") || "",
      img.getAttribute("data-src-url") || ""
    );
  });

  /* ── 悬停提示：鼠标悬停球员行时，显示该行完整内容 ── */
  let tipEl = null;
  function ensureTip() {
    if (!tipEl) {
      tipEl = document.createElement("div");
      tipEl.className = "pl-tooltip";
      document.body.appendChild(tipEl);
    }
    return tipEl;
  }
  document.addEventListener("mouseover", function (e) {
    const row = e.target.closest ? e.target.closest(".pl-row") : null;
    if (!row) { if (tipEl) tipEl.style.display = "none"; return; }
    // 仅当行内某段文字被省略号截断时，才弹出提示显示完整内容（其余情况不弹）
    const full = [];
    row.querySelectorAll(".pl-name .en, .pl-nation, .pl-note").forEach(function (el) {
      if (el.scrollWidth > el.clientWidth + 2) {
        const t = el.innerText.trim();
        if (t) full.push(t);
      }
    });
    if (!full.length) { if (tipEl) tipEl.style.display = "none"; return; }
    const tip = ensureTip();
    tip.innerHTML = esc(full.join(" · "));
    tip.style.display = "block";
  });
  document.addEventListener("mousemove", function (e) {
    if (!tipEl || tipEl.style.display === "none") return;
    const pad = 14, r = tipEl.getBoundingClientRect();
    let x = e.clientX + pad, y = e.clientY + pad;
    if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - pad;
    if (y + r.height > window.innerHeight - 8) y = e.clientY - r.height - pad;
    tipEl.style.left = x + "px";
    tipEl.style.top = y + "px";
  });
  document.addEventListener("mouseout", function (e) {
    if (!tipEl) return;
    const to = e.relatedTarget;
    if (!to || !(to.closest ? to.closest(".pl-row") : null)) tipEl.style.display = "none";
  });

  window.LAMASIA_RENDER = {
    playerList: render,
    positions: applyPositions,
    lightbox: { open: openLightbox, close: closeLightbox }
  };
})();
