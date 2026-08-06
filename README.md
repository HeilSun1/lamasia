# 拉玛西亚 · La Masia 信息站（FC Barcelona 青训）

球迷非官方信息站。**B队（Barça Atlètic）** 数据来自懂球帝，**U19（Juvenil A）** 数据来自 Sofascore。

## 数据更新机制

| 层 | 方式 | 说明 |
|---|---|---|
| **实时** | 页面打开时浏览器直接请求懂球帝/Sofascore 接口 | 每个访问者看到的都是最新数据，无需服务器 |
| **每日缓存** | GitHub Actions 每天 01:07 UTC 运行 `scripts/update_barca_atletic.ps1` + `scripts/update_u19_sofascore.ps1`，更新 `assets/js/*-cache.js` 并提交 | 作为接口失效/离线时的兜底，提交后 Netlify 自动重新部署 |

> 注意：Sofascore 有 TLS 指纹反爬（curl 一律 403），所以 U19 脚本用本机/运行器上自带的 Edge `--headless --dump-dom` 取 JSON；GitHub Actions 的 `windows-latest` 自带 Edge，可直接跑这两个 PowerShell 脚本。

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
