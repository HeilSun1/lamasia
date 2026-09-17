﻿﻿# ═══════════════════════════════════════════════════════════════
#   每日更新 · 故障注入自测
#
#   在临时目录建 bare 远端，所有 push 都进那个临时仓库，
#   真实 GitHub 与线上站点完全不受影响。
#
#   用法：powershell -File scripts/selftest/e2e.ps1 [-Scenario A|B|C|all]
# ═══════════════════════════════════════════════════════════════
param([string] $Scenario = "all")

$ErrorActionPreference = "Continue"
$Real = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path (Join-Path $Real "scripts\run_daily_update.ps1"))) {
  $Real = (Get-Location).Path
}

$pass = 0; $fail = 0
function Check([string]$name, [bool]$ok, [string]$expect = "") {
  if ($ok) { $script:pass++; Write-Host ("  [PASS] " + $name) -ForegroundColor Green }
  else     { $script:fail++; Write-Host ("  [FAIL] " + $name + "  " + $expect) -ForegroundColor Red }
}

function New-Sandbox([string]$tag) {
  $tmp  = Join-Path $env:TEMP ("lamasia-" + $tag + "-" + (Get-Date -Format 'HHmmss'))
  $bare = Join-Path $tmp "origin.git"
  $work = Join-Path $tmp "work"
  New-Item -ItemType Directory -Path $tmp -Force | Out-Null
  git init --bare --quiet $bare
  git clone --quiet $Real $work 2>$null
  git -C $work remote set-url origin $bare
  git -C $work config user.name "tester"
  git -C $work config user.email "t@t"
  git -C $work push --quiet origin main 2>$null
  # 用真实仓库里尚未提交的新版脚本覆盖临时克隆里的旧版
  Copy-Item (Join-Path $Real "scripts\run_daily_update.ps1") (Join-Path $work "scripts\run_daily_update.ps1") -Force
  New-Item -ItemType Directory -Path (Join-Path $work "scripts\lib") -Force | Out-Null
  Copy-Item (Join-Path $Real "scripts\lib\lamasia-common.ps1") (Join-Path $work "scripts\lib\lamasia-common.ps1") -Force
  New-Item -ItemType Directory -Path (Join-Path $work "assets\data") -Force | Out-Null
  return @{ Tmp = $tmp; Bare = $bare; Work = $work }
}

function Add-ConflictMarkers([string]$file, [string]$userText = "") {
  # ★ 按字节读、按字节写。用 Get-Content -Raw / Set-Content -Encoding UTF8 这个组合时，
  #   PS 5.1 会把非 ASCII 字符损坏成 U+FFFD 替换字符，注入进去的就不再是原始内容了，
  #   测试结果会失真（曾经因此误判"判别函数有 bug"）。
  $enc   = New-Object System.Text.UTF8Encoding($false)
  $bytes = [System.IO.File]::ReadAllBytes($file)
  $s     = $enc.GetString($bytes)
  $extra = if ($userText) { "`n/* $userText */`n" } else { "" }
  $s     = $s + $extra + "<<<<<<< Updated upstream`nvar keepMe = 1;`n=======`nvar keepMe = 2;`n>>>>>>> Stashed changes`n"
  [System.IO.File]::WriteAllBytes($file, $enc.GetBytes($s))
}

function Read-Text([string]$file) {
  $enc = New-Object System.Text.UTF8Encoding($false)
  return $enc.GetString([System.IO.File]::ReadAllBytes($file))
}

function Has-Markers([string]$file) {
  if (-not (Test-Path $file)) { return $false }
  return [bool]((Read-Text $file) -match '(?m)^<<<<<<<|^>>>>>>>')
}

