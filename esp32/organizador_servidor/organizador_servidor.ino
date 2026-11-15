// ===========================================================================
//  Organizador — servidor de contas (versão beta) para ESP8266
//
//  O que faz:
//   • Criar conta e entrar (palavra-passe guardada com hash + salt, nunca em texto)
//   • Guardar e ler os dados de cada conta (as tarefas da app)
//   • Página de teste em http://organizador.local para experimentar sem a app
//   • Estatísticas no ecrã OLED da placa (ver ecra.h)
//
//  Placa: ESP8266 ideaspark com OLED → no Arduino, "NodeMCU 1.0 (ESP-12E Module)"
//
//  Bibliotecas (Arduino IDE → Library Manager):
//   • "ESP Async WebServer"  (autor: ESP32Async)
//   • "ESP Async TCP"        (autor: ESP32Async; não a antiga "ESPAsyncTCP")
//   • "ArduinoJson"          (autor: Benoit Blanchon, versão 7)
//   • "U8g2"                 (autor: oliver; para o ecrã OLED)
//
//  O código também compila para ESP32 ("DOIT ESP32 DEVKIT V1", com "Async TCP"
//  em vez de "ESP Async TCP"), mas não é testado nela.
// ===========================================================================
#include <ArduinoJson.h>   // tem de vir antes de AsyncJson.h
#if defined(ESP8266)
  #include <ESP8266WiFi.h>
  #include <ESP8266mDNS.h>
  #include <ESPAsyncTCP.h>
  #include <bearssl/bearssl_hash.h>
#else
  #include <WiFi.h>
  #include <ESPmDNS.h>
  #include <AsyncTCP.h>
  #include "mbedtls/sha256.h"
#endif
#include <LittleFS.h>
#include <ESPAsyncWebServer.h>
#include <AsyncJson.h>
#include "config.h"
#include "ecra.h"           // ecrã OLED com estatísticas (opcional, ver ecra.h)

static const char *VERSION = "0.3-beta";
AsyncWebServer server(80);

// Estatísticas para o ecrã e para /api/ping (desde o último arranque).
struct Estatisticas {
  uint32_t pedidos = 0;
  uint32_t entradas = 0;        // logins e contas novas
  uint32_t gravacoes = 0;       // PUT /api/data
  int contas = 0;
  char ultimo[22] = "";         // última ação (cabe numa linha do ecrã)
  uint32_t ultimoEm = 0;        // millis() da última ação
  bool houveAtividade = false;
} stats;

void registarAcao(const char *o_que, const String &user) {
  snprintf(stats.ultimo, sizeof(stats.ultimo), "%s %s", o_que, user.c_str());
  stats.ultimoEm = millis();
  stats.houveAtividade = true;
}

// ----------------------------------------------------------------- utilitários
String hexOf(const uint8_t *b, size_t n) {
  static const char *h = "0123456789abcdef";
  String s; s.reserve(n * 2);
  for (size_t i = 0; i < n; i++) { s += h[b[i] >> 4]; s += h[b[i] & 15]; }
  return s;
}

// Número aleatório do gerador de hardware (ESP32 e ESP8266 têm um).
uint32_t hwRandom() {
#if defined(ESP8266)
  return RANDOM_REG32;
#else
  return esp_random();
#endif
}

String randomHex(size_t bytes) {
  uint8_t buf[32];
  if (bytes > sizeof(buf)) bytes = sizeof(buf);
  for (size_t i = 0; i < bytes; i++) buf[i] = hwRandom() & 0xFF;
  return hexOf(buf, bytes);
}

void sha256(const uint8_t *data, size_t len, uint8_t out[32]) {
#if defined(ESP8266)
  br_sha256_context ctx;
  br_sha256_init(&ctx);
  br_sha256_update(&ctx, data, len);
  br_sha256_out(&ctx, out);
#else
  mbedtls_sha256(data, len, out, 0);
#endif
}

// Hash da palavra-passe: SHA-256 com salt, repetido 5000 vezes (abranda ataques).
String hashPassword(const String &salt, const String &pass) {
  uint8_t out[32];
  String first = salt + ":" + pass;
  sha256((const uint8_t *)first.c_str(), first.length(), out);
  uint8_t buf[64];
  size_t sl = salt.length() > 32 ? 32 : salt.length();
  for (int i = 0; i < 5000; i++) {
    memcpy(buf, out, 32);
    memcpy(buf + 32, salt.c_str(), sl);
    sha256(buf, 32 + sl, out);
  }
  return hexOf(out, 32);
}

