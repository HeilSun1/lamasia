# ═══════════════════════════════════════════════════════════════
#   拉玛西亚信息站 · 青年梯队逐场阵容 / 进球详情缓存
#   支持：U15（cadete-b，默认）/ U19B（juvenil-b）/ U16（cadete）/
#         U14（infantil）/ U13（infantil-b）/ U12（infantil-c），用 -Tier 指定
#
#   为什么有这条链路：
#     青年梯队赛程走 pulselive 接口，只有比分、没有阵容和事件，
#     match-detail 弹窗在这些队上只能显示基本信息。
#     elfutbol.co 的逐场页有阵容 + 进球/换人/牌时间轴，故补这一层。
#
#   抓取链路：
#     1) 读 assets/js/fcb-youth-schedules.js，取指定梯队（-Tier，默认 cadete-b）已完场的比赛
#     2) 抓 elfutbol 队伍页，按「日期」把每场映射到 /en/match/.../jN
#        （日期对同一支队唯一，比用轮次稳 —— pulselive 会漏掉未排期的轮次，
#          导致我们的 round 号与 elfutbol 的 J 号错位）
#     3) 抓每个单场页，解析阵容 + 事件
#     4) 写各梯队对应的 assets/js/elfutbol-<tier>-details-cache.js
#        window.ELFUTBOL_<TIER>_DETAILS_CACHE（形状与 dqd-*-details-cache 一致，
#        直接复用 match-detail.js 的 applyDetail 渲染，无需新前端代码）
#
#   ⚠️ elfutbol 无 CORS 头 → 浏览器不能直取，只能由本脚本服务端抓成缓存。
#   ⚠️ 第三方聚合站、无 API 契约（其上游 fcf.cat 的链接已 404 过一次）
#      → 任何一次抓取失败一律保留旧缓存，绝不写空。
#   ⚠️ 已抓过的场次不重复抓（缓存按比赛 id 合并，只补缺的）；-Force 可全量重抓。
#   ⚠️ elfutbol 的牌只有一种灰色块，不区分黄/红 → 标成中性的「牌」，不猜颜色。
# ═══════════════════════════════════════════════════════════════
param(
  [ValidateSet("cadete-b", "juvenil-b", "cadete", "infantil", "infantil-b", "infantil-c")]
  [string] $TierKey = "cadete-b",   # 站内梯队键（与 fcb-youth-schedules.js 的 tier 一致）
  [switch] $Force                 # 忽略已有缓存，全部重抓
)

$ErrorActionPreference = "Stop"
$Root      = Split-Path -Parent $PSScriptRoot
$Schedules = Join-Path $Root "assets\js\fcb-youth-schedules.js"
$CrestFile = Join-Path $Root "assets\js\elfutbol-crests-cache.js"
$LogFile   = Join-Path $Root "scripts\elfutbol-details-update.log"

# 逐场详情支持的梯队：站内 tier → elfutbol 队伍页 + 产物文件/全局名。
# elfutbol 的队伍页 slug 用官方 SUB 命名（S14 = 站内 U14），与站内 U13/U14 的叫法差一档，别按名字猜。
$TierCfg = @{
  "cadete-b" = @{
    Url = "https://elfutbol.co/en/team/barcelona-fc-cadet-s15-a?season=2627&tab=resultados"
    File = "assets\js\elfutbol-cadete-b-details-cache.js"
    Global = "ELFUTBOL_CADETE_B_DETAILS_CACHE"
    Label = "U15（Cadete B）"
  }
  "juvenil-b" = @{
    Url = "https://elfutbol.co/en/team/barcelona-fc-juvenil-b?season=2627&tab=resultados"
    File = "assets\js\elfutbol-juvenil-b-details-cache.js"
    Global = "ELFUTBOL_JUVENIL_B_DETAILS_CACHE"
    Label = "U19B（Juvenil B）"
  }
  "cadete" = @{
    Url = "https://elfutbol.co/en/team/barcelona-fc-cadet-s16-a?season=2627&tab=resultados"
    File = "assets\js\elfutbol-cadete-details-cache.js"
    Global = "ELFUTBOL_CADETE_DETAILS_CACHE"
    Label = "U16（Cadete A）"
  }
  "infantil" = @{
    Url = "https://elfutbol.co/en/team/barcelona-fc-infantil-s14-a?season=2627&tab=resultados"
    File = "assets\js\elfutbol-infantil-details-cache.js"
    Global = "ELFUTBOL_INFANTIL_DETAILS_CACHE"
    Label = "U14（Infantil A）"
  }
  "infantil-b" = @{
    Url = "https://elfutbol.co/en/team/barcelona-fc-infantil-s13-a?season=2627&tab=resultados"
    File = "assets\js\elfutbol-infantil-b-details-cache.js"
    Global = "ELFUTBOL_INFANTIL_B_DETAILS_CACHE"
    Label = "U13（Infantil B）"
  }
  "infantil-c" = @{
    Url = "https://elfutbol.co/en/team/barcelona-fc-infantil-s13-b?season=2627&tab=resultados"
    File = "assets\js\elfutbol-infantil-c-details-cache.js"
    Global = "ELFUTBOL_INFANTIL_C_DETAILS_CACHE"
    Label = "U12（Infantil C）"
  }
}
$Cfg = $TierCfg[$TierKey]
if (-not $Cfg) { throw "未知梯队：$TierKey" }

