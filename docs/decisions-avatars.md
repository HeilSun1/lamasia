# 头像显示规则（decisions-avatars）

本文件记录 2026-11-17 那一轮 `/grill` 定下来的头像规矩。改头像相关代码前先读这一页。

起因：Gorka Buil 与 Samu Borniquel 在球探卡里显示了同一张脸。查下来**上游数据错了**
（Sofascore 给两个 id 挂了同一张人像），但顺着这条线发现站内更实际的问题——
同一名球员在四个界面用了三套实现、四套键名，补图在一处生效、另一处失效。

---

## D1 · 头像只有一个出口

**结论**：所有界面都调 `assets/js/avatar.js` 的 `AvatarHtml(player, opts)`（或
`AvatarChain(player)` 拿候选数组自己拼标记）。`roster.js`、`dqd-u19/u18/u16.js`、
`dqd-barca-atletic.js`、`scout-cards.js` 不再各自拼 `<img>`。

**理由**：改之前 `roster.js` 根本不查 Sofascore，`dqd-*.js` 只查手动键 `u19:<id>`，
球探卡走 `player-card.js` 的 `photosFor()`。想换一张脸要改三四个地方，永远漏一个。

## D2 · 显示顺序

```
手动覆盖图  →  Sofascore  →  本地图（跳过占位图）  →  首字母圆底
```

**理由**：手动图是「人肉纠错」，优先级必须最高；Sofascore 是全站覆盖最广、且球探卡
/集锦/球员卡已经在用的源，梯队页跟它对齐才不会「同一个人在两张页面是两张脸」；
本地图（懂球帝镜像）留在第三层当兜底，弱网/404 时仍有脸；都没有才显示首字母。

## D3 · 懂球帝的灰问号占位图 = 没有图

`assets/img/players/dqd/` 里有 7 个文件内容完全相同（sha256 `62370C6BE84A…` 开头），
是懂球帝的默认人像：

```
50917373.png  51017488.png  51050111.png  51199202.png
51210430.png  51246092.png  51246752.png
```

`avatar.js` 里硬编码这份名单，命中就跳过继续往下走。**不要**靠文件大小或 `onerror`
判断——这些图能正常加载，`onerror` 不会触发，只会显示一个灰问号头像。

## D4 · 手动补图的键名

新键统一：

```
local:<梯队>:<拼音>       例：local:juvenil-a:gorkabuil
```

`avatar.js` 会按顺序试：`player.key` → `local:<梯队>:<拼音>`（中文名、英文名各试一次）
→ 旧键 `u19:<id>`、`barca:<id>`、`sf:<id>`。

**理由**：`tools/photo-tool.html` 写的是 `local:<梯队>:<拼音>`，但 `dqd-u19.js` 只认
`u19:<id>`、`player-card.js` 只认 `barca:<id>`——旧数据已经存在，直接废除会让补过的
照片全部失效，所以新键优先、旧键兼容。

## D5 · 低龄梯队不接 Sofascore

`data.js` 里 `cadete-b`、`infantil`、`infantil-b`、`infantil-c`、`u11a`…`u9b` 这 7 个
梯队约 130 人**没有任何 Sofascore id**，本地也基本没有真图。这几个页面继续显示首字母
圆底，`manual-photos.js` 通道保留（想补谁就补谁）。

**理由**：低龄球员不宜过度曝光；懂球帝对低龄梯队的覆盖未知，抓一轮可能白干。

---

## 实现备注

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

## D6 · Sofascore 有图就用手动图（2026-11-17 补，D2 的顺序被推翻）

**结论**：链路改成 **Sofascore → 手动补图 → 本地图 → 首字母**。手动图不再是第一顺位，
只在两种情况下生效：(a) 该球员没有 Sofascore 图；(b) 他的键被登记进
`window.MANUAL_OVERRIDE`（`assets/js/manual-photos.js` 末尾），表示「Sofascore 这张是错的」。
目前名单里只有 Samu Borniquel（`sf:u19:2407333`，Sofascore 挂的是 Gorka Buil 的脸）。

**理由**：用户原话「以后 Sofascore 有头像的你就不要使用手动添加的头像了」。手动图里混着
新闻图、三人合影、举旗全身照、老东家球衣照（见 D3 提到的六张），和 Sofascore 的正脸
摆在一起反而不一致；Sofascore 缺图时手动图仍然兜底，不会掉到首字母。

## D7 · 五个界面必须同时生效

**结论**：头像出现在五处，改顺序要一起验证：梯队名单（`roster.js` / `dqd-*.js`）、
球探卡（`scout-cards.js`）、集锦球员行（`highlights.js`）、球员卡弹窗
（`player-card.js` 的 `renderCard()`，走 `AvatarChain` 而不是 `photosFor`）、
排兵布阵（`formation.js` 的 `photoFor()`）。

**理由**：2026-11-17 第一次改只动了名单和球探卡，用户立刻发现「点开球员卡片」和
「排兵布阵」还是老样子——因为这两处各自有独立实现。`player-card.js` 的 `keyRank()`
也一并改成 `sf:` 排第一，否则 `photosFor()` 的候选顺序会把手动图顶到前面。

## D8 · 相对路径按页面层数推算

**结论**：`avatar.js` 用 `location.pathname` 判断是否在 `teams/` 下，决定补不补 `../`，
写进 `UP` 常量；`DEFAULT_BASE = UP + "assets/img/players/"`。调用方传 `base` 不再影响
`assets/` 开头的路径。

**理由**：`formation.html` 在站点根目录，之前传空 `base` 会回落到默认的 `../assets/...`，
排兵布阵里所有头像都 404，变成首字母——这就是「排兵布阵的头像没变」的真正原因。