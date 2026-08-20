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
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>远程控制中心 — 切盘工具</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;1,9..144,400&family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600&display=swap" rel="stylesheet">
<style>
/* ============================================================
   CSS Custom Properties
   ============================================================ */
:root {
  --bg:            #F7F4EF;
  --bg-alt:        #FBF9F5;
  --surface:        #FFFFFF;
  --border:         #E7E1D7;
  --border-light:   #F0EBE3;
  --text:           #1F2421;
  --text-secondary: #5C635D;
  --text-muted:     #9CA3AF;
  --accent:         #C4612F;
  --accent-hover:   #A94E22;
  --accent-soft:    #F2E3D6;
  --accent-glow:    rgba(196,97,47,.12);
  --success:        #4A9E6B;
  --danger:         #C44B4B;
  --radius-sm:      10px;
  --radius:         14px;
  --radius-lg:      20px;
  --radius-full:    999px;
  --shadow-sm:      0 1px 2px rgba(31,36,33,.04);
  --shadow:         0 2px 8px rgba(31,36,33,.06);
  --shadow-lg:      0 8px 30px rgba(31,36,33,.10);
  --font-serif:     'Fraunces', 'Songti SC', 'Noto Serif SC', 'STSong', serif;
  --font-sans:      'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", Helvetica, Arial, sans-serif;
  --font-mono:      ui-monospace, 'SF Mono', 'Cascadia Code', 'Consolas', 'Monaco', monospace;
  --ease-out:       cubic-bezier(.22, 1, .36, 1);
  --ease-spring:    cubic-bezier(.34, 1.56, .64, 1);
}

/* ============================================================
   Reset & Base
   ============================================================ */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
body{
  font-family:var(--font-sans);
  background:var(--bg);
  color:var(--text);
  min-height:100vh;
  display:flex;
  flex-direction:column;
  overflow-x:hidden;
  font-weight:300;
  line-height:1.6;
  background-image:
    radial-gradient(ellipse 80% 60% at 50% -20%, rgba(196,97,47,.04) 0%, transparent 100%),
    radial-gradient(ellipse 40% 30% at 80% 80%, rgba(196,97,47,.02) 0%, transparent 100%);
}

/* ============================================================
   Header
   ============================================================ */
.header{
  position:relative;z-index:2;text-align:center;
  padding:clamp(40px,8vw,90px) 20px clamp(24px,5vw,48px);
  max-width:1200px;margin:0 auto;width:100%;
}
.header .eyebrow{
  display:inline-flex;align-items:center;gap:6px;
  padding:5px 18px;background:var(--accent-soft);
  color:var(--accent);font-size:11px;font-weight:600;
  letter-spacing:1.8px;text-transform:uppercase;
  border-radius:var(--radius-full);margin-bottom:24px;
  border:1px solid rgba(196,97,47,.15);
}
.header .eyebrow::before{content:'';width:5px;height:5px;border-radius:50%;background:var(--accent)}
.header h1{
  font-family:var(--font-serif);font-size:clamp(32px,7vw,60px);
  font-weight:400;color:var(--text);letter-spacing:-1.8px;
  margin-bottom:20px;line-height:1.1;
}
.header h1 .highlight{font-style:italic;color:var(--accent);position:relative}
.header h1 .highlight::after{
  content:'';position:absolute;bottom:2px;left:0;right:0;
  height:3px;background:var(--accent-soft);border-radius:2px;z-index:-1;
}
.header .subtitle{
  font-size:clamp(15px,2vw,18px);color:var(--text-secondary);
  font-weight:300;max-width:520px;margin:0 auto;line-height:1.7;
}

/* ============================================================
   Navigation Bar
   ============================================================ */
