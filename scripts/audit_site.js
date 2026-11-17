/* 全站对应性体检
   用法：node scripts/audit_site.js
   输出：docs/audit-<日期>.md，同时在终端打印摘要。
   只做静态检查（不启动浏览器），所以不会卡在 headless 截图上。 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const JS = path.join(ROOT, 'assets', 'js');
const lines = [];
const out = (s) => { lines.push(s); console.log(s); };

function livePlayersOf(key) {
  const o = W[key];
  if (!o) return [];
  if (Array.isArray(o.players)) return o.players.map((p) => p.name || p.person_name || '');
  const list = o.roster && o.roster.data && o.roster.data.list;
  if (Array.isArray(list)) {
    const out = [];
    list.forEach((g) => (g.data || []).forEach((p) => out.push({ name: p.person_en_name || p.person_name || '' })));
    return out.map((p) => p.name);
  }
  return [];
}
function load(files) {
  const ctx = { window: {}, console: { log() { } } };
  vm.createContext(ctx);
  for (const f of files) {
    const p = path.join(JS, f);
    if (!fs.existsSync(p)) continue;
    try { vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f }); }
    catch (e) { out(`- ⚠️ ${f} 解析失败：${e.message}`); }
  }
  return ctx.window;
}

const norm = (s) => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

const CACHE_FILES = [
  'data.js', 'name-zh.js', 'scout-cards-data.js', 'manual-photos.js',
  'dqd-u19-cache.js', 'dqd-u18-cache.js', 'dqd-u16-cache.js', 'dqd-barca-atletic-cache.js',
  'dqd-barca-atletic-sf-cache.js',
  'dqd-barca-news-cache.js', 'dqd-u19-news-cache.js', 'dqd-u18-news-cache.js', 'dqd-u16-news-cache.js',
  'official-news-cache.js', 'lamasia-official-news-cache.js', 'sport-news-cache.js', 'md-news-cache.js',
  'news-zh-cache.js', 'fcb-youth-schedules.js', 'videos-data.js', 'videos-cache.js', 'dqd-videos-cache.js'
];
const W = load(CACHE_FILES);

const today = new Date();
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
out(`# 全站对应性体检 · ${fmt(today)}`);
out('');
out('由 `node scripts/audit_site.js` 生成。静态检查，不启动浏览器。');
out('');

/* ── 1. 缓存新鲜度 ───────────────────────────── */
out('## 1. 缓存新鲜度');
out('');
out('| 缓存 | updated | 距今 | 判定 |');
out('|---|---|---|---|');
const CACHE_OBJS = [
  ['dqd-u19-cache.js', 'DQD_U19_CACHE'], ['dqd-u18-cache.js', 'DQD_U18_CACHE'],
  ['dqd-u16-cache.js', 'DQD_U16_CACHE'], ['dqd-barca-atletic-cache.js', 'DQD_BARCA_ATLETIC'],
  ['fcb-youth-schedules.js', 'LAMASIA_SCHEDULES'], ['dqd-videos-cache.js', 'DQD_VIDEOS_CACHE'],
  ['lamasia-official-news-cache.js', 'LAMASIA_OFFICIAL_NEWS'], ['sport-news-cache.js', 'SPORT_NEWS'],
  ['md-news-cache.js', 'MD_NEWS']
];
const stale = [];
for (const [file, key] of CACHE_OBJS) {
  const o = W[key];
  const ts = o && (o.updated || o.updateAt || o.fetched);
  if (!ts) { out(`| ${file} | — | — | ⚠️ 没找到 updated 字段 |`); continue; }
  const t = new Date(String(ts).replace(' ', 'T') + '+08:00');
  const hours = (today - t) / 36e5;
  const bad = hours > 36;
  if (bad) stale.push({ file, ts, hours });
  out(`| ${file} | ${ts} | ${hours.toFixed(1)} 小时 | ${bad ? '❌ 超过 36 小时' : '✅'} |`);
}
out('');

