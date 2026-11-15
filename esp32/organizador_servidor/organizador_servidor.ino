// ===========================================================================
//  Organizador — servidor de contas (versão beta) para ESP32
//
//  O que faz:
//   • Criar conta e entrar (palavra-passe guardada com hash + salt, nunca em texto)
//   • Guardar e ler os dados de cada conta (as tarefas da app)
//   • Página de teste em http://organizador.local para experimentar sem a app
//
//  Bibliotecas (Arduino IDE → Library Manager):
//   • "ESP Async WebServer"  (autor: ESP32Async)
//   • "Async TCP"            (autor: ESP32Async)
//   • "ArduinoJson"          (autor: Benoit Blanchon, versão 7)
//
//  Placa: "DOIT ESP32 DEVKIT V1" (ou "ESP32 Dev Module")
// ===========================================================================
#include <WiFi.h>
#include <ESPmDNS.h>
#include <LittleFS.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <AsyncJson.h>
#include <ArduinoJson.h>
#include "mbedtls/sha256.h"
#include "config.h"

static const char *VERSION = "0.1-beta";
AsyncWebServer server(80);

// ----------------------------------------------------------------- utilitários
String hexOf(const uint8_t *b, size_t n) {
  static const char *h = "0123456789abcdef";
  String s; s.reserve(n * 2);
  for (size_t i = 0; i < n; i++) { s += h[b[i] >> 4]; s += h[b[i] & 15]; }
  return s;
}

String randomHex(size_t bytes) {
  uint8_t buf[32];
  if (bytes > sizeof(buf)) bytes = sizeof(buf);
  for (size_t i = 0; i < bytes; i++) buf[i] = esp_random() & 0xFF;
  return hexOf(buf, bytes);
}

// Hash da palavra-passe: SHA-256 com salt, repetido 5000 vezes (abranda ataques).
String hashPassword(const String &salt, const String &pass) {
  uint8_t out[32];
  String first = salt + ":" + pass;
  mbedtls_sha256((const unsigned char *)first.c_str(), first.length(), out, 0);
  uint8_t buf[64];
  size_t sl = salt.length() > 32 ? 32 : salt.length();
  for (int i = 0; i < 5000; i++) {
    memcpy(buf, out, 32);
    memcpy(buf + 32, salt.c_str(), sl);
    mbedtls_sha256(buf, 32 + sl, out, 0);
  }
  return hexOf(out, 32);
}

bool loadJson(const char *path, JsonDocument &doc) {
  File f = LittleFS.open(path, "r");
  if (!f) return false;
  DeserializationError e = deserializeJson(doc, f);
  f.close();
  return !e;
}

bool saveJson(const char *path, JsonDocument &doc) {
  String tmp = String(path) + ".tmp";
  File f = LittleFS.open(tmp, "w");
  if (!f) return false;
  serializeJson(doc, f);
  f.close();
  LittleFS.remove(path);
  return LittleFS.rename(tmp, path);
}

// Nomes de utilizador: 3–24 caracteres, letras minúsculas, números, . _ -
bool validUser(const String &u) {
  if (u.length() < 3 || u.length() > 24) return false;
  for (char c : u) {
    if (!(isdigit(c) || (c >= 'a' && c <= 'z') || c == '.' || c == '_' || c == '-')) return false;
  }
  return true;
}

String dataPath(const String &user) { return "/data/" + user + ".json"; }

// Devolve o utilizador do pedido ("" se o token for inválido).
String userFromRequest(AsyncWebServerRequest *req) {
  if (!req->hasHeader("Authorization")) return "";
  String h = req->header("Authorization");
  if (!h.startsWith("Bearer ")) return "";
  String token = h.substring(7);
  token.trim();
  if (token.length() < 32) return "";
  JsonDocument tokens;
  if (!loadJson("/tokens.json", tokens)) return "";
  const char *u = tokens[token] | "";
  return String(u);
}

void sendJson(AsyncWebServerRequest *req, int code, JsonDocument &doc) {
  String out;
  serializeJson(doc, out);
  req->send(code, "application/json", out);
}

void sendError(AsyncWebServerRequest *req, int code, const char *msg) {
  JsonDocument d;
  d["ok"] = false;
  d["error"] = msg;
  sendJson(req, code, d);
}

String newToken(const String &user) {
  JsonDocument tokens;
  loadJson("/tokens.json", tokens);
  String token = randomHex(32);
  tokens[token] = user;
  saveJson("/tokens.json", tokens);
  return token;
}

