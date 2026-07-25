# 1. Instalación del servidor (L2J Mobius)

Guía para dejar corriendo tu propio servidor de Lineage 2 en tu PC (Windows o Linux).

## Requisitos

- **Java 21 (JDK)** — [Adoptium Temurin](https://adoptium.net/)
- **Git**
- **MariaDB 10.6+** (o MySQL 8) — para cuentas, personajes e inventarios
- **Ant** (para compilar) o un IDE como IntelliJ/Eclipse
- 4 GB de RAM libres como mínimo

## Paso 1 — Descargar el servidor

En tu PC, corré el script incluido:

```bash
cd lineage2/tools
chmod +x descargar-l2j.sh
./descargar-l2j.sh
```

Esto clona **L2J Mobius**, el emulador open source más mantenido. Adentro vas a ver una carpeta por crónica (`L2J_Mobius_C6_Interlude`, `L2J_Mobius_Classic_3.0_TheKamael`, etc.). **Este mod está escrito para la rama Interlude**, que es la más popular para servidores con contenido custom, pero el formato es casi idéntico en todas las ramas modernas de Mobius.

## Paso 2 — Compilar

```bash
cd ~/l2j-mobius/L2J_Mobius_C6_Interlude
ant
```

El resultado queda en `build/`: dos servidores, **LoginServer** (autenticación) y **GameServer** (el juego).

## Paso 3 — Base de datos

```sql
CREATE DATABASE l2jmobius DEFAULT CHARACTER SET utf8mb4;
CREATE USER 'l2j'@'localhost' IDENTIFIED BY 'tu_password';
GRANT ALL PRIVILEGES ON l2jmobius.* TO 'l2j'@'localhost';
```

Después importá los esquemas: en `dist/db_installer/` hay un instalador gráfico (`Database_Installer_GS.jar` y `Database_Installer_LS.jar`), o importá a mano los `.sql` de la carpeta `sql/`.

## Paso 4 — Configuración

Editá en `dist/game/config/`:

- `Server.ini` → IP y puerto del GameServer, datos de la base (`URL`, `Login`, `Password`).
- `LoginServer.ini` → lo mismo para el login.
- Para jugar en red local dejá `127.0.0.1`; para que entren amigos de afuera, poné tu IP pública y abrí los puertos **2106** (login) y **7777** (game).

Creá tu cuenta de GM desde la consola del LoginServer o insertando en la tabla `accounts`, y subí el nivel de acceso en la tabla `characters` (`accesslevel = 100`).

## Paso 5 — Arrancar

```bash
cd dist/login && ./LoginServer.sh    # o .bat en Windows
cd dist/game  && ./GameServer.sh
```

Cuando el GameServer diga `Server loaded in X seconds`, ya podés conectarte con el cliente (ver `03-cliente-y-dats.md` para apuntar el cliente a tu IP con el archivo `l2.ini` / hosts).

## Paso 6 — Instalar este mod

Seguí `02-instalacion-mod.md`: es copiar los XML y las quests de `datapack/` dentro del servidor y registrarlas.
