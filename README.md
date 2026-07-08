# Impulso Web — Sistema de Prospección B2B (v8)

Automatiza la generación de leads para una agencia de diseño web en Córdoba, Argentina:
encuentra negocios locales **sin página web** usando **Google Places API**, genera mensajes
de venta personalizados con Gemini, y produce un panel local para contacto **manual** por
WhatsApp (el envío nunca se automatiza, para no quemar el número).

**Modelo de negocio**: landing pages a $170.000 ARS, 50% de seña, entrega en 48hs.
La venta se cierra mostrando una demo real de la web del prospecto.

---

## Qué hay en este repo

```
├── workflows/impulso-web-v8.json   ← el workflow: importalo en n8n y listo
├── src/nodes/*.js                  ← el código de cada nodo Code (fuente editable)
├── tools/build-workflow.js         ← regenera el workflow desde src/ y lo testea
├── docs/google-places-setup.md     ← guía paso a paso de Google Cloud + Places API
└── README.md
```

El JSON del workflow **se genera** desde `src/nodes/`. Si querés tocar la lógica de un nodo,
editá el `.js` correspondiente y corré:

```bash
node tools/build-workflow.js
```

El script corre pruebas de humo sobre todo el pipeline (con respuestas simuladas de Places
y Gemini) antes de escribir el JSON, así no importás un workflow roto.

---

## Qué cambió respecto de v7

| Problema en v7 | Solución en v8 |
|---|---|
| OpenStreetMap: datos pobres, teléfonos fijos, pozo chico | **Google Places API (New)** con Text Search + paginación. Teléfonos actuales, rating, reseñas, y el dato clave: si tienen web o no |
| No distinguía celular de fijo | Detecta celulares por el prefijo `+54 9` que devuelve Google. Los fijos se marcan (badge "fijo") y puntúan menos. Filtro "solo celulares" en el panel |
| Negocio con `websiteUri` = descartado | Si la "web" es solo Instagram/Facebook/Linktree/wa.me, **sí es lead** (y de los mejores: ya invierte en presencia digital). Se guarda la red detectada y el mensaje la menciona |
| "Marcar enviado" vivía en localStorage del navegador | El panel **escribe de vuelta a la base maestra** vía webhook de n8n (`POST /impulso-estado`). Si n8n está apagado, el cambio queda en cola local y se sincroniza solo al volver |
| Sin pipeline de venta | 7 estados por lead: `nuevo → enviado → sin_respuesta / respondio → demo → cerrado / descartado`, con historial de cambios por lead |
| Sin analytics | El panel calcula tasa de respuesta y cierre **por rubro** (para saber a qué rubro apuntar) |
| Dashboard dependía de Tailwind CDN | HTML 100% autocontenido: CSS embebido, funciona sin internet |
| Dashboard estático hasta la próxima corrida | Botón "Refrescar": trae la base en vivo desde n8n (`GET /impulso-leads`) |
| Leads viejos se perdían para siempre | **Recontacto**: si un lead quedó en `enviado`/`sin_respuesta` hace más de `diasMinimos`, vuelve a entrar con un mensaje que reconoce el contacto anterior |
| Código embebido en el JSON del workflow, difícil de editar | Código fuente en `src/nodes/`, con build + tests |

Lo que ya andaba bien se mantiene igual: **una sola llamada a Gemini** por corrida (esquiva
el rate limit del free tier), plantillas de fallback rotativas si Gemini falla (la corrida
nunca se cae), scoring antes de gastar IA, retry en todos los HTTP.

---

## Arquitectura del workflow

**Flujo principal** (manual o cron diario 9:00, desactivado por defecto):

1. **Config** (Set): API keys, zonas, rubros, maxLeads, diasMinimos, rutas.
2. **Leer base** + **Extraer base**: carga `leads_db.json` (si no existe, sigue).
3. **Armar búsquedas** (Code): una búsqueda por zona × rubro.
4. **Buscar en Google Places** (HTTP): `POST places:searchText` con FieldMask, paginación
   automática (hasta 2 páginas = 40 resultados por búsqueda), retry 3x.
5. **Normalizar y dedupear** (Code): teléfono a formato `549...`, detección celular/red social,
   filtra los que tienen web real, dedup contra la base respetando `diasMinimos`.
6. **Calcular score y ordenar** (Code): `+3` rubro prioritario, `+2` celular, `+2` red social
   sin web, `+1` rating ≥4 con ≥5 reseñas, `+1` dirección física, `+1` base. Corta a `maxLeads`.
7. **Armar prompt** → **Gemini** (1 sola llamada) → **Asignar mensajes** (parseo + control de
   calidad: se descarta todo texto con placeholders o que afirme que la web "ya está lista" —
   los mensajes son honestos por diseño: se OFRECE armar una muestra, nunca se dice que ya existe).
