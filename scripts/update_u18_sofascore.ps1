# 兼容占位：实现已合并到 update_sofascore.ps1（-Tier u18）
# 调用方无需改动；退出码直接透传，成功路径由子脚本显式 exit 0。
$ErrorActionPreference = "Continue"
& (Join-Path $PSScriptRoot "update_sofascore.ps1") -Tier u18
exit $LASTEXITCODE