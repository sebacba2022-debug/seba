#!/usr/bin/env node
// Ensambla workflows/impulso-web-v8.json a partir de src/nodes/*.js y corre
// pruebas de humo sobre cada nodo Code (simulando el entorno de n8n).
//
// Uso:
//   node tools/build-workflow.js                  -> testea y genera el workflow
//   node tools/build-workflow.js --preview x.html -> además guarda un dashboard de muestra
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const RAIZ = path.join(__dirname, '..');
const DIR_NODOS = path.join(RAIZ, 'src', 'nodes');
const SALIDA = path.join(RAIZ, 'workflows', 'impulso-web-v8.json');

const leer = (nombre) => fs.readFileSync(path.join(DIR_NODOS, nombre), 'utf8');

const codigo = {
  armarBusquedas: leer('01-armar-busquedas.js'),
  normalizar: leer('02-normalizar-dedupear.js'),
  score: leer('03-calcular-score.js'),
  armarPrompt: leer('04-armar-prompt.js'),
  asignarMensajes: leer('05-asignar-mensajes.js'),
  generarDemos: leer('09-generar-demos.js'),
  actualizarBase: leer('06-actualizar-base-dashboard.js'),
  resumen: leer('07-resumen.js'),
  actualizarEstado: leer('08-actualizar-estado.js'),
  prepararPublicacion: leer('10-preparar-publicacion.js'),
  publicarNetlify: leer('11-publicar-netlify.js'),
};

// ---------------------------------------------------------------------------
// Pruebas de humo: simulan $, $input y Buffer como en el nodo Code de n8n
// ---------------------------------------------------------------------------

const configMock = {
  placesApiKey: 'clave-de-prueba',
  geminiApiKey: 'clave-de-prueba',
  nombreVendedor: 'Seba',
  ofertaDetalle: 'Landing page profesional por $170.000 ARS (precio promocional), seña 50%, entrega 48hs. Como primer paso se ofrece armar una muestra gratis y sin compromiso de cómo podría verse la web.',
  rutaDemos: 'C:/ImpulsoWeb/demos',
  zonas: '["Córdoba Capital, Córdoba, Argentina"]',
  rubros: '[{"rubro":"peluquería","prioritario":true},{"rubro":"gimnasio","prioritario":false}]',
  maxLeads: 15,
  diasMinimos: 30,
  rutaBase: 'C:/ImpulsoWeb/leads_db.json',
  rutaDashboard: 'C:/ImpulsoWeb/dashboard.html',
  webhookEstadoUrl: 'http://localhost:5678/webhook/impulso-estado',
  webhookLeadsUrl: 'http://localhost:5678/webhook/impulso-leads',
  webhookPublicarUrl: 'http://localhost:5678/webhook/impulso-publicar',
};

const configPublicarMock = {
  rutaBase: 'C:/ImpulsoWeb/leads_db.json',
  rutaDemos: 'C:/ImpulsoWeb/demos',
  netlifyToken: 'token-de-prueba',
};

function nodoDe(items) {
  return {
    all: () => items,
    first: () => items[0],
    itemMatching: (i) => items[Math.min(i, items.length - 1)],
  };
}
const nodoRoto = {
  all: () => { throw new Error('sin datos'); },
  first: () => { throw new Error('sin datos'); },
  itemMatching: () => { throw new Error('sin datos'); },
};

function ejecutar(fuente, mapaNodos, itemsEntrada) {
  const dollar = (nombre) => {
    if (!(nombre in mapaNodos)) throw new Error('Nodo no mockeado en el test: ' + nombre);
    return mapaNodos[nombre];
  };
  const fn = new Function('$', '$input', 'Buffer', fuente);
  return fn(dollar, nodoDe(itemsEntrada), Buffer);
}

// Para nodos Code que usan await y this.helpers (como el de Netlify).
function ejecutarAsync(fuente, mapaNodos, itemsEntrada, contexto) {
  const dollar = (nombre) => {
    if (!(nombre in mapaNodos)) throw new Error('Nodo no mockeado en el test: ' + nombre);
    return mapaNodos[nombre];
  };
  const fn = new Function('$', '$input', 'Buffer', 'return (async () => {\n' + fuente + '\n})();');
  return fn.call(contexto || {}, dollar, nodoDe(itemsEntrada), Buffer);
}

