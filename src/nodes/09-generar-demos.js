// Genera automáticamente la MUESTRA visual de la web de cada lead de la corrida:
// una landing autocontenida (HTML+CSS, sin dependencias) con plantilla según el
// rubro y los datos reales del negocio (nombre, rating, reseñas, dirección) y su
// botón de turnos por WhatsApp funcionando. Cuando un lead responde con interés,
// la muestra ya está en el disco: se abre, se le saca captura o se sube a Netlify,
// y se manda en minutos. Lleva un banner permanente de "MUESTRA" para que quede
// claro que es un ejemplo y que la versión final lleva fotos y datos reales.
const config = $('Config').first().json;
const carpeta = String(config.rutaDemos || 'C:/ImpulsoWeb/demos').replace(/[\\/]+$/, '');

const PRESETS = [
  [/peluquer|estilis|hair/i, {
    chip: 'Peluquería', tag: 'Tu mejor versión te espera',
    c1: '#241b2f', c2: '#3d2b52', acc: '#e879f9',
    servicios: [
      ['Corte y peinado', 'Asesoramiento según tu estilo y tipo de cabello'],
      ['Color y mechas', 'Balayage, babylights y color completo'],
      ['Tratamientos', 'Nutrición, keratina y brillo profundo'],
      ['Peinados para eventos', 'Recogidos y ondas para tu día especial'],
    ],
    porque: ['Turnos por WhatsApp, sin esperas', 'Productos profesionales', 'Atención personalizada'],
  }],
  [/barber/i, {
    chip: 'Barbería', tag: 'Corte clásico, actitud de hoy',
    c1: '#191714', c2: '#2e2820', acc: '#f59e0b',
    servicios: [
      ['Corte clásico o fade', 'Terminación a navaja y toalla caliente'],
      ['Barba y perfilado', 'Ritual completo con productos premium'],
      ['Corte + barba', 'El combo de siempre, al mejor precio'],
      ['Color y diseño', 'Diseños personalizados y matización'],
    ],
    porque: ['Reservá tu turno por WhatsApp', 'Ambiente pensado para vos', 'Precios claros, sin sorpresas'],
  }],
  [/est[eé]tic|spa|belleza|cosmetolog|depilaci/i, {
    chip: 'Estética', tag: 'Un momento para vos',
    c1: '#2b1b26', c2: '#4a2b40', acc: '#f9a8d4',
    servicios: [
      ['Limpieza facial profunda', 'Hidratación y renovación de la piel'],
      ['Depilación definitiva', 'Tecnología de última generación'],
      ['Masajes y relax', 'Descontracturantes y drenaje linfático'],
      ['Manos y pies', 'Esmaltado semipermanente y spa de pies'],
    ],
    porque: ['Turnos online por WhatsApp', 'Profesionales matriculadas', 'Higiene y productos certificados'],
  }],
  [/gimnasio|gym|fitness|crossfit|entrenamiento/i, {
    chip: 'Entrenamiento', tag: 'Hoy es un buen día para empezar',
    c1: '#101816', c2: '#1c2b26', acc: '#a3e635',
    servicios: [
      ['Musculación', 'Equipamiento completo y rutinas guiadas'],
      ['Clases grupales', 'Funcional, HIIT, spinning y más'],
      ['Plan personalizado', 'Seguimiento de un entrenador'],
      ['Pase libre', 'Entrená cuando quieras, sin vueltas'],
    ],
    porque: ['Consultá planes por WhatsApp', 'Horarios amplios', 'Primer clase de prueba'],
  }],
  [/veterinari|mascota|pet/i, {
    chip: 'Veterinaria', tag: 'Los cuidamos como vos los querés',
    c1: '#132226', c2: '#1e3a40', acc: '#2dd4bf',
    servicios: [
      ['Consulta clínica', 'Atención general y control sano'],
      ['Vacunación', 'Plan completo para perros y gatos'],
      ['Cirugías', 'Castraciones y cirugías programadas'],
      ['Peluquería canina', 'Baño y corte con turno'],
    ],
    porque: ['Turnos por WhatsApp', 'Urgencias: consultanos', 'Atención con cariño de verdad'],
  }],
  [/odontolog|dental|dentista/i, {
    chip: 'Odontología', tag: 'Tu sonrisa, en buenas manos',
    c1: '#12202e', c2: '#1c3550', acc: '#38bdf8',
    servicios: [
      ['Consulta y diagnóstico', 'Evaluación completa con plan de tratamiento'],
      ['Limpieza y blanqueamiento', 'Estética dental profesional'],
      ['Ortodoncia', 'Brackets y alineadores'],
      ['Implantes', 'Rehabilitación con tecnología actual'],
    ],
    porque: ['Turnos por WhatsApp', 'Financiación y obras sociales: consultanos', 'Profesionales matriculados'],
  }],
];

