#!/usr/bin/env node
// Genera las dos páginas del portal de reclamos (pública + panel interno) y una
// versión "demo" autocontenida con datos de ejemplo para mostrarle al cliente.
// Ambas hablan con n8n por webhooks; la demo simula esas respuestas en el navegador.
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const RAIZ = __dirname;
const SALIDA = path.join(RAIZ, 'dist');

// Config editable: la marca es SIEMPRE la del negocio que contrata, nunca StubHub.
const MARCA = {
  nombre: 'Centro de Ayuda',
  tagline: '¿En qué te podemos ayudar?',
  color: '#6d28d9',
  color2: '#4c1d95',
  whatsapp: '5490000000000',
  webhookCrear: 'http://localhost:5678/webhook/reclamo-crear',
  webhookConsultar: 'http://localhost:5678/webhook/reclamo-consultar',
  webhookListar: 'http://localhost:5678/webhook/reclamos-listar',
  webhookActualizar: 'http://localhost:5678/webhook/reclamo-actualizar',
};

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

// -------- PÁGINA PÚBLICA --------
function portalPublico(m, demoData) {
  const modoDemo = demoData ? JSON.stringify(demoData).replace(/</g, '\\u003c') : 'null';
  const inicial = esc(m.nombre.trim().charAt(0) || 'A').toUpperCase();
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(m.nombre)} — ${esc(m.tagline)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root { --brand:${m.color}; --brand2:${m.color2}; }
* { box-sizing: border-box; margin: 0; }
body { font-family: 'Inter', system-ui, sans-serif; background: #f6f7fb; color: #1c1c28; line-height: 1.55; }
h1,h2,h3,.brandfont { font-family: 'Plus Jakarta Sans', sans-serif; }
.nav { background: #fff; border-bottom: 1px solid #e7e8ef; position: sticky; top: 0; z-index: 30; }
.nav .inner { max-width: 1080px; margin: 0 auto; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; }
.logo { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 16px; }
.logo .mark { width: 34px; height: 34px; border-radius: 9px; background: linear-gradient(140deg, var(--brand), var(--brand2)); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 17px; }
.nav a { color: #5a5a70; text-decoration: none; font-size: 14px; font-weight: 500; }
.hero { background: linear-gradient(150deg, var(--brand), var(--brand2)); color: #fff; padding: 56px 20px 92px; text-align: center; position: relative; overflow: hidden; }
.hero .glow { position: absolute; width: 520px; height: 520px; border-radius: 50%; background: #ffffff; opacity: .08; filter: blur(60px); top: -220px; right: -120px; }
.hero h1 { font-size: clamp(26px, 4.5vw, 40px); font-weight: 800; letter-spacing: -0.5px; position: relative; }
.hero p { color: #ffffffcc; margin-top: 10px; font-size: 16px; position: relative; }
.stage { max-width: 680px; margin: -60px auto 0; padding: 0 16px 40px; position: relative; z-index: 10; }
.tabs { display: flex; gap: 4px; background: #fff; border: 1px solid #e7e8ef; border-radius: 14px; padding: 5px; box-shadow: 0 10px 30px #1c1c2810; }
.tab { flex: 1; text-align: center; padding: 11px 8px; border-radius: 10px; cursor: pointer; font-size: 13.5px; font-weight: 600; color: #6b6b80; transition: all .15s; }
.tab.on { background: linear-gradient(140deg, var(--brand), var(--brand2)); color: #fff; box-shadow: 0 6px 16px var(--brand)44; }
.card { background: #fff; border: 1px solid #e7e8ef; border-radius: 16px; padding: 26px; margin-top: 16px; box-shadow: 0 10px 40px #1c1c280a; }
.card h2 { font-size: 18px; font-weight: 700; }
.card .desc { color: #6b6b80; font-size: 14px; margin-top: 4px; margin-bottom: 8px; }
label { display: block; font-size: 13px; font-weight: 600; color: #3a3a4c; margin: 16px 0 6px; }
input, textarea, select { width: 100%; background: #fbfbfd; border: 1px solid #dcdce6; color: #1c1c28; border-radius: 11px; padding: 12px 13px; font-size: 14.5px; font-family: inherit; transition: border-color .15s, box-shadow .15s; }
input:focus, textarea:focus, select:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px var(--brand)22; }
textarea { min-height: 104px; resize: vertical; }
.btn { width: 100%; margin-top: 20px; background: linear-gradient(140deg, var(--brand), var(--brand2)); color: #fff; border: 0; padding: 14px; border-radius: 11px; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 8px 20px var(--brand)44; transition: transform .12s; font-family: 'Plus Jakarta Sans', sans-serif; }
.btn:hover { transform: translateY(-1px); }
.hint { font-size: 12.5px; color: #9494a6; margin-top: 10px; text-align: center; }
.res { margin-top: 18px; border-radius: 13px; padding: 18px; font-size: 14px; display: none; }
.res.show { display: block; animation: pop .2s ease; }
@keyframes pop { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.res.ok { background: #eefaf3; border: 1px solid #b7ecd0; color: #0f5132; }
.res.err { background: #fdecee; border: 1px solid #f6c2c8; color: #842029; }
.res h3 { font-size: 16px; margin-bottom: 6px; font-weight: 700; }
.pill { display: inline-block; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px; background: var(--brand); color: #fff; margin-top: 4px; }
.pill.gris { background: #6b6b80; } .pill.amar { background: #d97706; } .pill.verde { background: #059669; } .pill.rojo { background: #dc2626; }
.oculto { display: none; }
.pasos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 680px; margin: 26px auto 0; padding: 0 16px; }
.paso { background: #fff; border: 1px solid #e7e8ef; border-radius: 13px; padding: 16px; text-align: center; }
.paso .n { width: 30px; height: 30px; border-radius: 50%; background: var(--brand)18; color: var(--brand); font-weight: 800; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; }
.paso b { font-size: 13.5px; } .paso span { display: block; font-size: 11.5px; color: #9494a6; margin-top: 2px; }
.resp { border-top: 1px solid #00000012; margin-top: 12px; padding-top: 12px; }
.resp small { color: #6b6b80; font-weight: 600; }
footer { text-align: center; color: #9494a6; font-size: 12.5px; padding: 40px 20px 60px; }
.wafab { position: fixed; right: 18px; bottom: 18px; background: #25d366; color: #fff; font-weight: 700; padding: 13px 20px; border-radius: 999px; text-decoration: none; box-shadow: 0 8px 24px #0003; font-size: 14px; z-index: 40; }
@media (max-width:520px){ .pasos{ grid-template-columns:1fr; } }
</style>
</head>
<body>
<nav class="nav"><div class="inner">
  <div class="logo"><span class="mark">${inicial}</span><span>${esc(m.nombre)}</span></div>
  <a href="https://wa.me/${esc(m.whatsapp)}">Contacto</a>
</div></nav>

<header class="hero">
  <div class="glow"></div>
  <h1>${esc(m.tagline)}</h1>
  <p>Consultá tu compra, hacé un reclamo o seguí su estado. Te respondemos rápido.</p>
</header>

<div class="stage">
  <div class="tabs">
    <div class="tab on" data-tab="consulta">Consultar compra</div>
    <div class="tab" data-tab="reclamo">Hacer un reclamo</div>
    <div class="tab" data-tab="seguir">Seguir reclamo</div>
  </div>

  <!-- CONSULTA DE COMPRA -->
  <div class="card pane" data-pane="consulta">
    <h2>Consultá el estado de tu compra</h2>
    <p class="desc">Ingresá los datos tal como figuran en tu confirmación.</p>
    <label>Número de orden</label>
    <input id="c_orden" placeholder="Ej: ORD-12345">
    <label>Email de la compra</label>
    <input id="c_email" type="email" placeholder="tu@email.com">
    <button class="btn" data-do="consultarOrden">Ver estado de mi compra</button>
    <div class="res" id="c_res"></div>
  </div>

  <!-- NUEVO RECLAMO -->
  <div class="card pane oculto" data-pane="reclamo">
    <h2>Contanos qué pasó</h2>
    <p class="desc">Completá el formulario y te damos un código para seguir tu reclamo.</p>
    <label>Nombre y apellido</label>
    <input id="r_nombre" placeholder="Tu nombre">
    <label>Email</label>
    <input id="r_email" type="email" placeholder="tu@email.com">
    <label>Número de orden (opcional)</label>
    <input id="r_orden" placeholder="Si tu reclamo es sobre una compra">
    <label>Asunto</label>
    <select id="r_asunto">
      <option>No recibí mis entradas</option>
      <option>Problema con el pago</option>
      <option>Quiero un reembolso</option>
      <option>Datos incorrectos en mi compra</option>
      <option>Otra consulta</option>
    </select>
    <label>Detalle del problema</label>
    <textarea id="r_mensaje" placeholder="Contanos con el mayor detalle posible"></textarea>
    <button class="btn" data-do="crearReclamo">Enviar reclamo</button>
    <div class="res" id="r_res"></div>
  </div>

  <!-- SEGUIMIENTO -->
  <div class="card pane oculto" data-pane="seguir">
    <h2>Seguí tu reclamo</h2>
    <p class="desc">Con el código que te dimos ves el estado y nuestras respuestas.</p>
    <label>Código de reclamo</label>
    <input id="s_codigo" placeholder="Ej: R-2026-0001">
    <button class="btn" data-do="seguirReclamo">Ver estado de mi reclamo</button>
    <div class="res" id="s_res"></div>
  </div>
</div>

<div class="pasos">
  <div class="paso"><div class="n">1</div><b>Enviás tu consulta</b><span>Compra o reclamo, en 1 minuto</span></div>
  <div class="paso"><div class="n">2</div><b>Recibís un código</b><span>Para seguir el estado</span></div>
  <div class="paso"><div class="n">3</div><b>Te respondemos</b><span>Por acá y por email</span></div>
</div>

<footer>${esc(m.nombre)} · ${esc(m.tagline)} · Todos los derechos reservados</footer>

<a class="wafab" href="https://wa.me/${esc(m.whatsapp)}">💬 Escribinos</a>

<script>
var CFG = {
  crear: '${m.webhookCrear}',
  consultar: '${m.webhookConsultar}',
};
var DEMO = ${modoDemo};
var ESTADO_TXT = { recibido: 'Recibido', en_proceso: 'En proceso', resuelto: 'Resuelto', cerrado: 'Cerrado', confirmada: 'Confirmada', pendiente: 'Pago pendiente', entregada: 'Entregada', cancelada: 'Cancelada' };
var ESTADO_COLOR = { recibido: '', en_proceso: 'amar', resuelto: 'verde', cerrado: 'gris', confirmada: 'verde', entregada: 'verde', pendiente: 'amar', cancelada: 'rojo' };

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
function $(id){return document.getElementById(id);}
function mostrar(id, ok, html){var e=$(id);e.className='res show '+(ok?'ok':'err');e.innerHTML=html;}
function pill(estado){return '<span class="pill '+(ESTADO_COLOR[estado]||'')+'">'+(ESTADO_TXT[estado]||esc(estado))+'</span>';}

document.querySelector('.tabs').addEventListener('click', function(ev){
  var t=ev.target.closest('.tab'); if(!t)return;
  document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('on');});
  t.classList.add('on');
  var p=t.getAttribute('data-tab');
  document.querySelectorAll('.pane').forEach(function(x){x.classList.toggle('oculto', x.getAttribute('data-pane')!==p);});
});

// En modo demo, resuelve contra datos locales. En producción, fetch a n8n.
function pedir(tipo, datos){
  if (DEMO) return Promise.resolve(demoResolver(tipo, datos));
  if (tipo==='crear') {
    return fetch(CFG.crear,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(datos)}).then(function(r){return r.json();});
  }
  var qs = Object.keys(datos).map(function(k){return k+'='+encodeURIComponent(datos[k]);}).join('&');
  return fetch(CFG.consultar+'?'+qs).then(function(r){return r.json();});
}
function demoResolver(tipo, d){
  if(tipo==='crear'){var n=(DEMO.reclamos.length+1);var cod='R-2026-'+String(n).padStart(4,'0');DEMO.reclamos.push({codigo:cod,estado:'recibido',asunto:d.asunto,respuestas:[]});return {ok:true,codigo:cod,estado:'recibido'};}
  if(d.codigo){var r=DEMO.reclamos.filter(function(x){return x.codigo.toUpperCase()===d.codigo.toUpperCase();})[0];return r?{ok:true,tipo:'reclamo',codigo:r.codigo,estado:r.estado,asunto:r.asunto,respuestas:r.respuestas||[]}:{ok:false,error:'No encontramos ese código.'};}
  var v=DEMO.ventas.filter(function(x){return x.orden===d.orden && x.email.toLowerCase()===(d.email||'').toLowerCase();})[0];
  return v?{ok:true,tipo:'orden',orden:v.orden,estado:v.estado,evento:v.evento,cantidad:v.cantidad,fecha:v.fecha,detalle:v.detalle}:{ok:false,error:'No encontramos una compra con esos datos.'};
}

document.querySelector('.stage').addEventListener('click', function(ev){
  var b=ev.target.closest('[data-do]'); if(!b)return;
  var accion=b.getAttribute('data-do');
  if(accion==='consultarOrden'){
    pedir('consultar',{orden:$('c_orden').value.trim(),email:$('c_email').value.trim()}).then(function(d){
      if(!d.ok)return mostrar('c_res',false,esc(d.error));
      mostrar('c_res',true,'<h3>Orden '+esc(d.orden)+'</h3>'+pill(d.estado)+(d.evento?'<p style="margin-top:10px;font-weight:600">'+esc(d.evento)+(d.cantidad?' · '+d.cantidad+' entrada(s)':'')+'</p>':'')+(d.detalle?'<p style="margin-top:4px">'+esc(d.detalle)+'</p>':''));
    });
  }
  if(accion==='crearReclamo'){
    var datos={nombre:$('r_nombre').value.trim(),email:$('r_email').value.trim(),orden:$('r_orden').value.trim(),asunto:$('r_asunto').value,mensaje:$('r_mensaje').value.trim()};
    if(datos.nombre.length<2||datos.mensaje.length<5||datos.email.indexOf('@')<0)return mostrar('r_res',false,'Completá nombre, un email válido y contanos qué pasó.');
    pedir('crear',datos).then(function(d){
      if(!d.ok)return mostrar('r_res',false,esc(d.error||'No se pudo enviar. Probá de nuevo.'));
      mostrar('r_res',true,'<h3>¡Reclamo enviado! ✅</h3><p>Guardá tu código de seguimiento:</p><p class="pill" style="font-size:16px;margin-top:8px">'+esc(d.codigo)+'</p><p style="margin-top:8px;color:#a1a1aa">Te vamos a responder por email. También podés seguir el estado con ese código.</p>');
    });
  }
  if(accion==='seguirReclamo'){
    pedir('consultar',{codigo:$('s_codigo').value.trim()}).then(function(d){
      if(!d.ok)return mostrar('s_res',false,esc(d.error));
      var resp=(d.respuestas||[]).map(function(r){return '<div class="resp"><small>'+esc((r.fecha||'').slice(0,10))+'</small><p>'+esc(r.texto)+'</p></div>';}).join('');
      mostrar('s_res',true,'<h3>'+esc(d.codigo)+'</h3>'+pill(d.estado)+'<p style="margin-top:10px;font-weight:600">'+esc(d.asunto||'')+'</p>'+(resp||'<p style="margin-top:10px">Todavía sin respuestas. Te avisamos apenas haya novedades.</p>'));
    });
  }
});
</script>
</body>
</html>`;
}

// -------- PANEL INTERNO --------
function panelReclamos(m, demoData) {
  const modoDemo = demoData ? JSON.stringify(demoData.reclamos).replace(/</g, '\\u003c') : 'null';
  const inicial = esc(m.nombre.trim().charAt(0) || 'A').toUpperCase();
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Panel de soporte — ${esc(m.nombre)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root { --brand:${m.color}; --brand2:${m.color2}; }
* { box-sizing: border-box; margin: 0; }
body { font-family: 'Inter', system-ui, sans-serif; background: #f6f7fb; color: #1c1c28; }
h1,h2,h3,.brandfont { font-family: 'Plus Jakarta Sans', sans-serif; }
.nav { background:#fff; border-bottom:1px solid #e7e8ef; }
.nav .inner { max-width:1160px; margin:0 auto; padding:14px 20px; display:flex; align-items:center; justify-content:space-between; }
.logo { display:flex; align-items:center; gap:10px; font-weight:800; }
.logo .mark { width:32px; height:32px; border-radius:8px; background:linear-gradient(140deg,var(--brand),var(--brand2)); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; }
.logo small { display:block; font-weight:500; font-size:11px; color:#9494a6; }
#sync { font-size:12.5px; color:#6b6b80; }
.wrap { max-width:1160px; margin:0 auto; padding:24px 20px 60px; }
#stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:12px; margin-bottom:20px; }
.stat { background:#fff; border:1px solid #e7e8ef; border-radius:14px; padding:14px 16px; box-shadow:0 4px 14px #1c1c2808; }
.stat b { font-size:26px; font-weight:800; } .stat span { display:block; font-size:12px; color:#9494a6; margin-top:2px; }
.stat.urg b { color:#dc2626; }
.filtros { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:18px; align-items:center; }
select, input, button, textarea { background:#fff; border:1px solid #dcdce6; color:#1c1c28; border-radius:10px; padding:10px 12px; font-size:13.5px; font-family:inherit; }
input:focus, select:focus, textarea:focus { outline:none; border-color:var(--brand); box-shadow:0 0 0 3px var(--brand)22; }
.chk { display:flex; align-items:center; gap:7px; font-size:13.5px; color:#3a3a4c; background:#fff; border:1px solid #dcdce6; border-radius:10px; padding:9px 12px; }
.card { background:#fff; border:1px solid #e7e8ef; border-radius:16px; padding:20px; margin-bottom:14px; box-shadow:0 4px 14px #1c1c2808; }
.card.alta { border-left:4px solid #dc2626; }
.row { display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:flex-start; }
.cod { font-weight:800; font-size:15.5px; font-family:'Plus Jakarta Sans',sans-serif; }
.meta { font-size:12.5px; color:#9494a6; margin-top:2px; }
.badge { font-size:11.5px; font-weight:700; padding:4px 11px; border-radius:999px; }
.b-recibido{background:#e0f2fe;color:#075985;} .b-en_proceso{background:#fef3c7;color:#92400e;}
.b-resuelto{background:#dcfce7;color:#166534;} .b-cerrado{background:#ececef;color:#52525b;}
.b-alta{background:#fee2e2;color:#991b1b;}
.msg { margin:12px 0; font-size:14px; color:#3a3a4c; white-space:pre-wrap; background:#f8f8fb; border:1px solid #ececf2; border-radius:10px; padding:12px 14px; }
.resline { font-size:13px; color:#3a3a4c; margin-top:6px; padding-left:14px; border-left:2px solid var(--brand)55; }
.resline small { color:#9494a6; }
.acc { display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; align-items:center; }
.btn { background:linear-gradient(140deg,var(--brand),var(--brand2)); color:#fff; border:0; font-weight:700; cursor:pointer; box-shadow:0 6px 14px var(--brand)33; }
.btn.ghost { background:#f1f1f6; color:#3a3a4c; box-shadow:none; text-decoration:none; display:inline-block; }
.vacio { text-align:center; color:#9494a6; padding:50px; background:#fff; border:1px dashed #dcdce6; border-radius:16px; }
</style>
</head>
<body>
<nav class="nav"><div class="inner">
  <div class="logo"><span class="mark">${inicial}</span><span>${esc(m.nombre)}<small>Panel de soporte</small></span></div>
  <span id="sync">Cargando…</span>
</div></nav>
<div class="wrap">
  <div id="stats"></div>
  <div class="filtros">
    <input id="q" placeholder="Buscar código, nombre, email…" style="flex:1;min-width:220px">
    <select id="fEstado"><option value="">Todos los estados</option><option value="recibido">Recibido</option><option value="en_proceso">En proceso</option><option value="resuelto">Resuelto</option><option value="cerrado">Cerrado</option></select>
    <label class="chk"><input type="checkbox" id="fAlta"> Solo urgentes</label>
    <button class="btn" id="btnRefrescar" style="padding:10px 16px">Refrescar</button>
  </div>
  <div id="lista"></div>
</div>
<script>
var CFG={ listar:'${m.webhookListar}', actualizar:'${m.webhookActualizar}' };
var DATA = ${modoDemo};
var TXT={recibido:'Recibido',en_proceso:'En proceso',resuelto:'Resuelto',cerrado:'Cerrado'};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
function sync(t){document.getElementById('sync').textContent=t;}

function refrescar(){
  if(DATA){ sync('Modo demo — datos de ejemplo'); render(); return; }
  fetch(CFG.listar).then(function(r){return r.json();}).then(function(d){
    DATA=(d&&d.reclamos)?d.reclamos:(Array.isArray(d)?d:[]);
    sync('Conectado a n8n · '+DATA.length+' reclamos'); render();
  }).catch(function(){ sync('n8n sin conexión: revisá que el workflow esté activo'); });
}
function actualizar(codigo, campos){
  if(DATA && !CFG.actualizar.indexOf('http')===0){} // demo no persiste
  var payload=Object.assign({codigo:codigo},campos);
  var l=DATA.filter(function(x){return x.codigo===codigo;})[0];
  if(l){ if(campos.estado)l.estado=campos.estado; if(campos.respuesta){l.respuestas=l.respuestas||[];l.respuestas.push({fecha:new Date().toISOString(),texto:campos.respuesta});} }
  render();
  fetch(CFG.actualizar,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(function(r){return r.json();}).then(function(){sync('Guardado ✓');}).catch(function(){sync('No se pudo guardar (¿n8n activo?)');});
}
function stats(){
  var c={total:DATA.length,recibido:0,en_proceso:0,resuelto:0,alta:0};
  DATA.forEach(function(x){if(c[x.estado]!=null)c[x.estado]++;if(x.prioridad==='alta'&&x.estado!=='cerrado'&&x.estado!=='resuelto')c.alta++;});
  document.getElementById('stats').innerHTML=[['Total',c.total,''],['Recibidos',c.recibido,''],['En proceso',c.en_proceso,''],['Resueltos',c.resuelto,''],['Urgentes sin resolver',c.alta,'urg']].map(function(t){return '<div class="stat '+t[2]+'"><b>'+t[1]+'</b><span>'+t[0]+'</span></div>';}).join('');
}
function render(){
  stats();
  var q=document.getElementById('q').value.toLowerCase();
  var fe=document.getElementById('fEstado').value;
  var fa=document.getElementById('fAlta').checked;
  var lista=DATA.filter(function(x){
    if(fe&&x.estado!==fe)return false;
    if(fa&&x.prioridad!=='alta')return false;
    if(q&&((x.codigo||'')+' '+(x.nombre||'')+' '+(x.email||'')).toLowerCase().indexOf(q)<0)return false;
    return true;
  }).sort(function(a,b){ if((a.prioridad==='alta')!==(b.prioridad==='alta'))return a.prioridad==='alta'?-1:1; return String(b.creado||'').localeCompare(String(a.creado||'')); });
  document.getElementById('lista').innerHTML=lista.map(cardHtml).join('')||'<div class="vacio">No hay reclamos que coincidan con el filtro.</div>';
}
function cardHtml(x){
  var opts=['recibido','en_proceso','resuelto','cerrado'].map(function(e){return '<option value="'+e+'"'+(x.estado===e?' selected':'')+'>'+TXT[e]+'</option>';}).join('');
  var resp=(x.respuestas||[]).map(function(r){return '<div class="resline"><small>'+esc((r.fecha||'').slice(0,10))+' — vos:</small> '+esc(r.texto)+'</div>';}).join('');
  return '<div class="card'+(x.prioridad==='alta'?' alta':'')+'">'
    +'<div class="row"><div><span class="cod">'+esc(x.codigo)+'</span> <span style="color:#6b6b80">'+esc(x.asunto||'')+'</span>'
    +'<div class="meta">'+esc(x.nombre||'')+' · '+esc(x.email||'')+(x.orden?' · orden '+esc(x.orden):'')+'</div></div>'
    +'<span><span class="badge b-'+esc(x.estado)+'">'+(TXT[x.estado]||esc(x.estado))+'</span>'+(x.prioridad==='alta'?' <span class="badge b-alta">urgente</span>':'')+'</span></div>'
    +'<div class="msg">'+esc(x.mensaje||'')+'</div>'+resp
    +'<div class="acc">'
    +'<select data-cod="'+esc(x.codigo)+'" data-k="estado" style="padding:9px 12px">'+opts+'</select>'
    +'<input data-cod="'+esc(x.codigo)+'" data-k="respuesta" placeholder="Escribir respuesta al cliente…" style="flex:1;min-width:200px;padding:9px 12px">'
    +'<button class="btn" data-send="'+esc(x.codigo)+'" style="padding:9px 18px">Responder</button></div>'
    +'</div>';
}
document.getElementById('lista').addEventListener('change',function(ev){var s=ev.target.closest('select[data-cod]');if(s)actualizar(s.getAttribute('data-cod'),{estado:s.value});});
document.getElementById('lista').addEventListener('click',function(ev){var b=ev.target.closest('[data-send]');if(!b)return;var cod=b.getAttribute('data-send');var inp=document.querySelector('input[data-cod="'+cod+'"][data-k="respuesta"]');if(inp&&inp.value.trim()){actualizar(cod,{respuesta:inp.value.trim(),estado:'en_proceso'});inp.value='';}});
['q','fEstado','fAlta'].forEach(function(id){document.getElementById(id).addEventListener('input',render);});
document.getElementById('btnRefrescar').addEventListener('click',refrescar);
refrescar();
</script>
</body>
</html>`;
}

// -------- Datos demo para mostrarle al cliente --------
const DEMO = {
  ventas: [
    { orden: 'ORD-10231', email: 'juan@mail.com', estado: 'confirmada', evento: 'Metallica M72 — Córdoba', cantidad: 2, fecha: '2026-04-30', detalle: 'Campo. Entradas enviadas al email.' },
    { orden: 'ORD-10232', email: 'ana@mail.com', estado: 'pendiente', evento: 'Metallica M72 — Córdoba', cantidad: 4, fecha: '2026-05-02', detalle: 'Pago en revisión, te avisamos en 24hs.' },
  ],
  reclamos: [
    { codigo: 'R-2026-0001', nombre: 'Ana Pérez', email: 'ana@mail.com', orden: 'ORD-10232', asunto: 'Problema con el pago', mensaje: 'Pagué pero no me llegó la confirmación por email.', estado: 'en_proceso', prioridad: 'alta', creado: '2026-05-02T10:00:00Z', respuestas: [{ fecha: '2026-05-02T12:00:00Z', texto: 'Hola Ana, estamos verificando tu pago con el banco. Te confirmamos hoy.' }] },
    { codigo: 'R-2026-0002', nombre: 'Juan Gómez', email: 'juan@mail.com', orden: 'ORD-10231', asunto: 'Otra consulta', mensaje: '¿Puedo cambiar el email donde recibo las entradas?', estado: 'recibido', prioridad: 'normal', creado: '2026-05-03T09:00:00Z', respuestas: [] },
  ],
};

// -------- Sanity checks (simulan $ y Buffer como en el nodo Code de n8n) --------
function nodo(a) { return { first: () => a[0], all: () => a }; }
function correr(archivo, mapa) {
  const src = fs.readFileSync(path.join(RAIZ, 'nodes', archivo), 'utf8');
  const $ = (n) => { if (!(n in mapa)) throw new Error('nodo no mockeado: ' + n); return mapa[n]; };
  return new Function('$', 'Buffer', src)($, Buffer);
}

// crear-reclamo: válido -> ok con código; inválido -> rechazado
const cr = correr('crear-reclamo.js', {
  'Webhook Crear reclamo': nodo([{ json: { body: { nombre: 'Ana', email: 'a@b.com', mensaje: 'no me llegó nada, es urgente' } } }]),
  'Extraer reclamos (crear)': nodo([{ json: { reclamos: [] } }]),
});
assert.strictEqual(cr[0].json.ok, true, 'crea reclamo válido');
assert.ok(/^R-\d{4}-0001$/.test(cr[0].json.codigo), 'código con formato R-AÑO-####');
assert.ok(cr[0].binary.data, 'devuelve la base para guardar');

const crBad = correr('crear-reclamo.js', {
  'Webhook Crear reclamo': nodo([{ json: { body: { nombre: 'x', email: 'malo', mensaje: '' } } }]),
  'Extraer reclamos (crear)': nodo([{ json: { reclamos: [] } }]),
});
assert.strictEqual(crBad[0].json.ok, false, 'rechaza datos inválidos');

// consultar: por orden+email y por código
const co = correr('consultar.js', {
  'Webhook Consultar': nodo([{ json: { query: { orden: 'ORD-10231', email: 'juan@mail.com' } } }]),
  'Extraer ventas': nodo([{ json: { ventas: DEMO.ventas } }]),
  'Extraer reclamos (consulta)': nodo([{ json: { reclamos: DEMO.reclamos } }]),
});
assert.strictEqual(co[0].json.ok, true, 'encuentra la orden');
assert.strictEqual(co[0].json.tipo, 'orden');

const co2 = correr('consultar.js', {
  'Webhook Consultar': nodo([{ json: { query: { codigo: 'R-2026-0001' } } }]),
  'Extraer ventas': nodo([{ json: { ventas: DEMO.ventas } }]),
  'Extraer reclamos (consulta)': nodo([{ json: { reclamos: DEMO.reclamos } }]),
});
assert.strictEqual(co2[0].json.tipo, 'reclamo', 'consulta por código de reclamo');

// actualizar: cambia estado y suma respuesta
const ac = correr('actualizar-reclamo.js', {
  'Webhook Actualizar': nodo([{ json: { body: { codigo: 'R-2026-0002', estado: 'resuelto', respuesta: 'Listo, cambiamos el email.' } } }]),
  'Extraer reclamos (actualizar)': nodo([{ json: { reclamos: JSON.parse(JSON.stringify(DEMO.reclamos)) } }]),
});
assert.strictEqual(ac[0].json.estado, 'resuelto', 'actualiza el estado');
const baseAct = JSON.parse(Buffer.from(ac[0].binary.data.data, 'base64').toString('utf8'));
assert.strictEqual(baseAct.reclamos.find((x) => x.codigo === 'R-2026-0002').respuestas.length, 1, 'guarda la respuesta');

// -------- Escribir salida --------
fs.mkdirSync(SALIDA, { recursive: true });
fs.writeFileSync(path.join(SALIDA, 'portal-publico.html'), portalPublico(MARCA, null));
fs.writeFileSync(path.join(SALIDA, 'panel-reclamos.html'), panelReclamos(MARCA, null));
fs.writeFileSync(path.join(SALIDA, 'demo-portal-publico.html'), portalPublico(MARCA, DEMO));
fs.writeFileSync(path.join(SALIDA, 'demo-panel-reclamos.html'), panelReclamos(MARCA, DEMO));
console.log('✔ Sanity checks OK');
console.log('✔ Portal generado en portal-reclamos/dist/ (versión producción + demo)');
