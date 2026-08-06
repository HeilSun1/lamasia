# ═══════════════════════════════════════════════════════════════
#   拉玛西亚信息站 · 巴萨B队（Barça Atlètic）每日更新脚本
#
#   每天从懂球帝拉取巴塞罗那竞技的数据，生成本地缓存供页面离线兜底：
#     1. 球员名单 + 照片   GET /sport-data/soccer/biz/dqd/v1/team/member_v2/{teamId}
#     2. 每位球员伤病       GET /api/data/v1/detail/person/{personId}
#     3. 赛程              GET /sport-data/soccer/biz/dqd/team/schedule/{teamId}
#     4. 球队信息          GET /api/data/v1/detail/team/{teamId}
#     5. 球员照片下载到     assets/img/players/dqd/
#     6. 生成缓存          assets/js/dqd-barca-atletic-cache.js
#
#   由 Windows 计划任务每天调用：
#     powershell -NoProfile -ExecutionPolicy Bypass -File "...\update_barca_atletic.ps1"
#   运行日志：scripts/barca-atletic-update.log
#
#   ⚠️ 数据来自懂球帝非官方接口，仅供个人学习使用；接口随时可能变动。
# ═══════════════════════════════════════════════════════════════
$ErrorActionPreference = "Stop"

$TeamId     = "50001839"                        # 巴塞罗那竞技（懂球帝 team_id）
$BaseUrl    = "https://pc.dongqiudi.com"
$Referer    = "https://pc.dongqiudi.com/team/1839"
$UserAgent  = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

# 项目根目录 = 本脚本上一级
$Root       = Split-Path -Parent $PSScriptRoot
$ImgDir     = Join-Path $Root "assets\img\players\dqd"
$CacheFile  = Join-Path $Root "assets\js\dqd-barca-atletic-cache.js"
$LogFile    = Join-Path $Root "scripts\barca-atletic-update.log"

$Headers    = @{ "User-Agent" = $UserAgent; "Referer" = $Referer; "Accept" = "application/json" }

function Log([string]$msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
  Write-Host $line
}

# 单次请求封装：失败不中断，返回 $null 并记日志
function Get-Json([string]$uri, [string]$what) {
  try {
    return Invoke-RestMethod -Uri $uri -Headers $Headers -TimeoutSec 30
  } catch {
    Log "  ✗ $what 获取失败：$($_.Exception.Message)"
    return $null
  }
}

# 从 CDN URL 里取扩展名（默认 .jpg）
function Get-Ext([string]$url) {
  try {
    $ext = [System.IO.Path]::GetExtension([System.Uri]::new($url).AbsolutePath)
    if ([string]::IsNullOrEmpty($ext)) { return ".jpg" }
    if ($ext -notmatch '^\.(jpg|jpeg|png|webp)$') { return ".jpg" }
    return $ext.ToLower()
  } catch { return ".jpg" }
}

Log "开始每日更新（团队 $TeamId）……"

# ── 1. 拉取名单 / 赛程 / 球队信息 ───────────────────────────────
$roster   = Get-Json "$BaseUrl/sport-data/soccer/biz/dqd/v1/team/member_v2/${TeamId}?app=dqd&lang=zh-cn"  "球员名单"
$schedule = Get-Json "$BaseUrl/sport-data/soccer/biz/dqd/team/schedule/${TeamId}?app=dqd&lang=zh-cn"      "赛程"
$teamInfo = Get-Json "$BaseUrl/api/data/v1/detail/team/${TeamId}?app=dqd&lang=zh-cn"                       "球队信息"

if (-not $roster -and -not $schedule -and -not $teamInfo) {
  Log "✗ 全部数据源均失败，本次更新中止（保留旧缓存）。"
  exit 1
}

# ── 2. 下载照片 + 拉取每位球员伤病 ───────────────────────────────
$downloaded    = 0
$playerCount   = 0
$injuriesMap   = @{}      # person_id -> 伤病摘要（合并进名单行用）
$injuriesList  = @()      # 当前伤缺球员列表（伤病名单面板用）
$today         = Get-Date -Format "yyyy.MM.dd"

