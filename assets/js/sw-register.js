/* PWA：注册 Service Worker（仅 HTTPS 或本机调试） */
(function () {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function (err) {
      console.warn('拉玛西亚 SW 注册失败：', err);
    });
  });
})();
