// Aplana las respuestas de Places API, arma leads con formato propio y descarta:
// - negocios con web real (los que tienen solo Instagram/Facebook/Linktree SÍ son leads)
// - negocios sin teléfono
// - duplicados dentro de la corrida y contra la base (respetando diasMinimos)
const config = $('Config').first().json;
const diasMinimos = Number(config.diasMinimos) || 30;

let base = [];
try {
  const raw = $('Extraer base').first().json;
  if (raw && Array.isArray(raw.leads)) base = raw.leads;
  else if (Array.isArray(raw)) base = raw;
} catch (e) {
  // Primera corrida: la base todavía no existe.
}

const porClave = new Map();
for (const l of base) {
  if (l.placeId) porClave.set(l.placeId, l);
  if (l.telefono) porClave.set(l.telefono, l);
}

const REDES = [
  ['instagram.com', 'instagram'],
  ['facebook.com', 'facebook'],
  ['linktr.ee', 'linktree'],
  ['wa.me', 'whatsapp'],
  ['api.whatsapp.com', 'whatsapp'],
  ['tiktok.com', 'tiktok'],
];

function detectarRed(url) {
  const u = String(url || '').toLowerCase();
  for (const [dominio, red] of REDES) {
    if (u.includes(dominio)) return red;
  }
  return null;
}

// Normaliza a formato WhatsApp argentino: 549 + código de área + número (sin 0 ni 15).
function normalizarTelefono(nacional, internacional) {
  let d = String(internacional || nacional || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('54')) d = d.slice(2);
  if (d.startsWith('9')) d = d.slice(1);
  if (d.startsWith('0')) d = d.slice(1);
  // Si quedó el "15" del formato local (área de 2 a 4 dígitos + 15 + local), sacarlo.
  if (d.length === 12) {
    for (const areaLen of [2, 3, 4]) {
      if (d.slice(areaLen, areaLen + 2) === '15') {
        d = d.slice(0, areaLen) + d.slice(areaLen + 2);
        break;
      }
    }
  }
  if (d.length < 10) return null;
  if (d.length > 10) d = d.slice(-10);
  return '549' + d;
}

const vistos = new Set();
const out = [];
const entradas = $input.all();

for (let i = 0; i < entradas.length; i++) {
  // Recupera qué búsqueda (rubro/zona) originó esta página de resultados.
  let origen = {};
  try {
    origen = $('Armar búsquedas').itemMatching(i).json;
  } catch (e) {
    // Si n8n no puede trazar el item de origen, el lead sale sin rubro/zona.
  }

  const places = entradas[i].json.places || [];
  for (const p of places) {
    const web = p.websiteUri || '';
    const red = detectarRed(web);
    if (web && !red) continue; // tiene web real: no es lead

    const telefono = normalizarTelefono(p.nationalPhoneNumber, p.internationalPhoneNumber);
    if (!telefono) continue; // sin teléfono no hay canal de contacto

    // Google marca los celulares argentinos con +54 9: es el mejor indicador de WhatsApp.
    const esCelular = String(p.internationalPhoneNumber || '').replace(/\s/g, '').startsWith('+549');

    const existente = porClave.get(p.id) || porClave.get(telefono);
    let recontacto = false;
    if (existente) {
      const dias = (Date.now() - new Date(existente.fechaAgregado || 0).getTime()) / 86400000;
      const recontactable = ['enviado', 'sin_respuesta'].includes(existente.estado);
      if (!recontactable || dias < diasMinimos) continue;
      recontacto = true;
    }

    if (vistos.has(p.id) || vistos.has(telefono)) continue;
    vistos.add(p.id);
    vistos.add(telefono);

    out.push({
      json: {
        placeId: p.id,
        nombre: (p.displayName && p.displayName.text) || 'Negocio',
        telefono,
        esCelular,
        red,
        urlRed: red ? web : '',
        rating: p.rating || null,
        resenas: p.userRatingCount || 0,
        direccion: p.formattedAddress || '',
        mapsUrl: p.googleMapsUri || '',
        rubro: origen.rubro || '',
        prioritario: !!origen.prioritario,
        zona: origen.zona || '',
        recontacto,
      },
    });
  }
}

return out;