$TierId  = $TierKey
$TeamUrl = $Cfg.Url
$OutFile = Join-Path $Root $Cfg.File
$Label   = $Cfg.Label

# 各梯队队徽来源。键与 assets/js/fcb-youth-schedules.js 的 tier 一致。
# 当前梯队（-Tier）复用详情抓取时已抓的队伍页；其余梯队用各自的队伍页。
# 2026-10-20 起由「只抓 U15」扩到全部官方站梯队 —— pulselive 的对手队徽全是 403，
# 不补这层，比赛信息页「即将到来」只有巴萨自己的队徽。
$CrestTiers = [ordered]@{
  "juvenil-a"  = "https://elfutbol.co/en/team/barcelona-f-c-a?comp=divisio-honor-juvenil&group=grup-3&season=2627&tab=resultados"
  "cadete"     = "https://elfutbol.co/en/team/barcelona-fc-cadet-s16-a?season=2627&tab=resultados"
  "cadete-b"   = "https://elfutbol.co/en/team/barcelona-fc-cadet-s15-a?season=2627&tab=resultados"
  "infantil"   = "https://elfutbol.co/en/team/barcelona-fc-infantil-s14-a?season=2627&tab=resultados"
  # ⚠️ 站点 tier 名与 elfutbol 年龄组并不一一对应（pulselive 的标签有一档偏移）：
  #   infantil-b 的数据实际是 DH Infantil S13（Barça A）
  #   infantil-c 的数据实际是 Preferent Infantil S13（Barça B）
  # 用错组会「每个日期都能匹配上、但对手全错」，所以以对手名单为准，别按名称猜。
  "infantil-b" = "https://elfutbol.co/en/team/barcelona-fc-infantil-s13-a?season=2627&tab=resultados"
  "infantil-c" = "https://elfutbol.co/en/team/barcelona-fc-infantil-s13-b?season=2627&tab=resultados"
  "juvenil-b"  = "https://elfutbol.co/en/team/barcelona-fc-juvenil-b?season=2627&tab=resultados"
}
$Inv = [Globalization.CultureInfo]::InvariantCulture

# 一律不带 BOM：产物是 .js，BOM 会让前端多出三个不可见字符
$Utf8 = New-Object System.Text.UTF8Encoding($false)

# curl.exe：不要用裸 "curl" —— PS 5.1 里那是 Invoke-WebRequest 的别名
$CurlExe = Join-Path $env:SystemRoot "System32\curl.exe"
if (-not (Test-Path $CurlExe)) { $CurlExe = "curl.exe" }
$Ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

function Log([string]$m) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $m"
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
  Write-Host $line
}

# 抓页：curl.exe 落盘 + .NET 显式 UTF8 读。
# 不用 Invoke-RestMethod —— PS 5.1 会按 ISO-8859-1 解码（接口不带 charset），
# 重音队名会变乱码。也不用 Get-Content -Encoding UTF8（非法字节会静默吞行）。
function Get-Html([string]$url) {
  $tmp = Join-Path $env:TEMP ("elfutbol-" + [guid]::NewGuid().ToString("N") + ".html")
  try {
    & $CurlExe -s -L -m 45 -A $Ua -o $tmp $url 2>$null
    if (-not (Test-Path $tmp)) { return $null }
    if ((Get-Item $tmp).Length -lt 2000) { return $null }   # 太短 = 半个页面 / 错误页
    return [System.IO.File]::ReadAllText($tmp, $Utf8)
  } finally {
    Remove-Item $tmp -ErrorAction SilentlyContinue
  }
}

# ── 解析器 ──────────────────────────────────────────────────────
# 阵容卡里每个球员：<li class="..."><span ...>号码</span><a href="/en/player/...">姓名</a></li>
$RxPlayer = [regex]'<li class="[^"]*"><span[^>]*>(\d+)</span><a[^>]*href="(/en/player/[^"]*)"[^>]*>([^<]+)</a></li>'
# 事件行：三列网格，左列=主队、中列=分钟、右列=客队
$RxRow    = '<div class="grid grid-cols-\[1fr_auto_1fr\] items-center gap-2 px-3 py-2">'

