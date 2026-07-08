# Google Places API — guía de configuración

Objetivo: conseguir la API key que va en el nodo **Config** del workflow, con costos bajo
control. Tiempo estimado: 20–30 minutos.

## 1. Cuenta de Google Cloud con billing

1. Entrá a <https://console.cloud.google.com> con tu cuenta de Google.
2. Creá un proyecto (ej. `impulso-web`).
3. Activá la facturación (Billing). Google regala **US$300 de crédito por 90 días** al
   activarla, y las APIs de Maps tienen además un free tier mensual propio.

### Si el banco rechaza la tarjeta

Google cobra en USD como comercio del exterior. Opciones, de más fácil a menos:

- **Habilitar "compras en el exterior"** desde el home banking o la app del banco (la
  mayoría de los bancos argentinos lo tienen como un toggle; a veces hay que llamar).
- Usar una **tarjeta prepaga internacional** (varias fintech argentinas emiten Visa/Mastercard
  prepagas que pasan la verificación de Google).
- Tarjeta de débito internacional de una cuenta en USD, o la tarjeta de un familiar.

Tené en cuenta que a los cargos en USD se les suman los impuestos argentinos vigentes al
momento del cobro. Con el uso de este workflow, el gasto esperable es **$0** (entra en el
free tier) — la tarjeta es solo para la verificación.

## 2. Habilitar la API y crear la key

1. En la consola: **APIs & Services → Library** → buscá **"Places API (New)"** → Enable.
   (Ojo: es la "(New)". La "Places API" vieja es otro producto.)
2. **APIs & Services → Credentials → Create credentials → API key**.
3. Restringí la key (Edit API key):
   - **API restrictions** → Restrict key → tildá solo **Places API (New)**.
   - Application restrictions: dejalo en None (la llamada sale desde n8n en tu PC, sin IP fija).
4. Copiá la key en el campo `placesApiKey` del nodo **Config** del workflow.

## 3. Control de gastos (hacelo antes de la primera corrida)

1. **Cuota diaria**: APIs & Services → Places API (New) → Quotas → limitá los requests por
   día a algo generoso pero finito (ej. 100/día; el workflow usa ~10 por corrida).
2. **Alerta de presupuesto**: Billing → Budgets & alerts → creá un presupuesto de US$5 con
   alertas al 50% y 100%. No corta el servicio, pero te avisa por mail antes de que algo raro
   escale.
3. Verificá el free tier vigente en Billing → la tabla de precios de Places API (New): los
   SKU "Enterprise" (los que incluyen teléfono y web) traen un cupo mensual gratis (~1.000
   llamadas/mes a la fecha de escribir esto).

## 4. Probar la key

Desde PowerShell (reemplazá `TU_API_KEY`):

```powershell
curl.exe -X POST "https://places.googleapis.com/v1/places:searchText" `
  -H "Content-Type: application/json" `
  -H "X-Goog-Api-Key: TU_API_KEY" `
  -H "X-Goog-FieldMask: places.id,places.displayName,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.formattedAddress" `
  -d '{"textQuery":"peluquería en Córdoba Capital, Argentina","languageCode":"es","regionCode":"AR","pageSize":5}'
```

Si devuelve un JSON con `places`, está todo listo.

## 5. Cómo la usa el workflow

- Endpoint: `POST https://places.googleapis.com/v1/places:searchText`, una llamada por
  combinación **zona × rubro** del Config.
- **FieldMask**: pide solo `id, displayName, nationalPhoneNumber, internationalPhoneNumber,
  websiteUri, rating, userRatingCount, formattedAddress, googleMapsUri, nextPageToken`.
  No agregues campos que no uses: el SKU que te facturan depende de los campos pedidos.
- **Paginación**: el nodo HTTP repite la llamada con `pageToken` mientras venga
  `nextPageToken`, con tope de 2 páginas (40 resultados) por búsqueda. Si querés más pozo,
  subí `maxRequests` en las opciones de paginación del nodo "Buscar en Google Places".
- El dato de oro es `websiteUri`: **ausente = no tienen web = lead**. Si apunta a
  Instagram/Facebook/Linktree también cuenta como lead (con la red registrada para
  personalizar el mensaje).
- Los celulares llegan como `+54 9 ...` en `internationalPhoneNumber`: eso alimenta el
  badge celular/fijo y el score.

## Errores comunes

| Error | Causa probable |
|---|---|
| `403 PERMISSION_DENIED` | La API "(New)" no está habilitada en el proyecto, o la key está restringida a otra API |
| `400 INVALID_ARGUMENT` con mención al field mask | Typo en el header `X-Goog-FieldMask` |
| `REQUEST_DENIED` / pide billing | El proyecto no tiene billing activo |
| Respuestas vacías (`{}`) | Búsqueda sin resultados: probá un texto de zona más amplio o el rubro en otras palabras |