.nav{
  position:sticky;top:0;z-index:100;
  background:rgba(251,249,245,.82);
  backdrop-filter:blur(16px) saturate(180%);
  -webkit-backdrop-filter:blur(16px) saturate(180%);
  border-bottom:1px solid var(--border);
  padding:14px 0;margin-bottom:44px;
  transition:box-shadow .3s;
}
.nav.scrolled{box-shadow:0 1px 20px rgba(31,36,33,.06)}
.nav-inner{
  max-width:1200px;margin:0 auto;padding:0 24px;
  display:flex;justify-content:space-between;align-items:center;
  gap:16px;
}
.nav .brand{
  font-family:var(--font-serif);font-size:22px;
  color:var(--text);font-weight:400;letter-spacing:-.5px;
  display:flex;align-items:center;gap:8px;
}
.nav .brand-dot{width:8px;height:8px;border-radius:50%;background:var(--accent)}
.nav .user-info{display:flex;align-items:center;gap:14px}
.nav .avatar{
  width:38px;height:38px;border-radius:var(--radius-full);
  background:linear-gradient(135deg,var(--accent),var(--accent-hover));
  display:flex;align-items:center;justify-content:center;
  color:var(--surface);font-weight:600;font-size:14px;
  box-shadow:0 2px 8px rgba(196,97,47,.2);
}
.nav .username{font-weight:500;color:var(--text);font-size:15px}

/* ============================================================
   Card Base
   ============================================================ */
.card{
  background:var(--surface);
  border:1px solid var(--border);
  border-radius:var(--radius-lg);
  box-shadow:var(--shadow-sm);
  transition:box-shadow .25s, transform .25s, border-color .25s;
}

/* ============================================================
   Login Page
   ============================================================ */
.login-wrap{
  position:relative;z-index:2;display:flex;
  justify-content:center;align-items:center;
  padding:20px 20px 60px;flex:1;
}
.login-card{
  width:100%;max-width:440px;padding:clamp(32px,5vw,52px);
  animation:slideUp .7s var(--ease-out);
}
@keyframes slideUp{
  from{opacity:0;transform:translateY(32px)}
  to{opacity:1;transform:translateY(0)}
}
.login-card .login-icon{
  width:56px;height:56px;border-radius:var(--radius);
  background:linear-gradient(135deg,var(--accent-soft),var(--accent));
  display:flex;align-items:center;justify-content:center;
  margin:0 auto 24px;font-size:26px;
  box-shadow:0 4px 16px rgba(196,97,47,.15);
}
.login-card h2{
  font-family:var(--font-serif);color:var(--text);
  font-size:clamp(26px,4vw,34px);font-weight:400;
  margin-bottom:8px;letter-spacing:-.8px;text-align:center;
}
.login-card .hint{
  color:var(--text-secondary);font-size:15px;
  margin-bottom:36px;font-weight:300;text-align:center;
}
.login-card .field-group{margin-bottom:20px}
.login-card label{
  display:block;font-size:12px;color:var(--text-secondary);
  margin-bottom:6px;font-weight:500;letter-spacing:.3px;
  text-transform:uppercase;
}
.login-card input{
  width:100%;padding:14px 16px;
  background:var(--bg-alt);border:1px solid var(--border);
  border-radius:var(--radius);color:var(--text);
  font-size:15px;outline:none;transition:all .2s;
  font-weight:400;font-family:var(--font-sans);
}
.login-card input::placeholder{color:var(--text-muted)}
.login-card input:focus{
  border-color:var(--accent);background:var(--surface);
  box-shadow:0 0 0 4px var(--accent-glow);
}
.login-card .btn-login{
  width:100%;padding:14px;margin-top:8px;
  background:linear-gradient(135deg,var(--accent),var(--accent-hover));
  color:#FFFFFF;border:none;border-radius:var(--radius-full);
  font-size:15px;font-weight:500;cursor:pointer;
  transition:all .25s var(--ease-out);
  letter-spacing:.3px;position:relative;overflow:hidden;
}
.login-card .btn-login:hover{
  transform:translateY(-2px);
  box-shadow:0 6px 20px rgba(196,97,47,.30);
}
.login-card .btn-login:active{transform:translateY(0)}
.login-card .btn-login:disabled{
  opacity:.7;cursor:not-allowed;transform:none;
}
.login-err{
  color:var(--accent);text-align:center;margin-top:18px;
  font-size:14px;display:none;font-weight:400;
  padding:12px 16px;background:var(--accent-soft);
  border:1px solid rgba(196,97,47,.2);
  border-radius:var(--radius-sm);
  animation:shake .4s ease;
}
@keyframes shake{
  0%,100%{transform:translateX(0)}
  20%{transform:translateX(-6px)}
  40%{transform:translateX(6px)}
  60%{transform:translateX(-4px)}
  80%{transform:translateX(4px)}
}

/* ============================================================
   Dashboard
   ============================================================ */
.dashboard{
  position:relative;z-index:2;display:none;
  max-width:1200px;margin:0 auto;
  padding:0 24px 80px;width:100%;
  animation:fadeIn .5s var(--ease-out);
}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}

