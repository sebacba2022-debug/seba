// Resumen de la corrida: lo que ves al final de la ejecución en n8n.
const leads = $('Asignar mensajes').all().map((i) => i.json);
const info = $('Actualizar base y dashboard').first().json;
const config = $('Config').first().json;

const fallbacks = leads.filter((l) => l.origenMensaje === 'fallback').length;
const celulares = leads.filter((l) => l.esCelular).length;
const scorePromedio = leads.length
  ? Math.round((leads.reduce((a, l) => a + (l.score || 0), 0) / leads.length) * 10) / 10
  : 0;

return [{
  json: {
    fecha: new Date().toISOString(),
    procesados: leads.length,
    leadsNuevos: info.agregados,
    recontactos: info.recontactos,
    conCelular: celulares,
    scorePromedio,
    mensajesGemini: leads.length - fallbacks,
    mensajesFallback: fallbacks,
    totalEnBase: info.totalBase,
    dashboard: config.rutaDashboard,
  },
}];