# 从一段 HTML 里抽球员。$bench = 是否替补（决定渲染到「首发」还是「替补」栏）
function Get-Players([string]$chunk, [bool]$bench) {
  $out = @()
  foreach ($m in $RxPlayer.Matches($chunk)) {
    $out += [ordered]@{
      player       = [ordered]@{ name = $m.Groups[3].Value.Trim() }
      jerseyNumber = $m.Groups[1].Value
      position     = ""
      substitute   = $bench
    }
  }
  return ,$out
}

# 阵容卡：<div class="grid grid-cols-2 divide-x"> 里两个 <div class="p-4">，
# 各自 = <p ...>队名</p> + 首发 <ul> + <p>Substitutes</p> + 替补 <ul>
# 返回 @(主队, 客队)，各含 { team = 队名; players = @(...) }
function Parse-Lineups([string]$page) {
  $i = $page.IndexOf(">Lineups</h3>")
  if ($i -lt 0) { return $null }
  $j = $page.IndexOf("More like this", $i)
  if ($j -lt 0) { $j = [Math]::Min($i + 60000, $page.Length) }
  $card = $page.Substring($i, $j - $i)
  $parts = [regex]::Split($card, '<div class="p-4">')
  if ($parts.Count -lt 3) { return $null }
  $sides = @()
  for ($k = 1; $k -le 2; $k++) {
    $chunk = $parts[$k]
    $tn = [regex]::Match($chunk, '<p class="mb-2 truncate text-xs font-bold text-on-surface">([^<]+)</p>')
    $teamName = if ($tn.Success) { $tn.Groups[1].Value.Trim() } else { "" }
    $si = $chunk.IndexOf(">Substitutes</p>")
    if ($si -gt 0) {
      $starters = Get-Players $chunk.Substring(0, $si) $false
      $bench    = Get-Players $chunk.Substring($si) $true
    } else {
      $starters = Get-Players $chunk $false
      $bench    = @()
    }
    # 首发必须至少 7 人，否则视为解析失败（半个页面/结构变了）
    if ($starters.Count -lt 7) { return $null }
    $sides += [ordered]@{ team = $teamName; starters = $starters.Count; players = @($starters + $bench) }
  }
  return ,$sides
}

# 事件时间轴。图标语义：sports_soccer=进球、swap_horiz=换人、灰色块=牌
# 返回 @(incident, ...)，形状对齐 match-detail.js 的 incidentsHtml
function Parse-Events([string]$page) {
  $i = $page.IndexOf("Match events")
  $j = $page.IndexOf(">Lineups</h3>")
  if ($i -lt 0 -or $j -le $i) { return ,@() }
  $seg  = $page.Substring($i, $j - $i)
  $rows = [regex]::Split($seg, $RxRow)
  $out  = @()
  for ($r = 1; $r -lt $rows.Count; $r++) {
    $row = $rows[$r]
    $mm = [regex]::Match($row, 'text-\[11px\] font-bold tabular-nums[^>]*>(\d+)</span>')
    if (-not $mm.Success) { continue }          # Half-time 分隔行等没有分钟号，跳过
    $min = [int]$mm.Groups[1].Value
    foreach ($side in @(@{ cls = "justify-end"; home = $true }, @{ cls = "justify-start"; home = $false })) {
      $cm = [regex]::Match($row, '<div class="flex min-w-0 items-center ' + $side.cls + ' gap-2">(.*?)</div>')
      if (-not $cm.Success) { continue }
      $cell = $cm.Groups[1].Value
      if ($cell.Trim() -eq "") { continue }
      $names = @()
      foreach ($nm in [regex]::Matches($cell, 'title="[^"]*">([^<]+)</span>')) { $names += $nm.Groups[1].Value.Trim() }
      $p1 = if ($names.Count -ge 1) { $names[0] } else { "" }
      $p2 = if ($names.Count -ge 2) { $names[1] } else { "" }
      if ($cell -match 'sports_soccer') {
        $out += [ordered]@{ incidentType = "goal";         time = $min; isHome = $side.home; player    = [ordered]@{ name = $p1 } }
      } elseif ($cell -match 'swap_horiz') {
        $out += [ordered]@{ incidentType = "substitution"; time = $min; isHome = $side.home;
                            playerOut    = [ordered]@{ name = $p1 }
                            playerIn     = [ordered]@{ name = $p2 } }
      } elseif ($cell -match 'h-3 w-\[8px\]') {
        # elfutbol 不区分黄/红牌，一律灰块 → 标中性的「牌」，不猜颜色
        $out += [ordered]@{ incidentType = "card"; incidentClass = "card"; time = $min; isHome = $side.home; player = [ordered]@{ name = $p1 } }
      }
    }
  }
  return ,$out
}

