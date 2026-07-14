// Recibe cambios de estado desde el dashboard (webhook POST /impulso-estado)
// y los persiste en la base maestra. Acepta un cambio suelto o un lote:
//   { "telefono": "549...", "estado": "enviado" }
//   { "updates": [ { "placeId": "...", "estado": "respondio" }, ... ] }
const body = $('Webhook Estado').first().json.body || {};

let db = null;
try {
  const raw = $('Extraer base (estado)').first().json;
  if (raw && Array.isArray(raw.leads)) db = raw;
  else if (Array.isArray(raw)) db = { leads: raw };
} catch (e) {
  // se maneja abajo
}
if (!db) {
  throw new Error('No se pudo leer la base de leads. ¿Ya corriste el workflow al menos una vez?');
}

const ESTADOS_VALIDOS = ['nuevo', 'enviado', 'sin_respuesta', 'respondio', 'demo', 'cerrado', 'descartado'];
const updates = Array.isArray(body.updates) ? body.updates : [body];
const ahora = new Date().toISOString();

let aplicados = 0;
for (const u of updates) {
  if (!u || !u.estado || !ESTADOS_VALIDOS.includes(u.estado)) continue;
  const lead = db.leads.find(
    (l) => (u.placeId && l.placeId === u.placeId) || (u.telefono && l.telefono === u.telefono),
  );
  if (!lead) continue;
  lead.estado = u.estado;
  lead.fechaEstado = u.fecha || ahora;
  if (u.nota != null) lead.nota = String(u.nota);
  if (u.monto != null) lead.monto = Number(u.monto) || 0;
  if (u.mensual != null) lead.mensual = Number(u.mensual) || 0;
  lead.historial = (lead.historial || []).concat([{ fecha: ahora, evento: 'estado:' + u.estado }]);
  aplicados += 1;
}
db.actualizado = ahora;

return [{
  json: { ok: true, aplicados, recibidos: updates.length },
  binary: {
    data: {
      data: Buffer.from(JSON.stringify(db, null, 2), 'utf8').toString('base64'),
      mimeType: 'application/json',
      fileName: 'leads_db.json',
    },
  },
}];
