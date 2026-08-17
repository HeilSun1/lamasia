/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 新闻「新更新」小红点
   ─────────────────────────────────────────────────────────────
   语义：哪条是这次新出现的，就在哪条上面弹小红点，看过一次下次消失。
   - 判重键：优先新闻 id，其次 url。
   - 记录：localStorage 存「已见过」的新闻键；同源所有页面共享。
   - 机制：页面加载时调用 NewsRead.visit(容器, 全部键) ——
       ① 把「本次新出现（之前没见过）」的键记下来弹红点；
       ② 顺手把当前全部条目记为已见，下次访问就不再当新。
       首次访问（无任何记录）直接建立基准、不弹红点，避免一堆旧点。
   - 用法：渲染完列表后 NewsRead.visit(容器, keys)。
     点「查看更多」渲染更多后，再调 NewsRead.decorate(容器) 补点即可
     （本次会话内新点的标记仍然保留）。
   仅用于带新闻列表的面板页面。
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var KEY = "lamasia-news-seen-v2";
  var MAX = 5000;          // 已见记录上限，超出丢最旧
  var seen = null;         // { [newsKey]: true }  持久化：已见过
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

  // 给容器内可见条目补红点；点击后该条红点立即消失（本次会话内）
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
          var d = a.querySelector(".news-item__dot");
          if (d) d.remove();
        });
      }
    });
  }

  // 页面访问入口：弹本次新出现的红点，并把全部条目记为已见
  function visit(container, allKeys) {
    var firstTime = true;
    try { firstTime = localStorage.getItem(KEY) === null; } catch (e) {}
    load();

    // 首次访问只建立基准，不弹红点（避免一上来满屏点）
    sessionNew = {};
    if (!firstTime) {
      (allKeys || []).forEach(function (k) {
        if (k && !seen[k]) sessionNew[k] = true;
      });
    }

    // 全部记为已见，下次访问不再当新（看过就消失）
    var changed = false;
    (allKeys || []).forEach(function (k) {
      if (k && !seen[k]) { seen[k] = true; changed = true; }
    });
    if (changed) save();

    decorate(container);
  }

  window.NewsRead = {
    visit: visit,
    decorate: decorate,
    isNew: isNew
  };
})();