# ── 队徽解析 ────────────────────────────────────────────────────
# 从 elfutbol 队伍页抽「比赛日 → @(主队队徽, 客队队徽)」。
# 日期文本是 DD-MM（西班牙本地日期），同一日期可能有多场（联赛/杯赛），按日期聚合成数组。
function Get-CrestRows([string]$page) {
  $out = @{}
  $rx = '(?s)<a[^>]*data-match-row="true"[^>]*href="(/en/match/[^"]+)".*?</a>'
  foreach ($m in [regex]::Matches($page, $rx)) {
    $d = [regex]::Match($m.Value, 'text-\[10px\] font-medium text-outline">(\d{2})-(\d{2})</span>')
    if (-not $d.Success) { continue }
    # 两种队徽路径并存：老的是 /crests/sm/<slug>.webp，部分新队用 /_crest/<slug>.png
    $cr = @([regex]::Matches($m.Value, '<img src="(/(?:crests/sm|_crest)/[^"]+)"') | ForEach-Object { $_.Groups[1].Value })
    if ($cr.Count -lt 2) { continue }
    $k = $d.Groups[1].Value + '-' + $d.Groups[2].Value
    if (-not $out.ContainsKey($k)) { $out[$k] = @() }
    $out[$k] = @($out[$k]) + ,$cr
  }
  return $out
}

# 队徽路径 → slug（/crests/sm/fundacio-futbol-badalona.webp → fundacio-futbol-badalona）。
# 用来把「队伍页上等待结果的行」按对手对到我们赛程里的某一场。
function Get-CrestSlug([string]$path) {
  if (-not $path) { return "" }
  $f = ($path -split '/')[-1]
  return ($f -replace '\.[a-z0-9]+$', '').ToLower()
}

# 把某梯队的 elfutbol 行映射到站点赛程的 pulselive 队号，写进 $script:crestOut。
# 日期以我们的赛程为准，但 pulselive 的「待定」场次常把日期放成周末占位，可能差一天，
# 所以依次试 同日 / 前一日 / 后一日；同一天有多行时优先「巴萨是否主队」方向一致的那行。
function Add-CrestsForTier([string]$tier, [hashtable]$byDate, $schedMatches) {
  $n = 0
  foreach ($mt in $schedMatches) {
    $base = [datetime]::ParseExact([string]$mt.date.Substring(0, 10), 'yyyy-MM-dd', $Inv)
    $keys = @($base.ToString('dd-MM'), $base.AddDays(-1).ToString('dd-MM'), $base.AddDays(1).ToString('dd-MM'))
    $picked = $null
    foreach ($k in $keys) {
      if (-not $byDate.ContainsKey($k)) { continue }
      $list = @($byDate[$k])
      foreach ($cr in $list) {
        if (([bool]$mt.isHome) -eq ($cr[0] -match 'barcelona-fc')) { $picked = $cr; break }
      }
      if (-not $picked) { $picked = $list[0] }
      break
    }
    if (-not $picked) { continue }   # 未排期 / elfutbol 没覆盖的场次
    $h = $picked
    if (([bool]$mt.isHome) -ne ($h[0] -match 'barcelona-fc')) { $h = @($picked[1], $picked[0]) }
    $script:crestOut[[string]$mt.homeId] = "https://elfutbol.co" + $h[0]
    $script:crestOut[[string]$mt.awayId] = "https://elfutbol.co" + $h[1]
    $n++
  }
  return $n
}

# ── 主流程 ──────────────────────────────────────────────────────
Log "开始 $Label 阵容/进球详情更新（数据源 elfutbol.co）……"

if (-not (Test-Path $Schedules)) { Log "✗ 赛程文件不存在：$Schedules"; exit 1 }
$stxt = [System.IO.File]::ReadAllText($Schedules, $Utf8)
$a = $stxt.IndexOf("{"); $b = $stxt.LastIndexOf("}")
if ($a -lt 0 -or $b -le $a) { Log "✗ 赛程文件解析失败"; exit 1 }
$sched = $stxt.Substring($a, $b - $a + 1) | ConvertFrom-Json

$all   = @($sched.matches.$TierId)
$ended = @($all | Where-Object { $_.status -eq "Ended" })
Log "  · $TierId 共 $($all.Count) 场（已完场 $($ended.Count)）"