// ----------------------------------------------------------------- página de teste
const char TEST_PAGE[] PROGMEM = R"HTML(<!doctype html><html lang="pt"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Organizador · Servidor</title>
<style>body{font:15px -apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:40px auto;padding:0 16px;background:#111113;color:#ececef}
h1{font-size:22px}input,button{font:inherit;padding:9px 12px;border-radius:8px;border:1px solid #2a2a2e;background:#18181b;color:inherit;margin:4px 0}
button{background:#ececef;color:#111;border:0;cursor:pointer}pre{background:#18181b;padding:12px;border-radius:8px;white-space:pre-wrap;word-break:break-all}
.row{display:flex;gap:8px;flex-wrap:wrap}.muted{color:#8a8a93}</style></head><body>
<h1>Servidor do Organizador</h1><p class="muted" id="st">A verificar…</p>
<div class="row"><input id="u" placeholder="utilizador" autocapitalize="off"><input id="p" type="password" placeholder="palavra-passe"></div>
<div class="row"><button onclick="acc('register')">Criar conta</button><button onclick="acc('login')">Entrar</button></div>
<div class="row"><button onclick="save()">Guardar dados de teste</button><button onclick="load()">Ler os meus dados</button><button onclick="logout()">Sair</button></div>
<pre id="out">—</pre>
<script>
let token=localStorage.getItem('tok')||'';const out=t=>document.getElementById('out').textContent=typeof t==='string'?t:JSON.stringify(t,null,2);
fetch('/api/ping').then(r=>r.json()).then(j=>document.getElementById('st').textContent=`A funcionar · versão ${j.version} · ${j.users} conta(s)`+(token?' · com sessão iniciada':''));
async function acc(kind){const r=await fetch('/api/'+kind,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:u.value.trim().toLowerCase(),pass:p.value})});const j=await r.json();if(j.token){token=j.token;localStorage.setItem('tok',token);}out(j);}
async function save(){const body=JSON.stringify({tasks:[{id:'t'+Date.now(),title:'Tarefa de teste',updatedAt:Date.now()}],savedFrom:'página de teste'});const r=await fetch('/api/data',{method:'PUT',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},body});out(await r.json());}
async function load(){const r=await fetch('/api/data',{headers:{'Authorization':'Bearer '+token}});out(await r.text());}
async function logout(){await fetch('/api/logout',{method:'POST',headers:{'Authorization':'Bearer '+token}});token='';localStorage.removeItem('tok');out('Sessão terminada');}
</script></body></html>)HTML";

