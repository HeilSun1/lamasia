(function () {
  "use strict";

  var CARDS = window.SCOUT_CARDS || [];
  var META = window.SCOUT_CARDS_META || {};
  var BASE = "https://mesgazette.com/scout-cards/";
  var POS = { GK: "门将", DF: "后卫", MF: "中场", FW: "前锋" };

  var grid = document.getElementById("sc-grid");
  var tabs = document.getElementById("sc-tabs");
  var out = document.getElementById("sc-out");
  var outTitle = document.getElementById("sc-out-title");
  var outMeta = document.getElementById("sc-out-meta");
  var outFacts = document.getElementById("sc-out-facts");
  var outLink = document.getElementById("sc-out-link");
  var closeBtn = document.getElementById("sc-out-close");
  var frameBox = document.getElementById("sc-frame");
  var countEl = document.getElementById("sc-count");
  var noteCount = document.getElementById("sc-note-count");
  if (!grid) return;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function year(dob) {
    if (!dob || dob === "—") return "";
    var m = String(dob).match(/^\d{4}/);
    return m ? m[0] : "";
  }

  function posZh(p) {
    return POS[p] || p || "";
  }

  function initialOf(c) {
    var s = (c.zh || c.en || "?").replace(/[·\s]/g, "");
    return s.slice(0, 1);
  }

  // 头像直接问 player-card.js 的 photosFor()，跟梯队页/球员卡用同一套优先级
  // （local 名单键 > 懂球帝 > Sofascore，同人多键按姓名族合并），
  // 所以同一名球员在球探卡、梯队页、集锦页、球员卡里显示的是同一张图。
  function photoChain(c) {
    var out = [];
    try {
      if (window.PlayerCard && window.PlayerCard.photosFor) {
        out = window.PlayerCard.photosFor(c.key, [c.en, c.zh], []) || [];
      }
    } catch (e) { out = []; }
    if (!out.length) {
      var m = "";
      try { if (window.ManualPhoto && c.key) m = window.ManualPhoto(c.key); } catch (e) {}
      out = [m, c.img, c.sf].filter(Boolean);
    }
    return out;
  }

  // 逐张回退，全部失败才落到首字母
  window.scImgFail = function (img) {
    var rest = String(img.getAttribute("data-alt") || "").split("|").filter(Boolean);
    if (rest.length) {
      img.setAttribute("data-alt", rest.slice(1).join("|"));
      img.src = rest[0];
      return;
    }
    var span = document.createElement("span");
    span.className = "sc-av sc-av-ini";
    span.textContent = img.getAttribute("data-ini") || "?";
    img.replaceWith(span);
  };

  function avatar(c) {
    var list = photoChain(c);
    if (!list.length) return '<span class="sc-av sc-av-ini">' + esc(initialOf(c)) + "</span>";
    return '<img class="sc-av" src="' + esc(list[0]) + '" data-alt="' + esc(list.slice(1).join("|")) + '"' +
      ' data-ini="' + esc(initialOf(c)) + '" alt="" loading="lazy" referrerpolicy="no-referrer"' +
      ' onerror="window.scImgFail(this)">';
  }

  function metaLine(c) {
    var bits = [c.teamLabel, posZh(c.pos)];
    var y = year(c.dob);
    if (y) bits.push(y);
    return bits.filter(Boolean).join(" · ");
  }

  function cardHtml(c) {
    return '<div class="sc-card">' +
      '<button class="sc-av-btn" type="button" data-key="' + esc(c.key) + '" title="查看 ' + esc(c.zh) + ' 的球员卡">' +
        avatar(c) +
      "</button>" +
      '<button class="sc-main" type="button" data-slug="' + esc(c.slug) + '">' +
        '<span class="sc-name">' + esc(c.zh) + "</span>" +
        '<span class="sc-en">' + esc(c.en) + "</span>" +
        '<span class="sc-meta">' + esc(metaLine(c)) + "</span>" +
      "</button>" +
      "</div>";
  }

  var activeTeam = "";
  var query = "";
  var qCount = null;

  function matches(c) {
    if (activeTeam && c.teamLabel !== activeTeam) return false;
    if (!query) return true;
    var q = query.toLowerCase();
    return (c.zh || "").toLowerCase().indexOf(q) >= 0 ||
      (c.en || "").toLowerCase().indexOf(q) >= 0 ||
      (c.slug || "").toLowerCase().indexOf(q) >= 0 ||
      (c.teamLabel || "").toLowerCase().indexOf(q) >= 0;
  }

  function render() {
    var list = CARDS.filter(matches);
    grid.innerHTML = list.length
      ? list.map(cardHtml).join("")
      : '<p class="sc-empty">没有匹配的球员，换个名字或点「全部」。</p>';
    Array.prototype.forEach.call(tabs.querySelectorAll(".tt-tab"), function (b) {
      b.classList.toggle("active", (b.getAttribute("data-team") || "") === activeTeam);
    });
    if (qCount) {
      qCount.textContent = query || activeTeam
        ? "显示 " + list.length + " / " + CARDS.length
        : "共 " + CARDS.length + " 名";
    }
  }

  function buildTabs() {
    var teams = [];
    CARDS.forEach(function (c) {
      if (teams.indexOf(c.teamLabel) < 0) teams.push(c.teamLabel);
    });
    var html = '<button class="tt-tab active" type="button" data-team="">全部 <b>' + CARDS.length + "</b></button>";
    teams.forEach(function (t) {
      var n = CARDS.filter(function (c) { return c.teamLabel === t; }).length;
      html += '<button class="tt-tab" type="button" data-team="' + esc(t) + '">' + esc(t) + " <b>" + n + "</b></button>";
    });
    tabs.innerHTML = html;
    tabs.addEventListener("click", function (e) {
      var b = e.target.closest(".tt-tab");
      if (!b) return;
      activeTeam = b.getAttribute("data-team") || "";
      render();
    });
  }

  var current = null;

  function factsHtml(c) {
    var rows = [
      ["姓名", c.zh],
      ["英文名", c.en],
      ["梯队", c.teamLabel],
      ["位置", posZh(c.pos)],
      ["出生", c.dob && c.dob !== "—" ? c.dob : "—"],
      ["号码", c.num && c.num !== "—" ? c.num : "—"]
    ];
    var h = '<div class="sc-fact-title">档案</div><dl class="sc-dl">';
    rows.forEach(function (r) {
      if (!r[1]) return;
      h += "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>";
    });
    h += "</dl>";
    h += '<p class="sc-fact-note">报告正文、四维评分与里程碑由 mesgazette 撰写，原文为英文。看不懂时点右上角「打开原文」，在新标签里用浏览器翻译整页。</p>';
    return h;
  }

  function openCard(c) {
    current = c;
    outTitle.textContent = c.zh;
    outMeta.textContent = metaLine(c);
    outFacts.innerHTML = factsHtml(c);
    outLink.href = BASE + c.slug + "/";
    out.hidden = false;
    document.body.classList.add("sc-lock");

    // 手机端不塞 iframe：对方整页在 390px 下会挤成一团，直接给一个跳转入口
    if (window.innerWidth < 900) {
      frameBox.innerHTML = '<div class="sc-fallback"><p>整页报告放进手机小窗会挤成一团，这里改为在新标签打开。</p>' +
        '<a class="sc-fallback-btn" href="' + BASE + c.slug + '/" target="_blank" rel="noopener noreferrer">打开完整报告 →</a>' +
        '<p class="sc-fallback-note">手机上可用浏览器自带翻译把英文报告转成中文。</p></div>';
      if (history.replaceState) history.replaceState(null, "", "?slug=" + encodeURIComponent(c.slug));
      closeBtn.focus();
      return;
    }

    // 懒挂载：只有点开时才创建 iframe，平时零请求
    frameBox.innerHTML = "";
    var hint = document.createElement("p");
    hint.className = "sc-frame-hint";
    hint.textContent = "正在载入原文…（若长时间空白，说明对方站点不可用，点右上角「打开原文」）";
    frameBox.appendChild(hint);

    var f = document.createElement("iframe");
    f.className = "sc-iframe";
    f.title = c.zh + " 的球探报告原文（mesgazette.com）";
    f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-forms");
    f.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
    f.setAttribute("allow", "fullscreen");
    f.src = BASE + c.slug + "/";
    f.addEventListener("load", function () {
      if (hint.parentNode) hint.parentNode.removeChild(hint);
    });
    frameBox.appendChild(f);
    fitFrame(f);

    if (history.replaceState) history.replaceState(null, "", "?slug=" + encodeURIComponent(c.slug));
    closeBtn.focus();
  }

  function closeCard() {
    out.hidden = true;
    document.body.classList.remove("sc-lock");
    frameBox.innerHTML = "";
    current = null;
    if (history.replaceState) history.replaceState(null, "", location.pathname);
  }

  grid.addEventListener("click", function (e) {
    // 点头像 → 站内球员卡（和梯队页点名字一样）
    var av = e.target.closest(".sc-av-btn");
    if (av) {
      var k = av.getAttribute("data-key");
      if (k && window.PlayerCard) { window.PlayerCard.open(k); return; }
    }
    // 点名字/信息 → 球探报告
    var b = e.target.closest(".sc-main");
    if (!b) return;
    var slug = b.getAttribute("data-slug");
    var c = CARDS.filter(function (x) { return x.slug === slug; })[0];
    if (c) openCard(c);
  });

  // 桌面端把 1180px 宽的原文整页缩放塞进面板，避免右侧被裁掉；手机端不缩放（用对方响应式布局）
  var MAXW = 1180;
  function fitFrame(f) {
    if (!f) return;
    var box = f.parentNode;
    var w = box.clientWidth, h = box.clientHeight;
    if (!w || !h) return;
    if (window.innerWidth < 900 || w >= MAXW) {
      f.style.width = "100%"; f.style.height = "100%";
      f.style.transform = ""; f.style.transformOrigin = "";
      return;
    }
    var k = w / MAXW;
    f.style.width = MAXW + "px";
    f.style.height = Math.round(h / k) + "px";
    f.style.transform = "scale(" + k + ")";
    f.style.transformOrigin = "top left";
  }
  var resizeTimer = 0;
  window.addEventListener("resize", function () {
    if (out.hidden) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var f = frameBox.querySelector("iframe");
      if (f) fitFrame(f);
    }, 150);
  });

  closeBtn.addEventListener("click", closeCard);
  out.addEventListener("click", function (e) { if (e.target === out) closeCard(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !out.hidden) closeCard();
  });

  buildTabs();

  // 搜索框（纯前端过滤，只搜这一页的球员）
  (function () {
    var box = document.createElement("div");
    box.className = "sc-search";
    box.innerHTML = '<input id="sc-q" type="search" autocomplete="off" spellcheck="false" ' +
      'placeholder="搜索球员：中文名 / 英文名 / 梯队" aria-label="搜索球员">' +
      '<span class="sc-qcount" id="sc-qcount"></span>';
    tabs.parentNode.insertBefore(box, tabs);
    var input = box.querySelector("#sc-q");
    qCount = box.querySelector("#sc-qcount");
    input.addEventListener("input", function () {
      query = input.value.trim();
      render();
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { input.value = ""; query = ""; render(); }
    });
  })();

  render();
  if (countEl) countEl.textContent = CARDS.length + " 名球员 · " + (META.built ? META.built + " 收录" : "球探报告");
  if (noteCount) noteCount.textContent = String(CARDS.length);

  var q = new URLSearchParams(location.search).get("slug");
  if (q) {
    var first = CARDS.filter(function (x) { return x.slug === q; })[0];
    if (first) openCard(first);
  }
})();
