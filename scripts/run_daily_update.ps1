# ═══════════════════════════════════════════════════════════════
#   拉玛西亚信息站 · 本机每日更新 + SSH 自动推送
#
#   1. 自愈上一轮可能留下的冲突/锁残留（★ 绝不能省，见下）
#   2. 运行全部缓存更新脚本（本机真实 IP 抓 Sofascore 稳定，可靠）
#   3. git 提交 + SSH push 上线
#
#   GitHub 运行器上的 Sofascore 抓取常被限流返回空（防空缓存已保护，但数据可能过期），
#   本机是主数据源，运行器工作流 daily-update.yml 作为兜底。
#   由 Windows 计划任务每天调用（见 register_local_daily_task.ps1）。
#   日志：scripts/local-daily-update.log
#
#   ★ 为什么必须有"自愈"这一步：
#   2026-09-15 一轮运行进程被杀，在工作区留下带冲突标记的文件。
#   此后每轮开头 rebase 都失败 → 旧版脚本 exit 0 跳过整轮 → 再也没人清理那些残留，
#   于是每天静默跳过、自锁死，站点停更 3 天无人察觉（历史上该分支命中过 18 次，
#   其中 2026-09-04→09-09 连续 6 天）。自愈步骤就是打破这个死循环的。
#
#   退出码：0 = 正常；2 = 降级（已自愈或非核心源失败，站点仍在更新）；
#          1 = 需人工介入（源码冲突 / 推送失败 / 核心缓存未刷新）
# ═══════════════════════════════════════════════════════════════
param(
  [string] $RepoRoot = "",
  [switch] $SelfTest,        # 跳过抓取脚本，只跑 git 全流程（秒级，供自测）
  [switch] $SimulateHang,    # 同步后挂起，供看门狗场景测试
  [string] $TestFailScript = "",   # 指定脚本名视作失败，注入用
  [string] $TestBogusAdd = ""      # 注入不存在的 add 路径，测"add 失败≠无变化"
)

$ErrorActionPreference = "Continue"   # 单个脚本失败不中断整体

if (-not $RepoRoot) { $RepoRoot = Split-Path -Parent $PSScriptRoot }
$Root = $RepoRoot
Set-Location $Root

. (Join-Path $PSScriptRoot "lib\lamasia-common.ps1")
Set-LamAsiaLogFile (Join-Path $Root "scripts\local-daily-update.log")

# ── 运行标识与心跳 ──
$runId       = Get-Date -Format 'yyyyMMdd-HHmmss'
$t0          = Get-Date
$startedUtc  = (Get-Date).ToUniversalTime().ToString('o')
$localState  = Join-Path $Root "scripts\local-run-state.json"
$siteStatus  = Join-Path $Root "assets\data\status.json"

$Healed          = New-Object System.Collections.ArrayList
$Failures        = New-Object System.Collections.ArrayList
$FailedScripts   = New-Object System.Collections.ArrayList
$StaleCaches     = New-Object System.Collections.ArrayList
$BlockedCodes    = New-Object System.Collections.ArrayList
$script:SourceConflict = $false
$script:AddFailed      = $false
$script:PushOk         = $false

# 心跳必须在最开头写：进程若被杀，看门狗只能靠"有 start 无 finish"来发现
$hb = Read-JsonFile $localState
if (-not $hb) { $hb = New-Object psobject }
$hb | Add-Member -NotePropertyName runId          -NotePropertyValue $runId        -Force
$hb | Add-Member -NotePropertyName runStartedUtc  -NotePropertyValue $startedUtc   -Force
$hb | Add-Member -NotePropertyName runFinishedUtc -NotePropertyValue $null        -Force
Write-JsonFile $localState $hb

# 核心产物：这些没刷新说明主要数据源出问题了
$CoreCaches = @(
  'assets/js/dqd-u19-cache.js'
  'assets/js/dqd-u18-cache.js'
  'assets/js/dqd-u16-cache.js'
  'assets/js/dqd-barca-atletic-cache.js'
  'assets/js/fcb-youth-schedules.js'
)
# 非核心：允许失败/不刷新，只降级不报红
$SoftCaches = @(
  'assets/js/dqd-videos-cache.js'
  'assets/js/weekly-album-cache.js'
  'assets/js/sport-news-cache.js'
  'assets/js/md-news-cache.js'
  'assets/js/lamasia-official-news-cache.js'
  'assets/js/dqd-barca-news-cache.js'
  'assets/js/dqd-u19-news-cache.js'
  'assets/js/dqd-u18-news-cache.js'
  'assets/js/dqd-u16-news-cache.js'
)
$CoreScripts = @('update_u19_sofascore.ps1', 'update_u18_sofascore.ps1', 'update_u16_sofascore.ps1',
                 'update_barca_atletic.ps1', 'update_fcb_youth_schedules.ps1')

