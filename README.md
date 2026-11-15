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
| `esp32/` | Servidor de contas (beta) — o mesmo código serve **ESP8266** (testado numa ideaspark) e ESP32 — + guia em PDF (`Guia_Servidor.pdf`). |
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

## Servidor (ESP8266 / ESP32)

Ver `esp32/Guia_Servidor.pdf` (passo a passo, para ESP8266 e ESP32). Antes de carregar, põe o nome e a palavra-passe do Wi-Fi em
`esp32/organizador_servidor/config.h` — **mas não envies esse ficheiro alterado para o GitHub.**
Para o Git deixar de ver as alterações a esse ficheiro neste computador:

```bash
git update-index --skip-worktree esp32/organizador_servidor/config.h
```

A placa usada é a **ESP8266 ideaspark com ecrã OLED** (CH340, USB-C). No Arduino escolhe a placa
"NodeMCU 1.0 (ESP-12E Module)" (`esp8266:esp8266:nodemcuv2`, core esp8266 3.1.2).
A rede Wi-Fi tem de ser de **2,4 GHz**: a placa não liga a redes só de 5 GHz.

Bibliotecas (Arduino → Library Manager):

| Biblioteca | Autor | Versão testada | Para quê |
|---|---|---|---|
| ESP Async WebServer | ESP32Async | 3.12.1 | servidor web |
| ESP Async TCP | ESP32Async | 2.0.0 | rede (não uses a antiga "ESPAsyncTCP" 1.2.4) |
| ArduinoJson | Benoit Blanchon | 7.4.3 | JSON |
| U8g2 | oliver | 2.36.19 | ecrã OLED (novo na 0.3-beta) |

**Ecrã OLED** (`esp32/organizador_servidor/ecra.h`): SSD1306 de 128×64 por I2C, na ideaspark com
**SDA = GPIO12 (D6)** e **SCL = GPIO14 (D5)**, endereço 0x3C. O servidor encontra-o sozinho.
Se não houver ecrã, funciona na mesma. Para o desligar, põe `#define OLED_ENABLED 0` no `config.h`.

O mesmo código também compila para ESP32 (placa "DOIT ESP32 DEVKIT V1", com "Async TCP" do
ESP32Async em vez de "ESP Async TCP"), mas o projeto usa a ESP8266.

Compilar e enviar com o `arduino-cli` (no Windows usa uma pasta de compilação curta,
senão o *linker* falha com `CreateProcess: No such file or directory`):

```bash
arduino-cli compile --fqbn esp8266:esp8266:nodemcuv2 --build-path C:\esp8266build esp32/organizador_servidor
arduino-cli upload -p COM4 --fqbn esp8266:esp8266:nodemcuv2 --input-dir C:\esp8266build esp32/organizador_servidor
```
