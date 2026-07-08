// Lead scoring: prioriza a quién vale la pena escribirle antes de gastar la corrida.
const config = $('Config').first().json;
const maxLeads = Number(config.maxLeads) || 15;

const items = $input.all();
for (const item of items) {
  const l = item.json;
  let score = 1; // base
  if (l.prioritario) score += 3; // rubro prioritario según Config
  if (l.esCelular) score += 2; // celular = WhatsApp casi seguro
  if (l.red) score += 2; // invierte en presencia digital pero no tiene web
  if (l.rating >= 4 && l.resenas >= 5) score += 1; // negocio activo con buena reputación
  if (l.direccion) score += 1; // local físico verificable
  l.score = score;
}

items.sort((a, b) => b.json.score - a.json.score);
return items.slice(0, maxLeads);
