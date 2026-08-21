# ═══════════════════════════════════════════════════════════════
#   拉玛西亚信息站 · YouTube 视频集锦缓存（免 API key 版）
#
#   只在「有新的已完赛比赛」时抓取，平时不跑、不浪费：
#     · 已搜过的比赛记录在缓存 searchedMatches 里，下次跳过；
#     · 需要重搜可把比赛键放进 assets/js/videos-data.js 的 reSearch。
#   抓取方式（均无需 Google Cloud / API key）：
#     A. 整场集锦   Edge 无头抓 YouTube 搜索结果页 /results，解析内嵌 ytInitialData
#                   （与抓 Sofascore 同一套技术；YouTube 可能反爬，失败则优雅跳过）
#     B. 球员集锦   用 YouTube 公开 RSS 订阅流 /feeds/videos.xml?channel_id=…
#                   拉取集锦频道（默认 @ArsenKveFCB）的最新上传，按球员名+比赛日期匹配
#   生成 assets/js/dqd-videos-cache.js（window.DQD_VIDEOS_CACHE，
#   由 match-detail.js / player-card.js 读取）。
#
#   本机在国内访问 YouTube 需代理；无代理时该步骤记日志跳过，
#   GitHub Actions 美区运行器可稳定访问（本功能最可靠的自动路径）。
#   人工覆盖层 assets/js/videos-data.js（VIDEOS_DATA）：可 pin 视频、否决错误匹配、reSearch 重搜。
#   由 run_daily_update.ps1 调用；日志 scripts/youtube-update.log
#   ⚠️ 自动匹配是"建议"性质，可能有误配，请用 videos-data.js 否决。
# ═══════════════════════════════════════════════════════════════
$ErrorActionPreference = "Stop"

$Root       = Split-Path -Parent $PSScriptRoot
$LogFile    = Join-Path $Root "scripts\youtube-update.log"
$OutFile    = Join-Path $Root "assets\js\dqd-videos-cache.js"
$UTF8       = New-Object System.Text.UTF8Encoding($false)

# ── 配置 ────────────────────────────────────────────────────────
$PlayerChannelHandles = @("ArsenKveFCB")   # 常规球员集锦频道（可改/可加；仅新比赛/重搜时拉取）
$OneTimeChannelHandles = @("BCNBEST")      # 一次性频道（杯赛主办方，只发该杯赛集锦）：只抓这一次
$OneTimeDoneFile = Join-Path $Root "scripts\one-time-channels.txt"   # 已抓记录（拉完写进去，下次不再抓）
$OneTimeDumpFile = Join-Path $Root "scripts\one-time-dump.txt"       # 一次性频道抓到的原始条目（诊断用，随 Actions 提交回来）
$BiliUids             = @("470189", "1515150312")   # B站 UP主：优先口菐，其次「B站一直吞我评论」
$MaxBiliVideos        = 14                 # 每 UP 取最近 N 个 bvid
$MatchWithinDays      = 60                 # 只抓最近 N 天内新结束的比赛
$MaxMatchVideos       = 3                  # 每场保留条数
$MaxPlayerVideos      = 6                  # 每名球员累积上限
$PubAfterDays         = 15                 # 比赛结束后 N 天内的上传才算
$MaxRelDays           = 25                 # 搜索结果"发布于 N 天前"的上限（防误配旧场次）
$BTeamId              = "24343"            # Sofascore 巴萨竞技
$U19TeamId            = "90128"            # Sofascore 巴萨 U19

$U18TeamId            = "933330"           # Sofascore 巴萨 U18（Juvenil B）
$CutoffUnix           = 1780243200         # 只收 2026-06-01 起（与站点数据一致）

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
$Profile = Join-Path $env:TEMP "youtube-headless-profile"

function Log([string]$msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
  Write-Host $line
}

# ── 读取缓存 JS（window.X = {...};），用 UTF8 显式读取避免 PS5.1 中文乱码 ──
function Read-CacheJs([string]$file) {
  if (-not (Test-Path $file)) { return $null }
  try {
    $txt = [System.IO.File]::ReadAllText((Resolve-Path $file), $UTF8)
    if (-not $txt) { return $null }
    $json = [regex]::Replace($txt, '(?s)^.*?=\s*(?={)', '') -replace ';\s*$', ''
    return ($json | ConvertFrom-Json)
  } catch { return $null }
}

# ── 文本归一化：小写 + 去重音符号 ──
function Norm([string]$s) {
  $s = [string]$s
  $s = $s.ToLowerInvariant()
  $s = $s.Normalize([System.Text.NormalizationForm]::FormD)   # "Rodríguez"→"rodriguez"
  $s = [regex]::Replace($s, '[\u0300-\u036f]', '')
  return $s
}

