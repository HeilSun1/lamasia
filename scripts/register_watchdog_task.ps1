# ═══════════════════════════════════════════════════════════════
#   注册 Windows 计划任务：看门狗（每 4 小时检查一次站点是否在正常更新）
#   删除任务：
#     schtasks /Delete /TN "LaMasia_Local_Watchdog" /F
#
#   为什么单独一个任务：主脚本自己抓不到「进程被杀 / 机器休眠导致没跑完」，
#   那种情况下连一行失败日志都不会留下。看门狗是独立进程、独立日志，
#   且刻意不共用主脚本的库（否则主脚本改坏库时它一起失灵）。
#
#   时间刻意错开：主任务 09/15/21，Actions 兜底北京 00:23，
#   看门狗从 08:37 起每 4 小时（08:37 / 12:37 / 16:37 / 20:37 / 00:37 …）。
# ═══════════════════════════════════════════════════════════════
$ErrorActionPreference = "Stop"

$script   = Join-Path $PSScriptRoot "run_daily_watchdog.ps1"
$taskName = "LaMasia_Local_Watchdog"

if (-not (Test-Path $script)) { Write-Host "找不到脚本：$script"; exit 1 }

$action = New-ScheduledTaskAction -Execute "powershell.exe" `
            -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""

# 只给 -RepetitionInterval、不给 -RepetitionDuration = 无限重复。
# （别用 [TimeSpan]::MaxValue 充当时长：它生成的 P99999999DT23H59M59S
#   超出任务计划 XML 的上限，注册会直接失败）
$trigger = New-ScheduledTaskTrigger -Once -At 08:37 `
             -RepetitionInterval (New-TimeSpan -Hours 4)

$settings = New-ScheduledTaskSettingsSet `
              -StartWhenAvailable `
              -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
              -MultipleInstances IgnoreNew     # 别和上一轮看门狗叠在一起

try {
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
    -Description "每 4 小时检查拉玛西亚站点是否在正常更新；发现停摆/进程被中断/SSH 失效等会弹通知，必要时补跑一次每日更新任务" -Force | Out-Null
  Write-Host "计划任务已注册：$taskName（08:37 起每 4 小时，开机错过会补跑）"
} catch {
  Write-Host "注册失败：$_"
  exit 1
}

# 顺带确认主任务存在，并把「多实例」策略也设成 IgnoreNew
# （防看门狗触发的补跑与定时轮次重叠）
$mainTask = "LaMasia_Local_Daily_Update"
$mt = Get-ScheduledTask -TaskName $mainTask -ErrorAction SilentlyContinue
if ($mt) {
  if ($mt.Settings.MultipleInstances -ne 'IgnoreNew') {
    try {
      $mt.Settings.MultipleInstances = 'IgnoreNew'
      Set-ScheduledTask -TaskName $mainTask -Settings $mt.Settings | Out-Null
      Write-Host "已把 $mainTask 的多实例策略设为 IgnoreNew"
    } catch { Write-Host "设置 $mainTask 多实例策略失败：$_" }
  }
  if ($mt.Principal.LogonType -ne 'Interactive') {
    Write-Host "⚠ 注意：$mainTask 的登录类型是 $($mt.Principal.LogonType)，不是 Interactive。" -ForegroundColor Yellow
    Write-Host "  非交互会话下 Windows 通知弹窗不会显示，告警会退化成只写日志。" -ForegroundColor Yellow
  }
} else {
  Write-Host "⚠ 没找到主任务 $mainTask，请先运行 register_local_daily_task.ps1" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "自检看门狗（只检查不弹窗）："
Write-Host "  powershell -NoProfile -ExecutionPolicy Bypass -File `"$script`" -SelfTest"
Write-Host "日志：scripts/watchdog.log"
