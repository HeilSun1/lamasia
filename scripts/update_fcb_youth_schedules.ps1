# ═══════════════════════════════════════════════════════════════
#   拉玛西亚信息站 · 官方站青年梯队赛程（JuvenilB、CadeteA/B、InfantilA/B）每日更新
#
#   Edge 无头渲染 fcbarcelona.es 各梯队 calendario 页面，解析赛程，
#   归一化为本站 match 形状，写 assets/js/fcb-youth-schedules.js。
#
#   · 页面 JS 异步加载赛程，需 --virtual-time-budget 等渲染完成
#   · 每场 mobile/desktop 双份渲染，按 (日期,主客) 去重
#   · 时间多数为待定（data-time=""）→ start 用当日正午换算、tbd=true
#   · 西班牙本地时间经 Windows 时区 "Romance Standard Time" 转 UTC（自动处理 DST）
#   · match id 用官方 data-fixture-id（全季唯一、跨次抓取稳定）
#
#   由 run_daily_update.ps1 / GitHub Actions 每天调用；日志 scripts/fcb-youth-update.log
# ═══════════════════════════════════════════════════════════════
$ErrorActionPreference = "Stop"

$Root      = Split-Path -Parent $PSScriptRoot
$LogFile   = Join-Path $Root "scripts\fcb-youth-update.log"
$OutFile   = Join-Path $Root "assets\js\fcb-youth-schedules.js"
$UTF8      = New-Object System.Text.UTF8Encoding($false)

# ── 配置：本站 key → 官方 slug + 赛事名（id→中文见竞争列表，未知回退英文） ──
$Tiers = @(
  @{ id = "cadete";     slug = "cadete-a";   comp = "加泰荣誉联赛 Cadete";   compEn = "División de Honor Catalana Cadete" },
  @{ id = "cadete-b";   slug = "cadete-b";   comp = "加泰优选联赛 Cadete G1"; compEn = "Preferente Catalana Cadete G.1" },
  @{ id = "infantil";   slug = "infantil-a"; comp = "加泰荣誉联赛 Infantil";  compEn = "División de Honor Catalana Infantil" },
  @{ id = "infantil-b"; slug = "infantil-b"; comp = "加泰优选联赛 Infantil G1";compEn = "Preferente Catalana Infantil G.1" },
  @{ id = "juvenil-b";  slug = "juvenil-b";  comp = "西青乙 G7";               compEn = "Liga Nacional Grupo 7" }
)

# ── 定位 Edge（优先配置文件，其次常见路径） ──────────────────────
$EdgeCfg = Join-Path $PSScriptRoot "sofascore-edge-path.txt"
$Edge = ""
if (Test-Path $EdgeCfg) { $Edge = (Get-Content $EdgeCfg -Raw -ErrorAction SilentlyContinue).Trim() }
if (-not $Edge -or -not (Test-Path $Edge)) {
  foreach ($p in @(
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
  )) { if (Test-Path $p) { $Edge = $p; break } }
}
if (-not (Test-Path $Edge)) { Write-Host "找不到 Edge！请把 msedge.exe 路径写入 $EdgeCfg"; exit 1 }
$Profile = Join-Path $env:TEMP "fcb-youth-headless-profile"

function Log([string]$msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
  Write-Host $line
}

# Edge 无头渲染页面 → 完整 HTML（有重试；风控/空页返回 ""）
function Get-FcbHtml([string]$url, [string]$what) {
  for ($attempt = 1; $attempt -le 3; $attempt++) {
    try {
      $prevEAP = $ErrorActionPreference
      $ErrorActionPreference = "Continue"
      $html = (& $Edge --headless=new --disable-gpu --no-first-run --disable-extensions `
          --disable-blink-features=AutomationControlled `
          "--user-data-dir=$Profile" --virtual-time-budget=35000 --dump-dom $url 2>$null | Out-String)
      $ErrorActionPreference = $prevEAP
      if ($html -and $html.IndexOf("fixture-result-list__fixture") -ge 0) { return $html }
      Log "  · $what 第 $attempt 次未解析到赛程（渲染/风控），重试"
    } catch {
      Log "  ✗ $what 第 $attempt 次抓取失败：$($_.Exception.Message)"
    }
    Start-Sleep -Seconds 8
  }
  return ""
}

# 西班牙本地时间 → UTC unix 秒（Windows "Romance Standard Time" 自动处理夏令时）
# 时间待定则用当日正午 12:00 占位（北京显示不跨天）；返回 (unix, tbd)
function ConvertTo-UnixSec([string]$dateStr, [string]$timeStr) {
  $y = [int]$dateStr.Substring(0,4); $m = [int]$dateStr.Substring(5,2); $d = [int]$dateStr.Substring(8,2)
  $hh = 12; $mm = 0; $tbd = $true
  if ($timeStr -match '^(\d{1,2}):(\d{2})') { $hh = [int]$Matches[1]; $mm = [int]$Matches[2]; $tbd = $false }
  try {
    $tz = [System.TimeZoneInfo]::FindSystemTimeZoneById("Romance Standard Time")   # 马德里时区
    $local = [datetime]::new($y, $m, $d, $hh, $mm, 0)
    $utc = [System.TimeZoneInfo]::ConvertTimeToUtc($local, $tz)
    return ([DateTimeOffset]::new($utc)).ToUnixTimeSeconds(), $tbd
  } catch {
    # 兜底：按 UTC+1 近似
    $utc = [datetime]::SpecifyKind(([datetime]::new($y, $m, $d, $hh, $mm, 0)).AddHours(-1), [DateTimeKind]::Utc)
    return ([DateTimeOffset]::new($utc)).ToUnixTimeSeconds(), $tbd
  }
}