8. **Generar demos** (Code): arma la **muestra visual** de la web de cada lead — una landing
   autocontenida con plantilla según rubro (peluquería, barbería, estética, gimnasio,
   veterinaria, odontología o genérica), sus datos reales de Google (nombre, rating, reseñas,
   dirección) y botón de turnos por WhatsApp apuntando a su número. Cada muestra lleva un
   banner permanente de "MUESTRA" para que quede claro que es un ejemplo. Se guardan en
   `C:\ImpulsoWeb\demos\`, y el panel las abre con el botón "Ver muestra".
9. **Actualizar base y dashboard** (Code) → **Guardar base** → **Guardar dashboard** → **Resumen**.

**El flujo de venta con las muestras**: cuando un lead responde con interés, su muestra ya
está en el disco. La abrís desde el panel ("Ver muestra"), le sacás una captura (o la subís a
Netlify si querés mandar link) y se la enviás por WhatsApp junto con el pitch. De "me interesa"
a "mirá cómo quedaría la tuya" en 2 minutos — la velocidad de respuesta es media venta.

**Flujo de estados** (webhook, requiere workflow *activo*):
`POST /webhook/impulso-estado` — el panel manda `{telefono|placeId, estado}` (suelto o en
lote `{updates:[...]}`) y n8n lo persiste en la base con historial.

**Flujo de datos en vivo**:
`GET /webhook/impulso-leads` — devuelve la base completa; el panel lo usa al abrir y con "Refrescar".

**Nota**: si una corrida no encuentra ningún lead nuevo, termina temprano y el dashboard no
se regenera (los datos no cambiaron; el panel viejo sigue siendo válido).

---

## Instalación

1. **Variable de entorno** (n8n bloquea escritura a disco por defecto):
   ```
   N8N_RESTRICT_FILE_ACCESS_TO=C:\ImpulsoWeb
   ```
   Creá las carpetas `C:\ImpulsoWeb` y `C:\ImpulsoWeb\demos` si no existen (la segunda es
   donde se guardan las muestras; si falta, la corrida sigue pero sin generar los archivos).

2. **Importar** `workflows/impulso-web-v8.json` en n8n (Workflows → Import from File).

3. **Configurar el nodo Config**:
   - `placesApiKey`: ver [docs/google-places-setup.md](docs/google-places-setup.md).
   - `geminiApiKey`: tu key de Google AI Studio.
   - `nombreVendedor`: tu nombre, con el que se firman todos los mensajes.
   - `ofertaDetalle`: la oferta en tus palabras (precio, promo, qué incluye); el prompt de
     ventas la usa tal cual, así que si cambiás el precio lo cambiás acá y listo.
   - `zonas`: array JSON de textos de búsqueda, ej. `["Córdoba Capital, Córdoba, Argentina", "Villa Allende, Córdoba, Argentina"]`.
   - `rubros`: array JSON `[{"rubro":"peluquería","prioritario":true}, ...]`.
   - `maxLeads`, `diasMinimos`, rutas de archivos.
   - Si cambiás `rutaBase`, cambiala también en los nodos **Config estado** y **Config leads**.

4. **Activar el workflow** (toggle "Active"). Sin esto los webhooks del panel no existen
   (`/webhook/...` solo responde con el workflow activo; `/webhook-test/...` es solo para
   la ejecución de prueba).

5. **Primera corrida**: botón "Execute workflow". Abrí `C:\ImpulsoWeb\dashboard.html`.

> ngrok ya no es necesario para nada de esto: el panel habla con n8n por `localhost:5678`.
> Seguí usándolo solo si tenés webhooks de WhatsApp entrantes.

---

## El panel

- **Stats** del pipeline completo + **tasa de respuesta** global y por rubro.
- Filtros por estado, rubro, texto libre, "solo celulares"; orden por score o fecha.
- **WhatsApp**: abre `wa.me` con el mensaje ya cargado y **auto-marca el lead como
  "Enviado"** si estaba en "Nuevo".
- Selector de estado por lead → se persiste en la base vía webhook (con cola offline si
  n8n está apagado: el indicador arriba a la izquierda te dice si estás sincronizado).
- Export CSV (separado por `;`, listo para Excel en español).

## Operación diaria sugerida

1. A la mañana: correr el workflow (o dejar el cron activado).
2. Abrir el panel, filtrar "Nuevos" + "solo celulares", ordenar por score.
3. Mandar mensajes **a mano, espaciados** (2–5 min entre cada uno), máximo **20–40 por día**
   con un número ya "calentado" (menos si el chip es nuevo). Sin links en el primer mensaje
   (los mensajes ya vienen así). Esto es lo que mantiene vivo el número.
4. A los 3 días, filtrar "Enviado", pasar a "Sin respuesta" y mandar el follow-up (botón
   "Copiar follow-up").
5. Cuando alguien responde: marcar "Respondió" → armar la demo → "Demo enviada" → "Cerrado".
6. Cada tanto, mirar **Analytics por rubro** y ajustar los `rubros` prioritarios del Config
   hacia donde está la tasa de respuesta real.

## Costos de Google Places

- Text Search pidiendo teléfono + web factura en el SKU más caro de Text Search
  ("Enterprise"). Desde marzo 2025 Google Maps Platform da un **free tier mensual por SKU**
  (para los SKU Enterprise son ~1.000 llamadas gratis/mes — verificá el número vigente en la
  consola), además de los **US$300 de crédito** inicial por 90 días.
- Con la config por defecto (5 rubros × 1 zona × 2 páginas = **10 requests por corrida**,
  ~300/mes con cron diario) entrás cómodo en el free tier.
- Igual protegete: en la consola poné **límite de cuota diaria** (ej. 100 requests/día) y una
  **alerta de presupuesto** de US$5. Detalle en [docs/google-places-setup.md](docs/google-places-setup.md).

## Roadmap (etapa 2, no bloqueante)

- Migrar la base JSON a SQLite o Google Sheets (CRM multi-dispositivo con pipeline visual).
- Registrar variante de mensaje por lead para A/B testing real de copys.
- Enriquecimiento: scraping controlado del perfil de Instagram detectado (seguidores,
  última actividad) para personalizar mejor.
- Dominios `.com.ar` propios para las demos que cierran (hoy Netlify).
