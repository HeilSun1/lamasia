# 拉玛西亚 · 给 agent / 接手人的说明

静态站（GitHub Pages）+ PowerShell 抓取脚本，每日自动更新数据。

**改样式之前先读 [DESIGN.md](DESIGN.md)**（四档字号、无渐变、无 emoji、无投影、页签用下划线……）。维护方式的决策记录在 [docs/decisions-maintenance.md](docs/decisions-maintenance.md)。

## 一、文件编码（这个仓库最容易踩的坑）

| 文件 | 编码 | 行尾 |
| --- | --- | --- |
| `.html` `.css` `.js` `.md` | UTF-8 **无 BOM** | CRLF |
| `.ps1` | UTF-8 **带 BOM** | CRLF |

`.ps1` 必须带 BOM：Windows PowerShell 5.1 读**无 BOM** 的 UTF-8 会按 GBK 解码，脚本里的中文路径字面量直接编坏成 `D:\瑙嗛绱犳潗\...`，随后 `Set-Content` 报 `Could not find a part of the path`，或者脚本干脆什么都不做、退出码还是 0——看起来"跑过了"，实际一行都没执行。2026-11 切换计划任务时连续三次"提权执行成功但没有任何效果"就是这个原因。

落地写法：

```powershell
# 新建 .ps1：用 PS 5.1 的 Set-Content，它会写 BOM
Set-Content -Path $path -Value $scriptText -Encoding UTF8

# 改已有 .ps1：读要指定 UTF8，写要显式带 BOM
$p = 'C:\绝对\路径\x.ps1'
$t = [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText($p, $t, (New-Object System.Text.UTF8Encoding($true)))
```

改成纯 ASCII 内容（注释、日志全英文）也可以绕开这个问题，临时脚本推荐这么做。

## 二、`update_*.ps1` 必须以 `exit 0` 结尾

`scripts/run_daily_update.ps1` 用 `& $full` 在**同一进程**里调用子脚本，再读 `$LASTEXITCODE`（374-394 行，elfutbol 段在 401-411 行）。子脚本里 `curl.exe -m 45` 超时会返回 28、Edge 无头异常退出会返回别的数字，即使这些失败已经在脚本内部处理掉，那个码仍然留在 `$LASTEXITCODE` 里，父脚本就判这个脚本失败，整轮被标「降级」并推送 Windows 通知。

2026-11 之前 16 个脚本结尾只有一个 `Log`，于是长期出现"缓存写成功了却报降级"。现在每个文件末尾都显式 `exit 0`（附带注释说明原因），**新加脚本照抄这个结尾**。

注意 `&` 调用语义：子脚本里的 `exit` 只结束子脚本，父脚本继续执行——所以 `exit 0` 是安全的。

## 三、每日更新的两条通道

- 本机：计划任务 `LaMasia_Local_Daily_Update`，09:00 / 21:00，`LogonType=S4U`（不管用户是否登录都运行 → session 0，无窗口）。跑 `scripts/run_daily_update.ps1`，16 个脚本，约 340-430 秒，末尾自己 commit + SSH 推送。
- 运行器：`.github/workflows/daily-update.yml`，`cron: 23 16 * * *`（北京 00:23），YouTube 走 `-YouTubeOnly`。

回滚用备份任务 `LaMasia_Local_Daily_Update_Backup`（原 `InteractiveToken` 定义，已禁用）；原始任务 XML 在 `work/s4u/current-task.xml`。

几个操作要点：

- `schtasks /create /xml` **只认 UTF-16**（`[System.Text.Encoding]::Unicode`），UTF-8 会报 `The task XML is malformed`
- 改写/删除任务需要管理员：`Start-Process -Verb RunAs`；但**新建**自己的任务不需要
- `run_daily_update.ps1` 有 2 小时防重复（避免补跑撞正常班次），手动补跑加 `-Force`；另有 `-SelfTest`（只跑 git 流程）、`-SimulateHang`
- 两个通道都写 `assets/data/status.json` 和同一个 git 仓库，别让它们同时跑

## 四、PowerShell 批量改文件的规矩

- 别在命令行里直接写中文/emoji 做字符串替换：命令行走 ANSI 代码页，pattern 会被编坏（曾经把 `<span>` 换成 `sspan>`、把 `📰 新闻` 换成乱码）。中文替换写成 `.ps1` 文件，再 `Get-Content -Raw -Encoding UTF8 | Invoke-Expression`
- 多行字符串替换前先 `$t = $t.Replace("`r`n", "`n")`，仓库是 CRLF，不归一化则 `.Contains()` 全部 MISS
- 别用 `[^<>]` 这类能跨行的字符类做 HTML 批量重排：一次能改出 2400 行 diff
- 改完用 `git diff --stat` 看规模，用 `[Parser]::ParseFile($p, [ref]$tok, [ref]$err)` 验语法——必须传真实变量，`[ref]$null` 会给出假错误
- `[System.IO.File]` 的相对路径按**进程 CWD** 解析，不吃 PowerShell 的 `cd`，一律用绝对路径

## 五、提交

- 数据更新由任务自己 commit + push（`ssh.github.com:443`，直连 github.com 在本机不通）
- 别用 `git add -A`：`work/`、`scripts/dqd_sched.json` 这类临时物会被扫进提交，只 `git add` 具体文件
- `work/` 是排障用的临时目录，不属于站点内容