$UpdateScripts = @(
  'update_barca_atletic.ps1',
  'update_barca_atletic_sf.ps1',
  'update_barca_news.ps1',
  'update_u19_sofascore.ps1',
  'update_u19_news.ps1',
  'update_u18_news.ps1',
  'update_u16_news.ps1',
  'update_u18_sofascore.ps1',
  'update_u16_sofascore.ps1',
  'update_fcb_youth_schedules.ps1',
  'update_fcb_news.ps1',
  'update_sport_news.ps1',
  'update_md_news.ps1',
  'update_youtube.ps1',
  'update_weekly_album.ps1'
)

# 固定存在的缓存（这些一直在仓库里，缺了就是仓库出了问题）
$AddPaths = @(
  'assets/js/dqd-barca-atletic-cache.js', 'assets/js/dqd-barca-atletic-sf-cache.js',
  'assets/js/dqd-barca-atletic-sf-details-cache.js', 'assets/js/dqd-barca-news-cache.js',
  'assets/js/dqd-u19-news-cache.js', 'assets/js/dqd-u18-news-cache.js', 'assets/js/dqd-u16-news-cache.js',
  'assets/js/lamasia-official-news-cache.js', 'assets/js/sport-news-cache.js', 'assets/js/md-news-cache.js',
  'assets/js/dqd-u19-cache.js', 'assets/js/dqd-u18-cache.js', 'assets/js/dqd-u16-cache.js',
  'assets/js/dqd-u19-details-cache.js', 'assets/js/dqd-u18-details-cache.js', 'assets/js/dqd-u16-details-cache.js',
  'assets/js/dqd-videos-cache.js', 'assets/js/weekly-album-cache.js', 'assets/js/fcb-youth-schedules.js'
)
# 今天才生成的（首次运行或抓取失败时可能不存在，缺席不算错误）
$GeneratedPaths = @(
  'assets/data/status.json',
  'assets/img/players/dqd',
  'scripts/dqd-videos-yt-shard.js'
)

# SSH 非交互推送环境（本机 remote 已是 git@github.com）
$env:GIT_SSH_COMMAND = "ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new"

# ── 提前收尾：源码冲突是终止条件 ──
# 定义在主流程之前（PS 要求先定义后调用）。
function Complete-Run {
  $fin  = (Get-Date).ToUniversalTime().ToString('o')
  $blk  = ($BlockedCodes.Count -gt 0)
  $txt  = if ($blk) { 'blocked' } else { 'ok' }
  $code = if ($blk) { 1 } else { 0 }

  $prev = Read-JsonFile $siteStatus
  $succ = if ($prev -and $prev.lastSuccessUtc) { $prev.lastSuccessUtc } else { $startedUtc }
  Publish-SiteStatus -Root $Root -RunId $runId -StartedUtc $startedUtc -FinishedUtc $fin `
    -LastSuccessUtc $succ -Source 'local' -Status $txt -ExitCode $code -ConsecutiveFailures 0 `
    -Blocked $blk -BlockedSinceUtc $null -BlockedCodes @($BlockedCodes) `
    -FailedScripts @($FailedScripts) -StaleCaches @($StaleCaches) -Healed @($Healed)

  Log-Line ("======== 汇总 run=$runId 提前结束 自愈=$($Healed.Count) " +
            "状态=$(if($blk){'需人工'}else{'OK'}) ========")

  # 结束心跳必须写：否则看门狗会把它当成"有 start 无 finish"的挂死运行
  $h = Read-JsonFile $localState
  if (-not $h) { $h = New-Object psobject }
  $h | Add-Member -NotePropertyName runFinishedUtc -NotePropertyValue $fin -Force
  $h | Add-Member -NotePropertyName exitCode -NotePropertyValue $code -Force
  Write-JsonFile $localState $h

  if ($blk) {
    $msg = "有手写源码改动发生冲突，已完整保留在 stash 里等待处理。`n" +
           "查看：git stash list`n恢复：git stash pop`n" +
           "站点缓存数据仍是最新的，未受影响。"
    if ($SelfTest) { Log-Line "  (自测模式：跳过弹窗)" }
    else { Send-LamAsiaAlert -Title "拉玛西亚更新：源码冲突待处理" -Body $msg -Key 'source_conflict' }
  }
  exit $code
}

