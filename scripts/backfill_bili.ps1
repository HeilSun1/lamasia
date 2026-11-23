<#
  backfill_bili.ps1 —— B站 UP 主投稿历史回填（一次性，不进每日更新）

  为什么需要：update_youtube.ps1 只读 UP 空间首页的 DOM 窗口（最近约 40 条），
  更早的投稿抓不到。这里走 arc/search 分页接口按时间往回翻，翻到 -Until 为止。

  风控：该接口连续快速请求会返回 -799。实测 1 秒内连发 6 次即触发。
        默认每页间隔 3 秒、每个失败重试 1 次（等 30 秒），失败则停止该 UID。

  默认只读：不加 -Write 时不改任何缓存文件，只把结果写到 work/ 并打印统计。
#>
param(
  [string]$Uid   = "175618531",
  [string]$Until = "2026-06-01",
  [int]$DelayMs  = 3000,
  [int]$MaxPages = 40,
  [int]$GuardMinutes = 30,
  [switch]$Write
)

$ErrorActionPreference = "Stop"
$Root      = Split-Path -Parent $PSScriptRoot
$WorkDir   = Join-Path $Root "work"
if (-not (Test-Path $WorkDir)) { New-Item -ItemType Directory -Path $WorkDir | Out-Null }

$untilDate = [datetime]::ParseExact($Until, "yyyy-MM-dd", $null)
# ── 启动保护：避开每日 09:00 / 21:00 的定时更新 ──────────────────
$now = Get-Date
foreach ($h in 9, 21) {
  $slot = $now.Date.AddHours($h)
  $diff = [math]::Abs(($now - $slot).TotalMinutes)
  if ($diff -lt $GuardMinutes) {
    Write-Host ("拒绝执行：距每日 {0:00}:00 的定时更新只剩 {1:N0} 分钟（保护窗 {2} 分钟）。" -f $h, $diff, $GuardMinutes)
    Write-Host "回填是一次性的，换个时间再跑，别撞上自动更新。"
    exit 2
  }
}

function Get-Page([string]$mid, [int]$pn) {
  $url = "https://api.bilibili.com/x/space/arc/search?mid=$mid&ps=30&pn=$pn&order=pubdate"
  for ($try = 1; $try -le 2; $try++) {
    $raw = & curl.exe -s -m 25 `
      -H "Referer: https://space.bilibili.com/$mid" `
      -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0" `
      -H "Cookie: buvid3=lamasia" `
      $url 2>$null | Out-String
    try { $o = $raw | ConvertFrom-Json } catch { $o = $null }
    if ($o -and $o.code -eq 0) { return $o }
    $code = if ($o) { $o.code } else { "非JSON" }
    Write-Host ("    第 {0} 页 第 {1} 次失败（code={2}），60 秒后重试" -f $pn, $try, $code)
    if ($code -eq -799 -or $code -eq -352) { Write-Host "    → 被限流，本轮直接停止（不再重试，避免连累每日更新）"; return $null }
    if ($try -lt 2) { Start-Sleep -Seconds 60 }
  }
  return $null
}

$items = New-Object System.Collections.ArrayList
$total = 0
$stopped = "翻完"
for ($pn = 1; $pn -le $MaxPages; $pn++) {
  $o = Get-Page $Uid $pn
  if (-not $o) { $stopped = "第 $pn 页失败，提前结束"; break }
  $total = [int]$o.data.page.count
  $vlist = @($o.data.list.vlist)
  if (-not $vlist.Count) { $stopped = "第 $pn 页为空，结束"; break }

  $oldest = $null
  foreach ($v in $vlist) {
    $d = [DateTimeOffset]::FromUnixTimeSeconds([int64]$v.created).ToLocalTime().DateTime
    if ($null -eq $oldest -or $d -lt $oldest) { $oldest = $d }
    [void]$items.Add([pscustomobject]@{
      bvid     = [string]$v.bvid
      title    = [string]$v.title
      created  = $d.ToString("yyyy-MM-dd HH:mm")
      author   = [string]$v.author
      duration = [string]$v.length
    })
  }
  Write-Host ("    第 {0,2} 页：{1} 条，最早 {2:yyyy-MM-dd}" -f $pn, $vlist.Count, $oldest)
  if ($oldest -lt $untilDate) { $stopped = "已翻过 $Until"; break }
  Start-Sleep -Milliseconds $DelayMs
}

$after = @($items | Where-Object { ([datetime]$_.created) -ge $untilDate })
Write-Host ""
Write-Host ("UP {0}：接口共 {1} 条投稿，本次翻到 {2} 条（{3}）" -f $Uid, $total, $items.Count, $stopped)
if ($items.Count) {
  Write-Host ("  日期范围：{0} ~ {1}" -f ($items | Sort-Object created | Select-Object -First 1).created,
                                          ($items | Sort-Object created | Select-Object -Last 1).created)
  Write-Host ("  {0} 之后：{1} 条" -f $Until, $after.Count)
  Write-Host "  样例："
  $after | Sort-Object created -Descending | Select-Object -First 5 | ForEach-Object {
    Write-Host ("    {0}  《{1}》" -f $_.created, $_.title)
  }
}

$out = Join-Path $WorkDir ("bili-backfill-{0}.json" -f $Uid)
$payload = [ordered]@{ uid = $Uid; until = $Until; total = $total; fetched = $items.Count; stopped = $stopped; items = @($items) }
($payload | ConvertTo-Json -Depth 6) | Set-Content -Path $out -Encoding UTF8
Write-Host ("  明细已写入 {0}" -f $out)
if (-not $Write) { Write-Host "  （只读模式：未改动任何缓存）" }
