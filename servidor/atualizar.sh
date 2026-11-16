#!/bin/bash
# Organizador — traz a versão mais recente do GitHub e reinicia o servidor.
# Uso, na Raspberry Pi:   sudo /opt/organizador/servidor/atualizar.sh
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "Corre com sudo:  sudo $0"; exit 1; }
REPO="$(cd "$(dirname "$0")/.." && pwd)"
git -C "$REPO" pull --ff-only
exec "$REPO/servidor/instalar.sh"
