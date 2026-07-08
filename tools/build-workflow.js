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
  actualizarBase: leer('06-actualizar-base-dashboard.js'),
  resumen: leer('07-resumen.js'),
  actualizarEstado: leer('08-actualizar-estado.js'),
};

// ---------------------------------------------------------------------------
// Pruebas de humo: simulan $, $input y Buffer como en el nodo Code de n8n
// ---------------------------------------------------------------------------

const configMock = {
  placesApiKey: 'clave-de-prueba',
  geminiApiKey: 'clave-de-prueba',
  nombreVendedor: 'Seba',
  ofertaDetalle: 'Landing page profesional por $170.000 ARS (promo de lanzamiento), seña 50%, entrega 48hs, demo gratis antes de pagar.',
  zonas: '["Córdoba Capital, Córdoba, Argentina"]',
  rubros: '[{"rubro":"peluquería","prioritario":true},{"rubro":"gimnasio","prioritario":false}]',
  maxLeads: 15,
  diasMinimos: 30,
  rutaBase: 'C:/ImpulsoWeb/leads_db.json',
  rutaDashboard: 'C:/ImpulsoWeb/dashboard.html',
  webhookEstadoUrl: 'http://localhost:5678/webhook/impulso-estado',
  webhookLeadsUrl: 'http://localhost:5678/webhook/impulso-leads',
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

function testPipeline() {
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
  assert.ok(prompt[0].json.prompt.includes('promo de lanzamiento'), 'el prompt usa la oferta del Config');
  assert.ok(prompt[0].json.prompt.includes('"pitch"'), 'el prompt pide el pitch de venta');

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

  // 6. Actualizar base y dashboard (primera corrida)
  const resultado = ejecutar(codigo.actualizarBase, {
    Config: nodoDe([{ json: configMock }]),
    'Extraer base': nodoRoto,
  }, conMensajes);
  assert.strictEqual(resultado[0].json.agregados, 2);
  const baseGenerada = JSON.parse(Buffer.from(resultado[0].binary.base.data, 'base64').toString('utf8'));
  assert.strictEqual(baseGenerada.leads.length, 2);
  assert.strictEqual(baseGenerada.leads[0].estado, 'nuevo');
  const html = Buffer.from(resultado[0].binary.dashboard.data, 'base64').toString('utf8');
  assert.ok(!html.includes('__DATA__'), 'placeholder de datos reemplazado');
  assert.ok(!html.includes('__WEBHOOK_ESTADO__'), 'placeholder de webhook reemplazado');
  assert.ok(html.includes('var DATA = ['), 'snapshot embebido');
  assert.ok(html.includes('copiar-pitch'), 'el panel tiene el botón de copiar pitch');
  // Chequeo de sintaxis del JS del dashboard (solo parseo, no ejecución)
  const inicio = html.lastIndexOf('<script>') + '<script>'.length;
  const fin = html.lastIndexOf('</script>');
  new Function(html.slice(inicio, fin));

  // 6b. Segunda corrida: el mismo lead con recontacto=true no se duplica
  const recontacto = [{ json: { ...conMensajes[0].json, recontacto: true, mensaje: 'nuevo intento' } }];
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
      ['ofertaDetalle', 'Landing page profesional por $170.000 ARS (precio promocional de lanzamiento). Seña del 50% y entrega en 48 horas. Incluye botón de WhatsApp para turnos y consultas, y queda lista para aparecer en Google. Antes de pagar nada, el negocio ve una demo real de su propia web.', 'string'],
      ['zonas', '["Córdoba Capital, Córdoba, Argentina"]', 'string'],
      ['rubros', '[{"rubro":"peluquería","prioritario":true},{"rubro":"barbería","prioritario":true},{"rubro":"centro de estética","prioritario":true},{"rubro":"gimnasio","prioritario":false},{"rubro":"veterinaria","prioritario":false}]', 'string'],
      ['maxLeads', 15, 'number'],
      ['diasMinimos', 30, 'number'],
      ['rutaBase', 'C:/ImpulsoWeb/leads_db.json', 'string'],
      ['rutaDashboard', 'C:/ImpulsoWeb/dashboard.html', 'string'],
      ['webhookEstadoUrl', 'http://localhost:5678/webhook/impulso-estado', 'string'],
      ['webhookLeadsUrl', 'http://localhost:5678/webhook/impulso-leads', 'string'],
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
      id: 'n13', name: 'Actualizar base y dashboard', type: 'n8n-nodes-base.code',
      typeVersion: 2, position: [2420, 100],
      parameters: { jsCode: codigo.actualizarBase },
    },
    {
      id: 'n14', name: 'Guardar base', type: 'n8n-nodes-base.readWriteFile',
      typeVersion: 1, position: [2640, 100],
      parameters: {
        operation: 'write',
        fileName: "={{ $('Config').first().json.rutaBase }}",
        dataPropertyName: 'base',
        options: {},
      },
    },
    {
      id: 'n15', name: 'Guardar dashboard', type: 'n8n-nodes-base.readWriteFile',
      typeVersion: 1, position: [2860, 100],
      parameters: {
        operation: 'write',
        fileName: "={{ $('Config').first().json.rutaDashboard }}",
        dataPropertyName: 'dashboard',
        options: {},
      },
    },
    {
      id: 'n16', name: 'Resumen de ejecución', type: 'n8n-nodes-base.code',
      typeVersion: 2, position: [3080, 100],
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
    ['Asignar mensajes', 'Actualizar base y dashboard'],
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

const { html } = testPipeline();
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
