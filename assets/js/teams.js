/* ═══════════════════════════════════════════════
   拉玛西亚信息站 · 梯队标签唯一出口
   ───────────────────────────────────────────────
   以前这个标签散在四个文件里各写一遍，写法还不一样：
     player-card.js   "U19 A · Juvenil A"
     highlights.js    "U19 A · Juvenil A"（分组用 "SUB14–SUB12 · Infantil A/B/C"）
     search.js        "U19 · Juvenil A" / "U16 · Cadete A" / "U10A · Benjamín A"
     formation.js     "U19 A" / "U16" / "U13" / "U12"
   于是同一支队在不同页面叫不同名字。现在只在这里写一次，
   规则见 DESIGN.md「梯队只用一套命名（SUB 体系）」。

   用法：
     window.Teams.label("cadete")        → "SUB16 · Cadete A"
     window.Teams.num("cadete")          → "SUB16"
     window.Teams.page("juvenil-a")      → "teams/juvenil-a.html#sec-roster"
     window.Teams.label("u16")           → "SUB16 · Cadete A"（别名也认）
     window.Teams.fromEn("Cadete A")     → 上面那一条
   ═══════════════════════════════════════════════ */
(function () {
  "use strict";

  var LIST = [
    { key: "barca-atletic", alias: ["b", "barca", "barca-atletic", "prep"], num: "预备队",
      full: "预备队 · Barça Atlètic", en: "Barça Atlètic", page: "teams/barca-atletic.html#sec-roster" },
    { key: "juvenil-a", alias: ["u19", "juvenil-a", "juv-a"], num: "U19 A",
      full: "U19 A · Juvenil A", en: "Juvenil A", page: "teams/juvenil-a.html#sec-roster" },
    { key: "juvenil-b", alias: ["u18", "juvenil-b", "juv-b"], num: "U19 B",
      full: "U19 B · Juvenil B", en: "Juvenil B", page: "teams/juvenil-b.html" },
    { key: "cadete", alias: ["u16", "cadete", "cadete-a"], num: "SUB16",
      full: "SUB16 · Cadete A", en: "Cadete A", page: "teams/cadete.html" },
    { key: "cadete-b", alias: ["u15", "cadete-b"], num: "SUB15",
      full: "SUB15 · Cadete B", en: "Cadete B", page: "teams/cadete-b.html#roster-cadete-b" },
    { key: "infantil", alias: ["u14", "infantil", "infantil-a"], num: "SUB14",
      full: "SUB14 · Infantil A", en: "Infantil A", page: "teams/infantil.html#roster-infantil" },
    { key: "infantil-b", alias: ["infantil-b"], num: "SUB13",
      full: "SUB13 · Infantil B", en: "Infantil B", page: "teams/infantil-b.html#roster-infantil-b" },
    { key: "infantil-c", alias: ["infantil-c"], num: "SUB12",
      full: "SUB12 · Infantil C", en: "Infantil C", page: "teams/infantil-c.html#roster-infantil-c" },
    { key: "u11a", alias: ["u11a"], num: "SUB11 A",
      full: "SUB11 A · Alevín C", en: "Alevín C", page: "teams/seven-a-side.html#sec-roster-u11a" },
    { key: "u11b", alias: ["u11b"], num: "SUB11 B",
      full: "SUB11 B · Alevín D", en: "Alevín D", page: "teams/seven-a-side.html#sec-roster-u11b" },
    { key: "u10a", alias: ["u10a"], num: "SUB10 A",
      full: "SUB10 A · Benjamín A", en: "Benjamín A", page: "teams/seven-a-side.html#sec-roster-u10a" },
    { key: "u10b", alias: ["u10b"], num: "SUB10 B",
      full: "SUB10 B · Benjamín B", en: "Benjamín B", page: "teams/seven-a-side.html#sec-roster-u10b" },
    { key: "u9a", alias: ["u9a"], num: "SUB9 A",
      full: "SUB9 A · Benjamín C", en: "Benjamín C", page: "teams/seven-a-side.html#sec-roster-u9a" },
    { key: "u9b", alias: ["u9b"], num: "SUB9 B",
      full: "SUB9 B · Benjamín D", en: "Benjamín D", page: "teams/seven-a-side.html#sec-roster-u9b" }
  ];

  var byKey = {};
  LIST.forEach(function (t) {
    byKey[t.key] = t;
    t.alias.forEach(function (a) { byKey[a] = t; });
  });

  /* 归一规则见 assets/js/people.js（全站唯一一份） */
  var norm = window.People.normLabel;

  var byNorm = {};
  LIST.forEach(function (t) {
    byNorm[norm(t.en)] = t;
    byNorm[norm(t.num)] = t;
    byNorm[norm(t.full)] = t;
    t.alias.forEach(function (a) { byNorm[norm(a)] = t; });
  });

  function get(k) {
    if (!k) return null;
    var s = String(k);
    return byKey[s] || byKey[s.toLowerCase()] || byNorm[norm(s)] || null;
  }
  function label(k) { var t = get(k); return t ? t.full : String(k || ""); }
  function num(k) { var t = get(k); return t ? t.num : String(k || ""); }
  function page(k) { var t = get(k); return t ? t.page : ""; }
  function en(k) { var t = get(k); return t ? t.en : String(k || ""); }
  function fromEn(name) { return byNorm[norm(name)] || null; }
  function nums() { return LIST.map(function (t) { return t.num; }); }

  /* 集锦页签用的短码。只有页签上真有那一格的梯队才给码，其余归 other。
     这样「一个人算哪个队」只有一处判定：People.fromKey → Teams.code。 */
  var CODE = {
    "barca-atletic": "b",
    "juvenil-a": "u19",
    "juvenil-b": "u18",
    cadete: "u16",
    "cadete-b": "u15",
    infantil: "u14"
  };
  function code(k) {
    var t = get(k);
    return (t && CODE[t.key]) || "other";
  }

  window.Teams = {
    list: LIST,
    get: get,
    label: label,
    num: num,
    page: page,
    en: en,
    fromEn: fromEn,
    nums: nums,
    code: code
  };
})();
