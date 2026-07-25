# 2. Instalación del mod (clase, skills, quests) en el servidor

Con el servidor L2J Mobius ya compilado y andando (`01-instalacion-servidor.md`), instalar este mod es copiar archivos y registrar las quests.

En lo que sigue, `SERVIDOR` = tu carpeta `dist/game/` del GameServer.

## Paso 1 — Copiar los datos

| Desde (este repo) | Hacia (servidor) |
|---|---|
| `datapack/stats/chars/baseStats/190.xml` | `SERVIDOR/data/stats/chars/baseStats/` |
| `datapack/stats/skills/50000-50009.xml` | `SERVIDOR/data/stats/skills/` |
| `datapack/stats/items/57000-57002.xml` | `SERVIDOR/data/stats/items/custom/` |
| `datapack/skillTrees/cronomante.xml` | `SERVIDOR/data/skillTrees/` |
| `datapack/npcs/50000-50002.xml` | `SERVIDOR/data/stats/npcs/custom/` |
| `datapack/quests/Q5000*` (las 3 carpetas) | `SERVIDOR/data/scripts/quests/custom/` |

> Según la rama de Mobius que uses, los nombres exactos de carpeta pueden variar un poco (`data/stats/npcs` vs `data/npcs`). Guiate por dónde están los archivos equivalentes del propio servidor.

## Paso 2 — Registrar la clase

En Mobius las clases se enumeran en el enum `ClassId`/`PlayerClass` del núcleo (`org.l2jmobius.gameserver.enums.ClassId` o similar según rama). Agregá la entrada:

```java
CRONOMANTE(190, true, Race.HUMAN, ClassId.SORCERER, ClassLevel.THIRD),
```

(usa como padre a Sorcerer/Hechicera; ajustá la sintaxis al enum de tu rama) y recompilá con `ant`.

## Paso 3 — Registrar las quests

Buscá el archivo que lista los scripts de quests (según rama: `QuestMasterHandler.java` en `data/scripts/quests/`, o `scripts.cfg`). Agregá:

```java
Q50001_ElRelicarioDeLasEras.class,
Q50002_EcosDelPasado.class,
Q50003_LasArenasDelTiempo.class,
```

con sus imports `quests.custom.…`.

## Paso 4 — Spawnear los NPCs

Con tu personaje GM dentro del juego, parate donde quieras a cada NPC y usá:

```
//spawn 50000   → Kael, Guardián del Tiempo (sugerido: Giran, plaza central)
//spawn 50001   → Doran, Herrero de las Eras (sugerido: al lado de Kael)
//spawn 50002   → Espectro de las Eras (sugerido: ruinas cercanas, varios)
```

Para que queden fijos, agregalos a `data/spawns/custom.xml` (o guardá el spawn con `//spawn … save` si tu rama lo soporta). Los Espectros conviene spawnearlos en grupo (10-15) en una zona de caza de nivel 45-55.

## Paso 5 — Probar

1. Reiniciá el GameServer.
2. Verificá en el log del arranque que cargue: la clase (`PlayerClassData`), los 10 skills, los 3 items, el árbol (`SkillTreeData`), los NPC y las 3 quests, **sin errores**.
3. Con un personaje mago nivel 40+, hablá con Kael → quest **El Relicario de las Eras** → matá 3 Espectros → volvé → cambio de clase a **Cronomante**.
4. Abrí el libro de skills y aprendé **Distorsión Temporal**, **Acelerar** y **Ralentizar**.
5. Comandos GM útiles: `//setclass 190`, `//skill_add 50000 1`, `//quest_reload 50001`.

## Paso 6 — Cliente

Sin parchar el cliente, la clase y los skills **funcionan** pero se ven como `NotDefined` o sin nombre. Seguí `03-cliente-y-dats.md` para que aparezcan los nombres, descripciones e íconos correctos.