if ($roster) {
  try {
    New-Item -ItemType Directory -Path $ImgDir -Force | Out-Null
    foreach ($group in @($roster.data.list)) {
      foreach ($p in @($group.data)) {
        $playerCount++
        $personId = [string]$p.person_id

        # ── 2a. 照片下载（已存在则跳过），并把 person_logo 改写为本地路径
        $url = [string]$p.person_logo
        if (-not [string]::IsNullOrEmpty($url)) {
          $ext  = Get-Ext $url
          $file = Join-Path $ImgDir "$personId$ext"
          if (-not (Test-Path $file)) {
            try {
              Invoke-WebRequest -Uri $url -OutFile $file -Headers $Headers -TimeoutSec 30 -UseBasicParsing
              $downloaded++
            } catch {
              Log "  ✗ 照片下载失败 $($p.person_name)：$($_.Exception.Message)"
            }
          }
          $p | Add-Member -NotePropertyName person_logo_url -NotePropertyValue $url -Force
          $p.person_logo = "assets/img/players/dqd/$personId$ext"
        }

        # ── 2b. 伤病：拉取球员详情，取最近一条伤病记录
        if ($personId) {
          $detail = Get-Json "$BaseUrl/api/data/v1/detail/person/${personId}?app=dqd&lang=zh-cn" "伤病($($p.person_name))"
          if ($detail) {
            $hist = @()
            if ($detail.injury_records -and $detail.injury_records.history) {
              $hist = @($detail.injury_records.history)
            }
            if ($hist.Count -gt 0) {
              $rec      = $hist[0]                       # 最近一次伤病
              $until    = [string]$rec.date_until
              $isOut    = ([string]::IsNullOrWhiteSpace($until)) -or ($until -ge $today)
              $summary  = @{
                injury       = [string]$rec.injury
                date_from    = [string]$rec.date_from
                date_until   = $until
                days         = [string]$rec.days
                games_missed = [string]$rec.games_missed
                status       = if ($isOut) { "out" } else { "ok" }
              }
              $injuriesMap[$personId] = $summary
              if ($isOut) {
                $injuriesList += [pscustomobject]@{
                  person_id = $personId
                  name      = [string]$p.person_name
                  en        = [string]$p.person_en_name
                  photo     = [string]$p.person_logo
                  injury    = [string]$rec.injury
                  date_from = [string]$rec.date_from
                  date_until= $until
                  days      = [string]$rec.days
                  games_missed = [string]$rec.games_missed
                }
              }
            }
          }
          Start-Sleep -Milliseconds 250   # 放慢节奏，避免触发风控
        }
      }
    }
    Log "  ✓ 名单 $playerCount 人；新增照片 $downloaded 张；当前伤缺 $($injuriesList.Count) 人。"
  } catch {
    Log "  ✗ 名单处理/照片/伤病出错：$($_.Exception.Message)"
  }
}

# ── 3. 生成缓存 JS ───────────────────────────────────────────────
$cache = @{
  updated       = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  source        = "dongqiudi"
  teamId        = $TeamId
  teamInfo      = $teamInfo
  roster        = $roster
  schedule      = $schedule
  injuries_map  = $injuriesMap
  injuries_list = $injuriesList
}
try {
  $json = $cache | ConvertTo-Json -Depth 20
  $js   = "/* 自动生成，请勿手动编辑 —— 由 update_barca_atletic.ps1 每日更新于 $(Get-Date -Format 'yyyy-MM-dd HH:mm') 数据源：懂球帝 */`r`nwindow.DQD_BARCA_ATLETIC = $json;`r`n"
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($CacheFile, $js, $utf8)
  Log "  ✓ 缓存已写入 $CacheFile"
} catch {
  Log "  ✗ 写入缓存失败：$($_.Exception.Message)"
  exit 1
}

Log "每日更新完成 ✔"
