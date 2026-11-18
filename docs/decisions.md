# 决策记录

按主题分组，每主题内部各自编号（D1、D2…）。这些是「为什么这样做」的记录，改动前先看对应主题。

| 主题 | 覆盖范围 |
| --- | --- |
| [头像](#头像) | 头像的唯一出口、显示顺序、占位图、低龄梯队 |
| [界面](#界面) | 集锦密度、首页 hero、周报合集卡、西语标题翻译 |
| [球探卡](#球探卡) | 卡片墙形态、原文嵌入、收录口径 |
| [维护与更新](#维护与更新) | 两条更新通道、公开方式、脚本合并 |

---

## 头像

本文件记录 2026-11-17 那一轮 `/grill` 定下来的头像规矩。改头像相关代码前先读这一页。

起因：Gorka Buil 与 Samu Borniquel 在球探卡里显示了同一张脸。查下来**上游数据错了**
（Sofascore 给两个 id 挂了同一张人像），但顺着这条线发现站内更实际的问题——
同一名球员在四个界面用了三套实现、四套键名，补图在一处生效、另一处失效。

---

### D1 · 头像只有一个出口

**结论**：所有界面都调 `assets/js/avatar.js` 的 `AvatarHtml(player, opts)`（或
`AvatarChain(player)` 拿候选数组自己拼标记）。`roster.js`、`dqd-u19/u18/u16.js`、
`dqd-barca-atletic.js`、`scout-cards.js` 不再各自拼 `<img>`。

**理由**：改之前 `roster.js` 根本不查 Sofascore，`dqd-*.js` 只查手动键 `u19:<id>`，
球探卡走 `player-card.js` 的 `photosFor()`。想换一张脸要改三四个地方，永远漏一个。

### D2 · 显示顺序

```
手动覆盖图  →  Sofascore  →  本地图（跳过占位图）  →  首字母圆底
```

**理由**：手动图是「人肉纠错」，优先级必须最高；Sofascore 是全站覆盖最广、且球探卡
/集锦/球员卡已经在用的源，梯队页跟它对齐才不会「同一个人在两张页面是两张脸」；
本地图（懂球帝镜像）留在第三层当兜底，弱网/404 时仍有脸；都没有才显示首字母。

### D3 · 懂球帝的灰问号占位图 = 没有图

`assets/img/players/dqd/` 里有 7 个文件内容完全相同（sha256 `62370C6BE84A…` 开头），
是懂球帝的默认人像：

```
50917373.png  51017488.png  51050111.png  51199202.png
51210430.png  51246092.png  51246752.png
```

`avatar.js` 里硬编码这份名单，命中就跳过继续往下走。**不要**靠文件大小或 `onerror`
判断——这些图能正常加载，`onerror` 不会触发，只会显示一个灰问号头像。

### D4 · 手动补图的键名

新键统一：

```
local:<梯队>:<拼音>       例：local:juvenil-a:gorkabuil
```

`avatar.js` 会按顺序试：`player.key` → `local:<梯队>:<拼音>`（中文名、英文名各试一次）
→ 旧键 `u19:<id>`、`barca:<id>`、`sf:<id>`。

**理由**：`tools/photo-tool.html` 写的是 `local:<梯队>:<拼音>`，但 `dqd-u19.js` 只认
`u19:<id>`、`player-card.js` 只认 `barca:<id>`——旧数据已经存在，直接废除会让补过的
照片全部失效，所以新键优先、旧键兼容。

### D5 · 低龄梯队不接 Sofascore

`data.js` 里 `cadete-b`、`infantil`、`infantil-b`、`infantil-c`、`u11a`…`u9b` 这 7 个
梯队约 130 人**没有任何 Sofascore id**，本地也基本没有真图。这几个页面继续显示首字母
圆底，`manual-photos.js` 通道保留（想补谁就补谁）。

**理由**：低龄球员不宜过度曝光；懂球帝对低龄梯队的覆盖未知，抓一轮可能白干。

---

### 实现备注

- 路径：缓存里存的是站点根相对路径（`assets/img/players/dqd/x.jpg`），梯队页在
  `teams/` 下要补 `../`，`avatar.js` 的 `fixPath()` 统一处理，调用方传 `base`。
- 回退：`AvatarHtml` 把所有候选写进 `data-alt`（`|` 分隔），`onerror` 调
  `window.AV_IMG_FAIL(img)` 逐张试，全失败才显示首字母。**不要**再写内联的
  `this.style.display='none';this.nextElementSibling...`。
- B 队页（`teams/barca-atletic.html`）额外加载 `dqd-barca-atletic-sf-cache.js`，
  `dqd-barca-atletic.js` 用英文名把懂球帝名单对齐到 Sofascore 记录（`sfPhoto()`）。
- 覆盖率（2026-11-17 实测）：B 队 38 人 → Sofascore 29 张；U19 A 33 人 33 张；
  U19 B 15 人 15 张；SUB16 42 人 42 张。
---

### D6 · Sofascore 有图就用手动图（2026-11-17 补，D2 的顺序被推翻）

**结论**：链路改成 **Sofascore → 手动补图 → 本地图 → 首字母**。手动图不再是第一顺位，
只在两种情况下生效：(a) 该球员没有 Sofascore 图；(b) 他的键被登记进
`window.MANUAL_OVERRIDE`（`assets/js/manual-photos.js` 末尾），表示「Sofascore 这张是错的」。
目前名单里只有 Samu Borniquel（`sf:u19:2407333`，Sofascore 挂的是 Gorka Buil 的脸）。

**理由**：用户原话「以后 Sofascore 有头像的你就不要使用手动添加的头像了」。手动图里混着
新闻图、三人合影、举旗全身照、老东家球衣照（见 D3 提到的六张），和 Sofascore 的正脸
摆在一起反而不一致；Sofascore 缺图时手动图仍然兜底，不会掉到首字母。

### D7 · 五个界面必须同时生效

**结论**：头像出现在五处，改顺序要一起验证：梯队名单（`roster.js` / `dqd-*.js`）、
球探卡（`scout-cards.js`）、集锦球员行（`highlights.js`）、球员卡弹窗
（`player-card.js` 的 `renderCard()`，走 `AvatarChain` 而不是 `photosFor`）、
排兵布阵（`formation.js` 的 `photoFor()`）。

**理由**：2026-11-17 第一次改只动了名单和球探卡，用户立刻发现「点开球员卡片」和
「排兵布阵」还是老样子——因为这两处各自有独立实现。`player-card.js` 的 `keyRank()`
也一并改成 `sf:` 排第一，否则 `photosFor()` 的候选顺序会把手动图顶到前面。

### D8 · 相对路径按页面层数推算

**结论**：`avatar.js` 用 `location.pathname` 判断是否在 `teams/` 下，决定补不补 `../`，
写进 `UP` 常量；`DEFAULT_BASE = UP + "assets/img/players/"`。调用方传 `base` 不再影响
`assets/` 开头的路径。

**理由**：`formation.html` 在站点根目录，之前传空 `base` 会回落到默认的 `../assets/...`，
排兵布阵里所有头像都 404，变成首字母——这就是「排兵布阵的头像没变」的真正原因。
---

### D9 · 不要用 Sofascore 名单裁剪本地名单

**结论**：名单类页面（梯队「球员大名单」、排兵布阵球员池）以 `data.js` 的静态度假名单为底，
只隐掉 `note` 里写明「已升 / 已转会」且实时源也查不到的人；不再「以 Sofascore 为准」。

**理由**：2026-11-17 一度改成「只保留 Sofascore 名单里有的人」，结果 U19 B 从 26 人掉到 12 人、
门将归零。核查发现 Sofascore 的青年队名单本身残缺：`DQD_U18_CACHE` 15 人里 **0 个门将**，
静态度假名单的 3 个门将（Pau Espí、Elyott Daussy、Pablo Peña）有两个在任何缓存里都不存在。
拿残缺名单当权威，删掉的是真球员。同理，「已升巴萨竞技」的人还在预备队名单里（实时源能查到），
所以删人必须同时满足「note 说走了」和「实时源查不到」。

**配套**：`scripts/audit_site.js` 做全站对应性体检（缓存新鲜度 / 名单人数 / 中文名缺口 /
未译与失效译文 / 旧梯队标签残留 / 本地图片引用 / 编号重复），输出 `docs/audit-<日期>.md`。

---

## 界面

记录已经定下来的界面决定和理由。改之前先看这里，别重复讨论已经否掉的方向。
全局约束见 DESIGN.md（四档字号 12/15/28/44、最小 12px、无渐变发光、无装饰动画、人物照不做整屏背景）。

### D1 集锦页密度向赛程页看齐

**结论**（`assets/css/style.css`）：`.hl-name-btn` 15px/800 → 13px/700；`.hl-c-tier` 15px → 13px；
`.hl-c-count b` 15px → 13px；头像 `.hl-p-av` 32px → 24px；单元格内距 `6px 10px` → `6px 8px`；
表头 11.5px → 12px；手机上球员名 15px → 13px。

**理由**：集锦页和赛程页用的是同一套表格组件，集锦比赛程整整高一档（行高 44 vs 36），
翻页时视觉跳动。赛程是「查数据」的基准密度，集锦向它对齐，顺带把 11.5px 提到 12px 下限之上。

### D2 首页 hero 文案居中

**结论**：`.hm-hero-inner` 的 `margin: 0` 改为 `margin: 0 auto`。

**理由**：容器 1120 居中、文案块 620，靠左时右侧空 500px，桌面看着像半成品。
手机上容器只有 366px（小于 620），`auto` 在窄屏算 0，所以移动端像素级不变。
用户明确要求「手机端和电脑端都不要受到影响」，这是唯一满足该条件的改法。

### D4 周报页合集入口卡片化

**结论**：`.weekly-album` 从「浮在角上的红点 + 一行标题 + 一行灰字」改成整块深色入口：
第一行 `● 第 209 期 · 2026-11-08 更新`，第二行最新一期标题（最多两行），第三行来源说明。
数据全部读自已有的 `window.WEEKLY_ALBUM_CACHE`（`issue` / `title` / `checked`），不再用写死的 `WEEKLY_ALBUM.title`。
红点从右上角移到期号前面，只在有新一期时出现（状态标记，不是装饰）。

**理由**：期号和最新一期标题早就在缓存里，`weekly.js` 只拿 `issue` 比红点、把 `title` 丢掉，
所以入口永远显示「拉玛西亚新闻合集」这一行，用户看不出点进去有什么。
改完没有新增任何数据依赖，只是把已有字段显示出来。

### 待定

- 新闻列表层级：是否加「首条头条」（16:9 大图 + 28px 标题）。
- 新闻摘要：`news-item` 无 `summary` 字段，要加必须改抓取脚本。
- 西语标题翻译：方案与显示方式未定。

### D5 西语标题显示中文，原文放 hover

**结论**：新闻标题统一走 `window.NEWS_ZH[原标题]` 取中文，取不到就显示原文；原标题写进 `title` 属性（鼠标悬停可见）。
翻译在每日更新里**抓完之后、提交之前**跑一次 `scripts/translate_news_titles.ps1`，只翻新增条目，结果写进独立文件
`assets/js/news-zh-cache.js`（本机通道和 GitHub Actions 都写这个文件，互不覆盖）。

**接口**：MyMemory（免注册免 key，带 `de` 邮箱参数把每日额度提到 5 万字符）。
实测本机：Google 免费端点 8.3 秒超时（被墙）、DeepL 403（要 key）、腾讯云 111ms（要 key）、MyMemory 965ms 可用。

**术语保护**：译前把队名/球员名替换成 `{{T1}}` 占位符，译完还原。词表 267 条，来自
懂球帝缓存的 `name`/`nameEn` 成对字段 + `data.js` 的 `LAMASIA_NAME_ZH` + 手工队名表
（`Barça Atlètic`→预备队、`Juvenil A`→青年A队、`Cadete A`→SUB16…）。
没有这一步时 `Juvenil A` 会被翻成"A青年队"、`Barça Atlètic` 变"巴萨竞技队"，和站内写法冲突。

**理由**：用户只读中文，但偶尔要核原文；列表密度保持不变（不额外加一行）。

**踩坑**：`.ps1` 在 `.gitattributes` 里标成 `-text`，git 不做行尾转换，所以改完必须把行尾还原成 LF，
否则整文件进 diff（1200 行假改动）。

### D3 新闻列表的首条做成头条

**结论**：列表里第一条新闻单独放大——缩略图 76×54 → 96×68，标题 13.5 → 15px，上下留白多一点；
其余条目完全不动。用显式类 `.news-item--lead` 标记，不用 `:first-of-type`。

**理由**：8 条新闻长得一模一样，读者扫不出主次。头条 + 七条紧凑行是最省事的层级手段，
也不用动数据结构（摘要 dek 那档要改 4 个抓取脚本，先不做）。

**踩坑**：最初写 `.news-item:first-of-type`，在周报页整条规则失效——因为列表容器里第一个 `<a>`
是公众号合集卡 `.weekly-album`，新闻条目的首个 `<a>` 算不上 `:first-of-type`（`assets/js/weekly.js:122`）。
改成六个渲染器统一在 `el.innerHTML = html` 之后给第一个 `.news-item` 打类：
`var _lead = el.querySelector('.news-item'); if (_lead) _lead.classList.add('news-item--lead');`
涉及 `weekly.js`、`official-news.js`、`dqd-barca-news.js`、`dqd-u19-news.js`、`dqd-u18-news.js`、`dqd-u16-news.js`。

**未做**：C 档（每条加一行 dek 摘要）——数据里没有 `summary` 字段，要改抓取脚本。

---

## 球探卡

> 目标：把 mesgazette 的 `/scout-cards/` 功能搬到本站——卡片墙 + 点开看球探报告。
> 强度：深挖。日期：2026-11-14。

### D1 形态：卡片墙（独立页）+ 站内浮层

- **结论**：新建 `scout-cards.html`，球员按梯队分页签列出；点卡片在站内浮层里看原文，不做「每人一个静态详情页」。
- **理由**：本站是每日自动更新的静态站，247 个详情页意味着每天都要跟随阵容变动增删文件，维护成本远大于收益。浮层复用现有 `.panel`/表格视觉语言，零新增依赖。

### D2 原文展示：iframe 嵌入（已实测可行）

- **结论**：浮层内用 `<iframe>` 懒挂载对方原页；**桌面端把 1180px 宽的整页缩放进面板**，手机端不嵌、改为「打开完整报告」按钮跳新标签。
- **理由**：
  - 实测对方详情页响应头**无 `X-Frame-Options`**、HTML 内**无 `frame-ancestors`**，浏览器允许嵌入（`shots/iframe-test.png` 两组 iframe 均完整渲染）。
  - 嵌入 = 展示原站，不复制、不缓存，内容永远是最新的；版权上比「抓取后转述」干净得多。
  - 桌面面板宽 ~840px，直接塞 1180px 的桌面布局会右侧被裁，所以用 `transform: scale()` 等比缩小；手机上 390px 下对方整页会挤成一团，因此不嵌。
- **降级**：浮层右上角常驻「打开原文」外链；iframe 区域永远先显示一行「正在载入原文…（若长时间空白，说明对方站点不可用…）」，对方哪天加了 `X-Frame-Options` 也不会让页面崩掉。

### D3 数据与版权边界

- **结论**：卡片上只放本站自有字段（中文名/英文名/梯队/位置/生日/号码）；报告正文、四维评分、里程碑**一律不抄**，只能通过 iframe 或外链阅读原文。
- **理由**：事实（生日、身高、惯用脚、位置、合同年限）不受版权保护，但评语与 MG Rating 分数是对方的表达与原创判断。short quote 也要署名 + 链接，索性全部走嵌入。

### D4 收录口径：只收「能对上 slug」的球员

- **结论**：用姓名归一化（去重音、小写、非字母数字转空格）匹配本站球员英文名与对方 124 个 slug，命中 87 人，全部展示；对不上的不硬猜。
- **理由**：错配比缺失更糟——把哈菲兹的报告挂到别人卡上是不可接受的错误。剩余 37 个 slug 多为 B 队球员，本站 `data.js` 不含预备队名单（B 队名单在 `dqd-barca-atletic-cache.js`，只有中文名），需要额外维护英文名对照表才能收录，暂缓。

### D5 不做评级（暂缓）

- **结论**：本站不生成自己的 OVR / POTENTIAL 分数。
- **理由**：评分需要判断力与一致性，现有数据只有身价、身高、位置，凑出来的分数是假精度；用户的评语也只能靠人工写——这属于内容生产，不是这个站能承担的成本。

### 待定

- 里程碑（首秀/首球/第 N 场）：现有缓存没有出场名单与进球者，需新增 Sofascore `player/{id}/statistics` 与 `event/{id}/lineups`，属独立工程。
- 职业路径：青训梯队转会史只有 Transfermarkt 有，Sofascore 没有；暂以原文链接代替。
- B 队 37 人：需要英文名对照表。

### D6 · 头像只从一个地方来（2026-11-14）

**结论**：球探卡头像按 `manual-photos.js` 的手动照片 → `data.js` 的本地图 → Sofascore CDN 三级解析，且解析发生在**运行期**（`scout-cards.js` 的 `photoOf()` 每次渲染时查 `ManualPhoto(key)`）。
**理由**：站内已经有一层手动照片机制（`manual-photos.js` + `manual-photos-hook.js` + `tools/photo-tool.html`，键形如 `local:cadete-b:pauespi`）。球探卡复用同一套键，以后在工具里给某个球员补一张图，名单页、集锦页、球探卡页同时生效，不需要重新生成 `scout-cards-data.js`。
**实测覆盖**：87 张卡里 44 张有真实头像（手动照片 8 + 本地文件 11 + Sofascore 25），其余 43 张（以 SUB14 及以下为主）站内没有任何照片来源，保留首字母灰圈。不使用 mesgazette 的卡片图（那是他们的合成图，且会断链）。

### D7 · 排序与搜索（2026-11-14）

**结论**：页签按 `SUB16 → SUB15 → SUB14 → SUB13 → SUB12 → SUB11 A → SUB11 B` 的年龄顺序排列（此前 `infantil` 排在 `cadete-b` 前面，导致 SUB14 跑到 SUB15 之前）；搜索框只过滤本页 87 人，匹配中文名、英文名、slug 与梯队名。
**理由**：搜索一旦跨到全站 247 人，命中的球员大多没有球探卡，用户点进去会发现「搜到了但没有内容」，比搜不到更困惑。

### D6 头像与生日：全站只认一个解析器（2026-11-14）

**结论**：球探卡不再自己拼头像 URL，一律走 `PlayerCard.photosFor(key, [en, zh], [])`，取第一张作 `src`、其余写入 `data-alt`，加载失败由 `scImgFail()` 逐张回退，全挂了才显示首字母。

**理由**：此前球探卡用「ManualPhoto → 本地 img → Sofascore」三级兜底，而集锦页、梯队页各自又有一套解析，同一个人在三处算出三张不同的图（加里巴在球探卡无图、集锦页有 Sofascore 图；哈姆扎在集锦页是本地 jpg、梯队页是懂球帝 CDN）。`photosFor` 已按 `keyRank`（`local:` → `b:` → `sf:b:` → `sf:`）排好优先级并按姓名族合并同一人的多个键，复用它就自动一致；用户以后手动补一张 `assets/img/players/<slug>.jpg` 或改 `manual-photos.js`，三处同时生效，不需要重新生成球探卡数据。

**生日**来源顺序：`data.js` 的 dob（大量是「—」，不是空串，判空要 `/^[—\-\u2013]$/`）→ Sofascore 缓存的 `players[].birthday` → `work\scout-dob.json`（对方档案页 `<dt>Born</dt>` 补的低龄球员，可能只有年份）。当前 87/87 都有出生年。

**卡片结构**：`<div class="sc-card">` 里放两个兄弟按钮——`.sc-av-btn`（点头像开站内球员卡）与 `.sc-main`（点文字开球探报告）。不要嵌套按钮（HTML 不允许，点击事件也会互相吞）。

**尺码**对齐站内名单行（`.pl-row`）：头像 32px、中文名 13.5px/700、英文名 11.5px、元信息 12px，卡片内距 10px 12px（手机 9px 10px）。
### D7 收录口径放宽与页签短名（2026-11-14）

**结论**：名片收录从「姓名完全相等」放宽为「末词精确 + 其余词前缀匹配」，并允许一张人工别名表（`ALIAS`）；页签只显示短梯队名（`预备队 / U19 A / U19 B / SUB16 …`），数量用 11px 灰字跟在后面。

**理由**：原来只做全名相等，`Pedro Rodríguez Iglesias` 对不上 `pedro-rodriguez`、`Ïu Martínez` 的分音符、`Samu` 对 `Samuel` 全部漏收，124 张卡只收了 87 张。放宽后收到 **119 张**（`预备队 18 / U19 A 33 / U19 B 15 / SUB16 12 / SUB15 8 / SUB14 6 / SUB13 3 / SUB11 A 12 / SUB11 B 12`），另有 5 张明确不收：`adrian-cuadrado / jesse-bisiwu / john-adams / michal-zuk` 站内没有这个人，`destiny-ejiofor` 与站内 `Divine Ejiofor` 不是同一人（生日 2014 对不上 U16）。

**别名表**（逐条核对生日 + 位置 + 梯队才写进去）：`alex-walton → Alexander Walton`（生日 2006-04-12 完全一致）、`pedrito-juarez → Pedro Juárez`（2014 · 中场 · Infantil A）、`amadou-diakite → Amadou Diakate`（2014 · Aleví A(U12) ↔ u11a）。

**页签**：`U19 A · Juvenil A 24` 这种 12 字符标签在 15px 下会把一行撑满，显得很重；梯队后缀与卡片里的信息重复，所以页签只留 `U19 A` + 灰字人数，卡片第三行仍显示 `U19 A · 后卫 · 2007`。

**卡片尺码**：回到初版（44px 头像 / 15px 中文名 / 12px 英文名与元信息 / 内距 14px），用户明确说这一版更好看。

### D8 收录口径修正：124/124 全收（2026-11-14）

上一版说「站内没有这 5 个人」，**是错的**，原因在匹配链路，不在数据：

1. **没用 `data.js` 早就有的 `nameAlias` 字段**。例如 `John Ovie` 的 `nameAlias` 与注释都写着「旧名单作 John Ovie Adams」，我没读。
2. **只扫了 4 个 Sofascore 缓存的 `players` 数组**，漏了 `dqd-barca-atletic-cache.js` 的 `roster.data.list[].data[]`（含 `person_en_name` + `person_name` 中文名 + `person_id`，是 B 队唯一同时有英文名和 id 的来源）与 `elfutbol-*-details-cache.js` 的比赛名单（`"Adams Silva, John Ovie"` 这种「姓, 名」写法）。
3. **`norm()` 没处理没有 Unicode 分解形式的字母**：`ł ø đ ß` 在 `NFD` 之后仍是原字符，导致 `michał zuk ≠ michal zuk`，`Michał Żuk`（`dqd-u19-cache.js` 里有，id 2128103）被误判为站内没有。

修完的结果：**124 张 = 对方页面列出的全部**，编号 0 未匹配；中文名、生日、位置 100% 齐全。
- `jesse-bisiwu` → 比西武（`b:50892327`，本地图 `assets/img/players/dqd/50892327.jpg`）
- `john-adams` → 约翰·奥维（`local:cadete-b:johnovie`，SUB15）
- `michal-zuk` → 米哈乌·祖克（`sf:u19:2128103`，U19 A）
- `destiny-ejiofor` → 德斯蒂尼·科西奥（`local:infantil-b:destinykosio`，SUB13，与哥哥 Divine 不同人，站内两个都有）
- `adrian-cuadrado` → 阿德里安·夸德拉多（**站内确实没有**：他 2026-27 外租在 CE Sabadell U19，不在巴萨名册里；作为唯一例外手工补进 `EXTRA`，`key` 为空，头像不可点）

**规矩**：以后再加人，先查 `data.js` 的 `nameAlias`、再查 DQD roster，最后才用模糊匹配；模糊匹配前必须先跑 `SPECIAL` 字符映射，否则带 `ł/ø/đ/ß` 的名字会静默漏掉。

---

## 维护与更新

> 用途：把「为什么这样做」固定下来，避免下次改之前重新推一遍。
> 每条 = 结论 + 理由。未定的进「待定问题」，定了就搬上来。

### 已定

#### D1 讨论强度：深挖

结论：这轮按「深挖」走——主动找风险、边界和遗漏，不只补明显缺口。
理由：用户问的是「怎么优化」，但勘察已暴露多个尚未被决定的真问题（仓库公开面、脚本可裸下载、两条更新通道是否合并、故障可见性）。细问只会把它们列出来，深挖才会逼出「哪种权衡其实不能接受」。

#### D2 决策记录落盘

结论：决策写进本文件，每条带理由，另列待定问题。
理由：这套系统的心智模型目前只存在于脚本注释和 README 里，而 README 已漂移（写着「01:07 UTC」「09/15/21 三班」，实际是 00:23 UTC 与 09:00/21:00 两班）。

#### D3 数据新鲜度：保持现状，不加频次

结论：够用就行，维持本机 09:00 / 21:00 + 运行器 00:23 三班，不做「赛后触发」。
理由：用户明确「保持现状就好」。加频次会撞 fcbarcelona.es 的风控（2026-09-21 起官方站对无头 Edge 抓取有风控），收益（赛后当晚看到集锦）对当前受众不成立。
代价（已知并接受）：西班牙傍晚的比赛，集锦最快次日 09:00 那轮才上站。

#### D4 托管：留在 GitHub Pages，不迁 Cloudflare / Netlify

结论：站点继续用 heilsun1.github.io/lamasia，不迁托管；_redirects 视为无效文件（保留无害，但别指望它拦任何路径）。
理由：本机实测 github.io 982ms 可达，而 pages.dev 4.1s、github.com 直接超时。迁 CF 会更慢，且「国内不好操作」的直觉被实测推翻。仓库必须公开（Pages 免费的前提），但脚本里没有任何真实密钥（唯一命中是 update_youtube.ps1:768 的占位 cookie uvid3=lamasia），暴露面只是抓取策略，不值得为它改架构。

#### D5 系统还要继续长 → 收敛 Sofascore 四脚本

结论：站还会加数据（用户 2026-11-10 明确），所以把 update_u19_sofascore.ps1 / update_u18_sofascore.ps1 / update_u16_sofascore.ps1 / update_barca_atletic_sf.ps1 收敛成唯一实现 scripts/update_sofascore.ps1 -Tier u19|u18|u16|b，四个旧文件降级成薄转发器（保持调用方零改动）。
理由与量化：u19↔u18 差异 72/65 行（约 340 行完全相同），u18↔u16 只差 22/23 行（团队 id、缓存路径、日志路径、头部注释），四个文件合计约 1500 行同构。update_elfutbol_details.ps1 -Tier … 已经验证过这个模式。
风险控制：旧文件名保留为转发器 → un_daily_update.ps1、daily-update.yml 都不用动；合并后必须手动跑一遍 -Tier u18 并与现有 dqd-u18-cache.js 对比，差异应只有时间戳类字段。

#### D6 计划任务弹窗：原方案（wscript 宿主）已被实证否决，改用候选方案

**历史结论（2026-08-19 曾实施，失败）**：把任务动作从 powershell.exe -WindowStyle Hidden -File run_daily_update.ps1 改成 wscript.exe "…\scripts\run_hidden.vbs"。
**失败证据**：run_hidden.vbs 于 2026-08-19 提交（commit 7b508f1）当天 19:46 那轮，主日志只有「开始本机每日更新」、**没有结束行**；子日志显示跑到 u18-update.log 19:48:00「开始 U18 更新」之后再无任何输出，直到次日 11:17 才有下一轮。即整轮在 U18（Sofascore）附近挂死，被任务的 1 小时执行上限杀掉 → 表现为「每日更新直接失败」。全日志 199 次开始 / 174 次结束或汇总，缺口与这类中断吻合。

**候选方案（按风险从低到高，均未验证）**：
1. 任务改为「不管用户是否登录都运行」（S4U）：跑在后台会话，天生无窗口，不需要 VBS。待验证 Edge 无头在 session 0 能否正常抓取。
2. 复现并定位 VBS 为何在 U18 挂住（怀疑 Edge 无头在无控制台会话里卡在某个等待上），再决定是否回到 VBS。
3. 接受窗口（现状），只把执行上限从 1 小时压低。
### 勘察事实（2026-11-10 验证，供后续决策引用）

- **本机通道**：计划任务 `LaMasia_Local_Daily_Update`，每天 09:00 / 21:00 跑 `scripts/run_daily_update.ps1`（16 个脚本）。2026-11-10 09:32 那轮 340s，`update_elfutbol_details.ps1 -Tier infantil-b` 退出码 1 → 整轮 `exit 2` 降级，已发 Windows 通知（`scripts/local-daily-update.log`、`assets/data/status.json`）。
- **运行器通道**：`.github/workflows/daily-update.yml`，`cron: 23 16 * * *`（北京 00:23），跑懂球帝/Sofascore/官网/西媒/周报 + `update_youtube.ps1 -YouTubeOnly` 产出分片。两条通道靠「只 add 指定文件 + rebase 重试 + 分片物理隔离」互不覆盖。
- **实际托管是 GitHub Pages**：`https://heilsun1.github.io/lamasia/` 返回 200，当天改动已上线。README 里的 Netlify 方案已不适用。
- **`_redirects` 在 Pages 上无效**（访问返回 404）：`/scripts/run_daily_update.ps1`（200, octet-stream）、`/scripts/dqd_sched.json`、`/assets/data/status.json`、`/README.md` 均可直接下载。
- 站点根目录没有 `robots.txt`、没有 `sitemap.xml`；页脚硬写「数据更新截至 2026 年 8 月」。
- 维护资产：33 个 PowerShell 脚本、`scripts/selftest/`（e2e 故障注入 + 横幅判定）、DESIGN.md；`scripts/*.log` 与本地状态文件已正确 gitignore。

#### 补充勘察（2026-11-10 第二轮，用户本机实测）

| 目标 | 结果 |
|---|---|
| https://heilsun1.github.io/lamasia/ | 982ms，200 |
| https://github.com/ | 15s 超时（DNS 解析到 20.205.243.166，连不通） |
| https://pages.dev/ | 4137ms，200 |
| https://lamasia.pages.dev/ | 2951ms，522（该子域不存在，非网络问题） |

DNS：heilsun1.github.io → 185.199.109-111.153（Fastly）；pages.dev → 104.18.20-21.135（Cloudflare）。

结论：**本机网络下 github.io 比 Cloudflare 快 3-4 倍，而 github.com 浏览器访问不通**（推送必须走 ssh.github.com:443，与现状一致）。「迁 Cloudflare 以解决国内访问」的假设不成立。

脚本凭据扫描：scripts/*.ps1 与 workflow 里没有任何真实密钥（唯一命中是 update_youtube.ps1:768 的占位 cookie uvid3=lamasia）。所以「脚本可裸下载」的真实风险只有「抓取策略被围观」，不是凭据泄露。

脚本重复度：135 个函数定义、10 个名字重复。Log 复制 16 份、JsStr 7 份；Sofascore 家族（update_u19/u18/u16_sofascore.ps1 + update_barca_atletic_sf.ps1）里 Get-SfRaw/Get-SfJson/Get-FootZh/Get-ValueZh/Get-CompZh/Get-Birth/Get-InjuryZh/Get-Age 各 4 份，四个脚本共约 1500 行高度同构；update_youtube.ps1 单文件 1666 行。对照：update_elfutbol_details.ps1 已经用 -Tier 参数化跑 6 个梯队（日志可见 -Tier infantil-b），说明该模式在本仓库已有先例。

#### 补充勘察（2026-11-10 第三轮：为什么每天弹 cmd 窗口）

计划任务 LaMasia_Local_Daily_Update 的动作是：
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "…\scripts\run_daily_update.ps1"，Principal = 22534 / Interactive / Limited。

问题：-WindowStyle Hidden 只是让 PowerShell 自己隐藏，控制台进程仍会被创建（启动瞬间可见，且在某些会话下停留）。而仓库里**早就写了一个专门解决这事的包装器** scripts/run_hidden.vbs（wscript.exe 是 GUI 宿主，本身不产生控制台；注释里还记着「脚本目录含中文，不能把中文路径传给 WScript.Shell.Run」这个坑），但它**没有任何调用方**——注册脚本没引用它，workflow 也没引用。属于旧任务时代留下的、写好却没接上的零件。

另外确认：全部 scripts/*.ps1 里**没有一处 Start-Process**，Edge / node 都是调用运算符 & 在同一控制台里跑的，所以不会有子进程另开窗口。换 VBS 宿主即可彻底消掉窗口。

### 待定问题

- 站点是「希望被搜到」还是「自己看 + 少数人知道」？（决定 robots/noindex、仓库公开面、脚本要不要挪出发布目录）
- 数据新鲜度的真实目标是什么？（决定 09:00/21:00 两班是否够，以及要不要改成赛后触发）
- 降级/失败时，谁应该在多长时间内知道？现在的两条通道（Windows 通知、站点横幅）都依赖「人恰好在线/恰好打开站点」。

### 附：Sofascore 四个脚本合并（已完成）

`update_u19_sofascore.ps1` / `update_u18_sofascore.ps1` / `update_u16_sofascore.ps1` / `update_barca_atletic_sf.ps1`
四份 385–411 行的脚本，除配置外是同一套逻辑，已合并为 `scripts/update_sofascore.ps1 -Tier u19|u18|u16|b`。

- 各梯队的 TeamId、缓存文件名、`window.DQD_*` 全局名、日志文件、默认队名、主教练兜底、赛事名映射
  全部收进顶部的一个 `switch ($Tier)` 配置块，其余 ~340 行共用一份。
- 抓取重试（3 次、间隔 6 秒）用 U18/U16 的新版实现，U19 与 B 队一并获得重试保护。
- 四个旧文件降级为 5 行转发器（`& update_sofascore.ps1 -Tier u18` + `exit $LASTEXITCODE`），
  调用方 `run_daily_update.ps1` 与计划任务**零改动**，随时可回滚。
- 验收方式：跑转发器，比对缓存文件——除 `updated` 时间戳与生成注释里的脚本名外逐行一致。
  U18（15 名球员 / 4 场赛程）、B 队（32 名球员 / 40 场赛程）实测通过，退出码均为 0。
