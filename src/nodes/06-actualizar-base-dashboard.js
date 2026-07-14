// Suma los leads nuevos a la base maestra y regenera el dashboard HTML.
// El dashboard es 100% autocontenido (CSS embebido, sin CDNs): funciona offline
// con el snapshot embebido, y si n8n está prendido sincroniza en vivo por webhooks.
const config = $('Config').first().json;

let db = { version: 8, leads: [], actualizado: null };
try {
  const raw = $('Extraer base').first().json;
  if (raw && Array.isArray(raw.leads)) db = raw;
  else if (Array.isArray(raw)) db = { leads: raw };
} catch (e) {
  // Primera corrida: la base todavía no existe.
}
db.version = 8;
if (!Array.isArray(db.leads)) db.leads = [];

// Respaldo del estado ANTERIOR de la base, por si un guardado sale mal.
const respaldoPrevio = JSON.stringify(db, null, 2);

const nuevos = $input.all().map((i) => i.json);
const ahora = new Date().toISOString();

const porClave = new Map();
for (const l of db.leads) {
  if (l.placeId) porClave.set(l.placeId, l);
  if (l.telefono) porClave.set(l.telefono, l);
}

let agregados = 0;
let recontactos = 0;
for (const l of nuevos) {
  const previo = porClave.get(l.placeId) || porClave.get(l.telefono);
  if (previo) {
    Object.assign(previo, {
      mensaje: l.mensaje,
      pitch: l.pitch,
      followup: l.followup,
      demoArchivo: l.demoArchivo || previo.demoArchivo,
      origenMensaje: l.origenMensaje,
      estado: 'nuevo',
      recontacto: true,
      score: l.score,
      fechaAgregado: ahora,
    });
    previo.historial = (previo.historial || []).concat([{ fecha: ahora, evento: 'recontacto' }]);
    recontactos += 1;
  } else {
    const nuevo = Object.assign({}, l, {
      estado: 'nuevo',
      fechaAgregado: ahora,
      historial: [{ fecha: ahora, evento: 'creado' }],
    });
    db.leads.push(nuevo);
    if (nuevo.placeId) porClave.set(nuevo.placeId, nuevo);
    if (nuevo.telefono) porClave.set(nuevo.telefono, nuevo);
    agregados += 1;
  }
}
db.actualizado = ahora;

const html = generarDashboard(db, config);
const jsonBase = JSON.stringify(db, null, 2);

return [{
  json: { totalBase: db.leads.length, agregados, recontactos },
  binary: {
    base: {
      data: Buffer.from(jsonBase, 'utf8').toString('base64'),
      mimeType: 'application/json',
      fileName: 'leads_db.json',
    },
    dashboard: {
      data: Buffer.from(html, 'utf8').toString('base64'),
      mimeType: 'text/html',
      fileName: 'dashboard.html',
    },
    backup: {
      data: Buffer.from(respaldoPrevio, 'utf8').toString('base64'),
      mimeType: 'application/json',
      fileName: 'leads_db.backup.json',
    },
  },
}];

