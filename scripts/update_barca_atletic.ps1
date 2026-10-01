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
#     7. 已完场比赛详情（阵容/进程/统计/交锋）：
#          GET /sport-data/soccer/biz/dqd/v1/match/lineup/{matchId}
#          GET /api/data/overview/match/{matchId}
#          GET /api/data/match/pre_analysis_v1/{matchId}
#        归一化成与 Sofascore 详情缓存相同的形状，生成
#          assets/js/dqd-barca-atletic-details-cache.js
#        供 Sofascore 断供时详情弹窗兜底（Sofascore 新鲜时仍优先）。
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

# 只保留 2026-06-01 起的赛程（start_play 为东八区字符串，直接字符串比较）
if ($schedule -and $schedule.data) {
  $schedule.data = @($schedule.data | Where-Object { [string]$_.start_play -ge "2026-06-01" })
  Log "  ✓ 赛程已过滤为 2026-06-01 起：$($schedule.data.Count) 场。"
}

# ── 2. 下载照片 + 拉取每位球员伤病 ───────────────────────────────
$downloaded    = 0
$playerCount   = 0
$injuriesMap   = @{}      # person_id -> 伤病摘要（合并进名单行用）
$injuriesList  = @()      # 当前伤缺球员列表（伤病名单面板用）
$bioMap        = @{}      # person_id -> 球员卡片生物信息（惯用脚/生日/国籍/身高/体重/合同）
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

        # ── 2b. 球员详情：取伤病 + 球员卡片生物信息（惯用脚/生日/国籍/身高/体重/合同）
        # 懂球帝 detail 接口一次返回以上全部，已每天请求，顺带提取不新增请求。
        if ($personId) {
          $detail = Get-Json "$BaseUrl/api/data/v1/detail/person/${personId}?app=dqd&lang=zh-cn" "伤病($($p.person_name))"
          if ($detail -and $detail.base_info) {
            $bi = $detail.base_info
            $bioMap[$personId] = @{
              foot     = [string]$bi.foot
              birth    = [string]$bi.date_of_birth
              nation   = [string]$bi.nationality
              height   = [string]$bi.height
              weight   = [string]$bi.weight
              contract = [string]$bi.contract
            }
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

# ── 2.5 抓取已完场比赛详情（懂球帝）→ 详情弹窗兜底 ────────────────
# 目的：Sofascore 断供时，B队比赛详情弹窗由本缓存兜底（Sofascore 新鲜时仍优先）。
# 形状刻意做成与 Sofascore 详情缓存一致，前端四个渲染函数可直接复用：
#   { lineups:{home,away}, incidents:{incidents:[]},
#     statistics:{statistics:[{groups:[{groupName,statisticsItems:[{name,home,away}]}]}]},
#     h2h:{matches:[]} }
# ⚠️ 懂球帝 overview.events 只有事件类型 + 比分，**没有进球者姓名**（该级别数据如此）。
# ⚠️ 懂球帝 start_play 是 UTC 墙钟（实测与 Sofascore 的 start 精确相等）；这里按 UTC
#    解析成 epoch，前端展示给用户时要 +8h 才是北京时间。
$DetailsFile = Join-Path $Root "assets\js\dqd-barca-atletic-details-cache.js"

# 2.5a 懂球帝 person_id → 英文名
# 集锦按姓名回连阵容时，中文名经 normName() 会变成空串，必须同时带上英文名
$RosterEn = @{}
if ($roster) {
  foreach ($grp in @($roster.data.list)) {
    foreach ($p in @($grp.data)) {
      if ($p.person_id) { $RosterEn[[string]$p.person_id] = [string]$p.person_en_name }
    }
  }
}
Log "  · 姓名映射表 $($RosterEn.Count) 人"

# "2026-09-26 17:00:00"（UTC 墙钟）→ epoch 秒
function ConvertTo-DqdEpoch([string]$s) {
  $dt = [datetime]::MinValue
  $ok = [datetime]::TryParseExact($s, 'yyyy-MM-dd HH:mm:ss',
        [System.Globalization.CultureInfo]::InvariantCulture,
        [System.Globalization.DateTimeStyles]::None, [ref]$dt)
  if (-not $ok) { return [int64]0 }
  return [int64](([datetimeoffset]::new($dt, [timespan]::Zero)).ToUnixTimeSeconds())
}

# 分钟键 "45+45" / "74" → 可排序整数
function Get-DqdMinuteKey([string]$k) {
  $n = 0
  [void][int]::TryParse(($k -replace '\+.*$', ''), [ref]$n)
  return $n
}

# persons.team_X → 归一化阵容一侧（两队都查不到时返回 $null，前端整段不渲染）
function ConvertTo-DqdLineupSide($side, $enMap) {
  if (-not $side) { return $null }
  $out = @()
  foreach ($grp in @(
      [pscustomobject]@{ list = @($side.lineups); isSub = $false },
      [pscustomobject]@{ list = @($side.sub);     isSub = $true  })) {
    foreach ($p in $grp.list) {
      if (-not $p) { continue }
      # ⚠️ 不能叫 $pid —— 那是 PS 的只读自动变量（当前进程号），赋值会抛 VariableNotWritable
      $personId = [string]$p.person_id
      $out += [ordered]@{
        substitute   = [bool]$grp.isSub
        jerseyNumber = [string]$p.shirtnumber
        position     = [string]$p.position
        player = [ordered]@{
          id      = ""                       # Sofascore id：留给前端桥接填，不在这里重写模糊匹配
          dqdId   = $personId
          name    = [string]$p.person
          nameEn  = $(if ($enMap.ContainsKey($personId)) { [string]$enMap[$personId] } else { "" })
          photo   = [string]$p.logo
          nation  = [string]$p.nationality_name
          height  = [string]$p.height
          captain = [bool]$p.captain
          isMvp   = [bool]$p.is_mvp
        }
      }
    }
  }
  if ($out.Count -eq 0) { return $null }
  return [ordered]@{
    teamId    = [string]$side.team_id
    teamName  = [string]$side.team_name
    formation = [string]$side.formation
    coach     = [string]$side.team_coach
    players   = $out
  }
}

# overview.events → 归一化 incidents（只留 G/PG/YC/RC；丢弃 HT/FT）
# team_A 在懂球帝赛程里恒为主队，故 teamAEvents 即主队事件
function ConvertTo-DqdIncidents($events) {
  $out = @()
  if ($events) {
    $keys = @($events.PSObject.Properties.Name) | Sort-Object { Get-DqdMinuteKey $_ }
    foreach ($k in $keys) {
      $node = $events.$k
      if (-not $node) { continue }
      # ⚠️ 事件对象里**没有** minute 字段：分钟就是 events 的键，形如 "74" 或 "45+45"
      $kparts = $k -split '\+'
      $minute = $kparts[0]
      $added  = $(if ($kparts.Count -gt 1) { $kparts[1] } else { "" })
      foreach ($pair in @(
          [pscustomobject]@{ ev = @($node.teamAEvents); isHome = $true  },
          [pscustomobject]@{ ev = @($node.teamBEvents); isHome = $false })) {
        foreach ($e in $pair.ev) {
          if (-not $e) { continue }
          $code = [string]$e.code
          if ($code -ne "G" -and $code -ne "PG" -and $code -ne "YC" -and $code -ne "RC") { continue }
          $hs = $null; $as = $null
          if ([string]$e.score -match '^(\d+)-(\d+)$') { $hs = [int]$Matches[1]; $as = [int]$Matches[2] }
          $isCard = ($code -eq "YC" -or $code -eq "RC")
          $out += [ordered]@{
            incidentType  = $(if ($isCard) { "card" } else { $(if ($code -eq "PG") { "penalty" } else { "goal" }) })
            incidentClass = $(if ($code -eq "RC") { "red" } elseif ($code -eq "YC") { "yellow" } elseif ($code -eq "PG") { "penalty" } else { "" })
            reason        = ""
            player        = [ordered]@{ id = ""; name = "" }   # 懂球帝不给进球者
            homeScore     = $(if ($isCard) { $null } else { $hs })
            awayScore     = $(if ($isCard) { $null } else { $as })
            time          = $minute
            addedTime     = $added
            isHome        = [bool]$pair.isHome
          }
        }
      }
    }
  }
  return [ordered]@{ incidents = $out }
}

# statistics.list → Sofascore 形状（8 项平铺一个组）。取值必须用 value，per 是占比
function ConvertTo-DqdStatistics($stat) {
  $items = @()
  if ($stat -and $stat.list) {
    foreach ($s in @($stat.list)) {
      if (-not $s) { continue }
      $items += [ordered]@{
        name = [string]$s.type
        home = [string]$s.team_A.value
        away = [string]$s.team_B.value
      }
    }
  }
  if ($items.Count -eq 0) { return $null }
  return [ordered]@{ statistics = @([ordered]@{
    groups = @([ordered]@{ groupName = "全场数据"; statisticsItems = $items })
  }) }
}

# pre_analysis.battle_history → h2h.matches（只出列表，不出 teamDuel：中文队名对不上主客）
function ConvertTo-DqdH2h($bh) {
  $rows = @()
  if ($bh -and $bh.list) {
    foreach ($r in @($bh.list)) {
      if (-not $r) { continue }
      $hs = 0; $as = 0
      if ([string]$r.score -match '^(\d+)-(\d+)$') { $hs = [int]$Matches[1]; $as = [int]$Matches[2] }
      $rows += [ordered]@{
        homeTeam       = [ordered]@{ name = [string]$r.team_A_name }
        awayTeam       = [ordered]@{ name = [string]$r.team_B_name }
        homeScore      = [ordered]@{ current = $hs }
        awayScore      = [ordered]@{ current = $as }
        tournament     = [ordered]@{ name = [string]$r.competition }
        startTimestamp = ConvertTo-DqdEpoch ([string]$r.start_time)
      }
    }
  }
  if ($rows.Count -eq 0) { return $null }
  return [ordered]@{ matches = $rows }
}

# 2.5b 读旧缓存（整体解析后合并；用 .NET 读，避免 PS 5.1 的 Get-Content 编码坑）
$dqdDetails = [ordered]@{}
if (Test-Path $DetailsFile) {
  try {
    $raw = [System.IO.File]::ReadAllText($DetailsFile, [System.Text.Encoding]::UTF8)
    $mm = [regex]::Match($raw, '(?s)window\.DQD_BARCA_ATLETIC_DETAILS_CACHE\s*=\s*(\{.*\})\s*;')
    if ($mm.Success) {
      $oldObj = $mm.Groups[1].Value | ConvertFrom-Json
      foreach ($prop in $oldObj.PSObject.Properties) {
        if ($prop.Name -eq "updated") { continue }
        $dqdDetails[$prop.Name] = $prop.Value
      }
    }
  } catch {
    Log "  ✗ 旧详情缓存解析失败（将重建）：$($_.Exception.Message)"
  }
}
Log "  · 已有详情缓存 $($dqdDetails.Count) 场"

# 2.5c 候选 = 已完场 + 未缓存 + 最近 8 场（赛程已在第 1 节过滤为 2026-06-01 起）
$cand = @()
if ($schedule -and $schedule.data) {
  $cand = @($schedule.data |
    Where-Object { [string]$_.status -eq "Played" -and -not $dqdDetails.Contains([string]$_.match_id) } |
    Sort-Object { [string]$_.start_play } -Descending |
    Select-Object -First 8)
}
Log "  · 需新抓详情 $($cand.Count) 场"

# 2.5d 逐场抓三个接口并归一化
$dqdNew = 0
if ($cand.Count -gt 0) {
  $i = 0
  foreach ($m in $cand) {
    $i++
    $mid = [string]$m.match_id
    Log "  · 详情 $i/$($cand.Count) 场 #$mid $($m.team_A_name) vs $($m.team_B_name)"
    # ⚠️ 变量必须写成 ${mid}：PS 的变量名允许含 "?"，$mid?app 会被当成变量名 → URL 塌成 404
    $lu = Get-Json "$BaseUrl/sport-data/soccer/biz/dqd/v1/match/lineup/${mid}?app=dqd&lang=zh-cn" "阵容 $mid"
    $ov = Get-Json "$BaseUrl/api/data/overview/match/${mid}?app=dqd&lang=zh-cn"                  "进程 $mid"
    $pa = Get-Json "$BaseUrl/api/data/match/pre_analysis_v1/${mid}?app=dqd&lang=zh-cn"           "交锋 $mid"
    if ($i -lt $cand.Count) { Start-Sleep -Seconds 1 }
    if (-not $lu -and -not $ov) { Log "  ✗ #$mid 三个接口全失败，跳过（下轮重试）"; continue }

    $persons = $(if ($lu) { $lu.persons } else { $null })
    $lineups = $null
    if ($persons) {
      $sideA = ConvertTo-DqdLineupSide $persons.team_A $RosterEn
      $sideB = ConvertTo-DqdLineupSide $persons.team_B $RosterEn
      if ($sideA -or $sideB) { $lineups = [ordered]@{ home = $sideA; away = $sideB } }
    }
    $dqdDetails[$mid] = [ordered]@{
      meta = [ordered]@{
        home = [string]$m.team_A_name; away = [string]$m.team_B_name
        homeId = [string]$m.team_A_id; awayId = [string]$m.team_B_id
        start = ConvertTo-DqdEpoch ([string]$m.start_play)
        comp = [string]$m.competition_name; round = [string]$m.round_name
        hs = [string]$m.fs_A; as = [string]$m.fs_B
      }
      lineups    = $lineups
      incidents  = $(if ($ov) { ConvertTo-DqdIncidents $ov.events } else { $null })
      statistics = $(if ($ov) { ConvertTo-DqdStatistics $ov.statistics } else { $null })
      h2h        = $(if ($pa) { ConvertTo-DqdH2h $pa.battle_history } else { $null })
    }
    $dqdNew++
  }
}

# 2.5e 写回（防空覆盖：本轮一场新数据都没抓到就不动旧文件）
if ($dqdNew -gt 0) {
  $all = [ordered]@{ updated = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss") }
  foreach ($k in $dqdDetails.Keys) { $all[$k] = $dqdDetails[$k] }
  try {
    $dqdJson = $all | ConvertTo-Json -Depth 12
    $dqdJs = "/* 自动生成，请勿手动编辑 —— 由 update_barca_atletic.ps1 每日更新于 $(Get-Date -Format 'yyyy-MM-dd HH:mm') 数据源：懂球帝 */`r`n" +
      "window.DQD_BARCA_ATLETIC_DETAILS_CACHE = $dqdJson;`r`n"
    [System.IO.File]::WriteAllText($DetailsFile, $dqdJs, (New-Object System.Text.UTF8Encoding($false)))
    Log "  ✓ 详情缓存已写入（共 $($all.Count - 1) 场，本轮新增 $dqdNew 场）"
  } catch {
    Log "  ✗ 写详情缓存失败：$($_.Exception.Message)"
  }
} else {
  Log "  · 无新完赛详情，详情缓存保持不变（已有 $($dqdDetails.Count) 场）"
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
  bio           = $bioMap
}
# 防空覆盖：懂球帝抓取失败时名单为空，用空数据覆盖旧缓存会导致页面空白
if (@($roster).Count -eq 0) {
  Log "  ✗ 本次未抓到球员名单（懂球帝变动/被拦），保留旧缓存不覆盖。"
  exit 0
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
