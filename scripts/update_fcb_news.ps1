# ═══════════════════════════════════════════════════════════════
#   拉玛西亚信息站 · 官方站球队资讯每日更新脚本（B队 + 一队）
#
#   每天从 fcbarcelona.com 抓取 B队 与 一队 的新闻列表（SSR 页）：
#     1. GET https://www.fcbarcelona.com/en/football/barca-atletic/news  （B队）
#     2. GET https://www.fcbarcelona.com/en/football/first-team/news     （一队）
#     3. 解析 thumbnail thumbnail--news 条目：标题 / URL / 缩略图 / 相对时间
#     4. 生成缓存 assets/js/lamasia-official-news-cache.js
#
#   由本机计划任务 / GitHub Actions 每日调用。
#   运行日志：scripts/fcb-news-update.log
#   滚动存档：新抓的合并进旧缓存（按文章 id 去重），每队上限 50 条。
#
#   ⚠️ 官方站青年梯队（Juvenil/Cadete/Infantil）新闻为 JS 渲染 + 接口需授权，
#      抓不了；只有 B队（barca-b）和一队是 SSR 可直接抓。
# ═══════════════════════════════════════════════════════════════
$ErrorActionPreference = "Stop"

$UserAgent   = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
$MaxNews     = 50

# 每个梯队：key（缓存键）/ 展示名 / 列表页 URL / 文章路径前缀
$Tiers = @(
  @{ key = "b";     name = "B队"; url = "https://www.fcbarcelona.com/en/football/barca-atletic/news"; path = "barca-b" },
  @{ key = "first"; name = "一队"; url = "https://www.fcbarcelona.com/en/football/first-team/news";    path = "first-team" }
)

$Root      = Split-Path -Parent $PSScriptRoot
$CacheFile = Join-Path $Root "assets\js\lamasia-official-news-cache.js"
$LogFile   = Join-Path $Root "scripts\fcb-news-update.log"

function Log([string]$msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
  Write-Host $line
}

