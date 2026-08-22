/* =============================================================
   拉玛西亚信息站 · Service Worker（PWA 离线缓存）
   ---------------------------------------------------------------
   · 安装时预缓存全部 HTML/CSS/JS/图标 → 首屏后离线可看
   · HTML 导航：网络优先（保证每日数据最新），离线回退缓存
   · 静态资源：stale-while-revalidate（先用缓存秒开，后台拉新）
   · 更新：改下方 CACHE 版本号 → 下次打开自动换新缓存
   ============================================================= */
var CACHE = 'lamasia-v7';
var PRECACHE = [
    "404.html",
    "assets/css/style.css",
    "assets/icons/icon-192.png",
    "assets/icons/icon-512.png",
    "assets/js/data.js",
    "assets/js/dqd-barca-atletic-cache.js",
    "assets/js/dqd-barca-atletic-sf-cache.js",
    "assets/js/dqd-barca-atletic-sf-details-cache.js",
    "assets/js/dqd-barca-atletic.js",
    "assets/js/dqd-barca-news-cache.js",
    "assets/js/dqd-barca-news.js",
    "assets/js/dqd-u16-cache.js",
    "assets/js/dqd-u16-details-cache.js",
    "assets/js/dqd-u16.js",
    "assets/js/dqd-u18-cache.js",
    "assets/js/dqd-u18-details-cache.js",
    "assets/js/dqd-u18.js",
    "assets/js/dqd-u19-cache.js",
    "assets/js/dqd-u19-details-cache.js",
    "assets/js/dqd-u19-news-cache.js",
    "assets/js/dqd-u19-news.js",
    "assets/js/dqd-u19.js",
    "assets/js/dqd-videos-cache.js",
    "assets/js/external-links.js",
    "assets/js/fcb-youth-render.js",
    "assets/js/fcb-youth-schedules.js",
    "assets/js/formation.js",
    "assets/js/highlights.js",
    "assets/js/manual-photos-hook.js",
    "assets/js/manual-photos.js",
    "assets/js/match-detail.js",
    "assets/js/matches-upcoming.js",
    "assets/js/mobile-nav.js",
    "assets/js/news-read.js",
    "assets/js/page-nav.js",
    "assets/js/player-card.js",
    "assets/js/roster.js",
    "assets/js/search.js",
    "assets/js/team-tabs.js",
    "assets/js/videos-data.js",
    "assets/js/videos-ui.js",
    "assets/js/weekly-news.js",
    "assets/js/weekly.js",
    "formation.html",
    "highlights.html",
    "index.html",
    "manifest.webmanifest",
    "matches.html",
    "search.html",
    "teams/barca-atletic.html",
    "teams/cadete-b.html",
    "teams/cadete.html",
    "teams/index.html",
    "teams/infantil-b.html",
    "teams/infantil.html",
    "teams/juvenil-a.html",
    "teams/juvenil-b.html",
    "teams/seven-a-side.html",
    "weekly.html"
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(PRECACHE); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;          // 不缓存跨域资源（官方队徽等按需联网）
  // HTML 导航：网络优先，失败回退缓存（最后兜底首页）
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (m) { return m || caches.match('index.html'); });
      })
    );
    return;
  }
  // 静态资源：网络优先（在线永远最新，离线回退缓存）
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (m) { return m; });
    })
  );
});
