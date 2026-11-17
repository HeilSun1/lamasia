/* 英文名 → 中文名：全站唯一的查询入口。
   以前 dqd-u19/u18/u16、formation、roster 各自维护一份映射（都只查 data.js 本梯队名单），
   于是同一个球员在一处显示中文、在另一处掉成英文。这里把所有来源合成一张表查一次。
   来源：data.js（含各梯队中文名与别名）、scout-cards-data.js、LAMASIA_NAME_ZH、手工补充。 */
(function () {
  "use strict";

  var map = {};

  function norm(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  function add(en, zh) {
    if (!en || !zh) return;
    var k = norm(en);
    if (k && !map[k]) map[k] = String(zh);
  }

  /* 1) data.js：各梯队名单（中文名 + 别名） */
  var d = window.LAMASIA_DATA && window.LAMASIA_DATA.players;
  if (d) {
    Object.keys(d).forEach(function (t) {
      (d[t] || []).forEach(function (p) {
        add(p.name, p.zh);
        add(p.nameAlias, p.zh);
      });
    });
  }

  /* 2) 球探卡：Sofascore 英文名 → 中文名（124 条，覆盖本赛季新人） */
  (window.SCOUT_CARDS || []).forEach(function (c) { add(c.en, c.zh); });

  /* 3) data.js 末尾的归一化表 */
  var nm = window.LAMASIA_NAME_ZH || {};
  Object.keys(nm).forEach(function (k) { add(k, nm[k]); });

  /* 4) 手工补充：以上来源都没有的球员 */
  var manual = {
    "Erik Domínguez Martos": "埃里克·多明格斯·马托斯",
    "Gerard Valls": "杰拉德·巴尔斯"
  };
  Object.keys(manual).forEach(function (k) { add(k, manual[k]); });

  window.NAME_ZH_MAP = map;
  window.NameZh = function (name) { return map[norm(name)] || ""; };
})();
