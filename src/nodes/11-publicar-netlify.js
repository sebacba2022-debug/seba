// Publica la muestra en Netlify vía API (crea el sitio si no existe, sube el
// index.html) y guarda la URL en la base. La primera publicación de un lead
// crea el sitio; las siguientes lo actualizan en la misma URL.
const config = $('Config publicar').first().json;
const prep = $('Preparar publicación').first().json;
const token = String(config.netlifyToken || '').trim();

const html = String($input.first().json.data || '');
if (!html) throw new Error('No se pudo leer el HTML de la muestra en ' + prep.demoRuta);

// SHA-1 en JS puro (Netlify identifica cada archivo por su hash SHA-1).
function sha1Hex(texto) {
  const bytes = Buffer.from(texto, 'utf8');
  const ml = bytes.length;
  const total = Math.ceil((ml + 9) / 64) * 64;
  const msg = new Uint8Array(total);
  msg.set(bytes);
  msg[ml] = 0x80;
  const bitLen = ml * 8;
  const hi = Math.floor(bitLen / 4294967296);
  const lo = bitLen >>> 0;
  msg[total - 8] = (hi >>> 24) & 255; msg[total - 7] = (hi >>> 16) & 255;
  msg[total - 6] = (hi >>> 8) & 255; msg[total - 5] = hi & 255;
  msg[total - 4] = (lo >>> 24) & 255; msg[total - 3] = (lo >>> 16) & 255;
  msg[total - 2] = (lo >>> 8) & 255; msg[total - 1] = lo & 255;
  let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
  const w = new Array(80);
  for (let i = 0; i < total; i += 64) {
    for (let t = 0; t < 16; t++) {
      w[t] = ((msg[i + 4 * t] << 24) | (msg[i + 4 * t + 1] << 16) | (msg[i + 4 * t + 2] << 8) | msg[i + 4 * t + 3]) >>> 0;
    }
    for (let t = 16; t < 80; t++) {
      const x = w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16];
      w[t] = ((x << 1) | (x >>> 31)) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let t = 0; t < 80; t++) {
      let f, k;
      if (t < 20) { f = (b & c) | (~b & d); k = 0x5A827999; }
      else if (t < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1; }
      else if (t < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
      else { f = b ^ c ^ d; k = 0xCA62C1D6; }
      const temp = ((((a << 5) | (a >>> 27)) >>> 0) + (f >>> 0) + e + k + w[t]) >>> 0;
      e = d; d = c; c = ((b << 30) | (b >>> 2)) >>> 0; b = a; a = temp;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }
  return [h0, h1, h2, h3, h4].map((x) => x.toString(16).padStart(8, '0')).join('');
}

const api = 'https://api.netlify.com/api/v1';
const auth = { Authorization: 'Bearer ' + token };

// 1. Sitio: reusar el del lead, o crear uno nuevo (si el nombre ya es nuestro, recuperarlo).
let site = null;
if (prep.sitioExistente) {
  site = { id: prep.sitioExistente };
} else {
  try {
    site = await this.helpers.httpRequest({ method: 'POST', url: api + '/sites', headers: auth, body: { name: prep.siteName }, json: true });
  } catch (e) {
    site = await this.helpers.httpRequest({ method: 'GET', url: api + '/sites/' + prep.siteName + '.netlify.app', headers: auth, json: true });
  }
}

// 2. Deploy declarando el archivo por su SHA-1.
const sha = sha1Hex(html);
const deploy = await this.helpers.httpRequest({
  method: 'POST',
  url: api + '/sites/' + site.id + '/deploys',
  headers: auth,
  body: { files: { '/index.html': sha } },
  json: true,
});

// 3. Subir el archivo solo si Netlify no lo tiene cacheado de un deploy anterior.
if ((deploy.required || []).includes(sha)) {
  await this.helpers.httpRequest({
    method: 'PUT',
    url: api + '/deploys/' + deploy.id + '/files/index.html',
    headers: { ...auth, 'Content-Type': 'application/octet-stream' },
    body: html,
  });
}

const url = deploy.ssl_url || site.ssl_url || ('https://' + prep.siteName + '.netlify.app');

// 4. Guardar la URL en la base.
let db = null;
try {
  const raw = $('Extraer base (publicar)').first().json;
  if (raw && Array.isArray(raw.leads)) db = raw;
  else if (Array.isArray(raw)) db = { leads: raw };
} catch (e) {
  // se maneja abajo
}
if (!db) throw new Error('La muestra se publicó en ' + url + ' pero no se pudo releer la base para guardar la URL.');

const lead = db.leads.find((l) => (prep.placeId && l.placeId === prep.placeId) || (prep.telefono && l.telefono === prep.telefono));
if (lead) {
  lead.netlifySiteId = site.id;
  lead.netlifyUrl = url;
  lead.historial = (lead.historial || []).concat([{ fecha: new Date().toISOString(), evento: 'muestra publicada' }]);
}
db.actualizado = new Date().toISOString();

return [{
  json: { ok: true, url, placeId: prep.placeId, telefono: prep.telefono },
  binary: {
    data: {
      data: Buffer.from(JSON.stringify(db, null, 2), 'utf8').toString('base64'),
      mimeType: 'application/json',
      fileName: 'leads_db.json',
    },
  },
}];
