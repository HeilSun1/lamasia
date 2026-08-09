# ═══════════════════════════════════════════════════════════════
#   注册 Windows 计划任务：每天 09:00 本机更新全部缓存 + SSH 推送
#   替换旧的 LaMasia_BarcaB_Update / LaMasia_U19_Update 两个任务。
#   删除任务：
#     schtasks /Delete /TN "LaMasia_Local_Daily_Update" /F
# ═══════════════════════════════════════════════════════════════
$ErrorActionPreference = "Stop"

$script   = Join-Path $PSScriptRoot "run_daily_update.ps1"
$taskName = "LaMasia_Local_Daily_Update"

if (-not (Test-Path $script)) { Write-Host "找不到脚本：$script"; exit 1 }

# 删除旧的单队任务（B队、U19），统一成一个
foreach ($old in @("LaMasia_BarcaB_Update", "LaMasia_U19_Update")) {
  schtasks /Delete /TN $old /F 2>$null | Out-Null
  Write-Host "已删除旧任务：$old"
}

$action    = New-ScheduledTaskAction -Execute "powershell.exe" `
              -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger   = New-ScheduledTaskTrigger -Daily -At 09:00
$settings  = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 2)

try {
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
    -Description "每日 09:00 本机更新拉玛西亚全部缓存（B队/U19/U18/U16/新闻）并 SSH 推送上线；运行器工作流作兜底" -Force | Out-Null
  Write-Host "计划任务已注册：$taskName（每天 09:00，开机错过会补跑）"
} catch {
  Write-Host "注册失败：$_"
  exit 1
}

# 立即触发一次，验证能跑通（会实际更新缓存并 push）
Start-ScheduledTask -TaskName $taskName
Write-Host "已触发一次立即运行（日志 scripts/local-daily-update.log，若正常会看到 '已提交并 SSH 推送上线'）"
