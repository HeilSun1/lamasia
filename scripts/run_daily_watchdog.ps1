# ═══════════════════════════════════════════════════════════════
#   拉玛西亚信息站 · 每日更新看门狗
#
#   为什么需要它：主脚本自己抓不到「进程被杀 / 机器休眠导致根本没跑完」——
#   挂死的进程连一行失败日志都不会留（2026-09-15 22:40 那次就是这样，
#   日志里只有一个孤零零的「开始」，下一条直接是 17 小时后的下一轮）。
#
#   设计约束（改动前先读）：
#   1. 本脚本刻意 **不引用** scripts/lib/lamasia-common.ps1。
#      否则主脚本改坏库函数时，看门狗会跟着一起失灵，那它就没有存在意义了。
#      冲突标记扫描这里自带一份极简实现，不共享代码。
#   2. 只做只读检查 + 一次有界的补跑触发，**不做任何 git 写操作**
#      （不改 index、不 abort、不删锁 —— 写操作全部留给主脚本，职责清晰）。
#   3. 独立计划任务 LaMasia_Local_Watchdog，每 4 小时一次，与主任务错峰。
# ═══════════════════════════════════════════════════════════════
param(
  [string] $RepoRoot = "",
  [switch] $SelfTest   # 只检查+写日志，不弹窗、不触发补跑
)

$ErrorActionPreference = "Continue"
if (-not $RepoRoot) { $RepoRoot = Split-Path -Parent $PSScriptRoot }
$Root = $RepoRoot
Set-Location $Root

$MainTask = "LaMasia_Local_Daily_Update"
$LogFile  = Join-Path $Root "scripts\watchdog.log"
$StateFile = Join-Path $Root "scripts\watchdog-state.json"
$LocalState = Join-Path $Root "scripts\local-run-state.json"
$SiteStatus = Join-Path $Root "assets\data\status.json"

$script:Problems = New-Object System.Collections.ArrayList

function WLog([string]$msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
  try { Add-Content -Path $LogFile -Value $line -Encoding UTF8 } catch { }
  Write-Host $line
}

function WReadJson([string]$path) {
  if (-not (Test-Path $path)) { return $null }
  try { return (Get-Content -Path $path -Raw -Encoding UTF8 | ConvertFrom-Json) } catch { return $null }
}

function WWriteJson([string]$path, $obj) {
  $json = ($obj | ConvertTo-Json -Depth 6) -replace "`r`n", "`n"
  $enc  = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $json + "`n", $enc)
}

function Add-Problem([string]$code, [string]$detail, [string]$level = 'warn') {
  [void]$script:Problems.Add([pscustomobject]@{ Code = $code; Detail = $detail; Level = $level })
  WLog "  [$level] $code — $detail"
}

