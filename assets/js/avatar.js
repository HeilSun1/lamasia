/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 头像统一出口
   ─────────────────────────────────────────────────────────────
   决策记录见 docs/decisions-avatars.md（D1–D5）。四个界面原本各写
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

  var DEFAULT_BASE = "../assets/img/players/";

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
  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "");
  }

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
    var up = /^\.\.\//.test(base) ? "../" : "";
    if (s.indexOf("assets/img/players/") === 0) return up + s;
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
    var base = p.base || DEFAULT_BASE;
    var out = [];
    var seen = {};

    function push(u) {
      var v = fixPath(u, base);
      if (!v || isPlaceholder(v) || seen[v]) return;
      seen[v] = 1;
      out.push(v);
    }

    if (window.ManualPhoto) {
      manualKeys(p).forEach(function (k) {
        try { push(window.ManualPhoto(k)); } catch (e) {}
      });
    }
    push(p.sf);
    push(p.photo);
    if (p.key && window.PlayerCard && window.PlayerCard.photosFor) {
      try {
        window.PlayerCard.photosFor(
          p.key,
          [p.en, p.zh, p.name].filter(Boolean),
          p.keys || []
        ).forEach(push);
      } catch (e) {}
    }
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

  window.AvatarChain = chain;
  window.AvatarHtml = html;
  window.AvatarInitial = initial;
  window.AV_IMG_FAIL = fail;
})();
