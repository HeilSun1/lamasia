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

  /* 视频键 → 人。集锦的键有三种写法：local:<tier>:<拼音>（data.js 名单算出来的）、
     sf:b:<id> / b:<id>（Sofascore 编号）、sf:<u19|u18|u16|b>:<id>。
     以前每处渲染各自解析，查不到就把键名甩到界面上（2026-11 踩过）。
     统一在这里按「id 优先、名字次之」查一遍：data.js 名单 → Sofascore 缓存 → 球探卡。 */
  function fromKey(k) {
    var s = String(k == null ? "" : k);
    var idm = /^(?:sf:)?(?:b|u19|u18|u16):(\d+)$/.exec(s);
    var lm = /^local:([a-z0-9-]+):([a-z0-9]+)$/.exec(s);
    var slug = lm ? lm[2] : "";
    var wantId = idm ? idm[1] : "";
    var tier = lm ? lm[1] : (idm ? (/^sf:b:|^b:/.test(s) ? "barca-atletic" : s.split(":")[1]) : "");

    function zhOf(en) {
      if (!en) return "";
      if (root.NameZh) { var z = root.NameZh(en); if (z) return z; }
      return "";
    }

    /* 1) data.js 官方名单（最可信，带中文名与梯队） */
    var all = (root.LAMASIA_DATA && root.LAMASIA_DATA.players) || {};
    for (var t in all) {
      if (!Object.prototype.hasOwnProperty.call(all, t)) continue;
      var arr = all[t] || [];
      for (var i = 0; i < arr.length; i++) {
        var p = arr[i];
        if (!p) continue;
        if ((wantId && String(p.sfId || "") === wantId) || (slug && p.name && norm(p.name) === slug)) {
          return { nameZh: p.zh || zhOf(p.name), nameEn: p.name || "", team: t, tier: t, source: "data" };
        }
      }
    }

    /* 2) Sofascore 缓存（按编号，其次按名字） */
    var caches = [root.DQD_BARCA_ATLETIC_SF_CACHE, root.DQD_U19_CACHE, root.DQD_U18_CACHE, root.DQD_U16_CACHE];
    for (var c = 0; c < caches.length; c++) {
      var ps = (caches[c] && caches[c].players) || [];
      for (var j = 0; j < ps.length; j++) {
        var q = ps[j];
        if (!q) continue;
        if ((wantId && String(q.id || "") === wantId) || (slug && q.name && norm(q.name) === slug)) {
          return { nameZh: zhOf(q.name), nameEn: q.name || "", team: "", tier: tier, source: "sofascore", sf: q.photo || "" };
        }
      }
    }

    /* 3) 球探卡 */
    var sc = root.SCOUT_CARDS || [];
    for (var s2 = 0; s2 < sc.length; s2++) {
      var c2 = sc[s2];
      if (!c2) continue;
      if (slug && c2.en && norm(c2.en) === slug) {
        return { nameZh: c2.zh || zhOf(c2.en), nameEn: c2.en, team: c2.team || "", tier: tier, source: "scout" };
      }
    }
    return null;
  }
  var api = { norm: norm, fromKey: fromKey, normLabel: normLabel, GONE: GONE, pos: pos, POS: POS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.People = api;
})(typeof window !== "undefined" ? window : globalThis);
