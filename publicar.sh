#!/bin/bash
# ---------------------------------------------------------------------------
# Envia o projeto para o GitHub. O site (pasta static/) é publicado
# automaticamente em https://<a-tua-conta>.github.io/organizador/
#
# Uso (no Terminal, nesta pasta):   ./publicar.sh "o que mudou"
# As tuas tarefas (dados.json) nunca são enviadas (estão no .gitignore).
# ---------------------------------------------------------------------------
set -e
export PATH="$HOME/.local/bin:$PATH"
cd "$(dirname "$0")"

# Segurança: não enviar a palavra-passe do Wi-Fi do ESP32
if ! grep -q 'WIFI_PASSWORD "PALAVRA_PASSE_DA_REDE"' esp32/organizador_servidor/config.h; then
  echo "ATENÇÃO: esp32/organizador_servidor/config.h tem a tua palavra-passe do Wi-Fi."
  echo "Repõe os valores de exemplo antes de publicar. Nada foi enviado."
  exit 1
fi

git add -A
if git diff --cached --quiet; then
  echo "Nada de novo para publicar."
  exit 0
fi
git commit -q -m "${1:-Atualizar app ($(date '+%Y-%m-%d %H:%M'))}"
git push -q
LOGIN="$(gh api user --jq .login)"
echo "Publicado. O site atualiza em 1-2 minutos: https://$LOGIN.github.io/organizador/"
