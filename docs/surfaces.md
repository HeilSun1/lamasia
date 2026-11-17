# 界面出口清单（surfaces）

> 这张表存在的唯一目的：**改一条数据之前，先看它有几个出口**。
> 2026-11 的教训——头像改了名单没改弹窗、译名改了新闻没改球员名、中文名只查了本梯队——
> 全是「只改了离报错最近的那一处」。表格按主题列出：数据从哪来、被谁渲染、改完要看哪几页。

## 怎么用

1. 找到要改的主题，**把所有「出口」列出来**（不是一个，是列出的全部）。
2. 每个出口都要改；漏一个就等于没改。
3. 改完按「验证页」逐页截图，缺一页不算完成。
4. 新增一个出口（新页面/新渲染器）时，立刻补进这张表。

---

## 1. 头像

| | |
|---|---|
| 唯一出口 | `assets/js/avatar.js`（`window.AvatarChain` / `AvatarHtml` / `AV_IMG_FAIL`） |
| 顺序 | 手动覆盖图（仅 `MANUAL_OVERRIDE` 白名单）→ Sofascore → 本地图（跳过懂球帝灰问号）→ 首字母 |
| 消费方 | `roster.js`、`dqd-u19.js`、`dqd-u18.js`、`dqd-u16.js`、`dqd-barca-atletic.js`、`scout-cards.js`、`highlights.js`、`player-card.js`（`renderCard`）、`formation.js`（`photoFor`） |
| 手动补图 | `assets/js/manual-photos.js`（键 `local:<梯队>:<拼音>`，旧键 `u19:`/`barca:`/`sf:`/`alumni:` 仍兼容） |
| 验证页 | `teams/juvenil-a.html`、`teams/juvenil-b.html`、`teams/cadete.html`、`teams/barca-atletic.html`、`scout-cards.html`、`highlights.html`、`formation.html`、任意页的球员卡弹窗 |

## 2. 中文名

| | |
|---|---|
| 唯一出口 | `assets/js/name-zh.js`（`window.NameZh(en)`） |
| 数据来源 | `data.js` 各梯队 `zh`、`scout-cards-data.js` 的 `zh`、`data.js` 末尾 `LAMASIA_NAME_ZH`、`name-zh.js` 里的手工补充 |
| 消费方 | `dqd-u19.js`、`dqd-u18.js`、`dqd-u16.js`（`lookupZh` 兜底）、`formation.js`（`fillZh`）、`roster.js`（直接用 `data.js` 的 `zh`） |
| 验证页 | 四个梯队页的球员名单、`scout-cards.html`、`formation.html` 球员池 |

## 3. 新闻条目（含中文标题）

| | |
|---|---|
| 唯一出口 | `assets/js/news-item.js`（`NewsItem.html` / `NewsItem.render`） |
| 译文 | `assets/js/news-zh-cache.js`（`window.NEWS_ZH`，由 `scripts/translate_news_titles.ps1` 每日生成） |
| 消费方 | `weekly.js`、`official-news.js`、`dqd-u19-news.js`、`dqd-u18-news.js`、`dqd-u16-news.js`、`dqd-barca-news.js` |
| 页面 | `weekly.html`、`teams/juvenil-a.html`、`teams/juvenil-b.html`、`teams/cadete.html`、`teams/barca-atletic.html` |
| 验证页 | 上面五页，注意「首条头条」样式（96×68 图 + 15px 标题）只应出现在每条列表的第一条 |

## 4. 榜单/赛程/战绩

| | |
|---|---|
| 数据 | `assets/js/fcb-youth-schedules.js`（官网赛程）、`assets/js/dqd-*.js`（Sofascore 赛程） |
| 渲染 | `assets/js/fcb-youth-render.js`、`assets/js/schedule-deck.js`（`matches.html`）、各 `teams/*.html` |
| 验证页 | `matches.html`（含 `#sec-fcb-cadete-b` 等 hash 直达）、各梯队页「比赛信息」页签 |

## 5. 伤病 / 身价 / 教练

| | |
|---|---|
| 数据 | `assets/js/dqd-u19-cache.js` / `dqd-u18-cache.js` / `dqd-u16-cache.js` / `dqd-barca-atletic-cache.js` |
| 渲染 | `dqd-u19.js`、`dqd-u18.js`、`dqd-u16.js`、`dqd-barca-atletic.js` |
| 验证页 | 四个梯队页的「球队信息」与名单页签 |

## 6. 集锦

| | |
|---|---|
| 数据 | `assets/js/videos-data.js` + `assets/js/dqd-videos-cache.js` |
| 渲染 | `highlights.js`（`mergeGroups` 三级合并）、`player-card.js`（球员卡「集锦」页签） |
| 验证页 | `highlights.html`、球员卡弹窗 |

## 7. 周报合集卡

| | |
|---|---|
| 数据 | `assets/js/weekly-album-cache.js`（`WEEKLY_ALBUM_CACHE`） |
| 渲染 | `weekly.js` 的 `renderAlbum` |
| 验证页 | `weekly.html` 顶部深色卡片 |

## 8. 「数据截至」时间

| | |
|---|---|
| 数据 | `assets/data/status.json` |
| 渲染 | `assets/js/status-banner.js`（`applyAsOf` 写 `#data-as-of`） |
| 验证页 | `index.html`、`matches.html`、各梯队页顶部 |

---

## 已知还没收敛的重复（下一步）

- **梯队标签**：`formation.js` 的 `TEAM_OF`、`dqd-u19/u18/u16.js` 的队伍名字面量、`scout-cards-data.js` 的 `teamLabel` 三处各写一遍，改一个要改三个。
- **名单权威源**：`data.js` 是 2025-26 手工快照，`formation.js` 已按实时源过滤，但 `roster.js`（梯队页名单）仍可能列出已离队球员——同一条「谁在队里」的判断还有第二处。
## 2026-11-17 补记：两处重复已收敛

- **梯队标签**：唯一出口 `assets/js/teams.js`（`window.Teams.label/num/page`）。
  消费方：`formation.js`（筛选按钮与 `TEAM_OF`）、`player-card.js`（卡片抬头）、
  `search.js`（结果里的队伍名与链接）、`scout-cards.js`（卡片副标题与「梯队」字段）。
  验证页：`formation.html`（按钮应为 预备队 / U19 A / U19 B / SUB16…）、`scout-cards.html`、
  `search.html`、任一梯队页（点开球员卡看抬头）。
- **「谁在队里」**：梯形页的「球员大名单」由 `roster.js` 渲染时按 Sofascore 实时缓存过滤
  （`LIVE_CACHE`：juvenil-a→`DQD_U19_CACHE`、juvenil-b→`DQD_U18_CACHE`、cadete→`DQD_U16_CACHE`）；
  只有本地名单与实时名单重合度低于 75% 才过滤，避免误删官方名单里的边缘球员。
  过滤生效时，同一块的抬头、人数徽标、说明文字、上方「阵容位置分布」会一起改写成实时数据
  （`roster.js` 的 `applyPositions()` 也由 `dqd-u19/u18/u16.js` 在渲染名单后调用）。
  验证页：`teams/juvenil-a.html`、`teams/juvenil-b.html`（两者的位置分布总数应与名单人数一致）。