# 从渲染 HTML 解析一个梯队的 fixtures（双份去重 + 归一化）
function Get-TierMatches([string]$html, [hashtable]$cfg) {
  $parts = $html -split [regex]::Escape('<li class="fixture-result-list__fixture')
  $map = @{}
  foreach ($p in @($parts | Select-Object -Skip 1)) {
    if ($p.IndexOf("data-fixture-date") -ge 512) { continue }
    $open = $p.Substring(0, $p.IndexOf(">") + 1)
    $fid = [regex]::Match($open, 'data-fixture-id="(\d+)"').Groups[1].Value
    $hId = [regex]::Match($open, 'data-home-team="([^"]+)"').Groups[1].Value
    $aId = [regex]::Match($open, 'data-away-team="([^"]+)"').Groups[1].Value
    $body = $p.Substring($p.IndexOf(">") + 1)
    $time = [regex]::Match($body, 'data-time="([^"]*)"').Groups[1].Value
    $date = [regex]::Match($body, 'data-date="([^"]+)"').Groups[1].Value
    $hm = [regex]::Match($body, 'fixture-info__name fixture-info__name--home">\s*(.*?)\s*</div>', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    $am = [regex]::Match($body, 'fixture-info__name fixture-info__name--away">\s*(.*?)\s*</div>', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    $vm = [regex]::Match($body, 'stage-location">\s*(.*?)\s*</div>', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    if (-not $date -or -not $hm.Success -or -not $am.Success -or -not $fid) { continue }
    $hname = $hm.Groups[1].Value.Trim(); $aname = $am.Groups[1].Value.Trim()
    if (-not $hname -or -not $aname) { continue }
    $k = "$date|$hname|$aname"          # mobile/desktop 双份去重
    if ($map.ContainsKey($k)) { continue }
    $unix, $tbd = ConvertTo-UnixSec $date $time
    $map[$k] = [pscustomobject]@{
      id       = "fcb:$($cfg.id):$fid"
      comp     = $cfg.comp
      compEn   = $cfg.compEn
      round    = ""
      start    = [string]$unix
      date     = $date
      tbd      = $tbd
      home     = $hname
      away     = $aname
      homeId   = $hId
      awayId   = $aId
      hs       = ""
      as       = ""
      status   = "Not started"
      code     = "0"
      isHome   = ($hname -match 'FC Barcelona')
      venue    = if ($vm.Success) { $vm.Groups[1].Value.Trim() } else { "" }
    }
  }
  # DOM 顺序即轮次顺序（按 start 排序后赋 round 1..N）
  $list = @($map.Values | Sort-Object { [int64]$_.start })
  for ($i = 0; $i -lt $list.Count; $i++) { $list[$i].round = [string]($i + 1) }
  return @($list)
}

# ── 主流程 ────────────────────────────────────────────────────
Log "开始官方站青年梯队赛程更新（Edge 无头渲染 fcbarcelona.es calendario）……"
$allMatches = [ordered]@{}
$teamMeta   = [ordered]@{}
$anyOk = $false

foreach ($tier in $Tiers) {
  $url = "https://www.fcbarcelona.es/es/futbol/formativo-masculino/$($tier.slug)/calendario"
  Log "  · $($tier.id)（$($tier.slug)）：$url"
  $html = Get-FcbHtml $url "$($tier.id) calendario"
  if (-not $html) { Log "  ✗ $($tier.id) 渲染失败（风控/网络），本次跳过"; continue }
  $ms = @(Get-TierMatches $html $tier)
  Log "  · $($tier.id) 解析到 $($ms.Count) 场"
  if (-not $ms.Count) { Log "  ✗ $($tier.id) 无赛程（页面结构变化或赛季未排）"; continue }
  $allMatches[$tier.id] = $ms
  $teamMeta[$tier.id]   = [ordered]@{ comp = $tier.comp; compEn = $tier.compEn; slug = $tier.slug }
  $anyOk = $true
  Log "  ✓ $($tier.id) 收录 $($ms.Count) 场（comp：$($tier.comp)）"
  Start-Sleep -Milliseconds 800
}

if (-not $anyOk) {
  Log "✗ 全部梯队抓取失败，保留旧缓存不覆盖"
  exit 1
}

# 防空覆盖：全部梯队为空（结构变动）→ 不覆盖
$total = 0
foreach ($v in $allMatches.Values) { $total += @($v).Count }
if ($total -eq 0) { Log "✗ 解析结果为 0 场，保留旧缓存不覆盖"; exit 1 }

$cache = [ordered]@{
  updated = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  source  = "fcbarcelona"
  teams   = $teamMeta
  matches = $allMatches
}
$js = "/* 自动生成，请勿手动编辑 —— 由 scripts/update_fcb_youth_schedules.ps1 更新于 $(Get-Date -Format 'yyyy-MM-dd HH:mm')；数据源：FC Barcelona 官网 calendario */`r`nwindow.LAMASIA_SCHEDULES = $($cache | ConvertTo-Json -Depth 8);`r`n"
try {
  [System.IO.File]::WriteAllText($OutFile, $js, $UTF8)
  Log "  ✓ 已写入 $OutFile（$($allMatches.Count) 个梯队 / $total 场）"
} catch {
  Log "  ✗ 写入缓存失败：$($_.Exception.Message)"
  exit 1
}

Log "官方站青年梯队赛程更新完成 ✔"