# 旧缓存（按比赛 id 合并，已抓过的不重抓）
$cache = [ordered]@{}
if (Test-Path $OutFile) {
  try {
    $ctxt = [System.IO.File]::ReadAllText($OutFile, $Utf8)
    $x = $ctxt.IndexOf("{"); $y = $ctxt.LastIndexOf("}")
    if ($x -ge 0 -and $y -gt $x) {
      $obj = $ctxt.Substring($x, $y - $x + 1) | ConvertFrom-Json
      foreach ($p in $obj.PSObject.Properties) { $cache[$p.Name] = $p.Value }
    }
  } catch { Log "  · 旧缓存解析失败，本次全量重抓" }
}

# 「足协还没发比赛报告」的场次记在这里（比赛 id → 最后一次尝试的日期）。
# 标记跟着缓存文件一起上线；N 天内不再重复抓，免得每天对同一场空跑。
$pendingReports = @{}
if ($cache.Contains("__pendingReports")) {
  try {
    foreach ($p in $cache["__pendingReports"].PSObject.Properties) { $pendingReports[$p.Name] = [string]$p.Value }
  } catch { }
  $cache.Remove("__pendingReports")
}
$RetryDays = 3

# ① 先算本轮是否真的要抓网络（只依赖缓存和退避，不依赖网络）
$todo = @($ended | Where-Object {
  if (-not $Force -and $cache.Contains($_.id)) { return $false }
  if (-not $Force) {
    $last = $pendingReports[[string]$_.id]
    if ($last) {
      $d = $null
      try { $d = [datetime]::ParseExact($last, 'yyyy-MM-dd', $Inv) } catch { }
      # 未到重试日：跳过，不重新抓
      if ($d -and ((Get-Date).Date - $d.Date).TotalDays -lt $RetryDays) { return $false }
    }
  }
  return $true
})
$waitCount = 0
foreach ($mt in $ended) {
  if ($cache.Contains($mt.id)) { continue }
  $last = $pendingReports[[string]$mt.id]
  if ($last) {
    $d = $null
    try { $d = [datetime]::ParseExact($last, 'yyyy-MM-dd', $Inv) } catch { }
    if ($d -and ((Get-Date).Date - $d.Date).TotalDays -lt $RetryDays) { $waitCount++ }
  }
}
$needDetails = $todo.Count -gt 0

# ② 队徽表：elfutbol 托管真实队徽（pulselive 的对手队徽全是 403 防盗链）。
#    按本站赛程里的 pulselive 队号落键，fcb-youth-render.js / matches-upcoming.js 直接查它。
#    先读旧表、再逐队覆盖：某个梯队抓取失败时保留它上一次的队徽，不整体清空。
$crestOut = [ordered]@{}
$attempted = @{}   # 梯队 → @{ at = "yyyy-MM-dd"; ids = 已尝试过的对手 id 数组 }
if (Test-Path $CrestFile) {
  try {
    $ctxt = [System.IO.File]::ReadAllText($CrestFile, $Utf8)
    # 队徽表和「抓过但没拿到」的尝试记录在同一个文件里，分别按全局名定位
    $ci = $ctxt.IndexOf("window.ELFUTBOL_CRESTS = ")
    if ($ci -ge 0) {
      $x = $ctxt.IndexOf("{", $ci); $y = $ctxt.IndexOf("};", $x)
      if ($x -ge 0 -and $y -gt $x) {
        $old = $ctxt.Substring($x, $y - $x + 1) | ConvertFrom-Json
        foreach ($p in $old.PSObject.Properties) { $crestOut[$p.Name] = $p.Value }
      }
    }
    $mi = $ctxt.IndexOf("window.ELFUTBOL_CRESTS_META = ")
    if ($mi -ge 0) {
      $x2 = $ctxt.IndexOf("{", $mi); $y2 = $ctxt.IndexOf("};", $x2)
      if ($x2 -ge 0 -and $y2 -gt $x2) {
        $meta = $ctxt.Substring($x2, $y2 - $x2 + 1) | ConvertFrom-Json
        foreach ($p in $meta.attempted.PSObject.Properties) {
          $attempted[$p.Name] = [pscustomobject]@{
            at  = [string]$p.Value.at
            ids = @($p.Value.ids | ForEach-Object { [string]$_ })
          }
        }
      }
    }
  } catch {
    Log "  · 旧队徽表解析失败，本轮按全量重建"
    $crestOut = [ordered]@{}
    $attempted = @{}
  }
}