function Stop-SourceConflict([string[]]$paths) {
  Log-Line "  ✗ 有 $($paths.Count) 个手写源码文件改动冲突，改动将存入 stash 保留，本轮提前结束"
  foreach ($f in $paths) { Log-Line "      · $f" }
  $msg = "lamasia-src-$runId"
  [void](Invoke-Git $Root (@('stash', 'push', '-u', '-m', $msg, '--') + $paths))
  # ★ stash push 只是把改动「复制」进 stash，并不会把文件还原成 HEAD 版本 ——
  #   工作区那个文件仍然带着冲突标记，下轮开头会命中同一条路径，永远出不来。
  #   所以这里显式把工作区还原干净，让下一轮能正常干活。改动本身已在 stash 里。
  [void](Invoke-Git $Root (@('checkout', 'HEAD', '--') + $paths))
  $script:SourceConflict = $true
  [void]$BlockedCodes.Add('source_conflict')
  Complete-Run
}

Log-Line "======== 开始本机每日更新 run=$runId ========"

# ═══ 0. 自愈上一轮残留（★ 见文件头说明，绝不能省） ═══
Clear-StaleGitState -Root $Root -Healed $Healed

# 工作区里带冲突标记的文件（按内容判定，不看索引状态）
$cr = Get-ConflictReport $Root
if ($cr.Generated.Count -gt 0) {
  Log-Line "  ! 发现 $($cr.Generated.Count) 个自动生成文件带冲突标记，以远端为准消解"
  foreach ($f in $cr.Generated) { Log-Line "      · $f" }
  [void](Invoke-Git $Root (@('checkout', 'origin/main', '--') + $cr.Generated))
  [void]$Healed.Add('cache_conflict_healed')
}
if ($cr.Source.Count -gt 0) {
  # 手写源码的改动绝不能丢 → 存进 stash 保留，然后**立刻收尾退出**。
  #
  # ★ 为什么不能"stash 完继续跑"（曾经这么写过，是真 bug）：
  #   git stash push 只是把改动复制进 stash，**工作区文件仍然带着冲突标记**。
  #   继续往下走的话，后面那步 `git stash pop` 会把它又恢复回来 ——
  #   等于白 stash，还会连带把刚才那个 stash 吞掉（表现为"改动不见了"）。
  #   而且带着冲突标记去 rebase 也必然失败。源码冲突本来就是终止条件，
  #   直接退出最干净：工作区被 stash 恢复到 HEAD 版本，下轮开头不会再有残留。
  Stop-SourceConflict $cr.Source
}

# 历史残留 stash：只提醒，不阻塞、不自动 apply（自动 apply 是新的自锁来源）
$stashes = (Invoke-Git $Root @('stash', 'list')).Out
if ($stashes) {
  Log-Line "  ! 仓库里有 stash（不会自动还原，需要时手动处理）："
  foreach ($l in ($stashes -split "`n")) { if ($l.Trim()) { Log-Line "      $l" } }
}

# ═══ 0.5 同步远端 ═══
[void](Invoke-Git $Root @('config', 'user.name',  'lamasia-local-updater'))
[void](Invoke-Git $Root @('config', 'user.email', 'lamasia-local-updater@local'))

$fetch = Invoke-Git $Root @('fetch', 'origin', '--prune')
if (-not (Assert-Git "拉取远端" $fetch $Failures)) {
  [void]$BlockedCodes.Add('fetch_failed')
  Log-Line "  ! 拉不到远端（网络或鉴权问题），本次跳过推送"
}

# 存本轮的改动（如周报），用 message 精确寻址而不是靠计数差
$runStash = "lamasia-run-$runId"
[void](Invoke-Git $Root @('stash', 'push', '-u', '-m', $runStash))

