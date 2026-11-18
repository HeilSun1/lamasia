/* 头像与集锦可达性体检（只读）
 *
 * 目的：2026-11-18 的重建把「梯队名单」改成读 data.js 之后，
 *   ① 有人在球探卡/集锦里有头像，名单页却没有；
 *   ② 有人有集锦，点开球员卡却显示「暂无个人集锦」。
 * 这两个 bug 都属于「链路断了」，而旧的 audit_surfaces.js 只比对
 * 缓存内部一致性，压根没模拟浏览器里的取图/取视频决策，所以没报出来。
 *
 * 本脚本用 node 复刻两条决策链（与 assets/js/avatar.js、player-card.js 同口径）：
 *   头像：手动图 → Sofascore（按姓名） → 球探卡本地图 → data.js img → 本地镜像 → 首字母
 *   视频：卡片键（local:<tier>:<slug>）能拿到几条；sfId 键能拿到几条
 *
 * 用法：
 *   node scripts/audit-avatars-videos.js            # 打印 + 写 docs/audit-avatars.md
 *   node scripts/audit-avatars-videos.js --json     # 只输出 JSON（给 diff 用）
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = process.env.LAMASIA_REPO || path.resolve(__dirname, "..");
const J = (p) => path.join(ROOT, "assets", "js", p);

function newContext() {
  const ctx = { console, location: { pathname: "/x.html" } };
  ctx.window = ctx;
  vm.createContext(ctx);
  return ctx;
}

function load(ctx, file) {
  const p = J(file);
  if (!fs.existsSync(p)) return;
  vm.runInContext(fs.readFileSync(p, "utf8"), ctx, { filename: p });
}

const ctx = newContext();
// 顺序与页面一致：people 最先，name-zh 在 scout-cards-data 之后
["people.js", "teams.js", "data.js", "scout-cards-data.js", "name-zh.js",
 "manual-photos.js", "manual-photos-hook.js",
 "dqd-barca-atletic-sf-cache.js", "dqd-barca-atletic-cache.js",
 "dqd-u19-cache.js", "dqd-u18-cache.js", "dqd-u16-cache.js",
 "dqd-videos-cache.js", "videos-data.js"].forEach((f) => load(ctx, f));

const DATA = ctx.LAMASIA_DATA;
const SCOUT = ctx.SCOUT_CARDS || [];
const VIDEOS = ctx.DQD_VIDEOS_CACHE || { players: {}, feed: { players: {} } };
const VDATA = ctx.VIDEOS_DATA || { players: {}, blocked: {} };
const norm = (s) => (ctx.People ? ctx.People.norm(s) : String(s || "").toLowerCase());

/* 懂球帝默认占位图（灰底问号）——视为没有 */
const PLACEHOLDER = new Set([
  "50917373.png", "51017488.png", "51050111.png", "51199202.png",
  "51210430.png", "51246092.png", "51246752.png",
]);
function isPlaceholder(src) {
  const f = String(src || "").split("/").pop();
  return PLACEHOLDER.has(f);
}

/* ── Sofascore 姓名索引（复刻 avatar.js 的 sfIndex） ── */
const SF = {};
[
  ctx.DQD_BARCA_ATLETIC_SF_CACHE,
  ctx.DQD_U19_CACHE,
  ctx.DQD_U18_CACHE,
  ctx.DQD_U16_CACHE,
].forEach((c) => {
  ((c && c.players) || []).forEach((p) => {
    const k = norm(p.name);
    const src = p.photo || p.img || "";
    if (k && src) SF[k] = src;
  });
});

/* ── 球探卡本地图索引 ── */
const SC = {};
SCOUT.forEach((c) => {
  const k = norm(c.en || c.zh);
  if (k && c.img) SC[k] = c.img;
});

/* ── 手动补图（复刻 avatar.js 的 manualKeys 试探顺序） ── */
function manualFor(tier, p) {
  const MP = ctx.MANUAL_PHOTOS || {};
  const id = String(p.sfId || "");
  const cands = [
    `local:${tier}:${norm(p.name)}`,
    `local:${tier}:${norm(p.zh)}`,
    id && `sf:${tier}:${id}`,
    id && `sf:${id}`,
    id && `u19:${id}`,
    id && `barca:${id}`,
    p.dqdId && `b:${p.dqdId}`,
  ].filter(Boolean);
  for (const k of cands) if (MP[k]) return MP[k];
  return "";
}

/* ── 取图链 ── */
function avatarOf(tier, p) {
  const k = norm(p.name);
  /* 复刻当前 avatar.js 的链路（球探卡本地图**还没接进去**，单独作为诊断列） */
  const tries = [
    ["手动补图", manualFor(tier, p)],
    ["Sofascore", SF[k]],
    ["data.js img", p.img],
    ["本地镜像", p.person_logo],
  ];
  for (const [from, src] of tries) {
    if (src && !isPlaceholder(src)) return { src, from };
  }
  return { src: "", from: "无（显示首字母）" };
}