/* ============================================================
   Section Headers
   ============================================================ */
.section-head{
  display:flex;justify-content:space-between;
  align-items:center;margin-bottom:20px;padding:0 4px;
  gap:16px;
}
.section-head h3{
  font-family:var(--font-serif);font-size:clamp(20px,3vw,26px);
  color:var(--text);font-weight:400;letter-spacing:-.5px;
}
.section-head .count{
  font-family:var(--font-sans);font-size:13px;font-weight:400;
  color:var(--text-muted);margin-left:8px;
}

/* ============================================================
   Buttons
   ============================================================ */
.btn-primary{
  padding:11px 24px;
  background:linear-gradient(135deg,var(--accent),var(--accent-hover));
  color:#FFFFFF;border:none;border-radius:var(--radius-full);
  cursor:pointer;font-size:14px;font-weight:500;
  transition:all .25s var(--ease-out);
  letter-spacing:.2px;display:inline-flex;align-items:center;gap:8px;
}
.btn-primary:hover{
  transform:translateY(-2px);
  box-shadow:0 6px 20px rgba(196,97,47,.30);
}
.btn-primary:active{transform:translateY(0)}
.btn-secondary{
  padding:9px 20px;background:var(--bg-alt);
  color:var(--text-secondary);border:1px solid var(--border);
  border-radius:var(--radius-full);cursor:pointer;
  font-size:14px;font-weight:500;transition:all .2s;
}
.btn-secondary:hover{
  background:var(--surface);border-color:var(--accent);
  color:var(--accent);
}

/* ============================================================
   Token Section
   ============================================================ */
.token-section{padding:clamp(20px,4vw,36px);margin-bottom:36px}
.token-list{display:flex;flex-direction:column;gap:10px;margin-top:20px}
.token-item{
  display:flex;align-items:center;gap:16px;
  background:var(--bg-alt);border:1px solid var(--border-light);
  border-radius:var(--radius);padding:14px 20px;
  font-size:14px;transition:all .2s;
}
.token-item:hover{
  border-color:var(--accent);background:var(--surface);
  transform:translateY(-1px);box-shadow:var(--shadow);
}
.token-item .tok-label{
  color:var(--text);font-weight:500;min-width:100px;
  display:flex;align-items:center;gap:10px;
}
.token-item .tok-label::before{content:'🔑';font-size:15px}
.token-item .tok-id{
  color:var(--text-secondary);font-family:var(--font-mono);
  font-size:12px;flex:1;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap;
  background:var(--surface);padding:4px 10px;border-radius:6px;
  border:1px solid var(--border-light);
}
.token-item .tok-time{
  color:var(--text-muted);font-size:12px;white-space:nowrap;font-weight:400;
}
.token-item .tok-actions{display:flex;gap:8px;flex-shrink:0}
.token-item button{
  padding:7px 15px;border-radius:var(--radius-full);
  font-size:12px;font-weight:500;cursor:pointer;
  border:1px solid;transition:all .15s;background:transparent;
}
.btn-copy{color:var(--accent);border-color:var(--border)}
.btn-copy:hover{background:var(--accent-soft);border-color:var(--accent)}
.btn-revoke{color:var(--text-secondary);border-color:var(--border)}
.btn-revoke:hover{background:var(--border);border-color:var(--text-secondary)}
.token-empty{
  color:var(--text-secondary);font-size:14px;text-align:center;
  padding:40px 20px;background:var(--bg-alt);
  border-radius:var(--radius);border:1px dashed var(--border);
  font-weight:300;
}
.token-empty .empty-icon{font-size:40px;margin-bottom:12px;opacity:.5}

/* Token skeleton loader */
.token-skeleton{
  display:flex;align-items:center;gap:16px;
  padding:14px 20px;background:var(--bg-alt);
  border:1px solid var(--border-light);border-radius:var(--radius);
  animation:shimmer 1.5s infinite;
}
.token-skeleton .skel{height:14px;border-radius:6px;background:linear-gradient(90deg,var(--border) 25%,var(--border-light) 50%,var(--border) 75%);background-size:200% 100%}
.token-skeleton .skel-name{width:100px}
.token-skeleton .skel-id{flex:1;max-width:200px}
.token-skeleton .skel-time{width:120px}
.token-skeleton .skel-btn{width:60px;height:28px;border-radius:var(--radius-full)}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