# ★ 记下本轮新建的那个 stash 的 ref 名（如 stash@{0}），后面只弹它。
#   工作区干净时 `stash push` 什么都不建（"No local changes to save"），
#   此时若无条件 `stash pop`，弹出来的是**历史残留 stash** —— 9/04、9/15、9/18 三次停更全是这一个根因。
#   （注意不能用 sha：`git stash pop <sha>` 会报 "is not a stash reference"，只认 stash@{n}。）
$runStashRef = $null
$slOut = (Invoke-Git $Root @('stash', 'list', '--format=%gd|%s')).Out
foreach ($l in ($slOut -split "`n")) {
  if ($l -match '^(stash@\{\d+\})\|' -and $l.Contains($runStash)) { $runStashRef = $Matches[1]; break }
}
if ($runStashRef) { Log-Line "  · 本轮改动已存入 $runStashRef，稍后只还原它" }

# rebase 到远端；冲突按类分级处理。core.editor 强制非交互 —— 默认会开编辑器，
# 在隐藏窗口的任务里会永久挂起（这本身就是一种"进程挂死"来源）
$rebaseOk = $false
for ($i = 1; $i -le 8; $i++) {
  $rb = Invoke-Git $Root @('-c', 'core.editor=true', 'rebase', 'origin/main')
  if ($rb.Code -eq 0) { $rebaseOk = $true; break }

  $unmerged = @((Invoke-Git $Root @('diff', '--name-only', '--diff-filter=U')).Out -split "`n" | Where-Object { $_.Trim() })
  $srcConflict = $false
  foreach ($f in $unmerged) {
    if (-not (Test-AutoGeneratedFile $Root $f.Trim())) { $srcConflict = $true; break }
  }

  if ($srcConflict -or $unmerged.Count -eq 0) {
    Log-Line "  ✗ rebase 与远端冲突（含手写源码改动），中止并保留本地改动"
    [void](Invoke-Git $Root @('rebase', '--abort'))
    # 走同一条终止路径：把冲突的源码存进 stash 并立刻收尾，
    # 不要"设个标志继续跑"——那条路后面还会 pop stash，会把这批改动又带回工作区
    $srcPaths = @($unmerged | Where-Object { -not (Test-AutoGeneratedFile $Root $_.Trim()) })
    if ($srcPaths.Count -eq 0) {
      # 没有源码文件（纯属 rebase 意外失败），按仓库错误处理
      [void]$BlockedCodes.Add('repo_error')
      Complete-Run
    }
    Stop-SourceConflict $srcPaths
  }

  Log-Line "  ! rebase 冲突全在自动生成文件上（第 $i 轮），以远端为准消解后继续"
  [void](Invoke-Git $Root @('checkout', 'origin/main', '--') + $unmerged)
  [void](Invoke-Git $Root @('add', '--') + $unmerged)
  [void]$Healed.Add('cache_conflict_healed')
  $cont = Invoke-Git $Root @('-c', 'core.editor=true', 'rebase', '--continue')
  if ($cont.Code -ne 0) {
    Log-Line "  ✗ rebase --continue 失败，中止"
    [void](Invoke-Git $Root @('rebase', '--abort'))
    [void]$BlockedCodes.Add('repo_error')
    break
  }
}
if (-not $rebaseOk -and -not $script:SourceConflict) {
  Log-Line "  ✗ rebase 未能完成（超过重试上限或无进展）"
  [void]$BlockedCodes.Add('repo_error')
}

# 还原本轮 stash（只弹本轮自己建的那个），冲突同样分级处理
if (-not $runStashRef) {
  Log-Line "  (工作区本来就干净，本轮没有要还原的改动；不碰历史 stash)"
} else {
  # 弹之前再确认这个 ref 仍指向本轮那个 stash（防止中途有别的 stash 插队）
  $stillOurs = $false
  $slNow = (Invoke-Git $Root @('stash', 'list', '--format=%gd|%s')).Out
  foreach ($l in ($slNow -split "`n")) {
    if ($l.StartsWith("$runStashRef|") -and $l.Contains($runStash)) { $stillOurs = $true; break }
  }
  if (-not $stillOurs) {
    Log-Line "  ! $runStashRef 已不再指向本轮 stash（被外部改动过），跳过还原"
  } else {
    $pop = Invoke-Git $Root @('stash', 'pop', $runStashRef)
    if ($pop.Code -ne 0) {
      $cr2 = Get-ConflictReport $Root
      if ($cr2.Generated.Count -gt 0) {
        [void](Invoke-Git $Root (@('checkout', 'origin/main', '--') + $cr2.Generated))
        Log-Line "  ! 还原改动时 $($cr2.Generated.Count) 个自动生成文件冲突，已以远端为准消解"
        [void]$Healed.Add('cache_conflict_healed')
      }
      if ($cr2.Source.Count -gt 0) {
        # ★ 不能"设个标志继续跑"：冲突标记会留在工作区，本轮后面的提交必然失败，
        #   下一轮开头又会命中同一条路径 → 自锁死（9/15 就是这么停了三天）。
        #   pop 冲突时 stash 本身不会被 drop，改动仍在里面；把工作区还原干净后立刻收尾。
        Log-Line "  ✗ 还原改动时手写源码冲突（改动仍保留在 $runStashRef 里），本轮提前结束"
        foreach ($f in $cr2.Source) { Log-Line "      · $f" }
        [void](Invoke-Git $Root (@('restore', '--source=origin/main', '--staged', '--worktree', '--') + $cr2.Source))
        $script:SourceConflict = $true
        [void]$BlockedCodes.Add('source_conflict')
        Complete-Run
      }
    }
  }
}

