' 拉玛西亚信息站 · 隐形运行每日更新
' wscript.exe 是 GUI 宿主，本身不产生控制台；由它隐藏启动 PowerShell。
' 注意：脚本目录含中文，WScript.Shell.Run 把中文路径转 ANSI 会损坏，
'       所以先切工作目录（Unicode 设置不受影响），再用相对路径启动。
' 计划任务调用：wscript.exe "scripts\run_hidden.vbs"
Option Explicit
Dim fso, vbsDir, shell
Set fso = CreateObject("Scripting.FileSystemObject")
vbsDir = fso.GetParentFolderName(WScript.ScriptFullName)
Set shell = CreateObject("Wscript.Shell")
shell.CurrentDirectory = vbsDir
' 第二参数 0 = 隐藏窗口；第三参数 False = 不等待返回
shell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -File run_daily_update.ps1", 0, False