const PRESET_DEFAULT = {
  chip: 'Atención personalizada', tag: 'Estamos para ayudarte',
  c1: '#181a26', c2: '#252a42', acc: '#818cf8',
  servicios: [
    ['Nuestros servicios', 'Contanos qué necesitás y te asesoramos'],
    ['Atención personalizada', 'Cada cliente es único para nosotros'],
    ['Presupuesto sin cargo', 'Consultá sin compromiso'],
    ['Turnos y consultas', 'Escribinos por WhatsApp y coordinamos'],
  ],
  porque: ['Respuesta rápida por WhatsApp', 'Años de experiencia en el rubro', 'Clientes que nos recomiendan'],
};

function presetPara(rubro) {
  for (const [re, p] of PRESETS) {
    if (re.test(String(rubro || ''))) return p;
  }
  return PRESET_DEFAULT;
}

function slugDe(l) {
  const base = String(l.nombre || 'negocio')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base + '-' + String(l.telefono || '0000').slice(-4);
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

function generarDemo(l) {
  const p = presetPara(l.rubro);
  const nombre = esc(l.nombre);
  const waUrl = 'https://wa.me/' + l.telefono + '?text=' + encodeURIComponent('Hola! Vi la página de ' + l.nombre + ' y quiero pedir un turno.');
  const estrellas = l.rating
    ? `<div class="rating">&#9733; ${l.rating} &middot; ${l.resenas || 0} reseñas en Google</div>`
    : '';
  const resenas = l.rating
    ? `<section class="alt"><h2>Lo que dicen nuestros clientes</h2>
<div class="nota"><span class="grande">&#9733; ${l.rating}</span><p>${l.resenas || 0} reseñas reales en Google</p></div>
<p class="aclara">En la versión final, acá se muestran tus mejores reseñas reales de Google.</p></section>`
    : '';
  const ubicacion = l.direccion
    ? `<p class="dir">${esc(l.direccion)}</p>` + (l.mapsUrl ? `<a class="link" href="${esc(l.mapsUrl)}" target="_blank">Cómo llegar &rarr;</a>` : '')
    : '<p class="dir">Tu dirección real va acá</p>';
  const servicios = p.servicios
    .map(([t, d]) => `<div class="serv"><h3>${t}</h3><p>${d}</p></div>`)
    .join('\n');
  const porque = p.porque.map((b) => `<li>${b}</li>`).join('\n');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${nombre} — ${esc(p.chip)}</title>
<style>
* { box-sizing: border-box; margin: 0; }
body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: #0b0b10; color: #f4f4f5; }
.aviso { position: sticky; top: 0; z-index: 10; background: #fbbf24; color: #201a05; font-size: 12.5px; font-weight: 600; text-align: center; padding: 8px 14px; }
.hero { background: linear-gradient(160deg, ${p.c1}, ${p.c2}); text-align: center; padding: 64px 20px 56px; }
.chip { display: inline-block; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: ${p.acc}; border: 1px solid ${p.acc}55; border-radius: 999px; padding: 6px 14px; margin-bottom: 18px; }
h1 { font-size: clamp(30px, 7vw, 46px); line-height: 1.1; }
.tag { color: #d4d4d8; font-size: 17px; margin-top: 10px; }
.rating { margin-top: 16px; color: #fbbf24; font-weight: 600; font-size: 15px; }
.cta { display: inline-block; margin-top: 26px; background: #22c55e; color: #06130a; font-weight: 700; font-size: 16px; padding: 14px 26px; border-radius: 999px; text-decoration: none; box-shadow: 0 8px 24px #22c55e44; }
.cta:hover { background: #4ade80; }
section { max-width: 860px; margin: 0 auto; padding: 48px 20px; }
h2 { font-size: 24px; margin-bottom: 22px; text-align: center; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; }
.serv { background: #16161d; border: 1px solid #26262f; border-radius: 14px; padding: 18px; }
.serv h3 { font-size: 15.5px; margin-bottom: 6px; color: ${p.acc}; }
.serv p { font-size: 13.5px; color: #a1a1aa; line-height: 1.45; }
.alt { background: #101017; border-block: 1px solid #1e1e26; max-width: none; }
.alt > * { max-width: 860px; margin-inline: auto; }
ul { list-style: none; max-width: 480px !important; }
li { padding: 10px 0 10px 34px; position: relative; font-size: 15px; color: #d4d4d8; }
li::before { content: "✓"; position: absolute; left: 0; color: ${p.acc}; font-weight: 700; }
.nota { text-align: center; }
.grande { font-size: 44px; color: #fbbf24; font-weight: 800; display: block; }
.nota p { color: #a1a1aa; margin-top: 6px; }
.aclara { text-align: center; font-size: 12.5px; color: #71717a; margin-top: 18px; }
.dir { text-align: center; color: #d4d4d8; font-size: 15px; }
.link { display: block; text-align: center; color: ${p.acc}; margin-top: 8px; text-decoration: none; font-size: 14px; }
.horario { text-align: center; color: #71717a; font-size: 13px; margin-top: 14px; }
footer { text-align: center; padding: 44px 20px 90px; background: linear-gradient(200deg, ${p.c2}, ${p.c1}); }
footer p { color: #a1a1aa; font-size: 12px; margin-top: 22px; }
.wa-fijo { position: fixed; right: 16px; bottom: 16px; background: #22c55e; color: #06130a; font-weight: 700; font-size: 14px; padding: 12px 18px; border-radius: 999px; text-decoration: none; box-shadow: 0 8px 24px #000a; }
</style>
</head>
<body>
<div class="aviso">MUESTRA &middot; Así podría verse la web de ${nombre} — la versión final lleva tus fotos, servicios y datos reales</div>
<header class="hero">
  <span class="chip">${esc(p.chip)}</span>
  <h1>${nombre}</h1>
  <p class="tag">${esc(p.tag)}</p>
  ${estrellas}
  <a class="cta" href="${waUrl}">Pedí tu turno por WhatsApp</a>
</header>
<section>
  <h2>Servicios</h2>
  <div class="grid">
${servicios}
  </div>
</section>
<section class="alt">
  <h2>Por qué elegirnos</h2>
  <ul>
${porque}
  </ul>
</section>
${resenas}
<section>
  <h2>Dónde estamos</h2>
  ${ubicacion}
  <p class="horario">Lunes a sábado — tus horarios reales van acá</p>
</section>
<footer>
  <a class="cta" href="${waUrl}">Escribinos por WhatsApp</a>
  <p>${nombre} &middot; Página de muestra armada por Impulso Web</p>
</footer>
<a class="wa-fijo" href="${waUrl}">WhatsApp</a>
</body>
</html>`;
}

return $input.all().map((item) => {
  const l = item.json;
  const archivo = slugDe(l) + '.html';
  const html = generarDemo(l);
  return {
    json: {
      ...l,
      demoArchivo: 'demos/' + archivo, // ruta relativa al dashboard
      demoRuta: carpeta + '/' + archivo,
    },
    binary: {
      demo: {
        data: Buffer.from(html, 'utf8').toString('base64'),
        mimeType: 'text/html',
        fileName: archivo,
      },
    },
  };
});
