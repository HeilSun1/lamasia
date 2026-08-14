# ═══════════════════════════════════════════════════════════════
#   拉玛西亚信息站 · 巴萨U18（Juvenil B）每日更新脚本
#
#   每天用 Edge 无头模式抓取 Sofascore 的巴萨 U18 数据，生成本地缓存：
#     Sofascore 有 TLS 指纹反爬（curl 一律 403），但真浏览器指纹可通过，
#     因此用本机 Edge 的 --headless --dump-dom 来取 JSON。
#     （配置在 scripts/sofascore-edge-path.txt，若为空自动探测）
#
#     1. 球员名单 + 伤病   /api/v1/team/933330/players
#     2. 历史赛程          /api/v1/team/933330/events/last/0
#     3. 未来赛程          /api/v1/team/933330/events/next/0
#     4. 球队信息          /api/v1/team/933330
#     生成缓存 assets/js/dqd-u18-cache.js（window.DQD_U18_CACHE）
#     只保留 2026 年及以后的赛程，2026 年以前的归档赛程不再写入缓存
#
#   由计划任务每天调用；日志 scripts/u18-update.log
#   ⚠️ 数据来自 Sofascore 非官方接口，仅供个人学习使用，可能随时变动。
# ═══════════════════════════════════════════════════════════════
$ErrorActionPreference = "Stop"

$TeamId     = "933330"     # Sofascore 巴萨 U18（Juvenil B）
$Root       = Split-Path -Parent $PSScriptRoot
$CacheFile  = Join-Path $Root "assets\js\dqd-u18-cache.js"
$LogFile    = Join-Path $Root "scripts\u18-update.log"
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

# 用 Edge 无头抓 JSON：返回 ConvertFrom-Json 的对象，失败返回 $null。
# Sofascore 对高频请求有限流，失败时自动重试（最多 3 次，间隔 6 秒）。
function Get-SfJson([string]$url, [string]$what) {
  for ($attempt = 1; $attempt -le 3; $attempt++) {
    try {
      $tmp = Join-Path $env:TEMP ("sf_" + [guid]::NewGuid().ToString("N") + ".html")
      # 脚本全局是 ErrorActionPreference=Stop，而 Edge 无头会往 stderr 写一堆无害警告，
      # 在 PS 5.1 下会被当成终止错误抛出。这里在函数作用域内临时改为 Continue。
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
      Log "  ✗ $what 第 $attempt 次返回非 JSON（可能被风控或结构变化）"
    } catch {
      Log "  ✗ $what 第 $attempt 次抓取失败：$($_.Exception.Message)"
    }
    if ($attempt -lt 3) { Start-Sleep -Seconds 6 }
  }
  return $null
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

# 赛事英文 → 中文（长名缩短）
function Get-CompZh([string]$en) {
  $map = @{
    "División de Honor Juvenil, Group 3" = "西青甲 G3"
    "UEFA Youth League"                  = "青年欧冠"
    "UEFA Youth League, Knockout stage"  = "青年欧冠 · 淘汰赛"
    "Spain U19 Cup"                      = "西班牙青年杯"
    "Copa Campeones de Division de Honor Juvenil" = "青年冠军杯"
  }
  if ($map.ContainsKey($en)) { return $map[$en] }
  # 青年欧冠小组赛 "UEFA Youth League, Group X"
  if ($en -match '^UEFA Youth League, (Group [A-Z]|Group stage)') { return "青年欧冠 · " + $Matches[1] }
  # U18 俱乐部世界杯
  if ($en -match '^U18 Club World Cup') { return $en.Replace("U18 Club World Cup", "U18 世俱杯") }
  return $en
}

# 出生日期 → 年龄（如 "2008-06-18T00:00:00+00:00" → "18岁"）。
# ConvertFrom-Json 可能把 ISO 日期解析成 [datetime]，这里两种都兼容。
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

# 身价（欧元）→ 中文缩写（如 3300000 → "330万"，3亿+ → "X.X亿"）
function Get-ValueZh($v) {
  if ($null -eq $v) { return "" }
  try { $n = [double]$v } catch { return "" }
  if ($n -le 0) { return "" }
  if ($n -ge 100000000) { return ("{0}亿" -f [math]::Round($n / 100000000, 1)) }
  return ("{0}万" -f [math]::Round($n / 10000, 0))
}

Log "开始 U18 更新（Sofascore 团队 $TeamId）……"

# ── 1. 抓取原始数据 ─────────────────────────────────────────────
$players = Get-SfJson "https://api.sofascore.com/api/v1/team/$TeamId/players" "球员名单"
$lastEv  = Get-SfJson "https://api.sofascore.com/api/v1/team/$TeamId/events/last/0" "已完赛程"
$nextEv  = Get-SfJson "https://api.sofascore.com/api/v1/team/$TeamId/events/next/0" "未来赛程"
$team    = Get-SfJson "https://api.sofascore.com/api/v1/team/$TeamId" "球队信息"

if (-not $players -and -not $lastEv -and -not $nextEv) {
  Log "✗ 全部数据源失败，本次更新中止。"
  exit 1
}

# ── 2. 归一化球员（名单 + 照片 + 伤病 + 身价） ────────────────
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
      photo   = "https://img.sofascore.com/api/v1/player/$($pr.id)/image"
      age     = Get-Age $pr.dateOfBirth
      value   = Get-ValueZh $pr.proposedMarketValue
      injury  = $inj
    }
  }
}