if ($SimulateHang) {
  Log-Line "  (自测：模拟挂起，等待被外部杀死)"
  Start-Sleep -Seconds 3600
}

# ═══ 1. 运行缓存更新脚本 ═══
foreach ($s in $UpdateScripts) {
  $full = Join-Path $Root "scripts\$s"
  if (-not (Test-Path $full)) { continue }
  Log-Line "  → $s"
  $global:LASTEXITCODE = 0     # 关键：子脚本若不设退出码会残留上一轮的值
  $err = $null
  if ($SelfTest) {
    $code = 0
  } elseif ($TestFailScript -and $s -eq $TestFailScript) {
    $code = 1; $err = "(自测注入的失败)"
  } else {
    try { & $full } catch { $err = $_.Exception.Message }
    $code = $LASTEXITCODE
  }
  if ($err -or $code -ne 0) {
    $isCore = $CoreScripts -contains $s
    Log-Line "      ✗ $s 失败（退出码 $code）$err"
    [void]$FailedScripts.Add($s)
    [void]$Failures.Add("$s (exit $code)")
  }
}

# 产物新鲜度审计 —— 补"脚本只 Log 不 exit"的漏洞（如 update_youtube.ps1 的写入失败分支）
# -SelfTest 会跳过全部抓取脚本，此时审计没有意义，只会产生误导性噪声
if (-not $SelfTest) {
  $tolerance = $t0.AddMinutes(-5)
  foreach ($c in ($CoreCaches + $SoftCaches)) {
    $u = Get-CacheUpdated $Root $c
    if ($null -eq $u) { continue }               # 无 updated 字段（details 等），跳过
    if ($u -lt $tolerance) { [void]$StaleCaches.Add($c) }
  }
}

$staleCore = @($StaleCaches | Where-Object { $CoreCaches -contains $_ })
if ($staleCore.Count -gt 0) {
  Log-Line "  ✗ 核心缓存未刷新：$($staleCore -join ', ')"
  [void]$BlockedCodes.Add('stale')
}
$staleSoft = @($StaleCaches | Where-Object { $SoftCaches -contains $_ })
if ($staleSoft.Count -gt 0) { Log-Line "  · 非核心缓存未刷新：$($staleSoft -join ', ')" }

$failCore = @($FailedScripts | Where-Object { $CoreScripts -contains $_ })
if ($failCore.Count -gt 0) { [void]$BlockedCodes.Add('stale') }

# ═══ 2. 提交 + 推送 ═══
$prevStatus = Read-JsonFile $siteStatus
$lastSuccess = if ($prevStatus -and $prevStatus.lastSuccessUtc) { $prevStatus.lastSuccessUtc } else { $startedUtc }
$finishUtc = (Get-Date).ToUniversalTime().ToString('o')

# ── 状态文件与 git add 有个先后依赖，这里按两步走 ──
#   status.json 必须赶在 add 之前存在，否则 add 会报 pathspec 不匹配；
#   而 add 的结果（add_failed）又必须写进 status.json。
#   所以：先写一版 → add → 若 add 失败再补写一版并补一次 add。
function Publish-CurrentStatus {
  $b  = ($BlockedCodes.Count -gt 0)
  $sc = if ($b) { 'blocked' } elseif ($Failures.Count -or $StaleCaches.Count) { 'degraded' } else { 'ok' }
  # 与收尾处同一套语义：0 正常 / 2 降级 / 1 需人工
  $ec = if ($b) { 1 } elseif ($Failures.Count -or $StaleCaches.Count -or $Healed.Count) { 2 } else { 0 }
  Publish-SiteStatus -Root $Root -RunId $runId -StartedUtc $startedUtc -FinishedUtc $finishUtc `
    -LastSuccessUtc $lastSuccess -Source 'local' `
    -Status $sc -ExitCode $ec -ConsecutiveFailures 0 -Blocked $b -BlockedSinceUtc $null `
    -BlockedCodes @($BlockedCodes) -FailedScripts @($FailedScripts) `
    -StaleCaches @($StaleCaches) -Healed @($Healed)
  return @{ Blocked = $b; StatusText = $sc; StatusExit = $ec }
}

