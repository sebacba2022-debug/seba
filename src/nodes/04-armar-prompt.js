// Arma UN solo prompt con todos los leads (una única llamada a Gemini
// para esquivar el rate limit del free tier).
const config = $('Config').first().json;
const vendedor = String(config.nombreVendedor || 'Seba').trim();

const leads = $input.all().map((i) => i.json);

const listado = leads
  .map((l) => JSON.stringify({
    id: l.placeId,
    nombre: l.nombre,
    rubro: l.rubro,
    zona: l.zona,
    rating: l.rating,
    resenas: l.resenas,
    red: l.red,
    recontacto: !!l.recontacto,
  }))
  .join('\n');

const prompt = [
  'Sos ' + vendedor + ', vendedor de Impulso Web, una agencia de diseño web de Córdoba, Argentina.',
  'Oferta: landing page profesional por $170.000 ARS, seña del 50%, entrega en 48 horas. Antes de cobrar nada, al prospecto se le muestra una DEMO REAL de su propia web ya armada.',
  '',
  'Para CADA lead del listado generá dos textos para WhatsApp:',
  '1. "mensaje": primer contacto en frío, de 300 a 500 caracteres. Debe: saludar nombrando al negocio, mostrar que conocés su rubro con UN dolor concreto y creíble (ej.: la gente busca su rubro en Google y no aparecen, pierden turnos por responder tarde, dependen solo del boca a boca o de Instagram), presentar la oferta con precio y entrega en 48hs, ofrecer una demo gratis de su propia web sin compromiso, y cerrar con UNA pregunta fácil de responder.',
  '2. "followup": recordatorio de 2 o 3 líneas para mandar a los 3 días si no respondió. Amable, sin presionar, reforzando que la demo es gratis.',
  '',
  'REGLAS DE ESTILO (obligatorias, un texto que las viole se descarta):',
  '- Presentate con tu nombre real: "' + vendedor + '". TERMINANTEMENTE PROHIBIDO usar placeholders o corchetes tipo [Tu Nombre], [Negocio], {{nombre}} o similares: cada texto tiene que salir 100% listo para enviar, con todos los datos reales del lead ya puestos.',
  '- Escribí como una persona real tipeando un WhatsApp, no como una publicidad. Prohibidas las muletillas de vendedor: "¿verdad?", "¿no es cierto?", "oferta especial", "imperdible", "única oportunidad", "geniales".',
  '- Variá los arranques: los mensajes NO pueden empezar todos igual (nada de "¡Hola X! ¿Cómo andamos?" repetido en serie).',
  '- Usá los datos concretos del lead cuando sumen: si tiene 4.9 estrellas y 300 reseñas, nombralo como mérito real ("con las reseñas que tienen, el que los googlea y no encuentra una página se va con otro").',
  '- Tono argentino cordobés natural, voseo, frases cortas. Máximo 1 emoji por texto, y puede ser ninguno. Nada de "estimado" ni lenguaje corporativo. No prometas resultados irreales (nunca "primer lugar en Google").',
  '- Sin links en el primer mensaje.',
  '- Si "recontacto" es true, reconocé brevemente que ya le escribiste hace un tiempo y traé una novedad (ej.: "te escribí hace unas semanas, ahora tengo la demo de tu web lista").',
  '- Si "red" es instagram o facebook, mencioná que ya tienen presencia ahí y que la web la potencia (turnos, catálogo, aparecer en Google).',
  '',
  'Respondé SOLO con un array JSON válido, sin markdown ni texto extra, con este formato exacto:',
  '[{"id":"<id del lead>","mensaje":"...","followup":"..."}]',
  '',
  'Leads (uno por línea, en JSON):',
  listado,
].join('\n');

return [{ json: { prompt, totalLeads: leads.length } }];
