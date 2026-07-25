#!/usr/bin/env bash
# Descarga el emulador de servidor L2J Mobius (open source) en tu PC.
# Requisitos: git, Java 21 (JDK), MariaDB 10.6+ o MySQL 8.
#
# Uso:
#   ./descargar-l2j.sh [carpeta-destino]
#
# Nota: el CLIENTE de Lineage 2 (el juego en sí) NO se descarga con este
# script porque es propietario de NCSoft. Bajalo de un mirror del cliente
# oficial de la crónica que uses (para este mod: Interlude o cualquier
# rama de Mobius) y aplicale los parches de ../client-mods/.

set -euo pipefail

DEST="${1:-$HOME/l2j-mobius}"

echo "==> Clonando L2J Mobius en: $DEST"
echo "    (el repo es grande, puede tardar varios minutos)"

# Repositorio oficial de L2J Mobius (incluye todas las crónicas: Interlude,
# High Five, Classic, Essence, etc. — cada una en su subcarpeta).
git clone --depth 1 https://bitbucket.org/MobiusDevelopment/l2jmobius.git "$DEST" || {
    echo "Si Bitbucket falla, alternativa clásica (L2J original, High Five):"
    echo "  git clone https://github.com/L2J/L2J_Server.git"
    echo "  git clone https://github.com/L2J/L2J_DataPack.git"
    exit 1
}

echo
echo "==> Listo. Próximos pasos (detallados en docs/01-instalacion-servidor.md):"
echo "  1. Elegí la crónica, p. ej.: $DEST/L2J_Mobius_C6_Interlude"
echo "  2. Compilá con:  ant   (o el build.xml del IDE)"
echo "  3. Creá la base de datos e importá los .sql de la carpeta sql/"
echo "  4. Configurá cuenta/IP en config/ y arrancá LoginServer + GameServer"
echo "  5. Instalá este mod siguiendo docs/02-instalacion-mod.md"