$st = Publish-CurrentStatus

# $AddPaths 里的路径必须存在，缺了就是真错误，不能静默忽略；
# $GeneratedPaths 是「今天才生成」的，允许缺席（否则首次运行/图片未抓到就会误报 add 失败）。
$addPaths = $AddPaths
foreach ($p in $GeneratedPaths) {
  if (Test-Path (Join-Path $Root $p)) { $addPaths += $p }
}
if ($TestBogusAdd) { $addPaths += $TestBogusAdd }
$add = Invoke-Git $Root (@('add', '--') + $addPaths)
if ($add.Code -ne 0) {
  # 旧版在这里是 2>$null 吞掉错误 → 暂存区为空 → 误判"缓存无变化"→ 当天什么都不做
  Log-Line "  ✗ git add 失败（退出码 $($add.Code)）：$($add.Out)"
  $script:AddFailed = $true
  [void]$BlockedCodes.Add('add_failed')
  # 补写状态文件（带上 add_failed）并补一次 add，让它进本次提交
  $st = Publish-CurrentStatus
  [void](Invoke-Git $Root @('add', '--', 'assets/data/status.json'))
}

$blocked    = $st.Blocked
$statusText = $st.StatusText
$statusExit = $st.StatusExit

$staged = (Invoke-Git $Root @('diff', '--cached', '--name-only')).Out
if (-not $staged -and $script:AddFailed) {
  Log-Line "  ✗ 暂存区为空且 add 已失败 —— 不是'无变化'，本次不提交也不推送"
} else {
  # 即使缓存没变也照常提交并推送：status.json 每轮都在更新，
  # 且推送成功是"站点数据已落地"的判定依据（横幅过期判定靠它），不能跳过
  if (-not $staged) { Log-Line "  缓存无变化，仅提交状态文件" }
  $commit = Invoke-Git $Root @('commit', '--allow-empty', '-m', "chore: local daily update $(Get-Date -Format 'yyyy-MM-dd HH:mm')")
  $commitOk = Assert-Git "提交" $commit $Failures
  if (-not $commitOk) { [void]$BlockedCodes.Add('repo_error') }

  $pushed = $false
  # ★ 提交失败时绝不推送：那种情况下 push 往往"成功"（本地没东西可推），
  #   会被后面当成"数据已落地"→ 刷新 lastSuccessUtc，把横幅的过期判定骗过去，
  #   站点数据其实没上线却显示正常（2026-09-18 事故就是这么被瞒过一轮的）。
  if (-not $commitOk) {
    Log-Line "  ✗ 提交失败（退出码 $($commit.Code)），本轮不推送，数据未上线"
  } else {
  for ($i = 1; $i -le 3; $i++) {
    $p = Invoke-Git $Root @('push', 'origin', 'main')
    if ($p.Code -eq 0) { $pushed = $true; break }
    Log-Line "  ! 推送失败（第 $i 次）：$($p.Out)"
    Start-Sleep -Seconds (5 * $i)
    [void](Invoke-Git $Root @('fetch', 'origin'))
    # 不用 --autostash：它会把冲突留成残留，正是把仓库锁死三天的那种状态
    $rb2 = Invoke-Git $Root @('-c', 'core.editor=true', 'rebase', 'origin/main')
    if ($rb2.Code -ne 0) {
      $cr3 = Get-ConflictReport $Root
      if ($cr3.Generated.Count -gt 0 -and $cr3.Source.Count -eq 0) {
        [void](Invoke-Git $Root (@('checkout', 'origin/main', '--') + $cr3.Generated))
        [void](Invoke-Git $Root (@('add', '--') + $cr3.Generated))
        [void](Invoke-Git $Root @('-c', 'core.editor=true', 'rebase', '--continue'))
      } else {
        [void](Invoke-Git $Root @('rebase', '--abort'))
        Log-Line "  ✗ 重推前的 rebase 冲突含手写源码，中止"
        $script:SourceConflict = $true
        [void]$BlockedCodes.Add('source_conflict')
        break
      }
    }
  }
  }
  if ($pushed) {
    $script:PushOk = $true
    $lastSuccess = (Get-Date).ToUniversalTime().ToString('o')
    Log-Line "  ✓ 已提交并 SSH 推送上线"
  } else {
    Log-Line "  ✗ 推送失败（网络/权限），改动已在本机 commit，下次运行会自动重推"
    [void]$BlockedCodes.Add('push_failed')
  }
}