async function testPipeline() {
  // 1. Armar búsquedas
  const busquedas = ejecutar(codigo.armarBusquedas, { Config: nodoDe([{ json: configMock }]) }, []);
  assert.strictEqual(busquedas.length, 2, 'deberían salir 2 búsquedas (1 zona × 2 rubros)');
  assert.strictEqual(busquedas[0].json.textQuery, 'peluquería en Córdoba Capital, Córdoba, Argentina');

  // 2. Normalizar y dedupear (respuesta simulada de Places)
  const respuestaPlaces = [{
    json: {
      places: [
        { // celular, sin web -> lead
          id: 'p1',
          displayName: { text: 'Peluquería Tota' },
          nationalPhoneNumber: '0351 15-555-1234',
          internationalPhoneNumber: '+54 9 351 555-1234',
          formattedAddress: 'Av. Colón 123, Córdoba',
          rating: 4.6,
          userRatingCount: 23,
          googleMapsUri: 'https://maps.google.com/?cid=1',
        },
        { // con web real -> NO es lead
          id: 'p2',
          displayName: { text: 'Con Web SRL' },
          websiteUri: 'https://tienepagina.com',
          nationalPhoneNumber: '0351 400-0000',
        },
        { // "web" que es solo Instagram + teléfono fijo -> lead
          id: 'p3',
          displayName: { text: 'Estética Luna' },
          websiteUri: 'https://instagram.com/esteticaluna',
          internationalPhoneNumber: '+54 351 400-1111',
        },
        { // sin teléfono -> NO es lead
          id: 'p4',
          displayName: { text: 'Sin Tel' },
        },
      ],
    },
  }];
  const leads = ejecutar(codigo.normalizar, {
    Config: nodoDe([{ json: configMock }]),
    'Extraer base': nodoRoto, // primera corrida, sin base
    'Armar búsquedas': nodoDe(busquedas),
  }, respuestaPlaces);
  assert.strictEqual(leads.length, 2, 'deberían quedar 2 leads');
  assert.strictEqual(leads[0].json.telefono, '5493515551234', 'normalización de celular con 15');
  assert.strictEqual(leads[0].json.esCelular, true);
  assert.strictEqual(leads[1].json.telefono, '5493514001111', 'normalización de fijo');
  assert.strictEqual(leads[1].json.esCelular, false);
  assert.strictEqual(leads[1].json.red, 'instagram');

  // 3. Score
  const conScore = ejecutar(codigo.score, { Config: nodoDe([{ json: configMock }]) }, leads);
  assert.strictEqual(conScore[0].json.score, 8, 'prioritario+celular+rating+dirección: 1+3+2+1+1');
  assert.strictEqual(conScore[1].json.score, 6, 'prioritario+instagram: 1+3+2');

  // 4. Prompt
  const prompt = ejecutar(codigo.armarPrompt, { Config: nodoDe([{ json: configMock }]) }, conScore);
  assert.strictEqual(prompt[0].json.totalLeads, 2);
  assert.ok(prompt[0].json.prompt.includes('Peluquería Tota'));
  assert.ok(prompt[0].json.prompt.includes('Sos Seba'), 'el prompt presenta al vendedor por nombre');
  assert.ok(prompt[0].json.prompt.includes('precio promocional'), 'el prompt usa la oferta del Config');
  assert.ok(prompt[0].json.prompt.includes('"pitch"'), 'el prompt pide el pitch de venta');
  assert.ok(!/DEMO REAL|ya armada|ya lista/.test(prompt[0].json.prompt.split('OJO')[0]), 'la oferta del prompt no afirma que la web ya existe');
  assert.ok(prompt[0].json.prompt.includes('la muestra NO existe todavía'), 'el prompt exige honestidad sobre la muestra');

  // 5a. Asignar mensajes con respuesta buena de Gemini
  const geminiOk = [{
    json: {
      candidates: [{ content: { parts: [{ text: JSON.stringify([
        { id: 'p1', mensaje: 'Mensaje IA para Tota: hola, soy Seba de Impulso Web. Con las reseñas que tienen, el que las googlea y no encuentra página se va con otra pelu. ¿Les muestro una demo gratis de su web?', followup: 'Follow IA Tota: hola de nuevo, te dejo la demo pendiente, es gratis y la ves en dos minutos. ¿Te la mando?' },
        { id: 'p3', mensaje: 'Mensaje IA para Luna: hola, soy Seba de Impulso Web. Vi que se mueven por Instagram pero sin página propia, y el que googlea no las encuentra. Landing en 48hs, demo gratis antes. ¿Se la muestro?', followup: 'Follow IA Luna: buenas! les escribí hace unos días, la demo sigue gratis y sin compromiso. ¿La ven?' },
      ]) }] } }],
    },
  }];
  const conMensajes = ejecutar(codigo.asignarMensajes, {
    Config: nodoDe([{ json: configMock }]),
    'Calcular score y ordenar': nodoDe(conScore),
  }, geminiOk);
  assert.strictEqual(conMensajes[0].json.origenMensaje, 'gemini');
  assert.ok(conMensajes[0].json.mensaje.includes('Mensaje IA para Tota'));
  assert.ok(conMensajes[0].json.pitch.length > 100, 'el pitch existe (fallback si Gemini no lo dio)');
  assert.ok(conMensajes[0].json.pitch.includes('Peluquería Tota'), 'el pitch fallback personaliza el nombre');

  // 5b. Asignar mensajes con Gemini caído -> fallback
  const conFallback = ejecutar(codigo.asignarMensajes, {
    Config: nodoDe([{ json: configMock }]),
    'Calcular score y ordenar': nodoDe(conScore),
  }, [{ json: { error: 'cuota agotada' } }]);
  assert.strictEqual(conFallback[0].json.origenMensaje, 'fallback');
  assert.ok(conFallback[0].json.mensaje.includes('Peluquería Tota'), 'la plantilla personaliza el nombre');
  assert.ok(conFallback[0].json.mensaje.includes('Soy Seba') || conFallback[0].json.mensaje.includes('Seba,'), 'la plantilla firma con el nombre del vendedor');
  assert.ok(conFallback[0].json.mensaje.includes('4.6'), 'la plantilla usa el mérito real (rating) del lead');
  assert.ok(conFallback[0].json.pitch.includes('NO es'), 'el pitch fallback incluye la honestidad sobre lo que no es');

  // 5c. Mensaje de Gemini con placeholder sin completar -> se rechaza y entra fallback
  const geminiConPlaceholder = [{
    json: {
      candidates: [{ content: { parts: [{ text: JSON.stringify([
        { id: 'p1', mensaje: '¡Hola Peluquería Tota! Soy [Tu Nombre] de Impulso Web. Armamos una oferta especial de landing page profesional para que consigas más clientes que te buscan en Google todos los días.', followup: 'Hola de nuevo!' },
        { id: 'p3', mensaje: 'Hola Estética Luna, soy Seba de Impulso Web. Vi que se mueven por Instagram pero no tienen página propia, y el que las googlea no las encuentra. Landing profesional en 48hs por $170.000, con demo gratis de su propia web antes de pagar nada. ¿Se la muestro?', followup: 'Buenas! Les escribí hace unos días por la página de Estética Luna. La demo es gratis y la ven en 2 minutos. ¿Se la mando?' },
      ]) }] } }],
    },
  }];
  const conControl = ejecutar(codigo.asignarMensajes, {
    Config: nodoDe([{ json: configMock }]),
    'Calcular score y ordenar': nodoDe(conScore),
  }, geminiConPlaceholder);
  assert.strictEqual(conControl[0].json.origenMensaje, 'fallback', 'el mensaje con [Tu Nombre] se descarta');
  assert.ok(!conControl[0].json.mensaje.includes('['), 'el texto final sale sin corchetes');
  assert.strictEqual(conControl[1].json.origenMensaje, 'gemini', 'el mensaje sano se conserva');

  // 5d. Mensaje deshonesto ("tu web ya está lista") -> se rechaza y entra fallback honesto
  const geminiDeshonesto = [{
    json: {
      candidates: [{ content: { parts: [{ text: JSON.stringify([
        { id: 'p1', mensaje: 'Hola Peluquería Tota! Soy Seba de Impulso Web. Tengo una buena noticia: tu web ya está lista, la armamos para vos y solo falta que la veas. Landing profesional por $170.000 con seña del 50% y entrega en 48 horas. ¿Te paso el link?', followup: 'Hola de nuevo! Tu web sigue esperándote.' },
      ]) }] } }],
    },
  }];
  const conHonestidad = ejecutar(codigo.asignarMensajes, {
    Config: nodoDe([{ json: configMock }]),
    'Calcular score y ordenar': nodoDe(conScore),
  }, geminiDeshonesto);
  assert.strictEqual(conHonestidad[0].json.origenMensaje, 'fallback', 'el mensaje que afirma que la web ya existe se descarta');
  assert.ok(conHonestidad[0].json.mensaje.includes('te armo una muestra'), 'el fallback ofrece armar la muestra, no la da por hecha');

  // 5e. Generar demos: una muestra visual por lead
  const conDemos = ejecutar(codigo.generarDemos, {
    Config: nodoDe([{ json: configMock }]),
  }, conMensajes);
  assert.strictEqual(conDemos.length, 2);
  assert.ok(conDemos[0].json.demoArchivo.startsWith('demos/'), 'ruta relativa para el panel');
  assert.ok(conDemos[0].json.demoRuta.startsWith('C:/ImpulsoWeb/demos/'), 'ruta absoluta para escribir');
  const demoHtml = Buffer.from(conDemos[0].binary.demo.data, 'base64').toString('utf8');
  assert.ok(demoHtml.includes('Peluquería Tota'), 'la muestra lleva el nombre real');
  assert.ok(demoHtml.includes('MUESTRA'), 'la muestra tiene el banner de honestidad');
  assert.ok(demoHtml.includes('4.6'), 'la muestra usa el rating real de Google');
  assert.ok(demoHtml.includes('wa.me/5493515551234'), 'el botón de turnos apunta al WhatsApp del negocio');
  assert.ok(!demoHtml.includes('undefined'), 'sin datos sin resolver en la muestra');

  // 6. Actualizar base y dashboard (primera corrida)
  const resultado = ejecutar(codigo.actualizarBase, {
    Config: nodoDe([{ json: configMock }]),
    'Extraer base': nodoRoto,
  }, conDemos);
  assert.strictEqual(resultado[0].json.agregados, 2);
  const baseGenerada = JSON.parse(Buffer.from(resultado[0].binary.base.data, 'base64').toString('utf8'));
  assert.strictEqual(baseGenerada.leads.length, 2);
  assert.strictEqual(baseGenerada.leads[0].estado, 'nuevo');
  const html = Buffer.from(resultado[0].binary.dashboard.data, 'base64').toString('utf8');
  assert.ok(!html.includes('__DATA__'), 'placeholder de datos reemplazado');
  assert.ok(!html.includes('__WEBHOOK_ESTADO__'), 'placeholder de webhook reemplazado');
  assert.ok(html.includes('var DATA = ['), 'snapshot embebido');
  assert.ok(html.includes('copiar-pitch'), 'el panel tiene el botón de copiar pitch');
  assert.ok(html.includes('Ver muestra'), 'el panel linkea la muestra generada de cada lead');
  assert.ok(html.includes('data-accion="publicar"'), 'el panel tiene el botón Publicar');
  assert.ok(!html.includes('__WEBHOOK_PUBLICAR__'), 'placeholder del webhook de publicación reemplazado');
  // Chequeo de sintaxis del JS del dashboard (solo parseo, no ejecución)
  const inicio = html.lastIndexOf('<script>') + '<script>'.length;
  const fin = html.lastIndexOf('</script>');
  new Function(html.slice(inicio, fin));

  // 6b. Segunda corrida: el mismo lead con recontacto=true no se duplica
  const recontacto = [{ json: { ...conDemos[0].json, recontacto: true, mensaje: 'nuevo intento' } }];
  const resultado2 = ejecutar(codigo.actualizarBase, {
    Config: nodoDe([{ json: configMock }]),
    'Extraer base': nodoDe([{ json: baseGenerada }]),
  }, recontacto);
  assert.strictEqual(resultado2[0].json.recontactos, 1);
  assert.strictEqual(resultado2[0].json.totalBase, 2, 'no debe duplicar');

  // 7. Resumen
  const resumen = ejecutar(codigo.resumen, {
    Config: nodoDe([{ json: configMock }]),
    'Asignar mensajes': nodoDe(conMensajes),
    'Actualizar base y dashboard': nodoDe(resultado),
  }, resultado);
  assert.strictEqual(resumen[0].json.procesados, 2);
  assert.strictEqual(resumen[0].json.mensajesGemini, 2);

  // 8. Webhook de estado (suelto y en lote)
  const cambio = ejecutar(codigo.actualizarEstado, {
    'Webhook Estado': nodoDe([{ json: { body: { telefono: '5493515551234', estado: 'respondio' } } }]),
    'Extraer base (estado)': nodoDe([{ json: baseGenerada }]),
  }, []);
  assert.strictEqual(cambio[0].json.aplicados, 1);
  const baseTrasCambio = JSON.parse(Buffer.from(cambio[0].binary.data.data, 'base64').toString('utf8'));
  assert.strictEqual(baseTrasCambio.leads[0].estado, 'respondio');

  const lote = ejecutar(codigo.actualizarEstado, {
    'Webhook Estado': nodoDe([{ json: { body: { updates: [
      { placeId: 'p1', estado: 'demo' },
      { placeId: 'p3', estado: 'descartado' },
      { placeId: 'no-existe', estado: 'cerrado' },
      { placeId: 'p1', estado: 'estado-invalido' },
    ] } } }]),
    'Extraer base (estado)': nodoDe([{ json: baseTrasCambio }]),
  }, []);
  assert.strictEqual(lote[0].json.aplicados, 2);

  // 9. Publicación en Netlify desde el panel
  const crypto = require('crypto');

  // 9a. Preparar: encuentra el lead y arma nombres; token faltante corta con mensaje claro
  const prep = ejecutar(codigo.prepararPublicacion, {
    'Webhook Publicar': nodoDe([{ json: { body: { placeId: 'p1' } } }]),
    'Config publicar': nodoDe([{ json: configPublicarMock }]),
    'Extraer base (publicar)': nodoDe([{ json: baseGenerada }]),
  }, []);
  assert.ok(prep[0].json.siteName.startsWith('impulsoweb-'));
  assert.ok(prep[0].json.demoRuta.startsWith('C:/ImpulsoWeb/demos/'));
  assert.throws(() => ejecutar(codigo.prepararPublicacion, {
    'Webhook Publicar': nodoDe([{ json: { body: { placeId: 'p1' } } }]),
    'Config publicar': nodoDe([{ json: { ...configPublicarMock, netlifyToken: 'PEGAR_TOKEN_DE_NETLIFY' } }]),
    'Extraer base (publicar)': nodoDe([{ json: baseGenerada }]),
  }, []), /token de Netlify/i, 'sin token debe cortar con instrucción clara');

  // 9b. Publicar: crea sitio, declara el archivo por SHA-1, lo sube y guarda la URL
  const htmlMuestra = '<!doctype html><html><body>hola muestra</body></html>';
  const llamadas = [];
  const contextoNetlify = {
    helpers: {
      httpRequest: async (o) => {
        llamadas.push(o);
        if (o.method === 'POST' && /\/sites$/.test(o.url)) {
          return { id: 'site-1', ssl_url: 'https://impulsoweb-test.netlify.app' };
        }
        if (o.method === 'POST' && /\/deploys$/.test(o.url)) {
          return { id: 'dep-1', ssl_url: 'https://impulsoweb-test.netlify.app', required: [o.body.files['/index.html']] };
        }
        if (o.method === 'PUT') return {};
        throw new Error('Llamada inesperada en el test: ' + o.method + ' ' + o.url);
      },
    },
  };
  const publicado = await ejecutarAsync(codigo.publicarNetlify, {
    'Config publicar': nodoDe([{ json: configPublicarMock }]),
    'Preparar publicación': nodoDe(prep),
    'Extraer base (publicar)': nodoDe([{ json: baseGenerada }]),
  }, [{ json: { data: htmlMuestra } }], contextoNetlify);
  assert.strictEqual(publicado[0].json.ok, true);
  assert.ok(publicado[0].json.url.startsWith('https://'));
  const shaEnviado = llamadas.find((c) => /\/deploys$/.test(c.url)).body.files['/index.html'];
  const shaEsperado = crypto.createHash('sha1').update(htmlMuestra, 'utf8').digest('hex');
  assert.strictEqual(shaEnviado, shaEsperado, 'el SHA-1 en JS puro coincide con el de Node');
  const subida = llamadas.find((c) => c.method === 'PUT');
  assert.strictEqual(subida.body, htmlMuestra, 'se sube el HTML tal cual');
  const basePublicada = JSON.parse(Buffer.from(publicado[0].binary.data.data, 'base64').toString('utf8'));
  assert.strictEqual(basePublicada.leads[0].netlifyUrl, publicado[0].json.url, 'la URL queda guardada en el lead');

  return { html, baseGenerada };
}

