# Organizador

App de tarefas, calendário, horário das aulas, disciplinas, notas e trabalhos de grupo, para **PC e telemóvel**.

**Abrir / instalar:** https://menedes51.github.io/organizador/
(no Android: Chrome → ⋮ → *Instalar app*; no iPhone: Safari → Partilhar → *Adicionar ao ecrã principal*)

Cada dispositivo guarda as suas tarefas localmente. Para passar tarefas entre dispositivos usa **Mais → Exportar / Importar cópia**.

## Estrutura

| Pasta / ficheiro | O que é |
|---|---|
| `static/` | A app (HTML, CSS e JavaScript em `static/js/01…07`). É publicada automaticamente no GitHub Pages. |
| `tests/` | Testes automáticos da lógica. Abre `tests/index.html` através de um servidor local (ver abaixo). |
| `organizador.py` | App de secretária (janela própria, via [pywebview](https://pywebview.flowrl.com/)). Guarda as tarefas em `dados.json` (não vai para o GitHub). |
| `Organizador.app` | Atalho para abrir a app de secretária no Mac (duplo clique). |
| `esp32/` | Servidor de contas (beta) para ESP32 + guia em PDF (`Guia_Servidor_ESP32.pdf`). |
| `CHANGELOG.md` | Registo de todas as alterações. |
| `publicar.sh` | Envia as alterações para o GitHub (o site atualiza-se sozinho). Só envia a lista pública e verifica o `.privado`. |
| `.privado` | Lista do que **nunca** vai para o GitHub (tarefas, cópias de segurança, preferências). |
| `qrcode-organizador.png` | QR code para instalar a app. |

## App de secretária (Mac)

```bash
python3 -m venv .venv
.venv/bin/pip install pywebview
.venv/bin/python organizador.py
```

## Testes

```bash
python3 -m http.server 8767
```

Depois abre http://localhost:8767/tests/ — deve dizer “36 de 36 passaram”. Os testes usam um armazenamento separado e não mexem nas tuas tarefas.

## Cópias de segurança

A app faz uma cópia automática por dia (guarda as últimas 7). No telemóvel ficam dentro da app; no PC, na pasta `backups/` (privada). Restaura em **Mais → Cópias de segurança**.

## Publicar alterações

```bash
./publicar.sh "Descrição da alteração"
```

## Servidor ESP32

Ver `esp32/Guia_Servidor_ESP32.pdf`. Antes de carregar, põe o nome e a palavra-passe do Wi-Fi em
`esp32/organizador_servidor/config.h` — **mas não envies esse ficheiro alterado para o GitHub.**
