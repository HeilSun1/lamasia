# 把新闻标题里的西语/英语翻成中文，结果写进 assets/js/news-zh-cache.js
# 只翻标题；已是中文的条目跳过。接口：MyMemory（免 key，带 de 邮箱参数提高每日额度）
# 术语保护：译前把队名/球员名替换成 {{T1}} 占位符，译完还原成站内统一中文名
param(
  [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot),
  [int]$Limit = 400,
  [int]$DelayMs = 1200,
  [string]$Email = "heilsun1@users.noreply.github.com",
  [switch]$Rebuild
)

$ErrorActionPreference = "Stop"
$jsDir = Join-Path $RepoRoot "assets\js"
$outFile = Join-Path $jsDir "news-zh-cache.js"
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Has-Cjk([string]$s) { return [bool]([regex]::IsMatch($s, '[\u4e00-\u9fa5]')) }
function Unesc([string]$s) { return ($s -replace '\\\\', '\' -replace '\\"', '"') }

# ── 术语表：先长后短，保证 "Barça Atlètic" 先于 "Barça" 命中 ────────────
$terms = New-Object System.Collections.Generic.List[object]
function Add-Term([string]$es, [string]$zh) {
  if ($es -and $zh) { $script:terms.Add([pscustomobject]@{ es = $es; zh = $zh }) }
}
Add-Term 'Barça Atlètic' '预备队'
Add-Term 'Barca Atletic' '预备队'
Add-Term 'Barça B' '预备队'
Add-Term 'Juvenil A' '青年A队'
Add-Term 'Juvenil B' '青年B队'
Add-Term 'Cadete A' 'SUB16'
Add-Term 'Cadete B' 'SUB15'
Add-Term 'Infantil A' 'SUB14'
Add-Term 'Infantil B' 'SUB13'
Add-Term 'Infantil C' 'SUB12'
Add-Term 'Alevín' 'SUB11'
Add-Term 'Benjamin' 'SUB10'
Add-Term 'Prebenjamin' 'SUB8'
Add-Term 'La Masia' '拉玛西亚'
Add-Term 'Masia' '拉玛西亚'
Add-Term 'Barça' '巴萨'
Add-Term 'Barca' '巴萨'
Add-Term 'Champions League' '欧冠'
Add-Term 'Youth League' '青年欧冠'
Add-Term 'Liga' '西甲'
Add-Term 'Copa del Rey' '国王杯'

# 国家/地区名：机翻常把 Ucrania 译成「乌克兰队」、Israel 译成「以色列队」，
# 这些专名先占位再还原，保证和正文里的写法一致
Add-Term 'Estados Unidos' '美国'
Add-Term 'Costa de Marfil' '科特迪瓦'
Add-Term 'Emiratos Árabes Unidos' '阿联酋'
Add-Term 'Países Bajos' '荷兰'
Add-Term 'República Checa' '捷克'
Add-Term 'España' '西班牙'
Add-Term 'Ucrania' '乌克兰'
Add-Term 'Argentina' '阿根廷'
Add-Term 'Brasil' '巴西'
Add-Term 'Portugal' '葡萄牙'
Add-Term 'Francia' '法国'
Add-Term 'Alemania' '德国'
Add-Term 'Italia' '意大利'
Add-Term 'Inglaterra' '英格兰'
Add-Term 'Escocia' '苏格兰'
Add-Term 'Gales' '威尔士'
Add-Term 'Irlanda' '爱尔兰'
Add-Term 'Holanda' '荷兰'
Add-Term 'Bélgica' '比利时'
Add-Term 'Suiza' '瑞士'
Add-Term 'Austria' '奥地利'
Add-Term 'Dinamarca' '丹麦'
Add-Term 'Suecia' '瑞典'
Add-Term 'Noruega' '挪威'
Add-Term 'Polonia' '波兰'
Add-Term 'Croacia' '克罗地亚'
Add-Term 'Serbia' '塞尔维亚'
Add-Term 'Marruecos' '摩洛哥'
Add-Term 'Senegal' '塞内加尔'
Add-Term 'Guinea' '几内亚'
Add-Term 'Nigeria' '尼日利亚'
Add-Term 'Ghana' '加纳'
Add-Term 'Camerún' '喀麦隆'
Add-Term 'Argelia' '阿尔及利亚'
Add-Term 'Egipto' '埃及'
Add-Term 'México' '墨西哥'
Add-Term 'Colombia' '哥伦比亚'
Add-Term 'Uruguay' '乌拉圭'
Add-Term 'Chile' '智利'
Add-Term 'Perú' '秘鲁'
Add-Term 'Paraguay' '巴拉圭'
Add-Term 'Venezuela' '委内瑞拉'
Add-Term 'Japón' '日本'
Add-Term 'Corea' '韩国'
Add-Term 'Australia' '澳大利亚'
Add-Term 'Israel' '以色列'
Add-Term 'Qatar' '卡塔尔'
Add-Term 'Grecia' '希腊'
Add-Term 'Turquía' '土耳其'
Add-Term 'Rumanía' '罗马尼亚'
Add-Term 'Andorra' '安道尔'

# 球员名：懂球帝缓存里的 name(中文)+nameEn(西语/英语) 成对出现；再补 data.js 的手工表
foreach ($f in Get-ChildItem $jsDir -Filter "*.js") {
  if ($f.Name -notmatch 'cache\.js$') { continue }
  $t = [System.IO.File]::ReadAllText($f.FullName, $utf8)
  foreach ($m in [regex]::Matches($t, '"nameEn"\s*:\s*"([^"\\]+)"')) {
    $en = $m.Groups[1].Value.Trim()
    if ($en.Length -lt 4 -or -not $en.Contains(" ")) { continue }
    $m2 = [regex]::Match($t, '"name"\s*:\s*"([^"\\]*[\u4e00-\u9fa5][^"\\]*)"\s*,\s*"nameEn"\s*:\s*"' + [regex]::Escape($en) + '"')
    if ($m2.Success) { Add-Term $en $m2.Groups[1].Value.Trim() }
  }
}
$dataJs = Join-Path $jsDir "data.js"
if (Test-Path $dataJs) {
  $t = [System.IO.File]::ReadAllText($dataJs, $utf8)
  foreach ($m in [regex]::Matches($t, '"([^"\r\n]{3,40})"\s*:\s*"([\u4e00-\u9fa5·\-]{2,30})"')) {
    Add-Term $m.Groups[1].Value $m.Groups[2].Value
  }
}
$terms = @($terms | Sort-Object @{ Expression = { $_.es.Length }; Descending = $true })
"术语表：$($terms.Count) 条"

function Protect([string]$s) {
  $saved = @{}
  $i = 0
  foreach ($t in $terms) {
    $pat = '(?i)\b' + [regex]::Escape($t.es) + '\b'
    if ([regex]::IsMatch($s, $pat)) {
      $token = "{{T$i}}"
      $s = [regex]::Replace($s, $pat, $token)
      $saved[$token] = $t.zh
      $i++
    }
  }
  return @{ text = $s; saved = $saved }
}
function Restore([string]$s, $saved) {
  foreach ($k in $saved.Keys) {
    # 机翻偶尔会加空格或改动花括号，做宽松匹配
    $s = $s -replace ('\{\{\s*' + [regex]::Escape($k.Trim('{','}')) + '\s*\}\}'), $saved[$k]
  }
  # 兜底：万一占位符被吃掉，按残留的 T 编号顺序补不回来，只能保留原文
  return $s
}

# ── 已有映射 ────────────────────────────────────────────────────────────
$map = @{}
if (-not $Rebuild -and (Test-Path $outFile)) {
  $raw = [System.IO.File]::ReadAllText($outFile, $utf8)
  $m = [regex]::Match($raw, '(?s)window\.NEWS_ZH\s*=\s*(\{.*\});')
  if ($m.Success) {
    try {
      $obj = $m.Groups[1].Value | ConvertFrom-Json
      foreach ($p in $obj.PSObject.Properties) { $map[(Unesc $p.Name)] = [string]$p.Value }
    } catch { "WARN 旧缓存解析失败，重建" }
  }
}
if ($Rebuild) { $map = @{} }
"已有译文：$($map.Count) 条"

# ── 收集标题 ────────────────────────────────────────────────────────────
$titles = New-Object System.Collections.Generic.List[string]
foreach ($f in Get-ChildItem $jsDir -Filter "*.js") {
  if ($f.Name -notmatch 'news-cache\.js$') { continue }
  $t = [System.IO.File]::ReadAllText($f.FullName, $utf8)
  foreach ($mm in [regex]::Matches($t, '"title"\s*:\s*"((?:[^"\\]|\\.)*)"')) {
    $s = Unesc $mm.Groups[1].Value
    if ($s.Length -gt 3 -and -not (Has-Cjk $s) -and -not $titles.Contains($s)) { $titles.Add($s) }
  }
}
$todo = @($titles | Where-Object { -not $map.ContainsKey($_) })
if ($Limit -gt 0 -and $todo.Count -gt $Limit) { $todo = $todo[0..($Limit - 1)] }
"标题 $($titles.Count) 条，已译 $(@($titles | Where-Object { $map.ContainsKey($_) }).Count) 条，本次翻 $($todo.Count) 条"

# ── 翻译 ────────────────────────────────────────────────────────────────
$done = 0; $fail = 0; $raw2 = 0
foreach ($s in $todo) {
  $p = Protect $s
  $q = $p.text
  $url = "https://api.mymemory.translated.net/get?q=" + [uri]::EscapeDataString($q) + "&langpair=es|zh-CN&de=" + [uri]::EscapeDataString($Email)
  $ok = $false
  for ($attempt = 1; $attempt -le 2 -and -not $ok; $attempt++) {
    try {
      $r = Invoke-RestMethod -Uri $url -TimeoutSec 25
      if ($r.responseStatus -eq 200 -and $r.responseData.translatedText) {
        $zh = [string]$r.responseData.translatedText
        if ($zh -and $zh -ne $q) {
          $zh = Restore $zh $p.saved
          if ($zh -match '\{\{T\d+\}\}') { $raw2++; continue }
          $map[$s] = $zh
          $done++; $ok = $true
        }
      }
    } catch { Start-Sleep -Milliseconds 2500 }
  }
  if (-not $ok) { $fail++ }
  Start-Sleep -Milliseconds $DelayMs
  if (($done + $fail) % 20 -eq 0) { "  ... $($done + $fail)/$($todo.Count)（成功 $done 失败 $fail）" }
}

# ── 写回 ────────────────────────────────────────────────────────────────
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("/* 自动生成，请勿手改 —— 由 scripts/translate_news_titles.ps1 生成")
[void]$sb.AppendLine("   key = 原始标题，value = 中文标题；前端取不到就显示原文。 */")
[void]$sb.AppendLine("window.NEWS_ZH = {")
$keys = @($map.Keys | Where-Object { $map[$_] } | Sort-Object)
for ($i = 0; $i -lt $keys.Count; $i++) {
  $k = ($keys[$i] | ConvertTo-Json -Compress)
  $v = ($map[$keys[$i]] | ConvertTo-Json -Compress)
  $comma = if ($i -lt $keys.Count - 1) { "," } else { "" }
  [void]$sb.AppendLine("  $k`: $v$comma")
}
[void]$sb.AppendLine("};")
[System.IO.File]::WriteAllText($outFile, $sb.ToString(), $utf8)

"完成：新增 $done，失败 $fail，占位符残留 $raw2，总计 $($keys.Count) 条"
