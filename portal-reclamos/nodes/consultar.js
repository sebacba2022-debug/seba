// Consulta pública (GET /reclamo-consultar). Sirve dos cosas con el mismo endpoint:
//  - por codigo de reclamo (R-2026-0001) -> estado y respuestas del ticket
//  - por nro de orden + email -> estado de la compra (desde la tabla de ventas)
// Nunca devuelve datos sensibles: solo lo mínimo para que el cliente se ubique.
const q = $('Webhook Consultar').first().json.query || {};
const codigo = String(q.codigo || '').trim().toUpperCase();
const orden = String(q.orden || '').trim();
const email = String(q.email || '').trim().toLowerCase();

function leer(nodo, clave) {
  try {
    const raw = $(nodo).first().json;
    if (raw && Array.isArray(raw[clave])) return raw[clave];
    if (Array.isArray(raw)) return raw;
  } catch (e) { /* base ausente */ }
  return [];
}

// 1. Consulta por código de reclamo.
if (codigo) {
  const r = leer('Extraer reclamos (consulta)', 'reclamos').find((x) => String(x.codigo).toUpperCase() === codigo);
  if (!r) return [{ json: { ok: false, tipo: 'reclamo', error: 'No encontramos un reclamo con ese código.' } }];
  return [{
    json: {
      ok: true,
      tipo: 'reclamo',
      codigo: r.codigo,
      estado: r.estado,
      asunto: r.asunto,
      creado: r.creado,
      actualizado: r.actualizado,
      respuestas: (r.respuestas || []).map((x) => ({ fecha: x.fecha, texto: x.texto })),
    },
  }];
}

// 2. Consulta de compra por orden + email (la tabla de ventas la carga el negocio).
if (orden && email) {
  const venta = leer('Extraer ventas', 'ventas').find(
    (v) => String(v.orden).trim() === orden && String(v.email).trim().toLowerCase() === email,
  );
  if (!venta) return [{ json: { ok: false, tipo: 'orden', error: 'No encontramos una compra con esos datos. Revisá el número de orden y el email.' } }];
  return [{
    json: {
      ok: true,
      tipo: 'orden',
      orden: venta.orden,
      estado: venta.estado || 'confirmada',
      evento: venta.evento || '',
      cantidad: venta.cantidad || null,
      fecha: venta.fecha || '',
      detalle: venta.detalle || '',
    },
  }];
}

return [{ json: { ok: false, error: 'Ingresá un código de reclamo, o tu número de orden y email.' } }];
