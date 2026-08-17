/* ═══════════════════════════════════════════════════════════════
   手动补照片读取（本地工具自动生效 + 上线文件覆盖）
   ─────────────────────────────────────────────────────────────
   键形如：barca:50924320 / u19:2048405 / alumni:messi
   读取优先级：
     1) window.MANUAL_PHOTOS[key]  —— 上线用的 manual-photos.js（部署时生效）
     2) localStorage["lamasia-manual-photos"] —— 本机 photo-tool.html 写入
        （file:// 下同源共享，工具里添加后刷新页面即自动补上；仅在本地生效）
   用法：页面在渲染脚本之前引入本文件，渲染处调用 ManualPhoto("u19:123")
        覆盖默认照片即可。无手动照片时返回 ""，走原有逻辑。
   ═══════════════════════════════════════════════════════════════ */
window.ManualPhoto = function (key) {
  try {
    var m = window.MANUAL_PHOTOS || {};
    if (m[key]) return m[key];
  } catch (e) {}
  // 工具当前使用的键
  try {
    var l = JSON.parse(localStorage.getItem("lamasia-manual-photos") || "{}");
    if (l[key]) return l[key];
  } catch (e) {}
  // 兼容旧版本工具（曾用键 lamasia-photo-tool-v1）写入的照片
  try {
    var o = JSON.parse(localStorage.getItem("lamasia-photo-tool-v1") || "{}");
    if (o[key]) return o[key];
  } catch (e) {}
  return "";
};
