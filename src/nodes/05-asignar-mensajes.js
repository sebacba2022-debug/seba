// Parsea la respuesta de Gemini y asigna mensaje + follow-up a cada lead.
// Si Gemini falló o devolvió algo raro, entran las plantillas rotativas: la corrida nunca se cae.
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

const plantillas = [
  (l) => ({
    mensaje: `Hola, ¿hablo con ${l.nombre}? Te escribo de Impulso Web, acá de Córdoba. Hoy la mayoría busca "${l.rubro}" en Google antes de decidir, y si no tenés página ese cliente termina en otro lado. Hacemos landing pages profesionales en 48hs por $170.000, con seña del 50%. Antes de que pagues nada te armo una demo de tu web para que la veas, gratis y sin compromiso. ¿Te la paso?`,
    followup: `Hola! Te escribí hace unos días por la web de ${l.nombre}. Te dejo la propuesta abierta: la demo es gratis y sin compromiso. Si querés verla, avisame y te la mando 👍`,
  }),
  (l) => ({
    mensaje: `Buenas! ¿Cómo andan en ${l.nombre}? Soy de Impulso Web, una agencia de diseño de Córdoba. Vi que no tienen página propia y en el rubro ${l.rubro} eso es plata que se va: la gente googlea, no te encuentra, y le escribe al que sí aparece. Te propongo algo simple: te armo una demo real de tu web, gratis, y si te gusta la dejamos lista en 48hs por $170.000. ¿Querés que te la muestre?`,
    followup: `Hola de nuevo! Quedó pendiente lo de la web de ${l.nombre}. La demo ya casi está y no te compromete a nada. ¿Te la paso así la ves? 🙂`,
  }),
  (l) => ({
    mensaje: `Hola! Les escribo de Impulso Web (Córdoba). Trabajamos con negocios como ${l.nombre} que todavía no tienen página web. El tema es que sin web dependés del boca a boca, y los clientes nuevos te buscan en Google. Hacemos landings profesionales: $170.000, seña del 50% y en 48hs está online. Lo mejor: primero te muestro una demo de TU web ya armada, gratis. ¿Te interesa verla?`,
    followup: `Buenas! Hace unos días te comenté lo de la página para ${l.nombre}. Sin apuro: la demo es gratis y la ves en 2 minutos. ¿Te la mando?`,
  }),
];

leads.forEach((l, i) => {
  const g = generados[l.placeId];
  if (g && g.mensaje) {
    l.mensaje = String(g.mensaje);
    l.followup = String(g.followup || '');
    l.origenMensaje = 'gemini';
  } else {
    const p = plantillas[i % plantillas.length](l);
    l.mensaje = p.mensaje;
    l.followup = p.followup;
    l.origenMensaje = 'fallback';
  }
});

return leads.map((l) => ({ json: l }));
