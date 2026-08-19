/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 全局球员搜索
   ─────────────────────────────────────────────────────────────
   数据源（都在本站缓存里，客户端索引）：
     · data.js（LAMASIA_DATA.players）—— 官方名单，含中英文名
     · dqd-barca-atletic-cache.js（B队，懂球帝，中文名）
     · dqd-u19/u18/u16-cache.js（Sofascore，英文名）
   搜索：中文名 / 英文名（忽略大小写与重音符）子串匹配。
   点击结果 → 跳转对应梯队页面（低龄梯队定位到分区锚点）。
   仅用于 search.html
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  // 队伍键 → 标签 + 页面链接（相对站点根）
  var TEAM = {
    "juvenil-a":  { t: "U19 · Juvenil A",  u: "teams/juvenil-a.html#sec-roster" },
    "juvenil-b":  { t: "U18 · Juvenil B",  u: "teams/juvenil-b.html" },
    "cadete":     { t: "U16 · Cadete A",   u: "teams/cadete.html" },
    "cadete-b":   { t: "U15 · Cadete B",   u: "teams/cadete-b.html#roster-cadete-b" },
    "infantil":   { t: "U14 · Infantil A", u: "teams/infantil.html#roster-infantil" },
    "infantil-b": { t: "U13 · Infantil B", u: "teams/infantil-b.html#roster-infantil-b" },
    "alevin":     { t: "U12 · Alevín A",   u: "teams/seven-a-side.html#sec-roster-u12" },
    "u11a":       { t: "U11A · Alevín B",  u: "teams/seven-a-side.html#sec-roster-u11a" },
    "u11b":       { t: "U11B · Alevín C",  u: "teams/seven-a-side.html#sec-roster-u11b" },
    "u10a":       { t: "U10A · Benjamín A",u: "teams/seven-a-side.html#sec-roster-u10a" },
    "u10b":       { t: "U10B · Benjamín B",u: "teams/seven-a-side.html#sec-roster-u10b" },
    "u9a":        { t: "U9A · Benjamín C", u: "teams/seven-a-side.html#sec-roster-u9a" },
    "u9b":        { t: "U9B · Benjamín D", u: "teams/seven-a-side.html#sec-roster-u9b" }
  };

  var pool = [];   // { en, zh, pos, team, url }
  var seen = {};   // 按小写英文去重

  // 小写 + 去重音符 + 压缩（用于英文匹配）
  function norm(s) {
    return String(s || "").toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "");
  }

  function add(en, zh, pos, team, url, key) {
    var k = norm(en);
    if (k && seen[k]) {
      if (zh && !seen[k].zh) seen[k].zh = zh;   // 补上中文名（Sofascore 球员无中文）
      if (key && !seen[k].key) seen[k].key = key;   // 补上球员卡片键
      return;
    }
    var rec = { en: en || "", zh: zh || "", pos: pos || "", team: team, url: url, key: key || "" };
    if (k) seen[k] = rec;
    pool.push(rec);
  }

  // ── 1) data.js 官方名单（含中文名） ──────────────────────────
  var local = window.LAMASIA_DATA && window.LAMASIA_DATA.players;
  if (local) {
    Object.keys(TEAM).forEach(function (k) {
      var info = TEAM[k];
      (local[k] || []).forEach(function (p) {
        add(p.name, p.zh, p.pos, info.t, info.u, "local:" + k + ":" + norm(p.name));
      });
    });
  }

  // ── 2) B队（懂球帝，中文名 + 英文名） ────────────────────────
  var b = window.DQD_BARCA_ATLETIC;
  if (b && b.roster && b.roster.data && b.roster.data.list) {
    b.roster.data.list.forEach(function (g) {
      (g.data || []).forEach(function (p) {
        if (!p.person_name && !p.person_en_name) return;
        add(p.person_en_name || "", p.person_name || "", "", "预备队 · Barça Atlètic", "teams/barca-atletic.html#sec-roster", "b:" + (p.person_id || ""));
      });
    });
  }

  // ── 3) Sofascore 缓存（U19/U18/U16，补 data.js 没有的球员） ──
  [
    { c: window.DQD_U19_CACHE, t: "U19 · Juvenil A", u: "teams/juvenil-a.html#sec-roster", k: "u19" },
    { c: window.DQD_U18_CACHE, t: "U18 · Juvenil B", u: "teams/juvenil-b.html", k: "u18" },
    { c: window.DQD_U16_CACHE, t: "U16 · Cadete A",  u: "teams/cadete.html", k: "u16" }
  ].forEach(function (s) {
    if (!s.c || !s.c.players) return;
    s.c.players.forEach(function (p) {
      if (p.name) add(p.name, "", p.pos, s.t, s.u, "sf:" + s.k + ":" + p.id);
    });
  });

  // ── 渲染 ────────────────────────────────────────────────────
  var input = document.getElementById("search-input");
  var results = document.getElementById("search-results");
  var count = document.getElementById("search-count");
  if (!input || !results) return;

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function posZh(pos) {
    var m = { GK: "门将", DF: "后卫", MF: "中场", FW: "前锋" };
    return m[pos] || pos || "";
  }

  function run(q) {
    var raw = String(q || "").trim().toLowerCase();
    var stripped = norm(raw);

    if (!raw) {
      count.textContent = "";
      results.innerHTML = '<div class="match-list-empty">输入球员中文名或英文名开始搜索</div>';
      return;
    }

    var hits = pool.filter(function (r) {
      var zh = (r.zh || "").toLowerCase();
      var en = norm(r.en);
      if (zh && zh.indexOf(raw) !== -1) return true;        // 中文子串
      if (stripped && en && en.indexOf(stripped) !== -1) return true;   // 英文（忽略重音）子串；纯中文查询时 stripped 为空串，避免误匹配
      return false;
    });

    // 排序：开头匹配优先，其次按英文名
    hits.sort(function (a, b) {
      var az = (a.zh || "").toLowerCase().indexOf(raw) === 0 ? 0 : 1;
      var bz = (b.zh || "").toLowerCase().indexOf(raw) === 0 ? 0 : 1;
      if (az !== bz) return az - bz;
      var ae = stripped && norm(a.en).indexOf(stripped) === 0 ? 0 : 1;
      var be = stripped && norm(b.en).indexOf(stripped) === 0 ? 0 : 1;
      if (ae !== be) return ae - be;
      return (a.en || "").localeCompare(b.en || "");
    });

    count.textContent = hits.length ? hits.length + " 名球员" : "";
    if (!hits.length) {
      results.innerHTML = '<div class="match-list-empty">未找到匹配「' + esc(raw) + '」的球员，试试英文名或换一个写法。</div>';
      return;
    }

    results.innerHTML = hits.map(function (r) {
      return '<a class="search-hit" href="' + esc(r.url) + '"' + (r.key ? ' data-player-key="' + esc(r.key) + '"' : "") + '>' +
        '<span class="sh-name">' +
          '<span class="zh">' + esc(r.zh || r.en) + '</span>' +
          '<span class="en">' + esc(r.en) + '</span>' +
        '</span>' +
        '<span class="sh-pos">' + esc(posZh(r.pos)) + '</span>' +
        '<span class="sh-team">→ ' + esc(r.team) + '</span>' +
      '</a>';
    }).join("");
  }

  input.addEventListener("input", function () { run(input.value); });
  input.addEventListener("search", function () { run(input.value); });
  run("");

  // 支持 ?q= 参数预填（可分享/深链到搜索结果）
  (function () {
    var m = window.location.search.match(/[?&]q=([^&]+)/);
    if (m) {
      try { input.value = decodeURIComponent(m[1].replace(/\+/g, " ")); } catch (e) { }
      run(input.value);
    }
  })();
})();
