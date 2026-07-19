# Portal de Reclamos + Consulta de compras

MVP de un portal de soporte para un negocio que vende entradas (o cualquier producto con órdenes).
Reutiliza la misma arquitectura que el sistema de prospección: webhooks de n8n + base JSON local.

> **IMPORTANTE — marca**: el portal lleva SIEMPRE el nombre y la marca del negocio que lo
> contrata. No debe usar el nombre, logo ni identidad de StubHub, Metallica ni ninguna
> empresa ajena sin autorización escrita. Tampoco debe pedir datos de tarjeta/pago para
> "verificar" una compra: la consulta se hace con nº de orden + email contra la base de
> ventas que el negocio provee. Así es un portal de soporte legítimo, no un phishing.

## Qué incluye

**Página pública** (`dist/portal-publico.html`) — 3 solapas:
- **Consultar mi compra**: nº de orden + email → estado de la orden (desde la tabla de ventas).
- **Hacer un reclamo**: formulario → crea un ticket y devuelve un código de seguimiento (R-AÑO-####).
- **Seguir mi reclamo**: código → estado + respuestas del negocio.

**Panel interno** (`dist/panel-reclamos.html`): lista de tickets con stats, filtros, prioridad
(marca urgentes automáticamente por palabras clave), cambio de estado y respuesta al cliente.

**Versiones demo** (`dist/demo-*.html`): autocontenidas con datos de ejemplo, para mostrarle
al cliente sin levantar n8n. Abrilas directo en el navegador.

## Cómo probar la demo ya

Abrí en el navegador:
- `dist/demo-portal-publico.html` → probá: orden `ORD-10231` + email `juan@mail.com`; o código `R-2026-0001`.
- `dist/demo-panel-reclamos.html` → gestión de reclamos con datos de ejemplo.

## Puesta en producción (n8n)

El flujo es idéntico en espíritu al del sistema de prospección: un workflow con webhooks que
leen/escriben `reclamos_db.json` y una tabla `ventas.json` (la que exporta el negocio).

Webhooks a crear:
| Endpoint | Método | Nodo Code | Qué hace |
|---|---|---|---|
| `/reclamo-crear` | POST | `nodes/crear-reclamo.js` | Crea el ticket, devuelve código |
| `/reclamo-consultar` | GET | `nodes/consultar.js` | Estado de orden o de reclamo |
| `/reclamos-listar` | GET | (lee `reclamos_db.json`) | Alimenta el panel |
| `/reclamo-actualizar` | POST | `nodes/actualizar-reclamo.js` | Cambia estado / responde |

Pasos:
1. Editá `MARCA` en `build.js` (nombre real del negocio, colores, WhatsApp, URLs de los webhooks) y corré `node portal-reclamos/build.js`.
2. Subí `portal-publico.html` a Netlify (con el botón del sistema, o drag & drop) → esa es la URL pública.
3. El `panel-reclamos.html` es de uso interno del negocio (no público).
4. La tabla de ventas (`ventas.json`) la carga el negocio: `[{ "orden": "...", "email": "...", "estado": "confirmada", "evento": "...", "cantidad": 2, "fecha": "...", "detalle": "..." }]`.

## Alcance y próximos pasos (para cotizar)

Esto es el MVP. Según lo que pida el cliente, pueden sumarse: login para clientes, envío de
emails automáticos al responder, exportación de reportes, roles de operadores, e integración
con la API real de ventas en vez de un archivo. Cada uno suma al presupuesto y al abono mensual.
