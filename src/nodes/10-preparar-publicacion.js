// Recibe el pedido del botón "Publicar" del panel y prepara la publicación:
// valida el token de Netlify, busca el lead en la base y arma el nombre del
// sitio y la ruta del archivo de la muestra.
const body = $('Webhook Publicar').first().json.body || {};
const config = $('Config publicar').first().json;

if (String(config.netlifyToken || '').includes('PEGAR')) {
  throw new Error('Falta el token de Netlify: crealo en Netlify (User settings > Applications > New access token) y pegalo en el nodo "Config publicar".');
}

let db = null;
try {
  const raw = $('Extraer base (publicar)').first().json;
  if (raw && Array.isArray(raw.leads)) db = raw;
  else if (Array.isArray(raw)) db = { leads: raw };
} catch (e) {
  // se maneja abajo
}
if (!db) throw new Error('No se pudo leer la base de leads. ¿Ya corriste el workflow principal?');

const lead = db.leads.find(
  (l) => (body.placeId && l.placeId === body.placeId) || (body.telefono && l.telefono === body.telefono),
);
if (!lead) throw new Error('Lead no encontrado en la base.');
if (!lead.demoArchivo) throw new Error('Este lead todavía no tiene muestra generada: corré el workflow principal primero.');

const archivo = String(lead.demoArchivo).split('/').pop();
const carpeta = String(config.rutaDemos || 'C:/ImpulsoWeb/demos').replace(/[\\/]+$/, '');

return [{
  json: {
    placeId: lead.placeId || '',
    telefono: lead.telefono || '',
    siteName: ('impulsoweb-' + archivo.replace(/\.html$/, '')).slice(0, 60),
    demoRuta: carpeta + '/' + archivo,
    sitioExistente: lead.netlifySiteId || '',
  },
}];
