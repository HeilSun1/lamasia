# 拉玛西亚 · La Masia 信息站（FC Barcelona 青训）

球迷非官方信息站。**B队（Barça Atlètic）** 数据来自懂球帝，**U19（Juvenil A）** 数据来自 Sofascore。

## 数据更新机制

| 层 | 方式 | 说明 |
|---|---|---|
| **实时** | 页面打开时浏览器直接请求懂球帝/Sofascore 接口 | 每个访问者看到的都是最新数据，无需服务器 |
| **每日缓存** | GitHub Actions 每天 01:07 UTC 运行 `scripts/update_barca_atletic.ps1` + `scripts/update_u19_sofascore.ps1`，更新 `assets/js/*-cache.js` 并提交 | 作为接口失效/离线时的兜底，提交后 Netlify 自动重新部署 |

> 注意：Sofascore 有 TLS 指纹反爬（curl 一律 403），所以 U19 脚本用本机/运行器上自带的 Edge `--headless --dump-dom` 取 JSON；GitHub Actions 的 `windows-latest` 自带 Edge，可直接跑这两个 PowerShell 脚本。

## YouTube 视频集锦（可选功能）

已完赛比赛自动搜「全场集锦」，并在球员集锦频道（默认 @ArsenKveFCB）里给上场球员搜「按场个人集锦」。**无需任何 API key / 账号**：
- 比赛弹窗显示 🎥 全场集锦 + ⭐ 本场球员个人集锦（点击卡片本站内播放，↗ 直达 YouTube）
- 球员卡片显示 🎥 个人集锦（点击阵容里的球员名弹出）
- **只在有新完赛比赛时搜索**，不每天跑；人工可在 `assets/js/videos-data.js` pin 视频 / 否决错误匹配 / `reSearch` 强制重搜
- 数据写入 `assets/js/dqd-videos-cache.js`（`window.DQD_VIDEOS_CACHE`）

抓取方式（均免 key）：
- **全场集锦（YouTube）**：Edge 无头抓 YouTube 搜索结果页 `/results`，解析内嵌 JSON（与抓 Sofascore 同一套技术；YouTube 反爬时优雅跳过该场、下次重试）
- **球员按场集锦（YouTube）**：拉取 @ArsenKveFCB 频道的公开 RSS 订阅流（`youtube.com/feeds/videos.xml`），按球员名 + 比赛日期匹配
- **B站 兜底源（国内直连可播放）**：Edge 无头渲染 B站 UP 空间页取投稿 bvid，再用 view 接口拿元数据；按「球员关键词」进球员卡片、按「双方队名+日期」进全场集锦。默认 UP：口菐(470189)、「B站一直吞我评论」(1515150312)；视频在卡片带 B站 角标，站内播放器走 bilibili 嵌入

配置（`scripts/update_youtube.ps1` 头部）：`$PlayerChannelHandles` 改 YouTube 球员集锦频道、`$BiliUids` 改 B站 UP 主 UID、`$MaxBiliVideos` 控制每 UP 取最近投稿条数。

> ⚠️ 国内访问 YouTube 需代理：本机跑更新时若无代理会记日志跳过（不标记已搜、下次自动重试）；GitHub Actions 在美区运行器，是更可靠的自动路径。视频缩略图加载失败时卡片保留文字，不影响点击播放/跳转。

## 目录

```
index.html          首页
matches.html        比赛信息
teams/              各梯队页面（barca-atletic.html = B队，juvenil-a.html = U19）
assets/js/data.js   静态梯队数据
assets/js/dqd-barca-atletic*.js    B队 渲染/缓存
assets/js/dqd-u19*.js              U19 渲染/缓存
scripts/            每日更新脚本（PowerShell，仅部署端/本机运行）
_redirects          阻止公开访问 scripts/
```

## 部署到 Netlify

**方式 A：即时上线（Netlify Drop）**
1. 打开 https://app.netlify.com/drop
2. 把站点文件夹拖进去（部署后即得 `https://xxx.netlify.app`）

**方式 B：连接 GitHub（推荐，启用每日自动更新）**
1. 在 GitHub 新建一个公开/私有仓库，名称随意（如 `lamasia`）
2. 本机执行：
   ```bash
   cd 本仓库根目录
   git remote add origin https://github.com/<你的用户名>/lamasia.git
   git branch -M main
   git push -u origin main
   ```
3. Netlify 控制台 → Add new site → Import an existing project → 选择 GitHub 仓库
4. 构建命令留空，发布目录留空（站点就在仓库根目录）
5. 之后每次 push 自动部署；GitHub Actions 每天自动更新数据缓存并触发重新部署

## 修改内容后

改完网页内容后提交推送即可自动上线：
```bash
git add -A
git commit -m "更新"
git push
```

本地另有一份「每日计划任务」（LaMasia_BarcaB_Update / LaMasia_U19_Update）仅用于本机离线使用，与 GitHub Actions 互相独立、互不冲突。
