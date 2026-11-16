#!/bin/bash
# ---------------------------------------------------------------------------
#  Organizador — instala (ou atualiza) o servidor numa Raspberry Pi
#
#  Uso, na Raspberry Pi (ver servidor/LEIA-ME.md):
#     sudo git clone https://github.com/menedes51/organizador.git /opt/organizador
#     sudo /opt/organizador/servidor/instalar.sh
#
#  O que faz:
#   • cria o utilizador de sistema "organizador" (o servidor não corre como root);
#   • guarda contas e dados em /var/lib/organizador (só esse utilizador lhes chega);
#   • cria o serviço "organizador": arranca sozinho quando a Pi liga e reinicia se falhar;
#   • cria uma cópia de segurança diária dos dados (guarda as últimas 14);
#   • serve a app em http://<nome-da-pi>.local (porta 80).
#  Correr outra vez é seguro: só atualiza o que for preciso e não toca nos dados.
# ---------------------------------------------------------------------------
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Corre com sudo:  sudo $0"; exit 1
fi

REPO="$(cd "$(dirname "$0")/.." && pwd)"
DADOS=/var/lib/organizador
COPIAS="$DADOS/copias"
PY="$(command -v python3 || true)"

[ -n "$PY" ] || { echo "Falta o python3 (sudo apt install -y python3)"; exit 1; }
"$PY" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)' \
  || { echo "É preciso Python 3.9 ou mais recente"; exit 1; }
[ -f "$REPO/servidor/organizador_servidor.py" ] || { echo "Não encontrei o servidor em $REPO"; exit 1; }

echo "→ Utilizador de sistema 'organizador'"
id organizador >/dev/null 2>&1 || useradd --system --home-dir "$DADOS" --shell /usr/sbin/nologin organizador

echo "→ Pasta dos dados: $DADOS"
install -d -o organizador -g organizador -m 700 "$DADOS" "$COPIAS"

echo "→ Serviço do servidor"
cat > /etc/systemd/system/organizador.service <<EOF
[Unit]
Description=Organizador — servidor de contas e sincronização
After=network-online.target
Wants=network-online.target

[Service]
User=organizador
Group=organizador
ExecStart=$PY $REPO/servidor/organizador_servidor.py --port 80 --dados $DADOS --app $REPO/static
Restart=always
RestartSec=3
# Pode usar a porta 80 sem ser root
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
# Proteções: só pode escrever na pasta dos dados
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=$DADOS

[Install]
WantedBy=multi-user.target
EOF

echo "→ Cópia de segurança diária"
cat > /etc/systemd/system/organizador-copia.service <<EOF
[Unit]
Description=Organizador — cópia de segurança dos dados

[Service]
Type=oneshot
User=organizador
# (no systemd, \$\$ = \$ e %% = %)
ExecStart=/bin/sh -c 'tar -czf $COPIAS/organizador-\$\$(date +%%F).tar.gz -C $DADOS contas.json sessoes.json dados 2>/dev/null || true; ls -1t $COPIAS/organizador-*.tar.gz | tail -n +15 | xargs -r rm -f'
EOF
cat > /etc/systemd/system/organizador-copia.timer <<EOF
[Unit]
Description=Organizador — cópia de segurança diária

[Timer]
OnCalendar=daily
Persistent=true
RandomizedDelaySec=30min

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now organizador-copia.timer >/dev/null
systemctl enable organizador.service >/dev/null
systemctl restart organizador.service
sleep 2

if curl -fsS -m 5 http://127.0.0.1/api/ping >/dev/null 2>&1; then
  NOME="$(hostname).local"
  IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
  echo
  echo "✓ Servidor a funcionar."
  echo "  Na app (Mais → Conta e sincronização), servidor:  $NOME"
  [ -n "$IP" ] && echo "  (ou pelo IP:  $IP)"
  echo "  A app também abre aqui:  http://$NOME"
else
  echo
  echo "✗ O servidor não respondeu. Vê o erro com:  sudo journalctl -u organizador -n 30"
  exit 1
fi