# ★ 省流闸门：赛程里出现、但队徽表里没有的对手才需要抓；对手 id 没变就整轮不碰 elfutbol。
#   以前每天固定抓 7 个梯队页（约 50s），其实一周才可能多出 1-2 个新对手。
$needIds = @{}
foreach ($tier in $CrestTiers.Keys) {
  $ids = New-Object System.Collections.Generic.HashSet[string]
  foreach ($m in @($sched.matches.$tier)) {
    if ($null -ne $m.homeId -and "$($m.homeId)" -ne "") { [void]$ids.Add([string]$m.homeId) }
    if ($null -ne $m.awayId -and "$($m.awayId)" -ne "") { [void]$ids.Add([string]$m.awayId) }
  }
  $needIds[$tier] = $ids
}
$missingTiers = @()
$CrestRetryDays = 14   # 抓过但 elfutbol 没给的对手，14 天后重试一次（它补数据时能接上）
foreach ($tier in $CrestTiers.Keys) {
  $miss = @($needIds[$tier] | Where-Object { -not $crestOut.Contains($_) })
  if ($Force) { $missingTiers += $tier; continue }
  if ($miss.Count -eq 0) { continue }
  $a = $attempted[$tier]
  # 只抓「新出现的对手」或超过重试期的；上次就抓不到的不再每天重抓
  $newMiss = if ($a) { @($miss | Where-Object { -not ($a.ids -contains $_) }) } else { $miss }
  $stale = $true
  if ($a -and $a.at) {
    $d = $null
    try { $d = [datetime]::ParseExact($a.at, 'yyyy-MM-dd', $Inv) } catch { }
    if ($d -and ((Get-Date).Date - $d.Date).TotalDays -lt $CrestRetryDays) { $stale = $false }
  }
  if ($newMiss.Count -gt 0 -or $stale) { $missingTiers += $tier }
}
$needCrest = $missingTiers.Count -gt 0

if ($waitCount -gt 0) { Log "  · $waitCount 场等足协报告（$RetryDays 天内不重抓）" }
if (-not $needCrest -and -not $needDetails) {
  Log "  · 队徽表 $($crestOut.Count) 个、无新增对手，详情无新场次，本轮跳过抓取"
  Log "$Label 阵容/进球详情更新完成（无变化）✔"
  exit 0
}
if ($needCrest) { Log "  · 需补队徽的梯队：$($missingTiers -join ', ')" }

# ③ 当前梯队队伍页：按「日期」把每场映射到 /en/match/.../jN（详情用；该梯队缺队徽时也复用它）
$team = $null
$map  = @{}   # "DD-MM" → /en/match/... 路径
$awaitingRows = @()   # 已过时间、但 elfutbol 还没从足协拿到结果的行（无日期，只能按队徽对号）
if ($needDetails -or ($missingTiers -contains $TierId)) {
  $team = Get-Html $TeamUrl
  if ($team) {
    foreach ($m in [regex]::Matches($team, '(?s)<a[^>]*data-match-row="true"[^>]*href="(/en/match/[^"]+)".*?</a>')) {
      $row = $m.Value
      $d = [regex]::Match($row, 'text-\[10px\] font-medium text-outline">(\d{2})-(\d{2})</span>')
      if ($d.Success) {
        $map[$d.Groups[1].Value + "-" + $d.Groups[2].Value] = $m.Groups[1].Value
        continue
      }
      # 没有日期 = 这场还没出结果（elfutbol 渲染成只显示开球时间和「–」的占位行，
      # data-match-state="awaiting-result"）。按日期永远对不上，先记下队徽备用。
      $state = [regex]::Match($row, 'data-match-state="([^"]+)"')
      if (-not $state.Success) { continue }
      $crs = @([regex]::Matches($row, '<img src="(/(?:crests/sm|_crest)/[^"]+)"') | ForEach-Object { $_.Groups[1].Value })
      if ($crs.Count -lt 2) { continue }
      $awaitingRows += [pscustomobject]@{
        state = $state.Groups[1].Value
        href  = $m.Groups[1].Value
        home  = $crs[0]
        away  = $crs[1]
      }
    }
    $extra = if ($awaitingRows.Count -gt 0) { "（另有 $($awaitingRows.Count) 场等待结果同步）" } else { "" }
    Log "  · $Label 队伍页解析出 $($map.Count) 场比赛链接$extra"
  } else {
    Log "  ✗ $Label 队伍页抓取失败：本轮跳过 $Label 详情（缺队徽的梯队稍后单独重试）"
  }
}

# ── ④ 队徽表：只抓需要补的梯队（已覆盖的跳过）
$crestMapped = 0
$crestTouched = $false
foreach ($tier in $CrestTiers.Keys) {
  if (-not ($Force -or ($missingTiers -contains $tier))) { continue }
  $page = $null
  if ($tier -eq $TierId -and $team) { $page = $team }
  else { $page = Get-Html $CrestTiers[$tier] }
  if (-not $page) { Log "    ✗ $tier 队伍页抓取失败，沿用旧队徽"; continue }
  $byDate = Get-CrestRows $page
  $days   = @($byDate.Keys).Count
  if ($days -eq 0) { Log "    ✗ $tier 未解析到比赛行，沿用旧队徽"; continue }
  $n = Add-CrestsForTier $tier $byDate @($sched.matches.$tier)
  $crestMapped += $n
  $crestTouched = $true
  # 记下「这个梯队本轮试过哪些对手」：抓不到的不再每天重试
  $attempted[$tier] = [pscustomobject]@{
    at  = (Get-Date -Format 'yyyy-MM-dd')
    ids = @($needIds[$tier] | Sort-Object)
  }
  Log "    · $tier：$days 个比赛日 → 映射 $n 场"
}

