// Arma UN solo prompt con todos los leads (una única llamada a Gemini
// para esquivar el rate limit del free tier).
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
  'Sos vendedor senior de Impulso Web, una agencia de diseño web de Córdoba, Argentina.',
  'Oferta: landing page profesional por $170.000 ARS, seña del 50%, entrega en 48 horas. Antes de cobrar nada, al prospecto se le muestra una DEMO REAL de su propia web ya armada.',
  '',
  'Para CADA lead del listado generá dos textos para WhatsApp:',
  '1. "mensaje": primer contacto en frío, de 350 a 550 caracteres. Debe: saludar nombrando al negocio, mostrar que conocés su rubro con UN dolor concreto y creíble (ej.: la gente busca su rubro en Google y no aparecen, pierden turnos por responder tarde, dependen solo del boca a boca o de Instagram), presentar la oferta con precio y entrega en 48hs, ofrecer una demo gratis de su propia web sin compromiso, y cerrar con UNA pregunta fácil de responder. NO incluyas links en este primer mensaje.',
  '2. "followup": recordatorio de 2 o 3 líneas para mandar a los 3 días si no respondió. Amable, sin presionar, reforzando que la demo es gratis.',
  '',
  'Tono: argentino cordobés natural, cercano y profesional. Voseo. Máximo 1 emoji por texto. Nada de "estimado", nada de lenguaje corporativo, nada de promesas irreales (no prometas "primer lugar en Google").',
  'Si "recontacto" es true, el mensaje tiene que reconocer brevemente que ya le escribiste hace un tiempo y traer una novedad (ej.: "te escribí hace unas semanas, ahora tengo la demo de tu web lista para mostrarte").',
  'Si "red" es instagram o facebook, mencioná que ya tienen presencia ahí y que la web la potencia (turnos, catálogo, aparecer en Google).',
  '',
  'Respondé SOLO con un array JSON válido, sin markdown ni texto extra, con este formato exacto:',
  '[{"id":"<id del lead>","mensaje":"...","followup":"..."}]',
  '',
  'Leads (uno por línea, en JSON):',
  listado,
].join('\n');

return [{ json: { prompt, totalLeads: leads.length } }];
