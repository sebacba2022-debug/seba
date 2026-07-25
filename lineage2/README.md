# Proyecto Lineage 2 — Servidor propio con contenido nuevo

Mod completo para montar tu propio servidor de Lineage 2 con:

- **Una clase nueva creada desde cero**: el **Cronomante** (mago del tiempo).
- **10 poderes (skills) nuevos** con su árbol de aprendizaje.
- **3 misiones (quests) nuevas**, incluida la quest de cambio de clase.
- **NPCs nuevos** que dan las misiones y enseñan la clase.
- **Parches de cliente** (textos/íconos) y **guía de gráficos HD** para que el juego se vea mucho más nítido.

## Cómo funciona Lineage 2 "privado" (lo esencial)

Lineage 2 tiene dos mitades:

| Parte | Qué es | De dónde sale |
|---|---|---|
| **Servidor** | La lógica del juego: clases, skills, quests, NPCs, drops | **L2J / L2J Mobius**, emulador open source en Java. Es donde vive casi todo este mod. |
| **Cliente** | El juego que instala cada jugador (gráficos, sonido) | El cliente oficial de NCSoft. **No se puede redistribuir** (es software propietario), cada uno lo descarga por su cuenta. Se le aplican parches de archivos `.dat` y mejoras gráficas. |

> ⚠️ **Importante (legal):** los archivos del cliente son propiedad de NCSoft y no pueden subirse a este repositorio. Este proyecto solo contiene código y datos propios, compatibles con el emulador open source L2J. Montar un servidor privado con fines comerciales puede violar los términos de NCSoft; usalo para aprendizaje y juego entre amigos.

## Estructura del proyecto

```
lineage2/
├── docs/
│   ├── 01-instalacion-servidor.md    # Descargar y compilar L2J Mobius, base de datos, arranque
│   ├── 02-instalacion-mod.md         # Cómo instalar ESTA clase, skills y quests en el servidor
│   ├── 03-cliente-y-dats.md          # Parches del cliente: nombres, íconos, textos de quest
│   └── 04-graficos-hd.md             # Nitidez y estética: resolución, texturas, ReShade
├── tools/
│   └── descargar-l2j.sh              # Script para clonar el servidor L2J Mobius en tu PC
├── datapack/                         # Contenido del servidor (formato L2J Mobius)
│   ├── stats/chars/baseStats/190.xml # Stats base de la clase Cronomante (id 190)
│   ├── stats/skills/50000-50009.xml  # Los 10 skills nuevos
│   ├── skillTrees/cronomante.xml     # Qué skill se aprende a qué nivel y su costo en SP
│   ├── npcs/50000-50002.xml          # NPCs: maestro de clase, herrero temporal, espectro
│   └── quests/                       # Las 3 quests (Java, API de L2J Mobius)
└── client-mods/
    ├── dat-patches/                  # CSV para importar a los .dat del cliente (nombres/íconos)
    └── graficos-hd/                  # user.ini optimizado + preset de ReShade
```

## La clase nueva: Cronomante

Maga del tiempo, orientada a control de masas y burst mágico. Cambio de clase a nivel 40 mediante la quest **"El Relicario de las Eras"** con el NPC **Kael, Guardián del Tiempo**.

| # | Skill | Tipo | Efecto |
|---|---|---|---|
| 50000 | Distorsión Temporal | Ataque | Nuke mágico de daño alto, single target |
| 50001 | Acelerar | Buff | +velocidad de ataque y casteo para el grupo |
| 50002 | Ralentizar | Debuff | Reduce velocidad del enemigo |
| 50003 | Paradoja | Control | Stun en área |
| 50004 | Rebobinar | Curación | Restaura una gran cantidad de HP |
| 50005 | Salto Temporal | Movilidad | Teletransporte corto instantáneo |
| 50006 | Bucle Infinito | DoT | Daño mágico sostenido en el tiempo |
| 50007 | Escudo de Eras | Defensa | Escudo que absorbe daño |
| 50008 | Detener el Tiempo | Control | Root masivo en área (ultimate de control) |
| 50009 | Era del Caos | Ataque | Nuke masivo en área (ultimate de daño) |

## Las misiones nuevas

1. **Q50001 — El Relicario de las Eras** (nivel 40+): la quest de cambio de clase. Kael te envía a recuperar 3 fragmentos del relicario que custodian los Espectros de las Eras; al completarla te convertís en Cronomante y recibís tus primeros skills.
2. **Q50002 — Ecos del Pasado** (nivel 45+, repetible): cazar criaturas corrompidas por anomalías temporales a cambio de adena y cristales.
3. **Q50003 — Las Arenas del Tiempo** (nivel 50+): juntar 30 Arenas del Tiempo para que el herrero Doran forje un arma encantada.

## Ruta rápida

1. Leé `docs/01-instalacion-servidor.md` y corré `tools/descargar-l2j.sh` **en tu PC** (necesita Java 21, Git y MariaDB).
2. Instalá el mod siguiendo `docs/02-instalacion-mod.md` (copiar los XML/Java del `datapack/` al servidor).
3. Parchá tu cliente con `docs/03-cliente-y-dats.md` para ver nombres, íconos y textos.
4. Aplicá `docs/04-graficos-hd.md` para la mejora visual (nitidez, distancia de visión, ReShade).
