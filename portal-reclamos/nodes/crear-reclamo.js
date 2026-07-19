// Recibe un reclamo del portal público (POST /reclamo-crear) y lo guarda como
// ticket en la base, con un código de seguimiento para que el cliente lo consulte.
const body = $('Webhook Crear reclamo').first().json.body || {};

const nombre = String(body.nombre || '').trim();
const email = String(body.email || '').trim().toLowerCase();
const orden = String(body.orden || '').trim();
const asunto = String(body.asunto || '').trim();
const mensaje = String(body.mensaje || '').trim();

// Validaciones mínimas: sin esto el ticket no sirve.
const errores = [];
if (nombre.length < 2) errores.push('nombre');
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errores.push('email');
if (mensaje.length < 5) errores.push('mensaje');
if (errores.length) {
  return [{ json: { ok: false, error: 'Faltan datos válidos: ' + errores.join(', ') } }];
}

let db = { version: 1, reclamos: [] };
try {
  const raw = $('Extraer reclamos (crear)').first().json;
  if (raw && Array.isArray(raw.reclamos)) db = raw;
  else if (Array.isArray(raw)) db = { version: 1, reclamos: raw };
} catch (e) {
  // Primera vez: la base no existe todavía.
}
if (!Array.isArray(db.reclamos)) db.reclamos = [];

const ahora = new Date().toISOString();
// Código de seguimiento legible: R-AÑO-#### (secuencial).
const numero = db.reclamos.length + 1;
const codigo = 'R-' + new Date().getFullYear() + '-' + String(numero).padStart(4, '0');

const ticket = {
  codigo,
  nombre,
  email,
  orden,
  asunto: asunto || 'Reclamo',
  mensaje,
  estado: 'recibido', // recibido -> en_proceso -> resuelto / cerrado
  prioridad: /urgen|no lleg|estafa|fraude|reembolso|devoluc/i.test(asunto + ' ' + mensaje) ? 'alta' : 'normal',
  creado: ahora,
  actualizado: ahora,
  respuestas: [],
  historial: [{ fecha: ahora, evento: 'creado' }],
};
db.reclamos.push(ticket);
db.actualizado = ahora;

return [{
  json: { ok: true, codigo, estado: ticket.estado },
  binary: {
    data: {
      data: Buffer.from(JSON.stringify(db, null, 2), 'utf8').toString('base64'),
      mimeType: 'application/json',
      fileName: 'reclamos_db.json',
    },
  },
}];