/* ── 视频链（复刻 videos-ui.js 的 resolve + feedFor） ── */
function videoCount(key) {
  if (!key) return 0;
  const blocked = ((VDATA.blocked || {})[key] || []);
  const bs = new Set(blocked);
  const auto = (VIDEOS.players || {})[key] || [];
  const cur = (VDATA.players || {})[key] || [];
  const seen = new Set();
  let n = 0;
  cur.forEach((v) => { if (v && v.videoId && !seen.has(v.videoId) && !bs.has(v.videoId)) { seen.add(v.videoId); n++; } });
  auto.forEach((v) => { if (v && v.videoId && !seen.has(v.videoId) && !bs.has(v.videoId)) { seen.add(v.videoId); n++; } });
  const feed = ((VIDEOS.feed || {}).players || {})[key] || [];
  feed.forEach((g) => (g.videos || []).forEach((v) => {
    if (v && v.videoId && !seen.has(v.videoId) && !bs.has(v.videoId)) { seen.add(v.videoId); n++; }
  }));
  return n;
}

const TIERS_FOR_ID = ["b", "u19", "u18", "u16", "u15", "u14"];

function videosOf(tier, p) {
  const cardKeys = [`local:${tier}:${norm(p.name)}`];
  if (p.dqdId) cardKeys.push(`b:${p.dqdId}`);
  let byCard = Math.max(0, ...cardKeys.map(videoCount));

  let bySf = 0;
  const id = String(p.sfId || "");
  if (id) {
    bySf = Math.max(0, ...TIERS_FOR_ID.map((t) => videoCount(`sf:${t}:${id}`)));
    bySf = Math.max(bySf, videoCount(`sf:b:${id}`));
  }
  return { byCard, bySf };
}

/* ── 逐人核算 ── */
const rows = [];
Object.keys(DATA.players).forEach((tier) => {
  DATA.players[tier].forEach((p) => {
    const av = avatarOf(tier, p);
    const v = videosOf(tier, p);
    rows.push({
      tier,
      name: p.name || "",
      zh: p.zh || "",
      sfId: String(p.sfId || ""),
      avatarFrom: av.from,
      scoutHas: Boolean(SC[norm(p.name)]),
      avatarSrc: av.src,
      videosByCardKey: v.byCard,
      videosBySfKey: v.bySf,
      videosUnreachable: v.byCard === 0 && v.bySf > 0,
    });
  });
});

const noAvatar = rows.filter((r) => !r.avatarSrc);
const unreachable = rows.filter((r) => r.videosUnreachable);
const bySource = {};
rows.forEach((r) => { bySource[r.avatarFrom] = (bySource[r.avatarFrom] || 0) + 1; });

const perTier = {};
rows.forEach((r) => {
  const t = (perTier[r.tier] = perTier[r.tier] || { n: 0, noAv: 0, vid: 0 });
  t.n++;
  if (!r.avatarSrc) t.noAv++;
  if (r.videosUnreachable) t.vid++;
});

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ total: rows.length, noAvatar, unreachable, perTier }, null, 2));
  process.exit(0);
}

const L = [];
L.push("# 头像与集锦可达性体检\n");
L.push(`生成时间：${new Date().toISOString().slice(0, 19).replace("T", " ")}（UTC）\n`);
L.push("> 这是「链路」体检，不是「数据」体检。旧的 `audit_surfaces.js` 只比对缓存内部是否自洽，");
L.push("> 查不出「有人有图却取不到」「有视频却对不上键」这类断链。\n");
L.push(`## 总览\n`);
L.push(`- 名单人数：**${rows.length}**`);
L.push(`- 取不到任何头像：**${noAvatar.length}** 人`);
L.push(`- 有集锦但卡片拿不到：**${unreachable.length}** 人\n`);
L.push("| 梯队 | 人数 | 无头像 | 视频不可达 |");
L.push("|---|---:|---:|---:|");
Object.keys(perTier).forEach((t) => {
  const x = perTier[t];
  L.push(`| ${t} | ${x.n} | ${x.noAv} | ${x.vid} |`);
});
L.push("\n## 头像来源分布\n");
Object.keys(bySource).sort((a, b) => bySource[b] - bySource[a]).forEach((k) => {
  L.push(`- ${k}：${bySource[k]} 人`);
});
if (noAvatar.length) {
  L.push("\n## 取不到头像的球员\n");
  noAvatar.forEach((r) => L.push(`- ${r.tier} · ${r.zh}（${r.name}）sfId=${r.sfId || "无"}`));
}
if (unreachable.length) {
  L.push("\n## 有集锦但球员卡拿不到\n");
  L.push("> 视频以 Sofascore/懂球帝编号为键，卡片用 `local:<梯队>:<拼音>` 打开，`videoKeyFor()` 不认这个前缀。\n");
  unreachable.forEach((r) => L.push(`- ${r.tier} · ${r.zh}：卡片键 ${r.videosByCardKey} 条 / sfId 键 ${r.videosBySfKey} 条`));
}

const outMd = path.join(ROOT, "docs", "audit-avatars.md");
fs.writeFileSync(outMd, L.join("\n") + "\n", "utf8");

console.log(`名单 ${rows.length} 人 ｜ 无头像 ${noAvatar.length} ｜ 视频不可达 ${unreachable.length}`);
console.log("头像来源：" + Object.keys(bySource).map((k) => `${k} ${bySource[k]}`).join(" ｜ "));
if (noAvatar.length) console.log("无头像：" + noAvatar.map((r) => `${r.tier}/${r.zh}`).join("、"));
if (unreachable.length) console.log("视频不可达：" + unreachable.map((r) => `${r.tier}/${r.zh}`).join("、"));
console.log(`\n报告已写入 docs/audit-avatars.md`);
