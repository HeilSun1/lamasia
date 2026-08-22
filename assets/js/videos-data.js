/* ═══════════════════════════════════════════════════════════════
   拉玛西亚信息站 · 视频集锦人工覆盖层
   ─────────────────────────────────────────────────────────────
   自动搜索（scripts/update_youtube.ps1）只生成"建议"匹配，可能有误配。
   在这里手动 pin / 否决，刷新即生效（无需重新跑脚本）：
     · matches：比赛键 -> 你手动指定的全场集锦（优先生效）
     · players：球员键 -> 你手动指定的球员集锦（优先生效）
     · blocked：把自动搜错/不要的视频 id 拉黑（该视频不再显示）
     · reSearch：把比赛键放进来 → 下次跑 update_youtube.ps1 会强制重搜（旧视频保留合并）
   比赛键  = "sfb:{Sofascore eventId}"（B队）/ "sofascore:{eventId}"（U19）
   球员键  = "sf:b:{球员SofascoreID}" / "sf:u19:{球员SofascoreID}"
   视频格式：{ videoId: "xxxx", title: "（可选，留空用原标题）", site: "yt" }
     · YouTube 视频 id 形如 "abc123xyz"，B站 视频 id 是 BV 号（如 "BV1xx..."）
     · pin B站 视频时加 site: "bili"（默认 yt）
   ═══════════════════════════════════════════════════════════════ */
window.VIDEOS_DATA = {
  matches: {
    "sofascore:16792416": [
      { videoId: "A2UjVF7vI3A", title: "FC Barcelona U18 vs Chinese Football Boy U18 | BEST CUP 2026 | 集锦" }
    ]
  },
  players: {
    // 08-08 vs Udinese 是 U18 比赛：Tunkara 这条从 B 队键转到 U18 键（B 队键已拉黑）
    "sf:u18:2128084": [
      { videoId: "9eOLL88phHU", title: "Ebrima Tunkara vs Udinese | 08/08/2026 | U18 友谊赛" }
    ]
  },
  blocked: {
    "sf:b:1977602": ["-xRAJTjKdQI"],   // "Jordi Pesquer vs FC Basel"（16/08）实为 Ignasi Quer，误配，已拉黑
    "sf:b:2128084": ["9eOLL88phHU"],   // "Ebrima Tunkara vs Udinese"（08/08）实为 U18 比赛，已转挂 sf:u18:2128084
    "sf:b:2014710": ["4_Aj5crS8X0"],   // "Juvenil B vs CF Damm 2021/22 全场回放"误配给现役球员
    "sf:b:1926082": ["4_Aj5crS8X0"],
    "sf:u19:2014710": ["4_Aj5crS8X0"],
    "sf:u19:1926082": ["4_Aj5crS8X0"],
    "sf:b:2679424": ["BV1qt8A61E5G"],   // "哈维·埃斯帕特季前赛集锦"实为其他球员（同名前缀撞车），误配给 Javi Castro
    "b:50935584": ["BV19fbC6XEbZ"],   // "乔纳森·埃尔南德斯（Barca Atletic 新援）"实为乔纳森，非胡安，误配
    "local:cadete:rocmartinez": ["BV1FDuv6bESg"],   // "塞尔吉奥·马丁内斯（桑坦德竞技转会目标）"非罗克，误配
    "sfb:16866862": ["xC6XHDscPt4", "l_QEkeC1KJA", "WbP4hvDJ3Pw"],  // 三条 07-30 发布、4-1/训练视频，本场是 08-19 的 1-0，误配
    "sfb:16696837": ["zw6c7QSbUtA"]    // Tona 场"WATCH LIVE FOOTBALL"直播流，非本场集锦，误配
  },
  reSearch: [
    // "sfb:16696837"   // 强制重搜（下次跑 update_youtube.ps1 生效）
  ]
};
