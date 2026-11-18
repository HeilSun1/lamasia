/* 按 2026-27 官方注册海报重建 data.js 的 juvenil-a / juvenil-b 两块名单。
   字段从 Sofascore 缓存补（位置/生日/国籍/照片编号），中文名走 name-zh.js + 现有条目。
   只生成文本，不改文件；先跑 --check 看预览。 */
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const JS = path.join(ROOT, "assets", "js");

const win = {};
const sb = {
  window: win, console,
  document: { addEventListener() {}, getElementById() { return null; }, querySelector() { return null; }, createElement() { return { style: {} }; }, readyState: "complete" },
};
sb.globalThis = sb;
vm.createContext(sb);
function load(f) { vm.runInContext(fs.readFileSync(path.join(JS, f), "utf8"), sb, { filename: f }); }
["teams.js", "name-zh.js", "data.js", "dqd-u19-cache.js", "dqd-u18-cache.js", "dqd-u16-cache.js", "dqd-barca-atletic-sf-cache.js", "scout-cards-data.js"].forEach(load);

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

/* Sofascore 记录池：同一个人可能在多个缓存里，合并取最全的一条 */
const SF = {};
[[win.DQD_U19_CACHE, "u19"], [win.DQD_U18_CACHE, "u18"], [win.DQD_U16_CACHE, "u16"], [win.DQD_BARCA_ATLETIC_SF_CACHE, "b"]].forEach(function (pair) {
  ((pair[0] || {}).players || []).forEach(function (p) {
    const k = norm(p.name);
    if (!k) return;
    if (!SF[k]) SF[k] = p;
    else if (!SF[k].photo && p.photo) SF[k] = p;
  });
});

/* 现有条目（用来继承中文名、照片、备注） */
const CUR = {};
Object.keys(win.LAMASIA_DATA.players || {}).forEach(function (t) {
  (win.LAMASIA_DATA.players[t] || []).forEach(function (p) {
    const k = norm(p.name);
    if (k && !CUR[k]) CUR[k] = p;
  });
});

const SCOUT = {};
(win.SCOUT_CARDS || []).forEach(function (c) { const k = norm(c.en); if (k) SCOUT[k] = c; });

const NATION = {
  Spain: "西班牙", Portugal: "葡萄牙", Ukraine: "乌克兰", Morocco: "摩洛哥",
  Nigeria: "尼日利亚", Ghana: "加纳", Senegal: "塞内加尔", Brazil: "巴西",
  France: "法国", Egypt: "埃及", Mali: "马里", Belgium: "比利时", Germany: "德国",
  Netherlands: "荷兰", England: "英格兰", Israel: "以色列", Venezuela: "委内瑞拉",
  "Ivory Coast": "科特迪瓦", "Cote d'Ivoire": "科特迪瓦", Italy: "意大利", Argentina: "阿根廷",
  Uruguay: "乌拉圭", Colombia: "哥伦比亚", Japan: "日本", China: "中国", Gambia: "冈比亚",
  "Burkina Faso": "布基纳法索", Cameroon: "喀麦隆", Ecuador: "厄瓜多尔", Denmark: "丹麦",
  Sweden: "瑞典", Norway: "挪威", Poland: "波兰", "Czech Republic": "捷克", Croatia: "克罗地亚",
};

const GONE = /已升|已转会|已离队|已租借|转会离队/;

const ALIAS = {
  "Dany Freire": "Daniel Freire",
  "Ïu Martínez": "Iu Martinez",
  "Nil Vicens": "Nil Vicens Ponsati",
};
function pickSf(name) {
  if (ALIAS[name] && SF[norm(ALIAS[name])]) return SF[norm(ALIAS[name])];
  let k = norm(name);
  if (SF[k]) return SF[k];
  const keys = Object.keys(SF).filter(function (key) {
    return key.indexOf(k) === 0 || k.indexOf(key) === 0;
  });
  if (keys.length === 1) return SF[keys[0]];
  return null;
}
function pickCur(name) {
  if (ALIAS[name] && CUR[norm(ALIAS[name])]) return CUR[norm(ALIAS[name])];
  let k = norm(name);
  if (CUR[k]) return CUR[k];
  const keys = Object.keys(CUR).filter(function (key) { return key.indexOf(k) === 0 || k.indexOf(key) === 0; });
  if (keys.length === 1) return CUR[keys[0]];
  return null;
}
function zhOf(name) {
  const s = pickSf(name) || {};
  const sc = SCOUT[norm(name)] || {};
  const cur = pickCur(name) || {};
  return (win.NameZh && win.NameZh(name)) || cur.zh || sc.zh || "";
}

const POS = { GK: "GK", RB: "DF", CB: "DF", LB: "DF", CDM: "MF", CM: "MF", CAM: "MF", RW: "FW", ST: "FW", LW: "FW" };

