/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 页内导航（目录 + 回到顶部 + 滚动高亮）
   依赖：#page-toc 里的 a[href^="#"] 链接指向本页各分区 id。
   通用：任何页面引入本脚本 + 对应 .page-toc 结构即可用。
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var toc = document.getElementById("page-toc");
  if (!toc) return;

  var links = Array.prototype.slice.call(toc.querySelectorAll("a[href^='#']"));

  // 平滑滚动（#page-top 回顶部，其余按锚点定位并留一点间距）
  function go(id) {
    if (id === "page-top") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    var el = document.getElementById(id);
    if (!el) return;
    var y = el.getBoundingClientRect().top + window.pageYOffset - 16;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  links.forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      go(a.getAttribute("href").slice(1));
    });
  });

  // 滚动监听：高亮当前可见分区（page-top 链接不参与高亮）
  var markers = links.map(function (a) {
    return { a: a, el: document.getElementById(a.getAttribute("href").slice(1)) };
  }).filter(function (p) { return p.el; });

  var current = null;
  function onScroll() {
    var pos = window.pageYOffset + window.innerHeight * 0.25;
    var found = null;
    markers.forEach(function (p, i) {
      if (p.el.getBoundingClientRect().top + window.pageYOffset <= pos) found = i;
    });
    if (found !== null && found !== current) {
      current = found;
      markers.forEach(function (p, i) { p.a.classList.toggle("active", i === found); });
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
