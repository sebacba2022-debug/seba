// Genera una búsqueda de texto por cada combinación zona × rubro.
// Cada item de salida se convierte en un POST a Places Text Search.
const config = $('Config').first().json;

if (String(config.placesApiKey || '').includes('PEGAR')) {
  throw new Error('Falta configurar la API key de Google Places en el nodo Config.');
}

let zonas;
let rubros;
try {
  zonas = JSON.parse(config.zonas);
} catch (e) {
  throw new Error('Config > zonas no es un JSON válido. Ejemplo: ["Córdoba Capital, Argentina"]');
}
try {
  rubros = JSON.parse(config.rubros);
} catch (e) {
  throw new Error('Config > rubros no es un JSON válido. Ejemplo: [{"rubro":"peluquería","prioritario":true}]');
}

const busquedas = [];
for (const zona of zonas) {
  for (const r of rubros) {
    busquedas.push({
      json: {
        textQuery: r.rubro + ' en ' + zona,
        rubro: r.rubro,
        prioritario: !!r.prioritario,
        zona,
      },
    });
  }
}

if (!busquedas.length) {
  throw new Error('No hay búsquedas para hacer: revisá zonas y rubros en el nodo Config.');
}

return busquedas;
