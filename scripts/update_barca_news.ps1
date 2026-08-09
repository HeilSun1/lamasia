# ═══════════════════════════════════════════════════════════════
#   拉玛西亚信息站 · 巴萨B队（Barça Atlètic）球队资讯每日更新脚本
#
#   每天从懂球帝抓取巴萨竞技的「球队资讯」，生成本地缓存供页面展示：
#     1. GET https://pc.dongqiudi.com/team/1839（球队资讯 SSR 页面）
#     2. 解析 tp-news-item 条目：标题 / 时间 / 分类 / 缩略图 / 原文链接
#     3. 生成缓存 assets/js/dqd-barca-news-cache.js
#
#   由 Windows 计划任务或 GitHub Actions 每日调用。
#   运行日志：scripts/barca-news-update.log
#
#   ⚠️ 数据来自懂球帝非官方页面，仅供个人学习使用；页面结构变动时需同步更新解析。
# ═══════════════════════════════════════════════════════════════
$ErrorActionPreference = "Stop"

$PageUrl     = "https://pc.dongqiudi.com/team/1839"        # 巴萨竞技 球队资讯页
$Referer     = "https://pc.dongqiudi.com/team/1839"
$UserAgent   = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
$ArticleBase = "https://www.dongqiudi.com"
$MaxNews     = 50                                       # 滚动存档上限（新+旧按文章 id 去重后保留）

$Root      = Split-Path -Parent $PSScriptRoot
$CacheFile = Join-Path $Root "assets\js\dqd-barca-news-cache.js"
$LogFile   = Join-Path $Root "scripts\barca-news-update.log"

$Headers   = @{ "User-Agent" = $UserAgent; "Referer" = $Referer; "Accept" = "text/html,application/xhtml+xml" }

function Log([string]$msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
  Write-Host $line
}

# 把字符串转成 JS 字符串字面量（保留中文，转义引号/反斜杠，清掉控制字符）
function JsStr([string]$s) {
  $s = $s.Replace('\', '\\').Replace('"', '\"').Replace("`r", '').Replace("`n", '').Replace("`t", ' ')
  return '"' + $s + '"'
}

Log "开始抓取巴萨竞技球队资讯……"

# 用 WebClient 强制 UTF-8 解码（页面 charset=utf-8，避免中文乱码）
$wc = New-Object System.Net.WebClient
$wc.Headers.Add("User-Agent", $UserAgent)
$wc.Headers.Add("Referer", $Referer)
$wc.Encoding = [System.Text.Encoding]::UTF8
try {
  $html = $wc.DownloadString($PageUrl)
} catch {
  Log "✗ 页面获取失败：$($_.Exception.Message)"
  exit 1
}

# 逐条解析 tp-news-item 区块（.NET 正则，Singleline 让 . 匹配换行）
$itemRe  = '<a href="/articles/(\d+)\.html"[^>]*class="tp-news-item".*?</a>'
$titleRe = 'tp-news-item__title"[^>]*>(.*?)</div>'
$timeRe  = 'tp-news-item__time"[^>]*>(.*?)</span>'
$tagRe   = 'tp-news-item__tag"[^>]*>(.*?)</span>'
$imgRe   = 'src="([^"]+)"[^>]*class="tp-news-item__img"'
$opt     = [System.Text.RegularExpressions.RegexOptions]::Singleline

$items = [regex]::Matches($html, $itemRe, $opt)
$rows  = @()

foreach ($m in $items) {
  $block = $m.Value
  $id    = $m.Groups[1].Value

  $title = ""
  $t = [regex]::Match($block, $titleRe)
  if ($t.Success) { $title = [System.Net.WebUtility]::HtmlDecode($t.Groups[1].Value.Trim()) }

  $time = ""
  $t = [regex]::Match($block, $timeRe)
  if ($t.Success) { $time = $t.Groups[1].Value.Trim() }

  $tag = ""
  $t = [regex]::Match($block, $tagRe)
  if ($t.Success) { $tag = $t.Groups[1].Value.Trim() }

  $img = ""
  $t = [regex]::Match($block, $imgRe)
  if ($t.Success) { $img = $t.Groups[1].Value }

  $rows += [ordered]@{
    id    = $id
    title = $title
    url   = "$ArticleBase/articles/$id.html"
    time  = $time
    tag   = $tag
    img   = $img
  }
}

if ($rows.Count -eq 0) {
  Log "✗ 未解析到任何新闻条目（页面结构可能变动），保留旧缓存。"
  exit 1
}

# ── 滚动存档：本次新抓的在前，旧缓存按文章 id 去重追加，上限 $MaxNews ──
$existing = @()
if (Test-Path $CacheFile) {
  try {
    $txt = [System.IO.File]::ReadAllText($CacheFile, [System.Text.Encoding]::UTF8)
    $m = [regex]::Match($txt, 'window\.DQD_BARCA_NEWS\s*=\s*(\{.*\})\s*;', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    if ($m.Success) {
      $old = $m.Groups[1].Value | ConvertFrom-Json
      if ($old.news) { $existing = @($old.news) }
    }
  } catch { $existing = @() }
}

$seen   = New-Object System.Collections.Generic.HashSet[string]
$merged = New-Object System.Collections.ArrayList
foreach ($n in $rows) { if ($seen.Add($n.id)) { [void]$merged.Add($n) } }
foreach ($o in $existing) {
  if ($merged.Count -ge $MaxNews) { break }
  if ($seen.Add([string]$o.id)) { [void]$merged.Add($o) }
}
if ($merged.Count -gt $MaxNews) {
  $merged = $merged.GetRange(0, $MaxNews)
}

Log "合并后共 $($merged.Count) 条（本次新增 $($rows.Count) 条，上限 $MaxNews）"

# 防空覆盖：没抓到任何新闻时不要写空缓存
if ($merged.Count -eq 0) {
  Log "  ✗ 本次未抓到新闻且无旧数据，跳过写入。"
  exit 0
}

$updated = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'

# 生成缓存 JS（手动拼字符串，避免 ConvertTo-Json 把中文转成 \uXXXX）
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("/* 自动生成，请勿手动编辑 —— 由 update_barca_news.ps1 每日更新于 $updated 数据源：懂球帝 */")
[void]$sb.AppendLine("window.DQD_BARCA_NEWS = {")
[void]$sb.AppendLine("    ""updated"":  " + (JsStr $updated) + ",")
[void]$sb.AppendLine("    ""source"":  ""dongqiudi"",")
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

# 写 UTF-8 带 BOM（脚本本身也必须是 BOM 编码，PowerShell 5.1 才能正确读中文）
$utf8Bom = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText($CacheFile, $sb.ToString(), $utf8Bom)

Log "✓ 已生成缓存：$($merged.Count) 条新闻 → $CacheFile"
