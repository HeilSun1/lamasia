/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 新闻「新更新」小红点
   ─────────────────────────────────────────────────────────────
   语义（2026-08-18 调整）：今天/昨天新更新的新闻弹小红点，保持到
   被点击消失或点「一键已读」；不再「访问一次就自动已读」。
   - 首次访问 / 清过 localStorage：只对今天或昨天发布的条目弹点，
     其余建基线不弹旧点（避免满屏旧红点）。
   - 判重键：优先新闻 id，其次 url。
   - 记录：localStorage 存「已读（已消失）」的新闻键，同源共享。
   - 用法：渲染完列表后 NewsRead.visit(容器, items)，
     items = [{ key, time }]（time 取 n.time 或 n.date）。
     点「查看更多」再调 NewsRead.decorate(容器) 补点。
     面板标题行自动加「一键已读」按钮：NewsRead.attachReadAll(panel, 容器, keys)。
   仅用于带新闻列表的面板页面。
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var KEY = "lamasia-news-seen-v3";   // v3(2026-08-18)：改为「今天/昨天新更才弹点、保持到已读」，旧 v2 已读记录作废
  var MAX = 5000;          // 已读记录上限，超出丢最旧
  var seen = null;         // { [newsKey]: true }  持久化：已读（已消失）
  var sessionNew = {};     // 本次访问新出现的键（要弹红点的集合）

  function load() {
    if (seen) return seen;
    seen = {};
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.seen && typeof parsed.seen === "object") {
          // 只拷贝自有键，避免原型污染
          seen = {};
          for (var k in parsed.seen) {
            if (Object.prototype.hasOwnProperty.call(parsed.seen, k)) seen[k] = true;
          }
        }
      }
    } catch (e) { seen = {}; }
    return seen;
  }

  function save() {
    try {
      var keys = Object.keys(seen);
      if (keys.length > MAX) {
        // 丢最旧的，保留最近 MAX 条（对象键按插入顺序）
        var keep = {};
        for (var i = keys.length - MAX; i < keys.length; i++) keep[keys[i]] = true;
        seen = keep;
      }
      localStorage.setItem(KEY, JSON.stringify({ v: 2, seen: seen }));
    } catch (e) { /* 隐私模式等场景忽略 */ }
  }

  function isNew(k) { return !!k && !!sessionNew[k]; }

  // "2026-08-18 01:06" / "2026-08-07" → 本地 Date；解析失败返回 null
  function parseDate(s) {
    var m = String(s || "").match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }

  // 今天或昨天发布的 → 需要红点（首次访问/清历史时也照弹）
  function isRecent(s) {
    var d = parseDate(s);
    if (!d) return false;
    var diff = Math.round((new Date() - d) / 86400000);
    return diff >= 0 && diff <= 1;
  }

  // 记某条为已读（点掉红点后持久化）
  function dismissKey(k) {
    if (!k) return;
    load();
    if (!seen[k]) { seen[k] = true; save(); }
    delete sessionNew[k];
  }

  // 给容器内可见条目补红点；点击该条立即消失并持久化为已读
  function decorate(container) {
    if (!container) return;
    Array.prototype.forEach.call(container.querySelectorAll("a.news-item[data-key]"), function (a) {
      var k = a.getAttribute("data-key");
      var dot = a.querySelector(".news-item__dot");

      if (isNew(k)) {
        if (!dot) {
          dot = document.createElement("span");
          dot.className = "news-item__dot";
          dot.setAttribute("aria-label", "新更新");
          a.appendChild(dot);
        }
      } else if (dot) {
        dot.remove();
      }

      if (!a.getAttribute("data-read-bound")) {
        a.setAttribute("data-read-bound", "1");
        a.addEventListener("click", function () {
          dismissKey(k);
          var d = a.querySelector(".news-item__dot");
          if (d) d.remove();
        });
      }
    });
  }

  // 页面访问入口：算本次要弹的点，并保持到被点击/一键已读
  // items = [{ key, time }]；只对「今天/昨天发布」且「未已读」的弹点，
  // 清过 localStorage 也一样弹（首次访问不建全量基线，避免旧点累积）。
  function visit(container, items) {
    load();
    sessionNew = {};
    (items || []).forEach(function (it) {
      if (it && it.key && isRecent(it.time) && !seen[it.key]) sessionNew[it.key] = true;
    });
    decorate(container);
  }

  // 一键已读：当前面板全部标记为已读并清掉红点
  function markAllRead(container, allKeys) {
    load();
    var changed = false;
    (allKeys || []).forEach(function (k) { if (k && !seen[k]) { seen[k] = true; changed = true; } });
    if (changed) save();
    (allKeys || []).forEach(function (k) { if (k) delete sessionNew[k]; });
    if (container) {
      Array.prototype.forEach.call(container.querySelectorAll(".news-item__dot"), function (d) { d.remove(); });
    }
  }

  // 在面板标题行加「一键已读」按钮（仅当本次有新红点时显示）
  function attachReadAll(panel, container, allKeys) {
    if (!panel) return;
    var hasNew = (allKeys || []).some(function (k) { return isNew(k); });
    if (!hasNew) return;
    var row = panel.querySelector(".panel-title-row");
    if (!row || row.querySelector(".news-readall")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "news-readall";
    btn.textContent = "一键已读";
    btn.title = "标记当前面板全部新闻为已读";
    btn.addEventListener("click", function () {
      markAllRead(container, allKeys);
      btn.style.display = "none";
    });
    row.appendChild(btn);
  }

  window.NewsRead = {
    visit: visit,
    decorate: decorate,
    isNew: isNew,
    markAllRead: markAllRead,
    attachReadAll: attachReadAll
  };
})();
