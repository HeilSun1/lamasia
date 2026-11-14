# 界面决策记录（UI）

记录已经定下来的界面决定和理由。改之前先看这里，别重复讨论已经否掉的方向。
全局约束见 DESIGN.md（四档字号 12/15/28/44、最小 12px、无渐变发光、无装饰动画、人物照不做整屏背景）。

## D1 集锦页密度向赛程页看齐

**结论**（`assets/css/style.css`）：`.hl-name-btn` 15px/800 → 13px/700；`.hl-c-tier` 15px → 13px；
`.hl-c-count b` 15px → 13px；头像 `.hl-p-av` 32px → 24px；单元格内距 `6px 10px` → `6px 8px`；
表头 11.5px → 12px；手机上球员名 15px → 13px。

**理由**：集锦页和赛程页用的是同一套表格组件，集锦比赛程整整高一档（行高 44 vs 36），
翻页时视觉跳动。赛程是「查数据」的基准密度，集锦向它对齐，顺带把 11.5px 提到 12px 下限之上。

## D2 首页 hero 文案居中

**结论**：`.hm-hero-inner` 的 `margin: 0` 改为 `margin: 0 auto`。

**理由**：容器 1120 居中、文案块 620，靠左时右侧空 500px，桌面看着像半成品。
手机上容器只有 366px（小于 620），`auto` 在窄屏算 0，所以移动端像素级不变。
用户明确要求「手机端和电脑端都不要受到影响」，这是唯一满足该条件的改法。

## D4 周报页合集入口卡片化

**结论**：`.weekly-album` 从「浮在角上的红点 + 一行标题 + 一行灰字」改成整块深色入口：
第一行 `● 第 209 期 · 2026-11-08 更新`，第二行最新一期标题（最多两行），第三行来源说明。
数据全部读自已有的 `window.WEEKLY_ALBUM_CACHE`（`issue` / `title` / `checked`），不再用写死的 `WEEKLY_ALBUM.title`。
红点从右上角移到期号前面，只在有新一期时出现（状态标记，不是装饰）。

**理由**：期号和最新一期标题早就在缓存里，`weekly.js` 只拿 `issue` 比红点、把 `title` 丢掉，
所以入口永远显示「拉玛西亚新闻合集」这一行，用户看不出点进去有什么。
改完没有新增任何数据依赖，只是把已有字段显示出来。

## 待定

- 新闻列表层级：是否加「首条头条」（16:9 大图 + 28px 标题）。
- 新闻摘要：`news-item` 无 `summary` 字段，要加必须改抓取脚本。
- 西语标题翻译：方案与显示方式未定。

## D5 西语标题显示中文，原文放 hover

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

## D3 新闻列表的首条做成头条

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
