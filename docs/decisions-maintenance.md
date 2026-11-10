# 决策记录：维护 / 每日更新 / 公开方式

> 用途：把「为什么这样做」固定下来，避免下次改之前重新推一遍。
> 每条 = 结论 + 理由。未定的进「待定问题」，定了就搬上来。

## 已定

### D1 讨论强度：深挖

结论：这轮按「深挖」走——主动找风险、边界和遗漏，不只补明显缺口。
理由：用户问的是「怎么优化」，但勘察已暴露多个尚未被决定的真问题（仓库公开面、脚本可裸下载、两条更新通道是否合并、故障可见性）。细问只会把它们列出来，深挖才会逼出「哪种权衡其实不能接受」。

### D2 决策记录落盘

结论：决策写进本文件，每条带理由，另列待定问题。
理由：这套系统的心智模型目前只存在于脚本注释和 README 里，而 README 已漂移（写着「01:07 UTC」「09/15/21 三班」，实际是 00:23 UTC 与 09:00/21:00 两班）。


### D3 数据新鲜度：保持现状，不加频次

结论：够用就行，维持本机 09:00 / 21:00 + 运行器 00:23 三班，不做「赛后触发」。
理由：用户明确「保持现状就好」。加频次会撞 fcbarcelona.es 的风控（2026-09-21 起官方站对无头 Edge 抓取有风控），收益（赛后当晚看到集锦）对当前受众不成立。
代价（已知并接受）：西班牙傍晚的比赛，集锦最快次日 09:00 那轮才上站。


### D4 托管：留在 GitHub Pages，不迁 Cloudflare / Netlify

结论：站点继续用 heilsun1.github.io/lamasia，不迁托管；_redirects 视为无效文件（保留无害，但别指望它拦任何路径）。
理由：本机实测 github.io 982ms 可达，而 pages.dev 4.1s、github.com 直接超时。迁 CF 会更慢，且「国内不好操作」的直觉被实测推翻。仓库必须公开（Pages 免费的前提），但脚本里没有任何真实密钥（唯一命中是 update_youtube.ps1:768 的占位 cookie uvid3=lamasia），暴露面只是抓取策略，不值得为它改架构。


### D5 系统还要继续长 → 收敛 Sofascore 四脚本

结论：站还会加数据（用户 2026-11-10 明确），所以把 update_u19_sofascore.ps1 / update_u18_sofascore.ps1 / update_u16_sofascore.ps1 / update_barca_atletic_sf.ps1 收敛成唯一实现 scripts/update_sofascore.ps1 -Tier u19|u18|u16|b，四个旧文件降级成薄转发器（保持调用方零改动）。
理由与量化：u19↔u18 差异 72/65 行（约 340 行完全相同），u18↔u16 只差 22/23 行（团队 id、缓存路径、日志路径、头部注释），四个文件合计约 1500 行同构。update_elfutbol_details.ps1 -Tier … 已经验证过这个模式。
风险控制：旧文件名保留为转发器 → un_daily_update.ps1、daily-update.yml 都不用动；合并后必须手动跑一遍 -Tier u18 并与现有 dqd-u18-cache.js 对比，差异应只有时间戳类字段。


### D6 计划任务弹窗：原方案（wscript 宿主）已被实证否决，改用候选方案

**历史结论（2026-08-19 曾实施，失败）**：把任务动作从 powershell.exe -WindowStyle Hidden -File run_daily_update.ps1 改成 wscript.exe "…\scripts\run_hidden.vbs"。
**失败证据**：run_hidden.vbs 于 2026-08-19 提交（commit 7b508f1）当天 19:46 那轮，主日志只有「开始本机每日更新」、**没有结束行**；子日志显示跑到 u18-update.log 19:48:00「开始 U18 更新」之后再无任何输出，直到次日 11:17 才有下一轮。即整轮在 U18（Sofascore）附近挂死，被任务的 1 小时执行上限杀掉 → 表现为「每日更新直接失败」。全日志 199 次开始 / 174 次结束或汇总，缺口与这类中断吻合。

