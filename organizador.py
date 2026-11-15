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
import re
import socket
import sys

import webview

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(ROOT, "dados.json")
BACKUPS = os.path.join(ROOT, "backups")          # cópias de segurança automáticas
PID_FILE = os.path.join(ROOT, ".organizador.pid")
PORT = 42817
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

    def server_request(self, method, url, token="", body=""):
        """Plano B para os pedidos ao servidor de contas (ESP8266): a app tenta primeiro
        pela janela (fetch) e só usa isto se falhar. Nota: no Mac, o macOS pode bloquear
        o Python na rede local (Definições → Privacidade e segurança → Rede local).
        Devolve JSON: {"status": código HTTP, "body": texto} ou {"status": 0, "error": ...}."""
        import urllib.error
        import urllib.request
        method = str(method).upper()
        url = str(url)
        if method not in ("GET", "POST", "PUT") or not re.fullmatch(r"https?://[^\s/?#]+/api/[\w/]+", url):
            return json.dumps({"status": 0, "error": "pedido inválido"})
        data = str(body).encode("utf-8") if body else (b"" if method != "GET" else None)
        req = urllib.request.Request(url, data=data, method=method)
        if body:
            req.add_header("Content-Type", "application/json")
        if token:
            req.add_header("Authorization", "Bearer " + str(token))
        try:
            with urllib.request.urlopen(req, timeout=12) as r:
                return json.dumps({"status": r.status, "body": r.read().decode("utf-8", "replace")})
        except urllib.error.HTTPError as e:
            return json.dumps({"status": e.code, "body": e.read().decode("utf-8", "replace")})
        except Exception as e:  # sem rede, nome desconhecido, tempo esgotado…
            return json.dumps({"status": 0, "error": str(e)})

    def notify(self, title, body):
        """Notificação do macOS (lembretes)."""
        if sys.platform == "darwin":
            import subprocess
            subprocess.run(["osascript", "-e", "on run argv",
                            "-e", "display notification (item 2 of argv) with title \"Organizador\" subtitle (item 1 of argv) sound name \"Glass\"",
                            "-e", "end run", str(title), str(body)], check=False)
        return True

    # -- cópias de segurança (pasta backups/) --------------------------------
    @staticmethod
    def _backup_path(bid):
        if not re.fullmatch(r"\d{1,16}", str(bid)):
            raise ValueError("id inválido")
        return os.path.join(BACKUPS, f"organizador-{bid}.json")

    def backup_save(self, meta, text):
        meta = json.loads(meta)
        os.makedirs(BACKUPS, exist_ok=True)
        path = self._backup_path(int(meta["id"]))
        with open(path + ".tmp", "w", encoding="utf-8") as f:
            json.dump({"meta": meta, "data": json.loads(text)}, f, ensure_ascii=False)
        os.replace(path + ".tmp", path)
        return True

    def backup_list(self):
        out = []
        if os.path.isdir(BACKUPS):
            for name in os.listdir(BACKUPS):
                if re.fullmatch(r"organizador-\d+\.json", name):
                    try:
                        with open(os.path.join(BACKUPS, name), "r", encoding="utf-8") as f:
                            out.append(json.load(f)["meta"])
                    except Exception:
                        pass
        out.sort(key=lambda m: m.get("id", 0), reverse=True)
        return json.dumps(out)

    def backup_read(self, bid):
        try:
            with open(self._backup_path(bid), "r", encoding="utf-8") as f:
                return json.dumps(json.load(f)["data"])
        except Exception:
            return None

    def backup_delete(self, bid):
        try:
            os.remove(self._backup_path(bid))
        except Exception:
            pass
        return True

    def export_file(self, text, name="organizador-copia.json"):
        name = re.sub(r"[^\w.\- ]", "_", str(name))[:80] or "organizador-copia.json"
        path = webview.windows[0].create_file_dialog(
            webview.SAVE_DIALOG, save_filename=name)
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


def _show_in_dock():
    """Depois de a janela abrir: ícone do Organizador na Dock e janela à frente."""
    if sys.platform != "darwin":
        return
    try:
        from AppKit import NSApplication, NSImage, NSApplicationActivationPolicyRegular
        from PyObjCTools import AppHelper

        def apply():
            app = NSApplication.sharedApplication()
            app.setActivationPolicy_(NSApplicationActivationPolicyRegular)
            if os.path.exists(ICON):
                app.setApplicationIconImage_(NSImage.alloc().initWithContentsOfFile_(ICON))
            app.activateIgnoringOtherApps_(True)
        for delay in (0.3, 1.5):  # repete: o macOS às vezes repõe o ícone ao terminar de abrir
            import time
            time.sleep(delay)
            AppHelper.callAfter(apply)
    except Exception:
        pass


def _already_running():
    """Se a app já estiver aberta, traz essa janela para a frente e devolve True."""
    try:
        with open(PID_FILE) as f:
            pid = int(f.read().strip())
        os.kill(pid, 0)  # o processo existe?
    except Exception:
        return False
    try:
        from AppKit import NSRunningApplication
        app = NSRunningApplication.runningApplicationWithProcessIdentifier_(pid)
        if app is None or "python" not in str(app.executableURL().path()).lower():
            return False  # o número pertence agora a outro programa
        app.activateWithOptions_(3)  # todas as janelas + ignorar a app ativa
    except Exception:
        pass
    return True


def _port_free(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) != 0


def main():
    if _already_running():
        return
    os.chdir(ROOT)
    with open(PID_FILE, "w") as f:
        f.write(str(os.getpid()))
    _mac_branding()
    webview.create_window(
        "Organizador", os.path.join(ROOT, "static", "index.html"), js_api=Api(),
        width=1240, height=820, min_size=(380, 560),
        background_color="#111113",
    )
    # Porta fixa + armazenamento persistente: o tema, a cor e as preferências
    # ficam guardados entre aberturas (as tarefas continuam em dados.json).
    # Se a porta estiver ocupada por outro programa, usa uma ao acaso
    # (a app funciona; só as preferências de aparência não ficam guardadas nessa vez).
    try:
        webview.start(_show_in_dock, http_server=True, http_port=PORT if _port_free(PORT) else None,
                      private_mode=False, storage_path=os.path.join(ROOT, ".webdata"))
    finally:
        try:
            os.remove(PID_FILE)
        except OSError:
            pass


if __name__ == "__main__":
    main()