if ($crestMapped -gt 0 -or $crestTouched) {
  # META 记录各梯队「什么时候、试过哪些对手」，供下一轮省流闸门判断是否值得再抓
  $metaObj = [ordered]@{ attempted = [ordered]@{}; updated = (Get-Date -Format 'yyyy-MM-dd HH:mm') }
  foreach ($k in ($attempted.Keys | Sort-Object)) {
    $metaObj.attempted[$k] = [ordered]@{
      at  = [string]$attempted[$k].at
      ids = @($attempted[$k].ids | Sort-Object)
    }
  }
  $cjs = "/* 自动生成，请勿手动编辑 —— 青训赛场对手队徽（fcb-youth-render.js / matches-upcoming.js 读取）；" +
         "数据源：elfutbol.co（pulselive 的对手队徽 403 防盗链，故换用它托管的真队徽）；" +
         "更新于 $(Get-Date -Format 'yyyy-MM-dd HH:mm') */`r`nwindow.ELFUTBOL_CRESTS = " +
         ($crestOut | ConvertTo-Json -Depth 3) + ";`r`n" +
         "/* 抓取尝试记录：哪些对手抓过但 elfutbol 没给（省流闸门用，前端不读） */`r`n" +
         "window.ELFUTBOL_CRESTS_META = " + ($metaObj | ConvertTo-Json -Depth 5) + ";`r`n"
  [System.IO.File]::WriteAllText($CrestFile, $cjs, $Utf8)
  Log "  ✓ 已写入 $CrestFile（共 $($crestOut.Count) 个队徽，本轮映射 $crestMapped 场）"
} else {
  Log "  · 本轮未解析到队徽，$CrestFile 不覆盖"
}

# ── ⑤ 逐场详情：只补缓存里还没有的已完场 ──
if ($todo.Count -eq 0) {
  Log "  ✓ 详情无需更新（已收录 $($ended.Count - $waitCount) 场已完场）"
  Log "$Label 阵容/进球详情更新完成（无详情可抓）✔"
  exit 0
}
if (-not $team -or $map.Count -eq 0) {
  Log "  · $Label 队伍页不可用，跳过详情更新（队徽已在上面单独更新）"
  Log "$Label 阵容/进球详情更新完成（无详情可抓）✔"
  exit 0
}
Log "  · 待抓详情 $($todo.Count) 场"

