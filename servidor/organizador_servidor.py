#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Organizador — servidor de contas para Raspberry Pi (substitui a placa ESP8266)
===============================================================================

A mesma API que o servidor da ESP8266, por isso a app não muda:
  GET  /api/ping                     "estás vivo?" + estatísticas
  POST /api/register  {user, pass}   criar conta  → {ok, user, token}
  POST /api/login     {user, pass}   entrar       → {ok, user, token}
  POST /api/logout                   sair (o token deixa de valer)
  GET  /api/data                     ler os dados da conta     (precisa do token)
  PUT  /api/data                     gravar os dados da conta  (precisa do token)
Novidades em relação à ESP8266:
  POST /api/password  {pass, new}    mudar a palavra-passe (termina as outras sessões)
  POST /api/delete    {pass}         apagar a conta e os dados
  • as sessões expiram ao fim de 180 dias sem uso, e só o hash do token fica guardado;
  • depois de 8 palavras-passe erradas, a conta fica bloqueada 15 minutos para esse endereço;
  • ao gravar, o servidor também junta os dados item a item (updatedAt), por isso dois
    dispositivos a gravar ao mesmo tempo já não apagam as alterações um do outro;
  • serve a própria app (pasta static/) em http://organizador.local/.

Só usa a biblioteca padrão do Python (3.9 ou mais recente): não é preciso instalar nada.

Experimentar no PC:
    python3 servidor/organizador_servidor.py --port 8790 --dados /tmp/org-dados