# ═══ 3. 收尾 ═══
if ($script:PushOk) {
  # 推送成功才算"站点数据已落地" → 用新时间戳重写状态文件，这是横幅过期判定的输入。
  # 重写后必须再推一次，否则站点上留着的是推送前那份（lastSuccessUtc 是旧的）。
  Publish-SiteStatus -Root $Root -RunId $runId -StartedUtc $startedUtc -FinishedUtc $finishUtc `
    -LastSuccessUtc $lastSuccess -Source 'local' `
    -Status $statusText `
    -ExitCode $statusExit -ConsecutiveFailures 0 -Blocked $blocked -BlockedSinceUtc $null `
    -BlockedCodes @($BlockedCodes) -FailedScripts @($FailedScripts) `
    -StaleCaches @($StaleCaches) -Healed @($Healed)
  [void](Invoke-Git $Root @('add', '--', 'assets/data/status.json'))
  [void](Invoke-Git $Root @('commit', '-m', "chore: status $runId"))
  $ps = Invoke-Git $Root @('push', 'origin', 'main')
  if ($ps.Code -ne 0) { Log-Line "  ! 状态文件重推失败（不影响本轮数据推送）：$($ps.Out)" }
}

$okCount = $UpdateScripts.Count - $FailedScripts.Count
$elapsed = [int]((Get-Date) - $t0).TotalSeconds
Log-Line ("======== 汇总 run=$runId 耗时=${elapsed}s 脚本=$okCount/$($UpdateScripts.Count) ok " +
          "缓存未刷新=$($StaleCaches.Count) 自愈=$($Healed.Count) 推送=$(if($script:PushOk){'OK'}else{'失败'}) " +
          "状态=$(if($blocked){'需处理'}elseif($Failures.Count -or $StaleCaches.Count){'降级'}else{'OK'}) ========")

$exitCode = 0
if ($blocked) { $exitCode = 1 }
elseif ($Failures.Count -gt 0 -or $StaleCaches.Count -gt 0 -or $Healed.Count -gt 0) { $exitCode = 2 }

if ($exitCode -ne 0) {
  $title = if ($exitCode -eq 1) { "拉玛西亚更新：需人工处理" } else { "拉玛西亚更新：降级完成" }
  $body  = @()
  if ($BlockedCodes.Count -gt 0) { $body += "问题：" + (($BlockedCodes | Select-Object -Unique) -join ', ') }
  if ($FailedScripts.Count -gt 0) { $body += "失败脚本：" + ($FailedScripts -join ', ') }
  if ($StaleCaches.Count -gt 0)  { $body += "未刷新缓存：" + ($StaleCaches.Count) + " 个" }
  if ($Healed.Count -gt 0)       { $body += "已自愈：" + (($Healed | Select-Object -Unique) -join ', ') }
  $body += "详见 scripts/local-daily-update.log"
  if ($SelfTest) {
    # 自测会反复跑，别把人的屏幕刷爆；告警链路本身另外单独验证
    Log-Line "  (自测模式：跳过弹窗)"
  } else {
    Send-LamAsiaAlert -Title $title -Body ($body -join "`n") -Key (($BlockedCodes | Select-Object -Unique) -join '+')
  }
}

# 记录结束心跳（看门狗靠"有 start 无 finish"发现被杀）
$hb2 = Read-JsonFile $localState
if (-not $hb2) { $hb2 = New-Object psobject }
$hb2 | Add-Member -NotePropertyName runFinishedUtc -NotePropertyValue $finishUtc -Force
$hb2 | Add-Member -NotePropertyName exitCode       -NotePropertyValue $exitCode -Force
Write-JsonFile $localState $hb2

exit $exitCode
