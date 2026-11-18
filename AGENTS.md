# 拉玛西亚 · 给 agent / 接手人的说明

静态站（GitHub Pages）+ PowerShell 抓取脚本，每日自动更新数据。

- 样式规则：[DESIGN.md](DESIGN.md)（四档字号、无渐变、无 emoji、无投影、页签用下划线）
- 决策与理由：[docs/decisions.md](docs/decisions.md)（按主题分组）
- 数据出口清单：[docs/surfaces.md](docs/surfaces.md)｜名单缺口：[docs/roster-gaps.md](docs/roster-gaps.md)

## 一、数据口径（最常改错的地方）

- **名单只认官方注册名单**：`assets/js/data.js` 是唯一权威（14 支梯队，含预备队 30 人），Sofascore 只提供生日/国籍/身价/伤病/照片，**不决定谁在队里**。2026-11 曾拿 Sofascore 名单裁剪官方名单，把 U19 B 的三个门将删光——它那份名单本身缺人。
- 一个概念只许一个出口：头像 `assets/js/avatar.js`、中文名 `assets/js/name-zh.js`、新闻条目 `assets/js/news-item.js`、梯队标签 `assets/js/teams.js`、名字归一 `assets/js/people.js`。新增页面时把新出口补进 `docs/surfaces.md`，不要另写一份。

## 二、文件编码

| 文件 | 编码 | 行尾 |
| --- | --- | --- |
| `.html` `.css` `.js` `.md` | UTF-8 **无 BOM** | CRLF |
| `.ps1` | UTF-8 **带 BOM** | CRLF |

`.ps1` 少了 BOM，Windows PowerShell 5.1 会按 GBK 解码，脚本里的中文路径变成 `D:\瑙嗛绱犳潗\...`，随后报 `Could not find a part of the path`，或者一行都没执行、退出码还是 0。2026-11 切换计划任务时连续三次「提权执行成功但没效果」就是这个原因。

```powershell
Set-Content -Path $path -Value $scriptText -Encoding UTF8          # 新建
[System.IO.File]::WriteAllText($p, $t, (New-Object System.Text.UTF8Encoding($true)))  # 改写
```

临时脚本写纯 ASCII（注释、日志全英文）也能绕开。

## 三、`update_*.ps1` 必须以 `exit 0` 结尾

`scripts/run_daily_update.ps1` 用 `& $full` 在**同一进程**里调子脚本再读 `$LASTEXITCODE`。子脚本里 `curl.exe -m 45` 超时返回 28、Edge 无头异常退出返回别的码，即使失败已被处理，那个码仍留在 `$LASTEXITCODE` 里，父脚本就判整轮「降级」并弹通知。所以每个脚本末尾显式 `exit 0`（`&` 下 `exit` 只结束子脚本，安全），**新脚本照抄**。

## 四、每日更新的两条通道

- 本机：计划任务 `LaMasia_Local_Daily_Update`，09:00 / 21:00，`LogonType=S4U`（session 0，无窗口），跑 16 个脚本约 340–430 秒，末尾自己 commit + SSH 推送。
- 运行器：`.github/workflows/daily-update.yml`，`cron: 23 16 * * *`（北京 00:23），YouTube 走 `-YouTubeOnly`。
- 回滚用 `LaMasia_Local_Daily_Update_Backup`（原 `InteractiveToken` 定义，已禁用）；原始 XML 在 `work/s4u/current-task.xml`。
- `schtasks /create /xml` **只认 UTF-16**；改写/删除任务要管理员（`Start-Process -Verb RunAs`），新建自己的任务不用。
- `run_daily_update.ps1` 有 2 小时防重复，补跑加 `-Force`；另有 `-SelfTest`（只跑 git 流程）、`-SimulateHang`。
- 两个通道都写 `assets/data/status.json` 和同一个 git 仓库，别让它们同时跑。

## 五、PowerShell 批量改文件

- 别在命令行直接写中文做替换：命令行走 ANSI 代码页，pattern 会被编坏（曾把 `<span>` 改成 `sspan>`）。中文替换写成 `.ps1`，再 `Get-Content -Raw -Encoding UTF8 | Invoke-Expression`。
- 多行替换前先 `$t = $t.Replace("`r`n", "`n")`，否则 CRLF 仓库里 `.Contains()` 全 MISS。
- 别用 `[^<>]` 这类能跨行的字符类重排 HTML：一次能改出 2400 行 diff。
- 改完 `git diff --stat` 看规模；`[Parser]::ParseFile($p, [ref]$tok, [ref]$err)` 验语法，`[ref]$null` 会给假错误。
- `[System.IO.File]` 的相对路径按**进程 CWD** 解析，不吃 `cd`，一律绝对路径。

## 六、提交

- 数据更新由任务自己 commit + push（`ssh.github.com:443`，直连 github.com 在本机不通）。
- 别用 `git add -A`：`work/`、`scripts/dqd_sched.json` 会被扫进提交，只 `git add` 具体文件。
- `work/` 是排障用的临时目录，不入库。

## 七、三问自检

改代码前，如果这次改动依赖「某条数据不可信 / 某个源会断」，先过这三问：

1. **这件事是不是被捆在一起了？** 选源、缓存、新鲜度是三件事。`renderScheduleSf()` 曾把「用不用 Sofascore 赛程」和「缓存是否 24 小时内」写成一个 `return false`，数据明明在、代码自己不用。
2. **这个代价验证过吗？** 别拿「可能会显示暂无赛程」当理由，先跑一遍看一眼。
3. **现状那条规则在防什么？** 说不出就先问，别直接删。
