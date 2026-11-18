/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 排兵布阵（竖式阵型搭建器）
   ─────────────────────────────────────────────────────────────
   功能：
     1. 聚合全部梯队球员为统一球员池（本地名单 + Sofascore 每日缓存 + 懂球帝 B 队）
     2. 竖式球场（本方球门在底部），支持多种阵型切换
     3. 点击球员 → 点击槽位放置；亦可拖拽放置 / 拖动场上球员换位
     4. 随机首发、清空、复制首发文本；localStorage 自动保存
   依赖：data.js（LAMASIA_DATA）+ dqd-barca-atletic-cache.js + dqd-u19/u18/u16-cache.js
         manual-photos-hook.js（可选：手动补的照片，见 photoFor）
   仅用于 formation.html
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* 姓名归一化（去变音符、统一小写）用于跨数据源去重 */
  /* 归一规则见 assets/js/people.js（全站唯一一份） */
  var normKey = window.People.norm;

  /* 头像占位首字母：中文取前两字，西文取前两个词首字母 */
  function initials(name) {
    name = String(name || "");
    if (/[一-鿿]/.test(name)) return name.slice(0, 2);
    return name.split(/[\s.]+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join("") || "·";
  }

  const POS_ZH = { GK: "门将", DF: "后卫", MF: "中场", FW: "前锋" };
  const POS_CLASS = { GK: "gk", DF: "df", MF: "mf", FW: "fw" };

  /* ─────────────────────────────────────────────
     一、聚合所有梯队球员
     ───────────────────────────────────────────── */
  const nationZh = (window.LAMASIA_DATA && window.LAMASIA_DATA.nationZh) || {};
  function nation(en) { return nationZh[en] || en || ""; }

  const pool = {};       // 归一化英文名 -> 球员
  const aliasMap = {};   // 别名（Sofascore 常用昵称）-> 主名

  function addPlayer(p, forceKey) {
    const k = forceKey || normKey(p.en || "");
    if (!k) return;
    if (!pool[k]) {
      pool[k] = {
        key: k, en: p.en || "", zh: p.zh || "", pos: p.pos || "", team: p.team || "",
        nation: p.nation || "", age: p.age || "", value: p.value || "", note: p.note || "",
        img: p.img || "", sf: (p.src === "sofascore" ? (p.img || "") : ""), src: p.src || "",
        live: (p.src === "sofascore" || p.src === "barca-atletic"),
        mkeys: p.mkey ? [p.mkey] : []     // 各数据源对应的手动照片键（见 photoFor）
      };
    } else {
      const e = pool[k];
      if (!e.zh && p.zh) e.zh = p.zh;
      if (!e.img && p.img) e.img = p.img;
      if (p.src === "sofascore" && p.img && !e.sf) e.sf = p.img;
      if (p.src === "sofascore" || p.src === "barca-atletic") {
        e.live = true;
        /* 只有「升入预备队」改队伍标签：那是有明确名单依据的升队。
           Sofascore 会把人同时挂在两个梯队（跨级），拿它改标签会把
           静态名单里的人挪走（U19 B 因此从 26 掉到 15），所以不改。 */
        if (p.src === "barca-atletic" && e.src === "data") { e.team = p.team || e.team; e.src = p.src; }
      }
      if (!e.en && p.en) e.en = p.en;
      if (!e.nation && p.nation) e.nation = p.nation;
      if (!e.age && p.age) e.age = p.age;
      if (!e.value && p.value) e.value = p.value;
      if (!e.note && p.note) e.note = p.note;
      if (!e.team && p.team) e.team = p.team;
      // 同一球员可能同时出现在多个数据源，手动照片键一并记下（键各有各的命名空间）
      if (p.mkey && e.mkeys.indexOf(p.mkey) === -1) e.mkeys.push(p.mkey);
    }
  }

  /* 手动补的照片：按记下的键依次查 ManualPhoto，查到就用它盖过源里的图 ——
     这些照片本来就是补「源头没有/失效」的空位（tools/photo-tool.html 也是只给没照片的行提供入口）。
     值的形态：data:（工具内嵌）、http(s):（贴的直链）、站点根相对路径（上线的 manual-photos.js）。 */
  function manualSrc(v) {
    if (/^(data:|blob:|https?:)/i.test(v)) return v;
    return String(v).replace(/^\.\.\//, "").replace(/^\//, "");   // formation.html 就在站点根目录
  }
  function photoFor(p) {
    /* 统一走 avatar.js 的链路（Sofascore 优先，手动图兜底/定点覆盖） */
    if (window.AvatarChain) {
      try {
        const list = window.AvatarChain({
          key: (p.mkeys && p.mkeys[0]) || "",
          keys: p.mkeys || [],
          en: p.en, zh: p.zh,
          sf: p.sf || "",
          img: p.img || "",
          base: ""
        });
        if (list && list.length) return list[0];
      } catch (e) {}
    }
    const keys = p.mkeys || [];
    if (window.ManualPhoto) {
      for (let i = 0; i < keys.length; i++) {
        const m = window.ManualPhoto(keys[i]);
        if (m) return manualSrc(m);
      }
    }
    return p.img || "";
  }

  // 1) 本地官方名单（优先级最高：含中文名与备注）
  /* 梯队显示名统一取自 assets/js/teams.js（DESIGN.md：只用一套 SUB 体系） */
  const TEAM_OF = {};
  ["juvenil-a", "juvenil-b", "cadete", "cadete-b", "infantil", "infantil-b",
   "infantil-c", "u11a", "u11b", "u10a", "u10b", "u9a", "u9b"].forEach(function (tid) {
    TEAM_OF[tid] = window.Teams ? window.Teams.num(tid) : tid;
  });
  const local = (window.LAMASIA_DATA && window.LAMASIA_DATA.players) || {};
  Object.keys(TEAM_OF).forEach(function (tid) {
    (local[tid] || []).forEach(function (p) {
      addPlayer({
        en: p.name, zh: p.zh || "", pos: p.pos, team: TEAM_OF[tid],
        nation: p.nation || "", note: p.note || "",
        img: p.img ? ("assets/img/players/" + p.img) : "", src: "data",
        mkey: "local:" + tid + ":" + normKey(p.name)
      });
      // 别名：Sofascore 常用昵称（如 "Paumi Mateos" → "Pau Miguel Mateos"）
      String(p.nameAlias || "").split(",").forEach(function (al) {
        if (al) { const ak = normKey(al); if (ak) aliasMap[ak] = normKey(p.name); }
      });
    });
  });

  // 2) Sofascore 每日缓存（U19 = U19 A，U18 = U19 B，U16 = U16）
  /* U19 B 特殊：Sofascore 的 U18 名单残缺（没有门将），名单只认静态度假名单，
     这里只用它补齐已有球员的照片和位置，不新增人、不改队伍标签。 */
  const SOFA_POS = { G: "GK", D: "DF", M: "MF", F: "FW" };
  [
    { c: window.DQD_U19_CACHE, t: "U19 A", tk: "u19", rosterOnly: false },
    { c: window.DQD_U18_CACHE, t: "U19 B", tk: "u18", rosterOnly: true },
    { c: window.DQD_U16_CACHE, t: "U16", tk: "u16", rosterOnly: false }
  ].forEach(function (s) {
    if (!s.c || !s.c.players) return;
    (s.c.players || []).forEach(function (p) {
      let k = normKey(p.name);
      if (aliasMap[k]) k = aliasMap[k];
      if (s.rosterOnly) {
        const e = pool[k];
        if (!e) return;                       // 静态名单里没有这个人 → 不加
        if (p.photo && !e.sf) e.sf = p.photo; // 只补照片
        if (!e.pos) e.pos = SOFA_POS[p.pos] || "";
        if (!e.value && p.value) e.value = p.value;
        return;                               // 不动 team
      }
      addPlayer({
        en: p.name, pos: SOFA_POS[p.pos] || "", team: s.t,
        nation: nation(p.nation), age: p.age || "", value: p.value || "",
        img: p.photo || "", src: "sofascore",
        mkey: p.id != null ? (s.tk + ":" + p.id) : ""
      }, k);
    });
  });

  // 3) 懂球帝 B 队（预备队）：按组别取球员，跳过教练/球场信息
  const BT_POS = { goalkeeper: "GK", defender: "DF", midfielder: "MF", attacker: "FW" };
  const b = window.DQD_BARCA_ATLETIC;
  if (b && b.roster && b.roster.data && b.roster.data.list) {
    b.roster.data.list.forEach(function (g) {
      const pos = BT_POS[g.type];
      if (!pos) return;
      (g.data || []).forEach(function (p) {
        if (!p.person_name) return;
        const logo = p.person_logo || "";
        const img = (logo.indexOf("assets/img/players/dqd/") === 0) ? logo : (p.person_logo_url || logo);
        const en = p.person_en_name || "";
        const k = normKey(en) || ("dqd-" + (p.person_id || initials(p.person_name)));
        addPlayer({
          en: en, zh: p.person_name, pos: pos, team: "预备队",
          nation: p.nationality_name || "", age: p.age || "", img: img, src: "barca-atletic",
          mkey: p.person_id != null ? ("barca:" + p.person_id) : ""
        }, k);
      });
    });
  }

  /* 3.5) 预备队补齐 Sofascore 图：懂球帝名单里没有 sf id，但 sf 缓存里有同一个人，
     按英文名对齐（与梯队页/球探卡保持同一张脸）。 */
  (function fillSofascorePhotos() {
    const caches = [
      window.DQD_BARCA_ATLETIC_SF_CACHE, window.DQD_U19_CACHE,
      window.DQD_U18_CACHE, window.DQD_U16_CACHE
    ];
    const byName = {};
    caches.forEach(function (c) {
      ((c && c.players) || []).forEach(function (p) {
        const k = normKey(p.name || "");
        if (!k || byName[k]) return;
        byName[k] = p.photo || (p.id != null ? ("https://img.sofascore.com/api/v1/player/" + p.id + "/image") : "");
      });
    });
    Object.keys(pool).forEach(function (k) {
      const e = pool[k];
      if (e.sf) return;
      const hit = byName[normKey(e.en || "")] || byName[k];
      if (hit) e.sf = hit;
    });
  })();

  /* 3.6) 只删「本地备注明写了已经离队/升队、且实时源里也查不到」的人。
     不能用「Sofascore 名单里没有」来判断：Sofascore 的青年队名单本身残缺
     （U18 一个门将都没有，静态度假名单里的门将两个在任何缓存里都查不到），
     拿它当权威会把人删光（2026-11 踩过，见 docs/decisions.md 的 D9）。
     data.js 的 note 是人工核实过的，含「已升」「已转会」这类字样的才算走了；
     但「已升巴萨竞技」的人现在还在预备队名单里（实时源能查到），所以必须同时满足
     「实时源查不到」才删，否则会把升队的球员一起删掉。 */
  (function dropDeparted() {
    const GONE = window.People.GONE;   /* 见 assets/js/people.js */
    Object.keys(pool).forEach(function (k) {
      const e = pool[k];
      if (!e.live && GONE.test(e.note || "")) delete pool[k];
    });
  })();

  /* 3.7) 中文名兜底：data.js 没这个人时，从全站中文名表取（球探卡/NAME_ZH/手工补充） */
  (function fillZh() {
    if (!window.NameZh) return;
    Object.keys(pool).forEach(function (k) {
      const e = pool[k];
      if (!e.zh) { const z = window.NameZh(e.en); if (z) e.zh = z; }
    });
  })();

  // 转数组并排序（梯队顺序 → 姓名）
  const TEAM_ORDER = window.Teams ? window.Teams.nums()
    : ["预备队", "U19 A", "U19 B", "SUB16", "SUB15", "SUB14", "SUB13", "SUB12", "SUB11 A", "SUB11 B", "SUB10 A", "SUB10 B", "SUB9 A", "SUB9 B"];
  const players = Object.keys(pool).map(function (k) { return pool[k]; });
  players.sort(function (a, b) {
    const ti = TEAM_ORDER.indexOf(a.team), tj = TEAM_ORDER.indexOf(b.team);
    if (ti !== tj) return (ti < 0 ? 99 : ti) - (tj < 0 ? 99 : tj);
    return String(a.zh || a.en).localeCompare(String(b.zh || b.en), "zh-Hans-CN");
  });

  /* ─────────────────────────────────────────────
     二、阵型定义（行自上而下 = 前锋 → 门将）
     ───────────────────────────────────────────── */
  const FORMATIONS = {
    "4-3-3": [
      { pos: "FW", slots: ["左边锋", "中锋", "右边锋"] },
      { pos: "MF", slots: ["中场", "中场", "中场"] },
      { pos: "DF", slots: ["左后卫", "中卫", "中卫", "右后卫"] },
      { pos: "GK", slots: ["门将"] }
    ],
    "4-4-2": [
      { pos: "FW", slots: ["前锋", "前锋"] },
      { pos: "MF", slots: ["左前卫", "中场", "中场", "右前卫"] },
      { pos: "DF", slots: ["左后卫", "中卫", "中卫", "右后卫"] },
      { pos: "GK", slots: ["门将"] }
    ],
    "4-2-3-1": [
      { pos: "FW", slots: ["中锋"] },
      { pos: "MF", slots: ["左边锋", "前腰", "右边锋"] },
      { pos: "MF", slots: ["后腰", "后腰"] },
      { pos: "DF", slots: ["左后卫", "中卫", "中卫", "右后卫"] },
      { pos: "GK", slots: ["门将"] }
    ],
    "3-5-2": [
      { pos: "FW", slots: ["前锋", "前锋"] },
      { pos: "MF", slots: ["左翼卫", "中场", "前腰", "中场", "右翼卫"] },
      { pos: "DF", slots: ["中卫", "中卫", "中卫"] },
      { pos: "GK", slots: ["门将"] }
    ],
    "3-4-3": [
      { pos: "FW", slots: ["左边锋", "中锋", "右边锋"] },
      { pos: "MF", slots: ["左翼卫", "中场", "中场", "右翼卫"] },
      { pos: "DF", slots: ["中卫", "中卫", "中卫"] },
      { pos: "GK", slots: ["门将"] }
    ],
    "5-3-2": [
      { pos: "FW", slots: ["前锋", "前锋"] },
      { pos: "MF", slots: ["中场", "中场", "中场"] },
      { pos: "DF", slots: ["左翼卫", "中卫", "中卫", "中卫", "右翼卫"] },
      { pos: "GK", slots: ["门将"] }
    ],
    "4-5-1": [
      { pos: "FW", slots: ["中锋"] },
      { pos: "MF", slots: ["左边锋", "前腰", "中场", "前腰", "右边锋"] },
      { pos: "DF", slots: ["左后卫", "中卫", "中卫", "右后卫"] },
      { pos: "GK", slots: ["门将"] }
    ],
    "4-2-2-2": [
      { pos: "FW", slots: ["前锋", "前锋"] },
      { pos: "MF", slots: ["前腰", "前腰"] },
      { pos: "MF", slots: ["后腰", "后腰"] },
      { pos: "DF", slots: ["左后卫", "中卫", "中卫", "右后卫"] },
      { pos: "GK", slots: ["门将"] }
    ]
  };

  /* 计算阵型各槽位坐标：行内等距居中，行间纵向等分（百分比）；
     w 为槽位宽度百分比（按该行球员数算，避免窄屏 5 人一排时重叠） */
  function slotLayout(fmt) {
    const rows = FORMATIONS[fmt] || FORMATIONS["4-3-3"];
    const R = rows.length, list = [];
    rows.forEach(function (row, r) {
      const n = row.slots.length;
      const y = (r + 0.5) / R * 100;
      const w = 100 / (n + 1) * 0.92;
      row.slots.forEach(function (label, i) {
        list.push({ label: label, pos: row.pos, x: (i + 1) / (n + 1) * 100, y: y, w: w });
      });
    });
    return list;
  }

  /* 球场线条（竖式，本方球门在底部） */
  function pitchSvg() {
    return '<svg class="fb-lines" viewBox="0 0 100 140" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
      '<rect class="line" x="2.5" y="2.5" width="95" height="135"/>' +
      '<line class="line" x1="2.5" y1="70" x2="97.5" y2="70"/>' +
      '<circle class="line" cx="50" cy="70" r="11"/>' +
      '<rect class="line" x="20" y="2.5" width="60" height="16"/>' +
      '<rect class="line" x="20" y="121.5" width="60" height="16"/>' +
      '<rect class="line" x="31" y="2.5" width="38" height="7"/>' +
      '<rect class="line" x="31" y="130.5" width="38" height="7"/>' +
      '<circle class="line" cx="50" cy="21" r="1"/>' +
      '<circle class="line" cx="50" cy="119" r="1"/>' +
      '<rect class="line goal" x="44" y="0" width="12" height="2.5"/>' +
      '<rect class="line goal" x="44" y="137.5" width="12" height="2.5"/>' +
      '</svg>';
  }

  /* ─────────────────────────────────────────────
     三、状态与持久化
     ───────────────────────────────────────────── */
  const LS_KEY = "lamasia-formation-v1";
  const state = { formation: "4-3-3", slots: [] };
  let activeKey = null;        // 当前选中待放置的球员
  let currentTeam = "全部";
  let currentPos = "全部";

  function totalSlots() { return slotLayout(state.formation).length; }

  function usedKeys() {
    const s = {};
    state.slots.forEach(function (k) { if (k) s[k] = true; });
    return s;
  }

  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* 忽略 */ }
  }

  function restore() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s && FORMATIONS[s.formation]) state.formation = s.formation;
      if (s && Array.isArray(s.slots)) {
        const len = totalSlots();
        const arr = s.slots.slice(0, len);
        while (arr.length < len) arr.push("");
        state.slots = arr.map(function (k) { return pool[k] ? k : ""; });
      }
    } catch (e) { /* 忽略 */ }
  }

  function setFormation(key) {
    state.formation = key;
    const len = totalSlots();
    while (state.slots.length < len) state.slots.push("");
    state.slots = state.slots.slice(0, len);
    save();
  }

  /* 把 key 放到槽位 idx：目标被占则交换，球员已在别处则移动 */
  function placePlayer(key, idx) {
    if (state.slots[idx] === key) { activeKey = null; return; }
    const oldIdx = state.slots.indexOf(key);
    if (state.slots[idx]) {
      const other = state.slots[idx];
      if (oldIdx !== -1) state.slots[oldIdx] = other;
      state.slots[idx] = key;
    } else {
      if (oldIdx !== -1) state.slots[oldIdx] = "";
      state.slots[idx] = key;
    }
    save();
  }

  function removeFromSlot(idx) {
    state.slots[idx] = "";
    save();
  }

  /* ─────────────────────────────────────────────
     四、渲染
     ───────────────────────────────────────────── */
  /* 头像 DOM 统一由 assets/js/avatar.js 产出（选图顺序、失败回退、首字母都在那儿）。
     这里只负责给排兵布阵的 class 和灯箱提示。 */
  function avatarHtml(p, cls, zoom) {
    if (!window.AvatarHtml) return '<span class="fb-avatar ' + (cls || "") + '"><span class="fb-init">' + esc(initials(p.zh || p.en || "·")) + "</span></span>";
    return window.AvatarHtml(
      {
        key: (p.mkeys && p.mkeys[0]) || "",
        keys: p.mkeys || [],
        en: p.en, zh: p.zh,
        sf: p.sf || "",
        img: p.img || "",
        base: ""
      },
      {
        cls: "fb-avatar" + (cls ? " " + cls : ""),
        iniCls: "fb-init",
        alt: p.zh || p.en || "",
        attrs: 'draggable="false"' + (zoom ? ' title="点击看大图"' : "")
      }
    );
  }

  /* 头像灯箱：点球员池里的头像看大图（.lightbox 样式复用 style.css，与梯队页同一个观感）。
     场上槽位不做 —— 那儿整块是「点击移除 / 拖动换位」，另在首发名单里有 ✕ 可移除。 */
  function openPhoto(src, caption) {
    if (!src) return;
    let lb = $("fb-lightbox");
    if (!lb) {
      lb = document.createElement("div");
      lb.id = "fb-lightbox";
      lb.className = "lightbox";
      lb.innerHTML = '<div class="lightbox-inner">' +
        '<button class="lightbox-close" title="关闭">✕</button>' +
        '<img alt="">' +
        '<div class="lightbox-caption"></div>' +
        '</div>';
      document.body.appendChild(lb);
      lb.addEventListener("click", function (e) {
        if (e.target === lb || e.target.classList.contains("lightbox-close")) closePhoto();
      });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePhoto(); });
    }
    lb.querySelector("img").src = src;
    lb.querySelector(".lightbox-caption").textContent = caption || "";
    lb.classList.add("open");
  }
  function closePhoto() {
    const lb = $("fb-lightbox");
    if (lb) lb.classList.remove("open");
  }

  /* 球场卡槽很窄（最多 64px），只显示姓氏，避免 "亚历克斯·普列戈" 被截成省略号；
     完整姓名仍在悬停 title 和右侧首发名单里 */
  function shortName(p) {
    const n = String((p && (p.zh || p.en)) || "").trim();
    if (!n) return "";
    const parts = n.split("·");
    if (parts.length > 1) return parts[parts.length - 1].trim();
    const w = n.split(/\s+/);
    return w.length > 1 ? w[w.length - 1] : n;
  }

  function renderPitch() {
    const wrap = $("fb-pitch");
    if (!wrap) return;
    const layout = slotLayout(state.formation);
    let html = pitchSvg();
    layout.forEach(function (s, i) {
      const key = state.slots[i] || "";
      const p = key ? pool[key] : null;
      const wStyle = 'width:min(64px,' + s.w.toFixed(1) + '%)';
      if (p) {
        const mismatch = p.pos !== s.pos;
        html += '<div class="fb-slot filled' + (mismatch ? " mismatch" : "") + '" style="left:' + s.x.toFixed(1) + '%;top:' + s.y.toFixed(1) + '%;' + wStyle + '" data-idx="' + i + '" title="' + esc(s.label) + ' · ' + esc(p.zh || p.en) + '（点头像看大图 / 点姓名·角标移除 / 拖动换位）">' +
          '<span class="fb-slot-badge ' + (POS_CLASS[p.pos] || "other") + '">' + (POS_ZH[p.pos] || p.pos) + '</span>' +
          '<div class="fb-slot-card" draggable="true">' + avatarHtml(p, "sm") +
            '<span class="fb-slot-name">' + esc(shortName(p)) + '</span>' +
          '</div>' +
        '</div>';
      } else {
        html += '<div class="fb-slot empty" style="left:' + s.x.toFixed(1) + '%;top:' + s.y.toFixed(1) + '%;' + wStyle + '" data-idx="' + i + '" title="放入 ' + esc(s.label) + '（' + (POS_ZH[s.pos] || "") + '）">' +
          '<span class="fb-slot-label">' + esc(s.label) + '</span>' +
        '</div>';
      }
    });
    wrap.innerHTML = html;
  }

  function renderPool() {
    const grid = $("fb-players"), cnt = $("fb-pool-count");
    if (!grid) return;
    const q = ($("fb-search") ? $("fb-search").value : "").trim().toLowerCase();
    const uk = usedKeys();
    const list = players.filter(function (p) {
      if (currentTeam !== "全部" && p.team !== currentTeam) return false;
      if (currentPos !== "全部" && p.pos !== currentPos) return false;
      if (q && (p.zh + " " + p.en + " " + p.team + " " + p.nation).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    if (cnt) cnt.textContent = list.length + " 人";
    if (!players.length) {
      grid.innerHTML = '<div class="match-list-empty" style="color:var(--red)">⚠ 球员数据未能加载（可能是网络拦截了脚本）。请刷新重试；或直接双击本地文件 barca-lamasia\\formation.html 打开（完全离线可用）。</div>';
      return;
    }
    grid.innerHTML = list.map(function (p) {
      return '<button class="fb-player' + (activeKey === p.key ? " active" : "") + (uk[p.key] ? " used" : "") + '" draggable="true" data-key="' + esc(p.key) + '" title="' + esc(p.zh || p.en) + (p.note ? " · " + esc(p.note) : "") + '">' +
        avatarHtml(p, "", true) +
        '<span class="fb-p-name">' + esc(p.zh || p.en) + '</span>' +
        '<span class="fb-p-meta">' +
          '<span class="fb-pos ' + (POS_CLASS[p.pos] || "other") + '">' + (POS_ZH[p.pos] || p.pos || "?") + '</span>' +
          (p.team ? '<span class="fb-p-team">' + esc(p.team) + '</span>' : "") +
        '</span>' +
      '</button>';
    }).join("") || '<div class="match-list-empty">没有匹配的球员</div>';
  }

  function renderActiveBar() {
    const el = $("fb-active");
    if (!el) return;
    if (!activeKey) { el.hidden = true; el.innerHTML = ""; return; }
    const p = pool[activeKey];
    if (!p) { activeKey = null; renderActiveBar(); return; }
    el.hidden = false;
    el.innerHTML = '<span>✋ 已选中 <b>' + esc(p.zh || p.en) + '</b>（' + (POS_ZH[p.pos] || "") + " · " + esc(p.team || "") + "）— 点击右侧槽位放置，或直接拖拽</span>" +
      '<button id="fb-clear-active" title="取消选中">✕ 取消</button>';
  }

  function renderLineup() {
    const el = $("fb-lineup");
    if (!el) return;
    const layout = slotLayout(state.formation);
    el.innerHTML = layout.map(function (s, i) {
      const p = state.slots[i] ? pool[state.slots[i]] : null;
      const mismatch = p && p.pos !== s.pos;
      return '<div class="fb-lineup-row">' +
        '<span class="fb-lineup-pos ' + (POS_CLASS[s.pos] || "other") + '">' + esc(s.label) + '</span>' +
        '<span class="fb-lineup-name">' + (p ? esc(p.zh || p.en) + (mismatch ? '<span class="fb-lineup-warn" title="该球员位置与槽位不符">⚠</span>' : "") : '<span class="fb-lineup-empty">待定</span>') + '</span>' +
        '<span class="fb-lineup-team">' + (p ? esc(p.team || "") : "") + '</span>' +
        '<button class="fb-lineup-del" data-idx="' + i + '" title="移除">✕</button>' +
      '</div>';
    }).join("");
  }

  function buildFormationTabs() {
    const el = $("fb-formation-tabs");
    if (!el) return;
    el.innerHTML = Object.keys(FORMATIONS).map(function (k) {
      return '<button class="fb-fmt-tab' + (k === state.formation ? " active" : "") + '" data-fmt="' + k + '">' + k + "</button>";
    }).join("");
  }

  function buildTeamTabs() {
    const el = $("fb-team-tabs");
    if (!el) return;
    const tabs = ["全部"].concat(TEAM_ORDER);
    el.innerHTML = tabs.map(function (t) {
      return '<button class="fb-chip' + (t === currentTeam ? " active" : "") + '" data-kind="team" data-val="' + t + '">' + t + "</button>";
    }).join("");
  }

  function buildPosChips() {
    const el = $("fb-pos-chips");
    if (!el) return;
    const chips = [["全部", "全部"], ["门将", "GK"], ["后卫", "DF"], ["中场", "MF"], ["前锋", "FW"]];
    el.innerHTML = chips.map(function (c) {
      const on = currentPos === c[1];
      return '<button class="fb-chip' + (on ? " active" : "") + '" data-kind="pos" data-val="' + c[1] + '">' + c[0] + "</button>";
    }).join("");
  }

  function renderCount() {
    const el = $("fb-count");
    if (!el) return;
    const n = state.slots.filter(function (k) { return k; }).length;
    el.textContent = "已放 " + n + "/" + totalSlots();
  }

  function renderAll() {
    buildFormationTabs();
    renderPitch();
    renderPool();
    renderActiveBar();
    renderLineup();
    renderCount();
  }

  /* ─────────────────────────────────────────────
     五、交互（点击 + 拖拽）
     ───────────────────────────────────────────── */
  let dragKey = null;

  document.addEventListener("click", function (e) {
    // 点头像 → 看大图（球员池 + 场上槽位都支持）
    const avImg = e.target.closest ? e.target.closest(".fb-player .fb-avatar img, .fb-slot .fb-avatar img") : null;
    if (avImg) {
      e.preventDefault();
      const btn = avImg.closest(".fb-player");
      const slot = avImg.closest(".fb-slot");
      let p = null;
      if (btn) p = pool[btn.getAttribute("data-key")];
      else if (slot) {
        const i = parseInt(slot.getAttribute("data-idx"), 10);
        if (!isNaN(i) && state.slots[i]) p = pool[state.slots[i]];
      }
      openPhoto(avImg.src, p ? ((p.zh || p.en) + (p.zh && p.en ? " · " + p.en : "") + (p.team ? "（" + p.team + "）" : "")) : avImg.alt);
      return;
    }
    const fmtTab = e.target.closest(".fb-fmt-tab");
    if (fmtTab) {
      e.preventDefault();
      const k = fmtTab.getAttribute("data-fmt");
      if (k && k !== state.formation) { setFormation(k); renderAll(); }
      return;
    }
    const chip = e.target.closest(".fb-chip");
    if (chip) {
      e.preventDefault();
      const kind = chip.getAttribute("data-kind");
      const val = chip.getAttribute("data-val");
      if (kind === "team") { currentTeam = val; buildTeamTabs(); }
      else if (kind === "pos") { currentPos = val; buildPosChips(); }
      renderPool();
      return;
    }
    const poolBtn = e.target.closest(".fb-player");
    if (poolBtn) {
      e.preventDefault();
      const key = poolBtn.getAttribute("data-key");
      if (key) { activeKey = key; renderPool(); renderActiveBar(); }
      return;
    }
    const del = e.target.closest(".fb-lineup-del");
    if (del) {
      e.preventDefault();
      const idx = parseInt(del.getAttribute("data-idx"), 10);
      if (!isNaN(idx)) { removeFromSlot(idx); renderAll(); }
      return;
    }
    const clearActive = e.target.closest("#fb-clear-active");
    if (clearActive) { e.preventDefault(); activeKey = null; renderPool(); renderActiveBar(); return; }
    const slotEl = e.target.closest(".fb-slot");
    if (slotEl) {
      const idx = parseInt(slotEl.getAttribute("data-idx"), 10);
      if (isNaN(idx)) return;
      if (activeKey) {
        placePlayer(activeKey, idx);
        activeKey = null;
      } else if (state.slots[idx]) {
        removeFromSlot(idx);
      }
      renderAll();
      return;
    }
    // 点击空白取消选中
    if (activeKey && !e.target.closest(".fb-player") && !e.target.closest(".fb-slot")) {
      activeKey = null; renderPool(); renderActiveBar();
    }
  });

  /* 拖拽：球员池卡片 / 场上球员卡 → 任意槽位 */
  document.addEventListener("dragstart", function (e) {
    const poolBtn = e.target.closest(".fb-player");
    const slotEl = e.target.closest(".fb-slot");
    let key = null;
    if (poolBtn) key = poolBtn.getAttribute("data-key");
    else if (slotEl) {
      const idx = parseInt(slotEl.getAttribute("data-idx"), 10);
      if (!isNaN(idx) && state.slots[idx]) key = state.slots[idx];
    }
    if (!key) { e.preventDefault(); return; }
    dragKey = key;
    try { e.dataTransfer.setData("text/plain", key); } catch (err) { /* 忽略 */ }
    e.dataTransfer.effectAllowed = "move";
    document.body.classList.add("fb-dragging");
  });

  document.addEventListener("dragend", function () {
    dragKey = null;
    document.body.classList.remove("fb-dragging");
    document.querySelectorAll(".fb-slot.drop-hover").forEach(function (el) { el.classList.remove("drop-hover"); });
  });

  document.addEventListener("dragover", function (e) {
    const slotEl = e.target.closest(".fb-slot");
    document.querySelectorAll(".fb-slot.drop-hover").forEach(function (el) {
      if (el !== slotEl) el.classList.remove("drop-hover");
    });
    if (!slotEl) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    slotEl.classList.add("drop-hover");
  });

  document.addEventListener("drop", function (e) {
    const slotEl = e.target.closest(".fb-slot");
    if (!slotEl) return;
    e.preventDefault();
    slotEl.classList.remove("drop-hover");
    const idx = parseInt(slotEl.getAttribute("data-idx"), 10);
    const key = dragKey || (e.dataTransfer ? e.dataTransfer.getData("text/plain") : "");
    if (key && !isNaN(idx)) { placePlayer(key, idx); renderAll(); }
  });

  /* ─────────────────────────────────────────────
     六、操作按钮
     ───────────────────────────────────────────── */
  function randomFill() {
    const layout = slotLayout(state.formation);
    const unused = players.filter(function (p) { return !usedKeys()[p.key]; });
    state.slots = state.slots.map(function (cur, i) {
      if (cur) return cur;
      let cands = unused.filter(function (p) { return p.pos === layout[i].pos; });
      if (!cands.length) cands = unused;
      if (!cands.length) return "";
      const pick = cands[Math.floor(Math.random() * cands.length)];
      unused.splice(unused.indexOf(pick), 1);
      return pick.key;
    });
    activeKey = null;
    save();
    renderAll();
  }

  function clearAll() {
    state.slots = state.slots.map(function () { return ""; });
    activeKey = null;
    save();
    renderAll();
  }

  function copyLineup() {
    const layout = slotLayout(state.formation);
    const lines = layout.map(function (s, i) {
      const p = state.slots[i] ? pool[state.slots[i]] : null;
      return s.label + "：" + (p ? (p.zh || p.en) + (p.team ? "（" + p.team + "）" : "") : "—");
    });
    const text = "【拉玛西亚 · " + state.formation + " 阵型首发】\n" + lines.join("\n");
    const msg = $("fb-copy-msg");
    const done = function (ok) {
      if (msg) {
        msg.textContent = ok ? "✅ 已复制到剪贴板" : "复制失败，请手动选择复制";
        setTimeout(function () { if (msg) msg.textContent = ""; }, 2600);
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { legacyCopy(text, done); });
    } else {
      legacyCopy(text, done);
    }
  }

  /* 剪贴板降级方案（本地 file:// 打开时 clipboard API 不可用） */
  function legacyCopy(text, done) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      done(ok);
    } catch (e) {
      done(false);
    }
  }

  /* ─────────────────────────────────────────────
     七、初始化
     ───────────────────────────────────────────── */
  function init() {
    restore();
    if (!state.slots.length) state.slots = new Array(totalSlots()).fill("");
    buildFormationTabs();
    buildTeamTabs();
    buildPosChips();
    renderAll();
    const t = $("fb-total");
    if (t) t.textContent = players.length;
    const btnRandom = $("fb-random"), btnClear = $("fb-clear"), btnCopy = $("fb-copy");
    if (btnRandom) btnRandom.addEventListener("click", randomFill);
    if (btnClear) btnClear.addEventListener("click", clearAll);
    if (btnCopy) btnCopy.addEventListener("click", copyLineup);
    const search = $("fb-search");
    if (search) search.addEventListener("input", function () { renderPool(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
