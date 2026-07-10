// Genera automáticamente la MUESTRA visual de la web de cada lead de la corrida:
// una landing autocontenida (HTML+CSS, sin dependencias obligatorias) con plantilla
// según el rubro y los datos reales del negocio (nombre, rating, reseñas, dirección)
// y su botón de turnos por WhatsApp funcionando. Usa Google Fonts si hay internet
// (con fallback a fuentes del sistema). Lleva un banner permanente de "MUESTRA".
const config = $('Config').first().json;
const carpeta = String(config.rutaDemos || 'C:/ImpulsoWeb/demos').replace(/[\\/]+$/, '');

const PRESETS = [
  [/peluquer|estilis|hair/i, {
    chip: 'Peluquería', tag: 'Tu mejor versión te espera',
    c1: '#231327', c2: '#4a1f52', acc: '#e879f9',
    font: "'Playfair Display', Georgia, serif", fontQ: 'Playfair+Display:wght@600;800',
    icons: ['✂️', '🎨', '✨', '👰'],
    servicios: [
      ['Corte y peinado', 'Asesoramiento según tu estilo y tipo de cabello'],
      ['Color y mechas', 'Balayage, babylights y color completo'],
      ['Tratamientos', 'Nutrición, keratina y brillo profundo'],
      ['Peinados para eventos', 'Recogidos y ondas para tu día especial'],
    ],
    porque: ['Turnos por WhatsApp, sin esperas', 'Productos profesionales', 'Atención personalizada'],
    galeria: ['El salón', 'Antes y después', 'Color y mechas'],
  }],
  [/barber/i, {
    chip: 'Barbería', tag: 'Corte clásico, actitud de hoy',
    c1: '#171310', c2: '#3a2c1a', acc: '#f59e0b',
    font: "'Oswald', 'Arial Narrow', sans-serif", fontQ: 'Oswald:wght@500;700',
    icons: ['💈', '🪒', '✂️', '🎯'],
    servicios: [
      ['Corte clásico o fade', 'Terminación a navaja y toalla caliente'],
      ['Barba y perfilado', 'Ritual completo con productos premium'],
      ['Corte + barba', 'El combo de siempre, al mejor precio'],
      ['Color y diseño', 'Diseños personalizados y matización'],
    ],
    porque: ['Reservá tu turno por WhatsApp', 'Ambiente pensado para vos', 'Precios claros, sin sorpresas'],
    galeria: ['La barbería', 'Cortes', 'El equipo'],
  }],
  [/est[eé]tic|spa|belleza|cosmetolog|depilaci/i, {
    chip: 'Estética', tag: 'Un momento para vos',
    c1: '#2a1420', c2: '#59253f', acc: '#f9a8d4',
    font: "'Playfair Display', Georgia, serif", fontQ: 'Playfair+Display:wght@600;800',
    icons: ['🧖‍♀️', '✨', '💆‍♀️', '💅'],
    servicios: [
      ['Limpieza facial profunda', 'Hidratación y renovación de la piel'],
      ['Depilación definitiva', 'Tecnología de última generación'],
      ['Masajes y relax', 'Descontracturantes y drenaje linfático'],
      ['Manos y pies', 'Esmaltado semipermanente y spa de pies'],
    ],
    porque: ['Turnos online por WhatsApp', 'Profesionales matriculadas', 'Higiene y productos certificados'],
    galeria: ['El espacio', 'Resultados', 'Tratamientos'],
  }],
  [/gimnasio|gym|fitness|crossfit|entrenamiento/i, {
    chip: 'Entrenamiento', tag: 'Hoy es un buen día para empezar',
    c1: '#0c1512', c2: '#1d3a2d', acc: '#a3e635',
    font: "'Montserrat', 'Arial Black', sans-serif", fontQ: 'Montserrat:wght@700;900',
    icons: ['🏋️', '🤸', '📋', '🔓'],
    servicios: [
      ['Musculación', 'Equipamiento completo y rutinas guiadas'],
      ['Clases grupales', 'Funcional, HIIT, spinning y más'],
      ['Plan personalizado', 'Seguimiento de un entrenador'],
      ['Pase libre', 'Entrená cuando quieras, sin vueltas'],
    ],
    porque: ['Consultá planes por WhatsApp', 'Horarios amplios', 'Primer clase de prueba'],
    galeria: ['Las instalaciones', 'Clases', 'La comunidad'],
  }],
  [/veterinari|mascota|pet/i, {
    chip: 'Veterinaria', tag: 'Los cuidamos como vos los querés',
    c1: '#0f1f23', c2: '#1e4249', acc: '#2dd4bf',
    font: "'Nunito', 'Segoe UI', sans-serif", fontQ: 'Nunito:wght@700;900',
    icons: ['🩺', '💉', '🏥', '🐾'],
    servicios: [
      ['Consulta clínica', 'Atención general y control sano'],
      ['Vacunación', 'Plan completo para perros y gatos'],
      ['Cirugías', 'Castraciones y cirugías programadas'],
      ['Peluquería canina', 'Baño y corte con turno'],
    ],
    porque: ['Turnos por WhatsApp', 'Urgencias: consultanos', 'Atención con cariño de verdad'],
    galeria: ['La clínica', 'Nuestros pacientes', 'El equipo'],
  }],
  [/odontolog|dental|dentista/i, {
    chip: 'Odontología', tag: 'Tu sonrisa, en buenas manos',
    c1: '#0e1c2b', c2: '#1d3f61', acc: '#38bdf8',
    font: "'Poppins', 'Segoe UI', sans-serif", fontQ: 'Poppins:wght@600;800',
    icons: ['🦷', '✨', '😁', '🔧'],
    servicios: [
      ['Consulta y diagnóstico', 'Evaluación completa con plan de tratamiento'],
      ['Limpieza y blanqueamiento', 'Estética dental profesional'],
      ['Ortodoncia', 'Brackets y alineadores'],
      ['Implantes', 'Rehabilitación con tecnología actual'],
    ],
    porque: ['Turnos por WhatsApp', 'Financiación y obras sociales: consultanos', 'Profesionales matriculados'],
    galeria: ['El consultorio', 'Tecnología', 'Sonrisas'],
  }],
];