function JsStr([string]$s) {
  $s = $s.Replace('\', '\\').Replace('"', '\"').Replace("`r", '').Replace("`n", '').Replace("`t", ' ')
  return '"' + $s + '"'
}

# 相对时间 → "yyyy-MM-dd HH:mm"（默认 12:00）。解析 "15 hrs" "2 days" "1 week" "3 months" "Jan 12, 2026"
function Parse-RelTime([string]$t) {
  if (-not $t) { return "" }
  $t = $t.Trim()
  $m = [regex]::Match($t, '(\d+)\s*(min|hrs?|hour|hours|days?|weeks?|months?)\s*(ago)?', 'IgnoreCase')
  if ($m.Success) {
    $n = [int]$m.Groups[1].Value
    $u = $m.Groups[2].Value.ToLower()
    $now = Get-Date
    switch -Regex ($u) {
      '^min'            { $d = $now.AddMinutes(-$n) }
      '^hr|^hour'       { $d = $now.AddHours(-$n) }
      '^day'            { $d = $now.AddDays(-$n) }
      '^week'           { $d = $now.AddDays(-7 * $n) }
      '^month'          { $d = $now.AddMonths(-$n) }
      default           { $d = $now }
    }
    return $d.ToString('yyyy-MM-dd HH:mm')
  }
  $m2 = [regex]::Match($t, '(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),\s*(\d{4})', 'IgnoreCase')
  if ($m2.Success) {
    $mon = @{jan=1;feb=2;mar=3;apr=4;may=5;jun=6;jul=7;aug=8;sep=9;oct=10;nov=11;dec=12}
    $mi = $mon[$m2.Groups[1].Value.Substring(0,3).ToLower()]
    try { return ([datetime]::new([int]$m2.Groups[3].Value, $mi, [int]$m2.Groups[2].Value)).ToString('yyyy-MM-dd HH:mm') } catch { return "" }
  }
  $m3 = [regex]::Match($t, '(\d{4})-(\d{2})-(\d{2})')
  if ($m3.Success) { return "$($m3.Groups[1].Value)-$($m3.Groups[2].Value)-$($m3.Groups[3].Value) 12:00" }
  return ""
}

# 解析一页官方新闻列表 → 条目数组（匹配 thumbnail 锚点内嵌的 <figure class="thumbnail__figure">，含图+标题+时间）
function Parse-FcbNews([string]$html, [string]$path) {
  $itemRe = '<a href="/en/football/' + $path + '/news/(\d+)/([^"]+)"[^>]*class="thumbnail[^"]*"[^>]*>\s*<figure class="thumbnail__figure"[^>]*>.*?</figure>'
  $opt = [System.Text.RegularExpressions.RegexOptions]::Singleline
  $items = [regex]::Matches($html, $itemRe, $opt)
  $rows = @()
  $seen = New-Object System.Collections.Generic.HashSet[string]
  foreach ($m in $items) {
    $block = $m.Value
    $id = $m.Groups[1].Value
    if (-not $id) { continue }   # 过滤空 id 的假匹配
    if (-not $seen.Add($id)) { continue }   # news-hero 与 thumbnail 是同一文章，按 id 去重
    $slug = $m.Groups[2].Value
    $title = ""
    $t = [regex]::Match($block, 'thumbnail__title"[^>]*>(.*?)</')
    if ($t.Success) { $title = [System.Net.WebUtility]::HtmlDecode($t.Groups[1].Value.Trim()) }
    if (-not $title) { $title = $slug -replace '-', ' ' }
    $img = ""
    $t = [regex]::Match($block, 'src="(https://www\.fcbarcelona\.com/photo-resources/[^"]+\.jpe?g)"')
    if ($t.Success) { $img = $t.Groups[1].Value -replace '&amp;', '&' }
    $time = ""
    $t = [regex]::Match($block, '(?:content-time__date|thumbnail__time)"[^>]*>(.*?)<')
    if ($t.Success) { $time = Parse-RelTime $t.Groups[1].Value }
    $rows += [ordered]@{
      id    = $id
      title = $title
      url   = "https://www.fcbarcelona.com/en/football/$path/news/$id/$slug"
      time  = $time
      tag   = ""
      img   = $img
    }
  }
  return $rows
}

Log "开始抓取官方站球队资讯（B队 + 一队）……"

$newAll = @{}
$failCount = 0
foreach ($tier in $Tiers) {
  $html = ""
  try {
    $wc = New-Object System.Net.WebClient
    $wc.Headers.Add("User-Agent", $UserAgent)
    $wc.Encoding = [System.Text.Encoding]::UTF8
    $html = $wc.DownloadString($tier.url)
  } catch {
    Log "✗ $($tier.name) 页面获取失败：$($_.Exception.Message)"
    $failCount++
    continue
  }
  $rows = Parse-FcbNews $html $tier.path
  if ($rows.Count -eq 0) {
    Log "✗ $($tier.name) 未解析到任何条目（页面结构可能变动），保留旧数据。"
    $failCount++
    continue
  }
  $newAll[$tier.key] = $rows
  Log "  ✓ $($tier.name) 抓取 $($rows.Count) 条"
}

# 防空保护：两队都失败 → 保留旧缓存
if ($newAll.Count -eq 0) {
  Log "✗ 全部梯队抓取失败，保留旧缓存。"
  exit 1
}

# 读旧缓存（合并保留用）
$old = @{}
if (Test-Path $CacheFile) {
  try {
    $txt = [System.IO.File]::ReadAllText($CacheFile, [System.Text.Encoding]::UTF8)
    $m = [regex]::Match($txt, 'window\.LAMASIA_OFFICIAL_NEWS\s*=\s*(\{.*\})\s*;', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    if ($m.Success) {
      $o = $m.Groups[1].Value | ConvertFrom-Json
      foreach ($p in $o.news.PSObject.Properties) { $old[$p.Name] = @($p.Value) }
    }
  } catch { $old = @{} }
}

# 滚动存档：新抓在前，旧按 id 去重追加，上限 $MaxNews
$mergedAll = @{}
foreach ($tk in $newAll.Keys) {
  $seen = New-Object System.Collections.Generic.HashSet[string]
  $merged = New-Object System.Collections.ArrayList
  foreach ($n in $newAll[$tk]) { if ($seen.Add($n.id)) { [void]$merged.Add($n) } }
  foreach ($o in @($old[$tk])) {
    if ($merged.Count -ge $MaxNews) { break }
    if (-not $o -or -not $o.id) { continue }
    if ($seen.Add([string]$o.id)) { [void]$merged.Add($o) }
  }
  if ($merged.Count -gt $MaxNews) { $merged = $merged.GetRange(0, $MaxNews) }
  $mergedAll[$tk] = $merged
}

$total = ($mergedAll.Values | ForEach-Object { $_.Count } | Measure-Object -Sum).Sum
if ($total -eq 0) {
  Log "  ✗ 本次未抓到新闻且无旧数据，跳过写入。"
  exit 0
}

$updated = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("/* 自动生成，请勿手动编辑 —— 由 update_fcb_news.ps1 每日更新于 $updated 数据源：FC Barcelona 官方站 */")
[void]$sb.AppendLine("window.LAMASIA_OFFICIAL_NEWS = {")
[void]$sb.AppendLine("    ""updated"":  " + (JsStr $updated) + ",")
[void]$sb.AppendLine("    ""source"":  ""fcbarcelona"",")
[void]$sb.AppendLine("    ""news"":  {")
$keys = @($Tiers | ForEach-Object { $_.key } | Where-Object { $mergedAll.ContainsKey($_) })
for ($ki = 0; $ki -lt $keys.Count; $ki++) {
  $tk = $keys[$ki]
  $arr = $mergedAll[$tk]
  $kcomma = ","
  if ($ki -eq $keys.Count - 1) { $kcomma = "" }
  [void]$sb.AppendLine("        " + (JsStr $tk) + ":  [")
  for ($i = 0; $i -lt $arr.Count; $i++) {
    $n = $arr[$i]
    $comma = ","
    if ($i -eq $arr.Count - 1) { $comma = "" }
    [void]$sb.AppendLine("            {")
    [void]$sb.AppendLine("                ""id"":  " + (JsStr $n.id) + ", ""title"":  " + (JsStr $n.title) + ",")
    [void]$sb.AppendLine("                ""url"":  " + (JsStr $n.url) + ", ""time"":  " + (JsStr $n.time) + ",")
    [void]$sb.AppendLine("                ""tag"":  " + (JsStr $n.tag) + ", ""img"":  " + (JsStr $n.img) + " }" + $comma)
  }
  [void]$sb.AppendLine("        ]" + $kcomma)
}
[void]$sb.AppendLine("    }")
[void]$sb.AppendLine("};")

$utf8Bom = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText($CacheFile, $sb.ToString(), $utf8Bom)

Log "✓ 已生成缓存：$total 条新闻 → $CacheFile"
