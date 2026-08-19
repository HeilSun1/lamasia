# ═══════════════════════════════════════════════════════════════
#   拉玛西亚信息站 · 巴萨竞技（Barça Atlètic）Sofascore 比赛数据
#
#   B队名单/伤病/赛程仍走懂球帝（update_barca_atletic.ps1）；
#   本脚本负责 B队比赛的 Sofascore 数据（赛程 + 阵容/进程/统计详情），
#   让 B队比赛详情弹窗与 U19/18/16 完全一致。
#   Sofascore 团队 id = 24343（Segunda Federación 西协乙）。
#
#     1. 球员名单 + 伤病   /api/v1/team/24343/players
#     2. 历史赛程          /api/v1/team/24343/events/last/0
#     3. 未来赛程          /api/v1/team/24343/events/next/0
#     4. 球队信息          /api/v1/team/24343
#     生成缓存 assets/js/dqd-barca-atletic-sf-cache.js（window.DQD_BARCA_ATLETIC_SF_CACHE）
#             assets/js/dqd-barca-atletic-sf-details-cache.js（window.DQD_BARCA_ATLETIC_SF_DETAILS_CACHE）
#
#   与 U19 相同：详情只抓「未缓存过」且 2026-06-01 起的，旧赛季/已缓存跳过。
#   由计划任务每天调用（见 run_daily_update.ps1）；日志 scripts/barca-atletic-sf-update.log
#   ⚠️ 数据来自 Sofascore 非官方接口，仅供个人学习使用，可能随时变动。
# ═══════════════════════════════════════════════════════════════
$ErrorActionPreference = "Stop"

$TeamId     = "24343"     # Sofascore 巴萨竞技（西协乙）
$Root       = Split-Path -Parent $PSScriptRoot
$CacheFile  = Join-Path $Root "assets\js\dqd-barca-atletic-sf-cache.js"
$LogFile    = Join-Path $Root "scripts\barca-atletic-sf-update.log"
$EdgeCfg    = Join-Path $PSScriptRoot "sofascore-edge-path.txt"

# ── 定位 Edge（优先配置文件，其次常见路径） ──────────────────────
$Edge = ""
if (Test-Path $EdgeCfg) { $Edge = (Get-Content $EdgeCfg -Raw -ErrorAction SilentlyContinue).Trim() }
if (-not $Edge -or -not (Test-Path $Edge)) {
  foreach ($p in @(
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
  )) { if (Test-Path $p) { $Edge = $p; break } }
}
if (-not (Test-Path $Edge)) { Write-Host "找不到 Edge！请把 msedge.exe 路径写入 $EdgeCfg"; exit 1 }

$Profile = Join-Path $env:TEMP "sofascore-headless-profile"

function Log([string]$msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
  Write-Host $line
}

