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
<title>远程控制中心</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",Helvetica,Arial,sans-serif;background:#0f0f1e;color:#e4e6eb;min-height:100vh;display:flex;flex-direction:column;overflow-x:hidden;position:relative}

/* Animated aurora background */
.aurora{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none}
.aurora::before,.aurora::after{content:'';position:absolute;width:60vw;height:60vw;border-radius:50%;filter:blur(80px);opacity:.6}
.aurora::before{top:-20%;left:-10%;background:radial-gradient(circle,#7c3aed 0%,transparent 70%);animation:float1 20s ease-in-out infinite}
.aurora::after{bottom:-20%;right:-10%;background:radial-gradient(circle,#06b6d4 0%,transparent 70%);animation:float2 25s ease-in-out infinite}
.aurora .blob3{position:absolute;top:30%;right:20%;width:40vw;height:40vw;border-radius:50%;filter:blur(80px);opacity:.4;background:radial-gradient(circle,#ec4899 0%,transparent 70%);animation:float3 18s ease-in-out infinite}
@keyframes float1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(20vw,10vh) scale(1.2)}}
@keyframes float2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-15vw,-10vh) scale(1.1)}}
@keyframes float3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-10vw,15vh) scale(1.3)}}

/* Grid overlay */
body::after{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:40px 40px;z-index:0;pointer-events:none}

