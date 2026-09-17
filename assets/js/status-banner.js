/* 数据新鲜度横幅 —— 更新停摆时在页面顶部提示
 *
 * 纯逻辑挂在 window.LAMASIA_STATUS_BANNER 上且不碰 DOM，便于 node 直接单测
 * （见 scripts/selftest/status-banner.test.js）。
 *
 * 判定为什么要"取所有证据的最大值"：
 * 只看 assets/data/status.json 的 lastSuccessUtc 会误报 —— 那是本机写入的，
 * 本机关机时 GitHub Actions 兜底（每天 00:23）仍在刷新缓存，站点数据其实新鲜。
 * 所以把页面自己加载到的各缓存文件的 updated 也作为证据，取最大值。
 * 任一来源是新的 → 不显示；两边都停才提示。
 */
(function (root) {
  'use strict';

  /* 显式白名单，不用 Object.keys(window) 扫 —— 会把 data.js 里手工维护的
     updated 字段之类的无关值卷进来，行为不可预测 */
  var CACHE_GLOBALS = [
    'DQD_U19_CACHE', 'DQD_U18_CACHE', 'DQD_U16_CACHE',
    'DQD_BARCA_ATLETIC_CACHE', 'DQD_BARCA_ATLETIC_SF_CACHE',
    'DQD_VIDEOS_CACHE', 'LAMASIA_SCHEDULES',
    'SPORT_NEWS', 'MD_NEWS', 'LAMASIA_OFFICIAL_NEWS'
  ];

  var DEFAULT_OPTS = { staleHours: 36, hardStaleHours: 72 };

  /* "2026-09-17 11:53:50" / ISO 串 → epoch ms；取不到返回 null */
  function parseTs(s) {
    if (!s || typeof s !== 'string') return null;
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (m) {
      return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
    }
    var t = Date.parse(s);
    return isNaN(t) ? null : t;
  }

  /* 页面已加载的各缓存里最新的 updated（只认自己页面真的有的） */
  function collectCacheEvidence(w) {
    var best = null;
    for (var i = 0; i < CACHE_GLOBALS.length; i++) {
      var g = w[CACHE_GLOBALS[i]];
      if (!g || typeof g !== 'object') continue;
      var t = parseTs(g.updated);
      if (t !== null && (best === null || t > best)) best = t;
    }
    return best;
  }

  /* 取所有证据的最大值。返回 { ms, from } —— from 用于给「数据更新截至」提供文案来源 */
  function maxEvidence(status, w) {
    var cache = collectCacheEvidence(w);
    var pub = status ? parseTs(status.lastSuccessUtc) : null;
    if (cache === null && pub === null) return { ms: null, from: null };
    if (cache === null) return { ms: pub, from: 'published' };
    if (pub === null) return { ms: cache, from: 'cache' };
    return cache >= pub ? { ms: cache, from: 'cache' } : { ms: pub, from: 'published' };
  }

  /* 纯函数：给出横幅该不该显示、什么级别、什么文案 key */
  function computeBannerState(status, w, nowMs, opts) {
    var o = { staleHours: DEFAULT_OPTS.staleHours, hardStaleHours: DEFAULT_OPTS.hardStaleHours };
    if (opts) {
      if (opts.staleHours) o.staleHours = opts.staleHours;
      if (opts.hardStaleHours) o.hardStaleHours = opts.hardStaleHours;
    }
    if (status) {
      if (status.staleHours) o.staleHours = status.staleHours;
      if (status.hardStaleHours) o.hardStaleHours = status.hardStaleHours;
    }

    var ev = maxEvidence(status, w);
    var ageHours = null;
    if (ev.ms !== null) {
      ageHours = (nowMs - ev.ms) / 3600000;
      if (ageHours < 0) ageHours = 0;   // 客户端时钟落后：夹到 0，不显示
    }

    /* 被阻塞（源码冲突/推送失败等）优先级最高，与数据新旧无关 */
    if (status && status.blocked === true) {
      return { show: true, level: 'danger', code: 'blocked',
               ageHours: ageHours, codes: status.blockedCodes || [] };
    }
    if (ageHours === null) return { show: false, level: 'none', code: 'no-evidence', ageHours: null };
    if (ageHours >= o.hardStaleHours) {
      return { show: true, level: 'danger', code: 'stale-hard', ageHours: ageHours };
    }
    if (ageHours >= o.staleHours) {
      return { show: true, level: 'warn', code: 'stale', ageHours: ageHours };
    }
    return { show: false, level: 'none', code: 'fresh', ageHours: ageHours };
  }

  /* 枚举码 → 中文。状态文件本身是全 ASCII（PS 5.1 读中文的坑），文案只在这里 */
  var BLOCKED_TEXT = {
    source_conflict: '有手写源码改动发生冲突，已保留待人工处理',
    push_failed: '推送远端失败',
    add_failed: '暂存本地改动失败',
    repo_error: '仓库操作出错',
    run_incomplete: '上次更新未跑完（进程被中断）',
    fetch_failed: '拉取远端失败',
    stale: '核心数据源未刷新'
  };

  function fmtAge(h) {
    if (h === null) return '';
    if (h < 1) return '不到 1 小时';
    if (h < 48) return Math.floor(h) + ' 小时';
    return Math.floor(h / 24) + ' 天';
  }

  function textFor(state) {
    if (state.code === 'blocked') {
      var names = (state.codes || []).map(function (c) { return BLOCKED_TEXT[c] || c; });
      var extra = names.length ? '（' + names.join('；') + '）' : '';
      return '本站自动更新遇到问题，数据可能不是最新的' + extra + '。已记录，等待处理。';
    }
    var age = fmtAge(state.ageHours);
    if (state.code === 'stale-hard') {
      return '本站数据已 ' + age + ' 没有更新，显示的内容可能已过时。';
    }
    return '本站数据已 ' + age + ' 没有更新，可能略有过时。';
  }

  function fmtDate(ms) {
    var d = new Date(ms);
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
           ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  var api = {
    parseTs: parseTs,
    collectCacheEvidence: collectCacheEvidence,
    maxEvidence: maxEvidence,
    computeBannerState: computeBannerState,
    textFor: textFor,
    fmtDate: fmtDate,
    CACHE_GLOBALS: CACHE_GLOBALS
  };
  root.LAMASIA_STATUS_BANNER = api;

  if (typeof document === 'undefined') return;   // node 里只取纯逻辑

  /* ── DOM 引导 ── */
  function basePath() {
    var s = document.currentScript;
    if (s && s.src) return s.src.replace(/assets\/js\/status-banner\.js.*$/, '');
    return '';
  }

  function render(state, evidenceMs) {
    var host = document.createElement('div');
    host.className = 'status-banner ' + state.level;
    host.setAttribute('role', 'status');
    var inner = document.createElement('div');
    inner.className = 'container status-banner-inner';
    var text = document.createElement('span');
    text.textContent = textFor(state);
    inner.appendChild(text);
    var hide = document.createElement('button');
    hide.className = 'status-banner-x';
    hide.type = 'button';
    hide.setAttribute('aria-label', '关闭');
    hide.textContent = '×';
    hide.onclick = function () { host.style.display = 'none'; };
    inner.appendChild(hide);
    host.appendChild(inner);
    var body = document.body;
    if (body && body.firstChild) body.insertBefore(host, body.firstChild);
    else if (body) body.appendChild(host);
    document.documentElement.setAttribute('data-data-stale', state.level);
  }

  function applyAsOf(ms) {
    var el = document.getElementById('data-as-of');
    if (el && ms !== null) el.textContent = fmtDate(ms);
  }

  function boot() {
    var base = basePath();
    fetch(base + 'assets/data/status.json', { cache: 'no-store', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })   // 离线：静默返回，绝不弹假告警
      .then(function (status) {
        var ev = maxEvidence(status, window);
        var st = computeBannerState(status, window, Date.now(), null);
        applyAsOf(ev.ms);
        if (st.show) render(st, ev.ms);
        window.dispatchEvent(new CustomEvent('lamasia:status', { detail: st }));
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
