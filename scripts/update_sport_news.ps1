# ═══════════════════════════════════════════════════════════════
#   拉玛西亚信息站 · Sport.es 足球基地新闻每日更新脚本
#
#   每天从 Sport.es「Fútbol Base del Barça」（拉玛西亚青训）抓新闻：
#     1. GET https://www.sport.es/es/barca/futbol-base/（SSR 全渲染）
#     2. 解析 <article class="ft-org-cardHome"> 条目：标题 / URL / 缩略图 / 时间
#     3. 生成缓存 assets/js/sport-news-cache.js
#
#   由本机计划任务 / GitHub Actions 每日调用。
#   运行日志：scripts/sport-news-update.log
#   滚动存档：新抓的合并进旧缓存（按文章 URL 去重），上限 50 条。
#
#   ⚠️ 数据来自 Sport.es（西语），仅供个人学习使用；页面结构变动时需同步更新解析。
# ═══════════════════════════════════════════════════════════════
$ErrorActionPreference = "Stop"

$PageUrl    = "https://www.sport.es/es/barca/futbol-base/"
$UserAgent  = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
$MaxNews    = 50

$Root      = Split-Path -Parent $PSScriptRoot
$CacheFile = Join-Path $Root "assets\js\sport-news-cache.js"
$LogFile   = Join-Path $Root "scripts\sport-news-update.log"

function Log([string]$msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
  Write-Host $line
}

function JsStr([string]$s) {
  $s = $s.Replace('\', '\\').Replace('"', '\"').Replace("`r", '').Replace("`n", '').Replace("`t", ' ')
  return '"' + $s + '"'
}

# Sport 时间格式 "21/8/2026, 21:35:16"（dd/MM/yyyy）→ "yyyy-MM-dd HH:mm"
function Parse-SportTime([string]$t) {
  if (-not $t) { return "" }
  $m = [regex]::Match($t, '(\d{1,2})/(\d{1,2})/(\d{4})[, ]+(\d{1,2}):(\d{2})')
  if ($m.Success) {
    $d = $m.Groups[1].Value; $mo = $m.Groups[2].Value; $y = $m.Groups[3].Value
    $hh = $m.Groups[4].Value; $mm = $m.Groups[5].Value
    try { return ([datetime]::new([int]$y, [int]$mo, [int]$d, [int]$hh, [int]$mm, 0)).ToString('yyyy-MM-dd HH:mm') } catch { return "" }
  }
  return ""
}

Log "开始抓取 Sport.es 足球基地新闻……"

$html = ""
try {
  $wc = New-Object System.Net.WebClient
  $wc.Headers.Add("User-Agent", $UserAgent)
  $wc.Encoding = [System.Text.Encoding]::UTF8
  $html = $wc.DownloadString($PageUrl)
} catch {
  Log "✗ 页面获取失败：$($_.Exception.Message)"
  exit 1
}

$itemRe = '<article class="ft-org-cardHome[^"]*"[^>]*>.*?</article>'
$opt = [System.Text.RegularExpressions.RegexOptions]::Singleline
$items = [regex]::Matches($html, $itemRe, $opt)
$rows = @()
$seen = New-Object System.Collections.Generic.HashSet[string]

foreach ($m in $items) {
  $block = $m.Value
  $link = [regex]::Match($block, 'href="(/es/noticias/barca/futbol-base/[^"]+)"[^>]*title="([^"]*)"')
  if (-not $link.Success) { continue }
  $path = $link.Groups[1].Value
  $url  = "https://www.sport.es" + $path
  if (-not $seen.Add($url)) { continue }
  $title = [System.Net.WebUtility]::HtmlDecode($link.Groups[2].Value.Trim())
  $idm = [regex]::Match($path, '-(\d+)$')
  $id  = if ($idm.Success) { $idm.Groups[1].Value } else { $url }
  $img = ""
  $t = [regex]::Match($block, 'srcset="(https://estaticos-cdn\.prensaiberica\.es/[^"]+)"')
  if ($t.Success) { $img = $t.Groups[1].Value -replace '&amp;', '&' }
  $time = ""
  $t = [regex]::Match($block, 'datetime="([^"]+)"')
  if ($t.Success) { $time = Parse-SportTime $t.Groups[1].Value }
  $rows += [ordered]@{
    id    = $id
    title = $title
    url   = $url
    time  = $time
    tag   = ""
    img   = $img
  }
}

if ($rows.Count -eq 0) {
  Log "✗ 未解析到任何新闻条目（页面结构可能变动），保留旧缓存。"
  exit 1
}
Log "  ✓ 本次抓取 $($rows.Count) 条"

# 滚动存档合并（按 URL 去重，上限 $MaxNews）
$existing = @()
if (Test-Path $CacheFile) {
  try {
    $txt = [System.IO.File]::ReadAllText($CacheFile, [System.Text.Encoding]::UTF8)
    $m = [regex]::Match($txt, 'window\.SPORT_NEWS\s*=\s*(\{.*\})\s*;', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    if ($m.Success) {
      $old = $m.Groups[1].Value | ConvertFrom-Json
      if ($old.news) { $existing = @($old.news) }
    }
  } catch { $existing = @() }
}
$seenM = New-Object System.Collections.Generic.HashSet[string]
$merged = New-Object System.Collections.ArrayList
foreach ($n in $rows) { if ($seenM.Add([string]$n.id)) { [void]$merged.Add($n) } }
foreach ($o in $existing) {
  if ($merged.Count -ge $MaxNews) { break }
  if ($seenM.Add([string]$o.id)) { [void]$merged.Add($o) }
}
if ($merged.Count -gt $MaxNews) { $merged = $merged.GetRange(0, $MaxNews) }

Log "合并后共 $($merged.Count) 条（上限 $MaxNews）"
if ($merged.Count -eq 0) { Log "  ✗ 本次未抓到新闻且无旧数据，跳过写入。"; exit 0 }

$updated = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("/* 自动生成，请勿手动编辑 —— 由 update_sport_news.ps1 每日更新于 $updated 数据源：Sport.es */")
[void]$sb.AppendLine("window.SPORT_NEWS = {")
[void]$sb.AppendLine("    ""updated"":  " + (JsStr $updated) + ",")
[void]$sb.AppendLine("    ""source"":  ""sport"",")
[void]$sb.AppendLine("    ""count"":  " + $merged.Count + ",")
[void]$sb.AppendLine("    ""news"":  [")
for ($i = 0; $i -lt $merged.Count; $i++) {
  $n = $merged[$i]
  $comma = ","
  if ($i -eq $merged.Count - 1) { $comma = "" }
  [void]$sb.AppendLine("        {")
  [void]$sb.AppendLine("            ""id"":  " + (JsStr $n.id) + ", ""title"":  " + (JsStr $n.title) + ",")
  [void]$sb.AppendLine("            ""url"":  " + (JsStr $n.url) + ", ""time"":  " + (JsStr $n.time) + ",")
  [void]$sb.AppendLine("            ""tag"":  " + (JsStr $n.tag) + ", ""img"":  " + (JsStr $n.img) + " }" + $comma)
}
[void]$sb.AppendLine("    ]")
[void]$sb.AppendLine("};")

$utf8Bom = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText($CacheFile, $sb.ToString(), $utf8Bom)

Log "✓ 已生成缓存：$($merged.Count) 条新闻 → $CacheFile"
