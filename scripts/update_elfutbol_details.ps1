# ═══════════════════════════════════════════════════════════════
#   拉玛西亚信息站 · U15（cadete-b）逐场阵容 / 进球详情缓存
#
#   为什么有这条链路：
#     青年梯队赛程走 pulselive 接口，只有比分、没有阵容和事件，
#     match-detail 弹窗在这些队上只能显示基本信息。
#     elfutbol.co 的逐场页有阵容 + 进球/换人/牌时间轴，故补这一层。
#
#   抓取链路：
#     1) 读 assets/js/fcb-youth-schedules.js，取 cadete-b 已完场的比赛
#     2) 抓 elfutbol 队伍页，按「日期」把每场映射到 /en/match/.../jN
#        （日期对同一支队唯一，比用轮次稳 —— pulselive 会漏掉未排期的轮次，
#          导致我们的 round 号与 elfutbol 的 J 号错位）
#     3) 抓每个单场页，解析阵容 + 事件
#     4) 写 assets/js/elfutbol-cadete-b-details-cache.js
#        window.ELFUTBOL_CADETE_B_DETAILS_CACHE（形状与 dqd-*-details-cache 一致，
#        直接复用 match-detail.js 的 applyDetail 渲染，无需新前端代码）
#
#   ⚠️ elfutbol 无 CORS 头 → 浏览器不能直取，只能由本脚本服务端抓成缓存。
#   ⚠️ 第三方聚合站、无 API 契约（其上游 fcf.cat 的链接已 404 过一次）
#      → 任何一次抓取失败一律保留旧缓存，绝不写空。
#   ⚠️ 已抓过的场次不重复抓（缓存按比赛 id 合并，只补缺的）；-Force 可全量重抓。
#   ⚠️ elfutbol 的牌只有一种灰色块，不区分黄/红 → 标成中性的「牌」，不猜颜色。
# ═══════════════════════════════════════════════════════════════
param(
  [switch] $Force        # 忽略已有缓存，全部重抓
)

$ErrorActionPreference = "Stop"
$Root      = Split-Path -Parent $PSScriptRoot
$Schedules = Join-Path $Root "assets\js\fcb-youth-schedules.js"
$OutFile   = Join-Path $Root "assets\js\elfutbol-cadete-b-details-cache.js"
$CrestFile = Join-Path $Root "assets\js\elfutbol-crests-cache.js"
$LogFile   = Join-Path $Root "scripts\elfutbol-details-update.log"

$TierId  = "cadete-b"
$TeamUrl = "https://elfutbol.co/en/team/barcelona-fc-cadet-s15-a?season=2627&tab=resultados"

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

# ── 主流程 ──────────────────────────────────────────────────────
Log "开始 U15 阵容/进球详情更新（数据源 elfutbol.co）……"

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

# ① 队伍页：按「日期」把每场映射到 /en/match/.../jN，顺带取两队队徽
$team = Get-Html $TeamUrl
if (-not $team) { Log "✗ 队伍页抓取失败，保留旧缓存"; exit 1 }
$map    = @{}   # "MM-DD" → /en/match/... 路径
$crests = @{}   # "MM-DD" → @(主队队徽, 客队队徽)
foreach ($m in [regex]::Matches($team, '(?s)<a[^>]*data-match-row="true"[^>]*href="(/en/match/[^"]+)".*?</a>')) {
  $d = [regex]::Match($m.Value, 'text-\[10px\] font-medium text-outline">(\d{2})-(\d{2})</span>')
  if (-not $d.Success) { continue }   # 未排期的轮次（如 U15 的 MD3）没有日期，跳过
  $k = $d.Groups[1].Value + "-" + $d.Groups[2].Value
  $map[$k] = $m.Groups[1].Value
  $cr = @([regex]::Matches($m.Value, '<img src="(/crests/sm/[^"]+)"') | ForEach-Object { $_.Groups[1].Value })
  if ($cr.Count -ge 2) { $crests[$k] = @($cr[0], $cr[1]) }
}
Log "  · 队伍页解析出 $($map.Count) 场比赛链接、$($crests.Count) 组队徽"
if ($map.Count -eq 0) { Log "✗ 队伍页结构变化（未解析到比赛行），保留旧缓存"; exit 1 }