**候选方案（按风险从低到高，均未验证）**：
1. 任务改为「不管用户是否登录都运行」（S4U）：跑在后台会话，天生无窗口，不需要 VBS。待验证 Edge 无头在 session 0 能否正常抓取。
2. 复现并定位 VBS 为何在 U18 挂住（怀疑 Edge 无头在无控制台会话里卡在某个等待上），再决定是否回到 VBS。
3. 接受窗口（现状），只把执行上限从 1 小时压低。
## 勘察事实（2026-11-10 验证，供后续决策引用）

- **本机通道**：计划任务 `LaMasia_Local_Daily_Update`，每天 09:00 / 21:00 跑 `scripts/run_daily_update.ps1`（16 个脚本）。2026-11-10 09:32 那轮 340s，`update_elfutbol_details.ps1 -Tier infantil-b` 退出码 1 → 整轮 `exit 2` 降级，已发 Windows 通知（`scripts/local-daily-update.log`、`assets/data/status.json`）。
- **运行器通道**：`.github/workflows/daily-update.yml`，`cron: 23 16 * * *`（北京 00:23），跑懂球帝/Sofascore/官网/西媒/周报 + `update_youtube.ps1 -YouTubeOnly` 产出分片。两条通道靠「只 add 指定文件 + rebase 重试 + 分片物理隔离」互不覆盖。
- **实际托管是 GitHub Pages**：`https://heilsun1.github.io/lamasia/` 返回 200，当天改动已上线。README 里的 Netlify 方案已不适用。
- **`_redirects` 在 Pages 上无效**（访问返回 404）：`/scripts/run_daily_update.ps1`（200, octet-stream）、`/scripts/dqd_sched.json`、`/assets/data/status.json`、`/README.md` 均可直接下载。
- 站点根目录没有 `robots.txt`、没有 `sitemap.xml`；页脚硬写「数据更新截至 2026 年 8 月」。
- 维护资产：33 个 PowerShell 脚本、`scripts/selftest/`（e2e 故障注入 + 横幅判定）、DESIGN.md；`scripts/*.log` 与本地状态文件已正确 gitignore。


### 补充勘察（2026-11-10 第二轮，用户本机实测）

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


### 补充勘察（2026-11-10 第三轮：为什么每天弹 cmd 窗口）

计划任务 LaMasia_Local_Daily_Update 的动作是：
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "…\scripts\run_daily_update.ps1"，Principal = 22534 / Interactive / Limited。

问题：-WindowStyle Hidden 只是让 PowerShell 自己隐藏，控制台进程仍会被创建（启动瞬间可见，且在某些会话下停留）。而仓库里**早就写了一个专门解决这事的包装器** scripts/run_hidden.vbs（wscript.exe 是 GUI 宿主，本身不产生控制台；注释里还记着「脚本目录含中文，不能把中文路径传给 WScript.Shell.Run」这个坑），但它**没有任何调用方**——注册脚本没引用它，workflow 也没引用。属于旧任务时代留下的、写好却没接上的零件。

另外确认：全部 scripts/*.ps1 里**没有一处 Start-Process**，Edge / node 都是调用运算符 & 在同一控制台里跑的，所以不会有子进程另开窗口。换 VBS 宿主即可彻底消掉窗口。

## 待定问题

- 站点是「希望被搜到」还是「自己看 + 少数人知道」？（决定 robots/noindex、仓库公开面、脚本要不要挪出发布目录）
- 数据新鲜度的真实目标是什么？（决定 09:00/21:00 两班是否够，以及要不要改成赛后触发）
- 降级/失败时，谁应该在多长时间内知道？现在的两条通道（Windows 通知、站点横幅）都依赖「人恰好在线/恰好打开站点」。
