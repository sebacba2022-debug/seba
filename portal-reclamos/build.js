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
  nombre: 'NOMBRE DEL NEGOCIO',
  tagline: 'Centro de ayuda y reclamos',
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
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(m.nombre)} — ${esc(m.tagline)}</title>
<style>
* { box-sizing: border-box; margin: 0; }
body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: #0b0b12; color: #f4f4f5; line-height: 1.5; }
.top { background: linear-gradient(160deg, ${m.color}, ${m.color2}); padding: 40px 20px 44px; text-align: center; }
.top h1 { font-size: clamp(24px, 5vw, 34px); }
.top p { color: #e9d5ff; margin-top: 6px; }
.wrap { max-width: 640px; margin: 0 auto; padding: 24px 16px 60px; }
.tabs { display: flex; gap: 8px; margin: -24px auto 24px; max-width: 640px; padding: 0 16px; position: relative; }
.tab { flex: 1; background: #16161f; border: 1px solid #26262f; color: #d4d4d8; padding: 12px; border-radius: 12px; cursor: pointer; font-size: 14px; font-weight: 600; }
.tab.on { background: ${m.color}; color: #fff; border-color: ${m.color}; }
.card { background: #16161f; border: 1px solid #26262f; border-radius: 16px; padding: 22px; }
label { display: block; font-size: 13px; color: #a1a1aa; margin: 14px 0 5px; }
input, textarea, select { width: 100%; background: #0e0e15; border: 1px solid #2b2b36; color: #f4f4f5; border-radius: 10px; padding: 11px 12px; font-size: 14px; font-family: inherit; }
textarea { min-height: 96px; resize: vertical; }
.btn { width: 100%; margin-top: 18px; background: ${m.color}; color: #fff; border: 0; padding: 13px; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; }
.btn:hover { filter: brightness(1.1); }
.hint { font-size: 12px; color: #71717a; margin-top: 8px; text-align: center; }
.res { margin-top: 18px; border-radius: 12px; padding: 16px; font-size: 14px; display: none; }
.res.show { display: block; }
.res.ok { background: #06281c; border: 1px solid #10b98155; }
.res.err { background: #2a0f14; border: 1px solid #f43f5e55; }
.res h3 { font-size: 16px; margin-bottom: 8px; }
.pill { display: inline-block; font-size: 12px; padding: 3px 10px; border-radius: 999px; background: #ffffff1a; margin-top: 4px; }
.oculto { display: none; }
.wafab { position: fixed; right: 16px; bottom: 16px; background: #22c55e; color: #05130a; font-weight: 700; padding: 12px 18px; border-radius: 999px; text-decoration: none; box-shadow: 0 8px 24px #000a; }
.resp { border-top: 1px solid #ffffff1a; margin-top: 10px; padding-top: 10px; }
.resp small { color: #a1a1aa; }
</style>
</head>
<body>
<header class="top">
  <h1>${esc(m.nombre)}</h1>
  <p>${esc(m.tagline)}</p>
</header>

<div class="tabs">
  <div class="tab on" data-tab="consulta">Consultar mi compra</div>
  <div class="tab" data-tab="reclamo">Hacer un reclamo</div>
  <div class="tab" data-tab="seguir">Seguir mi reclamo</div>
</div>

<div class="wrap">
  <!-- CONSULTA DE COMPRA -->
  <div class="card pane" data-pane="consulta">
    <label>Número de orden</label>
    <input id="c_orden" placeholder="Ej: ORD-12345">
    <label>Email de la compra</label>
    <input id="c_email" type="email" placeholder="tu@email.com">
    <button class="btn" data-do="consultarOrden">Ver estado de mi compra</button>
    <p class="hint">Ingresá los datos tal como figuran en tu confirmación de compra.</p>
    <div class="res" id="c_res"></div>
  </div>

  <!-- NUEVO RECLAMO -->
  <div class="card pane oculto" data-pane="reclamo">
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
    <label>Contanos qué pasó</label>
    <textarea id="r_mensaje" placeholder="Descripción del problema"></textarea>
    <button class="btn" data-do="crearReclamo">Enviar reclamo</button>
    <div class="res" id="r_res"></div>
  </div>

  <!-- SEGUIMIENTO -->
  <div class="card pane oculto" data-pane="seguir">
    <label>Código de reclamo</label>
    <input id="s_codigo" placeholder="Ej: R-2026-0001">
    <button class="btn" data-do="seguirReclamo">Ver estado de mi reclamo</button>
    <p class="hint">El código te lo dimos cuando enviaste tu reclamo.</p>
    <div class="res" id="s_res"></div>
  </div>
</div>

<a class="wafab" href="https://wa.me/${esc(m.whatsapp)}">💬 WhatsApp</a>

<script>
var CFG = {
  crear: '${m.webhookCrear}',
  consultar: '${m.webhookConsultar}',
};
var DEMO = ${modoDemo};
var ESTADO_TXT = { recibido: 'Recibido', en_proceso: 'En proceso', resuelto: 'Resuelto', cerrado: 'Cerrado', confirmada: 'Confirmada', pendiente: 'Pago pendiente', entregada: 'Entregada', cancelada: 'Cancelada' };

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
function $(id){return document.getElementById(id);}
function mostrar(id, ok, html){var e=$(id);e.className='res show '+(ok?'ok':'err');e.innerHTML=html;}

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

document.querySelector('.wrap').addEventListener('click', function(ev){
  var b=ev.target.closest('[data-do]'); if(!b)return;
  var accion=b.getAttribute('data-do');
  if(accion==='consultarOrden'){
    pedir('consultar',{orden:$('c_orden').value.trim(),email:$('c_email').value.trim()}).then(function(d){
      if(!d.ok)return mostrar('c_res',false,esc(d.error));
      mostrar('c_res',true,'<h3>Orden '+esc(d.orden)+'</h3><span class="pill">'+(ESTADO_TXT[d.estado]||esc(d.estado))+'</span>'+(d.evento?'<p style="margin-top:8px">'+esc(d.evento)+(d.cantidad?' · '+d.cantidad+' entrada(s)':'')+'</p>':'')+(d.detalle?'<p style="margin-top:4px;color:#a1a1aa">'+esc(d.detalle)+'</p>':''));
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
      mostrar('s_res',true,'<h3>'+esc(d.codigo)+'</h3><span class="pill">'+(ESTADO_TXT[d.estado]||esc(d.estado))+'</span><p style="margin-top:8px;color:#a1a1aa">'+esc(d.asunto||'')+'</p>'+(resp||'<p style="margin-top:8px;color:#71717a">Todavía sin respuestas. Te avisamos apenas haya novedades.</p>'));
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
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Panel de reclamos — ${esc(m.nombre)}</title>
<style>
* { box-sizing: border-box; margin: 0; }
body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #f4f4f5; }
.wrap { max-width: 1100px; margin: 0 auto; padding: 24px 16px 60px; }
h1 { font-size: 22px; }
.sub { color: #a1a1aa; font-size: 13px; margin-top: 3px; }
#stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px,1fr)); gap: 8px; margin: 18px 0; }
.stat { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 10px 12px; }
.stat b { font-size: 20px; } .stat span { display:block; font-size: 11px; color:#a1a1aa; }
.filtros { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
select, input, button, textarea { background:#18181b; border:1px solid #27272a; color:#f4f4f5; border-radius:8px; padding:8px 10px; font-size:13px; font-family:inherit; }
.card { background:#18181b; border:1px solid #27272a; border-radius:12px; padding:16px; margin-bottom:12px; }
.card.alta { border-left: 3px solid #f43f5e; }
.row { display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center; }
.cod { font-weight:700; } .meta{ font-size:12px; color:#a1a1aa; }
.badge{ font-size:11px; padding:2px 9px; border-radius:999px; }
.b-recibido{background:rgba(14,165,233,.15);color:#7dd3fc;} .b-en_proceso{background:rgba(245,158,11,.15);color:#fcd34d;}
.b-resuelto{background:rgba(16,185,129,.15);color:#6ee7b7;} .b-cerrado{background:rgba(113,113,122,.2);color:#d4d4d8;}
.b-alta{background:rgba(244,63,94,.15);color:#fda4af;}
.msg{ margin:10px 0; font-size:14px; color:#e4e4e7; white-space:pre-wrap; background:#0e0e15; border-radius:8px; padding:10px; }
.acc{ display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; align-items:center; }
.btn{ background:${m.color}; border:0; font-weight:600; cursor:pointer; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Panel de reclamos — ${esc(m.nombre)}</h1>
  <p class="sub" id="sync">Cargando…</p>
  <div id="stats"></div>
  <div class="filtros">
    <input id="q" placeholder="Buscar código, nombre, email…" style="flex:1;min-width:200px">
    <select id="fEstado"><option value="">Todos</option><option>recibido</option><option>en_proceso</option><option>resuelto</option><option>cerrado</option></select>
    <label style="display:flex;align-items:center;gap:6px;font-size:13px"><input type="checkbox" id="fAlta"> Solo prioridad alta</label>
    <button class="btn" id="btnRefrescar">Refrescar</button>
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
  document.getElementById('stats').innerHTML=[['Total',c.total],['Recibidos',c.recibido],['En proceso',c.en_proceso],['Resueltos',c.resuelto],['⚠ Urgentes',c.alta]].map(function(t){return '<div class="stat"><b>'+t[1]+'</b><span>'+t[0]+'</span></div>';}).join('');
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
  document.getElementById('lista').innerHTML=lista.map(cardHtml).join('')||'<p style="color:#71717a;text-align:center;padding:30px">No hay reclamos que coincidan.</p>';
}
function cardHtml(x){
  var opts=['recibido','en_proceso','resuelto','cerrado'].map(function(e){return '<option value="'+e+'"'+(x.estado===e?' selected':'')+'>'+TXT[e]+'</option>';}).join('');
  var resp=(x.respuestas||[]).map(function(r){return '<div class="meta" style="margin-top:6px">↳ '+esc(r.texto)+'</div>';}).join('');
  return '<div class="card'+(x.prioridad==='alta'?' alta':'')+'">'
    +'<div class="row"><span class="cod">'+esc(x.codigo)+' · '+esc(x.asunto||'')+'</span>'
    +'<span><span class="badge b-'+esc(x.estado)+'">'+(TXT[x.estado]||esc(x.estado))+'</span>'+(x.prioridad==='alta'?' <span class="badge b-alta">urgente</span>':'')+'</span></div>'
    +'<div class="meta">'+esc(x.nombre||'')+' · '+esc(x.email||'')+(x.orden?' · orden '+esc(x.orden):'')+'</div>'
    +'<div class="msg">'+esc(x.mensaje||'')+'</div>'+resp
    +'<div class="acc"><a class="badge b-recibido" style="text-decoration:none" href="https://wa.me/'+(String(x.telefono||'').replace(/\\D/g,''))+'" target="_blank">Contactar</a>'
    +'<select data-cod="'+esc(x.codigo)+'" data-k="estado">'+opts+'</select>'
    +'<input data-cod="'+esc(x.codigo)+'" data-k="respuesta" placeholder="Escribir respuesta al cliente…" style="flex:1;min-width:180px">'
    +'<button class="btn" data-send="'+esc(x.codigo)+'">Responder</button></div>'
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
