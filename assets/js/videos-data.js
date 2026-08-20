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
    // "sfb:16696837": [
    //   { videoId: "abcdefghijk", title: "UE Tona 1-2 Barcelona Atletico | Highlights" }
    // ]
  },
  players: {
    // "sf:u19:1861694": [
    //   { videoId: "qrstuvwxyz", title: "Ajay Tavares vs Espanyol U19" }
    // ]
  },
  blocked: {
    // "sofascore:16541418": ["误配的视频id"]
  },
  reSearch: [
    // "sfb:16696837"   // 强制重搜（下次跑 update_youtube.ps1 生效）
  ]
};
