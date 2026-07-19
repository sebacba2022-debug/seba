// El panel del negocio (POST /reclamo-actualizar) cambia el estado de un ticket,
// le agrega una respuesta para el cliente, o ajusta la prioridad.
const body = $('Webhook Actualizar').first().json.body || {};
const codigo = String(body.codigo || '').trim().toUpperCase();

let db = null;
try {
  const raw = $('Extraer reclamos (actualizar)').first().json;
  if (raw && Array.isArray(raw.reclamos)) db = raw;
  else if (Array.isArray(raw)) db = { version: 1, reclamos: raw };
} catch (e) { /* se maneja abajo */ }
if (!db) throw new Error('No se pudo leer la base de reclamos.');

const r = db.reclamos.find((x) => String(x.codigo).toUpperCase() === codigo);
if (!r) return [{ json: { ok: false, error: 'Reclamo no encontrado: ' + codigo } }];
if (!Array.isArray(r.historial)) r.historial = [];
if (!Array.isArray(r.respuestas)) r.respuestas = [];

const ESTADOS = ['recibido', 'en_proceso', 'resuelto', 'cerrado'];
const ahora = new Date().toISOString();

if (body.estado && ESTADOS.includes(body.estado)) {
  r.estado = body.estado;
  r.historial.push({ fecha: ahora, evento: 'estado:' + body.estado });
}
if (body.prioridad && ['alta', 'normal', 'baja'].includes(body.prioridad)) {
  r.prioridad = body.prioridad;
}
if (body.respuesta && String(body.respuesta).trim()) {
  r.respuestas.push({ fecha: ahora, texto: String(body.respuesta).trim() });
  r.historial.push({ fecha: ahora, evento: 'respuesta' });
}
r.actualizado = ahora;
db.actualizado = ahora;

return [{
  json: { ok: true, codigo: r.codigo, estado: r.estado },
  binary: {
    data: {
      data: Buffer.from(JSON.stringify(db, null, 2), 'utf8').toString('base64'),
      mimeType: 'application/json',
      fileName: 'reclamos_db.json',
    },
  },
}];
