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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",Helvetica,Arial,sans-serif;background:#F7F4EF;color:#1F2421;min-height:100vh;display:flex;flex-direction:column;overflow-x:hidden;position:relative;font-weight:300;line-height:1.6}

/* Header */
.header{position:relative;z-index:2;text-align:center;padding:80px 20px 48px;max-width:1200px;margin:0 auto;width:100%}
.header .eyebrow{display:inline-block;padding:6px 16px;background:#F2E3D6;color:#C4612F;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;border-radius:999px;margin-bottom:20px}
.header h1{font-family:'Fraunces',serif;font-size:56px;font-weight:400;color:#1F2421;letter-spacing:-1.5px;margin-bottom:16px;line-height:1.1}
.header h1 .highlight{font-style:italic;color:#C4612F}
.header .subtitle{font-size:18px;color:#5C635D;font-weight:300;max-width:560px;margin:0 auto;line-height:1.6}

/* Sticky nav */
.nav{position:sticky;top:0;z-index:100;background:rgba(251,249,245,.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid #E7E1D7;padding:16px 0;margin-bottom:40px}
.nav-inner{max-width:1200px;margin:0 auto;padding:0 20px;display:flex;justify-content:space-between;align-items:center}
.nav .brand{font-family:'Fraunces',serif;font-size:20px;color:#1F2421;font-weight:400;letter-spacing:-.5px}
.nav .user-info{display:flex;align-items:center;gap:12px}
.nav .avatar{width:36px;height:36px;border-radius:999px;background:#C4612F;display:flex;align-items:center;justify-content:center;color:#FBF9F5;font-weight:600;font-size:14px}
.nav .username{font-weight:500;color:#1F2421;font-size:15px}

/* Card base */
.card{background:#FFFFFF;border:1px solid #E7E1D7;border-radius:16px;box-shadow:0 1px 3px rgba(31,36,33,.04)}

/* Login card */
.login-wrap{position:relative;z-index:2;display:flex;justify-content:center;align-items:center;padding:40px 20px;flex:1}
.login-card{width:100%;max-width:440px;padding:48px;animation:slideUp .6s cubic-bezier(.22,1,.36,1)}
@keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
.login-card h2{font-family:'Fraunces',serif;color:#1F2421;font-size:32px;font-weight:400;margin-bottom:8px;letter-spacing:-.8px}
.login-card .hint{color:#5C635D;font-size:15px;margin-bottom:32px;font-weight:300}
.login-card label{display:block;font-size:13px;color:#5C635D;margin-bottom:8px;font-weight:500}
.login-card input{width:100%;padding:14px 16px;margin-bottom:20px;background:#FBF9F5;border:1px solid #E7E1D7;border-radius:12px;color:#1F2421;font-size:15px;outline:none;transition:all .2s;font-weight:400}
.login-card input::placeholder{color:#9CA3AF}
.login-card input:focus{border-color:#C4612F;background:#FFFFFF;box-shadow:0 0 0 3px rgba(196,97,47,.08)}
.login-card button{width:100%;padding:14px;background:#C4612F;color:#FFFFFF;border:none;border-radius:999px;font-size:15px;font-weight:500;cursor:pointer;transition:all .2s;letter-spacing:.3px}
.login-card button:hover{background:#A94E22;transform:translateY(-2px);box-shadow:0 4px 12px rgba(196,97,47,.25)}
.login-card button:active{transform:translateY(0)}
.login-err{color:#C4612F;text-align:center;margin-top:16px;font-size:14px;display:none;font-weight:400;padding:12px;background:#F2E3D6;border:1px solid #E7E1D7;border-radius:10px}

/* Dashboard */
.dashboard{position:relative;z-index:2;display:none;max-width:1200px;margin:0 auto;padding:0 20px 80px;width:100%}

/* Section header */
.section-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding:0 4px}
.section-head h3{font-family:'Fraunces',serif;font-size:24px;color:#1F2421;font-weight:400;letter-spacing:-.5px}

/* Buttons */
.btn-primary{padding:12px 24px;background:#C4612F;color:#FFFFFF;border:none;border-radius:999px;cursor:pointer;font-size:14px;font-weight:500;transition:all .2s;letter-spacing:.2px}
.btn-primary:hover{background:#A94E22;transform:translateY(-2px);box-shadow:0 4px 12px rgba(196,97,47,.25)}
.btn-secondary{padding:10px 20px;background:#FBF9F5;color:#5C635D;border:1px solid #E7E1D7;border-radius:999px;cursor:pointer;font-size:14px;font-weight:500;transition:all .2s}
.btn-secondary:hover{background:#FFFFFF;border-color:#C4612F;color:#C4612F}

/* Token section */
.token-section{padding:32px;margin-bottom:32px}
.token-list{display:flex;flex-direction:column;gap:12px;margin-top:20px}
.token-item{display:flex;align-items:center;gap:16px;background:#FBF9F5;border:1px solid #E7E1D7;border-radius:12px;padding:16px 20px;font-size:14px;transition:all .2s}
.token-item:hover{border-color:#C4612F;background:#FFFFFF;transform:translateY(-1px);box-shadow:0 2px 8px rgba(31,36,33,.06)}
.token-item .tok-label{color:#1F2421;font-weight:500;min-width:120px;display:flex;align-items:center;gap:10px}
.token-item .tok-label::before{content:'🔑';font-size:16px}
.token-item .tok-id{color:#5C635D;font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;font-size:12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.token-item .tok-time{color:#9CA3AF;font-size:12px;white-space:nowrap;font-weight:400}
.token-item button{padding:8px 16px;border-radius:999px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid;transition:all .15s;background:transparent}
.btn-copy{color:#C4612F;border-color:#E7E1D7}
.btn-copy:hover{background:#F2E3D6;border-color:#C4612F}
.btn-revoke{color:#5C635D;border-color:#E7E1D7}
.btn-revoke:hover{background:#E7E1D7;border-color:#5C635D}
.token-empty{color:#5C635D;font-size:14px;text-align:center;padding:32px;background:#FBF9F5;border-radius:12px;border:1px dashed #E7E1D7;font-weight:300}

/* Toast */
.toast{position:fixed;top:24px;left:50%;transform:translateX(-50%) translateY(-100px);background:#C4612F;color:#FFFFFF;padding:14px 28px;border-radius:999px;font-size:14px;font-weight:500;z-index:9999;opacity:0;transition:all .3s cubic-bezier(.22,1,.36,1);box-shadow:0 4px 16px rgba(196,97,47,.25);display:flex;align-items:center;gap:10px}
.toast::before{content:'✓';font-size:16px;font-weight:700}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}

/* Device grid */
.device-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:20px;margin-bottom:32px}
.device-card{padding:28px;transition:all .25s;position:relative;overflow:hidden}
.device-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:#E7E1D7;transition:all .3s}
.device-card.online::before{background:#C4612F}
.device-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(31,36,33,.08)}
.device-card.offline{opacity:.6}
.device-head{display:flex;align-items:center;gap:12px;margin-bottom:24px}
.status-badge{display:flex;align-items:center;gap:8px;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:500;letter-spacing:.3px}
.status-badge.online{background:#F2E3D6;color:#C4612F}
.status-badge.offline{background:#E7E1D7;color:#5C635D}
.status-badge::before{content:'';width:6px;height:6px;border-radius:50%;flex-shrink:0}
.status-badge.online::before{background:#C4612F}
.status-badge.offline::before{background:#9CA3AF}
.device-name{font-family:'Fraunces',serif;font-size:20px;font-weight:400;color:#1F2421;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:-.3px;flex:1}
.app-row{display:flex;flex-direction:column;gap:10px}
.app-chip{display:flex;align-items:center;gap:12px;background:#FBF9F5;border:1px solid #E7E1D7;border-radius:12px;padding:12px 16px;font-size:14px;transition:all .15s}
.app-chip:hover{border-color:#C4612F;background:#FFFFFF}
.app-chip .app-icon{width:32px;height:32px;border-radius:8px;background:#F2E3D6;display:flex;align-items:center;justify-content:center;color:#C4612F;font-weight:600;font-size:12px;flex-shrink:0}
.device-card.online .app-chip .app-icon{background:#C4612F;color:#FFFFFF}
.app-chip .app-label{color:#1F2421;font-weight:400;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.app-chip button{padding:8px 16px;border-radius:999px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid;transition:all .15s;background:transparent}
.btn-on{color:#C4612F;border-color:#E7E1D7}
.btn-on:hover{background:#C4612F;color:#FFFFFF;border-color:#C4612F}
.btn-off{color:#5C635D;border-color:#E7E1D7}
.btn-off:hover{background:#5C635D;color:#FFFFFF;border-color:#5C635D}
.app-chip .no-ctrl{font-size:11px;color:#9CA3AF;font-weight:500;padding:6px 12px;border-radius:999px;background:#F7F4EF}

/* Empty state */
.empty{text-align:center;padding:80px 20px;color:#5C635D;grid-column:1/-1;font-size:15px;background:#FBF9F5;border-radius:16px;border:1px dashed #E7E1D7;font-weight:300}
.empty .empty-icon{font-size:56px;margin-bottom:16px;opacity:.6}
.empty .empty-title{font-family:'Fraunces',serif;font-size:20px;color:#1F2421;font-weight:400;margin-bottom:8px;letter-spacing:-.3px}

/* Log panel */
.log-wrap{padding:32px;max-height:320px;overflow-y:auto}
.log-line{font-size:13px;padding:10px 0;border-bottom:1px solid #E7E1D7;color:#5C635D;display:flex;align-items:baseline;gap:12px;font-weight:300}
.log-line:last-child{border-bottom:none}
.log-line .t{color:#9CA3AF;font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;font-weight:400;flex-shrink:0;font-size:12px}
.log-line.ok{color:#C4612F;font-weight:400}
.log-line.err{color:#5C635D;font-weight:400}
.log-line .msg{flex:1;word-break:break-all}

/* CMD shell */
.cmd-row{display:flex;gap:10px;margin-top:16px;padding-top:16px;border-top:1px solid #E7E1D7}
.cmd-row input{flex:1;padding:10px 14px;background:#FBF9F5;border:1px solid #E7E1D7;border-radius:12px;color:#1F2421;font-size:13px;font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;outline:none;transition:all .15s;font-weight:400}
.cmd-row input::placeholder{color:#9CA3AF}
.cmd-row input:focus{border-color:#C4612F;background:#FFFFFF}
.cmd-row button{padding:10px 18px;background:#C4612F;color:#FFFFFF;border:none;border-radius:999px;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s;white-space:nowrap}
.cmd-row button:hover{background:#A94E22;transform:translateY(-1px)}
.cmd-output{margin-top:12px;background:#1F2421;border-radius:12px;padding:16px;font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;font-size:12px;color:#FBF9F5;max-height:200px;overflow-y:auto;white-space:pre-wrap;word-break:break-all;display:none;border:1px solid #E7E1D7}
.cmd-output.show{display:block}
.cmd-output .cmd-ok{color:#C4612F;font-weight:500}
.cmd-output .cmd-err{color:#F2E3D6;font-weight:500}

/* Scrollbar */
::-webkit-scrollbar{width:8px;height:8px}
::-webkit-scrollbar-track{background:#F7F4EF}
::-webkit-scrollbar-thumb{background:#E7E1D7;border-radius:10px}
::-webkit-scrollbar-thumb:hover{background:#C4612F}

/* Mobile */
@media(max-width:768px){
  .header{padding:48px 20px 32px}
  .header h1{font-size:36px}
  .header .subtitle{font-size:16px}
  .header .eyebrow{font-size:10px;padding:5px 12px}
  .login-card{padding:36px 28px}
  .dashboard{padding:0 16px 60px}
  .device-grid{grid-template-columns:1fr;gap:16px}
  .device-card{padding:24px}
  .nav-inner{flex-direction:column;gap:16px;align-items:stretch}
  .nav .user-info{justify-content:center}
  .token-section{padding:24px}
  .section-head{flex-direction:column;gap:16px;align-items:stretch}
  .section-head h3{font-size:20px}
  .token-item{flex-wrap:wrap;padding:16px;gap:12px}
  .token-item .tok-label{min-width:auto;width:100%}
  .token-item .tok-id{width:100%;order:3}
  .token-item .tok-time{order:4}
  .device-name{font-size:18px}
  .log-wrap{padding:24px}
}
</style>
</head>
<body>

<div class="header">
  <div class="eyebrow">远程控制系统</div>
  <h1>切盘<span class="highlight">工具</span></h1>
  <div class="subtitle">集中管理您的游戏设备，远程控制应用启动与关闭</div>
</div>

<div class="login-wrap" id="loginBlock">
  <div class="login-card card">
    <h2>欢迎回来</h2>
    <div class="hint">请登录您的管理员账号</div>
    <label for="u">用户名</label>
    <input id="u" autocomplete="username" placeholder="请输入用户名">
    <label for="p">密码</label>
    <input id="p" type="password" autocomplete="current-password" placeholder="请输入密码">
    <button id="loginBtn">登录</button>
    <div class="login-err" id="loginErr"></div>
  </div>
</div>

<div class="nav" id="navBar" style="display:none">
  <div class="nav-inner">
    <div class="brand">切盘工具</div>
    <div class="user-info">
      <div class="avatar" id="userAvatar">U</div>
      <div class="username" id="userLabel"></div>
      <button class="btn-secondary" id="logoutBtn">退出登录</button>
    </div>
  </div>
</div>

<div class="dashboard" id="dash">
  <div class="token-section card">
    <div class="section-head">
      <h3>设备令牌</h3>
      <button id="createTokenBtn" class="btn-primary">生成新令牌</button>
    </div>
    <div class="token-list" id="tokenList">
      <div class="token-empty">加载中…</div>
    </div>
  </div>

  <div class="section-head">
    <h3>设备列表</h3>
  </div>
  <div class="device-grid" id="grid">
    <div class="empty">
      <div class="empty-icon">🖥️</div>
      <div class="empty-title">暂无设备</div>
      <div>等待 Agent 连接…</div>
    </div>
  </div>

  <div class="section-head" style="margin-top:48px">
    <h3>操作日志</h3>
  </div>
  <div class="log-wrap card"><div id="log"></div></div>
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
  $$('navBar').style.display='none';
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