/* ============================================================
   Toast Notification
   ============================================================ */
.toast{
  position:fixed;top:28px;left:50%;z-index:9999;
  transform:translateX(-50%) translateY(-120px);
  background:var(--text);color:var(--surface);
  padding:12px 24px;border-radius:var(--radius-full);
  font-size:14px;font-weight:500;opacity:0;
  transition:all .35s var(--ease-spring);
  box-shadow:0 8px 32px rgba(31,36,33,.20);
  display:flex;align-items:center;gap:10px;
  pointer-events:none;
}
.toast::before{content:'✓';font-size:15px;font-weight:700}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
.toast.error{background:var(--danger)}
.toast.error::before{content:'✕'}

/* ============================================================
   Device Grid
   ============================================================ */
.device-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(380px,1fr));
  gap:22px;margin-bottom:40px;
}
.device-card{
  padding:clamp(20px,3vw,32px);
  position:relative;overflow:hidden;
  animation:cardIn .4s var(--ease-out) both;
}
@keyframes cardIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.device-card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:3px;
  background:var(--border);transition:all .4s var(--ease-out);
}
.device-card.online::before{
  background:linear-gradient(90deg,var(--accent),var(--success));
}
.device-card:hover{
  transform:translateY(-3px);
  box-shadow:var(--shadow-lg);
}
.device-card.offline{opacity:.55;filter:grayscale(.3)}
.device-card.offline:hover{opacity:.7;filter:grayscale(.1)}
.device-head{
  display:flex;align-items:center;gap:12px;margin-bottom:22px;
}
.status-badge{
  display:flex;align-items:center;gap:8px;
  padding:5px 14px;border-radius:var(--radius-full);
  font-size:11px;font-weight:600;letter-spacing:.4px;
  text-transform:uppercase;flex-shrink:0;
}
.status-badge.online{background:var(--accent-soft);color:var(--accent)}
.status-badge.offline{background:var(--border);color:var(--text-secondary)}
.status-badge::before{
  content:'';width:7px;height:7px;border-radius:50%;flex-shrink:0;
}
.status-badge.online::before{
  background:var(--accent);
  box-shadow:0 0 0 3px rgba(196,97,47,.2);
  animation:pulse 2s ease-in-out infinite;
}
.status-badge.offline::before{background:var(--text-muted)}
@keyframes pulse{
  0%,100%{box-shadow:0 0 0 3px rgba(196,97,47,.2)}
  50%{box-shadow:0 0 0 6px rgba(196,97,47,.08)}
}
.device-name{
  font-family:var(--font-serif);font-size:clamp(17px,2.5vw,22px);
  font-weight:400;color:var(--text);
  overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap;letter-spacing:-.3px;flex:1;
}

