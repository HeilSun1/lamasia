# ═══════════════════════════════════════════════════════════════
#   拉玛西亚信息站 · 官方站青年梯队赛程（U19B、U16、U15、U14、U13、U12）每日更新
#
#   调用官网背后的 pulselive 通用赛事接口
#     api-fcb.pulselive.com/genericsport/fby/fixtures
#   一次拿到本赛季的「未开赛」与「已完场（含比分）」，归一化后写
#   assets/js/fcb-youth-schedules.js。
#
#   · 2026-09-27 重构：此前用无头 Edge 渲染官网 calendario 页再解析 DOM。
#     但 calendario 按设计只列未开赛的场次，踢完就从页面消失 —— 于是本站
#     这批梯队的「已完场」恒为空，踢过的比赛查不到。官网的赛果其实在另一个
#     /resultados 页，而两个页面背后都是同一个 JSON 接口。
#     改调接口后：有比分、有 ISO 日期、curl 直接可取（无反爬），不再需要
#     无头 Edge —— 连带 9 月官网风控引出的 18 小时抓取闸门、90 秒渲染超时、
#     三次重试全部移除。
#   · 接口的 content-type 不带 charset，PS 5.1 的 Invoke-RestMethod 会按
#     ISO-8859-1 解码，把 "Cornellà" 解成 "CornellÃ "（2026-09-27 实测）。
#     所以取数必须走 curl.exe 落盘 + .NET ReadAllText(UTF8) 再 ConvertFrom-Json。
#   · 只取本赛季联赛：以「未开赛」里占比最高的 (competitionId, compSeasonId)
#     为准，滤掉旧赛季与杯赛残留（接口会把历史赛季甚至 2012 年的比赛一起返回）。
#   · 时间待定（time 为空）用当日正午占位；西班牙本地时间经 Windows 时区
#     "Romance Standard Time" 转 UTC（自动处理 DST）。
#
#   由 run_daily_update.ps1 / GitHub Actions 每天调用；日志 scripts/fcb-youth-update.log
# ═══════════════════════════════════════════════════════════════
param(
  [switch] $Force   # 保留参数以兼容既有调用方（抓取闸门已移除，现在无实际作用）
)

$ErrorActionPreference = "Stop"

$Root      = Split-Path -Parent $PSScriptRoot
$LogFile   = Join-Path $Root "scripts\fcb-youth-update.log"
$OutFile   = Join-Path $Root "assets\js\fcb-youth-schedules.js"
$UTF8      = New-Object System.Text.UTF8Encoding($false)

# ── 配置：本站 key → 官网 teamId + slug + 赛事名 ────────────────
# teamId 即官网页面上各梯队赛程组件的 data-barcelona-team-id（长期稳定）。
# 与抓取结果交叉验证过：U19B=11110、U16=11111、U15=11112、U14=11113、U13=11114、U12=11115。
$Tiers = @(
  # U19A（Juvenil A）：2026-10-01 接入。原来是走 Sofascore（teamId 90128），
  # Sofascore 封了我们之后就断了，改从官网取赛程。
  # teamId 8470 是用户给的官网页面 www.fcbarcelona.es/es/futbol/juvenil-a/calendario
  # 源码里 <... data-barcelona-team-id="8470"> 读出来的，实测接口返回 34 场、
  # 对手含 Sabadell A / Racing Club Zaragoza（西青甲），对得上。
  # 注意：**别用 pulselive 反推的号段去猜**，我试过 11117，那是另一支队。
  @{ id = "juvenil-a";  teamId = 8470;  slug = "juvenil-a";  comp = "西青甲 G3";               compEn = "División de Honor Juvenil G.3" },
  @{ id = "cadete";     teamId = 11111; slug = "cadete-a";   comp = "加泰荣誉联赛 Cadete";    compEn = "División de Honor Catalana Cadete" },
  @{ id = "cadete-b";   teamId = 11112; slug = "cadete-b";   comp = "加泰优选联赛 Cadete G1"; compEn = "Preferente Catalana Cadete G.1" },
  @{ id = "infantil";   teamId = 11113; slug = "infantil-a"; comp = "加泰荣誉联赛 Infantil";  compEn = "División de Honor Catalana Infantil" },
  @{ id = "infantil-b"; teamId = 11114; slug = "infantil-b"; comp = "加泰优选联赛 Infantil G1"; compEn = "Preferente Catalana Infantil G.1" },
  @{ id = "infantil-c"; teamId = 11115; slug = "alevin-a";   comp = "加泰优选联赛 Alevín G1";  compEn = "Preferente Catalana Alevín G.1" },
  @{ id = "juvenil-b";  teamId = 11110; slug = "juvenil-b";  comp = "西青乙 G7";               compEn = "Liga Nacional Grupo 7" }
)

$ApiBase = "https://api-fcb.pulselive.com/genericsport/fby/fixtures"

# curl.exe：不要用裸 "curl" —— PS 5.1 里那是 Invoke-WebRequest 的别名
$CurlExe = Join-Path $env:SystemRoot "System32\curl.exe"
if (-not (Test-Path $CurlExe)) { $CurlExe = "curl.exe" }
$Ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

function Log([string]$msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
  Write-Host $line
}

