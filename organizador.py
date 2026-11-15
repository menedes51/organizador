# -*- coding: utf-8 -*-
"""
Organizador — app de secretária (PC)
====================================

Abre o Organizador numa janela própria, sem browser e sem servidor.
As tarefas ficam guardadas em  dados.json  nesta pasta.

Como abrir:
  • Duplo clique em  Organizador.app
  • ou, no terminal:  .venv/bin/python organizador.py
"""

import json
import os
import sys

import webview

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(ROOT, "dados.json")
ICON = os.path.join(ROOT, "Organizador.app", "Contents", "Resources", "AppIcon.icns")


class Api:
    """Funções que a interface (app.js) chama para ler e guardar dados."""

    def load(self):
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return f.read()
        return None

    def save(self, text):
        json.loads(text)  # só grava se for JSON válido
        tmp = DATA_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(text)
        os.replace(tmp, DATA_FILE)
        return True

    def notify(self, title, body):
        """Notificação do macOS (lembretes)."""
        if sys.platform == "darwin":
            import subprocess
            subprocess.run(["osascript", "-e", "on run argv",
                            "-e", "display notification (item 2 of argv) with title \"Organizador\" subtitle (item 1 of argv) sound name \"Glass\"",
                            "-e", "end run", str(title), str(body)], check=False)
        return True

    def export_file(self, text):
        path = webview.windows[0].create_file_dialog(
            webview.SAVE_DIALOG, save_filename="organizador-copia.json")
        if not path:
            return False
        if isinstance(path, (list, tuple)):
            path = path[0]
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        return True

    def import_file(self):
        paths = webview.windows[0].create_file_dialog(
            webview.OPEN_DIALOG, file_types=("Cópia do Organizador (*.json)",))
        if not paths:
            return None
        with open(paths[0], "r", encoding="utf-8") as f:
            return f.read()


def _mac_branding():
    """Nome e ícone 'Organizador' na Dock e na barra de menus (em vez de 'Python')."""
    if sys.platform != "darwin":
        return
    try:
        from Foundation import NSBundle
        from AppKit import NSApplication, NSImage
        info = NSBundle.mainBundle().infoDictionary()
        info["CFBundleName"] = "Organizador"
        if os.path.exists(ICON):
            NSApplication.sharedApplication().setApplicationIconImage_(
                NSImage.alloc().initWithContentsOfFile_(ICON))
    except Exception:
        pass


def main():
    os.chdir(ROOT)
    _mac_branding()
    webview.create_window(
        "Organizador", os.path.join(ROOT, "static", "index.html"), js_api=Api(),
        width=1240, height=820, min_size=(380, 560),
        background_color="#111113",
    )
    # Porta fixa + armazenamento persistente: o tema, a cor e as preferências
    # ficam guardados entre aberturas (as tarefas continuam em dados.json).
    webview.start(http_server=True, http_port=42817, private_mode=False,
                  storage_path=os.path.join(ROOT, ".webdata"))


if __name__ == "__main__":
    main()
