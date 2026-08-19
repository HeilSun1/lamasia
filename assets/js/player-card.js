/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 球员卡片弹窗
   ─────────────────────────────────────────────────────────────
   点击带 data-player-key 的球员名字 → 弹出球员卡片。
   数据源（都在本站缓存里，客户端索引，零新请求）：
     · data.js（LAMASIA_DATA.players）—— 低龄梯队官方名单
     · dqd-barca-atletic-cache.js（B队，懂球帝，bio 含惯用脚/生日/身高/体重/合同）
     · dqd-u19/u18/u16-cache.js（Sofascore，foot/height/birthday）
   卡片字段"有才显示"：照片 / 姓名 / 国籍 / 生日 / 位置 / 惯用脚 / 身高 / 体重 / 合同。
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  // 站点根目录相对偏移（teams/ 子页需加 ../）
  var BASE = /\/teams\//.test(window.location.pathname) ? "../" : "";

  // 小写 + 去重音 + 压缩（用于英文匹配 / 索引键）
  function norm(s) {
    return String(s || "").toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "");
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  // 位置 → 中文（兼容 Sofascore 单字母 / 懂球帝英文类型）
  function posZh(pos) {
    var m = {
      GK: "门将", G: "门将", goalkeeper: "门将",
      DF: "后卫", D: "后卫", defender: "后卫",
      MF: "中场", M: "中场", midfielder: "中场",
      FW: "前锋", F: "前锋", attacker: "前锋"
    };
    return m[pos] || pos || "";
  }
  function teamLabel(tier) {
    var m = {
      b: "预备队 · Barça Atlètic",
      u19: "U19 · Juvenil A", u18: "U18 · Juvenil B", u16: "U16 · Cadete A",
      "juvenil-a": "U19 · Juvenil A", "juvenil-b": "U18 · Juvenil B", cadete: "U16 · Cadete A",
      "cadete-b": "U15 · Cadete B", infantil: "U14 · Infantil A", "infantil-b": "U13 · Infantil B",
      alevin: "U12 · Alevín A", u11a: "U11A · Alevín B", u11b: "U11B · Alevín C",
      u10a: "U10A · Benjamín A", u10b: "U10B · Benjamín B", u9a: "U9A · Benjamín C", u9b: "U9B · Benjamín D"
    };
    return m[tier] || tier || "";
  }
  function teamHref(tier) {
    var m = {
      b: "teams/barca-atletic.html#sec-roster",
      u19: "teams/juvenil-a.html#sec-roster", u18: "teams/juvenil-b.html", u16: "teams/cadete.html",
      "cadete-b": "teams/cadete-b.html#roster-cadete-b", infantil: "teams/infantil.html#roster-infantil",
      "infantil-b": "teams/infantil-b.html#roster-infantil-b", alevin: "teams/seven-a-side.html#sec-roster-u12",
      u11a: "teams/seven-a-side.html#sec-roster-u11a", u11b: "teams/seven-a-side.html#sec-roster-u11b",
      u10a: "teams/seven-a-side.html#sec-roster-u10a", u10b: "teams/seven-a-side.html#sec-roster-u10b",
      u9a: "teams/seven-a-side.html#sec-roster-u9a", u9b: "teams/seven-a-side.html#sec-roster-u9b"
    };
    return m[tier] ? BASE + m[tier] : "";
  }
  // 照片：本地相对路径补站点根前缀，外链（Sofascore CDN）直接用
  function photoUrl(src) {
    if (!src) return "";
    if (/^https?:\/\//.test(src)) return src;
    return BASE + src.replace(/^\.\.\//, "");
  }
  // 手动补照片（manual-photos-hook.js 的 ManualPhoto，键形如 barca:50924320 / u19:123）
  function manualPhoto(key) {
    if (!window.ManualPhoto || !key) return "";
    return photoUrl(window.ManualPhoto(key));
  }

  var INDEX = {};   // key -> 球员卡片记录
  var built = false;
  function add(key, rec) { if (key && rec) INDEX[key] = rec; }

  // 索引延迟构建：player-card.js 在 data.js 之后、各梯队缓存之前加载，
  // 必须等所有脚本就绪（DOMContentLoaded）后再合并，否则缓存未定义导致索引为空。
  function buildIndex() {
    if (built) return;
    built = true;

  /* ── 1) B队（懂球帝）：roster + bio（惯用脚/生日/国籍/身高/体重/合同） ── */
  var b = window.DQD_BARCA_ATLETIC;
  if (b && b.roster && b.roster.data && b.roster.data.list) {
    var bios = b.bio || {};
    b.roster.data.list.forEach(function (g) {
      (g.data || []).forEach(function (p) {
        var id = String(p.person_id || "");
        if (!id) return;
        var type = String(p.type || "");
        if (/^(成立时间|所在地区|球队主场)$/.test(type)) return;   // 俱乐部信息记录，非人，跳过
        var bio = bios[id] || {};
        var isStaff = !/^(attacker|defender|midfielder|goalkeeper)$/.test(type);   // 教练/工作人员
        add("b:" + id, {
          tier: "b",
          photo: manualPhoto("barca:" + id) || photoUrl(p.person_logo),
          nameZh: p.person_name || "",
          nameEn: p.person_en_name || "",
          nation: bio.nation || p.nationality_name || "",
          birth: bio.birth || "",
          pos: type,
          posZh: isStaff ? "教练" : posZh(type),
          foot: bio.foot || "",
          height: bio.height || "",
          weight: bio.weight || "",
          contract: bio.contract || "",
          team: teamLabel("b"),
          teamHref: teamHref("b"),
          note: ""
        });
      });
    });
  }

  /* ── 2) Sofascore 三队（U19/U18/U16）：foot/height/birthday + data.js 中文名补全 ── */
  [
    { k: "u19", c: window.DQD_U19_CACHE, dt: "juvenil-a" },
    { k: "u18", c: window.DQD_U18_CACHE, dt: "juvenil-b" },
    { k: "u16", c: window.DQD_U16_CACHE, dt: "cadete" }
  ].forEach(function (s) {
    if (!s.c || !s.c.players) return;
    var zhMap = null;
    if (window.LAMASIA_DATA && LAMASIA_DATA.players && LAMASIA_DATA.players[s.dt]) {
      zhMap = {};
      LAMASIA_DATA.players[s.dt].forEach(function (lp) { zhMap[norm(lp.name)] = lp; });
    }
    s.c.players.forEach(function (p) {
      if (!p || !p.id) return;
      var local = zhMap ? zhMap[norm(p.name)] : null;
      add("sf:" + s.k + ":" + p.id, {
        tier: s.k,
        photo: manualPhoto(s.k + ":" + p.id) || photoUrl(p.photo),
        nameZh: (local && local.zh) || "",
        nameEn: p.name || "",
        nation: p.nation || "",
        birth: p.birthday || "",
        age: p.age || "",
        pos: p.pos || "",
        posZh: posZh(p.pos),
        foot: p.foot || "",
        height: p.height || "",
        shirt: p.shirt || "",
        value: p.value || "",
        injury: p.injury || null,
        note: (local && local.note) || "",
        team: teamLabel(s.k),
        teamHref: teamHref(s.k)
      });
    });
  });

  /* ── 3) data.js 低龄梯队官方名单 ── */
  if (window.LAMASIA_DATA && LAMASIA_DATA.players) {
    Object.keys(LAMASIA_DATA.players).forEach(function (tier) {
      LAMASIA_DATA.players[tier].forEach(function (p) {
        if (!p.name) return;
        add("local:" + tier + ":" + norm(p.name), {
          tier: tier,
          photo: photoUrl(p.img ? "assets/img/players/" + p.img : ""),
          nameZh: p.zh || "",
          nameEn: p.name || "",
          nation: p.nation || "",
          birth: p.dob || "",
          pos: p.pos || "",
          posZh: posZh(p.pos),
          shirt: p.num || "",
          note: p.note || "",
          imgCredit: p.imgCredit || "",
          imgUrl: p.imgUrl || "",
          team: teamLabel(tier),
          teamHref: teamHref(tier)
        });
      });
    });
  }
  }   // buildIndex 结束

  // 所有缓存脚本就绪后构建索引（player-card.js 加载早于各梯队缓存）
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildIndex);
  } else {
    buildIndex();
  }

  /* ── 卡片弹窗 ─────────────────────────────────────────────── */
  function ensureModal() {
    if (document.getElementById("pc-mask")) return;
    var mask = document.createElement("div");
    mask.id = "pc-mask";
    mask.className = "pc-mask";
    mask.setAttribute("hidden", "");
    mask.innerHTML =
      '<div class="pc-card" role="dialog" aria-modal="true" aria-label="球员卡片">' +
        '<button class="pc-close" title="关闭">✕</button>' +
        '<div class="pc-head">' +
          '<span class="pc-avatar" id="pc-avatar"></span>' +
          '<div class="pc-name">' +
            '<div class="pc-zh" id="pc-zh"></div>' +
            '<div class="pc-en" id="pc-en"></div>' +
          "</div>" +
          '<span class="pc-team" id="pc-team"></span>' +
        "</div>" +
        '<div class="pc-grid" id="pc-grid"></div>' +
        '<div class="pc-foot" id="pc-foot"></div>' +
      "</div>";
    document.body.appendChild(mask);
    mask.addEventListener("click", function (e) {
      if (e.target === mask || (e.target.closest && e.target.closest(".pc-close"))) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  function initials(name) {
    return name.split(/[\s.]+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join("");
  }

  function renderCard(r) {
    var ini = initials(r.nameEn || r.nameZh || "?");
    document.getElementById("pc-avatar").innerHTML = r.photo
      ? '<img src="' + esc(r.photo) + '" alt="' + esc(r.nameZh || r.nameEn) + '" data-zh="' + esc(r.nameZh || r.nameEn) + '" title="点击查看大图" loading="lazy" referrerpolicy="no-referrer" ' +
        'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">' +
        '<span class="pc-init" style="display:none">' + esc(ini) + "</span>"
      : '<span class="pc-init">' + esc(ini) + "</span>";
    document.getElementById("pc-zh").textContent = r.nameZh || r.nameEn;
    document.getElementById("pc-en").textContent = r.nameEn || "";
    document.getElementById("pc-team").textContent = r.team;

    // 信息网格：有才显示
    var rows = [];
    function pair(label, val, cls) {
      return val ? '<div class="pc-pair' + (cls ? " " + cls : "") + '"><span class="pc-k">' + label + '</span><span class="pc-v">' + esc(val) + "</span></div>" : "";
    }
    rows.push(pair("国籍", r.nation));
    rows.push(pair("位置", r.posZh));
    rows.push(pair("生日", r.birth));
    if (!r.birth && r.age) rows.push(pair("年龄", r.age));
    rows.push(pair("惯用脚", r.foot));
    rows.push(pair("身高", r.height ? r.height + " cm" : ""));
    rows.push(pair("体重", r.weight ? r.weight + " kg" : ""));
    rows.push(pair("合同至", r.contract));
    rows.push(pair("号码", r.shirt));
    if (r.value) rows.push(pair("身价", r.value));
    rows.push(pair("备注", r.note, "full"));
    document.getElementById("pc-grid").innerHTML = rows.join("");

    var foot = document.getElementById("pc-foot");
    var links = [];
    if (r.teamHref) links.push('<a href="' + esc(r.teamHref) + '">查看 ' + esc(r.team) + " →</a>");
    if (r.imgUrl) links.push('<a href="' + esc(r.imgUrl) + '" target="_blank" rel="noopener">照片来源' + (r.imgCredit ? "（" + esc(r.imgCredit) + "）" : "") + " →</a>");
    foot.innerHTML = links.join("");
  }

  function open(key) {
    buildIndex();   // 兜底：确保索引已构建
    var r = INDEX[key];
    if (!r) return;
    ensureModal();
    renderCard(r);
    document.getElementById("pc-mask").hidden = false;
    document.body.style.overflow = "hidden";
  }
  function close() {
    var m = document.getElementById("pc-mask");
    if (m) m.hidden = true;
    document.body.style.overflow = "";
  }

  // 委托点击：任意 data-player-key 元素 → 弹卡
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-player-key]") : null;
    if (!t) return;
    var key = t.getAttribute("data-player-key");
    if (!key) return;
    e.preventDefault();
    open(key);
  });

  /* ── 卡片照片点击 → 放大（复用站点 .lightbox 样式） ── */
  var lbEl = null;
  function cardLightbox(img) {
    if (!img || !img.src) return;
    if (!lbEl) {
      lbEl = document.createElement("div");
      lbEl.className = "lightbox";
      lbEl.innerHTML =
        '<div class="lightbox-inner">' +
        '<button class="lightbox-close" title="关闭">✕</button>' +
        '<img alt="">' +
        '<div class="lightbox-caption"></div>' +
        "</div>";
      document.body.appendChild(lbEl);
      lbEl.addEventListener("click", function (e) {
        if (e.target === lbEl || (e.target.classList && e.target.classList.contains("lightbox-close"))) {
          lbEl.classList.remove("open");
          document.body.style.overflow = "";
        }
      });
    }
    var zh = img.getAttribute("data-zh") || "";
    var credit = /img\.sofascore\.com/.test(img.src) ? "Sofascore" : "";
    lbEl.querySelector("img").src = img.src;
    lbEl.querySelector(".lightbox-caption").innerHTML = esc(zh) + (credit ? " · " + esc(credit) : "");
    lbEl.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  document.addEventListener("click", function (e) {
    var img = e.target && e.target.closest ? e.target.closest(".pc-avatar img") : null;
    if (!img) return;
    e.preventDefault();
    e.stopPropagation();
    cardLightbox(img);
  });

  window.PC_NORM = norm;
  window.PlayerCard = { open: open, close: close, findByKey: function (k) { buildIndex(); return INDEX[k] || null; } };
})();
