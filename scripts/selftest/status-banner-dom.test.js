/* 横幅 DOM 注入路径单测（node，零依赖）
 * 用法：node scripts/selftest/status-banner-dom.test.js
 *
 * status-banner.test.js 测的是纯逻辑；这个文件用一个最小假 DOM 跑通
 * 「fetch 状态文件 → 判断 → 注入节点」这条真实路径，确认：
 *   - 数据新鲜时不注入任何节点（不能白白占位）
 *   - 过期/阻塞时注入到 body 最前面、class 正确、文案正确
 *   - #data-as-of 被改写
 *   - fetch 失败（离线）时静默、绝不误报
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', '..', 'assets', 'js', 'status-banner.js'), 'utf8');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (extra ? '  ' + extra : '')); }
}

/* ── 最小假 DOM ── */
function makeEl(tag) {
  const el = {
    tagName: tag, children: [], attrs: {}, style: {}, textContent: '',
    className: '', type: '', onclick: null,
    // 真实 DOM 有 firstChild；少了它脚本会走 appendChild 兜底分支，
    // 那条路径在浏览器里根本不会执行，等于没测到插入位置
    get firstChild() { return this.children[0] || null; },
    appendChild(c) { this.children.push(c); return c; },
    insertBefore(c, ref) { const i = this.children.indexOf(ref); this.children.splice(i < 0 ? 0 : i, 0, c); return c; },
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k]; }
  };
  return el;
}
function makeDom() {
  const byId = {};
  const doc = {
    readyState: 'complete',
    documentElement: makeEl('html'),
    currentScript: { src: 'https://x/assets/js/status-banner.js' },
    createElement: makeEl,
    getElementById: id => byId[id] || null,
    addEventListener() {},
    _byId: byId
  };
  const firstChild = makeEl('header');
  doc.body = makeEl('body');
  doc.body.children.push(firstChild);
  return doc;
}

/* 在隔离沙箱里跑一次 boot，返回注入结果 */
function run({ statusJson, fetchFails, cacheGlobals }) {
  const doc = makeDom();
  const asOf = makeEl('span');
  asOf.textContent = '2026 年 8 月';
  doc._byId['data-as-of'] = asOf;

  const win = Object.assign({}, cacheGlobals || {});
  let dispatched = null;
  win.document = doc;
  win.fetch = function () {
    if (fetchFails) return Promise.reject(new Error('offline'));
    return Promise.resolve({ ok: true, json: () => Promise.resolve(statusJson) });
  };
  win.dispatchEvent = e => { dispatched = e; };
  win.CustomEvent = function (t, o) { this.type = t; this.detail = o && o.detail; };
  win.addEventListener = (t, f) => { if (t === 'DOMContentLoaded') f(); };
  win.Date = Date;

  const sandbox = { window: win, document: doc, fetch: win.fetch,
                    CustomEvent: win.CustomEvent, Date: Date, setTimeout: setTimeout };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox);

  return { doc, asOf, get dispatched() { return dispatched; }, win,
           get banner() {
             return doc.body.children.find(c => c.className &&
                     c.className.indexOf('status-banner') === 0) || null;
           } };
}

const NOW = Date.UTC(2026, 8, 17, 12, 0, 0);
const REAL_NOW = Date.now;   // 注入前后要还原，避免影响别的用例

function withNow(ms, fn) {
  const delta = ms - REAL_NOW();
  const OrigDate = Date;
  function FakeDate(...a) { return a.length ? new OrigDate(...a) : new OrigDate(REAL_NOW() + delta); }
  FakeDate.now = () => REAL_NOW() + delta;
  FakeDate.UTC = OrigDate.UTC;
  FakeDate.parse = OrigDate.parse;
  FakeDate.prototype = OrigDate.prototype;
  global.Date = FakeDate;
  try { return fn(); } finally { global.Date = OrigDate; }
}

const hoursAgo = h => new Date(NOW - h * 3600000).toISOString();

/* boot 链路是异步的，整体用 async 包一层，用 setTimeout(0) 等 promise 落定 */
(async function main() {
  const tick = () => new Promise(r => setTimeout(r, 0));

  console.log('== 数据新鲜：不该注入任何节点 ==');
  {
    let r;
    withNow(NOW, () => { r = run({ statusJson: { lastSuccessUtc: hoursAgo(1) } }); });
    await tick(); await tick();
    ok('新鲜时不显示横幅', r.banner === null);
    ok('但仍改写「数据更新截至」', r.asOf.textContent.indexOf('2026') === 0, r.asOf.textContent);
  }

  console.log('== 40 小时：琥珀 ==');
  {
    let r;
    withNow(NOW, () => { r = run({ statusJson: { lastSuccessUtc: hoursAgo(40) } }); });
    await tick(); await tick();
    ok('注入了横幅', r.banner !== null);
    ok('class 含 warn', r.banner && r.banner.className.indexOf('warn') >= 0, r.banner && r.banner.className);
    // body 初始第一个孩子是 header；横幅要插在它之前，才不会被 sticky 导航盖住
    ok('插在 body 最前（导航之上）',
       r.doc.body.children[0] === r.banner && r.doc.body.children[1].tagName === 'header');
    ok('文案提到 40 小时', (r.banner.children[0].children[0] || {}).textContent.indexOf('40') >= 0,
       r.banner && r.banner.children[0].children[0].textContent);
  }

  console.log('== 100 小时：红色 ==');
  {
    let r;
    withNow(NOW, () => { r = run({ statusJson: { lastSuccessUtc: hoursAgo(100) } }); });
    await tick(); await tick();
    ok('class 含 danger', r.banner && r.banner.className.indexOf('danger') >= 0, r.banner && r.banner.className);
    ok('文案提到 4 天', (r.banner.children[0].children[0] || {}).textContent.indexOf('4') >= 0);
  }

  console.log('== blocked：数据很新也要红 ==');
  {
    let r;
    withNow(NOW, () => {
      r = run({ statusJson: { lastSuccessUtc: hoursAgo(0), blocked: true, blockedCodes: ['source_conflict'] } });
    });
    await tick(); await tick();
    ok('blocked 时显示', r.banner !== null);
    ok('级别 danger', r.banner && r.banner.className.indexOf('danger') >= 0);
    ok('文案含原因', (r.banner.children[0].children[0] || {}).textContent.indexOf('源码') >= 0);
  }

  console.log('== 本机停更但缓存新鲜（Actions 兜底）：不该误报 ==');
  {
    let r;
    withNow(NOW, () => {
      r = run({ statusJson: { lastSuccessUtc: hoursAgo(200) },
                cacheGlobals: { DQD_U19_CACHE: { updated: '2026-09-17 10:00:00' } } });
    });
    await tick(); await tick();
    ok('取最大证据 → 不显示', r.banner === null);
  }

  console.log('== fetch 失败（离线）：静默，绝不误报 ==');
  {
    let r;
    withNow(NOW, () => { r = run({ fetchFails: true }); });
    await tick(); await tick();
    ok('离线不显示横幅', r.banner === null);
    ok('离线不改写日期', r.asOf.textContent === '2026 年 8 月', r.asOf.textContent);
  }

  console.log('');
  console.log('======== 横幅 DOM 单测：PASS=' + pass + '  FAIL=' + fail + ' ========');
  process.exit(fail === 0 ? 0 : 1);
})();
