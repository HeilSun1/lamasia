/* 横幅纯逻辑单测（node，零依赖）
 * 用法：node scripts/selftest/status-banner.test.js
 *
 * status-banner.js 的纯逻辑不碰 DOM，且挂在 globalThis 上，
 * 这里用 vm 在一个只提供 globalThis 的沙箱里加载它（不提供 document，
 * 于是 DOM 引导段会直接 return），然后逐个断言边界。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(
  path.join(__dirname, '..', '..', 'assets', 'js', 'status-banner.js'), 'utf8');

const sandbox = {};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const B = sandbox.LAMASIA_STATUS_BANNER;

if (!B) { console.error('加载失败：没拿到 LAMASIA_STATUS_BANNER'); process.exit(1); }

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (extra ? '  ' + extra : '')); }
}

const NOW = Date.UTC(2026, 8, 17, 12, 0, 0);          // 2026-09-17 12:00 UTC
const H = 3600000;
function iso(hoursAgo) { return new Date(NOW - hoursAgo * H).toISOString(); }

function stub(pairs) {   // 造一个假的 window
  const w = {};
  for (const k in pairs) w[k] = { updated: pairs[k] };
  return w;
}

console.log('== parseTs ==');
ok('解析缓存格式', B.parseTs('2026-09-17 11:53:50') !== null);
ok('解析 ISO 格式', B.parseTs('2026-09-17T03:53:50.000Z') !== null);
ok('空值返回 null', B.parseTs(null) === null);
ok('非法串返回 null', B.parseTs('不是时间') === null);

console.log('== 过期边界（阈值 36h / 72h）==');
function stateAt(hoursAgo, extra) {
  const st = Object.assign({ lastSuccessUtc: iso(hoursAgo) }, extra || {});
  return B.computeBannerState(st, {}, NOW, null);
}
ok('35.9h 不显示', stateAt(35.9).show === false, JSON.stringify(stateAt(35.9)));
ok('36.1h 琥珀', stateAt(36.1).show === true && stateAt(36.1).level === 'warn');
ok('71.9h 琥珀', stateAt(71.9).level === 'warn');
ok('72.1h 红色', stateAt(72.1).level === 'danger');

console.log('== blocked 优先级最高 ==');
const b0 = B.computeBannerState({ blocked: true, lastSuccessUtc: iso(0), blockedCodes: ['source_conflict'] }, {}, NOW, null);
ok('blocked 且数据很新也显示', b0.show === true);
ok('blocked 级别为 danger', b0.level === 'danger');
ok('blocked 文案含原因', B.textFor(b0).indexOf('源码') >= 0, B.textFor(b0));

console.log('== 证据取最大值（避免本机关机时误报）==');
const stOld = { lastSuccessUtc: iso(200) };           // 本机 8 天没更新
const wNew = stub({ DQD_U19_CACHE: iso(2) });         // 但缓存是 2 小时前的
const mixed = B.computeBannerState(stOld, wNew, NOW, null);
ok('本机停更但缓存新鲜 → 不显示', mixed.show === false, JSON.stringify(mixed));
const both = B.computeBannerState(stOld, stub({ DQD_U19_CACHE: iso(100) }), NOW, null);
ok('两边都停 → 显示', both.show === true);
ok('取两者中较新的（100h 而非 200h）', Math.abs(both.ageHours - 100) < 0.1, both.ageHours);

console.log('== 无证据 / 异常时钟 ==');
ok('无任何证据 → 不显示', B.computeBannerState({}, {}, NOW, null).show === false);
ok('证据在未来（时钟落后）→ 不显示', B.computeBannerState({ lastSuccessUtc: iso(-50) }, {}, NOW, null).show === false);
ok('updated 字段非法 → 回退到状态文件', B.computeBannerState(
  { lastSuccessUtc: iso(80) }, stub({ DQD_U19_CACHE: '不是时间' }), NOW, null).level === 'danger');

console.log('== 阈值可被状态文件覆盖 ==');
// 把阈值收紧成 5h/8h，再用一个默认阈值下"新鲜"的 6h：默认应不显示，覆盖后应琥珀
const tightOpts = { staleHours: 5, hardStaleHours: 8 };
const at6h = { lastSuccessUtc: iso(6) };
ok('默认阈值下 6h 不显示', B.computeBannerState(at6h, {}, NOW, null).show === false);
const custom = B.computeBannerState(Object.assign({ staleHours: 5, hardStaleHours: 8 }, at6h), {}, NOW, null);
ok('status.staleHours 覆盖默认值', custom.show === true && custom.level === 'warn', JSON.stringify(custom));
const customHard = B.computeBannerState(Object.assign({ staleHours: 5, hardStaleHours: 5 }, at6h), {}, NOW, null);
ok('status.hardStaleHours 覆盖默认值', customHard.level === 'danger', JSON.stringify(customHard));

console.log('== 文案 ==');
ok('琥珀文案含小时数', B.textFor(stateAt(40)).indexOf('40') >= 0, B.textFor(stateAt(40)));
ok('红色文案含天数', B.textFor(stateAt(100)).indexOf('4') >= 0, B.textFor(stateAt(100)));

console.log('');
console.log('======== 横幅单测：PASS=' + pass + '  FAIL=' + fail + ' ========');
process.exit(fail === 0 ? 0 : 1);
