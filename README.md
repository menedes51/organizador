# Organizador

App de tarefas, calendário, horário das aulas, disciplinas, notas e trabalhos de grupo, para **PC e telemóvel**.

**Abrir / instalar:** https://menedes51.github.io/organizador/
(no Android: Chrome → ⋮ → *Instalar app*; no iPhone: Safari → Partilhar → *Adicionar ao ecrã principal*)

Cada dispositivo guarda as suas tarefas localmente. Para passar tarefas entre dispositivos usa **Mais → Exportar / Importar cópia**.

## Estrutura

| Pasta / ficheiro | O que é |
|---|---|
| `static/` | A app (HTML, CSS, JavaScript). É publicada automaticamente no GitHub Pages. |
| `organizador.py` | App de secretária (janela própria, via [pywebview](https://pywebview.flowrl.com/)). Guarda as tarefas em `dados.json` (não vai para o GitHub). |
| `Organizador.app` | Atalho para abrir a app de secretária no Mac (duplo clique). |
| `esp32/` | Servidor de contas (beta) para ESP32 + guia em PDF (`Guia_Servidor_ESP32.pdf`). |
| `CHANGELOG.md` | Registo de todas as alterações. |
| `publicar.sh` | Envia as alterações para o GitHub (o site atualiza-se sozinho). |
| `qrcode-organizador.png` | QR code para instalar a app. |

## App de secretária (Mac)

```bash
python3 -m venv .venv
.venv/bin/pip install pywebview
.venv/bin/python organizador.py
```

## Publicar alterações

```bash
./publicar.sh "Descrição da alteração"
```

## Servidor ESP32

Ver `esp32/Guia_Servidor_ESP32.pdf`. Antes de carregar, põe o nome e a palavra-passe do Wi-Fi em
`esp32/organizador_servidor/config.h` — **mas não envies esse ficheiro alterado para o GitHub.**
Para o Git deixar de ver as alterações a esse ficheiro neste computador:

```bash
git update-index --skip-worktree esp32/organizador_servidor/config.h
```

O mesmo código funciona em **ESP32** (placa "DOIT ESP32 DEVKIT V1") e em **ESP8266**
(placa "NodeMCU 1.0 (ESP-12E Module)", ex.: ideaspark com OLED). Na ESP8266 instala
"ESP Async TCP" em vez de "Async TCP". A rede Wi-Fi tem de ser de 2,4 GHz.

Compilar e enviar com o `arduino-cli` (no Windows usa uma pasta de compilação curta,
senão o *linker* falha com `CreateProcess: No such file or directory`):

```bash
arduino-cli compile --fqbn esp8266:esp8266:nodemcuv2 --build-path C:\esp8266build esp32/organizador_servidor
arduino-cli upload -p COM4 --fqbn esp8266:esp8266:nodemcuv2 --input-dir C:\esp8266build esp32/organizador_servidor
```
