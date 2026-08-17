/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 新闻未读红点
   ─────────────────────────────────────────────────────────────
   新闻更新后给「未读」条目加小红点，读过（点击）后消失。
   - 判重键：优先新闻 id，其次 url（同一篇在 B队/U19 双源出现时一致）。
   - 存储：localStorage，同源所有页面共享（周报页读了，B队页同步消失）。
   - 用法：渲染完新闻列表后调用 NewsRead.decorate(container)。
     容器内 a.news-item[data-key] 会被装饰：未读加红点，点击标记已读。
     面板标题行放：
       <span class="news-unread" data-count-for="#容器id"></span>  未读数徽标
       <button class="news-markall" data-markall-for="#容器id">全部已读</button>
   仅用于带新闻列表的面板页面。
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var KEY = "lamasia-news-read-v1";
  var MAX = 5000;          // 已读记录上限，超出丢最旧
  var read = null;         // { [newsKey]: true }

  function load() {
    if (read) return read;
    read = {};
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.read && typeof parsed.read === "object") {
          // 只拷贝自有键，避免原型污染
          read = {};
          for (var k in parsed.read) {
            if (Object.prototype.hasOwnProperty.call(parsed.read, k)) read[k] = true;
          }
        }
      }
    } catch (e) { read = {}; }
    return read;
  }

  function save() {
    try {
      var keys = Object.keys(read);
      if (keys.length > MAX) {
        // 丢最旧的，保留最近 MAX 条（对象键按插入顺序）
        var keep = {};
        for (var i = keys.length - MAX; i < keys.length; i++) keep[keys[i]] = true;
        read = keep;
      }
      localStorage.setItem(KEY, JSON.stringify({ v: 1, read: read }));
    } catch (e) { /* 隐私模式等场景忽略 */ }
  }

  function newsKey(n) {
    if (!n) return "";
    return String(n.id || n.url || n.title || "");
  }

  function isUnread(k) { return !!k && !load()[k]; }

  function markRead(k) {
    if (!k || load()[k]) return;
    read[k] = true;
    save();
  }

  // 面板内全部标为已读，并移除红点
  function markAllIn(container) {
    if (!container) return;
    var changed = false;
    Array.prototype.forEach.call(container.querySelectorAll("a.news-item[data-key]"), function (a) {
      var k = a.getAttribute("data-key");
      if (k && !load()[k]) { read[k] = true; changed = true; }
      var d = a.querySelector(".news-item__dot");
      if (d) d.remove();
    });
    if (changed) save();
  }

  // 刷新面板标题行的未读数徽标（data-count-for="#容器id"）
  function refreshBadge(container) {
    if (!container || !container.id) return;
    var sel = "#" + container.id;
    var badge = document.querySelector('.news-unread[data-count-for="' + sel + '"]');
    if (!badge) return;
    var n = 0;
    Array.prototype.forEach.call(container.querySelectorAll("a.news-item[data-key]"), function (a) {
      if (isUnread(a.getAttribute("data-key"))) n++;
    });
    badge.style.display = n ? "inline-flex" : "none";
    badge.textContent = n > 99 ? "99+" : String(n);
  }

  // 给容器内的新闻条目装饰红点 + 点击标记已读；幂等，可重复调用
  function decorate(container) {
    if (!container) return;

    Array.prototype.forEach.call(container.querySelectorAll("a.news-item[data-key]"), function (a) {
      var k = a.getAttribute("data-key");
      var dot = a.querySelector(".news-item__dot");

      if (isUnread(k)) {
        if (!dot) {
          dot = document.createElement("span");
          dot.className = "news-item__dot";
          dot.setAttribute("aria-label", "未读");
          a.appendChild(dot);
        }
      } else if (dot) {
        dot.remove();
      }

      // 点击 → 标记该条已读，红点消失
      if (!a.getAttribute("data-read-bound")) {
        a.setAttribute("data-read-bound", "1");
        a.addEventListener("click", function () {
          if (!isUnread(k)) return;
          markRead(k);
          var d = a.querySelector(".news-item__dot");
          if (d) d.remove();
          refreshBadge(container);
        });
      }
    });

    // 绑定本面板的「全部已读」按钮
    if (container.id) {
      var sel = "#" + container.id;
      var btn = document.querySelector('.news-markall[data-markall-for="' + sel + '"]');
      if (btn && !btn.getAttribute("data-bound")) {
        btn.setAttribute("data-bound", "1");
        btn.addEventListener("click", function () {
          markAllIn(container);
          refreshBadge(container);
        });
      }
    }

    refreshBadge(container);
  }

  window.NewsRead = {
    newsKey: newsKey,
    isUnread: isUnread,
    markRead: markRead,
    decorate: decorate,
    markAllIn: markAllIn
  };
})();
