/* 梯队页「新闻」页签：聚合懂球帝 B队 + U19A 资讯（无专属新闻的梯队用此全站 feed） */
(function () {
  'use strict';
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function init() {
    var el = document.getElementById('news-feed');
    if (!el) return;
    var all = [];
    var b = (window.DQD_BARCA_NEWS && window.DQD_BARCA_NEWS.news) || [];
    var u = (window.DQD_U19_NEWS && window.DQD_U19_NEWS.news) || [];
    b.forEach(function (n) { all.push({ title: n.title, url: n.url, time: n.time, tag: n.tag, img: n.img, src: "B队" }); });
    u.forEach(function (n) { all.push({ title: n.title, url: n.url, time: n.time, tag: n.tag, img: n.img, src: "U19A" }); });
    all.sort(function (x, y) { return (y.time || "").localeCompare(x.time || ""); });
    if (!all.length) { el.innerHTML = '<div class="match-list-empty">暂无资讯</div>'; return; }
    el.innerHTML = all.slice(0, 8).map(function (n) {
      return '<a class="news-item" href="' + esc(n.url) + '" target="_blank" rel="noopener">' +
        (n.img ? '<img class="news-item__img" src="' + esc(n.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">' : '') +
        '<span class="news-item__body">' +
          '<span class="news-item__title">' + esc(n.title) + '</span>' +
          '<span class="news-item__meta">' +
            '<span class="news-item__tag">' + esc(n.src) + '</span>' +
            (n.tag ? '<span>' + esc(n.tag) + '</span>' : '') +
            '<span class="news-item__time">' + esc(n.time) + '</span>' +
          '</span>' +
        '</span></a>';
    }).join('') +
    '<div class="note-box" style="margin-top:14px">💡 <span>该梯队暂无专属新闻，以上为拉玛西亚<b>全站资讯</b>（懂球帝 B队 / U19A，每日更新）。</span></div>';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
