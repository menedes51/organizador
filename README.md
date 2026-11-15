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
