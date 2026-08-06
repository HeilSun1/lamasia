/* ═══════════════════════════════════════════════
   拉玛西亚信息站 · 球员名单渲染器
   依赖：assets/js/data.js（window.LAMASIA_DATA）
   ═══════════════════════════════════════════════ */
(function () {
  const POS_ORDER = [
    ["GK", "🧤 门将"],
    ["DF", "🛡 后卫"],
    ["MF", "⚙️ 中场"],
    ["FW", "🎯 前锋"]
  ];
  const POS_CLASS = { GK: "gk", DF: "df", MF: "mf", FW: "fw" };
  const POS_ZH = { GK: "门将", DF: "后卫", MF: "中场", FW: "前锋" };

  function initials(name) {
    return name.split(/[\s.]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
  }

  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

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
        const credit = p.imgCredit ? `（图片来源：${esc(p.imgCredit)}）` : "";
        const ini = esc(initials(p.name));
        // 图片不存在/加载失败时自动回退为首字母头像；点击照片可放大查看
        const avatar = `
          <span class="pl-avatar">
            ${p.img ? `<img src="${base}${p.img}" alt="${esc(p.zh || p.name)}${credit}" title="点击查看大图" loading="lazy" data-zh="${esc(p.zh || p.name)}" data-credit="${esc(p.imgCredit || "")}" data-src-url="${esc(p.imgUrl || "")}" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">` : ""}
            <span class="pl-init" style="${p.img ? "display:none" : "display:grid"}">${ini}</span>
          </span>`;
        html += `
          <div class="pl-row">
            <span class="pl-num">${esc(p.num || "—")}</span>
            <span class="pl-avatar">${avatar}</span>
            <span class="pl-name">
              <span class="zh">${esc(p.zh || p.name)}</span>
              <span class="en">${esc(p.name)}</span>
            </span>
            <span class="pl-pos ${POS_CLASS[p.pos]}">${POS_ZH[p.pos]}</span>
            <span class="pl-nation">${esc(p.nation)}</span>
            <span class="pl-dob">${esc(p.dob || "—")}</span>
            <span class="pl-note">${esc(p.note || "")}</span>
          </div>`;
      }
    }
    // 照片来源标注（版权合规：为每张照片注明出处链接）
    const withPhoto = squad.filter(p => p.img && p.imgCredit);
    if (withPhoto.length) {
      html += `<div class="pl-credits">📷 <b>照片来源：</b>` +
        withPhoto.map(p =>
          `<a href="${esc(p.imgUrl)}" target="_blank" rel="noopener">${esc(p.zh || p.name)}（${esc(p.imgCredit)}）</a>`
        ).join("、") +
        `。图片版权归原出处/摄影师所有，如需移除请联系本站。`;
    }
    el.innerHTML = html;
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

  window.LAMASIA_RENDER = { playerList: render, lightbox: { open: openLightbox, close: closeLightbox } };
})();
