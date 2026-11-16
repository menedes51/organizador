# -*- coding: utf-8 -*-
"""Testes do servidor do Organizador. Correr na pasta do projeto:
    python3 -m unittest servidor/test_servidor.py -v
Arrancam um servidor numa porta livre, com dados numa pasta temporária."""

import json
import os
import shutil
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import organizador_servidor as srv  # noqa: E402

srv.PBKDF2_ROUNDS = 1000  # mais rápido nos testes


class ServidorTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.static = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
        self.app = srv.App(self.dir, self.static)
        self.s = srv.make_server("127.0.0.1", 0, self.app)
        self.base = f"http://127.0.0.1:{self.s.server_address[1]}"
        threading.Thread(target=self.s.serve_forever, daemon=True).start()

    def tearDown(self):
        self.s.shutdown()
        self.s.server_close()
        shutil.rmtree(self.dir)

    def req(self, method, path, body=None, token="", raw=None):
        data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
        r = urllib.request.Request(self.base + path, data=data, method=method)
        if data is not None:
            r.add_header("Content-Type", "application/json")
        if token:
            r.add_header("Authorization", "Bearer " + token)
        try:
            with urllib.request.urlopen(r, timeout=10) as res:
                txt = res.read().decode()
                return res.status, (json.loads(txt) if txt.startswith(("{", "[")) else txt), res.headers
        except urllib.error.HTTPError as e:
            txt = e.read().decode()
            return e.code, (json.loads(txt) if txt.startswith("{") else txt), e.headers

    def conta(self, user="ana", pw="segredo1"):
        st, j, _ = self.req("POST", "/api/register", {"user": user, "pass": pw})
        self.assertEqual(st, 200, j)
        return j["token"]

    # ---------------------------------------------------------------- testes
    def test_ping(self):
        st, j, h = self.req("GET", "/api/ping")
        self.assertEqual((st, j["app"], j["version"]), (200, "organizador", srv.VERSION))
        self.assertEqual(h["Access-Control-Allow-Origin"], "*")

    def test_registo_login_dados(self):
        t = self.conta("Ana")  # o nome passa a minúsculas
        self.assertEqual(self.req("GET", "/api/data", token=t)[1], {})
        dados = {"app": "organizador", "tasks": [{"id": "a", "title": "Olá", "updatedAt": 5}]}
        self.assertEqual(self.req("PUT", "/api/data", dados, token=t)[0], 200)
        st, j, _ = self.req("POST", "/api/login", {"user": "ana", "pass": "segredo1"})
        self.assertEqual(st, 200)
        self.assertEqual(self.req("GET", "/api/data", token=j["token"])[1]["tasks"][0]["title"], "Olá")

    def test_erros_de_registo(self):
        self.conta()
        self.assertEqual(self.req("POST", "/api/register", {"user": "ana", "pass": "segredo1"})[0], 409)
        self.assertEqual(self.req("POST", "/api/register", {"user": "a b", "pass": "segredo1"})[0], 400)
        self.assertEqual(self.req("POST", "/api/register", {"user": "rui", "pass": "123"})[0], 400)
        self.assertEqual(self.req("POST", "/api/register", raw=b"nada")[0], 400)

    def test_sem_sessao(self):
        self.assertEqual(self.req("GET", "/api/data")[0], 401)
        self.assertEqual(self.req("GET", "/api/data", token="f" * 64)[0], 401)
        self.assertEqual(self.req("PUT", "/api/data", {"tasks": []}, token="f" * 64)[0], 401)

    def test_logout_invalida_token(self):
        t = self.conta()
        self.req("POST", "/api/logout", token=t)
        self.assertEqual(self.req("GET", "/api/data", token=t)[0], 401)

    def test_tokens_guardados_so_como_hash(self):
        t = self.conta()
        with open(os.path.join(self.dir, "sessoes.json")) as f:
            self.assertNotIn(t, f.read())
        with open(os.path.join(self.dir, "contas.json")) as f:
            self.assertNotIn("segredo1", f.read())

    def test_juncao_no_servidor(self):
        t = self.conta()
        self.req("PUT", "/api/data", {"tasks": [{"id": "a", "title": "A1", "updatedAt": 10}, {"id": "b", "title": "B", "updatedAt": 1}]}, token=t)
        # outro dispositivo envia uma versão mais antiga de "a" e uma tarefa nova "c" (sem "b")
        self.req("PUT", "/api/data", {"tasks": [{"id": "a", "title": "A0", "updatedAt": 5}, {"id": "c", "title": "C", "updatedAt": 2}]}, token=t)
        tasks = {x["id"]: x["title"] for x in self.req("GET", "/api/data", token=t)[1]["tasks"]}
        self.assertEqual(tasks, {"a": "A1", "b": "B", "c": "C"})

    def test_apagados_antigos_saem(self):
        t = self.conta()
        velho = srv.now_ms() - 40 * 864e5
        self.req("PUT", "/api/data", {"tasks": [{"id": "x", "deleted": True, "updatedAt": velho}, {"id": "y", "deleted": True, "updatedAt": srv.now_ms()}]}, token=t)
        ids = [x["id"] for x in self.req("GET", "/api/data", token=t)[1]["tasks"]]
        self.assertEqual(ids, ["y"])

    def test_dados_invalidos(self):
        t = self.conta()
        self.assertEqual(self.req("PUT", "/api/data", raw=b"[1,2]", token=t)[0], 400)
        self.assertEqual(self.req("PUT", "/api/data", raw=b"nao json", token=t)[0], 400)

    def test_limite_de_tentativas(self):
        self.conta()
        for _ in range(srv.LOGIN_MAX_FAILS):
            self.assertEqual(self.req("POST", "/api/login", {"user": "ana", "pass": "errada"})[0], 401)
        # bloqueada, mesmo com a palavra-passe certa
        self.assertEqual(self.req("POST", "/api/login", {"user": "ana", "pass": "segredo1"})[0], 429)

    def test_mudar_palavra_passe(self):
        t1 = self.conta()
        t2 = self.req("POST", "/api/login", {"user": "ana", "pass": "segredo1"})[1]["token"]
        self.assertEqual(self.req("POST", "/api/password", {"pass": "errada", "new": "novanova"}, token=t1)[0], 401)
        self.assertEqual(self.req("POST", "/api/password", {"pass": "segredo1", "new": "novanova"}, token=t1)[0], 200)
        self.assertEqual(self.req("GET", "/api/data", token=t1)[0], 200)   # esta sessão continua
        self.assertEqual(self.req("GET", "/api/data", token=t2)[0], 401)   # as outras terminam
        self.assertEqual(self.req("POST", "/api/login", {"user": "ana", "pass": "novanova"})[0], 200)

    def test_apagar_conta(self):
        t = self.conta()
        self.req("PUT", "/api/data", {"tasks": [{"id": "a", "updatedAt": 1}]}, token=t)
        self.assertEqual(self.req("POST", "/api/delete", {"pass": "segredo1"}, token=t)[0], 200)
        self.assertEqual(self.req("GET", "/api/data", token=t)[0], 401)
        self.assertEqual(self.req("POST", "/api/login", {"user": "ana", "pass": "segredo1"})[0], 401)
        self.assertFalse(os.path.exists(os.path.join(self.dir, "dados", "ana.json")))

    def test_contas_sobrevivem_a_reinicio(self):
        t = self.conta()
        app2 = srv.App(self.dir)
        self.assertEqual(app2.store.user_of(t), "ana")
        self.assertTrue(app2.store.check_pass("ana", "segredo1"))

    def test_serve_a_app_sem_sair_da_pasta(self):
        st, txt, h = self.req("GET", "/")
        self.assertEqual(st, 200)
        self.assertIn("Organizador", txt)
        self.assertIn("text/html", h["Content-Type"])
        self.assertEqual(self.req("GET", "/js/07-conta.js")[0], 200)
        self.assertIn(self.req("GET", "/../servidor/organizador_servidor.py")[0], (403, 404))
        self.assertIn(self.req("GET", "/%2e%2e/README.md")[0], (403, 404))

    def test_preflight_cors(self):
        st, _, h = self.req("OPTIONS", "/api/data")
        self.assertEqual(st, 204)
        self.assertIn("Authorization", h["Access-Control-Allow-Headers"])


if __name__ == "__main__":
    unittest.main()
