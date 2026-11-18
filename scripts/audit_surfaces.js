/* 全站「人」的对应性体检：同一名球员在四个面（梯队静态名单 / Sofascore 实时名单 /
   排兵布阵球员池 / 球探卡）里的 存在性、中文名、头像 是否一致。
   用法：node scripts/audit_surfaces.js  → 输出 docs/audit-surfaces.md        */
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const JS = path.join(ROOT, "assets", "js");

const win = {};
const sandbox = {
  window: win,
  console,
  setTimeout,
  location: { pathname: "/formation.html" },
  document: {
    addEventListener() {}, removeEventListener() {},
    getElementById() { return null; }, querySelector() { return null; },
    querySelectorAll() { return []; }, createElement() { return { style: {} }; },
    readyState: "complete", body: { appendChild() {} },
  },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

function load(f) {
  const p = path.join(JS, f);
  if (!fs.existsSync(p)) return false;
  vm.runInContext(fs.readFileSync(p, "utf8"), sandbox, { filename: f });
  return true;
}

["people.js", "teams.js", "name-zh.js", "data.js", "manual-photos.js", "avatar.js",
 "scout-cards-data.js", "dqd-u19-cache.js", "dqd-u18-cache.js", "dqd-u16-cache.js",
 "dqd-barca-atletic-cache.js"].forEach(load);

win.ManualPhoto = function (k) { return (win.MANUAL_PHOTOS && win.MANUAL_PHOTOS[k]) || ""; };

const norm = win.People.norm;
function zhName(en, fallback) {
  const t = win.NameZh ? win.NameZh(en) : "";
  return t || fallback || "";
}
function av(p) {
  try { const l = win.AvatarChain(p); return (l && l[0]) || ""; } catch (e) { return ""; }
}
function kind(u) {
  if (!u) return "无";
  if (/sofascore\.com/.test(u)) return "Sofascore";
  if (/manual\//.test(u)) return "手动";
  if (/dqd\//.test(u)) return "懂球帝";
  if (/players\//.test(u)) return "本地";
  return "其他";
}

/* ── 1) 静态名单 ───────────────────────────── */
const DATA = (win.LAMASIA_DATA && win.LAMASIA_DATA.players) || {};
const staticByTier = {};          // tier -> [{en, zh, note, img}]
const stat = {};                  // normName -> 记录
Object.keys(DATA).forEach(function (tier) {
  staticByTier[tier] = [];
  (DATA[tier] || []).forEach(function (p) {
    const k = norm(p.name);
    if (!k) return;
    const rec = {
      en: p.name, zh: p.zh || "", note: p.note || "",
      img: p.img ? "assets/img/players/" + p.img : "", tier: tier, inFormation: false,
    };
    staticByTier[tier].push(rec);
    stat[k] = stat[k] || { en: p.name, statics: [] };
    stat[k].statics.push(rec);
  });
});

/* ── 2) Sofascore 实时名单 ─────────────────── */
const LIVE = [
  { c: win.DQD_U19_CACHE, tier: "juvenil-a", label: "U19 A" },
  { c: win.DQD_U18_CACHE, tier: "juvenil-b", label: "U19 B" },
  { c: win.DQD_U16_CACHE, tier: "cadete", label: "U16" },
];
LIVE.forEach(function (s) {
  ((s.c && s.c.players) || []).forEach(function (p) {
    const k = norm(p.name);
    if (!k) return;
    stat[k] = stat[k] || { en: p.name, statics: [] };
    stat[k].live = { tier: s.tier, label: s.label, id: p.id, photo: p.photo || "" };
  });
});

/* ── 3) 排兵布阵池子（复刻 formation.js 的规则） ── */
const TEAM_OF = {};
["juvenil-a", "juvenil-b", "cadete", "cadete-b", "infantil", "infantil-b", "infantil-c",
 "u11a", "u11b", "u10a", "u10b", "u9a", "u9b"].forEach(function (t) {
  TEAM_OF[t] = win.Teams ? win.Teams.num(t) : t;
});
const GONE = win.People.GONE;
const pool = {};
Object.keys(TEAM_OF).forEach(function (tid) {
  (DATA[tid] || []).forEach(function (p) {
    const k = norm(p.name);
    if (!k) return;
    pool[k] = {
      en: p.name, zh: p.zh || "", team: TEAM_OF[tid], note: p.note || "",
      img: p.img ? "assets/img/players/" + p.img : "", live: false,
    };
  });
});
LIVE.forEach(function (s) {
  ((s.c && s.c.players) || []).forEach(function (p) {
    const k = norm(p.name);
    if (!k) return;
    if (s.tier === "juvenil-b") {              // U19 B：只补图，不加人
      if (pool[k]) { if (p.photo && !pool[k].sf) pool[k].sf = p.photo; }
      return;
    }
    if (!pool[k]) {
      pool[k] = { en: p.name, zh: "", team: s.label, note: "", img: "", sf: p.photo || "", live: true };
    } else if (p.photo && !pool[k].sf) {
      pool[k].sf = p.photo;
    }
    if (!pool[k].zh) {
      const z = zhName(p.name, "");
      if (z) pool[k].zh = z;
    }
  });
});
Object.keys(pool).forEach(function (k) {
  const e = pool[k];
  if (!e.live && GONE.test(e.note || "")) delete pool[k];
});

/* ── 4) 球探卡 ─────────────────────────────── */
const SCOUT = {};
(win.SCOUT_CARDS || []).forEach(function (c) {
  const k = norm(c.en);
  if (!k) return;
  SCOUT[k] = c;
});

/* ── 比对 ──────────────────────────────────── */
const rows = [];
const missingZh = [];
const avDiff = [];
const scoutNotInStatic = [];
const scoutTeamDiff = [];
const scoutBTeam = [];
/* 已知的同一人两种写法：左=名单写法，右=球探卡写法（都经 norm） */
const ALIAS = { nilvicensponsati: "nilvicens" };
const poolNotInStatic = [];

Object.keys(stat).forEach(function (k) {
  const s = stat[k];
  const scout = SCOUT[ALIAS[k] || k];
  const inPool = !!pool[k];
  const staticRec = s.statics[0] || null;
  const zhStatic = staticRec ? (staticRec.zh || "") : "";
  const zhScout = scout ? (scout.zh || "") : "";
  const zhPool = inPool ? (pool[k].zh || "") : "";
  const zhBest = zhStatic || zhScout || zhPool || zhName(s.en, "");

  const aStatic = staticRec ? av({ key: "local:" + staticRec.tier + ":" + norm(staticRec.en), en: s.en, zh: zhStatic, img: staticRec.img, base: "" }) : "";
  const aScout = scout ? av({ key: scout.key, en: scout.en, zh: zhScout, img: scout.img || "", sf: scout.sf || "", base: "" }) : "";
  const aPool = inPool ? av({ key: "local:" + (staticRec ? staticRec.tier : "x") + ":" + norm(s.en), en: s.en, zh: zhPool, img: pool[k].img || "", sf: pool[k].sf || "", base: "" }) : "";

  if (!zhBest) missingZh.push(s.en + (scout ? "（球探卡）" : "") + (staticRec ? "（" + staticRec.tier + "）" : ""));

  /* 预备队走懂球帝名单（中文名），data.js 里没有，单列出来不算「名单里没有」 */
  if (scout && !staticRec && scout.team === "barca-atletic") scoutBTeam.push(scout.en);
  else if (scout && !staticRec) scoutNotInStatic.push(scout.en + " -> " + (scout.teamLabel || scout.team || ""));

  if (scout && staticRec) {
    const want = win.Teams ? win.Teams.label(staticRec.tier) : staticRec.tier;
    const got = scout.teamLabel || "";
    if (got && want && got.indexOf(win.Teams.num(staticRec.tier)) === -1) {
      scoutTeamDiff.push(scout.en + "：名单 " + want + " / 球探卡 " + got);
    }
  }

  if (inPool && !staticRec && !s.live) poolNotInStatic.push(s.en);

  const kinds = [aStatic ? kind(aStatic) : "", aScout ? kind(aScout) : "", aPool ? kind(aPool) : ""].filter(Boolean);
  const uniq = Array.from(new Set(kinds));
  const urls = [aStatic, aScout, aPool].filter(Boolean);
  const uniqUrls = Array.from(new Set(urls));
  if (uniqUrls.length > 1) {
    avDiff.push({ en: s.en, zh: zhBest, urls: uniqUrls, kinds: uniq });
  }

  rows.push({ k, en: s.en, zh: zhBest, inPool, scout: !!scout, staticTier: staticRec ? staticRec.tier : "", liveTier: s.live ? s.live.label : "" });
});

const total = rows.length;
const inAll = rows.filter(function (r) { return r.inPool && r.scout; }).length;

const lines = [];
lines.push("# 全站「人」的对应性体检");
lines.push("");
lines.push("生成时间：" + new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }));
lines.push("");
lines.push("| 指标 | 数值 |");
lines.push("| --- | --- |");
lines.push("| 出现过的球员（去重，按英文名归一） | " + total + " |");
lines.push("| 静态名单里 | " + Object.keys(staticByTier).reduce(function (n, t) { return n + staticByTier[t].length; }, 0) + " 条 |");
lines.push("| Sofascore 实时名单里 | " + LIVE.reduce(function (n, s) { return n + ((s.c && s.c.players) || []).length; }, 0) + " 条 |");
lines.push("| 排兵布阵池子里 | " + Object.keys(pool).length + " 人 |");
lines.push("| 球探卡里 | " + Object.keys(SCOUT).length + " 人 |");
lines.push("| 同时在排兵布阵与球探卡 | " + inAll + " 人 |");
lines.push("");
lines.push("## 1. 没有中文名（会显示英文）｜" + missingZh.length + " 人");
lines.push(missingZh.length ? missingZh.map(function (s) { return "- " + s; }).join("\n") : "- 无");
lines.push("");
lines.push("## 2. 头像不一致（同一人算出不同图）｜" + avDiff.length + " 人");
lines.push(avDiff.length ? avDiff.slice(0, 40).map(function (d) {
  return "- **" + d.zh + "**（" + d.en + "）：" + d.urls.map(function (u) { return kind(u) + " `" + u + "`"; }).join(" ／ ");
}).join("\n") : "- 无");
if (avDiff.length > 40) lines.push("\n…另有 " + (avDiff.length - 40) + " 条，见 json");
lines.push("");
lines.push("## 3. 球探卡有、静态名单没有｜" + scoutNotInStatic.length + " 人");
lines.push(scoutNotInStatic.length ? scoutNotInStatic.slice(0, 40).map(function (s) { return "- " + s; }).join("\n") : "- 无");
lines.push("");
lines.push("## 4. 球探卡的梯队标签与静态名单不符｜" + scoutTeamDiff.length + " 人");
lines.push(scoutTeamDiff.length ? scoutTeamDiff.slice(0, 40).map(function (s) { return "- " + s; }).join("\n") : "- 无");
lines.push("");
lines.push("### 预备队球探卡（走懂球帝名单，未逐条核对）｜" + scoutBTeam.length + " 人"); lines.push(""); lines.push(scoutBTeam.length ? scoutBTeam.map(function (s) { return "- " + s; }).join("\n") : "- 无"); lines.push("");
lines.push("## 5. 排兵布阵里、静态名单没有、也不是 Sofascore 新增｜" + poolNotInStatic.length + " 人");
lines.push(poolNotInStatic.length ? poolNotInStatic.map(function (s) { return "- " + s; }).join("\n") : "- 无");

fs.mkdirSync(path.join(ROOT, "docs"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "docs", "audit-surfaces.md"), lines.join("\n") + "\n", "utf8");
fs.writeFileSync(path.join(ROOT, "docs", "audit-surfaces.json"), JSON.stringify({
  summary: { total: total, pool: Object.keys(pool).length, scout: Object.keys(SCOUT).length, inAll: inAll },
  missingZh: missingZh, avDiff: avDiff, scoutNotInStatic: scoutNotInStatic,
  scoutTeamDiff: scoutTeamDiff, poolNotInStatic: poolNotInStatic,
}, null, 2), "utf8");

console.log("球员 " + total + " ｜ 池子 " + Object.keys(pool).length + " ｜ 球探卡 " + Object.keys(SCOUT).length);
console.log("无中文名 " + missingZh.length + " ｜ 头像不一致 " + avDiff.length + " ｜ 球探卡不在名单 " + scoutNotInStatic.length + " ｜ 球探卡梯队不符 " + scoutTeamDiff.length + " ｜ 池子多出 " + poolNotInStatic.length);
