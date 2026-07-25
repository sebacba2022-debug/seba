# 4. Gráficos: máxima nitidez y mejor estética

Lineage 2 (Interlude) corre sobre Unreal Engine 2.5 (2004). Se puede mejorar muchísimo con tres capas, de la más simple a la más avanzada. Todo esto es **del lado del cliente**: armá un ZIP-parche con estos cambios y repartilo a tus jugadores.

## Capa 1 — Configuración del motor (`user.ini` / `L2.ini`)

Aplicá `client-mods/graficos-hd/user-ini-hd.txt`: sube resolución de texturas, distancia de visión y elimina la niebla agresiva. Es el mayor salto de calidad gratis.

Dentro del juego, además: **Opciones → Video**: todo al máximo, y en Audio desactivá "optimizar rendimiento".

## Capa 2 — ReShade (el salto grande de nitidez)

[ReShade](https://reshade.me) es un inyector de post-procesado estándar y seguro, muy usado en L2:

1. Descargá ReShade, instalalo sobre `system/l2.exe`, API **Direct3D 9**.
2. Copiá `client-mods/graficos-hd/Lineage2-HD.ini` a la carpeta `system/`.
3. En el juego abrí ReShade (tecla `Inicio`) y elegí el preset **Lineage2-HD**.

El preset activa: **LumaSharpen** (nitidez real), **Clarity** (micro-contraste), **FakeHDR** + **Vibrance** (color moderno sin quemar la paleta), **SMAA** (bordes suaves sin blur).

> Nota: en Interlude viejo puede convenir el wrapper **dgVoodoo2** o el parche de la comunidad para DX9 estable antes de ReShade si el cliente crashea.

## Capa 3 — Packs de texturas HD y shaders (avanzado)

- La comunidad mantiene **parches HD para Interlude** (texturas de terreno/armaduras re-escaladas, agua nueva, cielos nuevos). Buscá "Interlude HD textures" en los foros de L2J Mobius / maxcheaters: se instalan pisando `.utx` en la carpeta `textures/`.
- Alternativa de máxima calidad: usar un **cliente de una crónica moderna** (Classic/Essence tienen assets rehechos) con la rama de Mobius correspondiente — este mod es portable, solo cambian pequeños detalles de formato XML.
- Para íconos y una interfaz más limpia: packs de **interface.xdat** modernizados (fuente más nítida, ventanas re-dibujadas).

## Receta recomendada (mejor resultado / esfuerzo)

1. `user.ini` HD (capa 1) ✔ obligatorio
2. ReShade con nuestro preset (capa 2) ✔ obligatorio — acá está "la nitidez"
3. Pack de texturas HD de la comunidad (capa 3) ✔ si tus jugadores aceptan un parche de ~1 GB