// ---------------------------------------------------------------------------
// Definición del workflow n8n
// ---------------------------------------------------------------------------

function nodoSet(id, nombre, pos, campos) {
  return {
    id,
    name: nombre,
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: pos,
    parameters: {
      assignments: {
        assignments: campos.map(([n, v, t], i) => ({ id: id + '-' + i, name: n, value: v, type: t })),
      },
      options: {},
    },
  };
}

function armarWorkflow() {
  const nodes = [
    {
      id: 'n01', name: 'Ejecutar manualmente', type: 'n8n-nodes-base.manualTrigger',
      typeVersion: 1, position: [0, 0], parameters: {},
    },
    {
      id: 'n02', name: 'Cron diario 9:00', type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.2, position: [0, 200], disabled: true,
      parameters: { rule: { interval: [{ field: 'days', triggerAtHour: 9, triggerAtMinute: 0 }] } },
    },
    nodoSet('n03', 'Config', [220, 100], [
      ['placesApiKey', 'PEGAR_API_KEY_DE_GOOGLE_PLACES', 'string'],
      ['geminiApiKey', 'PEGAR_API_KEY_DE_GEMINI', 'string'],
      ['nombreVendedor', 'Seba', 'string'],
      ['ofertaDetalle', 'Landing page profesional por $170.000 ARS (precio promocional). Seña del 50% y entrega en 48 horas. Incluye botón de WhatsApp para turnos y consultas, y queda lista para aparecer en Google. Como primer paso se le ofrece al negocio una muestra gratis y sin compromiso de cómo podría verse su web; la versión final lleva sus fotos, servicios y datos reales.', 'string'],
      ['zonas', '["Córdoba Capital, Córdoba, Argentina"]', 'string'],
      ['rubros', '[{"rubro":"peluquería","prioritario":true},{"rubro":"barbería","prioritario":true},{"rubro":"centro de estética","prioritario":true},{"rubro":"gimnasio","prioritario":false},{"rubro":"veterinaria","prioritario":false}]', 'string'],
      ['maxLeads', 15, 'number'],
      ['diasMinimos', 30, 'number'],
      ['rutaBase', 'C:/ImpulsoWeb/leads_db.json', 'string'],
      ['rutaDashboard', 'C:/ImpulsoWeb/dashboard.html', 'string'],
      ['rutaDemos', 'C:/ImpulsoWeb/demos', 'string'],
      ['webhookEstadoUrl', 'http://localhost:5678/webhook/impulso-estado', 'string'],
      ['webhookLeadsUrl', 'http://localhost:5678/webhook/impulso-leads', 'string'],
      ['webhookPublicarUrl', 'http://localhost:5678/webhook/impulso-publicar', 'string'],
    ]),
    {
      id: 'n04', name: 'Leer base', type: 'n8n-nodes-base.readWriteFile',
      typeVersion: 1, position: [440, 100],
      parameters: { fileSelector: '={{ $json.rutaBase }}', options: {} },
      onError: 'continueRegularOutput', alwaysOutputData: true,
    },
    {
      id: 'n05', name: 'Extraer base', type: 'n8n-nodes-base.extractFromFile',
      typeVersion: 1, position: [660, 100],
      parameters: { operation: 'fromJson', options: {} },
      onError: 'continueRegularOutput', alwaysOutputData: true,
    },
    {
      id: 'n06', name: 'Armar búsquedas', type: 'n8n-nodes-base.code',
      typeVersion: 2, position: [880, 100],
      parameters: { jsCode: codigo.armarBusquedas },
    },
    {
      id: 'n07', name: 'Buscar en Google Places', type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2, position: [1100, 100],
      parameters: {
        method: 'POST',
        url: 'https://places.googleapis.com/v1/places:searchText',
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: 'X-Goog-Api-Key', value: "={{ $('Config').first().json.placesApiKey }}" },
            {
              name: 'X-Goog-FieldMask',
              value: 'places.id,places.displayName,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.formattedAddress,places.googleMapsUri,nextPageToken',
            },
          ],
        },
        sendBody: true,
        specifyBody: 'keypair',
        contentType: 'json',
        bodyParameters: {
          parameters: [
            { name: 'textQuery', value: '={{ $json.textQuery }}' },
            { name: 'languageCode', value: 'es' },
            { name: 'regionCode', value: 'AR' },
            { name: 'pageSize', value: '20' },
          ],
        },
        options: {
          pagination: {
            pagination: {
              paginationMode: 'updateAParameterInEachRequest',
              parameters: {
                parameters: [
                  { type: 'body', name: 'pageToken', value: "={{ $response.body?.nextPageToken ?? '' }}" },
                ],
              },
              paginationCompleteWhen: 'other',
              completeExpression: '={{ !$response.body?.nextPageToken }}',
              limitPagesFetched: true,
              maxRequests: 2,
              requestInterval: 2000,
            },
          },
        },
      },
      retryOnFail: true, maxTries: 3, waitBetweenTries: 3000,
      onError: 'continueRegularOutput', alwaysOutputData: true,
    },
    {
      id: 'n08', name: 'Normalizar y dedupear', type: 'n8n-nodes-base.code',
      typeVersion: 2, position: [1320, 100],
      parameters: { jsCode: codigo.normalizar },
    },
    {
      id: 'n09', name: 'Calcular score y ordenar', type: 'n8n-nodes-base.code',
      typeVersion: 2, position: [1540, 100],
      parameters: { jsCode: codigo.score },
    },
    {
      id: 'n10', name: 'Armar prompt', type: 'n8n-nodes-base.code',
      typeVersion: 2, position: [1760, 100],
      parameters: { jsCode: codigo.armarPrompt },
    },
    {
      id: 'n11', name: 'Generar mensajes (Gemini)', type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2, position: [1980, 100],
      parameters: {
        method: 'POST',
        url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
        sendHeaders: true,
        headerParameters: {
          parameters: [{ name: 'x-goog-api-key', value: "={{ $('Config').first().json.geminiApiKey }}" }],
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: "={{ JSON.stringify({ contents: [{ parts: [{ text: $json.prompt }] }], generationConfig: { temperature: 1, responseMimeType: 'application/json' } }) }}",
        options: {},
      },
      retryOnFail: true, maxTries: 3, waitBetweenTries: 5000,
      onError: 'continueRegularOutput', alwaysOutputData: true,
    },
    {
      id: 'n12', name: 'Asignar mensajes', type: 'n8n-nodes-base.code',
      typeVersion: 2, position: [2200, 100],
      parameters: { jsCode: codigo.asignarMensajes },
    },
    {
      id: 'n17', name: 'Generar demos', type: 'n8n-nodes-base.code',
      typeVersion: 2, position: [2420, 100],
      parameters: { jsCode: codigo.generarDemos },
    },
    {
      id: 'n18', name: 'Guardar demos', type: 'n8n-nodes-base.readWriteFile',
      typeVersion: 1, position: [2640, 100],
      parameters: {
        operation: 'write',
        fileName: '={{ $json.demoRuta }}',
        dataPropertyName: 'demo',
        options: {},
      },
      onError: 'continueRegularOutput', alwaysOutputData: true,
    },
    {
      id: 'n13', name: 'Actualizar base y dashboard', type: 'n8n-nodes-base.code',
      typeVersion: 2, position: [2860, 100],
      parameters: { jsCode: codigo.actualizarBase },
    },
    {
      id: 'n14', name: 'Guardar base', type: 'n8n-nodes-base.readWriteFile',
      typeVersion: 1, position: [3080, 100],
      parameters: {
        operation: 'write',
        fileName: "={{ $('Config').first().json.rutaBase }}",
        dataPropertyName: 'base',
        options: {},
      },
    },
    {
      id: 'n15', name: 'Guardar dashboard', type: 'n8n-nodes-base.readWriteFile',
      typeVersion: 1, position: [3300, 100],
      parameters: {
        operation: 'write',
        fileName: "={{ $('Config').first().json.rutaDashboard }}",
        dataPropertyName: 'dashboard',
        options: {},
      },
    },
    {
      id: 'n16', name: 'Resumen de ejecución', type: 'n8n-nodes-base.code',
      typeVersion: 2, position: [3520, 100],
      parameters: { jsCode: codigo.resumen },
    },

    // ----- Flujo: el dashboard marca estados (cierra el loop del "marcar enviado") -----
    {
      id: 'n20', name: 'Webhook Estado', type: 'n8n-nodes-base.webhook',
      typeVersion: 2, position: [0, 500],
      parameters: {
        httpMethod: 'POST',
        path: 'impulso-estado',
        responseMode: 'responseNode',
        options: { allowedOrigins: '*' },
      },
    },
    nodoSet('n21', 'Config estado', [220, 500], [
      ['rutaBase', 'C:/ImpulsoWeb/leads_db.json', 'string'],
    ]),
    {
      id: 'n22', name: 'Leer base (estado)', type: 'n8n-nodes-base.readWriteFile',
      typeVersion: 1, position: [440, 500],
      parameters: { fileSelector: '={{ $json.rutaBase }}', options: {} },
    },
    {
      id: 'n23', name: 'Extraer base (estado)', type: 'n8n-nodes-base.extractFromFile',
      typeVersion: 1, position: [660, 500],
      parameters: { operation: 'fromJson', options: {} },
    },
    {
      id: 'n24', name: 'Actualizar estado', type: 'n8n-nodes-base.code',
      typeVersion: 2, position: [880, 500],
      parameters: { jsCode: codigo.actualizarEstado },
    },
    {
      id: 'n25', name: 'Guardar base (estado)', type: 'n8n-nodes-base.readWriteFile',
      typeVersion: 1, position: [1100, 500],
      parameters: {
        operation: 'write',
        fileName: "={{ $('Config estado').first().json.rutaBase }}",
        dataPropertyName: 'data',
        options: {},
      },
    },
    {
      id: 'n26', name: 'Responder estado', type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1.1, position: [1320, 500],
      parameters: { respondWith: 'firstIncomingItem', options: {} },
    },

    // ----- Flujo: el dashboard publica una muestra en Netlify con un clic -----
    {
      id: 'n40', name: 'Webhook Publicar', type: 'n8n-nodes-base.webhook',
      typeVersion: 2, position: [0, 900],
      parameters: {
        httpMethod: 'POST',
        path: 'impulso-publicar',
        responseMode: 'responseNode',
        options: { allowedOrigins: '*' },
      },
    },
    nodoSet('n41', 'Config publicar', [200, 900], [
      ['rutaBase', 'C:/ImpulsoWeb/leads_db.json', 'string'],
      ['rutaDemos', 'C:/ImpulsoWeb/demos', 'string'],
      ['netlifyToken', 'PEGAR_TOKEN_DE_NETLIFY', 'string'],
    ]),
    {
      id: 'n42', name: 'Leer base (publicar)', type: 'n8n-nodes-base.readWriteFile',
      typeVersion: 1, position: [400, 900],
      parameters: { fileSelector: '={{ $json.rutaBase }}', options: {} },
    },
    {
      id: 'n43', name: 'Extraer base (publicar)', type: 'n8n-nodes-base.extractFromFile',
      typeVersion: 1, position: [600, 900],
      parameters: { operation: 'fromJson', options: {} },
    },
    {
      id: 'n44', name: 'Preparar publicación', type: 'n8n-nodes-base.code',
      typeVersion: 2, position: [800, 900],
      parameters: { jsCode: codigo.prepararPublicacion },
    },
    {
      id: 'n45', name: 'Leer muestra', type: 'n8n-nodes-base.readWriteFile',
      typeVersion: 1, position: [1000, 900],
      parameters: { fileSelector: '={{ $json.demoRuta }}', options: {} },
    },
    {
      id: 'n46', name: 'Extraer muestra', type: 'n8n-nodes-base.extractFromFile',
      typeVersion: 1, position: [1200, 900],
      parameters: { operation: 'text', options: {} },
    },
    {
      id: 'n47', name: 'Publicar en Netlify', type: 'n8n-nodes-base.code',
      typeVersion: 2, position: [1400, 900],
      parameters: { jsCode: codigo.publicarNetlify },
    },
    {
      id: 'n48', name: 'Guardar base (publicar)', type: 'n8n-nodes-base.readWriteFile',
      typeVersion: 1, position: [1600, 900],
      parameters: {
        operation: 'write',
        fileName: "={{ $('Config publicar').first().json.rutaBase }}",
        dataPropertyName: 'data',
        options: {},
      },
    },
    {
      id: 'n49', name: 'Responder publicar', type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1.1, position: [1800, 900],
      parameters: { respondWith: 'firstIncomingItem', options: {} },
    },

    // ----- Flujo: el dashboard pide los datos en vivo -----
    {
      id: 'n30', name: 'Webhook Leads', type: 'n8n-nodes-base.webhook',
      typeVersion: 2, position: [0, 700],
      parameters: {
        httpMethod: 'GET',
        path: 'impulso-leads',
        responseMode: 'responseNode',
        options: { allowedOrigins: '*' },
      },
    },
    nodoSet('n31', 'Config leads', [220, 700], [
      ['rutaBase', 'C:/ImpulsoWeb/leads_db.json', 'string'],
    ]),
    {
      id: 'n32', name: 'Leer base (leads)', type: 'n8n-nodes-base.readWriteFile',
      typeVersion: 1, position: [440, 700],
      parameters: { fileSelector: '={{ $json.rutaBase }}', options: {} },
    },
    {
      id: 'n33', name: 'Responder leads', type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1.1, position: [660, 700],
      parameters: {
        respondWith: 'binary',
        options: { responseHeaders: { entries: [{ name: 'Content-Type', value: 'application/json; charset=utf-8' }] } },
      },
    },
  ];

  const cadena = (pares) => {
    const conexiones = {};
    for (const [de, a] of pares) {
      conexiones[de] = { main: [[{ node: a, type: 'main', index: 0 }]] };
    }
    return conexiones;
  };

  const connections = cadena([
    ['Ejecutar manualmente', 'Config'],
    ['Cron diario 9:00', 'Config'],
    ['Config', 'Leer base'],
    ['Leer base', 'Extraer base'],
    ['Extraer base', 'Armar búsquedas'],
    ['Armar búsquedas', 'Buscar en Google Places'],
    ['Buscar en Google Places', 'Normalizar y dedupear'],
    ['Normalizar y dedupear', 'Calcular score y ordenar'],
    ['Calcular score y ordenar', 'Armar prompt'],
    ['Armar prompt', 'Generar mensajes (Gemini)'],
    ['Generar mensajes (Gemini)', 'Asignar mensajes'],
    ['Asignar mensajes', 'Generar demos'],
    ['Generar demos', 'Guardar demos'],
    ['Guardar demos', 'Actualizar base y dashboard'],
    ['Actualizar base y dashboard', 'Guardar base'],
    ['Guardar base', 'Guardar dashboard'],
    ['Guardar dashboard', 'Resumen de ejecución'],
    ['Webhook Estado', 'Config estado'],
    ['Config estado', 'Leer base (estado)'],
    ['Leer base (estado)', 'Extraer base (estado)'],
    ['Extraer base (estado)', 'Actualizar estado'],
    ['Actualizar estado', 'Guardar base (estado)'],
    ['Guardar base (estado)', 'Responder estado'],
    ['Webhook Leads', 'Config leads'],
    ['Config leads', 'Leer base (leads)'],
    ['Leer base (leads)', 'Responder leads'],
    ['Webhook Publicar', 'Config publicar'],
    ['Config publicar', 'Leer base (publicar)'],
    ['Leer base (publicar)', 'Extraer base (publicar)'],
    ['Extraer base (publicar)', 'Preparar publicación'],
    ['Preparar publicación', 'Leer muestra'],
    ['Leer muestra', 'Extraer muestra'],
    ['Extraer muestra', 'Publicar en Netlify'],
    ['Publicar en Netlify', 'Guardar base (publicar)'],
    ['Guardar base (publicar)', 'Responder publicar'],
  ]);

  return {
    name: 'Impulso Web v8 - Prospección con Google Places',
    nodes,
    connections,
    settings: { executionOrder: 'v1' },
    pinData: {},
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async () => {
  const { html } = await testPipeline();
  console.log('✔ Pruebas de humo OK (pipeline completo simulado)');

  const workflow = armarWorkflow();

  // Toda referencia $('Nodo') en los códigos tiene que apuntar a un nodo real.
  const nombres = new Set(workflow.nodes.map((n) => n.name));
  for (const [archivo, fuente] of Object.entries(codigo)) {
    for (const m of fuente.matchAll(/\$\('([^']+)'\)/g)) {
      assert.ok(nombres.has(m[1]), 'Referencia a nodo inexistente "' + m[1] + '" en ' + archivo);
    }
  }
  console.log('✔ Referencias entre nodos verificadas');

  fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
  fs.writeFileSync(SALIDA, JSON.stringify(workflow, null, 2) + '\n');
  JSON.parse(fs.readFileSync(SALIDA, 'utf8'));
  console.log('✔ Workflow generado: ' + path.relative(RAIZ, SALIDA));

  const idx = process.argv.indexOf('--preview');
  if (idx !== -1 && process.argv[idx + 1]) {
    fs.writeFileSync(process.argv[idx + 1], html);
    console.log('✔ Dashboard de muestra: ' + process.argv[idx + 1]);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
