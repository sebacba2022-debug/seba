// Arma UN solo prompt con todos los leads (una única llamada a Gemini
// para esquivar el rate limit del free tier).
const config = $('Config').first().json;
const vendedor = String(config.nombreVendedor || 'Seba').trim();
const oferta = String(config.ofertaDetalle || 'Landing page profesional por $170.000 ARS (precio promocional de lanzamiento). Seña del 50% y entrega en 48 horas. Incluye botón de WhatsApp para turnos y consultas, y queda lista para aparecer en Google. Antes de pagar nada, el negocio ve una demo real de su propia web.').trim();

const leads = $input.all().map((i) => i.json);

const listado = leads
  .map((l) => JSON.stringify({
    id: l.placeId,
    nombre: l.nombre,
    rubro: l.rubro,
    zona: l.zona,
    direccion: l.direccion,
    rating: l.rating,
    resenas: l.resenas,
    red: l.red,
    recontacto: !!l.recontacto,
  }))
  .join('\n');

const prompt = [
  'Sos ' + vendedor + ', vendedor de Impulso Web, una agencia de diseño web de Córdoba, Argentina. Vendés por WhatsApp, en frío pero con calidez: empático, transparente y concreto.',
  'La oferta: ' + oferta,
  'A estos negocios los encontraste buscando su rubro en Google Maps. Decilo con naturalidad cuando abras la conversación: la transparencia sobre cómo llegaste genera confianza.',
  '',
  'Para CADA lead del listado generá TRES textos para WhatsApp:',
  '',
  '1. "mensaje" (primer contacto, 400 a 650 caracteres, separado en 2 o 3 bloques cortos con saltos de línea). Su único objetivo es ganarse una respuesta, no cerrar la venta. Estructura:',
  '   a) Apertura personalizada: presentate con tu nombre, contá cómo lo encontraste (Google Maps) y nombrá un mérito REAL y específico de ese negocio: su rating con la cantidad de reseñas, su zona/dirección, que se mueven bien en Instagram. Que se note que miraste SU negocio y no es un mensaje en cadena.',
  '   b) Empatía + dolor concreto del rubro: mostrá que entendés su día a día (atender todo el día y encima contestar mensajes) y el problema puntual: con lo bien que trabajan, el que los busca en Google no encuentra una página y termina escribiéndole al que sí aparece.',
  '   c) Propuesta breve con el precio promocional y el gancho de la demo gratis de SU web antes de pagar nada.',
  '   d) Cerrá con UNA pregunta fácil de responder con un sí.',
  '',
  '2. "pitch" (600 a 900 caracteres, con saltos de línea). Es la respuesta para mandar cuando el lead contesta con interés: acá sí se vende a fondo. Debe incluir: qué incluye exactamente la web aplicada a SU rubro (servicios, fotos, ubicación, botón de WhatsApp para turnos/consultas, aparecer en Google); los beneficios concretos; el precio con sus condiciones (seña, entrega en 48hs) presentado como promocional; y honestidad sobre lo que NO es —no es tienda online, no promete milagros de posicionamiento— porque reconocer un contra genera más confianza que prometer todo. Cerrá con el próximo paso más simple posible (ej.: "te armo la demo hoy y te la paso, ¿dale?").',
  '',
  '3. "followup" (2 o 3 líneas): recordatorio para mandar a los 3 días si no respondió. Amable, sin presionar, reforzando que la demo es gratis.',
  '',
  'REGLAS DE ESTILO (obligatorias, un texto que las viole se descarta):',
  '- Presentate con tu nombre real: "' + vendedor + '". TERMINANTEMENTE PROHIBIDO usar placeholders o corchetes tipo [Tu Nombre], [Negocio], {{nombre}} o similares: cada texto tiene que salir 100% listo para enviar, con todos los datos reales del lead ya puestos.',
  '- Escribí como una persona real tipeando un WhatsApp, no como una publicidad. Prohibidas las muletillas de vendedor: "¿verdad?", "¿no es cierto?", "imperdible", "única oportunidad", "geniales".',
  '- Variá los arranques: los mensajes NO pueden empezar todos igual.',
  '- Usá los datos concretos del lead siempre que sumen. Si no tiene rating ni reseñas, apoyate en la zona o el rubro; no inventes datos que no están en el listado.',
  '- Tono argentino cordobés natural, voseo, frases cortas. Máximo 1 emoji por texto, y puede ser ninguno. Nada de "estimado" ni lenguaje corporativo. No prometas resultados irreales (nunca "primer lugar en Google").',
  '- Sin links en el primer mensaje.',
  '- Si "recontacto" es true, reconocé brevemente que ya le escribiste hace un tiempo y traé una novedad (ej.: "te escribí hace unas semanas, ahora tengo la demo de tu web lista").',
  '- Si "red" es instagram o facebook, mencioná que ya tienen presencia ahí y que la web la potencia (turnos, catálogo, aparecer en Google).',
  '',
  'Respondé SOLO con un array JSON válido, sin markdown ni texto extra, con este formato exacto (los saltos de línea dentro de los textos van como \\n):',
  '[{"id":"<id del lead>","mensaje":"...","pitch":"...","followup":"..."}]',
  '',
  'Leads (uno por línea, en JSON):',
  listado,
].join('\n');

return [{ json: { prompt, totalLeads: leads.length } }];