/* ── 2. 名单人数与中文名覆盖 ──────────────────── */
out('## 2. 名单人数 / 中文名覆盖');
out('');
const TIERS = [
  ['预备队', 'barca-atletic', 'DQD_BARCA_ATLETIC'],
  ['U19 A', 'juvenil-a', 'DQD_U19_CACHE'], ['U19 B', 'juvenil-b', 'DQD_U18_CACHE'],
  ['SUB16', 'cadete', 'DQD_U16_CACHE'], ['SUB15', 'cadete-b', null],
  ['SUB14', 'infantil', null], ['SUB13', 'infantil-b', null], ['SUB12', 'infantil-c', null]
];
out('| 梯队 | 静态名单 | 实时名单 | 两边都有 | 只在静态 | 只在实时 | 中文名缺口 |');
out('|---|---|---|---|---|---|---|');
const nameZh = (W.NAME_ZH_MAP || {});
const NameZh = W.NameZh;
for (const [label, tier, key] of TIERS) {
  const local = ((W.LAMASIA_DATA && W.LAMASIA_DATA.players && W.LAMASIA_DATA.players[tier]) || []);
  const live = livePlayersOf(key);
  const liveNorm = live.map(norm);
  const localNorm = local.map((p) => norm(p.name));
  const both = localNorm.filter((n) => liveNorm.indexOf(n) >= 0).length;
  const miss = local.filter((p) => !p.zh).length;
  out(`| ${label} | ${local.length} | ${live.length} | ${both} | ${local.length - both} | ${live.length - both} | ${miss} |`);
}
out('');

/* 实时名单里没有中文名的（会显示英文） */
const noZh = [];
for (const [label, tier, key] of TIERS) {
  if (label === '预备队') continue; // 预备队走懂球帝名单，person_name 本身就是中文
  const local = ((W.LAMASIA_DATA && W.LAMASIA_DATA.players && W.LAMASIA_DATA.players[tier]) || []);
  const localMap = {};
  local.forEach((p) => { localMap[norm(p.name)] = p; });
  livePlayersOf(key).forEach((n) => {
    const hit = localMap[norm(n)];
    const z = (hit && hit.zh) || (NameZh && NameZh(n)) || nameZh[n];
    if (!z && !/[\u4e00-\u9fa5]/.test(n)) noZh.push(`${label} · ${n}`);
  });
}
if (noZh.length) {
  out(`- ⚠️ 实时名单里查不到中文名 ${noZh.length} 人（页面会显示英文）：${noZh.slice(0, 20).join('、')}${noZh.length > 20 ? ' …' : ''}`);
} else {
  out('- ✅ 实时名单里每个人都能查到中文名');
}
out('');

/* ── 3. 新闻翻译 ─────────────────────────────── */
out('## 3. 新闻标题翻译');
out('');
const newsFiles = ['dqd-barca-news-cache.js', 'dqd-u19-news-cache.js', 'dqd-u18-news-cache.js', 'dqd-u16-news-cache.js',
  'official-news-cache.js', 'lamasia-official-news-cache.js', 'sport-news-cache.js', 'md-news-cache.js'];
const zhMap = W.NEWS_ZH || {};
const titles = [];
for (const f of newsFiles) out(`- ${f}：${countTitles(f)} 条`);
function countTitles(f) {
  const raw = fs.existsSync(path.join(JS, f)) ? fs.readFileSync(path.join(JS, f), 'utf8') : '';
  const re = /"title"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let m, n = 0;
  while ((m = re.exec(raw))) { titles.push(m[1]); n++; }
  return n;
}
const zhCount = Object.keys(zhMap).length;
const missing = titles.filter((t) => !/[\u4e00-\u9fa5]/.test(t) && !zhMap[t]);
const dead = Object.keys(zhMap).filter((k) => titles.indexOf(k) < 0);
out(`- 缓存标题合计 **${titles.length}** 条，` + `NEWS_ZH 里 **${zhCount}** 条`);
out(`- ${missing.length ? '⚠️' : '✅'} 未译：${missing.length} 条${missing.length ? '（' + missing.slice(0, 3).map((s) => s.slice(0, 40)).join(' / ') + ' …）' : ''}`);
out(`- ${dead.length ? '⚠️' : '✅'} 失效译文（缓存里已经没有这个原标题）：${dead.length} 条`);
out('');

