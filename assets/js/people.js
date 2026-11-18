/* 名字归一与球员状态判断：全站唯一一份。
   以前这个函数在 13 个文件里各抄了一遍，改一处漏十二处（2026-11 踩过）。
   浏览器：window.People；Node（体检/生成脚本）：require('./assets/js/people.js')。 */
(function (root) {
  "use strict";

  /* 英文名归一：去重音、转小写、只留 a-z0-9。"Michał Żuk" → "michalzuk" */
  function norm(s) {
    return String(s == null ? "" : s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "");
  }

  /* 梯队标签归一：额外保留汉字，因为标签本身是中文（"预备队"、"U19 A" 里的 A 也要留） */
  function normLabel(s) {
    return String(s == null ? "" : s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "");
  }

  /* 备注里写了这些词，说明这人已经不在该梯队（升级/转会/租借）。只在「实时名单也查不到」时才用。 */
  var GONE = /已升|已转会|已离队|已租借|转会离队/;

  /* 位置码两套写法：data.js 用 GK/DF/MF/FW，Sofascore 缓存用 G/D/M/F */
  var POS = { GK: "GK", DF: "DF", MF: "MF", FW: "FW", G: "GK", D: "DF", M: "MF", F: "FW" };
  function pos(code) {
    return POS[String(code == null ? "" : code).toUpperCase().trim()] || "";
  }

  var api = { norm: norm, normLabel: normLabel, GONE: GONE, pos: pos, POS: POS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.People = api;
})(typeof window !== "undefined" ? window : globalThis);
