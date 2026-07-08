// Parsea la respuesta de Gemini y asigna mensaje + pitch + follow-up a cada lead.
// Todo texto generado pasa por un control de calidad: si trae placeholders
// ([Tu Nombre], {{negocio}}, etc.) o viene vacío/corto, se descarta y entra la
// plantilla de fallback. La corrida nunca se cae y nunca sale un texto roto.
const config = $('Config').first().json;
const vendedor = String(config.nombreVendedor || 'Seba').trim();

const leads = $('Calcular score y ordenar').all().map((i) => ({ ...i.json }));

const generados = {};
try {
  const respuesta = $input.first().json;
  const texto = respuesta.candidates[0].content.parts[0].text;
  const limpio = texto.trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '');
  for (const m of JSON.parse(limpio)) {
    if (m && m.id) generados[m.id] = m;
  }
} catch (e) {
  // Gemini caído, sin cuota o respuesta no parseable: siguen las plantillas.
}

// Rechaza textos con placeholders sin completar o demasiado cortos para ser reales.
function textoInvalido(t, minimo) {
  const s = String(t || '');
  if (s.trim().length < (minimo || 80)) return true;
  if (/\[[^\]]{1,40}\]/.test(s)) return true; // [Tu Nombre], [Negocio]...
  if (/\{\{?[^}]{1,40}\}?\}/.test(s)) return true; // {{nombre}}, {rubro}...
  if (/tu nombre|nombre del negocio|nombre de tu/i.test(s)) return true;
  return false;
}

function meritoDe(l) {
  if (l.rating && l.resenas >= 10) return 'vi que tienen ' + l.rating + ' estrellas con ' + l.resenas + ' reseñas, se nota que trabajan bien';
  if (l.red === 'instagram' || l.red === 'facebook') return 'vi que se mueven bien en ' + l.red;
  if (l.direccion) return 'vi que están en ' + l.direccion.split(',')[0];
  return 'me llamó la atención el negocio';
}

const plantillas = [
  (l) => ({
    mensaje: `Hola, ¿hablo con ${l.nombre}? Soy ${vendedor}, de Impulso Web, acá de Córdoba. Los encontré en Google Maps buscando ${l.rubro} y ${meritoDe(l)}.\n\nLo que noté es que no tienen página propia, y hoy el que googlea "${l.rubro}" termina escribiéndole al que sí aparece.\n\nHacemos landing pages profesionales en 48hs por $170.000 (precio de lanzamiento), y antes de que pagues nada te armo una demo de TU web, gratis. ¿Te la paso?`,
    followup: `Hola! Soy ${vendedor}, te escribí hace unos días por la web de ${l.nombre}. Te dejo la propuesta abierta: la demo es gratis y sin compromiso. Si querés verla, avisame y te la mando 👍`,
  }),
  (l) => ({
    mensaje: `Buenas! ¿Cómo andan en ${l.nombre}? Soy ${vendedor}, de Impulso Web, una agencia de diseño de Córdoba. Los vi en Google Maps y ${meritoDe(l)}.\n\nSé que atender y encima contestar mensajes todo el día es un montón, así que voy al grano: no tienen página propia, y eso es plata que se va — la gente googlea, no te encuentra, y le escribe a otro.\n\nTe propongo algo simple: te armo una demo real de tu web, gratis, y si te gusta la dejamos online en 48hs por $170.000. ¿Querés que te la muestre?`,
    followup: `Hola de nuevo! Quedó pendiente lo de la web de ${l.nombre}. La demo ya casi está y no te compromete a nada. ¿Te la paso así la ves? 🙂`,
  }),
  (l) => ({
    mensaje: `Hola! Soy ${vendedor}, de Impulso Web (Córdoba). Encontré ${l.nombre} buscando ${l.rubro} en Google Maps y ${meritoDe(l)}.\n\nJusto por eso me hizo ruido que no tengan página web: el que los busca en Google no los encuentra, y con lo que cuesta ganarse cada cliente, regalarlos así duele.\n\nHacemos landings profesionales: $170.000 (promo de lanzamiento), seña del 50% y en 48hs está online. Primero te muestro una demo de TU web ya armada, gratis. ¿Te interesa verla?`,
    followup: `Buenas! Hace unos días te comenté lo de la página para ${l.nombre}. Sin apuro: la demo es gratis y la ves en 2 minutos. ¿Te la mando?`,
  }),
];

function pitchFallback(l) {
  return `¡Buenísimo! Te cuento bien de qué se trata.\n\nLa landing es una página profesional armada para ${l.rubro}: tus servicios con fotos, ubicación, horarios y un botón de WhatsApp para que te pidan turno o consulten directo. Queda lista para que te encuentren cuando te googlean, y la carga la hacemos nosotros con tus datos.\n\nPara ser claro con lo que NO es: no es una tienda online ni magia de posicionamiento — es tu presencia profesional para que el que te busca te encuentre a vos y no a otro.\n\nSale $170.000 (precio de lanzamiento), seña del 50% y en 48hs está online. El primer paso es gratis: te armo la demo con los datos de ${l.nombre} y la ves sin compromiso. ¿Arranco?`;
}

leads.forEach((l, i) => {
  const g = generados[l.placeId];
  const base = plantillas[i % plantillas.length](l);
  if (g && g.mensaje && !textoInvalido(g.mensaje)) {
    l.mensaje = String(g.mensaje);
    l.origenMensaje = 'gemini';
  } else {
    l.mensaje = base.mensaje;
    l.origenMensaje = 'fallback';
  }
  l.pitch = g && !textoInvalido(g.pitch, 200) ? String(g.pitch) : pitchFallback(l);
  l.followup = g && !textoInvalido(g.followup, 40) ? String(g.followup) : base.followup;
});

return leads.map((l) => ({ json: l }));