const POSTER = {
  "juvenil-a": {
    GK: ["Gerard Sala", "Gerard Valls"],
    RB: ["Nil Teixidor", "Raúl Expósito"],
    CB: ["Nico Marcipar", "Baba Kourouma", "Sergi Mayans", "Joan Inglés", "Mikael Baza"],
    LB: ["Pol Bernabéu", "Lorenzo Oertli"],
    CDM: ["Adam Argemí", "Samu Borniquel"],
    CM: ["Michał Żuk", "Xavi Miràngels"],
    CAM: ["Roberto Tomás", "Gorka Buil"],
    RW: ["Nil Vicens"],
    ST: ["Adrián Guerrero", "Nuhu Fofana"],
    LW: ["Ajay Tavares", "Ïu Martínez"],
  },
  "juvenil-b": {
    GK: ["Pau Espí", "Pablo Peña", "Elyott Daussy"],
    RB: ["Guiu Xuclà", "Álvaro Gómez", "Óscar Medina"],
    CB: ["Roc Martínez", "Luca Pérez", "Pere Villacorta", "Madou Murcia"],
    LB: ["Ahmed Abarkane", "Pau Bergés"],
    CDM: ["Gerard Mullol", "Mahdi El Maimouni"],
    CM: ["Ignasi Bassas", "Robert Oliveras", "Arnau Casas"],
    CAM: ["Unai Balmón", "Hugo Garcés", "Genís Clúa"],
    RW: ["Erik Domínguez", "Byron Mendoza"],
    ST: ["Ismael Ziani", "Artem Rybak", "Dany Freire"],
    LW: ["Noah García", "Ruslan Mba", "Ibrahim Babayev"],
  },
};

function pad(s, n) {
  let w = 0;
  for (const ch of s) w += ch.charCodeAt(0) > 255 ? 2 : 1;
  return s + " ".repeat(Math.max(1, n - w));
}
function q(s) { return '"' + String(s || "").replace(/"/g, '\\"') + '"'; }

const problems = [];
function line(tier, role, name) {
  const sf = pickSf(name);
  const cur = pickCur(name) || {};
  const zh = zhOf(name);
  const pos = POS[role];

  const parts = [];
  parts.push("num: " + q(sf && sf.shirt ? sf.shirt : (cur.num || "—")));
  parts.push("name: " + q(name));
  parts.push("zh: " + q(zh));
  parts.push("pos: " + q(pos));
  if (cur.role && cur.role !== role) parts.push("role: " + q(role));
  else parts.push("role: " + q(role));
  const dirty = (v) => !v || v === "—" || v === "-";
  const nation = !dirty(cur.nation) ? cur.nation : ((sf && NATION[sf.nation]) || "");
  if (nation) parts.push("nation: " + q(nation));
  const dob = !dirty(cur.dob) ? cur.dob : (((sf && sf.birthday) && sf.birthday !== "—") ? sf.birthday : "");
  if (dob) parts.push("dob: " + q(dob));
  if (cur.foot) parts.push("foot: " + q(cur.foot));
  if (!dirty(cur.note) && !GONE.test(cur.note)) parts.push("note: " + q(cur.note));
  if (cur.img) {
    parts.push("img: " + q(cur.img));
    if (cur.imgCredit) parts.push("imgCredit: " + q(cur.imgCredit));
    if (cur.imgUrl) parts.push("imgUrl: " + q(cur.imgUrl));
  } else {
    parts.push("img: \"\"");
  }
  if (sf && sf.id) parts.push("sfId: " + q(sf.id));

  if (!zh) problems.push(tier + " " + name + "：没有中文名");
  if (!sf) problems.push(tier + " " + name + "：Sofascore 没有记录（无 sfId / 无生日与国籍）");
  if (!dob) problems.push(tier + " " + name + "：没有出生日期");
  return "      { " + parts.join(", ") + " },";
}

const out = {};
Object.keys(POSTER).forEach(function (tier) {
  const rows = [];
  let n = 0;
  Object.keys(POSTER[tier]).forEach(function (role) {
    POSTER[tier][role].forEach(function (name) {
      rows.push(line(tier, role, name));
      n++;
    });
  });
  rows[rows.length - 1] = rows[rows.length - 1].replace(/,\s*$/, "");
  out[tier] = { text: rows.join("\n"), count: n };
});

if (process.argv.includes("--check")) {
  console.log("=== 预览 ===");
  Object.keys(out).forEach(function (t) {
    console.log("\n--- " + t + "（" + out[t].count + " 人）---");
    console.log(out[t].text.split("\n").slice(0, 4).join("\n"));
    console.log("…");
  });
  console.log("\n=== 问题 ===");
  console.log(problems.length ? problems.join("\n") : "（无）");
} else {
  const p = path.join(JS, "data.js");
  let txt = fs.readFileSync(p, "utf8");
  const crlf = txt.indexOf("\r\n") >= 0;
  let work = txt.replace(/\r\n/g, "\n");

  Object.keys(out).forEach(function (tier) {
    const re = new RegExp('("' + tier + '"\\s*:\\s*\\[)([\\s\\S]*?)(\\n\\s*\\],?)');
    const m = re.exec(work);
    if (!m) throw new Error("找不到 " + tier + " 块");
    work = work.replace(re, m[1] + "\n" + out[tier].text + m[3]);
  });

  if (crlf) work = work.replace(/\n/g, "\r\n");
  fs.writeFileSync(p, work, "utf8");
  console.log("已写入：juvenil-a " + out["juvenil-a"].count + " 人、juvenil-b " + out["juvenil-b"].count + " 人");
  console.log("问题 " + problems.length + " 条：\n" + (problems.length ? problems.join("\n") : "（无）"));
}