# 用 Edge 无头抓 JSON：返回 ConvertFrom-Json 的对象，失败返回 $null
function Get-SfJson([string]$url, [string]$what) {
  try {
    $tmp = Join-Path $env:TEMP ("sf_" + [guid]::NewGuid().ToString("N") + ".html")
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $html = (& $Edge --headless=new --disable-gpu --no-first-run --disable-extensions `
        "--user-data-dir=$Profile" --dump-dom $url 2>$null | Out-String)
    $ErrorActionPreference = $prevEAP
    [System.IO.File]::WriteAllText($tmp, $html, [System.Text.Encoding]::UTF8)
    $txt = [System.IO.File]::ReadAllText($tmp, [System.Text.Encoding]::UTF8)
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    $m = [regex]::Match($txt, '<pre>(.*)</pre>', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    if ($m.Success -and $m.Groups[1].Value.Trim() -like '{*') {
      return ($m.Groups[1].Value | ConvertFrom-Json)
    }
    Log "  ✗ $what 返回非 JSON（可能被风控或结构变化）"
    return $null
  } catch {
    Log "  ✗ $what 抓取失败：$($_.Exception.Message)"
    return $null
  }
}

# 同 Get-SfJson，但返回原始 JSON 文本（比赛详情直接嵌入缓存，避免 ConvertTo-Json 深嵌套序列化问题）
function Get-SfRaw([string]$url, [string]$what) {
  try {
    $tmp = Join-Path $env:TEMP ("sf_" + [guid]::NewGuid().ToString("N") + ".html")
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $html = (& $Edge --headless=new --disable-gpu --no-first-run --disable-extensions `
        "--user-data-dir=$Profile" --dump-dom $url 2>$null | Out-String)
    $ErrorActionPreference = $prevEAP
    [System.IO.File]::WriteAllText($tmp, $html, [System.Text.Encoding]::UTF8)
    $txt = [System.IO.File]::ReadAllText($tmp, [System.Text.Encoding]::UTF8)
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    $m = [regex]::Match($txt, '<pre>(.*)</pre>', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    if ($m.Success -and $m.Groups[1].Value.Trim() -like '{*') {
      return $m.Groups[1].Value.Trim()
    }
    Log "  ✗ $what 返回非 JSON（可能被风控或结构变化）"
    return $null
  } catch {
    Log "  ✗ $what 抓取失败：$($_.Exception.Message)"
    return $null
  }
}

# 常见伤病英文 → 中文
function Get-InjuryZh([string]$en) {
  $map = @{
    "Thigh Injury"      = "大腿伤势"
    "Knee Injury"       = "膝盖伤势"
    "Muscle Injury"     = "肌肉损伤"
    "Hamstring Injury"  = "腘绳肌损伤"
    "Ankle Injury"      = "脚踝伤势"
    "Sprained Ankle"    = "脚踝扭伤"
    "Groin Injury"      = "腹股沟伤势"
    "Calf Injury"       = "小腿伤势"
    "Shoulder Injury"   = "肩部伤势"
    "Adductor Injury"   = "内收肌损伤"
    "Ligament Injury"   = "韧带损伤"
    "Meniscus Injury"   = "半月板损伤"
  }
  if ($map.ContainsKey($en)) { return $map[$en] }
  return $en
}

# 赛事英文 → 中文（B队主要踢西协乙，兼顾杯赛/友谊赛）
function Get-CompZh([string]$en) {
  if ($en -match 'Segunda Federaci[oó]n') { return "西协乙" }
  if ($en -match 'Primera Federaci[oó]n')  { return "西协甲" }
  if ($en -match 'Copa del Rey')           { return "国王杯" }
  if ($en -match 'Copa Federaci[oó]n')     { return "西协杯" }
  if ($en -match 'Copa de Catalunya')      { return "加泰罗尼亚杯" }
  if ($en -match 'Friendly')               { return "友谊赛" }
  return $en
}

# 出生日期 → 年龄
function Get-Age($dob) {
  if ($null -eq $dob) { return "" }
  if ($dob -is [datetime]) {
    $y = $dob.Year; $m = $dob.Month; $d = $dob.Day
  } elseif ([string]$dob -match '^(\d{4})-(\d{2})-(\d{2})') {
    $y = [int]$Matches[1]; $m = [int]$Matches[2]; $d = [int]$Matches[3]
  } else { return "" }
  $now = Get-Date
  $age = $now.Year - $y
  if ($now.Month -lt $m -or ($now.Month -eq $m -and $now.Day -lt $d)) { $age-- }
  return "$($age)岁"
}

# 身价（欧元）→ 中文缩写
function Get-ValueZh($v) {
  if ($null -eq $v) { return "" }
  try { $n = [double]$v } catch { return "" }
  if ($n -le 0) { return "" }
  if ($n -ge 100000000) { return ("{0}亿" -f [math]::Round($n / 100000000, 1)) }
  return ("{0}万" -f [math]::Round($n / 10000, 0))
}

# 惯用脚英文 → 中文
function Get-FootZh([string]$en) {
  switch ($en) {
    "Right" { return "右脚" }
    "Left"  { return "左脚" }
    "Both"  { return "双脚" }
    default { return $en }
  }
}

# 出生日期 → "YYYY-MM-DD"
function Get-Birth($dob) {
  if ($null -eq $dob) { return "" }
  if ($dob -is [datetime]) { return $dob.ToString("yyyy-MM-dd") }
  if ([string]$dob -match '^(\d{4})-(\d{2})-(\d{2})') { return $Matches[0] }
  return ""
}

Log "开始 B队（Sofascore）更新（团队 $TeamId）……"

# ── 1. 抓取原始数据 ─────────────────────────────────────────────
$players = Get-SfJson "https://api.sofascore.com/api/v1/team/$TeamId/players" "球员名单"
Start-Sleep -Seconds 3
$lastEv  = Get-SfJson "https://api.sofascore.com/api/v1/team/$TeamId/events/last/0" "已完赛程"
Start-Sleep -Seconds 3
$nextEv  = Get-SfJson "https://api.sofascore.com/api/v1/team/$TeamId/events/next/0" "未来赛程"
Start-Sleep -Seconds 3
$team    = Get-SfJson "https://api.sofascore.com/api/v1/team/$TeamId" "球队信息"

if (-not $players -and -not $lastEv -and -not $nextEv) {
  Log "✗ 全部数据源失败，本次更新中止。"
  exit 1
}

# ── 2. 归一化球员（供球员卡片 sf:b: 使用：惯用脚/身高/生日/身价） ──
$playersOut = @()
if ($players -and $players.players) {
  foreach ($p in @($players.players)) {
    $pr = $p.player
    $playerId = [string]$pr.id
    $inj = $null
    if ($pr.injury) {
      $inj = [pscustomobject]@{
        reason   = Get-InjuryZh ([string]$pr.injury.reason)
        reasonEn = [string]$pr.injury.reason
        status   = [string]$pr.injury.status
        expected = if ($pr.injury.expectedReturnDateData) {
          ("{0}年{1}月" -f $pr.injury.expectedReturnDateData.year, $pr.injury.expectedReturnDateData.month)
        } else { "" }
      }
    }
    $playersOut += [pscustomobject]@{
      name    = [string]$pr.name
      id      = $playerId
      pos     = [string]$pr.position
      shirt   = [string]$p.shirtNumber
      team    = [string]$pr.team.name
      nation  = if ($pr.country) { [string]$pr.country.name } else { "" }
      photo    = "https://img.sofascore.com/api/v1/player/$($pr.id)/image"
      age      = Get-Age $pr.dateOfBirth
      birthday = Get-Birth $pr.dateOfBirth
      foot     = Get-FootZh ([string]$pr.preferredFoot)
      height   = [string]$pr.height
      value    = Get-ValueZh $pr.proposedMarketValue
      injury  = $inj
    }
  }
}

# ── 3. 归一化赛程 ───────────────────────────────────────────────
$matchList = @()
foreach ($src in @($lastEv, $nextEv)) {
  if (-not $src -or -not $src.events) { continue }
  foreach ($e in @($src.events)) {
    $isHome = ([string]$e.homeTeam.id -eq $TeamId)
    $matchList += [pscustomobject]@{
      id     = [string]$e.id
      comp   = Get-CompZh ([string]$e.tournament.name)
      round  = if ($e.roundInfo -and $e.roundInfo.round) { [string]$e.roundInfo.round } else { "" }
      start  = [string]$e.startTimestamp
      home   = [string]$e.homeTeam.name
      away   = [string]$e.awayTeam.name
      homeId = [string]$e.homeTeam.id
      awayId = [string]$e.awayTeam.id
      hs     = [string]$e.homeScore.current
      as     = [string]$e.awayScore.current
      status = [string]$e.status.description
      code   = [string]$e.status.code
      isHome = $isHome
    }
  }
}
# 只保留 2026-06-01 起的赛程（2026-06-01 00:00 东八区 = 1780243200；旧赛季归档不展示）
$CutoffUnix = 1780243200
$matchList = @($matchList | Where-Object { [int64]$_.start -ge $CutoffUnix } | Sort-Object { [int64]$_.start })

# ── 3.5 抓取最近 8 场已完场的比赛详情（阵容/进程/技术统计/交锋） ──
# 与 U19 完全一致：只抓「未缓存过」且 2026-06-01 起的详情，旧赛季/已缓存跳过。
$DetailsFile = Join-Path $Root "assets\js\dqd-barca-atletic-sf-details-cache.js"

# 3.5a 读已有详情缓存，按事件 ID 保留旧条目
$oldParts = @{}
if (Test-Path $DetailsFile) {
  $oldTxt = Get-Content $DetailsFile -Raw -ErrorAction SilentlyContinue
  if ($oldTxt) {
    foreach ($m in [regex]::Matches($oldTxt, '(?m)^\s{2}("(\d+)":\s*\{.*)$')) {
      $id   = $m.Groups[2].Value
      $line = $m.Groups[1].Value.TrimEnd().TrimEnd(',')
      $oldParts[$id] = $line
    }
  }
}

# 3.5b 旧条目只保留当前展示赛程内的
$dirty = $false
if ($matchList.Count) {
  $keep = @{}
  foreach ($m in $matchList) { $keep[[string]$m.id] = $true }
  foreach ($k in @($oldParts.Keys)) {
    if (-not $keep.ContainsKey($k)) { $oldParts.Remove($k); $dirty = $true }
  }
}

# 3.5c 新抓候选 = 已完场 + 未缓存 + 2026-06-01 起
$detailList = @()
if ($lastEv -and $lastEv.events) {
  $detailList = @($lastEv.events | Where-Object {
      $_.status.description -match '^(Ended|AP)' -and
      -not $oldParts.ContainsKey([string]$_.id) -and
      [int64]$_.startTimestamp -ge $CutoffUnix
    } |
    Sort-Object { [int64]$_.startTimestamp } -Descending | Select-Object -First 8)
}

# 3.5d 抓新 + 合并旧条目写回
if ($detailList.Count) {
  Log "  · 已缓存 $($oldParts.Count) 场，需新抓详情 $($detailList.Count) 场"
  $i = 0
  foreach ($dm in $detailList) {
    $i++
    $eid = [string]$dm.id
    Log "  · 详情 $i/$($detailList.Count) 场 #$eid $($dm.homeTeam.name) vs $($dm.awayTeam.name)"
    $rawL = Get-SfRaw "https://api.sofascore.com/api/v1/event/$eid/lineups" "阵容"
    $rawC = Get-SfRaw "https://api.sofascore.com/api/v1/event/$eid/incidents" "比赛进程"
    $rawS = Get-SfRaw "https://api.sofascore.com/api/v1/event/$eid/statistics" "技术统计"
    $rawH = Get-SfRaw "https://api.sofascore.com/api/v1/event/$eid/h2h" "交锋"
    $ln = if ($rawL) { $rawL } else { "null" }
    $cn = if ($rawC) { $rawC } else { "null" }
    $sn = if ($rawS) { $rawS } else { "null" }
    $hn = if ($rawH) { $rawH } else { "null" }
    $oldParts[$eid] = ('  "' + $eid + '": {' +
      '"lineups": ' + $ln + ', ' +
      '"incidents": ' + $cn + ', ' +
      '"statistics": ' + $sn + ', ' +
      '"h2h": ' + $hn + '}')
    if ($i -lt $detailList.Count) { Start-Sleep -Seconds 2 }   # 错峰，降低风控
  }
  $dirty = $true
}

if ($dirty) {
  $detailsParts = @($oldParts.Values)
  $detailsJs = "/* 自动生成，请勿手动编辑 —— 比赛详情缓存（match-detail.js 读取） */`r`n" +
    "window.DQD_BARCA_ATLETIC_SF_DETAILS_CACHE = {`r`n" +
    ($detailsParts -join ",`r`n") + "`r`n};`r`n"
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  try {
    [System.IO.File]::WriteAllText($DetailsFile, $detailsJs, $utf8)
    Log "  ✓ 已写入 $($detailsParts.Count) 场比赛详情"
  } catch {
    Log "  ✗ 写入详情缓存失败：$($_.Exception.Message)"
  }
} else {
  Log "  · 无新完赛详情，缓存保持不变（已缓存 $($oldParts.Count) 场）"
}

# ── 4. 生成缓存 ─────────────────────────────────────────────────
$cache = [ordered]@{
  updated = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  source  = "sofascore"
  team    = [pscustomobject]@{
    name    = if ($team -and $team.team) { [string]$team.team.name } else { "Barcelona Atlètic" }
    id      = $TeamId
    country = if ($team -and $team.team -and $team.team.country) { [string]$team.team.country.name } else { "" }
    logo    = "https://img.sofascore.com/api/v1/team/$TeamId/image"
  }
  coach   = if ($team -and $team.team -and $team.team.manager) {
    [pscustomobject]@{
      name  = [string]$team.team.manager.name
      id    = [string]$team.team.manager.id
      photo = "https://img.sofascore.com/api/v1/manager/$($team.team.manager.id)/image"
    }
  } else { $null }
  players = $playersOut
  matches = $matchList
}

# 防空覆盖：Sofascore 抓取失败时球员/赛程为空，用空数据覆盖旧缓存会导致页面空白
if ($playersOut.Count -eq 0 -and $matchList.Count -eq 0) {
  Log "  ✗ 本次未抓到球员和赛程（Sofascore 限流/被风控），保留旧缓存不覆盖。"
  exit 0
}

try {
  $json = $cache | ConvertTo-Json -Depth 10
  $js   = "/* 自动生成，请勿手动编辑 —— 由 update_barca_atletic_sf.ps1 每日更新于 $(Get-Date -Format 'yyyy-MM-dd HH:mm') 数据源：Sofascore */`r`nwindow.DQD_BARCA_ATLETIC_SF_CACHE = $json;`r`n"
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($CacheFile, $js, $utf8)
  Log "  ✓ 球员 $($playersOut.Count) 人，赛程 $($matchList.Count) 场，缓存已写入 $CacheFile"
} catch {
  Log "  ✗ 写入缓存失败：$($_.Exception.Message)"
  exit 1
}

Log "B队（Sofascore）更新完成 ✔"
