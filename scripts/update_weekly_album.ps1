# ═══════════════════════════════════════════════════════════════
#   拉玛西亚信息站 · 飞翔的拉杆箱公众号合集缓存（自动检测最新期号）
#   ─────────────────────────────────────────────────────────────
#   Edge 无头渲染公众号合集页，解析最新一期期号（标题「【拉玛西亚新闻202】…」），
#   写入 assets/js/weekly-album-cache.js；前端据此与「上次已读期号」比较弹红点。
#   本机由 run_daily_update.ps1 调用，GitHub Actions 由 daily-update.yml 调用（云端兜底）。
#   抓取失败保留旧缓存（周报页回退 WEEKLY_ALBUM.updated 手动日期）。
#   日志：scripts/weekly-album-update.log
# ═══════════════════════════════════════════════════════════════
$ErrorActionPreference = "Continue"
$Root    = Split-Path -Parent $PSScriptRoot
$LogFile = Join-Path $Root "scripts\weekly-album-update.log"
$OutFile = Join-Path $Root "assets\js\weekly-album-cache.js"
$UTF8    = New-Object System.Text.UTF8Encoding($false)
$WechatAlbumUrl = "https://mp.weixin.qq.com/mp/appmsgalbum?__biz=Mzg3NDY1NzEzMw==&action=getalbum&album_id=1966224830458920962&scene=126#wechat_redirect"

function Log([string]$msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
  Write-Host $line
}

# ── 定位 Edge（优先配置文件，其次常见路径） ──
$EdgeCfg = Join-Path $PSScriptRoot "sofascore-edge-path.txt"
$Edge = ""
if (Test-Path $EdgeCfg) { $Edge = (Get-Content $EdgeCfg -Raw -ErrorAction SilentlyContinue).Trim() }
if (-not $Edge -or -not (Test-Path $Edge)) {
  foreach ($p in @(
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
  )) { if (Test-Path $p) { $Edge = $p; break } }
}
if (-not (Test-Path $Edge)) { Log "找不到 Edge，跳过合集检测"; exit 0 }
$Profile = Join-Path $env:TEMP "weekly-album-headless"

# Edge 无头渲染 → UTF-8 文本（临时切控制台编码，防中文乱码）
function Get-Dom([string]$url) {
  $edgeArgs = @("--headless=new", "--disable-gpu", "--no-first-run", "--disable-extensions", "--lang=en-US", "--user-data-dir=$Profile", "--virtual-time-budget=15000", "--timeout=25000", "--dump-dom", $url)
  $prevOEnc = [Console]::OutputEncoding
  try {
    [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
    $html = (& $Edge @edgeArgs 2>$null | Out-String)
  } finally {
    [Console]::OutputEncoding = $prevOEnc
  }
  return $html
}

Log "======== 开始合集检测 ========"
$html = Get-Dom $WechatAlbumUrl
if (-not $html) { Log "合集页渲染为空，保留旧缓存"; exit 0 }
$m = [regex]::Match($html, 'data-title="(【拉玛西亚新闻#?(\d+)[^"]*)"')
if (-not $m.Success) { Log "合集页未解析到期号（页面结构变化），保留旧缓存"; exit 0 }
$issue = $m.Groups[2].Value
$title = $m.Groups[1].Value
$escTitle = ([string]$title) -replace '"', '\"'
$js = "/* 自动生成，请勿手动编辑 —— 由 update_weekly_album.ps1 检测飞翔的拉杆箱合集最新一期 */`r`nwindow.WEEKLY_ALBUM_CACHE = { issue: `"$issue`", title: `"$escTitle`", checked: `"$(Get-Date -Format 'yyyy-MM-dd')`" };`r`n"

# 只按期号比较：checked 时间戳每次不同，若整体比较会产生无谓 diff
$needWrite = $true
if (Test-Path $OutFile) {
  $oldTxt = [System.IO.File]::ReadAllText($OutFile, $UTF8)
  if ($oldTxt -match 'issue:\s*"(\d+)"' -and $Matches[1] -eq $issue) { $needWrite = $false }
}
if ($needWrite) {
  try {
    [System.IO.File]::WriteAllText($OutFile, $js, $UTF8)
    Log "✓ 合集缓存已更新：最新【拉玛西亚新闻$issue】"
  } catch {
    Log "✗ 写入失败：$($_.Exception.Message)"
  }
} else {
  Log "· 合集缓存无变化（最新仍为新闻$issue）"
}
Log "======== 合集检测结束 ========"