const PRESET_DEFAULT = {
  chip: 'Atención personalizada', tag: 'Estamos para ayudarte',
  c1: '#151726', c2: '#2b2f55', acc: '#818cf8',
  font: "'Poppins', 'Segoe UI', sans-serif", fontQ: 'Poppins:wght@600;800',
  icons: ['⭐', '🤝', '📋', '💬'],
  servicios: [
    ['Nuestros servicios', 'Contanos qué necesitás y te asesoramos'],
    ['Atención personalizada', 'Cada cliente es único para nosotros'],
    ['Presupuesto sin cargo', 'Consultá sin compromiso'],
    ['Turnos y consultas', 'Escribinos por WhatsApp y coordinamos'],
  ],
  porque: ['Respuesta rápida por WhatsApp', 'Años de experiencia en el rubro', 'Clientes que nos recomiendan'],
  galeria: ['Tu negocio', 'Tu trabajo', 'Tu equipo'],
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
  const zonaCorta = esc(String(l.zona || l.direccion || 'Córdoba').split(',')[0]);
  const waUrl = 'https://wa.me/' + l.telefono + '?text=' + encodeURIComponent('Hola! Vi la página de ' + l.nombre + ' y quiero pedir un turno.');

  const chipRating = l.rating ? `<span class="tchip">&#9733; ${l.rating} en Google (${l.resenas || 0} reseñas)</span>` : '';
  const estrellas = '&#9733;'.repeat(Math.max(1, Math.round(l.rating || 5)));

  const resenas = l.rating
    ? `<section>
  <p class="kicker">Reputación real</p>
  <h2>Lo que dicen sus clientes</h2>
  <div class="nota">
    <div class="stars">${estrellas}</div>
    <p class="notanum">${l.rating}</p>
    <p class="notasub">${l.resenas || 0} reseñas reales en Google</p>
    <p class="aclara">En la versión final, acá se muestran tus mejores reseñas de Google, con nombre y comentario.</p>
  </div>
</section>`
    : '';

  const ubicacion = l.direccion
    ? `<p class="dir">📍 ${esc(l.direccion)}</p>` + (l.mapsUrl ? `<a class="link" href="${esc(l.mapsUrl)}" target="_blank">Cómo llegar &rarr;</a>` : '')
    : '<p class="dir">📍 Tu dirección real va acá</p>';

  const servicios = p.servicios
    .map(([t, d], i) => `<div class="serv"><div class="icono">${p.icons[i] || '⭐'}</div><h3>${t}</h3><p>${d}</p></div>`)
    .join('\n');

  const porque = p.porque.map((b) => `<li>${b}</li>`).join('\n');

  const galeria = p.galeria
    .map((g) => `<div class="tile"><span>📷</span><b>${g}</b><small>Tus fotos reales van acá</small></div>`)
    .join('\n');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${nombre} — ${esc(p.chip)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${p.fontQ}&family=Inter:wght@400;600&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; margin: 0; }
body { font-family: 'Inter', system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: #0a0a0f; color: #f4f4f5; line-height: 1.5; }
.aviso { position: sticky; top: 0; z-index: 20; background: #fbbf24; color: #201a05; font-size: 12.5px; font-weight: 600; text-align: center; padding: 8px 14px; }
.hero { position: relative; overflow: hidden; background: linear-gradient(160deg, ${p.c1}, ${p.c2}); text-align: center; padding: 96px 20px 84px; }
.glow { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; }
.g1 { width: 460px; height: 460px; background: ${p.acc}; opacity: .22; top: -140px; right: -100px; }
.g2 { width: 380px; height: 380px; background: ${p.acc}; opacity: .12; bottom: -140px; left: -90px; }
.hero > :not(.glow) { position: relative; }
.chip { display: inline-block; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: ${p.acc}; border: 1px solid ${p.acc}55; border-radius: 999px; padding: 7px 16px; margin-bottom: 22px; }
h1 { font-family: ${p.font}; font-size: clamp(40px, 7.5vw, 72px); line-height: 1.05; letter-spacing: -0.5px; }
.tag { color: #d4d4d8; font-size: clamp(16px, 2.4vw, 20px); margin-top: 14px; }
.cta { display: inline-block; margin-top: 30px; background: #22c55e; color: #05130a; font-weight: 700; font-size: 16.5px; padding: 16px 32px; border-radius: 999px; text-decoration: none; box-shadow: 0 10px 30px #22c55e55; transition: transform .15s ease; }
.cta:hover { transform: translateY(-2px); background: #4ade80; }
.chips { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 30px; }
.tchip { font-size: 12.5px; color: #e4e4e7; background: #ffffff14; border: 1px solid #ffffff22; padding: 7px 14px; border-radius: 999px; backdrop-filter: blur(4px); }
section { max-width: 1020px; margin: 0 auto; padding: 72px 20px; }
.kicker { text-align: center; color: ${p.acc}; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; font-weight: 600; margin-bottom: 10px; }
h2 { font-family: ${p.font}; font-size: clamp(26px, 4vw, 38px); margin-bottom: 34px; text-align: center; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(225px, 1fr)); gap: 16px; }
.serv { background: #14141c; border: 1px solid #26262f; border-top: 3px solid ${p.acc}88; border-radius: 16px; padding: 24px 20px; transition: transform .15s ease, border-color .15s ease; }
.serv:hover { transform: translateY(-4px); border-color: ${p.acc}; }
.icono { width: 46px; height: 46px; border-radius: 12px; background: ${p.acc}1f; display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 14px; }
.serv h3 { font-size: 16px; margin-bottom: 6px; color: #fafafa; }
.serv p { font-size: 13.5px; color: #a1a1aa; }
.galeria { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
.tile { aspect-ratio: 4/3; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; background: linear-gradient(150deg, ${p.c2}cc, ${p.c1}); border: 1px dashed ${p.acc}55; }
.tile span { font-size: 30px; }
.tile b { font-size: 14.5px; }
.tile small { font-size: 11.5px; color: #a1a1aa; }
.alt { background: #101017; border-block: 1px solid #1d1d26; max-width: none; }
.alt > .inner { max-width: 1020px; margin: 0 auto; }
ul.checks { list-style: none; padding: 0; max-width: 560px; margin: 0 auto; }
ul.checks li { padding: 13px 0 13px 44px; position: relative; font-size: 16px; color: #e4e4e7; border-bottom: 1px solid #1d1d26; }
ul.checks li:last-child { border-bottom: 0; }
ul.checks li::before { content: "✓"; position: absolute; left: 0; top: 10px; width: 28px; height: 28px; border-radius: 50%; background: ${p.acc}22; color: ${p.acc}; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 14px; }
.nota { text-align: center; }
.stars { color: #fbbf24; font-size: 34px; letter-spacing: 6px; }
.notanum { font-family: ${p.font}; font-size: 58px; font-weight: 800; margin-top: 4px; }
.notasub { color: #a1a1aa; }
.aclara { font-size: 12.5px; color: #71717a; margin-top: 16px; }
.dir { text-align: center; color: #e4e4e7; font-size: 16px; }
.link { display: block; text-align: center; color: ${p.acc}; margin-top: 10px; text-decoration: none; font-size: 14.5px; }
.link:hover { text-decoration: underline; }
.horario { text-align: center; color: #71717a; font-size: 13px; margin-top: 14px; }
.final { background: linear-gradient(160deg, ${p.c2}, ${p.c1}); border: 1px solid ${p.acc}33; border-radius: 24px; text-align: center; padding: 56px 24px; position: relative; overflow: hidden; }
.final h2 { margin-bottom: 8px; }
.final p { color: #d4d4d8; }
footer { text-align: center; padding: 36px 20px 100px; }
footer p { color: #71717a; font-size: 12px; }
.wa-fijo { position: fixed; right: 18px; bottom: 18px; z-index: 30; background: #22c55e; color: #05130a; font-weight: 700; font-size: 14.5px; padding: 14px 20px; border-radius: 999px; text-decoration: none; box-shadow: 0 8px 24px #000a; animation: pulso 2.4s infinite; }
@keyframes pulso { 0% { box-shadow: 0 0 0 0 #22c55e66; } 70% { box-shadow: 0 0 0 18px #22c55e00; } 100% { box-shadow: 0 0 0 0 #22c55e00; } }
</style>
</head>
<body>
<div class="aviso">MUESTRA &middot; Así podría verse la web de ${nombre} — la versión final lleva tus fotos, servicios y datos reales</div>

<header class="hero">
  <div class="glow g1"></div>
  <div class="glow g2"></div>
  <span class="chip">${esc(p.chip)} &middot; ${zonaCorta}</span>
  <h1>${nombre}</h1>
  <p class="tag">${esc(p.tag)}</p>
  <a class="cta" href="${waUrl}">Pedí tu turno por WhatsApp</a>
  <div class="chips">
    ${chipRating}
    <span class="tchip">Respuesta rápida por WhatsApp</span>
    <span class="tchip">${zonaCorta}</span>
  </div>
</header>

<section>
  <p class="kicker">Qué ofrecemos</p>
  <h2>Servicios</h2>
  <div class="grid">
${servicios}
  </div>
</section>

<section class="alt"><div class="inner">
  <p class="kicker">Conocenos</p>
  <h2>Nuestro trabajo</h2>
  <div class="galeria">
${galeria}
  </div>
</div></section>

<section>
  <p class="kicker">La diferencia</p>
  <h2>Por qué elegirnos</h2>
  <ul class="checks">
${porque}
  </ul>
</section>

${resenas}

<section class="alt"><div class="inner">
  <p class="kicker">Visitanos</p>
  <h2>Dónde estamos</h2>
  ${ubicacion}
  <p class="horario">Lunes a sábado — tus horarios reales van acá</p>
</div></section>

<section>
  <div class="final">
    <h2>¿Reservamos tu turno?</h2>
    <p>Escribinos por WhatsApp y coordinamos en un minuto.</p>
    <a class="cta" href="${waUrl}">Escribir por WhatsApp</a>
  </div>
</section>

<footer>
  <p>${nombre} &middot; Página de muestra armada por Impulso Web</p>
</footer>

<a class="wa-fijo" href="${waUrl}">💬 WhatsApp</a>
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