// ----------------------------------------------------------------- arranque
struct UploadState { char user[32]; bool ok; };

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println();
  Serial.println("=== Organizador · servidor " + String(VERSION) + " ===");

  if (!LittleFS.begin(true)) Serial.println("ERRO: não consegui iniciar o armazenamento (LittleFS)");
  if (!LittleFS.exists("/data")) LittleFS.mkdir("/data");

  WiFi.mode(WIFI_STA);
  WiFi.setHostname(HOSTNAME);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("A ligar ao Wi-Fi \"" WIFI_SSID "\"");
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 20000) { delay(500); Serial.print("."); }
  Serial.println();
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("ERRO: não liguei ao Wi-Fi. Confirma o nome e a palavra-passe em config.h (rede de 2,4 GHz).");
    return;
  }
  Serial.println("Ligado! Endereço: http://" + WiFi.localIP().toString());
  if (MDNS.begin(HOSTNAME)) {
    MDNS.addService("http", "tcp", 80);
    Serial.println("Também em:        http://" HOSTNAME ".local");
  }

  // Permitir pedidos vindos da app (outra origem)
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Private-Network", "true");

  server.on("/", HTTP_GET, [](AsyncWebServerRequest *req) { req->send(200, "text/html; charset=utf-8", TEST_PAGE); });

  server.on("/api/ping", HTTP_GET, [](AsyncWebServerRequest *req) {
    JsonDocument users; loadJson("/users.json", users);
    JsonDocument d;
    d["ok"] = true; d["app"] = "organizador"; d["version"] = VERSION;
    d["users"] = users.as<JsonObject>().size();
    d["freeKB"] = (LittleFS.totalBytes() - LittleFS.usedBytes()) / 1024;
    sendJson(req, 200, d);
  });

  // Criar conta
  server.addHandler(new AsyncCallbackJsonWebHandler("/api/register", [](AsyncWebServerRequest *req, JsonVariant &json) {
    String user = json["user"] | "";
    String pass = json["pass"] | "";
    user.trim(); user.toLowerCase();
    if (!validUser(user)) return sendError(req, 400, "Nome de utilizador inválido (3-24 letras minúsculas, números, . _ -)");
    if (pass.length() < 6) return sendError(req, 400, "A palavra-passe tem de ter pelo menos 6 caracteres");
    JsonDocument users; loadJson("/users.json", users);
    if (!users[user].isNull()) return sendError(req, 409, "Esse nome de utilizador já existe");
    String salt = randomHex(16);
    users[user]["salt"] = salt;
    users[user]["hash"] = hashPassword(salt, pass);
    users[user]["created"] = millis();
    if (!saveJson("/users.json", users)) return sendError(req, 500, "Erro a guardar a conta");
    JsonDocument d; d["ok"] = true; d["user"] = user; d["token"] = newToken(user);
    sendJson(req, 200, d);
  }));

  // Entrar
  server.addHandler(new AsyncCallbackJsonWebHandler("/api/login", [](AsyncWebServerRequest *req, JsonVariant &json) {
    String user = json["user"] | "";
    String pass = json["pass"] | "";
    user.trim(); user.toLowerCase();
    JsonDocument users; loadJson("/users.json", users);
    if (users[user].isNull()) return sendError(req, 401, "Utilizador ou palavra-passe errados");
    String salt = users[user]["salt"] | "";
    String hash = users[user]["hash"] | "";
    if (hashPassword(salt, pass) != hash) return sendError(req, 401, "Utilizador ou palavra-passe errados");
    JsonDocument d; d["ok"] = true; d["user"] = user; d["token"] = newToken(user);
    sendJson(req, 200, d);
  }));

  // Sair (apaga o token)
  server.on("/api/logout", HTTP_POST, [](AsyncWebServerRequest *req) {
    if (req->hasHeader("Authorization")) {
      String token = req->header("Authorization").substring(7);
      JsonDocument tokens; loadJson("/tokens.json", tokens);
      tokens.remove(token);
      saveJson("/tokens.json", tokens);
    }
    req->send(200, "application/json", "{\"ok\":true}");
  });

  // Ler os dados da conta
  server.on("/api/data", HTTP_GET, [](AsyncWebServerRequest *req) {
    String user = userFromRequest(req);
    if (user == "") return sendError(req, 401, "Sessão inválida. Entra outra vez.");
    String path = dataPath(user);
    if (!LittleFS.exists(path)) return req->send(200, "application/json", "{}");
    req->send(LittleFS, path, "application/json");
  });

  // Guardar os dados da conta (recebe o JSON aos bocados e grava em ficheiro)
  server.on("/api/data", HTTP_PUT,
    [](AsyncWebServerRequest *req) {
      UploadState *st = (UploadState *)req->_tempObject;
      if (!st || !st->ok) return sendError(req, 401, "Sessão inválida ou dados demasiado grandes");
      String user = String(st->user);
      String tmp = dataPath(user) + ".tmp";
      File f = LittleFS.open(tmp, "r");
      int first = f ? f.peek() : -1;
      if (f) f.close();
      if (first != '{') { LittleFS.remove(tmp); return sendError(req, 400, "Os dados têm de ser um objeto JSON"); }
      LittleFS.remove(dataPath(user));
      LittleFS.rename(tmp, dataPath(user));
      JsonDocument d; d["ok"] = true; d["savedAt"] = millis();
      sendJson(req, 200, d);
    },
    nullptr,
    [](AsyncWebServerRequest *req, uint8_t *data, size_t len, size_t index, size_t total) {
      if (index == 0) {
        UploadState *st = (UploadState *)malloc(sizeof(UploadState));
        memset(st, 0, sizeof(UploadState));
        req->_tempObject = st;
        String user = userFromRequest(req);
        if (user == "" || total > MAX_DATA_BYTES) return;
        strncpy(st->user, user.c_str(), sizeof(st->user) - 1);
        st->ok = true;
        LittleFS.remove(dataPath(user) + ".tmp");
      }
      UploadState *st = (UploadState *)req->_tempObject;
      if (!st || !st->ok) return;
      File f = LittleFS.open(dataPath(String(st->user)) + ".tmp", "a");
      if (!f) { st->ok = false; return; }
      f.write(data, len);
      f.close();
    });

  server.onNotFound([](AsyncWebServerRequest *req) {
    if (req->method() == HTTP_OPTIONS) return req->send(204);
    req->send(404, "application/json", "{\"ok\":false,\"error\":\"não encontrado\"}");
  });

  server.begin();
  Serial.println("Servidor pronto. Abre o endereço acima num browser na mesma rede Wi-Fi.");
}

void loop() {
  // Volta a ligar se o Wi-Fi cair
  static unsigned long last = 0;
  if (millis() - last > 10000) {
    last = millis();
    if (WiFi.status() != WL_CONNECTED) { Serial.println("Wi-Fi perdido, a ligar outra vez…"); WiFi.reconnect(); }
  }
  delay(10);
}