# 队名/人名 → 有区分度的 token（去掉常见前后缀/泛词）
$STOP = @("u19","u18","u16","u17","u15","fc","cf","cd","ue","ce","de","el","la","los","las","del","club","barca","barcelona","atletic","atletico","reserva","b","a","real","the","of","vs","deportivo","femenino","juvenil")
# 中文名匹配评分：分段（· 分隔）命中取最长匹配长度；前缀≥3 字取 3（通用前缀分数低，多 Pedro 时长的优先）
function ZhScore([string]$titleNorm, [string]$zh) {
  $zn = Norm $zh
  $parts = @($zn -split '·' | Where-Object { $_.Length -ge 2 })
  if (-not $parts.Count) { $parts = @($zn) }
  $best = 0
  foreach ($part in $parts) {
    $p = [regex]::Replace($part, '[^一-鿿]', '')
    if (-not $p) { continue }
    if ($titleNorm.IndexOf($p) -ge 0) { if ($p.Length -gt $best) { $best = $p.Length } }
    elseif ($p.Length -ge 4 -and $titleNorm.IndexOf($p.Substring(0, 4)) -ge 0) { if (4 -gt $best) { $best = 4 } }
    elseif ($p.Length -ge 3 -and $titleNorm.IndexOf($p.Substring(0, 3)) -ge 0) { if (3 -gt $best) { $best = 3 } }
  }
  return $best
}
# 球员-视频匹配分：英文 token 按「命中数×1000 + 命中总长」计（全名命中优先于共享姓氏），中文走 ZhScore（0 = 不匹配）
function PlayerScore([string]$titleNorm, $pl) {
  $cnt = 0; $tot = 0
  foreach ($t in @($pl.tokens)) { if ($titleNorm.IndexOf($t) -ge 0) { $cnt++; $tot += $t.Length } }
  if ($cnt -gt 0) { return 1000 * $cnt + $tot }
  if ($pl.zh) { return ZhScore $titleNorm $pl.zh }
  return 0
}

function TeamTokens([string]$name) {
  $n = Norm $name
  $tokens = @()
  if ($n) { $tokens += $n }
  if ($n -match '^fc(.+)$') { $tokens += $Matches[1] }            # 去 FC 前缀：FC Barcelona U18 → barcelonau18
  if ($n -match '^(.+)u(1[0-9])$') { $tokens += $Matches[1] }     # 去 U 年龄段后缀：→ fcbarcelona
  if ($n -match 'barcelona') { $tokens += @("barcelona", "barca") }
  if ($n -match 'realmadrid') { $tokens += @("realmadrid", "madrid") }
  if ($n -match 'espanyol') { $tokens += @("espanyol", "espanol") }
  if ($n -match 'atletic') { $tokens += @("atletic", "barca") }
  return @($tokens | Where-Object { $_ -and $_.Length -ge 3 } | Select-Object -Unique)
}

# 青年队别名：油管标题可能用 Juvenil B / JB / U19B 等，补进队名 token
function TeamAliases([string]$name) {
  $n = Norm $name
  $out = @()
  if ($n -match 'u18|juvenil.?b') { $out += @("jb", "juvenilb", "u19b") }
  if ($n -match 'u19|juvenil.?a') { $out += @("juvenila") }
  if ($n -match 'u16|cadete')      { $out += @("cadete") }
  if ($n -match 'atletic')         { $out += @("atletic") }
  return @($out | Select-Object -Unique)
}

function HasToken([string]$titleNorm, [string[]]$tokens) {
  foreach ($t in $tokens) { if ($titleNorm.IndexOf($t) -ge 0) { return $true } }
  return $false
}

# 频道可信度分（官方频道优先）
function ChannelScore([string]$channelTitle) {
  $n = Norm $channelTitle
  if ($n -match 'fcbarcelona|fc barcelona|barcafemenino') { return 30 }
  if ($n -match 'uefa') { return 30 }
  if ($n -match 'barca one|barça one|barcaone') { return 30 }
  if ($n -match 'arsenkve') { return 25 }
  if ($n -match 'barca tv|barcatv') { return 15 }
  return 0
}

# ISO "2026-08-10T13:00:00Z" → UTC [datetime]
function Get-UcDate([string]$iso) {
  try {
    return [datetime]::Parse($iso, [System.Globalization.CultureInfo]::InvariantCulture,
             [System.Globalization.DateTimeStyles]::AssumeUniversal).ToUniversalTime()
  } catch { return $null }
}

# 时长 "7:45"/"1:02:03" → 秒
function Get-LenSec([string]$t) {
  $m = [regex]::Match($t, '^(\d+):(\d{2})(?::(\d{2}))?$')
  if (-not $m.Success) { return 0 }
  if ($m.Groups[3].Success) { return [int]$m.Groups[3].Value + [int]$m.Groups[2].Value * 60 + [int]$m.Groups[1].Value * 3600 }
  return [int]$m.Groups[2].Value + [int]$m.Groups[1].Value * 60
}

# 相对发布时间 "3 days ago"/"1 week ago"/"2 months ago" → 天数（解析不了返回 -1）
function Get-RelDays([string]$s) {
  $m = [regex]::Match($s, '(\d+)\s+(day|week|month|year)s?\s+ago')
  if (-not $m.Success) { return -1 }
  $n = [int]$m.Groups[1].Value
  switch ($m.Groups[2].Value) {
    "day"   { return $n }
    "week"  { return $n * 7 }
    "month" { return $n * 30 }
    "year"  { return $n * 365 }
  }
  return -1
}

# ── Edge 无头抓取 ──────────────────────────────────────────────
$ScrapeFail = 0
# Budget>0 时加 --virtual-time-budget（等异步 JS 渲染完，B站 空间页需要；YouTube 搜索结果页不需要）
function Get-YtDom([string]$url, [string]$what, [int]$Budget = 0) {
  try {
    $tmp = Join-Path $env:TEMP ("yt_" + [guid]::NewGuid().ToString("N") + ".html")
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $edgeArgs = @("--headless=new", "--disable-gpu", "--no-first-run", "--disable-extensions", "--lang=en-US", "--user-data-dir=$Profile")
    if ($Budget -gt 0) { $edgeArgs += "--virtual-time-budget=$Budget" }
    $edgeArgs += @("--dump-dom", $url)
    $html = (& $Edge @edgeArgs 2>$null | Out-String)
    $ErrorActionPreference = $prevEAP
    [System.IO.File]::WriteAllText($tmp, $html, [System.Text.Encoding]::UTF8)
    $txt = [System.IO.File]::ReadAllText($tmp, [System.Text.Encoding]::UTF8)
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    if ([string]::IsNullOrWhiteSpace($txt)) {
      $script:ScrapeFail++
      Log "  ✗ $what 空页（网络不可达/被风控）"
      return ""
    }
    $script:ScrapeFail = 0
    return $txt
  } catch {
    $script:ScrapeFail++
    Log "  ✗ $what 抓取失败：$($_.Exception.Message)"
    return ""
  }
}