# ── ② 队徽表：elfutbol 托管真实队徽（pulselive 的对手队徽全是 403 防盗链）。
#    本表按本站赛程里的 pulselive 队号落键，fcb-youth-render.js 的 badgeUrl 直接查它。
#    顺序自校正：elfutbol 行内队徽是 [主,客]；若「巴萨是否主队」对不上就交换，
#    免得某一轮客主写反导致队徽整体串位。
$crestOut = [ordered]@{}
foreach ($mt in $all) {
  $k = $mt.date.Substring(8, 2) + "-" + $mt.date.Substring(5, 2)
  $cr = $crests[$k]
  if (-not $cr) { continue }
  $h = $cr
  if (([bool]$mt.isHome) -ne ($h[0] -match 'barcelona-fc')) { $h = @($cr[1], $cr[0]) }
  $crestOut[[string]$mt.homeId] = "https://elfutbol.co" + $h[0]
  $crestOut[[string]$mt.awayId] = "https://elfutbol.co" + $h[1]
}
if ($crestOut.Count -gt 0) {
  $cjs = "/* 自动生成，请勿手动编辑 —— 青训赛场对手队徽（fcb-youth-render.js 的 badgeUrl 读取）；" +
         "数据源：elfutbol.co（pulselive 的对手队徽 403 防盗链，故换用它托管的真队徽）；" +
         "更新于 $(Get-Date -Format 'yyyy-MM-dd HH:mm') */`r`nwindow.ELFUTBOL_CRESTS = " +
         ($crestOut | ConvertTo-Json -Depth 3) + ";`r`n"
  [System.IO.File]::WriteAllText($CrestFile, $cjs, $Utf8)
  Log "  ✓ 已写入 $CrestFile（$($crestOut.Count) 个队徽）"
} else {
  Log "  · 未解析到队徽，$CrestFile 不覆盖"
}

# ── ③ 逐场详情：只补缓存里还没有的已完场 ──
$todo = @($ended | Where-Object { $Force -or -not $cache.Contains($_.id) })
if ($todo.Count -eq 0) { Log "  ✓ 详情无需更新（已收录全部 $($ended.Count) 场已完场）"; exit 0 }
Log "  · 待抓详情 $($todo.Count) 场"

# 逐场抓单场页，解析阵容 + 事件
$ok = 0; $fail = 0
foreach ($mt in $todo) {
  $dkey = $mt.date.Substring(8, 2) + "-" + $mt.date.Substring(5, 2)   # 2026-10-10 → 10-10
  $href = $map[$dkey]
  if (-not $href) { Log "    ✗ $($mt.date) 队伍页里找不到该日期的比赛"; $fail++; continue }
  $page = Get-Html ("https://elfutbol.co" + $href)
  if (-not $page) { Log "    ✗ $($mt.date) 单场页抓取失败"; $fail++; continue }
  $lineups = Parse-Lineups $page
  $incs    = Parse-Events  $page
  if (-not $lineups -and $incs.Count -eq 0) { Log "    ✗ $($mt.date) 解析为空（页面结构可能变了）"; $fail++; continue }

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
  $ok++
  Log "    ✓ $($mt.date) $luDesc、事件 $($incs.Count) 条"
}

if ($ok -eq 0) { Log "✗ 本轮无一场解析成功，保留旧缓存不覆盖"; exit 1 }

# ④ 写详情缓存
$json = $cache | ConvertTo-Json -Depth 12
$js = "/* 自动生成，请勿手动编辑 —— U15 阵容/进球详情缓存（match-detail.js 读取）；数据源：elfutbol.co；更新于 $(Get-Date -Format 'yyyy-MM-dd HH:mm') */`r`nwindow.ELFUTBOL_CADETE_B_DETAILS_CACHE = $json;`r`n"
[System.IO.File]::WriteAllText($OutFile, $js, $Utf8)
Log "  ✓ 已写入 $OutFile（本轮新增 $ok 场、失败 $fail 场、共 $($cache.Count) 场）"
Log "U15 阵容/进球详情更新完成 ✔"