function generarDashboard(baseDatos, cfg) {
  // Se escapa "<" para que ningún mensaje pueda cerrar el tag <script>.
  const datos = JSON.stringify(baseDatos.leads || []).replace(/</g, '\\u003c');
  const fecha = baseDatos.actualizado ? new Date(baseDatos.actualizado).toLocaleString('es-AR') : '-';

  // OJO: dentro de la plantilla no se pueden usar backticks ni ${ } porque es un
  // template literal de JS. El JS del dashboard usa solo comillas simples y concatenación.
  const plantilla = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Impulso Web - Panel de prospección</title>
<style>
* { box-sizing: border-box; }
body { margin: 0; background: #09090b; color: #f4f4f5; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
.wrap { max-width: 1200px; margin: 0 auto; padding: 24px 16px 48px; }
.top { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 12px; margin-bottom: 20px; }
h1 { margin: 0; font-size: 24px; }
.sub { color: #a1a1aa; font-size: 13px; margin: 3px 0 0; }
#sync { font-size: 11px; color: #71717a; margin: 3px 0 0; }
#sync.ok { color: #34d399; }
#sync.warn { color: #fbbf24; }
.btn { background: #27272a; border: 1px solid #3f3f46; color: #f4f4f5; padding: 8px 12px; border-radius: 8px; font-size: 13px; cursor: pointer; }
.btn:hover { background: #3f3f46; }
.btn-wa { background: #059669; border-color: #047857; font-weight: 600; }
.btn-wa:hover { background: #10b981; }
.btn-sm { padding: 6px 10px; font-size: 12px; }
#stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr)); gap: 8px; margin-bottom: 16px; }
.stat { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 8px 12px; }
.stat b { font-size: 18px; }
.stat span { display: block; font-size: 11px; color: #a1a1aa; margin-top: 2px; }
#bandeja { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 8px; margin-bottom: 16px; }
.accion { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 12px 14px; cursor: pointer; transition: border-color .15s ease; }
.accion:hover { border-color: #52525b; }
.accion b { font-size: 20px; }
.accion span { display: block; font-size: 12px; color: #a1a1aa; margin-top: 2px; }
.accion.verde { border-color: #10b98155; }
.accion.alerta { border-color: #f59e0b55; }
details.panel { background: #18181b; border: 1px solid #27272a; border-radius: 12px; margin-bottom: 16px; }
details.panel > summary { padding: 12px 16px; cursor: pointer; font-size: 13px; color: #d4d4d8; }
#analytics { padding: 0 16px 16px; overflow-x: auto; }
#analytics table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; }
#analytics th { color: #a1a1aa; font-weight: 500; padding: 6px 16px 6px 0; }
#analytics td { padding: 6px 16px 6px 0; border-top: 1px solid #27272a; }
.filtros { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; align-items: center; }
input[type="text"], select { background: #18181b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 8px; padding: 8px 10px; font-size: 13px; }
#q { flex: 1; min-width: 220px; }
#q::placeholder { color: #71717a; }
.check { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #d4d4d8; background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 8px 10px; }
.check input { accent-color: #10b981; }
#cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.card { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.card h3 { margin: 0; font-size: 15px; line-height: 1.25; }
.rubro { font-size: 12px; color: #a1a1aa; margin: 3px 0 0; }
.score { font-size: 12px; font-weight: 700; color: #a5b4fc; background: rgba(99,102,241,.15); padding: 4px 8px; border-radius: 8px; white-space: nowrap; }
.badges { display: flex; flex-wrap: wrap; gap: 6px; }
.badge { font-size: 11px; padding: 2px 9px; border-radius: 999px; }
.b-nuevo { background: rgba(14,165,233,.15); color: #7dd3fc; }
.b-enviado { background: rgba(245,158,11,.15); color: #fcd34d; }
.b-sin_respuesta { background: rgba(113,113,122,.2); color: #d4d4d8; }
.b-respondio { background: rgba(16,185,129,.15); color: #6ee7b7; }
.b-demo { background: rgba(139,92,246,.15); color: #c4b5fd; }
.b-cerrado { background: rgba(34,197,94,.18); color: #86efac; }
.b-descartado { background: rgba(244,63,94,.15); color: #fda4af; }
.b-fijo { background: rgba(113,113,122,.25); color: #a1a1aa; }
.b-recontacto { background: rgba(249,115,22,.15); color: #fdba74; }
.meta { font-size: 12px; color: #a1a1aa; }
.meta p { margin: 3px 0; }
a { color: #38bdf8; text-decoration: none; }
a:hover { text-decoration: underline; }
details.msj > summary { font-size: 13px; color: #d4d4d8; cursor: pointer; }
.texto { white-space: pre-wrap; background: rgba(9,9,11,.6); border: 1px solid #27272a; border-radius: 8px; padding: 12px; font-size: 13px; margin-top: 8px; }
.fup { font-size: 12px; color: #a1a1aa; white-space: pre-wrap; margin-top: 8px; }
.acciones { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: auto; }
.acciones select { margin-left: auto; font-size: 12px; padding: 6px 8px; }
#vacio { display: none; text-align: center; color: #71717a; padding: 48px 0; }
#vacio.visible { display: block; }
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <div>
      <h1>Impulso Web</h1>
      <p class="sub">Panel de prospección — actualizado: __ACTUALIZADO__</p>
      <p id="sync">Panel local</p>
    </div>
    <div style="display:flex; gap:8px;">
      <button id="btnRefrescar" class="btn">Refrescar</button>
      <button id="btnCsv" class="btn">Exportar CSV</button>
    </div>
  </header>

  <div id="stats"></div>
  <div id="bandeja"></div>

  <details class="panel">
    <summary>Analytics por rubro (tasa de respuesta y cierre)</summary>
    <div id="analytics"></div>
  </details>

  <div class="filtros">
    <input type="text" id="q" placeholder="Buscar nombre, teléfono, dirección...">
    <select id="fEstado"></select>
    <select id="fRubro"></select>
    <select id="fOrden">
      <option value="score">Mayor score</option>
      <option value="fecha">Más recientes</option>
    </select>
    <label class="check"><input type="checkbox" id="fCel">Solo celulares</label>
  </div>

  <div id="cards"></div>
  <p id="vacio">No hay leads que coincidan con el filtro.</p>
</div>

<script>
var DATA = __DATA__;
var WEBHOOK_ESTADO = '__WEBHOOK_ESTADO__';
var WEBHOOK_LEADS = '__WEBHOOK_LEADS__';
var WEBHOOK_PUBLICAR = '__WEBHOOK_PUBLICAR__';
var NL = String.fromCharCode(10);
var BOM = String.fromCharCode(65279);
var ESTADOS = ['nuevo', 'enviado', 'sin_respuesta', 'respondio', 'demo', 'cerrado', 'descartado'];
var soloVencidos = false;
var NOMBRE_ESTADO = { nuevo: 'Nuevo', enviado: 'Enviado', sin_respuesta: 'Sin respuesta', respondio: 'Respondió', demo: 'Demo enviada', cerrado: 'Cerrado', descartado: 'Descartado' };

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
  });
}
function leadId(l) { return l.placeId || l.telefono; }
function buscarLead(id) {
  for (var i = 0; i < DATA.length; i++) { if (leadId(DATA[i]) === id) return DATA[i]; }
  return null;
}

// --- Cola offline: si n8n está apagado, los cambios quedan en localStorage y se reintenta ---
function getCola() { try { return JSON.parse(localStorage.getItem('iw_cola') || '[]'); } catch (e) { return []; } }
function setColaLS(c) { localStorage.setItem('iw_cola', JSON.stringify(c)); }
function aplicarCola() {
  getCola().forEach(function (u) { var l = buscarLead(u.id); if (l) l.estado = u.estado; });
}
function encolar(u) {
  var c = getCola().filter(function (x) { return x.id !== u.id; });
  c.push(u);
  setColaLS(c);
}
function marcarSync(ok, msj) {
  var el = document.getElementById('sync');
  el.textContent = msj;
  el.className = ok ? 'ok' : 'warn';
}
function enviarEstado(u) {
  fetch(WEBHOOK_ESTADO, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(u) })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); marcarSync(true, 'Sincronizado con n8n'); })
    .catch(function () { encolar(u); marcarSync(false, 'n8n sin conexión: cambio guardado en el navegador, se reintenta solo'); });
}
function flushCola() {
  var c = getCola();
  if (!c.length) return;
  fetch(WEBHOOK_ESTADO, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates: c }) })
    .then(function (r) { if (r.ok) { setColaLS([]); marcarSync(true, 'Cambios pendientes sincronizados con n8n'); } })
    .catch(function () {});
}
function setEstado(id, estado) {
  var l = buscarLead(id);
  if (!l) return;
  var extra = {};
  if (estado === 'cerrado') {
    var m = prompt('¡Venta! 🎉 ¿Por qué monto cerraste? (solo números, ej: 170000)', l.monto || '');
    if (m !== null && String(m).trim() !== '') { l.monto = Number(String(m).replace(/[^0-9]/g, '')) || 0; extra.monto = l.monto; }
    var ab = prompt('¿Acordaste un abono mensual (mantenimiento/turnos)? Monto o dejalo vacío:', l.mensual || '');
    if (ab !== null && String(ab).trim() !== '') { l.mensual = Number(String(ab).replace(/[^0-9]/g, '')) || 0; extra.mensual = l.mensual; }
  }
  l.estado = estado;
  l.fechaEstado = new Date().toISOString();
  enviarEstado(Object.assign({ id: id, placeId: l.placeId || '', telefono: l.telefono || '', estado: estado, fecha: l.fechaEstado }, extra));
  render();
}
function diasDesde(l) {
  var f = l.fechaEstado || l.fechaAgregado;
  if (!f) return 0;
  return (Date.now() - new Date(f).getTime()) / 86400000;
}
function esFollowupVencido(l) {
  return l.estado === 'enviado' && diasDesde(l) >= 3;
}
function publicar(l, btn) {
  var t = btn.textContent;
  btn.textContent = 'Publicando…';
  btn.disabled = true;
  fetch(WEBHOOK_PUBLICAR, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ placeId: l.placeId || '', telefono: l.telefono || '' }) })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (d) {
      if (!d || !d.url) throw new Error('sin url');
      l.netlifyUrl = d.url;
      marcarSync(true, 'Muestra publicada: ' + d.url);
      render();
    })
    .catch(function () {
      btn.textContent = t;
      btn.disabled = false;
      marcarSync(false, 'No se pudo publicar: revisá que el workflow esté activo y el token de Netlify en el nodo "Config publicar"');
    });
}
function refrescar() {
  fetch(WEBHOOK_LEADS)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d && Array.isArray(d.leads)) { DATA = d.leads; aplicarCola(); render(); marcarSync(true, 'Datos en vivo desde n8n'); }
    })
    .catch(function () { marcarSync(false, 'n8n apagado: mostrando snapshot de la última corrida'); });
}

function copiar(texto, btn) {
  var listo = function () {
    var t = btn.textContent;
    btn.textContent = 'Copiado ✓';
    setTimeout(function () { btn.textContent = t; }, 1200);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(texto).then(listo, function () { copiarViejo(texto, listo); });
  } else {
    copiarViejo(texto, listo);
  }
}
function copiarViejo(texto, listo) {
  var ta = document.createElement('textarea');
  ta.value = texto;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (e) {}
  document.body.removeChild(ta);
  listo();
}

function contar() {
  var c = { total: DATA.length };
  ESTADOS.forEach(function (e) { c[e] = 0; });
  DATA.forEach(function (l) { if (c[l.estado] != null) c[l.estado]++; });
  c.contactados = c.enviado + c.sin_respuesta + c.respondio + c.demo + c.cerrado;
  c.respuestas = c.respondio + c.demo + c.cerrado;
  c.tasa = c.contactados ? Math.round(100 * c.respuestas / c.contactados) : 0;
  c.facturado = 0;
  c.mrr = 0;
  DATA.forEach(function (l) {
    if (l.estado === 'cerrado') {
      c.facturado += Number(l.monto) || 0;
      c.mrr += Number(l.mensual) || 0;
    }
  });
  return c;
}
function renderStats() {
  var c = contar();
  var tarjetas = [
    ['Total', c.total], ['Nuevos', c.nuevo], ['Enviados', c.enviado], ['Sin respuesta', c.sin_respuesta],
    ['Respondieron', c.respondio], ['Demos', c.demo], ['Cerrados', c.cerrado], ['Tasa de respuesta', c.tasa + '%'],
    ['Facturado', '$ ' + c.facturado.toLocaleString('es-AR')], ['Abonos/mes', '$ ' + c.mrr.toLocaleString('es-AR')]
  ];
  document.getElementById('stats').innerHTML = tarjetas.map(function (t) {
    return '<div class="stat"><b>' + t[1] + '</b><span>' + t[0] + '</span></div>';
  }).join('');
}
function renderBandeja() {
  var calientes = DATA.filter(function (l) { return l.estado === 'respondio'; }).length;
  var vencidos = DATA.filter(esFollowupVencido).length;
  var nuevos = DATA.filter(function (l) { return l.estado === 'nuevo'; }).length;
  document.getElementById('bandeja').innerHTML =
    '<div class="accion verde" data-bandeja="calientes"><b>' + calientes + '</b><span>🔥 Respondieron: contestá YA y mandá la muestra</span></div>'
    + '<div class="accion alerta" data-bandeja="followups"><b>' + vencidos + '</b><span>⏰ Follow-ups vencidos (3+ días sin respuesta)</span></div>'
    + '<div class="accion" data-bandeja="nuevos"><b>' + nuevos + '</b><span>📤 Nuevos para enviar (máx. 25 por día)</span></div>';
}
function renderAnalytics() {
  var g = {};
  DATA.forEach(function (l) {
    var r = l.rubro || 'otros';
    if (!g[r]) g[r] = { total: 0, contactados: 0, respuestas: 0, cerrados: 0 };
    g[r].total++;
    if (l.estado && l.estado !== 'nuevo' && l.estado !== 'descartado') g[r].contactados++;
    if (l.estado === 'respondio' || l.estado === 'demo' || l.estado === 'cerrado') g[r].respuestas++;
    if (l.estado === 'cerrado') g[r].cerrados++;
  });
  var filas = Object.keys(g).sort().map(function (r) {
    var x = g[r];
    var tasa = x.contactados ? Math.round(100 * x.respuestas / x.contactados) : 0;
    return '<tr><td>' + esc(r) + '</td><td>' + x.total + '</td><td>' + x.contactados + '</td><td>' + x.respuestas + '</td><td>' + x.cerrados + '</td><td>' + tasa + '%</td></tr>';
  }).join('');
  document.getElementById('analytics').innerHTML = '<table><thead><tr><th>Rubro</th><th>Leads</th><th>Contactados</th><th>Respuestas</th><th>Cerrados</th><th>Tasa resp.</th></tr></thead><tbody>' + filas + '</tbody></table>';
}

function cardHtml(l) {
  var id = esc(leadId(l));
  var badges = '<span class="badge b-' + (ESTADOS.indexOf(l.estado) !== -1 ? l.estado : 'nuevo') + '">' + (NOMBRE_ESTADO[l.estado] || esc(l.estado)) + '</span>';
  if (l.recontacto) badges += '<span class="badge b-recontacto">recontacto</span>';
  if (!l.esCelular) badges += '<span class="badge b-fijo" title="Teléfono fijo: puede no tener WhatsApp">fijo</span>';
  if (esFollowupVencido(l)) badges += '<span class="badge b-enviado">⏰ toca follow-up</span>';
  if (l.estado === 'cerrado' && (l.monto || l.mensual)) badges += '<span class="badge b-cerrado">$ ' + ((Number(l.monto) || 0).toLocaleString('es-AR')) + (l.mensual ? ' + $' + Number(l.mensual).toLocaleString('es-AR') + '/mes' : '') + '</span>';
  var rating = l.rating ? ('&#9733; ' + l.rating + ' (' + (l.resenas || 0) + ')') : 'sin reseñas';
  var red = l.red ? ('<a href="' + esc(l.urlRed) + '" target="_blank">' + esc(l.red) + '</a>') : 'sin redes';
  var opciones = ESTADOS.map(function (e) {
    return '<option value="' + e + '"' + (l.estado === e ? ' selected' : '') + '>' + NOMBRE_ESTADO[e] + '</option>';
  }).join('');
  return '<div class="card">'
    + '<div class="card-top">'
    + '<div><h3>' + esc(l.nombre) + '</h3>'
    + '<p class="rubro">' + esc(l.rubro) + (l.zona ? ' &middot; ' + esc(l.zona) : '') + '</p></div>'
    + '<span class="score" title="Score">' + (l.score || 0) + ' pts</span>'
    + '</div>'
    + '<div class="badges">' + badges + '</div>'
    + '<div class="meta">'
    + '<p>' + esc(l.telefono) + ' &middot; ' + rating + ' &middot; ' + red + '</p>'
    + (l.direccion ? '<p>' + esc(l.direccion) + (l.mapsUrl ? ' &middot; <a target="_blank" href="' + esc(l.mapsUrl) + '">Maps</a>' : '') + '</p>' : '')
    + (l.nota ? '<p style="color:#fbbf24;">📝 ' + esc(l.nota) + '</p>' : '')
    + '</div>'
    + '<details class="msj"><summary>Ver mensajes</summary>'
    + '<p class="texto">' + esc(l.mensaje || '') + '</p>'
    + (l.pitch ? '<p class="fup"><b>Pitch (cuando responde con interés):</b></p><p class="texto">' + esc(l.pitch) + '</p>' : '')
    + (l.followup ? '<p class="fup"><b>Follow-up (a los 3 días):</b> ' + esc(l.followup) + '</p>' : '')
    + '</details>'
    + '<div class="acciones">'
    + '<button data-accion="wa" data-id="' + id + '" class="btn btn-wa">WhatsApp</button>'
    + (l.demoArchivo ? '<a class="btn btn-sm" style="text-decoration:none;color:#f4f4f5;" href="' + esc(l.demoArchivo) + '" target="_blank">Ver muestra</a>' : '')
    + (l.netlifyUrl
      ? '<a class="btn btn-sm" style="text-decoration:none;color:#6ee7b7;" href="' + esc(l.netlifyUrl) + '" target="_blank">Ver online</a><button data-accion="copiar-link" data-id="' + id + '" class="btn btn-sm">Copiar link</button>'
      : (l.demoArchivo ? '<button data-accion="publicar" data-id="' + id + '" class="btn btn-sm">Publicar</button>' : ''))
    + '<button data-accion="copiar-pitch" data-id="' + id + '" class="btn btn-sm">Copiar pitch</button>'
    + '<button data-accion="copiar-followup" data-id="' + id + '" class="btn btn-sm">Copiar follow-up</button>'
    + '<button data-accion="nota" data-id="' + id + '" class="btn btn-sm" title="Agregar nota">📝</button>'
    + '<select data-id="' + id + '">' + opciones + '</select>'
    + '</div>'
    + '</div>';
}

function byScore(a, b) { return (b.score || 0) - (a.score || 0); }
function byFecha(a, b) { return String(b.fechaAgregado || '').localeCompare(String(a.fechaAgregado || '')); }

function opcionesRubro(sel) {
  var rubros = {};
  DATA.forEach(function (l) { if (l.rubro) rubros[l.rubro] = true; });
  document.getElementById('fRubro').innerHTML = '<option value="">Todos los rubros</option>'
    + Object.keys(rubros).sort().map(function (r) {
      return '<option value="' + esc(r) + '"' + (r === sel ? ' selected' : '') + '>' + esc(r) + '</option>';
    }).join('');
}

function render() {
  var q = document.getElementById('q').value.toLowerCase();
  var fe = document.getElementById('fEstado').value || '';
  var fr = document.getElementById('fRubro').value || '';
  var orden = document.getElementById('fOrden').value || 'score';
  var soloCel = document.getElementById('fCel').checked;
  opcionesRubro(fr);
  var lista = DATA.filter(function (l) {
    if (fe && l.estado !== fe) return false;
    if (soloVencidos && !esFollowupVencido(l)) return false;
    if (fr && l.rubro !== fr) return false;
    if (soloCel && !l.esCelular) return false;
    if (q) {
      var blob = ((l.nombre || '') + ' ' + (l.telefono || '') + ' ' + (l.direccion || '') + ' ' + (l.zona || '')).toLowerCase();
      if (blob.indexOf(q) === -1) return false;
    }
    return true;
  });
  lista.sort(orden === 'fecha' ? byFecha : byScore);
  renderStats();
  renderBandeja();
  renderAnalytics();
  document.getElementById('cards').innerHTML = lista.map(cardHtml).join('');
  document.getElementById('vacio').className = lista.length ? '' : 'visible';
}

function exportarCsv() {
  var cab = ['nombre', 'telefono', 'celular', 'rubro', 'zona', 'estado', 'score', 'rating', 'resenas', 'direccion', 'red', 'fechaAgregado', 'monto', 'mensual', 'nota', 'urlOnline', 'mensaje', 'pitch', 'followup'];
  var filas = DATA.map(function (l) {
    return [l.nombre, l.telefono, l.esCelular ? 'si' : 'no', l.rubro, l.zona, l.estado, l.score, l.rating, l.resenas, l.direccion, l.red, l.fechaAgregado, l.monto, l.mensual, l.nota, l.netlifyUrl, l.mensaje, l.pitch, l.followup]
      .map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; })
      .join(';');
  });
  var blob = new Blob([BOM + [cab.join(';')].concat(filas).join(NL)], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'leads_impulso_web.csv';
  a.click();
}

document.getElementById('cards').addEventListener('click', function (ev) {
  var el = ev.target.closest('[data-accion]');
  if (!el) return;
  var l = buscarLead(el.getAttribute('data-id'));
  if (!l) return;
  var accion = el.getAttribute('data-accion');
  if (accion === 'wa') {
    window.open('https://wa.me/' + l.telefono + '?text=' + encodeURIComponent(l.mensaje || ''), '_blank');
    if (l.estado === 'nuevo') setEstado(leadId(l), 'enviado');
  } else if (accion === 'copiar-mensaje') {
    copiar(l.mensaje || '', el);
  } else if (accion === 'copiar-pitch') {
    copiar(l.pitch || '', el);
  } else if (accion === 'copiar-followup') {
    copiar(l.followup || '', el);
  } else if (accion === 'publicar') {
    publicar(l, el);
  } else if (accion === 'copiar-link') {
    copiar(l.netlifyUrl || '', el);
  } else if (accion === 'nota') {
    var v = prompt('Nota para ' + (l.nombre || 'este lead') + ':', l.nota || '');
    if (v !== null) {
      l.nota = v;
      enviarEstado({ id: leadId(l), placeId: l.placeId || '', telefono: l.telefono || '', estado: l.estado || 'nuevo', nota: v, fecha: new Date().toISOString() });
      render();
    }
  }
});
document.getElementById('bandeja').addEventListener('click', function (ev) {
  var el = ev.target.closest('[data-bandeja]');
  if (!el) return;
  document.getElementById('q').value = '';
  var fe = document.getElementById('fEstado');
  soloVencidos = false;
  var cual = el.getAttribute('data-bandeja');
  if (cual === 'nuevos') fe.value = 'nuevo';
  if (cual === 'followups') { fe.value = 'enviado'; soloVencidos = true; }
  if (cual === 'calientes') fe.value = 'respondio';
  render();
});
document.getElementById('cards').addEventListener('change', function (ev) {
  var sel = ev.target.closest('select[data-id]');
  if (sel) setEstado(sel.getAttribute('data-id'), sel.value);
});
document.getElementById('fEstado').innerHTML = '<option value="">Todos los estados</option>'
  + ESTADOS.map(function (e) { return '<option value="' + e + '">' + NOMBRE_ESTADO[e] + '</option>'; }).join('');
['q', 'fEstado', 'fRubro', 'fOrden', 'fCel'].forEach(function (fid) {
  document.getElementById(fid).addEventListener('input', function () {
    if (fid === 'fEstado') soloVencidos = false;
    render();
  });
});
document.getElementById('btnRefrescar').addEventListener('click', refrescar);
document.getElementById('btnCsv').addEventListener('click', exportarCsv);

aplicarCola();
render();
flushCola();
refrescar();
<\/script>
</body>
</html>`;

  return plantilla
    .replace('__DATA__', () => datos)
    .replace('__WEBHOOK_ESTADO__', () => String(cfg.webhookEstadoUrl || ''))
    .replace('__WEBHOOK_LEADS__', () => String(cfg.webhookLeadsUrl || ''))
    .replace('__WEBHOOK_PUBLICAR__', () => String(cfg.webhookPublicarUrl || ''))
    .replace('__ACTUALIZADO__', () => fecha);
}
