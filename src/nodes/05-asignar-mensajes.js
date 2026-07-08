// Parsea la respuesta de Gemini y asigna mensaje + pitch + follow-up a cada lead.
// Todo texto generado pasa por un control de calidad doble:
//  - placeholders sin completar ([Tu Nombre], {{negocio}}) -> se descarta
//  - frases deshonestas que afirman que la web/muestra ya existe -> se descarta
// En ambos casos entra la plantilla honesta de fallback. La corrida nunca se cae.
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

// Rechaza textos con placeholders, deshonestidades o demasiado cortos para ser reales.
function textoInvalido(t, minimo) {
  const s = String(t || '');
  if (s.trim().length < (minimo || 80)) return true;
  if (/\[[^\]]{1,40}\]/.test(s)) return true; // [Tu Nombre], [Negocio]...
  if (/\{\{?[^}]{1,40}\}?\}/.test(s)) return true; // {{nombre}}, {rubro}...
  if (/tu nombre|nombre del negocio|nombre de tu/i.test(s)) return true;
  // Afirmaciones falsas: la muestra se arma DESPUÉS de que el lead responde.
  if (/ya (está|esta) (lista|armada|hecha)|ya la (tengo|armamos|armé|arme)|ya tengo (tu|su|la) (web|página|pagina|demo|muestra)|web ya lista|demo real/i.test(s)) return true;
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
    mensaje: `Hola, ¿hablo con ${l.nombre}? Soy ${vendedor}, de Impulso Web, acá de Córdoba. Los encontré en Google Maps buscando ${l.rubro} y ${meritoDe(l)}.\n\nLo que noté es que no tienen página propia, y hoy el que googlea "${l.rubro}" termina escribiéndole al que sí aparece.\n\nHacemos landing pages profesionales en 48hs por $170.000 (precio promocional). Si querés, te armo una muestra de cómo podría quedar la tuya, gratis y sin compromiso — la versión final llevaría tus fotos, servicios y precios. ¿Te interesa que te la muestre?`,
    followup: `Hola! Soy ${vendedor}, te escribí hace unos días por la web de ${l.nombre}. Te dejo abierto lo de la muestra: es gratis y sin compromiso, la armo si te interesa. Cualquier cosa avisame 👍`,
  }),
  (l) => ({
    mensaje: `Buenas! ¿Cómo andan en ${l.nombre}? Soy ${vendedor}, de Impulso Web, una agencia de diseño de Córdoba. Los vi en Google Maps y ${meritoDe(l)}.\n\nSé que atender y encima contestar mensajes todo el día es un montón, así que voy al grano: no tienen página propia, y eso es plata que se va — la gente googlea, no te encuentra, y le escribe a otro.\n\nTe propongo algo simple: si te interesa, te armo una muestra de cómo podría verse tu web, gratis. Si te gusta, la dejamos online en 48hs por $170.000 (precio promocional). ¿Querés que la arme?`,
    followup: `Hola de nuevo! Quedó pendiente lo de la web de ${l.nombre}. Lo de la muestra sigue en pie: gratis y sin compromiso, la armo si querés verla. 🙂`,
  }),
  (l) => ({
    mensaje: `Hola! Soy ${vendedor}, de Impulso Web (Córdoba). Encontré ${l.nombre} buscando ${l.rubro} en Google Maps y ${meritoDe(l)}.\n\nJusto por eso me hizo ruido que no tengan página web: el que los busca en Google no los encuentra, y con lo que cuesta ganarse cada cliente, regalarlos así duele.\n\nHacemos landings profesionales: $170.000 (precio promocional), seña del 50% y en 48hs online. Si querés, te armo una muestra de cómo podría quedar la tuya — es gratis y es un ejemplo, la versión final lleva tus fotos y servicios reales. ¿Te interesa verla?`,
    followup: `Buenas! Hace unos días te comenté lo de la página para ${l.nombre}. Sin apuro: si querés, te armo la muestra gratis y la ves en 2 minutos. ¿Te interesa?`,
  }),
];

function pitchFallback(l) {
  return `¡Buenísimo! Te cuento bien de qué se trata.\n\nLa landing es una página profesional armada para ${l.rubro}: tus servicios con fotos, ubicación, horarios y un botón de WhatsApp para que te pidan turno o consulten directo. Queda lista para que te encuentren cuando te googlean, y la carga la hacemos nosotros con tus datos.\n\nPara ser claro con lo que NO es: no es una tienda online ni magia de posicionamiento — es tu presencia profesional para que el que te busca te encuentre a vos y no a otro.\n\nSale $170.000 (precio promocional), seña del 50% y en 48hs está online. El primer paso es gratis: hoy mismo te armo una muestra con los datos de ${l.nombre} y te la paso — es un ejemplo de cómo quedaría; la versión final lleva tus fotos, servicios y precios reales. ¿Arranco?`;
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
