// =============================================================================
// Windows Remote Control — Cloudflare Worker
// =============================================================================
// Browser ←→ Worker (REST + WebSocket) ←→ Durable Object ←→ Windows Agent
//
// Tokens are long-lived (no expiry).  Login tokens are for browser sessions;
// device tokens are for agents — create them in the web UI, copy to config.json.
// =============================================================================

// ── Embedded Web Frontend ────────────────────────────────────────────────────

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover">
<title>远程控制中心 — 切盘工具</title>
<style>
:root { color-scheme: dark; }
* { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
html,body { margin:0; padding:0; min-height:100vh; min-height:100dvh; overflow-x:hidden;
  font:14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI Variable Display','Segoe UI','Microsoft YaHei','PingFang SC','Noto Sans SC',sans-serif;
  background:#0d1117; color:#e6edf3;
  -webkit-text-size-adjust:100%; text-size-adjust:100%; }
body {
  background:
    radial-gradient(circle at top left, rgba(88,166,255,.15), transparent 35%),
    radial-gradient(circle at bottom right, rgba(35,134,54,.08), transparent 40%),
    #0d1117;
}

/* ============================================================
   顶栏 (GitHub style)
   ============================================================ */
.topbar {
  position:sticky; top:0; z-index:100;
  background:rgba(22,27,34,.72);
  backdrop-filter:blur(18px) saturate(180%);
  -webkit-backdrop-filter:blur(18px) saturate(180%);
  border-bottom:1px solid rgba(255,255,255,.08);
  box-shadow:0 8px 32px rgba(0,0,0,.25);
  padding:12px 20px;
  padding-left:max(20px,env(safe-area-inset-left));
  padding-right:max(20px,env(safe-area-inset-right));
  padding-top:max(12px,env(safe-area-inset-top));
  display:none; align-items:center; gap:14px; flex-wrap:wrap;
}
.topbar.scrolled { box-shadow:0 12px 40px rgba(0,0,0,.42); }
.topbar h1 {
  margin:0; font-size:16px; font-weight:600; color:#e6edf3;
  display:flex; align-items:center; gap:8px; letter-spacing:-.01em;
  flex:0 1 auto; min-width:0;
}
.topbar h1 svg { width:18px; height:18px; color:#58a6ff; flex-shrink:0; }
.topbar .spacer { flex:1 1 auto; min-width:0; }

/* 用户徽章 */
.user-chip {
  display:inline-flex; align-items:center; gap:8px;
  padding:4px 10px 4px 8px; border-radius:999px;
  background:rgba(33,38,45,.65);
  backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
  border:1px solid rgba(255,255,255,.08);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.05);
  font-size:12px; color:#c9d1d9; max-width:240px; flex-shrink:0;
}
.user-chip .avatar {
  width:20px; height:20px; border-radius:50%;
  background:#30363d; color:#c9d1d9; font-size:10px; font-weight:600;
  display:flex; align-items:center; justify-content:center; flex-shrink:0;
}
.user-chip .username {
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  max-width:120px;
}
.user-chip button {
  background:none; border:none; color:#8b949e; font-size:12px; font-weight:400;
  padding:0 0 0 8px; margin-left:4px; border-left:1px solid #30363d;
  min-height:0; width:auto; cursor:pointer; flex-shrink:0; touch-action:manipulation;
}
.user-chip button:hover { background:none; color:#f85149; border-color:#30363d; }

/* ============================================================
   登录页 (GitHub style)
   ============================================================ */
.login-wrap {
  display:flex; align-items:center; justify-content:center;
  min-height:100dvh; padding:20px;
  padding-left:max(20px,env(safe-area-inset-left));
  padding-right:max(20px,env(safe-area-inset-right));
  padding-top:max(20px,env(safe-area-inset-top));
  padding-bottom:max(20px,env(safe-area-inset-bottom));
}
.login-card {
  width:100%; max-width:340px;
  background:rgba(22,27,34,.68);
  backdrop-filter:blur(28px) saturate(180%);
  -webkit-backdrop-filter:blur(28px) saturate(180%);
  border:1px solid rgba(255,255,255,.08);
  border-radius:18px;
  box-shadow:0 20px 60px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05);
  padding:28px 24px 24px;
}
.login-card:hover { transform:none; border-color:rgba(255,255,255,.08);
  box-shadow:0 20px 60px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05); }
