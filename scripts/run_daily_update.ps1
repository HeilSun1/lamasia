# ═══════════════════════════════════════════════════════════════
#   拉玛西亚信息站 · 本机每日更新 + SSH 自动推送
#
#   1. 运行全部缓存更新脚本（本机真实 IP 抓 Sofascore 稳定，可靠）
#   2. git 提交 + SSH push 上线
#
#   GitHub 运行器上的 Sofascore 抓取常被限流返回空（防空缓存已保护，但数据可能过期），
#   本机是主数据源，运行器工作流 daily-update.yml 作为兜底。
#   由 Windows 计划任务每天调用（见 register_local_daily_task.ps1）。
#   日志：scripts/local-daily-update.log
# ═══════════════════════════════════════════════════════════════
$ErrorActionPreference = "Continue"   # 单个脚本失败不中断整体
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$LogFile = Join-Path $Root "scripts\local-daily-update.log"
function Log([string]$msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
  Write-Host $line
}

# SSH 非交互推送环境（本机 remote 已是 git@github.com）
$env:GIT_SSH_COMMAND = "ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new"

Log "======== 开始本机每日更新 ========"

# ── 0. git 同步到远端最新（暂存手动改动，避免被覆盖；rebase 冲突则跳过本次） ──
git config user.name  "lamasia-local-updater" 2>$null
git config user.email "lamasia-local-updater@local" 2>$null
git fetch origin 2>&1 | Out-Null
git stash -u 2>$null | Out-Null    # 暂存未提交的手动改动（如周报）
git rebase origin/main 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  git rebase --abort 2>$null
  git stash pop 2>$null
  Log "✗ 与远端同步冲突，本次跳过推送（下次再试）"
  exit 0
}

# ── 1. 运行全部更新脚本 ──
& .\scripts\update_barca_atletic.ps1
& .\scripts\update_barca_news.ps1
& .\scripts\update_u19_sofascore.ps1
& .\scripts\update_u19_news.ps1
& .\scripts\update_u18_sofascore.ps1
& .\scripts\update_u16_sofascore.ps1

# ── 2. 提交 + 推送缓存改动 ──
git add assets/js/dqd-barca-atletic-cache.js assets/js/dqd-barca-news-cache.js assets/js/dqd-u19-news-cache.js assets/js/dqd-u19-cache.js assets/js/dqd-u18-cache.js assets/js/dqd-u16-cache.js assets/img/players/dqd 2>$null
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
  Log "  缓存无变化，跳过提交"
} else {
  git commit -m "chore: local daily update $(Get-Date -Format 'yyyy-MM-dd HH:mm')" 2>&1 | Out-Null
  git push origin main 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) {
    # 远端被移动（如运行器提交）→ 重新拉取再推
    Start-Sleep -Seconds 5
    git pull --rebase --autostash origin main 2>&1 | Out-Null
    git push origin main 2>&1 | Out-Null
  }
  if ($LASTEXITCODE -eq 0) {
    Log "  ✓ 已提交并 SSH 推送上线"
  } else {
    Log "  ✗ 推送失败（网络/权限），请手动处理；改动已在本机 commit"
  }
}

# ── 3. 恢复手动改动 ──
git stash pop 2>$null

Log "======== 本机每日更新结束 ========"