# ── 3. 归一化赛程 ───────────────────────────────────────────────
$matches = @()
foreach ($src in @($lastEv, $nextEv)) {
  if (-not $src -or -not $src.events) { continue }
  foreach ($e in @($src.events)) {
    $isHome = ([string]$e.homeTeam.id -eq $TeamId)
    $matches += [pscustomobject]@{
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
# 只保留 2026 年及以后赛程（2026-01-01 00:00 UTC = 1767225600；旧赛季归档不展示）
$CutoffUnix = 1767225600
# 已完场按时间倒序、未开赛按时间正序（页面渲染时也处理，这里只合并）
$matches = @($matches | Where-Object { [int64]$_.start -ge $CutoffUnix } | Sort-Object { [int64]$_.start })

# ── 4. 生成缓存 ─────────────────────────────────────────────────
$cache = [ordered]@{
  updated = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  source  = "sofascore"
  team    = [pscustomobject]@{
    name    = if ($team -and $team.team) { [string]$team.team.name } else { "FC Barcelona U18" }
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
  } else {
    # Sofascore 未收录 U18 主教练，用本站已知信息兜底
    [pscustomobject]@{ name = "Cesc Bosch"; id = ""; photo = "" }
  }
  players = $playersOut
  matches = $matches
}

# 防空覆盖：Sofascore 抓取失败时球员/赛程为空，用空数据覆盖旧缓存会导致页面空白
if ($playersOut.Count -eq 0 -and $matches.Count -eq 0) {
  Log "  ✗ 本次未抓到球员和赛程（Sofascore 限流/被风控），保留旧缓存不覆盖。"
  exit 0
}

try {
  $json = $cache | ConvertTo-Json -Depth 10
  $js   = "/* 自动生成，请勿手动编辑 —— 由 update_u18_sofascore.ps1 每日更新于 $(Get-Date -Format 'yyyy-MM-dd HH:mm') 数据源：Sofascore */`r`nwindow.DQD_U18_CACHE = $json;`r`n"
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($CacheFile, $js, $utf8)
  Log "  ✓ 球员 $($playersOut.Count) 人，赛程 $($matches.Count) 场，缓存已写入 $CacheFile"
} catch {
  Log "  ✗ 写入缓存失败：$($_.Exception.Message)"
  exit 1
}

Log "U18 更新完成 ✔"