Na Raspberry Pi corre como serviço (ver servidor/instalar.sh e servidor/LEIA-ME.md).
"""

import argparse
import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import shutil
import sys
import threading
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit

VERSION = "1.0-beta"
RE_USER = re.compile(r"^[a-z0-9._-]{3,24}$")
MAX_DATA_BYTES = 5 * 1024 * 1024      # 5 MB por conta (a ESP8266 só aguentava 200 KB)
MAX_BODY_SMALL = 4 * 1024             # pedidos de login, registo, etc.
TOKEN_DAYS = 180                      # sessão sem uso durante 180 dias → expira
LOGIN_MAX_FAILS = 8                   # palavras-passe erradas seguidas…
LOGIN_LOCK_S = 15 * 60                # …bloqueiam durante 15 minutos
PBKDF2_ROUNDS = 200_000

ROOT = os.path.dirname(os.path.abspath(__file__))


def now_ms():
    return int(time.time() * 1000)


# --------------------------------------------------------------------------- armazenamento
class Store:
    """Contas, sessões e dados, em ficheiros JSON numa pasta.

    Escritas atómicas (ficheiro .tmp + rename), protegidas por um cadeado: o servidor
    atende vários pedidos ao mesmo tempo."""

    def __init__(self, folder):
        self.folder = folder
        self.lock = threading.RLock()
        os.makedirs(os.path.join(folder, "dados"), exist_ok=True)
        try:
            os.chmod(folder, 0o700)
        except OSError:
            pass
        self.users = self._load("contas.json")
        self.tokens = self._load("sessoes.json")
        self._expire_tokens()

    def _path(self, name):
        return os.path.join(self.folder, name)

    def _load(self, name):
        try:
            with open(self._path(name), "r", encoding="utf-8") as f:
                d = json.load(f)
                return d if isinstance(d, dict) else {}
        except FileNotFoundError:
            return {}

    def _save(self, name, obj):
        tmp = self._path(name) + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, self._path(name))

    def data_path(self, user):
        return os.path.join(self.folder, "dados", user + ".json")

    # -- palavras-passe ----------------------------------------------------
    @staticmethod
    def hash_pass(salt, password):
        return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), PBKDF2_ROUNDS).hex()

    def check_pass(self, user, password):
        u = self.users.get(user)
        if not u:
            # gastar o mesmo tempo, para não revelar que a conta não existe
            self.hash_pass("00" * 16, password)
            return False
        return hmac.compare_digest(self.hash_pass(u["salt"], password), u["hash"])

    def set_pass(self, user, password):
        salt = secrets.token_hex(16)
        self.users.setdefault(user, {"created": now_ms()})
        self.users[user].update(salt=salt, hash=self.hash_pass(salt, password), alg="pbkdf2-sha256")
        self._save("contas.json", self.users)

    # -- sessões (só o hash do token fica guardado) --------------------------
    @staticmethod
    def _th(token):
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def new_token(self, user):
        token = secrets.token_hex(32)
        with self.lock:
            self.tokens[self._th(token)] = {"user": user, "created": now_ms(), "used": now_ms()}
            self._save("sessoes.json", self.tokens)
        return token

    def user_of(self, token):
        if not token or len(token) < 32:
            return None
        with self.lock:
            t = self.tokens.get(self._th(token))
            if not t or t["user"] not in self.users:
                return None
            if now_ms() - t.get("used", 0) > TOKEN_DAYS * 864e5:
                del self.tokens[self._th(token)]
                self._save("sessoes.json", self.tokens)
                return None
            if now_ms() - t.get("used", 0) > 3600e3:   # atualizar "último uso" no máximo 1×/hora
                t["used"] = now_ms()
                self._save("sessoes.json", self.tokens)
            return t["user"]

    def drop_token(self, token):
        with self.lock:
            if self.tokens.pop(self._th(token or ""), None):
                self._save("sessoes.json", self.tokens)

    def drop_user_tokens(self, user, keep=None):
        with self.lock:
            keep_h = self._th(keep) if keep else None
            self.tokens = {h: t for h, t in self.tokens.items() if t["user"] != user or h == keep_h}
            self._save("sessoes.json", self.tokens)

    def _expire_tokens(self):
        limit = now_ms() - TOKEN_DAYS * 864e5
        n = len(self.tokens)
        self.tokens = {h: t for h, t in self.tokens.items() if t.get("used", 0) >= limit and t.get("user") in self.users}
        if len(self.tokens) != n:
            self._save("sessoes.json", self.tokens)

    # -- dados --------------------------------------------------------------
    def read_data(self, user):
        try:
            with open(self.data_path(user), "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            return "{}"

    def write_data(self, user, incoming):
        """Junta o que chega com o que já está guardado, item a item (fica o updatedAt mais
        recente), e grava. Assim um dispositivo nunca apaga o trabalho de outro."""
        with self.lock:
            try:
                current = json.loads(self.read_data(user))
            except ValueError:
                current = {}
            merged = merge_data(current, incoming)
            tmp = self.data_path(user) + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(merged, f, ensure_ascii=False, separators=(",", ":"))
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp, self.data_path(user))

    def delete_user(self, user):
        with self.lock:
            self.users.pop(user, None)
            self._save("contas.json", self.users)
            self.drop_user_tokens(user)
            try:
                os.remove(self.data_path(user))
            except FileNotFoundError:
                pass


def merge_data(current, incoming):
    """Coleções (listas de itens com "id"): junta por id, fica o updatedAt mais recente.
    Outros campos (app, version, savedAt…): ficam os que chegam."""
    out = dict(current) if isinstance(current, dict) else {}
    for key, val in incoming.items():
        old = out.get(key)
        if not isinstance(old, list):
            old = []
        if isinstance(val, list) and all(isinstance(x, dict) and "id" in x for x in val + old):
            by_id = {}
            for item in old + val:
                prev = by_id.get(item["id"])
                if prev is None or _num(item.get("updatedAt")) >= _num(prev.get("updatedAt")):
                    by_id[item["id"]] = item
            # itens apagados há mais de 30 dias saem de vez (a app faz o mesmo)
            limit = now_ms() - 30 * 864e5
            out[key] = [x for x in by_id.values() if not (x.get("deleted") is True and _num(x.get("updatedAt")) < limit)]
        else:
            out[key] = val
    return out


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


# --------------------------------------------------------------------------- limite de tentativas
class LoginGuard:
    def __init__(self):
        self.fails = {}   # (ip, user) → [contagem, desde]
        self.lock = threading.Lock()

    def blocked(self, ip, user):
        with self.lock:
            f = self.fails.get((ip, user))
            if not f:
                return 0
            if time.time() - f[1] > LOGIN_LOCK_S:
                del self.fails[(ip, user)]
                return 0
            return int(LOGIN_LOCK_S - (time.time() - f[1])) if f[0] >= LOGIN_MAX_FAILS else 0

    def fail(self, ip, user):
        with self.lock:
            f = self.fails.get((ip, user))
            if not f or time.time() - f[1] > LOGIN_LOCK_S:
                f = [0, time.time()]
            f[0] += 1
            self.fails[(ip, user)] = f

    def ok(self, ip, user):
        with self.lock:
            self.fails.pop((ip, user), None)


# --------------------------------------------------------------------------- pedidos HTTP
class Handler(BaseHTTPRequestHandler):
    server_version = "Organizador/" + VERSION
    protocol_version = "HTTP/1.1"

    # ---- utilitários
    @property
    def app(self):
        return self.server.app

    def log_message(self, fmt, *args):
        if self.app.verbose:
            sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def send_json(self, code, obj):
        body = (obj if isinstance(obj, str) else json.dumps(obj, ensure_ascii=False)).encode("utf-8")
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def error(self, code, msg):
        self.send_json(code, {"ok": False, "error": msg})

    def token(self):
        h = self.headers.get("Authorization", "")
        return h[7:].strip() if h.startswith("Bearer ") else ""

    def read_body(self, limit):
        try:
            n = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            n = -1
        if n < 0 or n > limit:
            # descartar o corpo sem o ler todo, e fechar a ligação
            self.close_connection = True
            return None
        return self.rfile.read(n) if n else b""

    def read_json(self):
        raw = self.read_body(MAX_BODY_SMALL)
        if raw is None:
            return None
        try:
            d = json.loads(raw.decode("utf-8") or "{}")
            return d if isinstance(d, dict) else None
        except ValueError:
            return None

    def client_ip(self):
        # atrás do túnel (Cloudflare), o endereço verdadeiro vem neste cabeçalho
        return self.headers.get("CF-Connecting-IP") or self.client_address[0]

    # ---- métodos
    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        self.app.count()
        path = urlsplit(self.path).path
        if path == "/api/ping":
            return self.send_json(200, self.app.ping())
        if path == "/api/data":
            user = self.app.store.user_of(self.token())
            if not user:
                return self.error(401, "Sessão inválida. Entra outra vez.")
            return self.send_json(200, self.app.store.read_data(user))
        if path.startswith("/api/"):
            return self.error(404, "não encontrado")
        return self.static(path)

    def do_PUT(self):
        self.app.count()
        if urlsplit(self.path).path != "/api/data":
            return self.error(404, "não encontrado")
        user = self.app.store.user_of(self.token())
        if not user:
            self.read_body(0)
            return self.error(401, "Sessão inválida. Entra outra vez.")
        raw = self.read_body(MAX_DATA_BYTES)
        if raw is None:
            return self.error(413, "Os dados são demasiado grandes (máx. 5 MB)")
        try:
            data = json.loads(raw.decode("utf-8"))
        except ValueError:
            data = None
        if not isinstance(data, dict):
            return self.error(400, "Os dados têm de ser um objeto JSON")
        self.app.store.write_data(user, data)
        self.app.event("guardou", user)
        return self.send_json(200, {"ok": True, "savedAt": now_ms()})

    def do_POST(self):
        self.app.count()
        path = urlsplit(self.path).path
        store, guard, ip = self.app.store, self.app.guard, self.client_ip()

        if path == "/api/logout":
            self.read_body(MAX_BODY_SMALL)
            store.drop_token(self.token())
            return self.send_json(200, {"ok": True})

        j = self.read_json()
        if j is None:
            return self.error(400, "Pedido inválido")
        user = str(j.get("user", "")).strip().lower()
        password = j.get("pass", "")
        password = password if isinstance(password, str) else ""

        if path == "/api/register":
            if not RE_USER.match(user):
                return self.error(400, "Nome de utilizador inválido (3-24 letras minúsculas, números, . _ -)")
            if len(password) < 6:
                return self.error(400, "A palavra-passe tem de ter pelo menos 6 caracteres")
            if len(password) > 200:
                return self.error(400, "A palavra-passe é demasiado comprida")
            with store.lock:
                if user in store.users:
                    return self.error(409, "Esse nome de utilizador já existe")
                store.set_pass(user, password)
            self.app.event("nova conta", user)
            return self.send_json(200, {"ok": True, "user": user, "token": store.new_token(user)})

        if path == "/api/login":
            wait = guard.blocked(ip, user)
            if wait:
                return self.error(429, f"Demasiadas tentativas. Espera {max(1, wait // 60)} minuto(s).")
            if not store.check_pass(user, password):
                guard.fail(ip, user)
                return self.error(401, "Utilizador ou palavra-passe errados")
            guard.ok(ip, user)
            self.app.event("entrou", user)
            return self.send_json(200, {"ok": True, "user": user, "token": store.new_token(user)})

        # as rotas seguintes precisam de sessão E da palavra-passe atual
        me = store.user_of(self.token())
        if not me:
            return self.error(401, "Sessão inválida. Entra outra vez.")
        if path in ("/api/password", "/api/delete"):
            wait = guard.blocked(ip, me)
            if wait:
                return self.error(429, f"Demasiadas tentativas. Espera {max(1, wait // 60)} minuto(s).")
            if not store.check_pass(me, password):
                guard.fail(ip, me)
                return self.error(401, "A palavra-passe atual está errada")
            guard.ok(ip, me)
        if path == "/api/password":
            new = j.get("new", "")
            if not isinstance(new, str) or len(new) < 6 or len(new) > 200:
                return self.error(400, "A palavra-passe nova tem de ter pelo menos 6 caracteres")
            with store.lock:
                store.set_pass(me, new)
                store.drop_user_tokens(me, keep=self.token())  # termina as sessões dos outros dispositivos
            self.app.event("mudou a palavra-passe", me)
            return self.send_json(200, {"ok": True})
        if path == "/api/delete":
            store.delete_user(me)
            self.app.event("apagou a conta", me)
            return self.send_json(200, {"ok": True})
        return self.error(404, "não encontrado")

    # ---- a própria app (pasta static/)
    def static(self, path):
        base = self.app.static_dir
        if not base:
            return self.send_json(200, {"ok": True, "app": "organizador", "info": "Servidor do Organizador. A app não está instalada aqui."})
        rel = unquote(path).lstrip("/") or "index.html"
        full = os.path.realpath(os.path.join(base, rel))
        if not (full == base or full.startswith(base + os.sep)):
            return self.error(403, "proibido")
        if os.path.isdir(full):
            full = os.path.join(full, "index.html")
        if not os.path.isfile(full):
            return self.error(404, "não encontrado")
        ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
        if full.endswith(".webmanifest"):
            ctype = "application/manifest+json"
        if ctype.startswith("text/") or ctype in ("application/javascript", "application/json", "image/svg+xml"):
            ctype += "; charset=utf-8"
        size = os.path.getsize(full)
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(size))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        if self.command != "HEAD":
            with open(full, "rb") as f:
                shutil.copyfileobj(f, self.wfile)


# --------------------------------------------------------------------------- servidor
class App:
    def __init__(self, data_dir, static_dir=None, verbose=False):
        self.store = Store(data_dir)
        self.guard = LoginGuard()
        self.static_dir = os.path.realpath(static_dir) if static_dir and os.path.isdir(static_dir) else None
        self.verbose = verbose
        self.started = time.time()
        self.requests = 0
        self.last = ""
        self._lock = threading.Lock()

    def count(self):
        with self._lock:
            self.requests += 1

    def event(self, what, user):
        self.last = f"{what} {user}"
        print(time.strftime("%Y-%m-%d %H:%M:%S"), what, user, flush=True)

    def ping(self):
        du = shutil.disk_usage(self.store.folder)
        return {"ok": True, "app": "organizador", "version": VERSION, "server": "raspberry",
                "users": len(self.store.users), "freeKB": du.free // 1024,
                "uptimeS": int(time.time() - self.started), "requests": self.requests,
                "maxBytes": MAX_DATA_BYTES}


def make_server(host, port, app):
    srv = ThreadingHTTPServer((host, port), Handler)
    srv.daemon_threads = True
    srv.app = app
    return srv


def main():
    p = argparse.ArgumentParser(description="Servidor de contas do Organizador")
    p.add_argument("--host", default="0.0.0.0")
    p.add_argument("--port", type=int, default=int(os.environ.get("ORGANIZADOR_PORTA", 80)))
    p.add_argument("--dados", default=os.environ.get("ORGANIZADOR_DADOS", os.path.join(ROOT, "dados")),
                   help="pasta onde ficam as contas e os dados")
    p.add_argument("--app", default=os.environ.get("ORGANIZADOR_APP", os.path.join(os.path.dirname(ROOT), "static")),
                   help="pasta static/ da app, para a servir em / (opcional)")
    p.add_argument("-v", "--verbose", action="store_true", help="mostrar cada pedido")
    a = p.parse_args()
    app = App(a.dados, a.app, a.verbose)
    srv = make_server(a.host, a.port, app)
    print(f"Organizador · servidor {VERSION} em http://{a.host}:{a.port}  (dados em {a.dados}"
          f"{', app em ' + app.static_dir if app.static_dir else ''})", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