# 从 HTML 提取 JS 对象字面量（处理嵌套大括号与字符串），返回 JSON 文本
function Extract-JsObject([string]$html, [string]$marker) {
  $idx = $html.IndexOf($marker)
  if ($idx -lt 0) { return "" }
  $idx = $html.IndexOf('{', $idx)
  if ($idx -lt 0) { return "" }
  $depth = 0; $inStr = $false; $esc = $false
  for ($i = $idx; $i -lt $html.Length; $i++) {
    $c = $html[$i]
    if ($esc) { $esc = $false; continue }
    if ($c -eq '\') { $esc = $true; continue }
    if ($inStr) {
      if ($c -eq '"') { $inStr = $false }
      continue
    }
    if ($c -eq '"') { $inStr = $true; continue }
    if ($c -eq '{') { $depth++ }
    elseif ($c -eq '}') {
      $depth--
      if ($depth -eq 0) { return $html.Substring($idx, $i - $idx + 1) }
    }
  }
  return ""
}

# 解析页面内嵌的 ytInitialData → 对象，失败返回 $null
function Get-YtData([string]$url, [string]$what) {
  if ($ScrapeFail -ge 3) { return $null }   # 已判定被风控，不再逐个尝试
  $html = Get-YtDom $url $what
  if (-not $html) { return $null }
  $json = Extract-JsObject $html 'ytInitialData ='
  if (-not $json) { $json = Extract-JsObject $html 'window["ytInitialData"]' }
  if (-not $json) {
    $script:ScrapeFail++
    Log "  ✗ $what 未找到 ytInitialData（页面结构变化或被风控）"
    return $null
  }
  try { return ($json | ConvertFrom-Json) } catch {
    $script:ScrapeFail++
    Log "  ✗ $what ytInitialData 解析失败"
    return $null
  }
}

# 搜索结果页 → 视频列表 {videoId,title,channel,lengthText,publishedRel}；
# 抓取/解析失败返回 $null（与"成功但无结果=@()"区分，调用方据此决定是否标记已搜）
function Get-YtSearchResults([string]$q, [string]$what) {
  $url = "https://www.youtube.com/results?search_query=" + [uri]::EscapeDataString($q) + "&hl=en"
  $data = Get-YtData $url $what
  if (-not $data) { return $null }
  $items = @()
  try {
    $contents = $data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents
    foreach ($s in @($contents)) {
      if (-not $s -or -not $s.itemSectionRenderer) { continue }
      foreach ($c in @($s.itemSectionRenderer.contents)) {
        if (-not $c -or -not $c.videoRenderer) { continue }
        $v = $c.videoRenderer
        $vid = [string]$v.videoId
        if (-not $vid) { continue }
        $title = ""
        foreach ($r in @($v.title.runs)) { $title += [string]$r.text }
        $chan = ""
        foreach ($r in @($v.ownerText.runs)) { $chan += [string]$r.text }
        $lenTxt = if ($v.lengthText) { [string]$v.lengthText.simpleText } else { "" }
        $pubRel = if ($v.publishedTimeText) { [string]$v.publishedTimeText.simpleText } else { "" }
        $items += [pscustomobject]@{ videoId=$vid; title=$title; channel=$chan; lengthText=$lenTxt; publishedRel=$pubRel }
      }
    }
  } catch {
    Log "  ✗ $what 解析搜索结果失败：$($_.Exception.Message)"
    return @()
  }
  return @($items)
}

# 快速连通性探测：YouTube 不可达（国内无代理）时直接跳过，
# 省去多次 Edge 无头调用各 20s+ 的慢超时。结果缓存，只探测一次。
$ytProbe = $null
function Test-YtProbe {
  if ($null -ne $script:ytProbe) { return $script:ytProbe }
  try {
    $null = Invoke-WebRequest -Uri "https://www.youtube.com" -UseBasicParsing -Method Head -TimeoutSec 8
    $script:ytProbe = $true
  } catch {
    $script:ytProbe = $false
    Log "✗ YouTube 不可达（本机需代理/TUN 模式），本次跳过视频抓取，下次自动重试。"
  }
  return $script:ytProbe
}

# 解析油管频道 ID（handle 需带 @）：先正则抓原始 HTML 的 externalId/channelId，再兜底 ytInitialData
function Get-YtChannelId([string]$handle) {
  $h = $handle.TrimStart('@')
  $url = "https://www.youtube.com/@$h"
  $html = Get-YtDom $url "解析频道 @$h"
  if ($html) {
    foreach ($pat in @('"externalId":"(UC[^"]+)"', '"channelId":"(UC[^"]+)"', '"browseId":"(UC[^"]+)"')) {
      $mm = [regex]::Match($html, $pat)
      if ($mm.Success) { return $mm.Groups[1].Value }
    }
  }
  $data = Get-YtData $url "解析频道 @$h"
  if ($data) {
    try { return [string]$data.metadata.channelMetadataRenderer.externalId } catch {}
  }
  return ""
}

# 频道 RSS 订阅（免 key 官方端点）→ 视频列表 {videoId,title,channel,channelId,published}
function Get-ChannelRss([string]$channelId) {
  $out = @()
  if (-not $channelId) { return $out }
  try {
    $url = "https://www.youtube.com/feeds/videos.xml?channel_id=$channelId"
    $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 25
    $xml = [xml]$resp.Content
    foreach ($e in @($xml.feed.entry)) {
      # 提取 <yt:videoId>（带命名空间前缀，按 LocalName 匹配最稳）
      $vid = ""
      foreach ($n in $e.ChildNodes) { if ($n.LocalName -eq "videoId") { $vid = $n.InnerText; break } }
      if (-not $vid) { continue }
      $pub = ""
      try { $pub = (Get-UcDate ([string]$e.published)).ToString("yyyy-MM-dd") } catch {}
      $out += [pscustomobject]@{
        videoId = $vid
        title   = [string]$e.title
        channel = [string]$e.author.name
        channelId = $channelId
        published = $pub
        durationSec = ""
      }
    }
  } catch {
    Log "  ✗ RSS 抓取失败：$($_.Exception.Message)"
  }
  return @($out)
}

# ── B站：渲染 UP 空间页取 bvid（反爬用 Edge 无头 + 虚拟时间等异步渲染完，失败重试） ──
function Get-BiliBvids([string]$uid) {
  $bvids = @()
  foreach ($attempt in 1..5) {
    if ($ScrapeFail -ge 3) { break }
    $url = "https://space.bilibili.com/$uid/video"
    $html = Get-YtDom $url "B站UP空间 $uid" 20000
    if ($html) {
      $ids = @([regex]::Matches($html, 'video/(BV[a-zA-Z0-9]+)') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique)
      if ($ids.Count) { $bvids = @($ids); break }
    }
    Start-Sleep -Milliseconds 800
  }
  if (-not $bvids.Count) { Log "  · B站 UP $uid 未取到投稿（渲染失败或被风控）" }
  return $bvids
}

# B站 view 接口：bvid → 元数据（无需 WBI，任意 buvid cookie 可通）
function Get-BiliVideoInfo([string]$bvid) {
  try {
    $uri = "https://api.bilibili.com/x/web-interface/view?bvid=$bvid"
    $headers = @{
      "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0"
      "Referer"    = "https://space.bilibili.com/"
      "Cookie"     = "buvid3=lamasia"
    }
    $res = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers -TimeoutSec 15
    if ($res -and $res.code -eq 0 -and $res.data) {
      $d = $res.data
      return [pscustomobject]@{
        bvid     = $bvid
        title    = [string]$d.title
        pic      = [string]$d.pic
        pubdate  = [string]$d.pubdate
        duration = [string]$d.duration
        owner    = [string]$d.owner.name
      }
    }
  } catch {
    Log "  ✗ B站视频 $bvid 元数据失败：$($_.Exception.Message)"
  }
  return $null
}

# ── 中文名映射：English(norm) → zh（来自 data.js + 懂球帝 B队名单） ──
function Build-ZhMap {
  $map = @{}
  $dataJs = Read-CacheJs (Join-Path $Root "assets\js\data.js")
  if ($dataJs -and $dataJs.players) {
    foreach ($tier in @($dataJs.players.PSObject.Properties)) {
      foreach ($p in @($tier.Value)) {
        if ($p.name -and $p.zh) { $k = Norm ([string]$p.name); if ($k) { $map[$k] = [string]$p.zh } }
      }
    }
  }
  $bteam = Read-CacheJs (Join-Path $Root "assets\js\dqd-barca-atletic-cache.js")
  if ($bteam -and $bteam.roster -and $bteam.roster.data -and $bteam.roster.data.list) {
    foreach ($g in @($bteam.roster.data.list)) {
      foreach ($p in @($g.data)) {
        $en = [string]$p.person_en_name; $zh = [string]$p.person_name
        if ($en -and $zh) { $k = Norm $en; if ($k -and -not $map.ContainsKey($k)) { $map[$k] = $zh } }
      }
    }
  }
  return $map
}

Log "开始 YouTube 集锦更新（免 key：搜索抓取 + 频道 RSS + B站 UP 空间）……"

# ── 读旧缓存（合并保留用） ──
$old = Read-CacheJs $OutFile
$oldMatches = @{}
$oldPlayers = @{}
$oldSearched = @{}
if ($old) {
  if ($old.matches) {
    foreach ($p in $old.matches.PSObject.Properties) { $oldMatches[$p.Name] = @($p.Value) }
  }
  if ($old.players) {
    foreach ($p in $old.players.PSObject.Properties) { $oldPlayers[$p.Name] = @($p.Value) }
  }
  foreach ($k in @($old.searchedMatches)) { $oldSearched[[string]$k] = $true }
}
# 人工 reSearch 列表（videos-data.js）→ 强制重搜
$reSearch = @{}
$vd = Read-CacheJs (Join-Path $Root "assets\js\videos-data.js")
if ($vd -and $vd.reSearch) { foreach ($k in @($vd.reSearch)) { $reSearch[[string]$k] = $true } }

# ── 解析输入缓存 ──
$sfb = Read-CacheJs (Join-Path $Root "assets\js\dqd-barca-atletic-sf-cache.js")
$u19 = Read-CacheJs (Join-Path $Root "assets\js\dqd-u19-cache.js")
$u18 = Read-CacheJs (Join-Path $Root "assets\js\dqd-u18-cache.js")
$sfbDetails = Read-CacheJs (Join-Path $Root "assets\js\dqd-barca-atletic-sf-details-cache.js")
$u19Details = Read-CacheJs (Join-Path $Root "assets\js\dqd-u19-details-cache.js")
$u18Details = Read-CacheJs (Join-Path $Root "assets\js\dqd-u18-details-cache.js")

$outMatches = @{}   # 比赛键 -> 视频列表
$outPlayers = @{}   # 球员键 -> 视频列表
$searched    = @{}  # 已搜索的比赛键集合
$newMatchList = @() # 本次新搜索的比赛（其阵容球员需要搜按场集锦）
$playerKeys  = @{}  # 本次已处理过的球员键（同一人只搜一次）

function New-Video($videoId, $title, $channel, $channelId, [string]$published, [string]$durationSec) {
  return [pscustomobject]@{
    videoId     = [string]$videoId
    title       = [string]$title
    channel     = [string]$channel
    channelId   = [string]$channelId
    published   = [string]$published
    durationSec = [string]$durationSec
  }
}

# B站视频对象：在标准字段上附加 site="bili" 与封面 pic（https 化）
function New-BiliVideo($info, [string]$published) {
  $pic = [string]$info.pic
  if ($pic -match '^//') { $pic = "https:" + $pic }
  elseif ($pic -match '^http://') { $pic = $pic -replace '^http:', 'https:' }
  $o = New-Video $info.bvid $info.title $info.owner "" $published ([string]$info.duration)
  $o | Add-Member -NotePropertyName site -NotePropertyValue "bili" -Force
  $o | Add-Member -NotePropertyName pic -NotePropertyValue $pic -Force
  return $o
}

function Merge-Videos($existing, $incoming, [int]$cap) {
  $seen = @{}
  $out = @()
  foreach ($v in @($existing) + @($incoming)) {
    $id = [string]$v.videoId
    if (-not $id -or $seen.ContainsKey($id)) { continue }
    $seen[$id] = $true
    $out += $v
    if ($out.Count -ge $cap) { break }
  }
  return $out
}

# ════════════ 0. 当前全部已完赛（用于视频保留与 searchedMatches 裁剪） ════════════
$currentEnded = @{}
foreach ($cfg in @(
  @{ cache = $sfb; prefix = "sfb:" },
  @{ cache = $u19; prefix = "sofascore:" },
  @{ cache = $u18; prefix = "sofascore:" }
)) {
  if (-not $cfg.cache -or -not $cfg.cache.matches) { continue }
  foreach ($m in @($cfg.cache.matches | Where-Object { $_.status -eq 'Ended' })) {
    $currentEnded[$cfg.prefix + [string]$m.id] = $true
  }
}
foreach ($k in @($oldMatches.Keys)) {
  if ($currentEnded.ContainsKey($k)) { $outMatches[$k] = @($oldMatches[$k]) }
}
foreach ($k in @($oldPlayers.Keys)) { $outPlayers[$k] = @($oldPlayers[$k]) }
foreach ($k in @($oldSearched.Keys)) {
  if ($currentEnded.ContainsKey($k)) { $searched[$k] = $true }
}

# ════════════ A. 整场集锦（YouTube 搜索抓取） ════════════
$nowUtc = [datetime]::UtcNow
# A0. 先收集「新出现的已完赛」——YouTube 不可达也要收集，B站 匹配仍可用
$matchSeen = @{}
foreach ($cfg in @(
  @{ cache = $sfb; prefix = "sfb:"; details = $sfbDetails; teamId = $BTeamId; tier = "b" },
  @{ cache = $u19; prefix = "sofascore:"; details = $u19Details; teamId = $U19TeamId; tier = "u19" },
  @{ cache = $u18; prefix = "sofascore:"; details = $u18Details; teamId = $U18TeamId; tier = "u18" }
)) {
  if (-not $cfg.cache -or -not $cfg.cache.matches) { continue }
  foreach ($m in @($cfg.cache.matches | Where-Object { $_.status -eq 'Ended' })) {
    $eid = [string]$m.id
    if (-not $eid -or $matchSeen.ContainsKey($eid)) { continue }
    $matchSeen[$eid] = $true
    $key = $cfg.prefix + $eid
    try { $mDate = [DateTimeOffset]::FromUnixTimeSeconds([int64]$m.start).UtcDateTime } catch { continue }
    if (($nowUtc - $mDate).TotalDays -gt $MatchWithinDays) { continue }
    if ($searched.ContainsKey($key) -and -not $reSearch.ContainsKey($key)) { continue }
    $newMatchList += $m | Add-Member -PassThru -NotePropertyName _cfg -NotePropertyValue $cfg
  }
}
# A1. YouTube 整场集锦搜索（探测不可达则跳过，B站 不受影响）
$ytOk = Test-YtProbe
if ($newMatchList.Count -and -not $ytOk) {
  Log "  · 有 $($newMatchList.Count) 场新比赛，但 YouTube 不可达：仅做 B站 匹配。"
}
if ($newMatchList.Count -and $ytOk) {
  foreach ($nm in $newMatchList) {
    if ($ScrapeFail -ge 3) { Log "  · 搜索抓取已被风控，停止整场集锦搜索。"; break }
    $m = $nm
    $cfg = $nm._cfg
    $eid = [string]$m.id
    $key = $cfg.prefix + $eid
    $searched[$key] = $true
    try { $mDate = [DateTimeOffset]::FromUnixTimeSeconds([int64]$m.start).UtcDateTime } catch { continue }

    $homeTk = @((TeamTokens ([string]$m.home)) + (TeamAliases ([string]$m.home)) | Select-Object -Unique)
    $awayTk = @((TeamTokens ([string]$m.away)) + (TeamAliases ([string]$m.away)) | Select-Object -Unique)
    $lo = $mDate.AddDays(-$PubAfterDays)
    Log "  · 整场集锦（新比赛）：$($m.home) vs $($m.away)（$($mDate.ToString('yyyy-MM-dd'))）"

    $q1 = "$($m.home) vs $($m.away) highlights"
    $r = Get-YtSearchResults $q1 "整场集锦 $q1"
    if (-not $r) {
      $q2 = "$($m.home) $($m.away) highlights"
      $r = Get-YtSearchResults $q2 "整场集锦 $q2"
      if ($r) { Log "    ↳ 主查询无结果/失败，已用回退查询。$($r.Count) 个候选" }
    }
    if ($null -eq $r) {
      # 两次查询都抓取失败（网络/被风控）→ 不标记已搜，下次自动重试
      Log "    ↳ 搜索抓取失败（网络/被风控），该场不标记已搜，下次自动重试。"
      $searched.Remove($key)
      continue
    }
    $items = @($r)
    if (-not $items.Count) { Log "    ↳ 无搜索候选（该场 YouTube 可能无集锦）。"; continue }

    # 候选过滤：标题含双方 token + 相对发布 ≤ MaxRelDays + 时长 90–7200 秒 + 逻辑校验
    $cand = @()
    foreach ($it in $items) {
      $titleN = Norm ([string]$it.title)
      if (-not (HasToken $titleN $homeTk)) { continue }
      if (-not (HasToken $titleN $awayTk)) { continue }
      # 非整场集锦的标题词：直播流 / 训练 / 发布会 / 访谈 / 前瞻 / 反应等
      if ($titleN -match 'watch\s*live|live\s*stream|live\s*score|training|press\s*conference|interview|preview|prediction|vlog|reaction|post.?match|直播|训练|发布会|前瞻|预告|采访') { continue }
      $rel = Get-RelDays ([string]$it.publishedRel)
      if ($rel -ge 0 -and $rel -gt $MaxRelDays) { continue }
      # 逻辑校验：整场集锦发布时间必须 ≥ 本场开赛（-1 天容差，兼容当天上传），≤ 赛后 PubAfterDays 天；
      # 杜绝把比赛之前发布的旧比赛视频 / 直播流配到本场
      if ($rel -ge 0) {
        $pubDt = $nowUtc.AddDays(-$rel)
        if ($pubDt -lt $mDate.AddDays(-1) -or $pubDt -gt $mDate.AddDays($PubAfterDays)) { continue }
      }
      $dur = Get-LenSec ([string]$it.lengthText)
      if ($dur -gt 0 -and ($dur -lt 90 -or $dur -gt 7200)) { continue }
      $score = (ChannelScore ([string]$it.channel)) + 2 + 2
      $cand += [pscustomobject]@{ score=$score; it=$it; dur=$dur; rel=$rel }
    }
    if (-not $cand.Count) { Log "    ↳ 候选 $($items.Count) 个，无一通过标题/时长过滤。"; continue }

    $scored = @($cand | Sort-Object -Property score -Descending | Select-Object -First $MaxMatchVideos)
    $new = @($scored | ForEach-Object {
      $pub = ""
      if ($_.rel -ge 0) { $pub = $nowUtc.AddDays(-$_.rel).ToString("yyyy-MM-dd") }
      New-Video $_.it.videoId $_.it.title $_.it.channel "" $pub ([string]$_.dur)
    })
    $outMatches[$key] = @(Merge-Videos ($outMatches[$key] | Where-Object { $_ }) $new $MaxMatchVideos)
    Log "    ✓ 收录 $($new.Count) 条：$((@($outMatches[$key]) | ForEach-Object { $_.title }) -join ' | ')"
    Start-Sleep -Milliseconds 600
  }
}

# ════════════ B. 球员按场个人集锦（油管频道 RSS + B站，覆盖全部在队球员） ════════════
# 已完赛列表（双方队名 token + 时间窗），供全场集锦匹配
$endedList = @()
foreach ($cfg in @(
  @{ cache = $sfb; prefix = "sfb:" },
  @{ cache = $u19; prefix = "sofascore:" },
  @{ cache = $u18; prefix = "sofascore:" }
)) {
  if (-not $cfg.cache -or -not $cfg.cache.matches) { continue }
  foreach ($m in @($cfg.cache.matches | Where-Object { $_.status -eq 'Ended' })) {
    $eid = [string]$m.id
    try { $mDate = [DateTimeOffset]::FromUnixTimeSeconds([int64]$m.start).UtcDateTime } catch { continue }
    $endedList += [pscustomobject]@{
      key = $cfg.prefix + $eid
      homeTk = @((TeamTokens ([string]$m.home)) + (TeamAliases ([string]$m.home)) | Select-Object -Unique)
      awayTk = @((TeamTokens ([string]$m.away)) + (TeamAliases ([string]$m.away)) | Select-Object -Unique)
      mDate = $mDate
    }
  }
}

# 频道 RSS 仅在出现新完赛比赛 / reSearch 重搜 / 有未抓的一次性频道时拉取，不每日抓
$oneTimeDone = @()
if (Test-Path $OneTimeDoneFile) { $oneTimeDone = @(Get-Content $OneTimeDoneFile) }
$pendingOneTime = @($OneTimeChannelHandles | Where-Object { $oneTimeDone -notcontains $_ })
if (($newMatchList.Count -gt 0 -or $pendingOneTime.Count -gt 0) -and $ytOk) {
  # 解析全部频道 ID（常规 + 一次性），逐个拉取 RSS（不止第一个可用的频道）
  $channelIds = @()
  foreach ($handle in @($PlayerChannelHandles + $pendingOneTime)) {
    $cid = Get-YtChannelId $handle
    if (-not $cid) { Log "✗ 未能从 @$handle 页面解析频道 ID，跳过该频道。" }
    else { $channelIds += $cid; Log "  · 已解析频道 @$handle = $cid" }
  }

  if ($channelIds.Count) {
    $zhMap = Build-ZhMap
    # 球员池：用当前名单（与 B站 一致），覆盖面广
    $pool = @{}
    foreach ($cfg in @(
      @{ cache = $sfb; tier = "b" },
      @{ cache = $u19; tier = "u19" },
      @{ cache = $u18; tier = "u18" }
    )) {
      if (-not $cfg.cache -or -not $cfg.cache.players) { continue }
      foreach ($p in @($cfg.cache.players)) {
        $plid = [string]$p.id
        $pname = [string]$p.name
        if (-not $plid -or -not $pname) { continue }
        $pkey = "sf:$($cfg.tier):$plid"
        if ($pool.ContainsKey($pkey)) { continue }
        $zh = ""
        $nz = Norm $pname
        if ($zhMap.ContainsKey($nz)) { $zh = $zhMap[$nz] }
        $pool[$pkey] = [pscustomobject]@{ name = $pname; zh = $zh; tokens = @(TeamTokens $pname) }
      }
    }
    foreach ($cid in $channelIds) {
      Log "  · 频道 $cid 拉取 RSS……"
      $rss = @(Get-ChannelRss $cid)
      Log "  · 频道 $cid RSS 共 $($rss.Count) 条上传；匹配池 $($pool.Count) 名球员"
      # 一次性频道的原始条目落盘，随 Actions 提交回来供诊断
      if ($pendingOneTime.Count -and $rss.Count) {
        Set-Content $OneTimeDumpFile (("## $cid " + $nowUtc.ToString('yyyy-MM-dd HH:mm') + " items=" + $rss.Count))
        foreach ($it in $rss) { Add-Content $OneTimeDumpFile ("  " + $it.published + " | " + $it.channel + " | " + $it.title) }
        Log "  · 已把一次性频道 $cid 的 $($rss.Count) 条原始条目写入 $OneTimeDumpFile"
      }
    foreach ($it in $rss) {
      # 时间过滤：只要 2026-06-01 起的上传
      $pubT = Get-UcDate ([string]$it.published)
      if (-not $pubT) { continue }
      if ($pubT -lt [DateTimeOffset]::FromUnixTimeSeconds($CutoffUnix).UtcDateTime) { continue }
      $titleN = Norm $it.title
      # ① 球员关键词匹配 → 该球员按场集锦
      $bestScore = 0
      $bestKeys = @()
      foreach ($pk in @($pool.Keys)) {
        $sc = PlayerScore $titleN $pool[$pk]
        if ($sc -gt $bestScore) { $bestScore = $sc; $bestKeys = @($pk) }
        elseif ($sc -eq $bestScore -and $sc -gt 0) { $bestKeys += $pk }
      }
      if ($bestScore -gt 0) {
        foreach ($pk in $bestKeys) {
          $v = New-Video $it.videoId $it.title $it.channel $it.channelId $it.published ""
          $outPlayers[$pk] = @(Merge-Videos ($outPlayers[$pk] | Where-Object { $_ }) $v $MaxPlayerVideos)
        }
        Log "    ✓ 油管球员匹配：$($it.title)"
      }
      # ② 比赛关键词匹配 → 全场集锦（标题含双方队名、非直播/训练类，发布于开赛 -1 天到赛后 PubAfterDays 天）
      $nonMatchLike = $titleN -match 'watch\s*live|live\s*stream|live\s*score|training|press\s*conference|interview|preview|prediction|vlog|reaction|post.?match|直播|训练|发布会|前瞻|预告|采访'
      if (-not $nonMatchLike) {
        foreach ($em in $endedList) {
          if (-not (HasToken $titleN $em.homeTk) -or -not (HasToken $titleN $em.awayTk)) { continue }
          $lo = $em.mDate.AddDays(-1)
          $hi = $em.mDate.AddDays($PubAfterDays)
          if ($pubT -lt $lo -or $pubT -gt $hi) { continue }
          $v = New-Video $it.videoId $it.title $it.channel $it.channelId $it.published ""
          $outMatches[$em.key] = @(Merge-Videos ($outMatches[$em.key] | Where-Object { $_ }) $v $MaxMatchVideos)
        }
      }
    }
    }
    # 一次性频道只抓这一次：拉完写进记录文件，下次不再抓
    if ($pendingOneTime.Count) {
      Add-Content $OneTimeDoneFile ($pendingOneTime | ForEach-Object { "youtube:$($_)" })
      Log "  · 已记录一次性频道 @$($pendingOneTime -join ', @')，下次不再抓取"
    }
  }
} else {
  Log "  · 无新完赛比赛且无待抓的一次性频道（或 YouTube 不可达），跳过油管频道集锦。"
}

# ════════════ B2. B站 UP 主集锦（口菐 / 「B站一直吞我评论」） ════════════
# 独立于 YouTube 探测：国内 B站 可直连，无代理也能拉到
if ($newMatchList.Count -and $BiliUids.Count) {
  $zhMap = Build-ZhMap
  # 球员池：用当前名单（B队 SF + U19 名单），覆盖面广，任何在队球员的视频都能按名匹配
  $allPlayers = @{}
  foreach ($cfg in @(
    @{ cache = $sfb; tier = "b" },
    @{ cache = $u19; tier = "u19" },
    @{ cache = $u18; tier = "u18" }
  )) {
    if (-not $cfg.cache -or -not $cfg.cache.players) { continue }
    foreach ($p in @($cfg.cache.players)) {
      $plid = [string]$p.id
      $pname = [string]$p.name
      if (-not $plid -or -not $pname) { continue }
      $pkey = "sf:$($cfg.tier):$plid"
      if ($allPlayers.ContainsKey($pkey)) { continue }
      $zh = ""
      $nz = Norm $pname
      if ($zhMap.ContainsKey($nz)) { $zh = $zhMap[$nz] }
      $allPlayers[$pkey] = [pscustomobject]@{ name = $pname; zh = $zh; tokens = @(TeamTokens $pname) }
    }
  }
  # （$endedList 已在 B 段开头构建，供全场集锦匹配）
  Log "  · B站 匹配池：$($allPlayers.Count) 名在队球员 / $($endedList.Count) 场已完赛"
  foreach ($uid in $BiliUids) {
    $bvids = @(Get-BiliBvids $uid)
    $count = [Math]::Min($bvids.Count, $MaxBiliVideos)
    if (-not $count) { continue }
    Log "  · B站 UP $uid：检查最近 $count 条投稿"
    $i = 0
    foreach ($bvid in $bvids) {
      if ($i -ge $count) { break }
      $i++
      $info = Get-BiliVideoInfo $bvid
      if (-not $info) { continue }
      try { $pubDt = [DateTimeOffset]::FromUnixTimeSeconds([int64]$info.pubdate).UtcDateTime } catch { continue }
      if ([int64]$info.pubdate -lt $CutoffUnix) { continue }   # 只要 2026-06-01 起
      $titleN = Norm $info.title
      $addedPlayer = $false
      # ① 球员关键词匹配 → 该球员的按场集锦（评分制：只给最长匹配者，防「佩德罗」这种通用前缀误配多个人）
      $bestScore = 0
      $bestKeys = @()
      foreach ($pk in @($allPlayers.Keys)) {
        $sc = PlayerScore $titleN $allPlayers[$pk]
        if ($sc -gt $bestScore) { $bestScore = $sc; $bestKeys = @($pk) }
        elseif ($sc -eq $bestScore -and $sc -gt 0) { $bestKeys += $pk }
      }
      if ($bestScore -gt 0) {
        foreach ($pk in $bestKeys) {
          $v = New-BiliVideo $info $pubDt.ToString("yyyy-MM-dd")
          $outPlayers[$pk] = @(Merge-Videos ($outPlayers[$pk] | Where-Object { $_ }) $v $MaxPlayerVideos)
        }
        $addedPlayer = $true
      }
      # ② 比赛关键词匹配 → 全场集锦（标题含双方队名、非直播/训练类，发布于开赛 -1 天到赛后 PubAfterDays 天）
      $nonMatchLike = $titleN -match 'watch\s*live|live\s*stream|live\s*score|training|press\s*conference|interview|preview|prediction|vlog|reaction|post.?match|直播|训练|发布会|前瞻|预告|采访'
      if (-not $nonMatchLike) {
        foreach ($em in $endedList) {
          if (-not (HasToken $titleN $em.homeTk) -or -not (HasToken $titleN $em.awayTk)) { continue }
          $lo = $em.mDate.AddDays(-1)
          $hi = $em.mDate.AddDays($PubAfterDays)
          if ($pubDt -lt $lo -or $pubDt -gt $hi) { continue }
          $v = New-BiliVideo $info $pubDt.ToString("yyyy-MM-dd")
          $outMatches[$em.key] = @(Merge-Videos ($outMatches[$em.key] | Where-Object { $_ }) $v $MaxMatchVideos)
        }
      }
      if ($addedPlayer) { Log "    ✓ B站匹配球员：$($info.title)" }
    }
    Start-Sleep -Milliseconds 500
  }
}

# ════════════ C. 合并写回 ════════════
$core = [ordered]@{
  searchedMatches = @($searched.Keys | Sort-Object)
  matches = [ordered]@{}
  players = [ordered]@{}
}
foreach ($k in @($outMatches.Keys | Sort-Object)) { $core.matches[$k] = @($outMatches[$k]) }
foreach ($k in @($outPlayers.Keys | Sort-Object)) { $core.players[$k] = @($outPlayers[$k]) }
$coreJson = $core | ConvertTo-Json -Depth 10

# 与旧缓存的核心数据比较（忽略 updated 时间戳），内容没变就不写，避免每日空 diff
$oldCoreJson = ""
if (Test-Path $OutFile) {
  $oldObj = Read-CacheJs $OutFile
  if ($oldObj) {
    $oc = [ordered]@{ searchedMatches = @($oldObj.searchedMatches); matches = [ordered]@{}; players = [ordered]@{} }
    if ($oldObj.matches) {
      foreach ($p in $oldObj.matches.PSObject.Properties) { $oc.matches[$p.Name] = @($p.Value) }
    }
    if ($oldObj.players) {
      foreach ($p in $oldObj.players.PSObject.Properties) { $oc.players[$p.Name] = @($p.Value) }
    }
    $oldCoreJson = $oc | ConvertTo-Json -Depth 10
  }
}

if ($coreJson -eq $oldCoreJson) {
  Log "  · 集锦缓存内容无变化，跳过写入"
} else {
  $newCache = [ordered]@{ updated = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss") }
  $newCache.searchedMatches = $core.searchedMatches
  $newCache.matches = $core.matches
  $newCache.players = $core.players
  $js = "/* 自动生成，请勿手动编辑 —— 由 update_youtube.ps1 更新于 $(Get-Date -Format 'yyyy-MM-dd HH:mm') 数据源：YouTube 搜索/RSS + B站 UP 空间 */`r`nwindow.DQD_VIDEOS_CACHE = $($newCache | ConvertTo-Json -Depth 10);`r`n"
  try {
    [System.IO.File]::WriteAllText($OutFile, $js, $UTF8)
    Log "  ✓ 已写入：$($core.matches.Count) 场比赛、$($core.players.Count) 名球员的集锦缓存（本次新增搜索 $($newMatchList.Count) 场）"
  } catch {
    Log "  ✗ 写入缓存失败：$($_.Exception.Message)"
  }
}

Log "YouTube 集锦更新完成 ✔"