.login-brand { text-align:center; margin-bottom:20px; }
.login-brand h1 { margin:0; font-size:18px; font-weight:600; color:#e6edf3; }
.login-brand p { margin:4px 0 0; color:#8b949e; font-size:12px; }
.login-card label { display:block; margin:14px 0 6px; font-size:12px;
  font-weight:600; color:#c9d1d9; }
.login-card input {
  width:100%; padding:10px 12px;
  background:rgba(13,17,23,.55);
  border:1px solid rgba(255,255,255,.08);
  border-radius:8px; color:#e6edf3; font:inherit; font-size:16px;
  backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
  transition:.18s;
}
.login-card input::placeholder { color:#6e7681; }
.login-card input:focus { outline:none; border-color:#58a6ff;
  box-shadow:0 0 0 3px rgba(88,166,255,.18), 0 0 20px rgba(88,166,255,.15); }
.login-card .btn-primary {
  width:100%; margin-top:18px; padding:11px 16px; min-height:0;
  border-radius:8px; border:1px solid rgba(255,255,255,.08);
  color:#fff; font-size:15px; font-weight:500;
  background:linear-gradient(180deg,#2ea043,#238636);
  box-shadow:0 0 18px rgba(35,134,54,.25);
  cursor:pointer; transition:.18s;
}
.login-card .btn-primary:hover:not(:disabled) {
  background:linear-gradient(180deg,#3fb950,#2ea043);
  box-shadow:0 0 24px rgba(46,160,67,.35);
}
.login-card .btn-primary:disabled { opacity:.7; cursor:not-allowed; }
.login-err {
  display:none; margin-top:14px; padding:10px 12px; border-radius:8px;
  background:rgba(218,54,51,.12); border:1px solid rgba(248,81,73,.3);
  color:#ffa198; font-size:13px;
}
.login-err.show { display:block; }

/* ============================================================
   主内容区
   ============================================================ */
#dash {
  display:none;
  max-width:980px; margin:0 auto;
  padding:20px;
  padding-left:max(20px,env(safe-area-inset-left));
  padding-right:max(20px,env(safe-area-inset-right));
  padding-bottom:max(20px,env(safe-area-inset-bottom));
}

/* ============================================================
   卡片 (Primer style + 毛玻璃)
   ============================================================ */
.card {
  background:rgba(22,27,34,.65);
  backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px);
  border:1px solid rgba(255,255,255,.08);
  border-radius:12px;
  box-shadow:0 8px 32px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.04);
  transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}
.card:hover {
  transform:translateY(-2px);
  border-color:rgba(88,166,255,.25);
  box-shadow:0 12px 40px rgba(0,0,0,.35), 0 0 0 1px rgba(88,166,255,.08), inset 0 1px 0 rgba(255,255,255,.05);
}
.token-section { padding:20px; margin-bottom:16px; }
#dash > .card { margin-bottom:16px; }

/* ============================================================
   区块标题 (GitHub card heading)
   ============================================================ */
.section-head {
  display:flex; justify-content:space-between; align-items:center;
  margin-bottom:14px; padding:0 4px; gap:12px;
}
.section-head h3 {
  margin:0; font-size:12px; font-weight:600; color:#8b949e;
  text-transform:uppercase; letter-spacing:.06em;
  display:flex; align-items:center; gap:8px;
}
.section-head .count {
  font-size:12px; font-weight:400; color:#6e7681;
  text-transform:none; letter-spacing:0; margin-left:2px;
}

/* ============================================================
   按钮 (Primer style)
   ============================================================ */
input, button, select, textarea {
  border-radius:6px;
  border:1px solid #30363d; background:#0d1117; color:#e6edf3;
  font:inherit; font-size:16px;
  transition:border-color .12s, box-shadow .12s, background .12s;
  touch-action:manipulation;
}
input:focus, textarea:focus, select:focus {
  outline:none; border-color:#58a6ff;
  box-shadow:0 0 0 3px rgba(56,139,253,.35);
}
button {
  cursor:pointer; background:#21262d; border-color:#30363d; color:#c9d1d9;
  font-weight:500; min-height:36px; width:auto; padding:8px 16px; font-size:14px;
}
button:hover:not(:disabled) { background:#30363d; border-color:#8b949e; }
button:active:not(:disabled) { background:#282e33; }
button:disabled { opacity:.55; cursor:not-allowed; }
.btn-primary {
  background:linear-gradient(180deg,#2ea043,#238636);
  border-color:rgba(240,246,252,.1); color:#fff;
  box-shadow:0 0 18px rgba(35,134,54,.25);
}
.btn-primary:hover:not(:disabled) {
  background:linear-gradient(180deg,#3fb950,#2ea043);
  border-color:rgba(240,246,252,.1);
  box-shadow:0 0 24px rgba(46,160,67,.35);
}
.btn-primary:active:not(:disabled) { background:#1f7a30; }
.btn-secondary { background:#21262d; border-color:#30363d; color:#c9d1d9; min-height:36px; }
.btn-secondary:hover:not(:disabled) { background:#30363d; border-color:#8b949e; color:#e6edf3; }

/* ============================================================
   令牌列表
   ============================================================ */
.token-list { display:flex; flex-direction:column; gap:8px; margin-top:14px; }
.token-item {
  display:flex; align-items:center; gap:12px;
  background:#161b22; border:1px solid #30363d;
  border-radius:6px; padding:10px 14px; font-size:14px;
  transition:border-color .12s, background .12s;
}
.token-item:hover { border-color:#8b949e; }
.token-item .tok-label {
  color:#c9d1d9; font-weight:500; min-width:100px;
  display:flex; align-items:center; gap:8px;
}
.token-item .tok-label::before { content:'🔑'; font-size:13px; }
.token-item .tok-id {
  color:#79c0ff; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:12px; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  background:#0d1117; padding:3px 8px; border-radius:4px; border:1px solid #30363d;
}
.token-item .tok-time { color:#8b949e; font-size:12px; white-space:nowrap; font-weight:400; }
.token-item .tok-actions { display:flex; gap:6px; flex-shrink:0; }
.token-item button { padding:6px 14px; font-size:12px; min-height:30px; }
.btn-copy { color:#58a6ff; }
.btn-copy:hover:not(:disabled) { background:rgba(31,111,235,.15); border-color:#58a6ff; color:#79c0ff; }
.btn-revoke { color:#f85149; }
.btn-revoke:hover:not(:disabled) { background:#da3633; border-color:#da3633; color:#fff; }
.token-empty {
  color:#8b949e; font-size:14px; text-align:center;
  padding:32px 20px; background:rgba(13,17,23,.5);
  border:1px dashed #30363d; border-radius:8px;
}
.token-empty .empty-icon { font-size:36px; margin-bottom:10px; opacity:.5; }

/* 令牌骨架屏 */
.token-skeleton {
  display:flex; align-items:center; gap:12px; padding:10px 14px;
  background:#161b22; border:1px solid #30363d; border-radius:6px; overflow:hidden;
}
.token-skeleton .skel {
  height:12px; border-radius:4px;
  background:linear-gradient(90deg,#21262d 25%,#30363d 50%,#21262d 75%);
  background-size:200% 100%;
  animation:shimmer 1.5s infinite;
}
.token-skeleton .skel-name { width:100px; }
.token-skeleton .skel-id { flex:1; max-width:200px; }
.token-skeleton .skel-time { width:120px; }
.token-skeleton .skel-btn { width:60px; height:24px; }
@keyframes shimmer { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }

/* ============================================================
   设备网格
   ============================================================ */
.device-grid {
  display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr));
  gap:14px; margin-bottom:4px;
}
.device-card {
  padding:18px; position:relative; overflow:hidden;
  animation:cardIn .3s ease both;
}
@keyframes cardIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
.device-card::before {
  content:''; position:absolute; top:0; left:0; right:0; height:2px;
  background:#30363d; transition:background .3s ease;
}
.device-card.online::before { background:linear-gradient(90deg,#238636,#56d364); }
.device-card.offline { opacity:.6; }
.device-card.offline:hover { opacity:.75; }
.device-head { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
.device-name {
  font-size:16px; font-weight:600; color:#e6edf3; letter-spacing:-.01em;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;
}
.status-badge {
  display:inline-flex; align-items:center; gap:6px;
  padding:2px 10px; border-radius:999px;
  font-size:12px; font-weight:500; border:1px solid; white-space:nowrap; flex-shrink:0;
}
.status-badge::before { content:''; width:6px; height:6px; border-radius:50%; background:currentColor; }
.status-badge.online { color:#56d364; border-color:#23863655; background:#23863622; }
.status-badge.offline { color:#8b949e; border-color:#30363d; background:#21262d; }

/* 应用行 */
.app-row { display:flex; flex-direction:column; gap:6px; }
.app-chip {
  display:flex; align-items:center; gap:10px;
  background:#21262d; border:1px solid #30363d;
  border-radius:6px; padding:8px 10px; font-size:14px;
  transition:border-color .12s, background .12s;
}
.app-chip:hover { border-color:#8b949e; }
.app-chip .app-icon {
  width:28px; height:28px; border-radius:6px;
  background:#30363d; color:#8b949e;
  display:flex; align-items:center; justify-content:center;
  font-weight:600; font-size:10px; flex-shrink:0; letter-spacing:.5px;
  transition:all .2s;
}
.device-card.online .app-chip .app-icon { background:#23863622; color:#56d364; }
.app-chip .app-label {
  color:#c9d1d9; font-weight:400; flex:1;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.app-chip .app-actions { display:flex; gap:6px; flex-shrink:0; }
.app-chip button { padding:6px 14px; font-size:12px; min-height:30px; }
.btn-on { color:#56d364; }
.btn-on:hover:not(:disabled) { background:#238636; border-color:#238636; color:#fff; }
.btn-off { color:#8b949e; }
.btn-off:hover:not(:disabled) { background:#30363d; border-color:#8b949e; color:#e6edf3; }
.app-chip .no-ctrl {
  font-size:11px; color:#6e7681; font-weight:500;
  padding:4px 10px; border-radius:999px; background:#161b22;
}

/* ============================================================
   CMD 终端
   ============================================================ */
.cmd-row {
  display:flex; gap:6px; margin-top:14px; padding-top:14px;
  border-top:1px solid #30363d;
}
.cmd-row .cmd-prompt {
  color:#56d364; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:14px; display:flex; align-items:center; padding:0 2px; flex-shrink:0;
}
.cmd-row input {
  flex:1; padding:8px 10px; background:#0d1117;
  border:1px solid #30363d; border-radius:6px;
  color:#e6edf3; font-size:13px; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  outline:none; transition:all .15s; font-weight:400;
}
.cmd-row input::placeholder { color:#6e7681; }
.cmd-row input:focus { border-color:#58a6ff; box-shadow:0 0 0 3px rgba(56,139,253,.35); }
.cmd-row .btn-cmd {
  padding:8px 16px; color:#fff; min-height:36px;
  background:#238636; border:1px solid rgba(240,246,252,.1);
  font-size:12px; font-weight:500; cursor:pointer; transition:all .15s;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; white-space:nowrap;
}
.cmd-row .btn-cmd:hover { background:#2ea043; }
.cmd-output {
  margin-top:10px; background:rgba(1,4,9,.55);
  backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);
  border:1px solid rgba(255,255,255,.08); border-radius:6px;
  padding:12px; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:12px; color:#c9d1d9; max-height:220px; overflow-y:auto;
  white-space:pre-wrap; word-break:break-all; display:none; line-height:1.5;
  box-shadow:inset 0 0 40px rgba(0,0,0,.25);
}
.cmd-output.show { display:block; }
.cmd-output .cmd-ok { color:#56d364; font-weight:500; }
.cmd-output .cmd-err { color:#f85149; font-weight:500; }
.cmd-output .cmd-prompt-line { color:#79c0ff; margin-bottom:4px; }

/* ============================================================
   空状态
   ============================================================ */
.empty {
  text-align:center; padding:40px 20px; color:#8b949e; grid-column:1/-1;
  font-size:14px; background:rgba(13,17,23,.5);
  border:1px dashed #30363d; border-radius:8px;
}
.empty .empty-icon { font-size:40px; margin-bottom:12px; opacity:.5; }
.empty .empty-title { font-size:16px; font-weight:600; color:#e6edf3; margin-bottom:6px; letter-spacing:0; }
.empty .empty-sub { font-size:13px; color:#6e7681; }

/* ============================================================
   操作日志
   ============================================================ */
#dash > .card:last-child { padding:0; }
#dash > .card:last-child .section-head { padding:16px 16px 0; }
.log-wrap { max-height:340px; overflow-y:auto; padding:4px 0; }
.log-line {
  font-size:13px; padding:8px 16px; border-bottom:1px solid #21262d;
  color:#c9d1d9; display:flex; align-items:baseline; gap:10px; font-weight:400;
  transition:background .15s;
}
.log-line:hover { background:#161b22; }
.log-line:last-child { border-bottom:none; }
.log-line .t {
  color:#6e7681; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-weight:400; flex-shrink:0; font-size:11px;
}
.log-line.ok { color:#56d364; font-weight:400; }
.log-line.ok .t { color:#56d364; }
.log-line.err { color:#f85149; font-weight:400; }
.log-line .msg { flex:1; word-break:break-all; }

/* ============================================================
   Toast
   ============================================================ */
.toast {
  position:fixed; top:28px; left:50%; z-index:9999;
  transform:translateX(-50%) translateY(-120px);
  background:#1f2328; color:#e6edf3;
  border:1px solid #30363d; border-left:3px solid #2ea043;
  padding:10px 20px; border-radius:8px;
  font-size:14px; font-weight:500; opacity:0;
  transition:all .3s ease;
  box-shadow:0 8px 32px rgba(0,0,0,.35);
  display:flex; align-items:center; gap:10px;
  pointer-events:none;
}
.toast::before { content:'✓'; color:#56d364; font-weight:700; }
.toast.show { opacity:1; transform:translateX(-50%) translateY(0); }
.toast.error { border-left-color:#f85149; }
.toast.error::before { content:'✕'; color:#f85149; }

/* ============================================================
   滚动条
   ============================================================ */
::-webkit-scrollbar { width:10px; height:10px; }
::-webkit-scrollbar-track { background:transparent; }
::-webkit-scrollbar-thumb { background:rgba(255,255,255,.12); border-radius:999px; }
::-webkit-scrollbar-thumb:hover { background:rgba(255,255,255,.22); }

/* ============================================================
   响应式 (Primer breakpoints)
   ============================================================ */
@media (max-width:768px) {
  .topbar { padding:10px 14px; gap:8px;
    padding-left:max(14px,env(safe-area-inset-left));
    padding-right:max(14px,env(safe-area-inset-right)); }
  #dash { padding:14px; gap:12px; }
  .card { border-radius:8px; }
  .device-grid { grid-template-columns:1fr; gap:12px; }
  .token-item { flex-wrap:wrap; }
  .token-item .tok-label { min-width:auto; width:100%; }
  .token-item .tok-id { width:100%; order:3; }
  .token-item .tok-time { order:4; }
  .token-item .tok-actions { order:5; width:100%; justify-content:flex-end; }
  .app-chip { flex-wrap:wrap; gap:8px; }
  .app-chip .app-actions { width:100%; justify-content:flex-end; }
  .cmd-row { flex-wrap:wrap; }
  .cmd-row .cmd-prompt { display:none; }
  .cmd-row input { min-width:100%; }
  .section-head { flex-wrap:wrap; }
}
@media (max-width:520px) {
  .topbar h1 { font-size:15px; }
  .topbar h1 svg { width:16px; height:16px; }
  .user-chip { max-width:none; font-size:11px; padding:3px 8px 3px 6px; }
  .user-chip .username { max-width:80px; }
  #dash { padding:12px; }
  .card { padding:12px; }
  .token-section { padding:14px; }
  .token-item .tok-actions { flex-direction:column; gap:6px; }
  .token-item button { width:100%; text-align:center; }
  .app-chip button { flex:1; }
  .log-wrap { max-height:240px; }
}
/* 触摸设备：禁用 hover 残留 */
@media (hover:none) {
  button:hover:not(:disabled) { background:#21262d; border-color:#30363d; }
  .btn-primary:hover:not(:disabled) { background:linear-gradient(180deg,#2ea043,#238636); }
  .btn-copy:hover:not(:disabled) { background:#21262d; border-color:#30363d; }
  .btn-revoke:hover:not(:disabled) { background:#21262d; color:#f85149; border-color:#30363d; }
  .btn-on:hover:not(:disabled) { background:#21262d; color:#56d364; border-color:#30363d; }
  .btn-off:hover:not(:disabled) { background:#21262d; color:#8b949e; border-color:#30363d; }
  .card:hover { transform:none; border-color:rgba(255,255,255,.08); }
}
</style>
</head>
<body>

<!-- ============================================================
     登录页
     ============================================================ -->
<div class="login-wrap" id="loginBlock">
  <div class="login-card card">
    <div class="login-brand">
      <h1>远程控制中心</h1>
      <p>使用管理员账号登录</p>
    </div>
    <label for="u">用户名</label>
    <input id="u" autocomplete="username" placeholder="请输入用户名" autofocus>
    <label for="p">密码</label>
    <input id="p" type="password" autocomplete="current-password" placeholder="请输入密码">
    <button id="loginBtn" class="btn-primary" type="button">登录</button>
    <div class="login-err" id="loginErr"></div>
  </div>
</div>

<!-- ============================================================
     顶栏 (GitHub style)
     ============================================================ -->
<header class="topbar" id="navBar" style="display:none">
  <h1>
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M1.75 1h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 14.25 15H1.75A1.75 1.75 0 0 1 0 13.25V2.75C0 1.784.784 1 1.75 1ZM1.5 3.5v9.75c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V3.5Z"/>
      <path d="M2.5 2.75a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 0 1.5h-9.5a.75.75 0 0 1-.75-.75Z"/>
    </svg>
    切盘工具
  </h1>
  <span class="spacer"></span>
  <span class="user-chip">
    <span class="avatar" id="userAvatar">U</span>
    <span class="username" id="userLabel">…</span>
    <button id="logoutBtn" type="button" title="退出登录">退出</button>
  </span>
</header>

<!-- ============================================================
     主内容
     ============================================================ -->
<main id="dash" style="display:none">

  <!-- 设备令牌 -->
  <section class="card token-section">
    <div class="section-head">
      <h3>设备令牌</h3>
      <button id="createTokenBtn" class="btn-primary" type="button">＋ 生成新令牌</button>
    </div>
    <div class="token-list" id="tokenList">
      <div class="token-skeleton"><div class="skel skel-name"></div><div class="skel skel-id"></div><div class="skel skel-time"></div><div class="skel skel-btn"></div></div>
      <div class="token-skeleton"><div class="skel skel-name"></div><div class="skel skel-id"></div><div class="skel skel-time"></div><div class="skel skel-btn"></div></div>
    </div>
  </section>

  <!-- 设备列表 -->
  <section class="card" style="padding:20px;">
    <div class="section-head">
      <h3>设备列表<span class="count" id="devCount"></span></h3>
    </div>
    <div class="device-grid" id="grid">
      <div class="empty">
        <div class="empty-icon">🖥️</div>
        <div class="empty-title">暂无设备</div>
        <div class="empty-sub">等待 Agent 连接…</div>
      </div>
    </div>
  </section>

  <!-- 操作日志 -->
  <section class="card">
    <div class="section-head" style="padding-top:16px;">
      <h3>操作日志</h3>
    </div>
    <div class="log-wrap"><div id="log"></div></div>
  </section>

</main>

<!-- ============================================================
     Toast
     ============================================================ -->
<div class="toast" id="toast"></div>
<script>
// State
let token='', ws=null, rTimer=null, devices={}, tokenList=[], cmdOut={};

// Helpers
function L(msg,ok){const e=logEl,t=new Date().toLocaleTimeString(),c=ok===true?'ok':ok===false?'err':'';e.innerHTML+='<div class="log-line '+c+'"><span class=t>'+t+'</span><span class=msg>'+msg+'</span></div>';e.parentElement.scrollTop=e.parentElement.scrollHeight}
function $$(id){return document.getElementById(id)}
function toast(msg,isErr){const t=$$('toast');t.textContent=msg;t.className='toast'+(isErr?' error':'');t.classList.add('show');setTimeout(function(){t.classList.remove('show')},2500)}
const logEl=$$('log'), grid=$$('grid');

// Login ─── exact copy from reference worker
$$('loginBtn').onclick=async function(){
  const u=$$('u').value.trim(),p=$$('p').value.trim();
  if(!u||!p)return;
  const btn=$$('loginBtn'),ot=btn.textContent;btn.textContent='登录中…';btn.disabled=true;
  try{
    const r=await fetch('/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:u,password:p})});
    const d=await r.json();
    if(d.ok){
      token=d.token;
      $$('loginBlock').style.display='none';
      $$('navBar').style.display='flex';
      $$('dash').style.display='block';
      $$('userLabel').textContent=d.username;
      $$('userAvatar').textContent=(d.username||'U')[0].toUpperCase();
      $$('loginErr').style.display='none';
      L('登录成功',true);connect();loadTokens();
    }else{$$('loginErr').textContent=d.error||'登录失败';$$('loginErr').style.display='block'}
  }catch(e){$$('loginErr').textContent='网络错误';$$('loginErr').style.display='block'}
  finally{btn.textContent=ot;btn.disabled=false}
};
$$('p').onkeydown=function(e){if(e.key==='Enter')$$('loginBtn').click()};
$$('u').onkeydown=function(e){if(e.key==='Enter')$$('p').focus()};

// WebSocket ─── exact copy from reference worker
function connect(){
  if(ws){try{ws.close()}catch(e){}}
  var proto=location.protocol==='https:'?'wss:':'ws:';
  ws=new WebSocket(proto+'//'+location.host+'/ws?token='+token);
  ws.onopen=function(){L('已连接到服务器',true);ws.send(JSON.stringify({type:'browser_subscribe'}));if(rTimer){clearTimeout(rTimer);rTimer=null}}
  ws.onmessage=function(e){try{handle(JSON.parse(e.data))}catch(ex){}}
  ws.onclose=function(){L('连接断开，5秒后重连…',false);if(!rTimer)rTimer=setTimeout(connect,5000)}
  ws.onerror=function(){}
}

function handle(m){
  switch(m.type){
    case'device_list':
      devices={};m.devices.forEach(function(d){devices[d.deviceId]=d});render();break;
    case'device_status':
      if(m.status==='offline'){if(devices[m.deviceId])devices[m.deviceId].status='offline'}
      else devices[m.deviceId]={deviceId:m.deviceId,status:m.status,hostname:m.hostname||m.deviceId,apps:m.apps||[]};
      render();L((m.hostname||m.deviceId)+' '+(m.status==='online'?'已上线':'已离线'),m.status==='online');break;
    case'cmd_result':
      L(m.deviceId+': '+m.action+' '+m.name+' — '+(m.ok?'成功':m.message||'失败'),m.ok);
      if(m.action==='exec'){cmdOut[m.deviceId]={ok:m.ok,cmd:m.name,out:m.message};render()}
      break;
  }
}

function initials(s){return (s||'A').substring(0,2).toUpperCase()}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}

function render(){
  var ids=Object.keys(devices);
  var onlineCount=ids.filter(function(id){return devices[id].status==='online'}).length;
  $$('devCount').textContent=ids.length?'('+onlineCount+'/'+ids.length+' 在线)':'';
  if(!ids.length){grid.innerHTML='<div class=empty><div class=empty-icon>🖥️</div><div class=empty-title>暂无设备</div><div class=empty-sub>等待 Agent 连接…</div></div>';return}
  grid.innerHTML=ids.map(function(id){
    var d=devices[id],on=d.status==='online';
    var co=cmdOut[id],coHtml='';
    if(co){coHtml='<div class="cmd-output show"><div class=cmd-prompt-line>$ '+esc(co.cmd)+'</div>'+esc(co.out||'')+'</div>'}
    else{coHtml='<div class="cmd-output"></div>'}
    return '<div class="device-card card '+(on?'online':'offline')+'">'
      +'<div class=device-head>'
        +'<span class=device-name>'+esc(d.hostname||id)+'</span>'
        +'<span class="status-badge '+(on?'online':'offline')+'">'+(on?'在线':'离线')+'</span>'
      +'</div>'
      +'<div class=app-row>'+(d.apps||[]).map(function(a){
        return '<div class=app-chip>'
          +'<span class=app-icon>'+initials(a)+'</span>'
          +'<span class=app-label>'+esc(a)+'</span>'
          +(on
            ?'<span class=app-actions>'
              +'<button class=btn-on onclick="S(\''+id+'\',\'start\',\''+esc(a)+'\')">启动</button>'
              +'<button class=btn-off onclick="S(\''+id+'\',\'stop\',\''+esc(a)+'\')">关闭</button>'
              +'</span>'
            :'<span class=no-ctrl>离线</span>')
          +'</div>';
      }).join('')+'</div>'
      +(on
        ?'<div class=cmd-row><span class=cmd-prompt>&gt;</span><input id="cmdin-'+esc(id)+'" placeholder="输入命令…" onkeydown="if(event.key===\'Enter\')execCmd(\''+esc(id)+'\')"><button class=btn-cmd onclick="execCmd(\''+esc(id)+'\')">执行</button></div>'
        :'')
      +coHtml
    +'</div>';
  }).join('');
}

function S(deviceId,action,name){
  if(!ws||ws.readyState!==WebSocket.OPEN){L('未连接',false);return}
  ws.send(JSON.stringify({type:'cmd',deviceId:deviceId,action:action,name:name}));
  L('发送: '+deviceId+' → '+action+' '+name);
}

function execCmd(deviceId){
  var input=document.getElementById('cmdin-'+deviceId);
  if(!input)return;
  var cmd=input.value.trim();
  if(!cmd)return;
  if(!ws||ws.readyState!==WebSocket.OPEN){L('未连接',false);return}
  ws.send(JSON.stringify({type:'cmd',deviceId:deviceId,action:'exec',name:cmd}));
  L('CMD → '+deviceId+': '+cmd);
  input.value='';
  delete cmdOut[deviceId];
  render();
}

async function loadTokens(){
  try{
    var r=await fetch('/tokens?token='+token);
    var d=await r.json();
    if(d.ok)tokenList=d.tokens||[];
    else tokenList=[];
  }catch(e){tokenList=[]}
  var el=$$('tokenList');
  if(!tokenList.length){el.innerHTML='<div class=token-empty><div class=empty-icon>🔑</div>暂无设备令牌，点击上方按钮生成</div>';return}
  el.innerHTML=tokenList.map(function(t){
    var d=new Date(t.createdAt),ts=d.toLocaleDateString()+' '+d.toLocaleTimeString();
    var idShort=t.id.substring(0,12)+'…';
    return '<div class=token-item>'
      +'<span class=tok-label>'+esc(t.label||'未命名')+'</span>'
      +'<span class=tok-id title="'+esc(t.id)+'">'+esc(idShort)+'</span>'
      +'<span class=tok-time>'+ts+'</span>'
      +'<span class=tok-actions>'
        +'<button class=btn-copy onclick="copyToken(\''+t.id+'\')">复制</button>'
        +'<button class=btn-revoke onclick="revokeToken(\''+t.id+'\')">撤销</button>'
      +'</span>'
    +'</div>';
  }).join('');
}

$$('createTokenBtn').onclick=async function(){
  var label=prompt('输入设备名称（例如：GamePC01）：');
  if(label===null)return;
  label=label.trim()||'Device';
  try{
    var r=await fetch('/create-token',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:token,label:label})});
    var d=await r.json();
    if(d.ok){
      try{await navigator.clipboard.writeText(d.token)}catch(e){}
      toast('令牌已生成并复制到剪贴板');
      L('已创建设备令牌: '+label,true);
      loadTokens();
    }else{toast(d.error||'创建失败',true);L('创建令牌失败: '+(d.error||'未知错误'),false)}
  }catch(e){L('网络错误',false)}
};

function copyToken(id){
  navigator.clipboard.writeText(id).then(function(){toast('已复制到剪贴板')}).catch(function(){prompt('请手动复制:',id)});
}

async function revokeToken(id){
  if(!confirm('确定撤销此令牌？对应的 Agent 将无法连接。'))return;
  try{
    var r=await fetch('/revoke-token',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:token,targetToken:id})});
    var d=await r.json();
    if(d.ok){toast('令牌已撤销');L('令牌已撤销',true);loadTokens()}
    else{L('撤销失败: '+(d.error||'未知错误'),false)}
  }catch(e){L('网络错误',false)}
}

$$('logoutBtn').onclick=function(){
  if(ws)ws.close();
  token='';devices={};tokenList=[];
  $$('loginBlock').style.display='flex';
  $$('navBar').style.display='none';
  $$('dash').style.display='none';
  $$('u').value='';$$('p').value='';
  grid.innerHTML='<div class=empty><div class=empty-icon>🖥️</div><div class=empty-title>暂无设备</div><div class=empty-sub>等待 Agent 连接…</div></div>';
  logEl.innerHTML='';
  $$('tokenList').innerHTML='<div class="token-skeleton"><div class="skel skel-name"></div><div class="skel skel-id"></div><div class="skel skel-time"></div><div class="skel skel-btn"></div></div><div class="token-skeleton"><div class="skel skel-name"></div><div class="skel skel-id"></div><div class="skel skel-time"></div><div class="skel skel-btn"></div></div>';
};

// Nav scroll shadow
window.addEventListener('scroll',function(){
  $$('navBar').classList.toggle('scrolled',window.scrollY>10);
});
</script>
</body>
</html>`;

// ── Utilities ─────────────────────────────────────────────────────────────────

function generateUUID() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`;
}

async function hashPassword(password) {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(password));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Resolve a token → { username, type, label, createdAt } or null */
async function resolveToken(env, token) {
  const data = await env.USERS.get(`token:${token}`, "json");
  if (!data) return null;
  return data; // { username, type, label, createdAt }
}

/** Append a token UUID to the user's token list index */
async function addToUserTokenList(env, username, tokenId, meta) {
  const key = `user:${username}:tokens`;
  const list = (await env.USERS.get(key, "json")) || [];
  list.push({ id: tokenId, ...meta });
  await env.USERS.put(key, JSON.stringify(list));
}

/** Remove a token UUID from the user's token list index */
async function removeFromUserTokenList(env, username, tokenId) {
  const key = `user:${username}:tokens`;
  const list = (await env.USERS.get(key, "json")) || [];
  const filtered = list.filter((t) => t.id !== tokenId);
  if (filtered.length === list.length) return; // not found
  await env.USERS.put(key, JSON.stringify(filtered));
}

// ── Worker — HTTP routes ──────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // —— Serve frontend ————————————————————————————————————————————————————
    if (url.pathname === "/") {
      return new Response(HTML, {
        headers: { "content-type": "text/html;charset=utf-8" },
      });
    }

    // —— Login ——————————————————————————————————————————————————————————————
    if (url.pathname === "/login" && request.method === "POST") {
      try {
        const { username, password } = await request.json();
        if (!username || !password) {
          return Response.json(
            { ok: false, error: "用户名和密码不能为空" },
            { status: 400 }
          );
        }

        const userData = await env.USERS.get(`user:${username}`, "json");
        if (!userData) {
          return Response.json(
            { ok: false, error: "用户名或密码错误" },
            { status: 401 }
          );
        }

        const hashed = await hashPassword(password);
        if (hashed !== userData.passwordHash) {
          return Response.json(
            { ok: false, error: "用户名或密码错误" },
            { status: 401 }
          );
        }

        // Issue login token — auto-expire after 24 hours
        const token = generateUUID();
        const meta = { type: "login", label: "浏览器会话", createdAt: Date.now() };
        await env.USERS.put(
          `token:${token}`,
          JSON.stringify({ username, ...meta }),
          { expirationTtl: 86400 }  // 24 hours
        );

        return Response.json({ ok: true, token, username });
      } catch {
        return Response.json(
          { ok: false, error: "请求格式错误" },
          { status: 400 }
        );
      }
    }

    // —— Create device token ————————————————————————————————————————————————
    if (url.pathname === "/create-token" && request.method === "POST") {
      try {
        const { token, label } = await request.json();
        if (!token) {
          return Response.json(
            { ok: false, error: "Missing token" },
            { status: 400 }
          );
        }

        const session = await resolveToken(env, token);
        if (!session) {
          return Response.json(
            { ok: false, error: "Invalid session token" },
            { status: 401 }
          );
        }

        const newToken = generateUUID();
        const meta = {
          type: "device",
          label: label || "Device",
          createdAt: Date.now(),
        };
        await env.USERS.put(
          `token:${newToken}`,
          JSON.stringify({ username: session.username, ...meta })
        );
        await addToUserTokenList(env, session.username, newToken, meta);

        return Response.json({
          ok: true,
          token: newToken,
          label: meta.label,
        });
      } catch {
        return Response.json(
          { ok: false, error: "请求格式错误" },
          { status: 400 }
        );
      }
    }

    // —— List tokens ————————————————————————————————————————————————————————
    if (url.pathname === "/tokens") {
      const token = url.searchParams.get("token");
      if (!token) {
        return Response.json(
          { ok: false, error: "Missing token" },
          { status: 400 }
        );
      }

      const session = await resolveToken(env, token);
      if (!session) {
        return Response.json(
          { ok: false, error: "Invalid session token" },
          { status: 401 }
        );
      }

      const list =
        (await env.USERS.get(
          `user:${session.username}:tokens`,
          "json"
        )) || [];

      // Only show device tokens (exclude login/session tokens)
      const deviceTokens = list.filter((t) => t.type !== "login");

      return Response.json({ ok: true, tokens: deviceTokens });
    }

    // —— Revoke token ———————————————————————————————————————————————————————
    if (url.pathname === "/revoke-token" && request.method === "POST") {
      try {
        const { token, targetToken } = await request.json();
        if (!token || !targetToken) {
          return Response.json(
            { ok: false, error: "Missing token or targetToken" },
            { status: 400 }
          );
        }

        // Validate session
        const session = await resolveToken(env, token);
        if (!session) {
          return Response.json(
            { ok: false, error: "Invalid session token" },
            { status: 401 }
          );
        }

        // Validate target belongs to same user
        const target = await resolveToken(env, targetToken);
        if (!target || target.username !== session.username) {
          return Response.json(
            { ok: false, error: "Token not found" },
            { status: 404 }
          );
        }

        // Prevent revoking login/session tokens
        if (target.type === "login") {
          return Response.json(
            {
              ok: false,
              error: "浏览器会话 Token 不可撤销，退出登录即自动失效",
            },
            { status: 400 }
          );
        }

        // Delete token entry and remove from list
        await env.USERS.delete(`token:${targetToken}`);
        await removeFromUserTokenList(env, session.username, targetToken);

        return Response.json({ ok: true });
      } catch {
        return Response.json(
          { ok: false, error: "请求格式错误" },
          { status: 400 }
        );
      }
    }

    // —— WebSocket upgrade → route to Durable Object ————————————————————————
    if (url.pathname === "/ws") {
      const token = url.searchParams.get("token");
      if (!token) {
        return new Response("Missing token", { status: 401 });
      }

      // Validate token (no expiry — tokens are permanent)
      const tokenData = await resolveToken(env, token);
      if (!tokenData) {
        return new Response("Invalid token", { status: 401 });
      }

      // One DO per user — complete isolation
      const doId = env.CONTROL.idFromName(tokenData.username);
      const stub = env.CONTROL.get(doId);
      return stub.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  },
};

// ── Durable Object — WebSocket broker ─────────────────────────────────────────
//
//  Each user gets their own DO instance (idFromName(username)).
//  The DO keeps an in-memory map of devices (agent connections) and
//  browser connections, relaying commands & status updates between them.

export class ControlServer {
  constructor(state) {
    this.state = state;
    // deviceId → { ws, status, hostname, apps, lastHeartbeat }
    this.devices = new Map();
    // WebSocket → { type: "pending" | "agent" | "browser", deviceId? }
    this.sockets = new Map();
  }

  async fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = pair;
    server.accept();

    this.sockets.set(server, { type: "pending" });

    server.addEventListener("message", (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        this._dispatch(server, msg);
      } catch {
        server.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      }
    });

    server.addEventListener("close", () => {
      const conn = this.sockets.get(server);
      if (conn) {
        if (conn.type === "agent" && conn.deviceId) {
          const dev = this.devices.get(conn.deviceId);
          if (dev && dev.ws === server) {
            dev.status = "offline";
            this._broadcast({
              type: "device_status",
              deviceId: conn.deviceId,
              status: "offline",
              hostname: dev.hostname,
            });
          }
        }
        this.sockets.delete(server);
      }
    });

    server.addEventListener("error", () => {});

    return new Response(null, { status: 101, webSocket: client });
  }

  // ── Message dispatch ────────────────────────────────────────────────────

  _dispatch(ws, msg) {
    switch (msg.type) {
      case "agent_register":
        this._onAgentRegister(ws, msg);
        break;
      case "heartbeat":
        this._onHeartbeat(ws);
        break;
      case "cmd_result":
        this._broadcast(msg);
        break;
      case "browser_subscribe":
        this._onBrowserSubscribe(ws);
        break;
      case "cmd":
        this._routeToAgent(msg);
        break;
      default:
        ws.send(
          JSON.stringify({ type: "error", message: `Unknown type: ${msg.type}` })
        );
    }
  }

  // ── Agent registration ──────────────────────────────────────────────────

  _onAgentRegister(ws, msg) {
    const { deviceId, hostname, apps } = msg;
    if (!deviceId) {
      ws.send(JSON.stringify({ type: "error", message: "Missing deviceId" }));
      return;
    }

    const prev = this.devices.get(deviceId);
    if (prev && prev.ws !== ws) {
      try { prev.ws.close(1000, "replaced"); } catch {}
      for (const [s, c] of this.sockets) {
        if (c.type === "agent" && c.deviceId === deviceId && s !== ws) {
          this.sockets.delete(s);
        }
      }
    }

    this.sockets.set(ws, { type: "agent", deviceId });
    this.devices.set(deviceId, {
      ws,
      status: "online",
      hostname: hostname || deviceId,
      apps: apps || [],
      lastHeartbeat: Date.now(),
    });

    ws.send(JSON.stringify({ type: "registered", deviceId }));

    this._broadcast({
      type: "device_status",
      deviceId,
      status: "online",
      hostname: hostname || deviceId,
      apps: apps || [],
    });
  }

  // ── Heartbeat ───────────────────────────────────────────────────────────

  _onHeartbeat(ws) {
    const conn = this.sockets.get(ws);
    if (!conn || conn.type !== "agent") return;

    const dev = this.devices.get(conn.deviceId);
    if (!dev) return;

    dev.lastHeartbeat = Date.now();
    if (dev.status !== "online") {
      dev.status = "online";
      this._broadcast({
        type: "device_status",
        deviceId: conn.deviceId,
        status: "online",
        hostname: dev.hostname,
        apps: dev.apps,
      });
    }
  }

  // ── Browser subscription ────────────────────────────────────────────────

  _onBrowserSubscribe(ws) {
    this.sockets.set(ws, { type: "browser" });

    const list = [];
    for (const [id, dev] of this.devices) {
      list.push({
        deviceId: id,
        status: dev.status,
        hostname: dev.hostname,
        apps: dev.apps,
      });
    }
    ws.send(JSON.stringify({ type: "device_list", devices: list }));
  }

  // ── Route command to a specific agent ────────────────────────────────────

  _routeToAgent(msg) {
    const { deviceId, action, name } = msg;
    const dev = this.devices.get(deviceId);

    if (!dev || !dev.ws || dev.status !== "online") {
      this._broadcast({
        type: "cmd_result",
        deviceId,
        action,
        name,
        ok: false,
        message: "设备不在线",
      });
      return;
    }

    try {
      dev.ws.send(JSON.stringify({ type: "cmd", action, name }));
    } catch {
      this._broadcast({
        type: "cmd_result",
        deviceId,
        action,
        name,
        ok: false,
        message: "发送失败",
      });
    }
  }

  // ── Broadcast to all connected browsers ──────────────────────────────────

  _broadcast(msg) {
    const data = JSON.stringify(msg);
    for (const [ws, conn] of this.sockets) {
      if (conn.type === "browser") {
        try { ws.send(data); } catch {}
      }
    }
  }
}
