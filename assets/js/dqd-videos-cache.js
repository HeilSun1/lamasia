/* 自动生成，请勿手动编辑 —— 由 scripts/update_youtube.ps1 每日更新，数据源：YouTube 搜索/RSS
   window.DQD_VIDEOS_CACHE.matches：比赛键 -> 全场集锦
       比赛键 = "sfb:{Sofascore eventId}"（B队）/ "sofascore:{eventId}"（U19）
   window.DQD_VIDEOS_CACHE.players：球员键 -> 按场个人集锦
       球员键 = "sf:b:{球员SofascoreID}" / "sf:u19:{球员SofascoreID}"
   每条视频：{ videoId, title, channel, channelId, published, durationSec }
   人工 pin / 否决请编辑 assets/js/videos-data.js */
window.DQD_VIDEOS_CACHE = {
  "updated": "",
  "searchedMatches": [],
  "matches": {},
  "players": {}
};