# 取某梯队某状态的赛程。$MatchStatus 为 U（未开赛）或 C（已完场）。
# $CompSeasonId > 0 时交给服务端过滤，减少无关数据。
function Get-Fixtures([int]$TeamId, [string]$MatchStatus, [int]$CompSeasonId) {
  $url = $ApiBase + "?teamId=$TeamId&pageSize=100&order=OLDEST_FIRST&matchStatuses=$MatchStatus"
  if ($CompSeasonId -gt 0) { $url += "&compSeasonId=$CompSeasonId" }
  $tmp = Join-Path $env:TEMP ("fcb-youth-" + [guid]::NewGuid().ToString("N") + ".json")
  try {
    & $CurlExe -s -m 40 -A $Ua -H "Origin: https://www.fcbarcelona.es" -o $tmp $url 2>$null
    if (-not (Test-Path $tmp)) { return @() }
    $txt = [System.IO.File]::ReadAllText($tmp, $UTF8)   # 必须显式 UTF8，否则重音队名变乱码
    if (-not $txt) { return @() }
    return @(($txt | ConvertFrom-Json).content)
  } finally {
    Remove-Item $tmp -ErrorAction SilentlyContinue
  }
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

# ── 主流程 ────────────────────────────────────────────────────
Log "开始官方站青年梯队赛程更新（pulselive 赛事接口）……"
$allMatches = [ordered]@{}
$teamMeta   = [ordered]@{}
$anyOk = $false
$failed = @()

# 上一版结果：本次抓失败的梯队沿用旧数据，避免一次网络抖动就把该梯队
# 从站上抹掉（产物是整体覆盖写，不是逐队更新）。解析失败则当没有旧版。
$prev = $null
if (Test-Path $OutFile) {
  try {
    $ptxt = [System.IO.File]::ReadAllText($OutFile, $UTF8)
    $a = $ptxt.IndexOf("{"); $b = $ptxt.LastIndexOf("}")
    if ($a -ge 0 -and $b -gt $a) { $prev = $ptxt.Substring($a, $b - $a + 1) | ConvertFrom-Json }
  } catch { $prev = $null; Log "  · 旧缓存解析失败（$($_.Exception.Message)），本次不做沿用" }
}

foreach ($tier in $Tiers) {
  Log "  · $($tier.id)（teamId $($tier.teamId)）……"

  $up = @(Get-Fixtures $tier.teamId "U" 0)
  if (-not $up.Count) { Log "  ✗ $($tier.id) 未开赛为空（学期间隙/接口变化），本次跳过"; $failed += $tier.id; continue }

  # 本赛季联赛 = 未开赛里占比最高的 (competitionId, compSeasonId)
  $key = ($up | Group-Object { "$($_.competitionId)/$($_.compSeasonId)" } |
          Sort-Object Count -Descending | Select-Object -First 1).Name
  $up  = @($up | Where-Object { "$($_.competitionId)/$($_.compSeasonId)" -eq $key })
  $season = [int]($key -split '/')[1]

  $done = @(Get-Fixtures $tier.teamId "C" $season |
            Where-Object { "$($_.competitionId)/$($_.compSeasonId)" -eq $key })

  # 未开赛 + 已完场，按开球时间排序后编号轮次
  $staged = @()
  foreach ($x in ($up + $done)) {
    $unix, $tbd = ConvertTo-UnixSec $x.date $x.time
    $staged += [pscustomobject]@{ x = $x; start = [int64]$unix; tbd = $tbd; fin = ($x.status -eq "FINISHED") }
  }
  $staged = @($staged | Sort-Object { $_.start })

  $list = @()
  for ($i = 0; $i -lt $staged.Count; $i++) {
    $s = $staged[$i]; $x = $s.x
    $list += [pscustomobject][ordered]@{
      id     = "fcb:$($tier.id):$($x.id)"
      comp   = $tier.comp
      compEn = $tier.compEn
      round  = [string]($i + 1)
      start  = [string]$s.start
      date   = [string]$x.date
      tbd    = $s.tbd
      home   = [string]$x.homeTeamName
      away   = [string]$x.awayTeamName
      homeId = [string]$x.homeTeamId
      awayId = [string]$x.awayTeamId
      hs     = if ($s.fin) { [string]$x.homeScore } else { "" }
      as     = if ($s.fin) { [string]$x.awayScore } else { "" }
      status = if ($s.fin) { "Ended" } else { "Not started" }
      code   = "0"
      isHome = ([string]$x.homeTeamName -match 'FC Barcelona')
      venue  = [string]$x.stadium
    }
  }

  $allMatches[$tier.id] = $list
  $teamMeta[$tier.id]   = [ordered]@{ comp = $tier.comp; compEn = $tier.compEn; slug = $tier.slug }
  $anyOk = $true
  Log "  ✓ $($tier.id) 收录 $($list.Count) 场（已完场 $($done.Count)、未开赛 $($up.Count)；赛事 $key）"
}

# 抓失败的梯队：沿用上一版，宁可数据旧一点也不要有队消失
foreach ($fid in $failed) {
  $names = @()
  if ($prev) { $names = @($prev.matches.PSObject.Properties.Name) }
  if ($names -contains $fid) {
    $allMatches[$fid] = @($prev.matches.$fid)
    $teamMeta[$fid]   = $prev.teams.$fid
    Log "  ↺ $fid 本次抓取失败，沿用上一版缓存（$(@($prev.matches.$fid).Count) 场）"
  } else {
    Log "  ✗ $fid 本次抓取失败且无旧缓存可沿用，该梯队本次缺席"
  }
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
$js = "/* 自动生成，请勿手动编辑 —— 由 scripts/update_fcb_youth_schedules.ps1 更新于 $(Get-Date -Format 'yyyy-MM-dd HH:mm')；数据源：FC Barcelona 官网赛事接口 */`r`nwindow.LAMASIA_SCHEDULES = $($cache | ConvertTo-Json -Depth 8);`r`n"
try {
  [System.IO.File]::WriteAllText($OutFile, $js, $UTF8)
  Log "  ✓ 已写入 $OutFile（$($allMatches.Count) 个梯队 / $total 场）"
} catch {
  Log "  ✗ 写入缓存失败：$($_.Exception.Message)"
  exit 1
}

Log "官方站青年梯队赛程更新完成 ✔"