# 逐场抓单场页，解析阵容 + 事件
$ok = 0; $fail = 0; $pendingReport = 0; $awaitingCount = 0
foreach ($mt in $todo) {
  $dkey = $mt.date.Substring(8, 2) + "-" + $mt.date.Substring(5, 2)   # 2026-10-10 → 10-10
  $href = $map[$dkey]
  if (-not $href) {
    # 官方站偶有日期差一天（待定场次排期占位），依次试前后一天
    $base = $null
    try { $base = [datetime]::ParseExact([string]$mt.date.Substring(0, 10), 'yyyy-MM-dd', $Inv) } catch { }
    if ($base) {
      foreach ($off in @(-1, 1)) {
        $k2 = $base.AddDays($off).ToString('dd-MM')
        if ($map.ContainsKey($k2)) {
          $href = $map[$k2]
          Log "    · $($mt.date) 前后一天匹配到 $k2"
          break
        }
      }
    }
  }
  if (-not $href) {
    # elfutbol 队伍页对「时间已过、足协还没同步比分」的场次会渲染成无日期的占位行
    # （data-match-state="awaiting-result"，只有开球时间和「–」）。我们赛程里已是
    # Ended，但对方还没拿到结果 —— 等它同步即可，不算解析失败。按方向 + 对手队徽对号。
    $oppId = [string]$(if ($mt.isHome) { $mt.awayId } else { $mt.homeId })
    $oppSlug = ""
    if ($oppId -and $crestOut.Contains($oppId)) { $oppSlug = Get-CrestSlug ([string]$crestOut[$oppId]) }
    $hit = $null
    if ($oppSlug) {
      foreach ($ar in $awaitingRows) {
        if (([bool]$mt.isHome) -ne ($ar.home -match 'barcelona-fc')) { continue }
        $arOpp = if ($mt.isHome) { $ar.away } else { $ar.home }
        if ((Get-CrestSlug $arOpp) -eq $oppSlug) { $hit = $ar; break }
      }
    }
    if ($hit) {
      Log "    ⏳ $($mt.date) elfutbol 尚未同步比分（队伍页仍是 awaiting-result），下轮再试"
      $awaitingCount++
      continue
    }
    # 比分已出、比赛报告还没发时，elfutbol 队伍页连这一场的链接都不生成
    # （内嵌 JSON 里 status = AWAITING_RESULT，所以按 data-match-row 抓不到）。
    # 近 RetryDays 天的场次按「等报告」处理，不算失败；超过重试期还缺链接，
    # 才说明真的对不上（赛程与队伍页不一致），继续报错让人看。
    $rec = $false
    try {
      $md = [datetime]::ParseExact([string]$mt.date.Substring(0, 10), 'yyyy-MM-dd', $Inv)
      $rec = ((Get-Date).Date - $md.Date).TotalDays -le $RetryDays
    } catch { }
    if ($rec) {
      Log "    ⏳ $($mt.date) 队伍页还没有这场（比分已出、报告未发），$RetryDays 天后再试"
      $pendingReports[[string]$mt.id] = (Get-Date -Format 'yyyy-MM-dd')
      $pendingReport++
      continue
    }
    Log "    ✗ $($mt.date) 队伍页里找不到该日期的比赛"; $fail++; continue
  }
  $page = Get-Html ("https://elfutbol.co" + $href)
  if (-not $page) { Log "    ✗ $($mt.date) 单场页抓取失败"; $fail++; continue }
  $lineups = Parse-Lineups $page
  $incs    = Parse-Events  $page
  if (-not $lineups -and $incs.Count -eq 0) {
    # 有些场次足协只上传了比分、没上传比赛报告，elfutbol 页面会明说：
    #   "No match report for this game … there are no line-ups, goals or cards"
    #   "Line-ups are not out yet …"
    # 这不是解析失败，也不该让整轮标降级 —— 记成「待报告」，下轮报告发布后自动补上。
    if ($page -match 'No match report for this game|Line-ups are not out yet|the federation has not published a match report') {
      Log "    ⏳ $($mt.date) 足协尚未发布比赛报告，$RetryDays 天后再试"
      $pendingReports[[string]$mt.id] = (Get-Date -Format 'yyyy-MM-dd')
      $pendingReport++
      continue
    }
    Log "    ✗ $($mt.date) 解析为空（页面结构可能变了）"; $fail++; continue
  }

  $luObj = $null
  $luDesc = "阵容 0"
  if ($lineups) {
    $luObj = [ordered]@{ home = $lineups[0]; away = $lineups[1] }
    $luDesc = "阵容 $($lineups[0].starters)+$($lineups[1].starters) 首发"
  }
  $cache[$mt.id] = [ordered]@{
    lineups   = $luObj
    incidents = [ordered]@{ incidents = @($incs) }
  }
  [void]$pendingReports.Remove([string]$mt.id)
  $ok++
  Log "    ✓ $($mt.date) $luDesc、事件 $($incs.Count) 条"
}

if ($ok -eq 0 -and $fail -gt 0) { Log "✗ 本轮无一场解析成功，保留旧缓存不覆盖"; exit 1 }
if ($ok -eq 0) { Log "  ✓ 本轮等待来源补数据：$pendingReport 场待足协报告、$awaitingCount 场待 elfutbol 同步比分（不算失败）" }

# 「等报告」标记写回缓存文件；报告发布后抓到数据会顺手删掉对应标记
if ($pendingReports.Count -gt 0) {
  $pm = [ordered]@{}
  foreach ($k in $pendingReports.Keys) { $pm[$k] = $pendingReports[$k] }
  $cache["__pendingReports"] = $pm
}
$detailCount = $cache.Count
if ($cache.Contains("__pendingReports")) { $detailCount-- }

# ④ 写详情缓存
$json = $cache | ConvertTo-Json -Depth 12
$js = "/* 自动生成，请勿手动编辑 —— $Label 阵容/进球详情缓存（match-detail.js 读取）；数据源：elfutbol.co；更新于 $(Get-Date -Format 'yyyy-MM-dd HH:mm') */`r`nwindow.$($Cfg.Global) = $json;`r`n"
[System.IO.File]::WriteAllText($OutFile, $js, $Utf8)
Log "  ✓ 已写入 $OutFile（本轮新增 $ok 场、失败 $fail 场、待报告 $pendingReport 场、待同步 $awaitingCount 场、共 $detailCount 场）"
Log "$Label 阵容/进球详情更新完成 ✔"