/* ── 4. 旧梯队标签残留 ───────────────────────── */
out('## 4. 旧梯队标签残留');
out('');
const LEGACY = /(?:U1[0-9])\s*·|"U13 B"|"U13 C"|U19 · Juvenil|U15 · Cadete|U14 · Infantil|U16 · Cadete/;
const skipDirs = /(^|\/)(docs|work|shots|\ .git)\//;
const hits = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'work' || e.name === 'node_modules' || e.name === 'tools') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!/\.(html|js)$/.test(e.name)) continue;
    const rel = path.relative(ROOT, p).replace(/\\/g, '/');
    if (rel === 'assets/js/teams.js' || rel === 'scripts/audit_site.js') continue;
    if (/(?:-data|-cache)\.js$/.test(rel)) continue;
    const txt = fs.readFileSync(p, 'utf8');
    txt.split(/\r?\n/).forEach((ln, i) => {
      if (LEGACY.test(ln)) hits.push(`${rel}:${i + 1}  ${ln.trim().slice(0, 90)}`);
    });
  }
})(ROOT);
if (hits.length) {
  out(`- ⚠️ 命中 ${hits.length} 处（可能是注释/兜底，需要人看一眼）：`);
  hits.slice(0, 15).forEach((h) => out(`  - ${h}`));
  if (hits.length > 15) out(`  - …共 ${hits.length} 处`);
} else {
  out('- ✅ 没有旧写法残留');
}
out('');

/* ── 5. 本地图片引用是否存在 ─────────────────── */
out('## 5. 本地图片引用');
out('');
const missingImg = [];
Object.keys((W.LAMASIA_DATA && W.LAMASIA_DATA.players) || {}).forEach((tier) => {
  (W.LAMASIA_DATA.players[tier] || []).forEach((p) => {
    if (!p.img) return;
    const f = path.join(ROOT, 'assets', 'img', 'players', p.img.replace(/^.*players\//, ''));
    if (!fs.existsSync(f)) missingImg.push(`${tier} / ${p.zh || p.name} → ${p.img}`);
  });
});
(W.SCOUT_CARDS || []).forEach((c) => {
  if (!c.img || /^https?:/.test(c.img)) return;
  const f = path.join(ROOT, c.img);
  if (!fs.existsSync(f)) missingImg.push(`球探卡 / ${c.zh || c.en} → ${c.img}`);
});
if (missingImg.length) {
  out(`- ❌ 引用了但文件不存在 ${missingImg.length} 处：`);
  missingImg.slice(0, 15).forEach((m) => out(`  - ${m}`));
} else {
  out('- ✅ 所有本地图片引用都能找到文件');
}
out('');

/* ── 6. 球员卡编号重复 ───────────────────────── */
out('## 6. 编号重复');
out('');
const sfIds = {};
let dup = 0;
(TIERS || []).forEach(() => { });
Object.keys(W).forEach((k) => {
  const o = W[k];
  if (!o || !Array.isArray(o.players)) return;
  o.players.forEach((p) => {
    if (!p.id) return;
    const kk = String(p.id);
    if (sfIds[kk] && sfIds[kk] !== k) { dup++; if (dup <= 5) out(`- ⚠️ 同一编号 ${kk} 出现在两个梯队名单（${sfIds[kk]} / ${k}），可能跨级或并队，需要人看一眼`); }
    sfIds[kk] = k;
  });
});
if (!dup) out('- ✅ 没有同一编号出现在多个梯队名单里');
out('');

/* ── 写文件 ─────────────────────────────────── */
const outDir = path.join(ROOT, 'docs');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `audit-${fmt(today)}.md`);
fs.writeFileSync(outFile, lines.join('\n') + '\n', 'utf8');
console.log(`\n报告已写入 ${path.relative(ROOT, outFile)}`);
