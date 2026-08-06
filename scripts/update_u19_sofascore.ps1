# ═══════════════════════════════════════════════════════════════
#   拉玛西亚信息站 · 巴萨U19（Juvenil A）每日更新脚本
#
#   每天用 Edge 无头模式抓取 Sofascore 的巴萨 U19 数据，生成本地缓存：
#     Sofascore 有 TLS 指纹反爬（curl 一律 403），但真浏览器指纹可通过，
#     因此用本机 Edge 的 --headless --dump-dom 来取 JSON。
#     （配置在 scripts/sofascore-edge-path.txt，若为空自动探测）
#
#     1. 球员名单 + 伤病   /api/v1/team/90128/players
#     2. 历史赛程          /api/v1/team/90128/events/last/0
#     3. 未来赛程          /api/v1/team/90128/events/next/0
#     4. 球队信息          /api/v1/team/90128
#     生成缓存 assets/js/dqd-u19-cache.js（window.DQD_U19_CACHE）
#
#   由计划任务每天调用；日志 scripts/u19-update.log
#   ⚠️ 数据来自 Sofascore 非官方接口，仅供个人学习使用，可能随时变动。
# ═══════════════════════════════════════════════════════════════
$ErrorActionPreference = "Stop"

$TeamId     = "90128"     # Sofascore 巴萨 U19（足球，西青甲 G3 + 青年欧冠）
$Root       = Split-Path -Parent $PSScriptRoot
$CacheFile  = Join-Path $Root "assets\js\dqd-u19-cache.js"
$LogFile    = Join-Path $Root "scripts\u19-update.log"
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

# 一次 Edge 抓取所有球员的本赛季统计（出场/进球/助攻）
# 用 wrapper 页在浏览器里并发 fetch 各球员 /statistics，输出 "id:app:goals:assists|..." 供解析。
function Get-AllPlayerStats($playerIds) {
  $statsMap = @{}
  if (-not $playerIds -or @($playerIds).Count -eq 0) { return $statsMap }
  $idsJson = (@($playerIds) | ForEach-Object { '"' + $_ + '"' }) -join ","
  $html = @'
<!DOCTYPE html><html><body>
<script>
var ids = [__IDS__];
var out = []; var done = 0;
function collect(id, d){
  var app=0,goals=0,assists=0;
  if(d && d.seasons && d.seasons.length){
    var maxY="";
    d.seasons.forEach(function(s){ if(s.season && s.season.year && String(s.season.year)>maxY) maxY=String(s.season.year); });
    d.seasons.forEach(function(s){ if(s.season && String(s.season.year)===maxY && s.statistics){
      app+=(s.statistics.appearances||0); goals+=(s.statistics.goals||0); assists+=(s.statistics.assists||0);
    }});
  }
  out.push(id+":"+app+":"+goals+":"+assists);
  done++; if(done===ids.length) document.body.innerHTML=out.join("|");
}
ids.forEach(function(id){
  fetch("https://api.sofascore.com/api/v1/player/"+id+"/statistics")
    .then(function(r){ if(!r.ok) return null; return r.json(); })
    .then(function(d){ collect(id,d); })
    .catch(function(){ collect(id,null); });
});
</script>
</body></html>
'@
  $html = $html.Replace("__IDS__", $idsJson)
  $tmp = Join-Path $env:TEMP ("stats_" + [guid]::NewGuid().ToString("N") + ".html")
  [System.IO.File]::WriteAllText($tmp, $html, (New-Object System.Text.UTF8Encoding($false)))
  $fileUrl = "file:///" + ($tmp -replace '\\', '/')
  $prevEAP = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $dump = (& $Edge --headless=new --disable-gpu --no-first-run --disable-extensions `
        "--user-data-dir=$Profile" --virtual-time-budget=30000 --dump-dom $fileUrl 2>$null | Out-String)
  } finally {
    $ErrorActionPreference = $prevEAP
  }
  Remove-Item $tmp -Force -ErrorAction SilentlyContinue
  $m = [regex]::Match($dump, '<body>(.*)</body>', [System.Text.RegularExpressions.RegexOptions]::Singleline)
  if ($m.Success) {
    foreach ($seg in ($m.Groups[1].Value -split '\|')) {
      $parts = $seg -split ':'
      if ($parts.Count -ge 4) {
        $statsMap[$parts[0]] = [pscustomobject]@{
          app = $parts[1]; goals = $parts[2]; assists = $parts[3]
        }
      }
    }
  }
  return $statsMap
}

Log "开始 U19 更新（Sofascore 团队 $TeamId）……"

# ── 1. 抓取原始数据 ─────────────────────────────────────────────
$players = Get-SfJson "https://api.sofascore.com/api/v1/team/$TeamId/players" "球员名单"
$lastEv  = Get-SfJson "https://api.sofascore.com/api/v1/team/$TeamId/events/last/0" "已完赛程"
$nextEv  = Get-SfJson "https://api.sofascore.com/api/v1/team/$TeamId/events/next/0" "未来赛程"
$team    = Get-SfJson "https://api.sofascore.com/api/v1/team/$TeamId" "球队信息"

if (-not $players -and -not $lastEv -and -not $nextEv) {
  Log "✗ 全部数据源失败，本次更新中止。"
  exit 1
}

# ── 2. 归一化球员（名单 + 照片 + 伤病 + 身价 + 赛季统计） ───────
$playersOut = @()
$statsMap = @{}
if ($players -and $players.players) {
  $playerIds = @(@($players.players) | ForEach-Object { [string]$_.player.id })
  $statsMap = Get-AllPlayerStats $playerIds
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
    $st = if ($statsMap.ContainsKey($playerId)) { $statsMap[$playerId] } else { $null }
    $playersOut += [pscustomobject]@{
      name    = [string]$pr.name
      id      = $playerId
      pos     = [string]$pr.position
      shirt   = [string]$p.shirtNumber
      team    = [string]$pr.team.name
      photo   = "https://img.sofascore.com/api/v1/player/$($pr.id)/image"
      age     = Get-Age $pr.dateOfBirth
      value   = Get-ValueZh $pr.proposedMarketValue
      app     = if ($st) { [string]$st.app } else { "" }
      goals   = if ($st) { [string]$st.goals } else { "" }
      assists = if ($st) { [string]$st.assists } else { "" }
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
# 已完场按时间倒序、未开赛按时间正序（页面渲染时也处理，这里只合并）
$matches = @($matches | Sort-Object { [int64]$_.start })

# ── 4. 生成缓存 ─────────────────────────────────────────────────
$cache = [ordered]@{
  updated = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  source  = "sofascore"
  team    = [pscustomobject]@{
    name    = if ($team -and $team.team) { [string]$team.team.name } else { "FC Barcelona U19" }
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
  matches = $matches
}

try {
  $json = $cache | ConvertTo-Json -Depth 10
  $js   = "/* 自动生成，请勿手动编辑 —— 由 update_u19_sofascore.ps1 每日更新于 $(Get-Date -Format 'yyyy-MM-dd HH:mm') 数据源：Sofascore */`r`nwindow.DQD_U19_CACHE = $json;`r`n"
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($CacheFile, $js, $utf8)
  Log "  ✓ 球员 $($playersOut.Count) 人，赛程 $($matches.Count) 场，缓存已写入 $CacheFile"
} catch {
  Log "  ✗ 写入缓存失败：$($_.Exception.Message)"
  exit 1
}

Log "U19 更新完成 ✔"