/* App chips */
.app-row{display:flex;flex-direction:column;gap:8px}
.app-chip{
  display:flex;align-items:center;gap:12px;
  background:var(--bg-alt);border:1px solid var(--border-light);
  border-radius:var(--radius);padding:10px 14px;
  font-size:14px;transition:all .2s;
}
.app-chip:hover{border-color:var(--accent);background:var(--surface)}
.app-chip .app-icon{
  width:34px;height:34px;border-radius:var(--radius-sm);
  background:var(--accent-soft);display:flex;
  align-items:center;justify-content:center;
  color:var(--accent);font-weight:700;font-size:11px;
  flex-shrink:0;letter-spacing:.5px;
  transition:all .2s;
}
.device-card.online .app-chip .app-icon{
  background:linear-gradient(135deg,var(--accent),var(--accent-hover));
  color:#FFFFFF;
}
.app-chip .app-label{
  color:var(--text);font-weight:400;flex:1;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.app-chip .app-actions{display:flex;gap:6px;flex-shrink:0}
.app-chip button{
  padding:7px 15px;border-radius:var(--radius-full);
  font-size:12px;font-weight:500;cursor:pointer;
  border:1px solid;transition:all .15s;background:transparent;
  white-space:nowrap;
}
.btn-on{color:var(--accent);border-color:var(--border)}
.btn-on:hover{background:var(--accent);color:#FFFFFF;border-color:var(--accent)}
.btn-off{color:var(--text-secondary);border-color:var(--border)}
.btn-off:hover{background:var(--text-secondary);color:#FFFFFF;border-color:var(--text-secondary)}
.app-chip .no-ctrl{
  font-size:11px;color:var(--text-muted);font-weight:500;
  padding:5px 12px;border-radius:var(--radius-full);
  background:var(--bg);
}

/* ============================================================
   CMD Terminal
   ============================================================ */
.cmd-row{
  display:flex;gap:8px;margin-top:18px;padding-top:18px;
  border-top:1px solid var(--border-light);
}
.cmd-row .cmd-prompt{
  color:var(--text-muted);font-family:var(--font-mono);
  font-size:14px;display:flex;align-items:center;
  padding:0 2px;flex-shrink:0;
}
.cmd-row input{
  flex:1;padding:9px 14px;background:var(--bg-alt);
  border:1px solid var(--border);border-radius:var(--radius-sm);
  color:var(--text);font-size:13px;font-family:var(--font-mono);
  outline:none;transition:all .15s;font-weight:400;
}
.cmd-row input::placeholder{color:var(--text-muted)}
.cmd-row input:focus{border-color:var(--accent);background:var(--surface)}
.cmd-row .btn-cmd{
  padding:9px 16px;background:var(--text);color:var(--surface);
  border:none;border-radius:var(--radius-sm);font-size:12px;
  font-weight:500;cursor:pointer;transition:all .15s;
  font-family:var(--font-mono);white-space:nowrap;
}
.cmd-row .btn-cmd:hover{background:var(--accent);transform:translateY(-1px)}
.cmd-output{
  margin-top:12px;background:#1A1D1B;border-radius:var(--radius);
  padding:16px;font-family:var(--font-mono);font-size:12px;
  color:#D4D9D6;max-height:220px;overflow-y:auto;
  white-space:pre-wrap;word-break:break-all;display:none;
  border:1px solid #333;
  line-height:1.5;
}
.cmd-output.show{display:block}
.cmd-output .cmd-ok{color:#6BCB8A;font-weight:500}
.cmd-output .cmd-err{color:#E8A87C;font-weight:500}
.cmd-output .cmd-prompt-line{color:#6BCB8A;margin-bottom:4px}

/* ============================================================
   Empty State
   ============================================================ */
.empty{
  text-align:center;padding:clamp(40px,8vw,80px) 20px;
  color:var(--text-secondary);grid-column:1/-1;
  font-size:15px;background:var(--bg-alt);
  border-radius:var(--radius-lg);border:1px dashed var(--border);
  font-weight:300;
}
.empty .empty-icon{font-size:clamp(40px,8vw,64px);margin-bottom:16px;opacity:.5}
.empty .empty-title{
  font-family:var(--font-serif);font-size:clamp(18px,3vw,22px);
  color:var(--text);font-weight:400;margin-bottom:8px;
  letter-spacing:-.3px;
}
.empty .empty-sub{font-size:14px;color:var(--text-muted)}

/* ============================================================
   Log Panel
   ============================================================ */
.log-wrap{
  padding:clamp(16px,3vw,28px);
  max-height:340px;overflow-y:auto;
}
.log-line{
  font-size:13px;padding:9px 0;border-bottom:1px solid var(--border-light);
  color:var(--text-secondary);display:flex;
  align-items:baseline;gap:10px;font-weight:300;
  transition:background .15s;
}
.log-line:hover{background:var(--bg-alt);margin:0 -16px;padding-left:16px;padding-right:16px}
.log-line:last-child{border-bottom:none}
.log-line .t{
  color:var(--text-muted);font-family:var(--font-mono);
  font-weight:400;flex-shrink:0;font-size:11px;
}
.log-line.ok{color:var(--accent);font-weight:400}
.log-line.ok .t{color:var(--accent)}
.log-line.err{color:var(--text-secondary);font-weight:400}
.log-line .msg{flex:1;word-break:break-all}

/* ============================================================
   Scrollbar
   ============================================================ */
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:10px}
::-webkit-scrollbar-thumb:hover{background:var(--accent)}

/* ============================================================
   Responsive
   ============================================================ */
@media(max-width:768px){
  .header{padding:36px 20px 28px}
  .header .eyebrow{font-size:10px;padding:4px 14px;letter-spacing:1.2px}
  .login-card{padding:32px 24px}
  .dashboard{padding:0 14px 50px}
  .device-grid{grid-template-columns:1fr;gap:14px}
  .device-card{padding:22px}
  .nav-inner{flex-wrap:wrap;gap:12px;justify-content:center}
  .nav .user-info{flex-wrap:wrap;justify-content:center}
  .token-section{padding:20px}
  .section-head{flex-direction:column;gap:12px;align-items:stretch}
  .section-head .btn-primary{justify-content:center}
  .token-item{flex-wrap:wrap;padding:12px 14px;gap:10px}
  .token-item .tok-label{min-width:auto;width:100%}
  .token-item .tok-id{width:100%;order:3}
  .token-item .tok-time{order:4}
  .token-item .tok-actions{order:5;width:100%;justify-content:flex-end}
  .device-name{font-size:17px}
  .log-wrap{padding:18px}
  .cmd-row{flex-wrap:wrap}
  .cmd-row .cmd-prompt{display:none}
  .cmd-row input{min-width:100%}
  .app-chip{flex-wrap:wrap;gap:8px}
  .app-chip .app-actions{width:100%;justify-content:flex-end}
}
@media(max-width:480px){
  .device-grid{grid-template-columns:1fr}
  .token-item .tok-actions{flex-direction:column;gap:6px}
  .token-item button{width:100%;text-align:center}
}
</style>
</head>
<body>

<!-- ============================================================
     Header
     ============================================================ -->
<div class="header">
  <div class="eyebrow">远程控制系统</div>
  <h1>切盘<span class="highlight">工具</span></h1>
  <div class="subtitle">集中管理您的游戏设备，远程控制应用启动与关闭</div>
</div>

<!-- ============================================================
     Login
     ============================================================ -->
<div class="login-wrap" id="loginBlock">
  <div class="login-card card">
    <div class="login-icon">🖥️</div>
    <h2>欢迎回来</h2>
    <div class="hint">请登录您的管理员账号</div>
    <div class="field-group">
      <label for="u">用户名</label>
      <input id="u" autocomplete="username" placeholder="请输入用户名">
    </div>
    <div class="field-group">
      <label for="p">密码</label>
      <input id="p" type="password" autocomplete="current-password" placeholder="请输入密码">
    </div>
    <button id="loginBtn" class="btn-login">登录</button>
    <div class="login-err" id="loginErr"></div>
  </div>
</div>

<!-- ============================================================
     Navigation
     ============================================================ -->
<div class="nav" id="navBar" style="display:none">
  <div class="nav-inner">
    <div class="brand"><span class="brand-dot"></span>切盘工具</div>
    <div class="user-info">
      <div class="avatar" id="userAvatar">U</div>
      <div class="username" id="userLabel"></div>
      <button class="btn-secondary" id="logoutBtn">退出登录</button>
    </div>
  </div>
</div>

<!-- ============================================================
     Dashboard
     ============================================================ -->
<div class="dashboard" id="dash">

  <!-- Token Management -->
  <div class="token-section card">
    <div class="section-head">
      <h3>设备令牌</h3>
      <button id="createTokenBtn" class="btn-primary">＋ 生成新令牌</button>
    </div>
    <div class="token-list" id="tokenList">
      <div class="token-skeleton"><div class="skel skel-name"></div><div class="skel skel-id"></div><div class="skel skel-time"></div><div class="skel skel-btn"></div></div>
      <div class="token-skeleton"><div class="skel skel-name"></div><div class="skel skel-id"></div><div class="skel skel-time"></div><div class="skel skel-btn"></div></div>
    </div>
  </div>

  <!-- Device List -->
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

  <!-- Operation Log -->
  <div class="section-head" style="margin-top:44px">
    <h3>操作日志</h3>
  </div>
  <div class="log-wrap card"><div id="log"></div></div>
</div>

<!-- ============================================================
     Toast
     ============================================================ -->
<div class="toast" id="toast"></div>

<script>
let token=[REDACTED],ws=null,rTimer=null,devices={},tokenList=[],cmdOut={};
function L(msg,ok){const e=logEl,t=new Date().toLocaleTimeString(),c=ok===true?'ok':ok===false?'err':'';e.innerHTML+='<div class="log-line '+c+'"><span class=t>'+t+'</span><span class=msg>'+msg+'</span></div>';e.parentElement.scrollTop=e.parentElement.scrollHeight}
function $$(id){return document.getElementById(id)}
function toast(msg,isErr){const t=$$('toast');t.textContent=msg;t.className='toast'+(isErr?' error':'');t.classList.add('show');setTimeout(function(){t.classList.remove('show')},2500)}
const logEl=$$('log'),grid=$$('grid');

$$('loginBtn').onclick=async function(){
  const u=$$('u').value.trim(),p=$$('p').value.trim();
  if(!u||!p){$$('loginErr').textContent='请输入用户名和密码';$$('loginErr').style.display='block';return}
  const btn=$$('loginBtn'),ot=btn.textContent;btn.textContent='登录中…';btn.disabled=true;
  try{
    const r=await fetch('/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:u,password:[REDACTED]})});
    const d=await r.json();
    if(d.ok){
      token=[REDACTED];
      $$('loginBlock').style.display='none';
      $$('navBar').style.display='block';
      $$('dash').style.display='block';
      $$('userLabel').textContent=d.username;
      $$('userAvatar').textContent=(d.username||'U')[0].toUpperCase();
      $$('loginErr').style.display='none';
      L('登录成功');connect();loadTokens();
    }else{$$('loginErr').textContent=d.error||'登录失败';$$('loginErr').style.display='block'}
  }catch(e){$$('loginErr').textContent='网络错误';$$('loginErr').style.display='block'}
  finally{btn.textContent=ot;btn.disabled=false}
};
$$('p').onkeydown=function(e){if(e.key==='Enter')$$('loginBtn').click()};
$$('u').onkeydown=function(e){if(e.key==='Enter')$$('p').focus()};

function connect(){
  if(ws){try{ws.close()}catch(e){}}
  var proto=location.protocol==='https:'?'wss:':'ws:';
  ws=new WebSocket(proto+'//'+location.host+'/ws?token=[REDACTED]已连接到服务器',true);ws.send(JSON.stringify({type:'browser_subscribe'}));if(rTimer){clearTimeout(rTimer);rTimer=null}};
  ws.onmessage=function(e){try{handle(JSON.parse(e.data))}catch(ex){}};
  ws.onclose=function(){L('连接断开，5秒后重连…',false);if(!rTimer)rTimer=setTimeout(connect,5000)};
  ws.onerror=function(){};
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
              +'<button class=btn-on onclick="S(\\''+id+'\\',\\'start\\',\\''+esc(a)+'\\')">启动</button>'
              +'<button class=btn-off onclick="S(\\''+id+'\\',\\'stop\\',\\''+esc(a)+'\\')">关闭</button>'
              +'</span>'
            :'<span class=no-ctrl>离线</span>')
          +'</div>';
      }).join('')+'</div>'
      +(on
        ?'<div class=cmd-row><span class=cmd-prompt>&gt;</span><input id="cmdin-'+esc(id)+'" placeholder="输入命令…" onkeydown="if(event.key===\\'Enter\\')execCmd(\\''+esc(id)+'\\')"><button class=btn-cmd onclick="execCmd(\\''+esc(id)+'\\')">执行</button></div>'
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
    var r=await fetch('/tokens?token=[REDACTED]tokenList');
  if(!tokenList.length){el.innerHTML='<div class=token-empty><div class=empty-icon>🔑</div>暂无设备令牌，点击上方按钮生成</div>';return}
  el.innerHTML=tokenList.map(function(t){
    var d=new Date(t.createdAt),ts=d.toLocaleDateString()+' '+d.toLocaleTimeString();
    var idShort=t.id.substring(0,12)+'…';
    return '<div class=token-item>'
      +'<span class=tok-label>'+esc(t.label||'未命名')+'</span>'
      +'<span class=tok-id title="'+esc(t.id)+'">'+esc(idShort)+'</span>'
      +'<span class=tok-time>'+ts+'</span>'
      +'<span class=tok-actions>'
        +'<button class=btn-copy onclick="copyToken(\\''+t.id+'\\')">复制</button>'
        +'<button class=btn-revoke onclick="revokeToken(\\''+t.id+'\\')">撤销</button>'
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
    var r=await fetch('/revoke-token',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:token,targetToken:[REDACTED]})});
    var d=await r.json();
    if(d.ok){toast('令牌已撤销');L('令牌已撤销',true);loadTokens()}
    else{L('撤销失败: '+(d.error||'未知错误'),false)}
  }catch(e){L('网络错误',false)}
}

$$('logoutBtn').onclick=function(){
  if(ws)ws.close();
  token=[REDACTED];devices={};tokenList=[];
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
