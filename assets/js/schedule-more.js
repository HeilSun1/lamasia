/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 「🏁 已完场」默认只显示最近 5 场
   ─────────────────────────────────────────────────────────────
   赛程分组由 5 个渲染器各自生成（fcb-youth-render / dqd-u19 /
   dqd-u18 / dqd-u16 / dqd-barca-atletic），这里统一在 DOM 上收口，
   避免在 5 个渲染器里各抄一遍折叠逻辑：
     · played 行按时间倒序排列 → 前 5 行 = 最近 5 场
     · 第 6 行起加 .is-extra，tbody 未展开时用 CSS 隐藏
     · 在第 5 行后插入「展开其余 N 场」行；展开后挪到表尾
   渲染器会先画缓存再画实时数据（innerHTML 整体重绘），
   用 MutationObserver 在重绘后重新套用。
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var LIMIT = 5;
  var TOGGLE_CLASS = "schedule-more-row";

  function isPlayedGroup(group) {
    var summary = group.querySelector("summary");
    return !!summary && /已完场/.test(summary.textContent || "");
  }

  /* 收集 tbody 里的比赛行（排除我们自己插入的折叠按钮行） */
  function matchRows(tbody) {
    var rows = [];
    for (var i = 0; i < tbody.rows.length; i++) {
      if (!tbody.rows[i].classList.contains(TOGGLE_CLASS)) rows.push(tbody.rows[i]);
    }
    return rows;
  }

  function apply(group) {
    if (!group || !isPlayedGroup(group)) return;
    var table = group.querySelector(".dqd-body table");
    if (!table) return;
    var tbody = table.querySelector("tbody");
    if (!tbody) return;

    var rows = matchRows(tbody);
    var toggle = tbody.querySelector("tr." + TOGGLE_CLASS);

    // 不足 6 场：不需要折叠，清掉可能残留的按钮
    if (rows.length <= LIMIT) {
      if (toggle) toggle.remove();
      rows.forEach(function (r) { r.classList.remove("is-extra"); });
      tbody.classList.remove("is-expanded");
      return;
    }

    rows.forEach(function (r, i) { r.classList.toggle("is-extra", i >= LIMIT); });

    if (!toggle) {
      toggle = document.createElement("tr");
      toggle.className = TOGGLE_CLASS;
      var td = document.createElement("td");
      td.colSpan = 6;
      td.innerHTML = '<button type="button" class="schedule-more-btn" aria-expanded="false"></button>';
      toggle.appendChild(td);
      rows[LIMIT - 1].parentNode.insertBefore(toggle, rows[LIMIT - 1].nextSibling);
    }

    var expanded = tbody.classList.contains("is-expanded");
    // 展开后按钮挪到表尾，收起时回到第 5 行后面
    if (expanded) {
      if (toggle !== tbody.lastElementChild) tbody.appendChild(toggle);
    } else if (toggle.previousElementSibling !== rows[LIMIT - 1]) {
      rows[LIMIT - 1].parentNode.insertBefore(toggle, rows[LIMIT - 1].nextSibling);
    }

    var btn = toggle.querySelector(".schedule-more-btn");
    if (!btn) return;
    // 只在文案变了才写 textContent——同值写入也会替换文本节点，
    // 会触发观察器 → scan → 再写入，rAF 无限循环。
    var label = expanded ? "收起 ▴" : "展开其余 " + (rows.length - LIMIT) + " 场 ▾";
    if (btn.textContent !== label) btn.textContent = label;
    btn.setAttribute("aria-expanded", expanded ? "true" : "false");
  }

  function scan() {
    var groups = document.querySelectorAll("details.dqd-group");
    for (var i = 0; i < groups.length; i++) apply(groups[i]);
  }

  // 展开 / 收起（事件委托：赛程行点击由 match-detail.js 处理，这里拦住冒泡）
  document.addEventListener("click", function (e) {
    var target = e.target;
    if (!target || !target.closest) return;
    var btn = target.closest(".schedule-more-btn");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var tbody = btn.closest("tbody");
    if (!tbody) return;
    tbody.classList.toggle("is-expanded");
    apply(btn.closest("details.dqd-group"));
  });

  // renderer 重绘后重新套用：只认赛程分组内的 childList 变化，rAF 合并
  var pending = false;
  function scheduleScan() {
    if (pending) return;
    pending = true;
    var run = function () { pending = false; scan(); };
    if (window.requestAnimationFrame) window.requestAnimationFrame(run);
    else setTimeout(run, 16);
  }

  new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      if (m.type !== "childList") continue;
      var t = m.target;
      if (t && t.nodeType === 1 && t.closest && t.closest("details.dqd-group")) { scheduleScan(); return; }
      for (var j = 0; j < m.addedNodes.length; j++) {
        var n = m.addedNodes[j];
        if (n.nodeType === 1 && (n.matches && n.matches("details.dqd-group") || (n.querySelector && n.querySelector("details.dqd-group")))) {
          scheduleScan();
          return;
        }
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan);
  else scan();
})();
