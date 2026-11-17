/* ═══════════════════════════════════════════════════════════════
   新闻条目：全站唯一的一份渲染。
   ─────────────────────────────────────────────────────────────
   以前周报、官方新闻、U19/U18/U16/B 队四个渲染器各自拼一遍同样的
   <a class="news-item">，导致改一处、另一处还是老样子（中文标题、
   首条头条、来源色块都踩过这个坑）。现在所有页面都调这里。

   用法：
     NewsItem.html(item, { src: "B队", srcClass: "b", skipTag: "足球" })
     NewsItem.render(el, items, { src: "Sport", srcClass: "s" })

   item 字段：id / url / img / title / time / tag / issue / source
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* 标题：有译文用译文，鼠标悬停看原文（手机上点进去就是原文） */
  function titleZh(t) {
    return (window.NEWS_ZH && window.NEWS_ZH[t]) || t || "";
  }

  function html(n, opt) {
    opt = opt || {};
    var meta = "";
    if (opt.src) {
      meta += '<span class="news-item__src news-item__src--' + esc(opt.srcClass || "w") + '">' + esc(opt.src) + "</span>";
    }
    if (n.issue) meta += '<span class="news-item__tag">第 ' + esc(n.issue) + " 期</span>";
    if (n.tag && n.tag !== opt.skipTag) meta += '<span class="news-item__tag">' + esc(n.tag) + "</span>";
    if (n.time) meta += '<span class="news-item__time">' + esc(n.time) + "</span>";

    return '<a class="news-item" data-key="' + esc(n.id || n.url) + '" href="' + esc(n.url) +
      '" target="_blank" rel="noopener">' +
      (n.img ? '<img class="news-item__img" src="' + esc(n.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">' : "") +
      '<span class="news-item__body">' +
        '<span class="news-item__title" title="' + esc(n.title) + '">' + esc(titleZh(n.title)) + "</span>" +
        '<span class="news-item__meta">' + meta + "</span>" +
      "</span>" +
    "</a>";
  }

  function render(el, items, opt) {
    if (!el) return;
    el.innerHTML = (items || []).map(function (n) { return html(n, opt); }).join("");
    /* 首条做成头条（96×68 图 + 15px 标题），见 style.css 的 .news-item--lead */
    var lead = el.querySelector(".news-item");
    if (lead) lead.classList.add("news-item--lead");
  }

  window.NewsItem = { esc: esc, html: html, render: render, titleZh: titleZh };
})();
