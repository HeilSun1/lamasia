# ═══════════════════════════════════════════════════════════════
#   拉玛西亚信息站 · Mundo Deportivo「La Masia」新闻每日更新脚本
#
#   每天从 MD 的 la-masia 专题页抓拉玛西亚青训新闻：
#     1. GET https://www.mundodeportivo.com/temas/la-masia（+ page-2）
#     2. 解析 <article class=result> 条目：标题 / URL / 缩略图；日期从 URL 取
#     3. 生成缓存 assets/js/md-news-cache.js
#
#   由本机计划任务 / GitHub Actions 每日调用。
#   运行日志：scripts/md-news-update.log
#   滚动存档：新抓的合并进旧缓存（按文章 URL 去重），上限 50 条。
#
#   ⚠️ 数据来自 Mundo Deportivo（西语），仅供个人学习使用；页面结构变动时需同步更新解析。
# ═══════════════════════════════════════════════════════════════
$ErrorActionPreference = "Stop"

$BaseUrl   = "https://www.mundodeportivo.com/temas/la-masia"
$UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
$MaxNews   = 50
$Pages     = @("", "/page-2")   # 第 1、2 页

$Root      = Split-Path -Parent $PSScriptRoot
$CacheFile = Join-Path $Root "assets\js\md-news-cache.js"
$LogFile   = Join-Path $Root "scripts\md-news-update.log"

function Log([string]$msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
  Write-Host $line
}

function JsStr([string]$s) {
  $s = $s.Replace('\', '\\').Replace('"', '\"').Replace("`r", '').Replace("`n", '').Replace("`t", ' ')
  return '"' + $s + '"'
}

Log "开始抓取 Mundo Deportivo La Masia 新闻……"

$opt = [System.Text.RegularExpressions.RegexOptions]::Singleline
$rows = @()
$seen = New-Object System.Collections.Generic.HashSet[string]

foreach ($pg in $Pages) {
  $html = ""
  try {
    $wc = New-Object System.Net.WebClient
    $wc.Headers.Add("User-Agent", $UserAgent)
    $wc.Encoding = [System.Text.Encoding]::UTF8
    $html = $wc.DownloadString($BaseUrl + $pg)
  } catch {
    Log "✗ 页面获取失败：$($_.Exception.Message)"
    continue
  }
  $itemRe = '<article class=result>.*?</article>'
  $items = [regex]::Matches($html, $itemRe, $opt)
  foreach ($m in $items) {
    $block = $m.Value
    $link = [regex]::Match($block, 'href="(https://www\.mundodeportivo\.com/[^"]+)"[^>]*title="([^"]*)"')
    if (-not $link.Success) { continue }
    $url = $link.Groups[1].Value
    if (-not $seen.Add($url)) { continue }
    $title = [System.Net.WebUtility]::HtmlDecode($link.Groups[2].Value.Trim())
    $idm = [regex]::Match($url, '/(\d{8})/')
    $time = ""
    if ($idm.Success) {
      $y = $idm.Groups[1].Value.Substring(0,4); $mo = $idm.Groups[1].Value.Substring(4,2); $d = $idm.Groups[1].Value.Substring(6,2)
      $time = "$y-$mo-$d 12:00"
    }
    $img = ""
    $t = [regex]::Match($block, 'src="(https://imagenes2\.mundodeportivo\.com/[^"]+)"')
    if ($t.Success) { $img = $t.Groups[1].Value }
    $rows += [ordered]@{
      id    = $url
      title = $title
      url   = $url
      time  = $time
      tag   = ""
      img   = $img
    }
  }
  Log "  ✓ 第 $($Pages.IndexOf($pg)+1) 页解析 $($items.Count) 个条目"
}

if ($rows.Count -eq 0) {
  Log "✗ 未解析到任何新闻条目（页面结构可能变动），保留旧缓存。"
  exit 1
}
Log "  ✓ 本次共抓取 $($rows.Count) 条"

# 滚动存档合并（按 URL 去重，上限 $MaxNews）
$existing = @()
if (Test-Path $CacheFile) {
  try {
    $txt = [System.IO.File]::ReadAllText($CacheFile, [System.Text.Encoding]::UTF8)
    $m = [regex]::Match($txt, 'window\.MD_NEWS\s*=\s*(\{.*\})\s*;', [System.Text.RegularExpressions.RegexOptions]::Singleline)
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
[void]$sb.AppendLine("/* 自动生成，请勿手动编辑 —— 由 update_md_news.ps1 每日更新于 $updated 数据源：Mundo Deportivo */")
[void]$sb.AppendLine("window.MD_NEWS = {")
[void]$sb.AppendLine("    ""updated"":  " + (JsStr $updated) + ",")
[void]$sb.AppendLine("    ""source"":  ""md"",")
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