// Espaço livre no armazenamento (a API é diferente nas duas placas).
size_t freeKB() {
#if defined(ESP8266)
  FSInfo info;
  LittleFS.info(info);
  return (info.totalBytes - info.usedBytes) / 1024;
#else
  return (LittleFS.totalBytes() - LittleFS.usedBytes()) / 1024;
#endif
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
  req->send(code, "application/json; charset=utf-8", out);
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
  ecraIniciar();
  ecraMensagem("Organizador", ("servidor " + String(VERSION)).c_str(), "a arrancar...");

#if defined(ESP8266)
  bool fsOk = LittleFS.begin();       // na ESP8266 formata sozinho se for preciso
#else
  bool fsOk = LittleFS.begin(true);   // true = formatar se estiver vazio
#endif
  if (!fsOk) Serial.println("ERRO: não consegui iniciar o armazenamento (LittleFS)");
  if (!LittleFS.exists("/data")) LittleFS.mkdir("/data");
  {
    JsonDocument users; loadJson("/users.json", users);
    stats.contas = users.as<JsonObject>().size();
  }

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
#if defined(ESP8266)
  WiFi.hostname(HOSTNAME);
#else
  WiFi.setHostname(HOSTNAME);
#endif
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("A ligar ao Wi-Fi \"" WIFI_SSID "\"");
  ecraMensagem("A ligar Wi-Fi", WIFI_SSID);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 20000) { delay(500); Serial.print("."); }
  Serial.println();
  if (WiFi.status() != WL_CONNECTED) {
    // Não desistir: depois de uma falha de luz o router demora mais a arrancar do
    // que a placa. O servidor arranca na mesma e fica disponível quando o Wi-Fi ligar.
    Serial.println("AVISO: ainda não liguei ao Wi-Fi. Continuo a tentar. Se não ligar, confirma o nome e a palavra-passe em config.h (rede de 2,4 GHz).");
  }

  // Permitir pedidos vindos da app (outra origem)
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Private-Network", "true");

  // Contar todos os pedidos (para o ecrã e o /api/ping)
  server.addMiddleware([](AsyncWebServerRequest *req, ArMiddlewareNext next) {
    stats.pedidos++;
    next();
  });

  server.on("/", HTTP_GET, [](AsyncWebServerRequest *req) { 
    // Enviar como bytes em PROGMEM: obrigatório na ESP8266, inofensivo na ESP32.
    req->send(200, "text/html; charset=utf-8", (const uint8_t *)TEST_PAGE, strlen_P(TEST_PAGE));
  });

  server.on("/api/ping", HTTP_GET, [](AsyncWebServerRequest *req) {
    JsonDocument d;
    d["ok"] = true; d["app"] = "organizador"; d["version"] = VERSION;
    d["users"] = stats.contas;
    d["freeKB"] = freeKB();
    d["uptimeS"] = millis() / 1000;
    d["requests"] = stats.pedidos;
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
    stats.contas = users.as<JsonObject>().size();
    stats.entradas++;
    registarAcao("nova conta", user);
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
    stats.entradas++;
    registarAcao("entrou", user);
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
    req->send(200, "application/json; charset=utf-8", "{\"ok\":true}");
  });

  // Ler os dados da conta
  server.on("/api/data", HTTP_GET, [](AsyncWebServerRequest *req) {
    String user = userFromRequest(req);
    if (user == "") return sendError(req, 401, "Sessão inválida. Entra outra vez.");
    String path = dataPath(user);
    if (!LittleFS.exists(path)) return req->send(200, "application/json; charset=utf-8", "{}");
    req->send(LittleFS, path, "application/json; charset=utf-8");
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
      stats.gravacoes++;
      registarAcao("guardou", user);
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
    req->send(404, "application/json; charset=utf-8", "{\"ok\":false,\"error\":\"não encontrado\"}");
  });

  server.begin();
  Serial.println("Servidor pronto. Abre o endereço acima num browser na mesma rede Wi-Fi.");
}

// Chamado sempre que o Wi-Fi (re)liga: mostra o endereço e liga o mDNS.
void quandoWifiLigar() {
  static bool mdnsLigado = false;
  Serial.println("Ligado! Endereço: http://" + WiFi.localIP().toString());
  if (!mdnsLigado && MDNS.begin(HOSTNAME)) {
    MDNS.addService("http", "tcp", 80);
    mdnsLigado = true;
    Serial.println("Também em:        http://" HOSTNAME ".local");
  }
}

void loop() {
  static bool estavaLigado = false;
  bool ligado = WiFi.status() == WL_CONNECTED;
  if (ligado && !estavaLigado) quandoWifiLigar();
  if (!ligado && estavaLigado) Serial.println("Wi-Fi perdido, a ligar outra vez…");
  estavaLigado = ligado;

#if defined(ESP8266)
  if (ligado) MDNS.update();   // na ESP8266 o mDNS precisa de ser atendido no loop
#endif

  // Se o Wi-Fi estiver em baixo, insistir a cada 10 s
  static unsigned long ultimaTentativa = 0;
  if (!ligado && millis() - ultimaTentativa > 10000) {
    ultimaTentativa = millis();
    WiFi.reconnect();
  }

  // Atualizar o ecrã 1 vez por segundo
  static unsigned long ultimoEcra = 0;
  if (millis() - ultimoEcra >= 1000) {
    ultimoEcra = millis();
    EcraDados d;
    d.versao = VERSION;
    d.wifiLigado = ligado;
    d.rede = WIFI_SSID;
    d.ip = ligado ? WiFi.localIP().toString() : String("-");
    d.rssi = ligado ? WiFi.RSSI() : -100;
    d.segundos = millis() / 1000;
    d.contas = stats.contas;
    d.pedidos = stats.pedidos;
    d.entradas = stats.entradas;
    d.gravacoes = stats.gravacoes;
    d.livreKB = freeKB();
    d.ramKB = ESP.getFreeHeap() / 1024;
    d.ultimo = stats.ultimo;
    d.ultimoHa = stats.houveAtividade ? (millis() - stats.ultimoEm) / 1000 : 0xFFFFFFFF;
    ecraDesenhar(d);
  }
  delay(10);
}
