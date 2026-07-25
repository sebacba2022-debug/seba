# 3. Cliente: conexión al servidor y parches .dat

## Conseguir el cliente

El cliente de Lineage 2 es propiedad de NCSoft y **no se puede incluir en este repo**. Para la rama Interlude, descargá un cliente Interlude limpio desde algún mirror conocido de la comunidad L2 (los foros de L2J Mobius y de las comunidades de servidores privados mantienen enlaces vigentes). Suele pesar 2-4 GB.

## Apuntar el cliente a TU servidor

En la carpeta `system/` del cliente, el archivo **`l2.ini`** define a qué servidor se conecta:

```ini
[URL]
ServerAddr=127.0.0.1     ; tu IP (127.0.0.1 si jugás en la misma PC)
Port=2106
```

Muchos clientes tienen el `l2.ini` encriptado: usá **L2FileEdit** (herramienta estándar de la comunidad) para abrirlo, editarlo y volver a guardarlo con la encriptación correcta (`Ver 413` en Interlude).

## Por qué hay que parchar los .dat

El servidor manda ids (skill 50000, npc 50000, quest 50001…), pero los **nombres, descripciones e íconos** viven en el cliente, en archivos `.dat` dentro de `system/`. Como nuestros ids son nuevos, hay que agregarlos:

| Archivo del cliente | Qué agrega | Fuente en este repo |
|---|---|---|
| `skillname-e.dat` | Nombre y descripción de los 10 skills | `client-mods/dat-patches/skillname-e.csv` |
| `skillgrp.dat` | Ícono y animación de cada skill | usar como base la fila de un skill retail parecido (p. ej. copiar la fila del skill 1235 y cambiar el id a 50000) |
| `npcname-e.dat` | Nombres de Kael, Doran y el Espectro | `npcname-e.csv` |
| `npcgrp.dat` | Apariencia 3D de los NPC | copiar la fila de un modelo retail que te guste y cambiar el id |
| `questname-e.dat` | Título y texto de las 3 quests en el diario | `questname-e.csv` |
| `itemname-e.dat` | Nombres de los 3 items de quest | `itemname-e.csv` |
| `classinfo-e.dat` (o `charcreategrp` según crónica) | Nombre de la clase Cronomante | `classinfo-e.csv` |

## Cómo editar los .dat

1. Descargá **L2FileEdit** (o *L2 DAT Editor*) para tu crónica.
2. Abrí el `.dat` correspondiente → se decodifica a texto tabulado.
3. Pegá al final las filas de nuestros CSV (respetando el orden de columnas exacto de tu crónica: los CSV de este repo traen las columnas esenciales; si tu `.dat` tiene columnas extra, completalas copiando una fila retail parecida).
4. Guardá con encriptación `Ver 413`.
5. Repartí a tus jugadores un **parche**: un ZIP con la carpeta `system/` modificada para pisar la del cliente limpio. Así cualquiera con el cliente oficial + tu parche ve todo tu contenido.

## Apariencia de la clase y de los skills (nivel avanzado)

- **Modelo del personaje**: la forma más práctica es que el Cronomante use el modelo de la Hechicera humana (es su clase padre, el cliente lo resuelve solo). Cambiar el modelo requiere editar paquetes `.ukx`/`.utx` de Unreal Engine 2 con **UnrealEd/L2Tool**, ya es modding 3D avanzado.
- **Animaciones de skills**: en `skillgrp.dat`, cada fila referencia un efecto visual (`MagicSkillUse`). Asignando a nuestros ids los efectos de skills retail espectaculares (p. ej. los de Archmage/Soultaker) los poderes nuevos se ven premium sin tocar nada 3D.