# ── 通知：自带一份（见文件头第 1 点，不与主脚本共用库） ──
function Watchdog-Alert([string]$title, [string]$body, [string]$key) {
  if ($SelfTest) { WLog "  (自测：跳过弹窗) $title — $body"; return }

  # 同 key 12 小时内不重复弹，避免每 4 小时刷一次屏；跨天会重弹
  $st = WReadJson $StateFile
  if ($st -and $st.lastAlertKey -eq $key -and $st.lastAlertUtc) {
    $t = [datetime]::MinValue
    if ([datetime]::TryParse($st.lastAlertUtc, [ref]$t) -and
        ((Get-Date).ToUniversalTime() - $t.ToUniversalTime()).TotalHours -lt 12) {
      WLog "  (告警 '$key' 12 小时内已发过，抑制)"
      return
    }
  }

  $shown = $false
  try {
    [void][Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime]
    [void][Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType=WindowsRuntime]
    $tpl = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent(
             [Windows.UI.Notifications.ToastNotificationType]::ToastText02)
    $nodes = $tpl.GetElementsByTagName('text')
    [void]$nodes.Item(0).AppendChild($tpl.CreateTextNode($title))
    [void]$nodes.Item(1).AppendChild($tpl.CreateTextNode($body))
    $toast = New-Object Windows.UI.Notifications.ToastNotification $tpl
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier(
      "{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe").Show($toast)
    $shown = $true
    WLog "  → 已发送 Windows 通知"
  } catch { WLog "  (WinRT 通知不可用，回退弹窗)" }

  if (-not $shown) {
    try {
      $shell = New-Object -ComObject WScript.Shell
      [void]$shell.Popup($body, 15, $title, 48)   # 15 秒自动消失；0 会永久阻塞，禁用
    } catch { WLog "  (弹窗亦不可用)" }
  }

  try {
    Add-Content -Path (Join-Path $Root "scripts\alerts.log") `
      -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  [$key] $title — $body" -Encoding UTF8
  } catch { }

  $s = WReadJson $StateFile
  if (-not $s) { $s = New-Object psobject }
  $s | Add-Member -NotePropertyName lastAlertKey -NotePropertyValue $key -Force
  $s | Add-Member -NotePropertyName lastAlertUtc -NotePropertyValue ((Get-Date).ToUniversalTime().ToString('o')) -Force
  WWriteJson $StateFile $s
}

WLog "======== 看门狗检查开始 ========"

# ═══ 信号 1：数据新鲜度 ═══
# 取「站点状态文件的 lastSuccessUtc」与「各缓存的 updated」的最大值，
# 与主脚本/前端同一套口径：只看本机状态会在本机关机、Actions 兜底仍在跑时误报
$evidence = @()
$site = WReadJson $SiteStatus
if ($site -and $site.lastSuccessUtc) {
  $t = [datetime]::MinValue
  if ([datetime]::TryParse($site.lastSuccessUtc, [ref]$t)) { $evidence += $t.ToUniversalTime() }
}
foreach ($c in @('assets/js/dqd-u19-cache.js','assets/js/dqd-u18-cache.js','assets/js/dqd-u16-cache.js',
                 'assets/js/dqd-barca-atletic-cache.js','assets/js/fcb-youth-schedules.js',
                 'assets/js/dqd-videos-cache.js')) {
  $p = Join-Path $Root $c
  if (-not (Test-Path $p)) { continue }
  $head = ([System.IO.File]::ReadAllText($p, (New-Object System.Text.UTF8Encoding($false))) -split "`n") | Select-Object -First 12
  foreach ($l in $head) {
    if ($l -match '"updated"\s*:\s*"([^"]+)"') {
      $u = [datetime]::MinValue
      # ★ 缓存里的 updated 是**本地时间**且不带时区标记。
      #   TryParse 出来的是"本地时间"，必须显式转 UTC 再参与比较，
      #   否则和 UTC 的当前时间相减会凭空差出一个时区（东八区就是 -8 小时）。
      if ([datetime]::TryParse($Matches[1], [ref]$u)) { $evidence += $u.ToUniversalTime() }
      break
    }
  }
}
if ($evidence.Count -gt 0) {
  $newest = ($evidence | Sort-Object -Descending)[0]
  $ageH = ((Get-Date).ToUniversalTime() - $newest).TotalHours
  if ($ageH -ge 72) {
    Add-Problem 'stale' ("数据最新只到 " + $newest.ToString('yyyy-MM-dd HH:mm') + "，已 " + [int]$ageH + " 小时") 'danger'
  } elseif ($ageH -ge 36) {
    Add-Problem 'stale' ("数据已 " + [int]$ageH + " 小时未更新") 'warn'
  } else {
    WLog ("  数据新鲜：" + [int]$ageH + " 小时前")
  }
}

# ═══ 信号 2：上一轮没跑完（进程被杀/休眠）═══
# 这是主脚本自己抓不到的：被杀时连日志都写不下，只留下「有 start 无 finish」
$ls = WReadJson $LocalState
if ($ls -and $ls.runStartedUtc) {
  $st = [datetime]::MinValue
  if ([datetime]::TryParse($ls.runStartedUtc, [ref]$st)) {
    $fin = $null
    if ($ls.runFinishedUtc) {
      $ft = [datetime]::MinValue
      if ([datetime]::TryParse($ls.runFinishedUtc, [ref]$ft)) { $fin = $ft }
    }
    $stU = $st.ToUniversalTime()
    $runningFor = ((Get-Date).ToUniversalTime() - $stU).TotalHours
    if ($null -eq $fin -or $fin.ToUniversalTime() -lt $stU) {
      if ($runningFor -gt 2.5) {
        Add-Problem 'run_incomplete' ("上次更新于 " + $stU.ToLocalTime().ToString('MM-dd HH:mm') +
                    " 启动后没有结束记录（已过 " + [int]$runningFor + " 小时），很可能被中断") 'danger'
      }
    }
  }
}

# ═══ 信号 3/4：计划任务自身 ═══
$ti = $null
try { $ti = Get-ScheduledTaskInfo -TaskName $MainTask -ErrorAction Stop } catch { }
$taskState = $null
try { $taskState = (Get-ScheduledTask -TaskName $MainTask -ErrorAction Stop).State } catch { }

if ($ti) {
  if ($ti.LastTaskResult -ne 0) {
    $meaning = switch ($ti.LastTaskResult) {
      1 { "需人工介入（源码冲突/推送失败/核心缓存未刷新）" }
      2 { "降级完成（部分数据源失败，站点仍在更新）" }
      default { "退出码 " + $ti.LastTaskResult }
    }
    Add-Problem 'task_failed' ("每日更新任务上次退出：" + $meaning) 'danger'
  }
  if ($ti.LastRunTime -and $ti.LastRunTime.Year -gt 2000) {
    $hours = ((Get-Date) - $ti.LastRunTime).TotalHours
    if ($hours -ge 24) {
      Add-Problem 'task_not_running' ("每日更新任务已 " + [int]$hours + " 小时没跑过（期望每天 3 次）") 'danger'
    } elseif ($hours -ge 12) {
      Add-Problem 'task_not_running' ("每日更新任务已 " + [int]$hours + " 小时没跑过") 'warn'
    }
  }
} else {
  Add-Problem 'task_missing' ("找不到计划任务 " + $MainTask) 'danger'
}

# ═══ 信号 5：仓库里的冲突标记残留（自带极简实现，见文件头第 1 点）═══
$marker = $null
try {
  $marker = & git -C $Root grep -l -E "^(<{7}|={7}|>{7})( |$)" -- 'assets' 'teams' '*.html' '*.css' '*.js' 'sw.js' 'scripts' 2>$null
} catch { }
if ($marker) {
  Add-Problem 'repo_conflict' ("工作区有 " + @($marker).Count + " 个文件带冲突标记：" + ((@($marker) | Select-Object -First 3) -join ', ')) 'danger'
}

# ═══ 信号 6：git 操作残留 ═══
$gitDir = Join-Path $Root '.git'
foreach ($op in @('rebase-merge', 'rebase-apply', 'MERGE_HEAD')) {
  $p = Join-Path $gitDir $op
  if (Test-Path $p) {
    $age = ((Get-Date) - (Get-Item $p).LastWriteTime).TotalHours
    if ($age -gt 2.5) {
      Add-Problem 'stale_op' ("残留的 " + $op + "（已 " + [int]$age + " 小时）会让每轮更新都失败") 'danger'
    }
  }
}
$lock = Join-Path $gitDir 'index.lock'
if (Test-Path $lock) {
  $age = ((Get-Date) - (Get-Item $lock).LastWriteTime).TotalMinutes
  if ($age -gt 30) {
    Add-Problem 'stale_lock' ("陈旧 index.lock（已 " + [int]$age + " 分钟），所有 git 命令都会失败") 'danger'
  }
}

# ═══ 信号 7：远端可达 / 鉴权（补「SSH key 失效」这个纯静默通道）═══
$env:GIT_SSH_COMMAND = "ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new"
$job = Start-Job -ScriptBlock {
  param($r)
  $env:GIT_SSH_COMMAND = "ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new"
  & git -C $r ls-remote --exit-code origin main 2>&1 | Out-Null
  $LASTEXITCODE
} -ArgumentList $Root
if (Wait-Job $job -Timeout 25) {
  $rc = Receive-Job $job
  if ($rc -ne 0) {
    Add-Problem 'remote_unreachable' "无法访问远端仓库（推送会一直失败，可能是 SSH key 失效或网络问题）" 'danger'
  } else {
    WLog "  远端可达"
  }
} else {
  Add-Problem 'remote_unreachable' "访问远端超时（>25s）" 'danger'
}
Remove-Job $job -Force -ErrorAction SilentlyContinue

# ═══ 有界补救：任务确实没在跑、且很久没跑过 → 补跑一次 ═══
# 每 6 小时最多一次；若补跑后下轮仍陈旧，就只告警不再触发（否则会变成假死循环）
if (-not $SelfTest -and $ti -and $taskState -ne 'Running') {
  $hoursSinceRun = if ($ti.LastRunTime -and $ti.LastRunTime.Year -gt 2000) { ((Get-Date) - $ti.LastRunTime).TotalHours } else { 999 }
  $st = WReadJson $StateFile
  $canRemediate = $true
  if ($st -and $st.lastRemediationUtc) {
    $rt = [datetime]::MinValue
    if ([datetime]::TryParse($st.lastRemediationUtc, [ref]$rt) -and
        ((Get-Date).ToUniversalTime() - $rt.ToUniversalTime()).TotalHours -lt 6) { $canRemediate = $false }
  }
  if ($hoursSinceRun -gt 12 -and $canRemediate) {
    WLog "  → 任务已 $([int]$hoursSinceRun) 小时未运行且当前不在运行中，触发一次补跑"
    try {
      Start-ScheduledTask -TaskName $MainTask -ErrorAction Stop
      if (-not $st) { $st = New-Object psobject }
      $st | Add-Member -NotePropertyName lastRemediationUtc -NotePropertyValue ((Get-Date).ToUniversalTime().ToString('o')) -Force
      WWriteJson $StateFile $st
    } catch {
      WLog "  补跑失败：$($_.Exception.Message)"
    }
  }
}

# ═══ 汇总 + 告警 ═══
$danger = @($script:Problems | Where-Object { $_.Level -eq 'danger' })
$warn   = @($script:Problems | Where-Object { $_.Level -eq 'warn' })

if ($danger.Count -gt 0 -or $warn.Count -gt 0) {
  $title = if ($danger.Count -gt 0) { "拉玛西亚站点：需要处理" } else { "拉玛西亚站点：请注意" }
  $body = (@($script:Problems | ForEach-Object { "· " + $_.Detail }) -join "`n")
  Watchdog-Alert -title $title -body $body -key (($script:Problems | Select-Object -ExpandProperty Code | Select-Object -Unique | Sort-Object) -join '+')
} else {
  WLog "  一切正常"
}

# 记录看门狗自己的心跳，供主脚本互看（主脚本发现 >26h 未跑会提醒看门狗可能失效）
$s2 = WReadJson $StateFile
if (-not $s2) { $s2 = New-Object psobject }
$s2 | Add-Member -NotePropertyName lastWatchdogUtc -NotePropertyValue ((Get-Date).ToUniversalTime().ToString('o')) -Force
WWriteJson $StateFile $s2

WLog ("======== 看门狗检查结束：问题 " + $script:Problems.Count + " 项（严重 " + $danger.Count + "）========")
exit $(if ($danger.Count -gt 0) { 1 } else { 0 })
