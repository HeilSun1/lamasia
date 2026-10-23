/* ═══════════════════════════════════════════════════════════════
   比赛信息页 · 赛程卡片左右切换（deck）
   ─────────────────────────────────────────────────────────────
   .schedule-deck 里的 .deck-card 一卡一梯队，同一时间只显示一张：
     · 顶部页签 / 左右箭头 / 键盘 ←→ / 手机上左右滑动
     · 计数器「3 / 9」，页签自动横向滚到可见
     · URL 带 #sec-u19 之类的锚点时直接打开对应卡片
   无 JS 时所有卡片照常按顺序铺开（.is-ready 由本脚本加），
   不会出现「脚本挂了整页空白」。
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var deck = document.getElementById("schedule-deck");
  var stage = document.getElementById("deck-stage");
  if (!deck || !stage) return;

  var tabsWrap = document.getElementById("deck-tabs");
  var tabs = Array.prototype.slice.call(deck.querySelectorAll(".deck-tab"));
  var cards = Array.prototype.slice.call(stage.querySelectorAll(".deck-card"));
  var prevBtn = document.getElementById("deck-prev");
  var nextBtn = document.getElementById("deck-next");
  var posEl = document.getElementById("deck-pos");
  var topBtn = document.getElementById("deck-top");
  if (!cards.length || !tabs.length) return;

  var current = 0;

  function navOffset() {
    return window.innerWidth <= 680 ? 48 : 60;   // 与 .site-nav 高度一致
  }
  function indexOfCard(id) {
    for (var i = 0; i < cards.length; i++) if (cards[i].id === id) return i;
    return -1;
  }

  function syncTabs(i) {
    tabs.forEach(function (tab) {
      var on = indexOfCard(tab.getAttribute("data-target")) === i;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      if (on && tabsWrap) {
        // 页签条横向滚动到可见（不触发整页纵向滚动）
        var left = tab.offsetLeft;
        var right = left + tab.offsetWidth;
        if (left < tabsWrap.scrollLeft) tabsWrap.scrollTo({ left: Math.max(0, left - 8), behavior: "smooth" });
        else if (right > tabsWrap.scrollLeft + tabsWrap.clientWidth) {
          tabsWrap.scrollTo({ left: right - tabsWrap.clientWidth + 8, behavior: "smooth" });
        }
      }
    });
  }

  function show(i, dir) {
    i = Math.max(0, Math.min(cards.length - 1, i));
    var changed = i !== current;
    var next = cards[i];
    if (changed) {
      // 先摘类并强制回流，保证再次切回来时入场动画会重播
      next.classList.remove("is-active", "from-left", "from-right");
      void next.offsetWidth;
      next.classList.add(dir < 0 ? "from-left" : "from-right");
    }
    cards.forEach(function (c, n) {
      c.classList.toggle("is-active", n === i);
      c.setAttribute("aria-hidden", n === i ? "false" : "true");
    });
    current = i;
    syncTabs(i);
    if (posEl) posEl.textContent = (i + 1) + " / " + cards.length;
    if (prevBtn) prevBtn.disabled = i === 0;
    if (nextBtn) nextBtn.disabled = i === cards.length - 1;
  }

  /* 用户主动切换时，如果已经滚过卡片顶部，把新卡片顶部拉回视野，
     否则换到更短的卡片时页面会「跳」到一半内容处。 */
  function userShow(i, dir) {
    show(i, dir);
    var navH = navOffset();
    var top = deck.getBoundingClientRect().top;
    if (top < navH) {
      window.scrollTo({ top: Math.max(0, window.pageYOffset + top - navH - 8), behavior: "smooth" });
    }
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var i = indexOfCard(tab.getAttribute("data-target"));
      if (i >= 0) userShow(i, i > current ? 1 : -1);
    });
  });

  if (prevBtn) prevBtn.addEventListener("click", function () { userShow(current - 1, -1); });
  if (nextBtn) nextBtn.addEventListener("click", function () { userShow(current + 1, 1); });
  if (topBtn) topBtn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // 键盘 ←→（正在输入框里打字时不抢键）
  document.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && t.closest && t.closest("input, textarea, select, [contenteditable='true']")) return;
    e.preventDefault();
    if (e.key === "ArrowLeft") userShow(current - 1, -1);
    else userShow(current + 1, 1);
  });

  // 手机 / 触屏左右滑动（鼠标拖拽不接管：赛程行本身要点击打开详情）
  var sx = 0, sy = 0, tracking = false;
  stage.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse") return;
    tracking = true; sx = e.clientX; sy = e.clientY;
  });
  stage.addEventListener("pointerup", function (e) {
    if (!tracking) return;
    tracking = false;
    var dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      userShow(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    }
  });
  stage.addEventListener("pointercancel", function () { tracking = false; });

  // 初始化：有 #锚点 就打开对应卡片
  deck.classList.add("is-ready");
  var start = indexOfCard((location.hash || "").replace(/^#/, ""));
  show(start >= 0 ? start : 0, 0);

  // 浏览器会按 #锚点 把卡片滚进视野（卡片标题被切在视口上方），
  // 这里再对齐一次到卡片顶部，让页签条 + 完整卡片标题都在视野里。
  if (start >= 0) {
    setTimeout(function () {
      var navH = navOffset();
      var y = window.pageYOffset + deck.getBoundingClientRect().top - navH - 8;
      window.scrollTo(0, Math.max(0, y));
    }, 80);
  }
})();
