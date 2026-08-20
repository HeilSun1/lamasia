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
$PlayerChannelHandles = @("ArsenKveFCB")   # 球员"按场个人集锦"来源频道（可改/可加）
$MatchWithinDays      = 60                 # 只抓最近 N 天内新结束的比赛
$MaxMatchVideos       = 3                  # 每场保留条数
$MaxPlayerVideos      = 6                  # 每名球员累积上限
$PubAfterDays         = 15                 # 比赛结束后 N 天内的上传才算
$MaxRelDays           = 25                 # 搜索结果"发布于 N 天前"的上限（防误配旧场次）
$BTeamId              = "24343"            # Sofascore 巴萨竞技
$U19TeamId            = "90128"            # Sofascore 巴萨 U19

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
  $s = [regex]::Replace($s, '[\u0300-\u036f]', '')
  return $s
}

# 队名/人名 → 有区分度的 token（去掉常见前后缀/泛词）
$STOP = @("u19","u18","u16","u17","u15","fc","cf","cd","ue","ce","de","el","la","los","las","del","club","barca","barcelona","atletic","atletico","reserva","b","a","real","the","of","vs","deportivo","femenino","juvenil")
function TeamTokens([string]$name) {
  $n = Norm $name
  $tokens = @()
  foreach ($t in ($n -split '[^a-z0-9]+' | Where-Object { $_ -and $_.Length -ge 3 })) {
    if ($STOP -notcontains $t) { $tokens += $t }
  }
  if (-not $tokens.Count) { $tokens = @($n) }
  return @($tokens | Select-Object -Unique)
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
function Get-YtDom([string]$url, [string]$what) {
  try {
    $tmp = Join-Path $env:TEMP ("yt_" + [guid]::NewGuid().ToString("N") + ".html")
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $html = (& $Edge --headless=new --disable-gpu --no-first-run --disable-extensions --lang=en-US `
        "--user-data-dir=$Profile" --dump-dom $url 2>$null | Out-String)
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

Log "开始 YouTube 集锦更新（免 key：搜索抓取 + 频道 RSS）……"

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
$sfbDetails = Read-CacheJs (Join-Path $Root "assets\js\dqd-barca-atletic-sf-details-cache.js")
$u19Details = Read-CacheJs (Join-Path $Root "assets\js\dqd-u19-details-cache.js")

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
  @{ cache = $u19; prefix = "sofascore:" }
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

# ════════════ A. 整场集锦：搜索抓取，只搜「新出现的已完赛」 ════════════
$nowUtc = [datetime]::UtcNow
$matchSeen = @{}
foreach ($cfg in @(
  @{ cache = $sfb; prefix = "sfb:"; details = $sfbDetails; teamId = $BTeamId; tier = "b" },
  @{ cache = $u19; prefix = "sofascore:"; details = $u19Details; teamId = $U19TeamId; tier = "u19" }
)) {
  if (-not $cfg.cache -or -not $cfg.cache.matches) { continue }
  $ended = @($cfg.cache.matches | Where-Object { $_.status -eq 'Ended' })
  foreach ($m in $ended) {
    if ($ScrapeFail -ge 3) { Log "  · 搜索抓取已被风控，停止整场集锦搜索。"; break }
    $eid = [string]$m.id
    if (-not $eid -or $matchSeen.ContainsKey($eid)) { continue }
    $matchSeen[$eid] = $true
    $key = $cfg.prefix + $eid
    try { $mDate = [DateTimeOffset]::FromUnixTimeSeconds([int64]$m.start).UtcDateTime } catch { continue }
    if (($nowUtc - $mDate).TotalDays -gt $MatchWithinDays) { continue }
    if ($searched.ContainsKey($key) -and -not $reSearch.ContainsKey($key)) { continue }
    if (-not (Test-YtProbe)) { break }   # 不可达：整体跳过，不标记已搜
    $searched[$key] = $true
    $newMatchList += $m | Add-Member -PassThru -NotePropertyName _cfg -NotePropertyValue $cfg

    $homeTk = @(TeamTokens ([string]$m.home))
    $awayTk = @(TeamTokens ([string]$m.away))
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

    # 候选过滤：标题含双方 token + 相对发布 ≤ MaxRelDays + 时长 90–7200 秒
    $cand = @()
    foreach ($it in $items) {
      $titleN = Norm ([string]$it.title)
      if (-not (HasToken $titleN $homeTk)) { continue }
      if (-not (HasToken $titleN $awayTk)) { continue }
      $rel = Get-RelDays ([string]$it.publishedRel)
      if ($rel -ge 0 -and $rel -gt $MaxRelDays) { continue }
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

# ════════════ B. 球员按场个人集锦（频道 RSS，只搜本次新比赛阵容里的球员） ════════════
if ($newMatchList.Count) {
  # 解析频道 ID（仅在有新比赛时）
  $channelId = ""
  foreach ($handle in $PlayerChannelHandles) {
    $data = Get-YtData "https://www.youtube.com/$handle" "解析频道 $handle"
    if ($data) {
      try {
        $channelId = [string]$data.metadata.channelMetadataRenderer.externalId
      } catch {}
    }
    if (-not $channelId) { Log "✗ 未能从 @$handle 页面解析频道 ID，跳过球员集锦。" }
    else { break }
  }

  if ($channelId) {
    Log "  · 球员集锦频道 $($PlayerChannelHandles[0]) = $channelId；拉取 RSS……"
    $rss = @(Get-ChannelRss $channelId)
    Log "  · RSS 共 $($rss.Count) 条上传"
    if ($rss.Count) {
      foreach ($nm in $newMatchList) {
        $m = $nm
        $cfg = $nm._cfg
        $eid = [string]$m.id
        $det = $null
        if ($cfg.details) { $det = $cfg.details.$eid }
        if (-not $det -or -not $det.lineups) { continue }
        $side = if ([string]$m.homeId -eq $cfg.teamId) { "home" } else { "away" }
        $lu = $det.lineups.$side
        $players = @($lu.players)
        if (-not $players.Count) { continue }
        try { $mDate = [DateTimeOffset]::FromUnixTimeSeconds([int64]$m.start).UtcDateTime } catch { continue }
        $lo = $mDate.AddDays(-$PubAfterDays).Date
        $hi = $mDate.AddDays($PubAfterDays).Date
        Log "  · 球员集锦：$($m.home) vs $($m.away)（巴萨 $side 侧 $($players.Count) 人）"
        foreach ($luP in $players) {
          $pid = [string]$luP.player.id
          $pname = [string]$luP.player.name
          if (-not $pid -or -not $pname) { continue }
          $pkey = "sf:$($cfg.tier):$pid"
          if ($playerKeys.ContainsKey($pkey)) { continue }
          $playerKeys[$pkey] = $true
          $nameTk = @(TeamTokens $pname)
          # RSS 里标题含球员名 token 且发布于本场 ±PubAfterDays 天
          $new = @($rss | Where-Object {
            $_.published -and (HasToken (Norm $_.title) $nameTk) -and
            ([datetime]$_.published -ge $lo -and [datetime]$_.published -le $hi)
          } | Sort-Object { [datetime]$_.published } -Descending | Select-Object -First 2 |
            ForEach-Object { New-Video $_.videoId $_.title $_.channel $_.channelId $_.published "" })
          if ($new.Count) {
            $outPlayers[$pkey] = @(Merge-Videos ($outPlayers[$pkey] | Where-Object { $_ }) $new $MaxPlayerVideos)
            Log "    ✓ $pname +$($new.Count) 条"
          }
        }
      }
    }
  }
} else {
  Log "  · 无新完赛比赛（或 YouTube 不可达），本次不搜索球员集锦。"
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
  $js = "/* 自动生成，请勿手动编辑 —— 由 update_youtube.ps1 更新于 $(Get-Date -Format 'yyyy-MM-dd HH:mm') 数据源：YouTube 搜索/RSS */`r`nwindow.DQD_VIDEOS_CACHE = $($newCache | ConvertTo-Json -Depth 10);`r`n"
  try {
    [System.IO.File]::WriteAllText($OutFile, $js, $UTF8)
    Log "  ✓ 已写入：$($core.matches.Count) 场比赛、$($core.players.Count) 名球员的集锦缓存（本次新增搜索 $($newMatchList.Count) 场）"
  } catch {
    Log "  ✗ 写入缓存失败：$($_.Exception.Message)"
  }
}

Log "YouTube 集锦更新完成 ✔"
