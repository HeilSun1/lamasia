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
  // 名字拆词（去重音后按非字母切分），用于昵称/全名差异的桥接匹配
  function nameTokens(s) {
    var t = String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z]+/);
    var out = [];
    for (var i = 0; i < t.length; i++) if (t[i].length >= 3) out.push(t[i]);
    return out;
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
  // 中文名匹配：先精确，再近似（包含/被包含；短名≥8位才近似，防误配）
  function findZh(name, zhMap) {
    var k = norm(name);
    if (!k || !zhMap) return null;
    if (zhMap[k]) return zhMap[k];
    var hit = null;
    Object.keys(zhMap).forEach(function (ek) {
      if (ek === k) return;
      var a = ek, b = k;
      if (a.length < 8 || b.length < 8) return;   // 太短易误配
      if (a.indexOf(b) > -1 || b.indexOf(a) > -1) { if (!hit) hit = zhMap[ek]; }
    });
    return hit;
  }

  var INDEX = {};   // key -> 球员卡片记录
  var built = false;
  var curKey = "";  // 当前打开的卡片键（个人集锦查询用）
  var dqdToSf = {}; // B队 懂球帝 person_id → Sofascore id（名单页键 b:，视频键 sf:b:）
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
    // 中文名用全部 data.js 梯队匹配（2026-27 阵容调整，同一球员可能在 data.js 里登记在别的梯队）
    var zhMap = null;
    if (window.LAMASIA_DATA && LAMASIA_DATA.players) {
      zhMap = {};
      Object.keys(LAMASIA_DATA.players).forEach(function (t) {
        LAMASIA_DATA.players[t].forEach(function (lp) {
          var lk = norm(lp.name);
          if (lk && !zhMap[lk]) zhMap[lk] = lp;
        });
      });
    }
    s.c.players.forEach(function (p) {
      if (!p || !p.id) return;
      var local = findZh(p.name, zhMap);
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

  /* ── 2b) B队（Sofascore）：sf:b: 卡片，中文名从懂球帝名单按英文名匹配 ── */
  var sfb = window.DQD_BARCA_ATLETIC_SF_CACHE;
  if (sfb && sfb.players) {
    var bzhMap = null;
    if (window.DQD_BARCA_ATLETIC && window.DQD_BARCA_ATLETIC.roster && window.DQD_BARCA_ATLETIC.roster.data) {
      bzhMap = {};
      var dqdByNorm = {};
      var dqdRaw = [];   // {id, tokens}，供词元重叠匹配
      window.DQD_BARCA_ATLETIC.roster.data.list.forEach(function (g) {
        (g.data || []).forEach(function (pp) {
          var en = String(pp.person_en_name || "").trim();
          var n = norm(en);
          if (en) bzhMap[n] = { zh: pp.person_name || "" };
          if (en && !dqdByNorm[n]) dqdByNorm[n] = String(pp.person_id);
          if (en) dqdRaw.push({ id: String(pp.person_id), tokens: nameTokens(en) });
        });
      });
      // 名单页卡片键是 b:{懂球帝id}，视频键是 sf:b:{Sofascore id}：
      // ① 精确匹配 ② 子串包含且唯一 ③ 词元重叠且唯一（覆盖 Aziz Issah↔Abdul Aziz Issah、Alex↔Alexander Walton 等）
      sfb.players.forEach(function (p) {
        var en = norm(String(p.name || ""));
        if (!en) return;
        var dq = dqdByNorm[en];
        if (!dq) {
          var hits = [];
          Object.keys(dqdByNorm).forEach(function (k) {
            if (k.length < 4) return;                       // 太短易误配
            if (en.indexOf(k) > -1 || k.indexOf(en) > -1) hits.push(dqdByNorm[k]);
          });
          var uniq = [];
          hits.forEach(function (h) { if (uniq.indexOf(h) === -1) uniq.push(h); });
          if (uniq.length === 1) dq = uniq[0];              // 必须唯一，歧义不桥接
        }
        if (!dq) {
          var st = nameTokens(p.name);
          var cands = [];
          dqdRaw.forEach(function (dr) {
            for (var i = 0; i < dr.tokens.length; i++) {
              if (dr.tokens[i].length >= 5 && st.indexOf(dr.tokens[i]) > -1) { cands.push(dr.id); break; }
            }
          });
          var uc = [];
          cands.forEach(function (c) { if (uc.indexOf(c) === -1) uc.push(c); });
          if (uc.length === 1) dq = uc[0];                  // 唯一才桥接
        }
        if (dq) dqdToSf[dq] = String(p.id);
      });
    }
    sfb.players.forEach(function (p) {
      if (!p || !p.id) return;
      var local = findZh(p.name, bzhMap);
      add("sf:b:" + p.id, {
        tier: "b",
        photo: photoUrl(p.photo),
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
        team: teamLabel("b"),
        teamHref: teamHref("b")
      });
    });
  }

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
        '<div class="pc-tabs">' +
          '<button type="button" class="pc-tab active" data-pc-tab="info">📋 资料</button>' +
          '<button type="button" class="pc-tab" data-pc-tab="videos">🎥 集锦</button>' +
        "</div>" +
        '<div class="pc-page active" data-pc-page="info"><div class="pc-grid" id="pc-grid"></div></div>' +
        '<div class="pc-page" data-pc-page="videos"><div class="pc-videos" id="pc-videos"></div></div>' +
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
    // 无中文名时只显示一次英文（大字），避免重复
    document.getElementById("pc-zh").textContent = r.nameZh || r.nameEn;
    document.getElementById("pc-en").textContent = r.nameZh ? (r.nameEn || "") : "";
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

    // 🎥 个人集锦：第二页，按该球员参加过的比赛分类（异步加载详情缓存）
    var vKey = videoKeyFor(curKey);
    var vTab = document.querySelector('[data-pc-tab="videos"]');
    var vCount = (window.VideosUI && vKey) ? videoCountFor(vKey) : 0;
    if (vTab) vTab.textContent = "🎥 集锦" + (vCount ? " (" + vCount + ")" : "");
    switchTab("info");   // 每次打开回到资料页
    var videosEl = document.getElementById("pc-videos");
    if (videosEl) {
      if (window.VideosUI && vKey) {
        videosEl.innerHTML = '<div class="pc-vid-loading">正在加载集锦分类…</div>';
        matchVideosHtml(vKey, function (html) {
          videosEl.innerHTML = html || '<div class="pc-vid-none">暂无个人集锦</div>';
        });
      } else {
        videosEl.innerHTML = "";
      }
    }

    var foot = document.getElementById("pc-foot");
    var links = [];
    if (r.teamHref) links.push('<a href="' + esc(r.teamHref) + '">查看 ' + esc(r.team) + " →</a>");
    if (r.imgUrl) links.push('<a href="' + esc(r.imgUrl) + '" target="_blank" rel="noopener">照片来源' + (r.imgCredit ? "（" + esc(r.imgCredit) + "）" : "") + " →</a>");
    foot.innerHTML = links.join("");
  }

  /* ═══ 个人集锦 · 第二页：按该球员参加过的比赛分类 ═══
     通过各梯队"赛程 + 详情缓存里的阵容"确定球员参加过哪些比赛，
     每场取其 ±14 天内发布的个人集锦成组；不在已知赛程里的归入"其他"。 */
  var TIER_CFG = {
    b:   { cache: "DQD_BARCA_ATLETIC_SF_CACHE", details: "DQD_BARCA_ATLETIC_SF_DETAILS_CACHE", file: "dqd-barca-atletic-sf-details-cache.js" },
    u19: { cache: "DQD_U19_CACHE", details: "DQD_U19_DETAILS_CACHE", file: "dqd-u19-details-cache.js" },
    u18: { cache: "DQD_U18_CACHE", details: "DQD_U18_DETAILS_CACHE", file: "dqd-u18-details-cache.js" },
    u16: { cache: "DQD_U16_CACHE", details: "DQD_U16_DETAILS_CACHE", file: "dqd-u16-details-cache.js" }
  };
  var SF_CACHES = { b: window.DQD_BARCA_ATLETIC_SF_CACHE, u19: window.DQD_U19_CACHE, u18: window.DQD_U18_CACHE, u16: window.DQD_U16_CACHE };

  /* 比赛时间 → "MM-DD"（北京时间，与赛程显示一致） */
  function fmtMd(ts) {
    var d = new Date(parseInt(ts, 10) * 1000 + 8 * 3600 * 1000);
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    return pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  }
  function matchLabel(mt) {
    var sc = (mt.hs != null && mt.as != null) ? " " + esc(mt.hs) + ":" + esc(mt.as) : "";
    return (mt.comp ? mt.comp + " · " : "") + fmtMd(mt.start) + " · " +
      (mt.home || "") + sc + " " + (mt.away || "");
  }

  /* 该球员涉及哪些 Sofascore 梯队：在名单里 或 有按该梯队键挂的视频（如 U18 比赛误挂、手动转挂）
     决定查哪几个梯队的数据。 */
  function playerTiers(curTier, id) {
    var tiers = [curTier];
    Object.keys(SF_CACHES).forEach(function (t) {
      if (t === curTier) return;
      var c = SF_CACHES[t];
      var inRoster = !!(c && c.players && c.players.some(function (p) { return String(p.id) === String(id); }));
      var hasVids = !!(window.VideosUI && window.VideosUI.resolve("players", "sf:" + t + ":" + id).length);
      if (inRoster || hasVids) tiers.push(t);
    });
    return tiers;
  }

  /* 懒加载某梯队详情缓存（脚本注入，与 match-detail.js 同机制），返回 Promise<object|null> */
  function loadTierDetails(tier) {
    var cfg = TIER_CFG[tier];
    if (!cfg) return Promise.resolve(null);
    if (window[cfg.details]) return Promise.resolve(window[cfg.details]);
    return new Promise(function (resolve) {
      var s = document.createElement("script");
      s.src = BASE + "assets/js/" + cfg.file;
      s.onload = function () { resolve(window[cfg.details] || null); };
      s.onerror = function () { resolve(null); };
      document.head.appendChild(s);
    });
  }

  /* 某梯队内：球员参加过的比赛分组 + 未匹配视频。
     每条视频只归到一场比赛（取发布日 ±14 天内最近的比赛），避免一条视频被多场比赛重复显示。 */
  function tierMatchGroups(tier, id, det) {
    var cfg = TIER_CFG[tier];
    var sched = window[cfg.cache];
    var matches = (sched && Array.isArray(sched.matches)) ? sched.matches : [];
    var all = window.VideosUI.resolve("players", "sf:" + tier + ":" + id);

    // ① 该球员参加过的比赛（详情缓存阵容里出现过）
    var played = [];
    matches.forEach(function (mt) {
      if (!mt || mt.id == null) return;
      var startMs = parseInt(mt.start, 10) * 1000;
      if (!startMs) return;
      var lu = (det && det[mt.id] && det[mt.id].lineups) || null;
      if (!lu) return;
      var ps = [];
      [lu.home, lu.away].forEach(function (side) { if (side && Array.isArray(side.players)) ps = ps.concat(side.players); });
      var inLineup = ps.some(function (x) { return x && x.player && String(x.player.id) === String(id); });
      if (inLineup) played.push({ start: startMs, match: mt });
    });

    // ② 每条视频 → 归属最近的一场比赛（±14 天内取最小间隔；不在任何窗口内 → 未匹配）
    var assign = {}, unmatched = [];
    all.forEach(function (v) {
      var vd = Date.parse(v.published + "T00:00:00Z");
      if (!vd) { unmatched.push(v); return; }
      var best = null, bestDiff = Infinity;
      played.forEach(function (pm) {
        var diff = Math.abs(pm.start - vd);
        if (diff <= 14 * 864e5 && diff < bestDiff) { bestDiff = diff; best = pm; }
      });
      if (best) assign[v.videoId] = best;
      else unmatched.push(v);
    });

    // ③ 按比赛分组
    var groups = [];
    played.forEach(function (pm) {
      var list = all.filter(function (v) { return assign[v.videoId] === pm; });
      if (!list.length) return;
      groups.push({ start: pm.match.start, label: matchLabel(pm.match), list: list });
    });
    return { groups: groups, unmatched: unmatched };
  }

  /* B队名单键 b:{懂球帝id} → 视频用的 sf:b:{Sofascore id}（名单页点开的卡片能读到集锦） */
  function videoKeyFor(key) {
    var m = /^b:(\d+)$/.exec(key);
    if (m && dqdToSf[m[1]]) return "sf:b:" + dqdToSf[m[1]];
    return key;
  }

  /* 该球员集锦总数（页签角标，同步可算） */
  function videoCountFor(key) {
    if (!window.VideosUI || !key) return 0;
    var m = /^sf:([a-z0-9]+):(\d+)$/.exec(key);
    if (!m) return window.VideosUI.resolve("players", key).length;
    var id = m[2];
    return playerTiers(m[1], id).reduce(function (n, t) {
      return n + window.VideosUI.resolve("players", "sf:" + t + ":" + id).length;
    }, 0);
  }

  /* 组装第二页 HTML（异步：需先加载各梯队详情缓存） */
  function matchVideosHtml(key, done) {
    var m = /^sf:([a-z0-9]+):(\d+)$/.exec(key);
    if (!m) {
      var solo = window.VideosUI.resolve("players", key);
      done(solo.length ? window.VideosUI.groupHtml(solo, "🎥 个人集锦") : "");
      return;
    }
    var id = m[2];
    var tiers = playerTiers(m[1], id);
    Promise.all(tiers.map(loadTierDetails)).then(function (dets) {
      var groups = [], unmatched = [];
      tiers.forEach(function (t, i) {
        var res = tierMatchGroups(t, id, dets[i]);
        groups = groups.concat(res.groups);
        unmatched = unmatched.concat(res.unmatched);
      });
      var seen = {}, du = [];
      unmatched.forEach(function (v) { if (!seen[v.videoId]) { seen[v.videoId] = true; du.push(v); } });
      groups.sort(function (a, b) { return parseInt(b.start, 10) - parseInt(a.start, 10); });
      if (!groups.length && !du.length) { done(""); return; }
      var html = "";
      groups.forEach(function (g) {
        html += '<div class="pc-mv-match"><div class="pc-mv-title">⚽ ' + g.label + "</div>" +
          '<div class="vid-grid">' + g.list.map(window.VideosUI.videoCardHtml).join("") + "</div></div>";
      });
      if (du.length) {
        html += '<div class="pc-mv-match"><div class="pc-mv-title">' +
          (groups.length ? "📹 其他 / 未匹配到赛程" : "🎥 个人集锦") + "</div>" +
          '<div class="vid-grid">' + du.map(window.VideosUI.videoCardHtml).join("") + "</div></div>";
      }
      done(html);
    }).catch(function () { done(""); });
  }

  /* 卡片页签切换（资料 / 集锦） */
  function switchTab(name) {
    var mask = document.getElementById("pc-mask");
    if (!mask) return;
    Array.prototype.forEach.call(mask.querySelectorAll(".pc-tab"), function (t) {
      t.classList.toggle("active", t.getAttribute("data-pc-tab") === name);
    });
    Array.prototype.forEach.call(mask.querySelectorAll(".pc-page"), function (p) {
      p.classList.toggle("active", p.getAttribute("data-pc-page") === name);
    });
  }

  function open(key) {
    buildIndex();   // 兜底：确保索引已构建
    var r = INDEX[key];
    if (!r) return;
    curKey = key;
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

  // 卡片页签切换（资料 / 集锦）
  document.addEventListener("click", function (e) {
    var tab = e.target && e.target.closest ? e.target.closest("[data-pc-tab]") : null;
    if (!tab) return;
    switchTab(tab.getAttribute("data-pc-tab"));
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
  window.PlayerCard = { open: open, close: close, findByKey: function (k) { buildIndex(); return INDEX[k] || null; }, INDEX: INDEX };
})();
