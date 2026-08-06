# ═══════════════════════════════════════════════════════════════
#   注册 Windows 计划任务：每天 09:05 运行 update_barca_atletic.ps1
#   用于删除：
#     schtasks /Delete /TN "LaMasia_BarcaB_Update" /F
# ═══════════════════════════════════════════════════════════════
$ErrorActionPreference = "Stop"

$script    = Join-Path (Split-Path -Parent $PSScriptRoot) "scripts\update_barca_atletic.ps1"
$taskName  = "LaMasia_BarcaB_Update"

if (-not (Test-Path $script)) {
  Write-Host "找不到更新脚本：$script"
  exit 1
}

$action    = New-ScheduledTaskAction -Execute "powershell.exe" `
              -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger   = New-ScheduledTaskTrigger -Daily -At 09:05
$settings  = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)

try {
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
    -Description "每日从懂球帝更新巴萨B队(Barça Atlètic)名单/照片/赛程至本地缓存（拉玛西亚信息站）" -Force | Out-Null
  Write-Host "计划任务已注册：$taskName（每天 09:05，开机错过会补跑）"
} catch {
  Write-Host "注册失败：$_"
  exit 1
}

# 立即触发一次，验证能跑通
Start-ScheduledTask -TaskName $taskName
Write-Host "已触发一次立即运行（可在 任务计划程序 中查看状态，日志见 scripts/barca-atletic-update.log）"