# ── 场景 A：复现 2026-09-16 事故现场（缓存+源码冲突标记 + 陈旧 index.lock）──
if ($Scenario -eq "all" -or $Scenario -eq "A") {
  Write-Host ""
  Write-Host "=== 场景 A：复现 9/16 残留冲突（应自愈缓存、保留源码、清理锁）===" -ForegroundColor Cyan
  $sb = New-Sandbox "e2eA"
  $work = $sb.Work
  $cacheFile = Join-Path $work "assets\js\dqd-u19-cache.js"
  $srcFile   = Join-Path $work "assets\js\videos-ui.js"

  Add-ConflictMarkers $cacheFile
  Add-ConflictMarkers $srcFile "USER-EDIT-MARKER-9f3a21"
  New-Item -ItemType File -Path (Join-Path $work ".git\index.lock") -Force | Out-Null
  (Get-Item (Join-Path $work ".git\index.lock")).LastWriteTime = (Get-Date).AddHours(-2)

  & (Join-Path $work "scripts\run_daily_update.ps1") -RepoRoot $work -SelfTest 2>&1 | Out-Null
  $code = $LASTEXITCODE

  Check "退出码=1（需人工：源码冲突）" ($code -eq 1) ("实际=" + $code)
  Check "陈旧 index.lock 已删除" (-not (Test-Path (Join-Path $work ".git\index.lock")))
  Check "缓存文件冲突标记已消解" (-not (Has-Markers $cacheFile))
  Check "源码工作区已恢复干净" (-not (Has-Markers $srcFile))
  # 与远端版本逐字节比对。注意要用远端的 ref，不能用本地 origin/main ——
  # 推送成功后本地 origin/main 仍是推送前的旧值，拿它比对必然不相等。
  # 用 git 自己的 blob hash 比对，别比字符串：
  # 工作区是 CRLF（core.autocrlf）、git show 出来是 LF，字符串直接比必然不等，是假失败；
  # hash-object 会按仓库的行尾规则归一化，比的是真正的文件内容。
  $localHash  = (git -C $work hash-object "assets/js/dqd-u19-cache.js").Trim()
  $remoteHash = (git -C $sb.Bare rev-parse "main:assets/js/dqd-u19-cache.js").Trim()
  Check "缓存内容 == 远端版本（blob hash）" ($localHash -eq $remoteHash) ("local=" + $localHash + " remote=" + $remoteHash)
  $stashList = (git -C $work stash list) -join "`n"
  Check "源码改动已存入 stash" ([bool]($stashList -match 'lamasia-src'))
  $stashShow = (git -C $work stash show -p (git -C $work stash list --format='%gd' | Select-Object -First 1) 2>$null) -join "`n"
  Check "stash 里保留了用户标记" ([bool]($stashShow -match 'USER-EDIT-MARKER-9f3a21'))
  $st = Get-Content (Join-Path $work "assets\data\status.json") -Raw | ConvertFrom-Json
  Check "状态文件 blocked=true" ($st.blocked -eq $true)
  Check "blockedCodes 含 source_conflict" ([bool]($st.blockedCodes -contains 'source_conflict'))
  Write-Host ("  现场：" + $sb.Tmp) -ForegroundColor DarkGray
}

# ── 场景 B：只有缓存冲突（应当完全自愈，退出码 0/2 且成功推送）──
if ($Scenario -eq "all" -or $Scenario -eq "B") {
  Write-Host ""
  Write-Host "=== 场景 B：仅缓存冲突（应完全自愈并正常推送）===" -ForegroundColor Cyan
  $sb = New-Sandbox "e2eB"
  $work = $sb.Work
  Add-ConflictMarkers (Join-Path $work "assets\js\dqd-u18-cache.js")

  $beforeSha = (git -C $sb.Bare rev-parse main).Trim()
  & (Join-Path $work "scripts\run_daily_update.ps1") -RepoRoot $work -SelfTest 2>&1 | Out-Null
  $code = $LASTEXITCODE
  $afterSha = (git -C $sb.Bare rev-parse main).Trim()

  Check "退出码=0 或 2（未阻塞）" ($code -eq 0 -or $code -eq 2) ("实际=" + $code)
  Check "缓存冲突已消解" (-not (Has-Markers (Join-Path $work "assets\js\dqd-u18-cache.js")))
  Check "已成功推送到远端" ($beforeSha -ne $afterSha)
  $st = Get-Content (Join-Path $work "assets\data\status.json") -Raw | ConvertFrom-Json
  Check "状态文件 blocked=false" ($st.blocked -eq $false)
  Check "healed 记录了自愈" ([bool]($st.healed -contains 'cache_conflict_healed'))
  Write-Host ("  现场：" + $sb.Tmp) -ForegroundColor DarkGray
}

# ── 场景 C：git add 失败（旧版会误判为"缓存无变化"然后什么都不做）──
if ($Scenario -eq "all" -or $Scenario -eq "C") {
  Write-Host ""
  Write-Host "=== 场景 C：add 失败（不得误判为'缓存无变化'）===" -ForegroundColor Cyan
  $sb = New-Sandbox "e2eC"
  $work = $sb.Work

  $null = & (Join-Path $work "scripts\run_daily_update.ps1") -RepoRoot $work -SelfTest -TestBogusAdd "scripts/does-not-exist.js" 2>&1
  $code = $LASTEXITCODE
  # 读日志文件而不是捕获 stdout：PS 5.1 捕获的输出流是 ANSI 解码的，中文会变乱码
  $logText = Read-Text (Join-Path $work "scripts\local-daily-update.log")

  Check "退出码=1" ($code -eq 1) ("实际=" + $code)
  Check "日志明确报 add 失败" ([bool]($logText -match 'git add 失败'))
  Check "日志未误报'缓存无变化，无需提交'" (-not ($logText -match '缓存无变化，无需提交'))
  $st = Get-Content (Join-Path $work "assets\data\status.json") -Raw | ConvertFrom-Json
  Check "blockedCodes 含 add_failed" ([bool]($st.blockedCodes -contains 'add_failed'))
  Write-Host ("  现场：" + $sb.Tmp) -ForegroundColor DarkGray
}

Write-Host ""
Write-Host ("======== 自测结果：PASS=$pass  FAIL=$fail ========") -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
exit $(if ($fail -eq 0) { 0 } else { 1 })
