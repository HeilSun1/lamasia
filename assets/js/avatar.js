/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 头像统一出口
   ─────────────────────────────────────────────────────────────
   决策记录见 docs/decisions.md 的「头像」一节（D1–D9）。四个界面原本各写
   一套头像逻辑、各用一套「手动补图」键名，导致同一球员在不同页面
   显示不同的脸。这里只保留一套：

     1. 手动覆盖图（manual-photos.js，键 local:<梯队>:<拼音>）
     2. Sofascore 图（img.sofascore.com）
     3. 本地图（assets/img/players/…），懂球帝灰问号占位图视为「没有」
     4. 首字母圆底

   用法：
     window.AvatarHtml(player, { cls, iniCls, base, attrs, alt })
     window.AvatarChain(player)        → 候选地址数组（供自定义标记）
     window.AV_IMG_FAIL(img)           → onerror 逐张回退，全失败显示首字母
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* 懂球帝镜像里的灰底问号占位图：本站视为「没有照片」，让链路继续往下走。
     这 7 个文件内容完全相同（sha256 一致），名字来自懂球帝的 person_id。 */
  var PLACEHOLDER = {
    "50917373.png": 1,
    "51017488.png": 1,
    "51050111.png": 1,
    "51199202.png": 1,
    "51210430.png": 1,
    "51246092.png": 1,
    "51246752.png": 1
  };

  /* 站点根相对路径需要补几层 ../：梯队页在 teams/ 下，其余页面都在根目录。
     以前靠「base 里有没有 ../」猜，formation.html（根目录）传空 base 时就会算错。 */
  var UP = (function () {
    try { return /\/teams\//.test(location.pathname) ? "../" : ""; } catch (e) { return ""; }
  })();
  var DEFAULT_BASE = UP + "assets/img/players/";
  /* 同一个球员在缓存里出现过两个 Sofascore 编号，旧的那个 404（Álex González） */
  var SF_FIX = { "2604387": "2268815" };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function baseName(u) {
    return String(u || "").split("?")[0].split("#")[0].split("/").pop().toLowerCase();
  }

  function isPlaceholder(u) {
    return !!PLACEHOLDER[baseName(u)];
  }

  /* 与 roster.js / player-card.js 的 normKey 保持一致 */
  /* 归一规则见 assets/js/people.js（全站唯一一份） */
  var norm = window.People.norm;

  /* 首字母：中文取第一个汉字，英文取前两个词的首字母 */
  function initial(p) {
    p = p || {};
    var zh = String(p.zh || "").trim();
    var m = zh.match(/[\u4e00-\u9fa5]/);
    if (m) return m[0];
    var en = String(p.en || p.name || "").trim();
    m = en.match(/[\u4e00-\u9fa5]/);
    if (m) return m[0];
    var parts = en.split(/[\s.]+/).filter(Boolean).slice(0, 2);
    return parts.map(function (w) { return w[0].toUpperCase(); }).join("") || "·";
  }

  /* 路径归一化：缓存里存的是站点根相对路径（assets/img/players/dqd/x.jpg），
     而梯队页在 teams/ 下，需要补一层 ../。裸文件名走 base。 */
  function fixPath(u, base) {
    if (!u) return "";
    var s = String(u).trim();
    if (!s) return "";
    if (/^(data:|blob:|https?:)/i.test(s)) return s;
    if (s.indexOf("assets/img/players/") === 0) return UP + s;
    if (s.indexOf("assets/") === 0) return UP + s;
    return base + s.replace(/^\.\//, "").replace(/^\//, "");
  }

  /* 手动覆盖图的候选键：新键（local:<梯队>:<拼音>）优先，旧键做兼容，
     避免已经补好的照片失效。 */
  function manualKeys(p) {
    var out = [];
    var tier = p.tier || "";
    if (p.key) out.push(p.key);
    (p.keys || []).forEach(function (k) { if (k) out.push(k); });
    [p.name, p.en, p.zh].forEach(function (n) {
      if (n && tier) out.push("local:" + tier + ":" + norm(n));
    });
    if (p.id) {
      out.push("u19:" + p.id);
      out.push("barca:" + p.id);
      out.push("sf:" + p.id);
    }
    return out;
  }

  function chain(p) {
    p = p || {};
    /* 显式传 base:"" 表示「路径已经是相对站点根」，不要回落成默认前缀 */
    var base = (p.base === undefined || p.base === null) ? DEFAULT_BASE : p.base;
    var out = [];
    var seen = {};

    function push(u) {
      var s0 = u ? String(u) : "";
      for (var bad in SF_FIX) { if (s0.indexOf("/player/" + bad + "/image") !== -1) s0 = s0.replace("/player/" + bad + "/image", "/player/" + SF_FIX[bad] + "/image"); }
      var v = fixPath(s0, base);
      if (!v || isPlaceholder(v) || seen[v]) return;
      seen[v] = 1;
      out.push(v);
    }

    /* 顺序：Sofascore 优先；手动图只在没有 Sofascore 图、或该键被显式登记为
       「Sofascore 这张是错的」时才生效（MANUAL_OVERRIDE，见 manual-photos.js）。 */
    var overrideKeys = window.MANUAL_OVERRIDE || {};
    var mKeys = manualKeys(p);
    function pushManual(want) {
      if (!window.ManualPhoto) return;
      mKeys.forEach(function (k) {
        if (want && !want(k)) return;
        try { push(window.ManualPhoto(k)); } catch (e) {}
      });
    }
    pushManual(function (k) { return !!overrideKeys[k]; });
    push(p.sf);
    push(p.photo);
    push(window.AvatarSfByName(p.en || p.name || ""));
    if (p.key && window.PlayerCard && window.PlayerCard.photosFor) {
      try {
        window.PlayerCard.photosFor(
          p.key,
          [p.en, p.zh, p.name].filter(Boolean),
          p.keys || []
        ).forEach(push);
      } catch (e) {}
    }
    pushManual(null);
    push(p.img);
    push(p.local);
    push(p.person_logo);
    return out;
  }

  /* 图片加载失败：先试 data-alt 里的备选，全部失败后显示首字母 */
  function fail(img) {
    if (!img) return;
    var rest = String(img.getAttribute("data-alt") || "").split("|").filter(Boolean);
    if (rest.length) {
      img.setAttribute("data-alt", rest.slice(1).join("|"));
      img.src = rest[0];
      return;
    }
    img.style.display = "none";
    var ini = img.parentNode && img.parentNode.querySelector("[data-av-ini]");
    if (ini) ini.style.display = "grid";
  }

  function html(p, opt) {
    opt = opt || {};
    var cls = opt.cls || "pl-avatar";
    var iniCls = opt.iniCls || "pl-init";
    var list = chain(p);
    var ini = esc(initial(p));
    var alt = esc(opt.alt || p.zh || p.en || p.name || "");
    var extra = opt.attrs ? " " + opt.attrs : "";
    var img = list.length
      ? '<img src="' + esc(list[0]) + '" alt="' + alt + '"' +
        ' data-alt="' + esc(list.slice(1).join("|")) + '"' +
        ' loading="lazy" referrerpolicy="no-referrer"' +
        ' onerror="window.AV_IMG_FAIL(this)"' + extra + ">"
      : "";
    return '<span class="' + cls + '">' + img +
      '<span class="' + iniCls + '" data-av-ini="1" style="' +
      (img ? "display:none" : "display:grid") + '">' + ini + "</span></span>";
  }

  /* Sofascore 照片按姓名索引：名单页 / 球探卡 / 排兵布阵各自手里只有名字，
     统一在这里查一次，保证同一名球员在任何界面都拿到同一张 Sofascore 图。 */
  /* data.js 里写简称、Sofascore 缓存里写全名，归一化后仍不同名 → 显式别名。
     只登记「同一 Sofascore 编号已经在 data.js 里」的对应关系，不靠相似度猜。 */
  var SF_ALIAS = {
    alexwalton: "alexanderwalton",
    nilvicens: "nilvicensponsati",
    erikdominguez: "erikdominguezmartos",
    danyfreire: "danielfreire"
  };
  var SF_INDEX = null;
  function sfPhotos(items) {
    (items || []).forEach(function (p) {
      if (!p) return;
      var name = p.name || p.person_name || "";
      var photo = p.photo || p.person_logo || "";
      var k = norm(name);
      if (k && photo && !SF_INDEX[k]) SF_INDEX[k] = photo;
    });
  }
  function sfIndex() {
    if (SF_INDEX) return SF_INDEX;
    SF_INDEX = {};
    sfPhotos((window.DQD_U19_CACHE || {}).players);
    sfPhotos((window.DQD_U18_CACHE || {}).players);
    sfPhotos((window.DQD_U16_CACHE || {}).players);
    sfPhotos((window.DQD_BARCA_ATLETIC_SF_CACHE || {}).players);
    try {
      var b = window.DQD_BARCA_ATLETIC;
      var list = b && b.roster && b.roster.data && b.roster.data.list;
      if (list) list.forEach(function (g) { sfPhotos(g && g.data); });
    } catch (e) { /* 缓存没加载就算了 */ }
    return SF_INDEX;
  }
  window.AvatarSfByName = function (name) {
    var k = norm(name);
    if (!k) return "";
    var idx = sfIndex();
    if (idx[k]) return idx[k];
    var alias = SF_ALIAS[k];
    if (alias && idx[alias]) return idx[alias];
    /* 缓存里常见全名/简称不一致（Erik Domínguez vs Erik Domínguez Martos），
       用包含关系兜底：只有一个候选时才采用，避免张冠李戴。 */
    if (k.length < 8) return "";
    var hit = "", dup = false;
    for (var key in idx) {
      if (!Object.prototype.hasOwnProperty.call(idx, key)) continue;
      if (key.indexOf(k) === 0 || k.indexOf(key) === 0) {
        if (hit && hit !== idx[key]) { dup = true; break; }
        hit = idx[key];
      }
    }
    return dup ? "" : hit;
  };
  window.AvatarChain = chain;
  window.AvatarHtml = html;
  window.AvatarInitial = initial;
  window.AV_IMG_FAIL = fail;
})();
