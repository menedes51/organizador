#!/bin/bash
# ---------------------------------------------------------------------------
# Envia o projeto para o GitHub. O site (pasta static/) é publicado
# automaticamente em https://<a-tua-conta>.github.io/organizador/
#
# Uso (no Terminal, nesta pasta):   ./publicar.sh "o que mudou"
#
# Segurança — só é enviado o que está na lista PUBLICO, e antes de enviar:
#   1. nada do que está em .privado pode estar no envio;
#   2. nenhum ficheiro pode parecer uma cópia das tuas tarefas;
#   3. o config.h do servidor (ESP8266) não pode ter a tua palavra-passe do Wi-Fi.
# Ficheiros novos que não estejam em nenhuma das listas NÃO são enviados.
# ---------------------------------------------------------------------------
set -e
export PATH="$HOME/.local/bin:$PATH"
cd "$(dirname "$0")"

# O que é público (acrescenta aqui pastas/ficheiros novos do projeto)
PUBLICO=(static tests esp8266 organizador.py Organizador.app CHANGELOG.md README.md
         publicar.sh qrcode-organizador.png .gitignore .privado .github)

parar() { git reset -q; echo; echo "NADA FOI ENVIADO. $1"; exit 1; }

# O .gitignore é gerado a partir do .privado (uma só lista para manter)
{ echo "# Gerado por publicar.sh a partir de .privado — edita o .privado."; grep -v '^\s*#' .privado | grep -v '^\s*$'; } > .gitignore

git reset -q
for item in "${PUBLICO[@]}"; do
  [ -e "$item" ] && git add -A -- "$item"
done

# 1. Nada privado no envio (nem ficheiros privados que já estivessem no repositório)
PRIV="$(git ls-files -ci --exclude-from=.privado)"
[ -n "$PRIV" ] && parar "Estes ficheiros são privados (.privado):
$PRIV"

# 2. Nenhum ficheiro com cara de cópia das tarefas
for f in $(git diff --cached --name-only --diff-filter=AM | grep -E '\.json$' || true); do
  if grep -qE '"tasks"[[:space:]]*:[[:space:]]*\[' "$f" 2>/dev/null; then
    parar "O ficheiro $f parece conter tarefas. Se for privado, acrescenta-o ao .privado."
  fi
done

# 3. Palavra-passe do Wi-Fi do servidor (ESP8266)
CFG=esp8266/organizador_servidor/config.h
if [ -f "$CFG" ] && ! grep -q 'WIFI_PASSWORD "PALAVRA_PASSE_DA_REDE"' "$CFG"; then
  parar "O $CFG tem a tua palavra-passe do Wi-Fi. Repõe os valores de exemplo."
fi

# Aviso: ficheiros novos que não estão em nenhuma lista
NOVOS="$(git ls-files --others --exclude-standard)"
if [ -n "$NOVOS" ]; then
  echo "Ficheiros novos NÃO enviados (não estão na lista pública nem na privada):"
  echo "$NOVOS" | sed 's/^/  - /'
  echo "  Para publicar: acrescenta-os a PUBLICO neste script. Se forem privados: ao .privado."
  echo
fi

if git diff --cached --quiet; then
  echo "Nada de novo para publicar."
  exit 0
fi
git commit -q -m "${1:-Atualizar app ($(date '+%Y-%m-%d %H:%M'))}"
git push -q
LOGIN="$(gh api user --jq .login)"
echo "Publicado. O site atualiza em 1-2 minutos: https://$LOGIN.github.io/organizador/"