/* Header */
.header{position:relative;z-index:2;text-align:center;padding:56px 20px 32px}
.header .logo{display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:20px;background:linear-gradient(135deg,#7c3aed,#ec4899);margin-bottom:18px;box-shadow:0 20px 40px -10px rgba(124,58,237,.6),0 0 0 1px rgba(255,255,255,.1) inset;font-size:32px}
.header h1{font-size:32px;font-weight:700;color:#fff;letter-spacing:-.5px;margin-bottom:6px}
.header h1 .gradient{background:linear-gradient(135deg,#a78bfa,#f472b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.header .subtitle{font-size:13px;color:#9ca3af;font-weight:500;letter-spacing:3px;text-transform:uppercase}

/* Glass panel base */
.glass{background:rgba(24,24,42,.7);backdrop-filter:blur(20px) saturate(140%);-webkit-backdrop-filter:blur(20px) saturate(140%);border:1px solid rgba(255,255,255,.08);border-radius:20px;box-shadow:0 20px 60px -20px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.04) inset}

/* Login card */
.login-wrap{position:relative;z-index:2;display:flex;justify-content:center;align-items:center;padding:20px;flex:1}
.login-card{width:100%;max-width:420px;padding:44px 40px;animation:slideUp .6s cubic-bezier(.22,1,.36,1)}
@keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
.login-card h2{color:#fff;font-size:24px;font-weight:600;margin-bottom:6px;letter-spacing:-.3px}
.login-card .hint{color:#9ca3af;font-size:13px;margin-bottom:28px}
.login-card label{display:block;font-size:12px;color:#9ca3af;margin-bottom:8px;font-weight:600;letter-spacing:.5px;text-transform:uppercase}
.login-card input{width:100%;padding:13px 16px;margin-bottom:18px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#fff;font-size:14px;outline:none;transition:all .2s;font-weight:500}
.login-card input::placeholder{color:#4b5563}
.login-card input:focus{border-color:#a78bfa;background:rgba(0,0,0,.4);box-shadow:0 0 0 3px rgba(167,139,250,.15)}
.login-card button{width:100%;padding:13px;background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s;box-shadow:0 8px 24px -8px rgba(124,58,237,.6);letter-spacing:.3px}
.login-card button:hover{transform:translateY(-1px);box-shadow:0 12px 28px -8px rgba(124,58,237,.8)}
.login-card button:active{transform:translateY(0)}
.login-err{color:#f87171;text-align:center;margin-top:14px;font-size:13px;display:none;font-weight:500;padding:10px;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.2);border-radius:10px}

/* Dashboard */
.dashboard{position:relative;z-index:2;display:none;max-width:1280px;margin:0 auto;padding:24px 20px 60px;width:100%}

/* Top bar */
.topbar{display:flex;justify-content:space-between;align-items:center;padding:18px 24px;margin-bottom:20px}
.topbar .user-info{display:flex;align-items:center;gap:12px}
.topbar .avatar{width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,#7c3aed,#ec4899);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:15px}
.topbar .user{font-weight:600;color:#fff;font-size:15px}
.topbar .user small{display:block;color:#9ca3af;font-size:11px;font-weight:400;margin-top:2px}
.topbar button{padding:10px 20px;background:rgba(255,255,255,.05);color:#e4e6eb;border:1px solid rgba(255,255,255,.1);border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;transition:all .2s}
.topbar button:hover{background:rgba(248,113,113,.1);border-color:rgba(248,113,113,.3);color:#f87171}

/* Section header */
.section-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding:0 4px}
.section-head h3{font-size:14px;color:#9ca3af;font-weight:600;letter-spacing:1px;text-transform:uppercase;display:flex;align-items:center;gap:8px}
.section-head h3::before{content:'';width:3px;height:14px;background:linear-gradient(180deg,#a78bfa,#ec4899);border-radius:2px}

/* Token section */
.token-section{padding:22px 24px;margin-bottom:20px}
.btn-primary{padding:9px 18px;background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;transition:all .2s;box-shadow:0 6px 20px -6px rgba(124,58,237,.5)}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 10px 24px -6px rgba(124,58,237,.7)}
.token-list{display:flex;flex-direction:column;gap:10px}
.token-item{display:flex;align-items:center;gap:14px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:14px 18px;font-size:13px;transition:all .2s}
.token-item:hover{border-color:rgba(167,139,250,.3);background:rgba(0,0,0,.35)}
.token-item .tok-label{color:#fff;font-weight:600;min-width:110px;display:flex;align-items:center;gap:8px}
.token-item .tok-label::before{content:'🔑';font-size:14px}
.token-item .tok-id{color:#9ca3af;font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;font-size:11px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.token-item .tok-time{color:#6b7280;font-size:11px;white-space:nowrap}
.token-item button{padding:6px 12px;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid;transition:all .15s;background:transparent}
.btn-copy{color:#60a5fa;border-color:rgba(96,165,250,.3)}
.btn-copy:hover{background:rgba(96,165,250,.15);border-color:#60a5fa}
.btn-revoke{color:#f87171;border-color:rgba(248,113,113,.3)}
.btn-revoke:hover{background:rgba(248,113,113,.15);border-color:#f87171}
.token-empty{color:#6b7280;font-size:13px;text-align:center;padding:20px;background:rgba(0,0,0,.15);border-radius:10px;border:1px dashed rgba(255,255,255,.08)}

/* Toast */
.toast{position:fixed;top:24px;left:50%;transform:translateX(-50%) translateY(-100px);background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:14px 28px;border-radius:12px;font-size:14px;font-weight:600;z-index:9999;opacity:0;transition:all .3s cubic-bezier(.22,1,.36,1);box-shadow:0 20px 40px -10px rgba(16,185,129,.5);display:flex;align-items:center;gap:10px}
.toast::before{content:'✓';font-size:16px;font-weight:700}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}

/* Device grid */
.device-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px;margin-bottom:20px}
.device-card{padding:22px;transition:all .25s;position:relative;overflow:hidden}
.device-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#6b7280,#4b5563);transition:all .3s}
.device-card.online::before{background:linear-gradient(90deg,#10b981,#06b6d4)}
.device-card.online{box-shadow:0 20px 60px -20px rgba(16,185,129,.2),0 0 0 1px rgba(16,185,129,.15) inset}
.device-card:hover{transform:translateY(-3px);box-shadow:0 24px 60px -20px rgba(0,0,0,.5)}
.device-card.offline{opacity:.6}
.device-head{display:flex;align-items:center;gap:12px;margin-bottom:18px}
.dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;position:relative}
.dot.online{background:#10b981}
.dot.online::before{content:'';position:absolute;inset:-4px;border-radius:50%;background:#10b981;opacity:.4;animation:pulse-ring 2s ease-in-out infinite}
@keyframes pulse-ring{0%{transform:scale(1);opacity:.4}100%{transform:scale(2.2);opacity:0}}
.dot.offline{background:#6b7280}
.device-name{font-size:17px;font-weight:600;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:-.2px}
.device-status{font-size:11px;color:#9ca3af;margin-left:auto;font-weight:600;text-transform:uppercase;letter-spacing:1px;padding:4px 10px;border-radius:6px;background:rgba(255,255,255,.05)}
.device-card.online .device-status{color:#10b981;background:rgba(16,185,129,.1)}
.app-row{display:flex;flex-direction:column;gap:8px}
.app-chip{display:flex;align-items:center;gap:10px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:10px 14px;font-size:13px;transition:all .15s}
.app-chip:hover{border-color:rgba(255,255,255,.12);background:rgba(0,0,0,.35)}
.app-chip .app-icon{width:26px;height:26px;border-radius:7px;background:linear-gradient(135deg,#4b5563,#374151);display:flex;align-items:center;justify-content:center;color:#e4e6eb;font-weight:700;font-size:11px;flex-shrink:0}
.device-card.online .app-chip .app-icon{background:linear-gradient(135deg,#7c3aed,#ec4899)}
.app-chip .app-label{color:#e4e6eb;font-weight:500;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.app-chip button{padding:6px 14px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid;transition:all .15s;background:transparent}
.btn-on{color:#10b981;border-color:rgba(16,185,129,.3)}
.btn-on:hover{background:#10b981;color:#fff;border-color:#10b981}
.btn-off{color:#f87171;border-color:rgba(248,113,113,.3)}
.btn-off:hover{background:#f87171;color:#fff;border-color:#f87171}
.app-chip .no-ctrl{font-size:10px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:4px 10px;border-radius:6px;background:rgba(255,255,255,.03)}

/* Empty state */
.empty{text-align:center;padding:60px 20px;color:#9ca3af;grid-column:1/-1;font-size:14px;background:rgba(255,255,255,.02);border-radius:16px;border:1px dashed rgba(255,255,255,.08)}
.empty .empty-icon{font-size:48px;margin-bottom:12px;opacity:.5}
.empty .empty-title{font-size:16px;color:#e4e6eb;font-weight:600;margin-bottom:6px}

/* Log panel */
.log-wrap{padding:20px 24px;max-height:280px;overflow-y:auto}
.log-line{font-size:12px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04);color:#9ca3af;display:flex;align-items:baseline;gap:10px}
.log-line:last-child{border-bottom:none}
.log-line .t{color:#4b5563;font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;font-weight:500;flex-shrink:0;font-size:11px}
.log-line.ok{color:#34d399}
.log-line.err{color:#f87171}
.log-line .msg{flex:1;word-break:break-all}

/* CMD shell */
.cmd-row{display:flex;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.06)}
.cmd-row input{flex:1;padding:9px 12px;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.08);border-radius:8px;color:#e4e6eb;font-size:12px;font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;outline:none;transition:all .15s}
.cmd-row input::placeholder{color:#4b5563}
.cmd-row input:focus{border-color:#a78bfa;background:rgba(0,0,0,.5)}
.cmd-row button{padding:9px 16px;background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap}
.cmd-row button:hover{transform:translateY(-1px);box-shadow:0 6px 16px -6px rgba(124,58,237,.6)}
.cmd-output{margin-top:10px;background:#000;border-radius:10px;padding:12px 14px;font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;font-size:11px;color:#e4e6eb;max-height:180px;overflow-y:auto;white-space:pre-wrap;word-break:break-all;display:none;border:1px solid rgba(255,255,255,.05)}
.cmd-output.show{display:block}
.cmd-output .cmd-ok{color:#34d399;font-weight:600}
.cmd-output .cmd-err{color:#f87171;font-weight:600}

/* Scrollbar */
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(167,139,250,.3);border-radius:10px}
::-webkit-scrollbar-thumb:hover{background:rgba(167,139,250,.5)}

/* Mobile */
@media(max-width:768px){
  .header{padding:36px 15px 20px}
  .header h1{font-size:24px}
  .header .subtitle{font-size:11px;letter-spacing:2px}
  .header .logo{width:52px;height:52px;font-size:26px}
  .login-card{padding:32px 24px}
  .dashboard{padding:16px 12px 40px}
  .device-grid{grid-template-columns:1fr;gap:12px}
  .device-card{padding:18px}
  .topbar{padding:14px 18px;flex-direction:column;gap:14px;align-items:stretch}
  .topbar button{width:100%}
  .topbar .user-info{justify-content:center}
  .token-section{padding:18px}
  .section-head{flex-direction:column;gap:12px;align-items:stretch}
  .token-item{flex-wrap:wrap;padding:12px 14px;gap:10px}
  .token-item .tok-label{min-width:auto;width:100%}
  .token-item .tok-id{width:100%;order:3}
  .token-item .tok-time{order:4}
  .device-name{font-size:15px}
  .log-wrap{padding:16px 18px}
}
</style>
</head>
<body>
<div class="aurora"><div class="blob3"></div></div>

<div class="header">
  <div class="logo">⚡</div>
  <h1><span class="gradient">切盘工具</span></h1>
  <div class="subtitle">Remote Control Center</div>
</div>

<div class="login-wrap" id="loginBlock">
  <div class="login-card glass">
    <h2>欢迎回来</h2>
    <div class="hint">请登录你的管理员账号</div>
    <label for="u">用户名</label>
    <input id="u" autocomplete="username" placeholder="请输入用户名">
    <label for="p">密码</label>
    <input id="p" type="password" autocomplete="current-password" placeholder="请输入密码">
    <button id="loginBtn">登录</button>
    <div class="login-err" id="loginErr"></div>
  </div>
</div>

<div class="dashboard" id="dash">
  <div class="topbar glass">
    <div class="user-info">
      <div class="avatar" id="userAvatar">U</div>
      <div class="user"><span id="userLabel"></span><small>管理员</small></div>
    </div>
    <button id="logoutBtn">退出登录</button>
  </div>

  <div class="token-section glass">
    <div class="section-head">
      <h3>设备令牌</h3>
      <button id="createTokenBtn" class="btn-primary">＋ 生成新令牌</button>
    </div>
    <div class="token-list" id="tokenList">
      <div class="token-empty">加载中…</div>
    </div>
  </div>

  <div class="section-head" style="margin-top:24px">
    <h3>设备列表</h3>
  </div>
  <div class="device-grid" id="grid">
    <div class="empty">
      <div class="empty-icon">🖥️</div>
      <div class="empty-title">暂无设备</div>
      <div>等待 Agent 连接…</div>
    </div>
  </div>

  <div class="section-head" style="margin-top:24px">
    <h3>操作日志</h3>
  </div>
  <div class="log-wrap glass"><div id="log"></div></div>
</div>

<div class="toast" id="toast"></div>

<script>
let token='',ws=null,rTimer=null,devices={},tokenList=[],cmdOut={};
function L(msg,ok){const e=logEl,t=new Date().toLocaleTimeString(),c=ok===true?'ok':ok===false?'err':'';e.innerHTML+='<div class="log-line '+c+'"><span class=t>'+t+'</span><span class=msg>'+msg+'</span></div>';e.parentElement.scrollTop=e.parentElement.scrollHeight}
function $$(id){return document.getElementById(id)}
function toast(msg){const t=$$('toast');t.textContent=msg;t.classList.add('show');setTimeout(function(){t.classList.remove('show')},2500)}
const logEl=$$('log'),grid=$$('grid');

$$('loginBtn').onclick=async function(){
  const u=$$('u').value.trim(),p=$$('p').value.trim();
  if(!u||!p){$$('loginErr').textContent='请输入用户名和密码';$$('loginErr').style.display='block';return}
  const btn=$$('loginBtn'),ot=btn.textContent;btn.textContent='登录中…';btn.disabled=true;
  try{
    const r=await fetch('/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:u,password:p})});
    const d=await r.json();
    if(d.ok){
      token=d.token;
      $$('loginBlock').style.display='none';
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
  ws=new WebSocket(proto+'//'+location.host+'/ws?token='+encodeURIComponent(token));
  ws.onopen=function(){L('已连接到服务器',true);ws.send(JSON.stringify({type:'browser_subscribe'}));if(rTimer){clearTimeout(rTimer);rTimer=null}};
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
  if(!ids.length){grid.innerHTML='<div class=empty><div class=empty-icon>🖥️</div><div class=empty-title>暂无设备</div><div>等待 Agent 连接…</div></div>';return}
  grid.innerHTML=ids.map(function(id){
    var d=devices[id],on=d.status==='online';
    var co=cmdOut[id],coHtml='';
    if(co){coHtml='<div class="cmd-output show"><span class="'+(co.ok?'cmd-ok':'cmd-err')+'">$ '+esc(co.cmd)+'</span>\\n'+esc(co.out||'')+'</div>'}
    else{coHtml='<div class="cmd-output"></div>'}
    return '<div class="device-card glass '+(on?'online':'offline')+'">'
      +'<div class=device-head>'
        +'<span class="dot '+(on?'online':'offline')+'"></span>'
        +'<span class=device-name>'+esc(d.hostname||id)+'</span>'
        +'<span class=device-status>'+(on?'在线':'离线')+'</span>'
      +'</div>'
      +'<div class=app-row>'+(d.apps||[]).map(function(a){
        return '<div class=app-chip>'
          +'<span class=app-icon>'+initials(a)+'</span>'
          +'<span class=app-label>'+esc(a)+'</span>'
          +(on
            ?'<button class=btn-on onclick="S(\\''+id+'\\',\\'start\\',\\''+esc(a)+'\\')">启动</button>'
             +'<button class=btn-off onclick="S(\\''+id+'\\',\\'stop\\',\\''+esc(a)+'\\')">关闭</button>'
            :'<span class=no-ctrl>离线</span>')
          +'</div>';
      }).join('')+'</div>'
      +(on
        ?'<div class=cmd-row><input id="cmdin-'+esc(id)+'" placeholder="输入 CMD 命令…" onkeydown="if(event.key===\\'Enter\\')execCmd(\\''+esc(id)+'\\')"><button onclick="execCmd(\\''+esc(id)+'\\')">执行</button></div>'
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
    var r=await fetch('/tokens?token='+encodeURIComponent(token));
    var d=await r.json();
    if(d.ok){tokenList=d.tokens;renderTokens()}
  }catch(e){}
}

function renderTokens(){
  var el=$$('tokenList');
  if(!tokenList.length){el.innerHTML='<div class=token-empty>暂无设备令牌，点击上方按钮生成</div>';return}
  el.innerHTML=tokenList.map(function(t){
    var d=new Date(t.createdAt),ts=d.toLocaleDateString()+' '+d.toLocaleTimeString();
    var idShort=t.id.substring(0,12)+'…';
    return '<div class=token-item>'
      +'<span class=tok-label>'+esc(t.label||'未命名')+'</span>'
      +'<span class=tok-id title="'+esc(t.id)+'">'+esc(idShort)+'</span>'
      +'<span class=tok-time>'+ts+'</span>'
      +'<button class=btn-copy onclick="copyToken(\\''+t.id+'\\')">复制</button>'
      +'<button class=btn-revoke onclick="revokeToken(\\''+t.id+'\\')">撤销</button>'
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
    }else{L('创建令牌失败: '+(d.error||'未知错误'),false)}
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
  $$('dash').style.display='none';
  $$('u').value='';$$('p').value='';
  grid.innerHTML='<div class=empty><div class=empty-icon>🖥️</div><div class=empty-title>暂无设备</div><div>等待 Agent 连接…</div></div>';
  logEl.innerHTML='';
  $$('tokenList').innerHTML='<div class=token-empty>加载中…</div>';
};
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
