// ===========================================================================
//  Organizador — ecrã OLED com as estatísticas do servidor (opcional)
//
//  Para ecrãs SSD1306 de 128x64 ligados por I2C, como o da placa ESP8266
//  ideaspark. Precisa da biblioteca "U8g2" (autor: oliver).
//
//  O código procura o ecrã sozinho (pinos e endereço mais comuns). Se não
//  houver ecrã, não faz nada e o servidor funciona na mesma.
//  Para desligar:  #define OLED_ENABLED 0  no config.h.
//  Para fixar os pinos:  #define OLED_SDA 14  e  #define OLED_SCL 12  no config.h.
// ===========================================================================
#pragma once

#ifndef OLED_ENABLED
  #if defined(ESP8266)
    #define OLED_ENABLED 1      // a ideaspark traz ecrã
  #else
    #define OLED_ENABLED 0      // a ESP32 DevKit não traz
  #endif
#endif

// O que o ecrã mostra (preenchido pelo servidor).
struct EcraDados {
  const char *versao;
  bool wifiLigado;
  const char *rede;
  String ip;
  int rssi;               // força do sinal Wi-Fi (dBm)
  uint32_t segundos;      // tempo ligado
  int contas;
  uint32_t pedidos;
  uint32_t entradas;      // logins + contas novas
  uint32_t gravacoes;     // PUT /api/data
  size_t livreKB;         // espaço livre no LittleFS
  uint32_t ramKB;         // RAM livre
  const char *ultimo;     // última ação, ex.: "entrou ana"
  uint32_t ultimoHa;      // há quantos segundos (0xFFFFFFFF = nunca)
};

#if OLED_ENABLED
#include <Wire.h>
#include <U8g2lib.h>

static U8G2 *oled = nullptr;

// Procura o ecrã nos pinos/endereços mais comuns. Devolve true se encontrou.
bool ecraIniciar() {
  struct Pinos { int sda, scl; };
#if defined(OLED_SDA) && defined(OLED_SCL)
  const Pinos tentativas[] = { {OLED_SDA, OLED_SCL} };
#elif defined(ESP8266)
  // ideaspark (confirmado numa placa): SDA=GPIO12 (D6), SCL=GPIO14 (D5).
  // A seguir, o I2C normal da NodeMCU (SDA=D2/GPIO4, SCL=D1/GPIO5).
  const Pinos tentativas[] = { {12, 14}, {4, 5} };
#else
  const Pinos tentativas[] = { {21, 22} };   // I2C normal da ESP32
#endif
  for (const Pinos &p : tentativas) {
    Wire.begin(p.sda, p.scl);
#if defined(ESP8266)
    Wire.setClockStretchLimit(2000);   // µs: não ficar preso se não houver ecrã nestes pinos
#endif
    for (uint8_t addr : { 0x3C, 0x3D }) {
      Wire.beginTransmission(addr);
      if (Wire.endTransmission() == 0) {
        oled = new U8G2_SSD1306_128X64_NONAME_F_HW_I2C(U8G2_R0, U8X8_PIN_NONE, p.scl, p.sda);
        oled->setI2CAddress(addr * 2);
        oled->begin();
        oled->setContrast(60);       // menos brilho = o ecrã dura mais
        oled->enableUTF8Print();
        Serial.printf("Ecrã OLED encontrado (SDA=%d, SCL=%d, endereço 0x%02X)\n", p.sda, p.scl, addr);
        return true;
      }
    }
  }
  Serial.println("Sem ecrã OLED (não faz mal, o servidor funciona na mesma).");
  return false;
}

// Mensagem simples em letra grande (arranque, erros).
void ecraMensagem(const char *titulo, const char *linha2 = "", const char *linha3 = "") {
  if (!oled) return;
  oled->clearBuffer();
  oled->setFont(u8g2_font_7x14B_tf);
  oled->drawUTF8(0, 16, titulo);
  oled->setFont(u8g2_font_6x10_tf);
  oled->drawUTF8(0, 36, linha2);
  oled->drawUTF8(0, 50, linha3);
  oled->sendBuffer();
}

static String duracao(uint32_t s) {
  char b[24];
  if (s >= 86400) snprintf(b, sizeof(b), "%lud %02lu:%02lu", (unsigned long)(s / 86400), (unsigned long)(s / 3600 % 24), (unsigned long)(s / 60 % 60));
  else            snprintf(b, sizeof(b), "%02lu:%02lu:%02lu", (unsigned long)(s / 3600), (unsigned long)(s / 60 % 60), (unsigned long)(s % 60));
  return String(b);
}

static String haQuanto(uint32_t s) {
  if (s == 0xFFFFFFFF) return "";
  if (s < 60)    return "há " + String(s) + " s";
  if (s < 3600)  return "há " + String(s / 60) + " min";
  if (s < 86400) return "há " + String(s / 3600) + " h";
  return "há " + String(s / 86400) + " dias";
}

// Barras do sinal Wi-Fi (0 a 4), desenhadas no canto.
static void barrasWifi(int x, int y, int rssi) {
  int n = rssi >= -55 ? 4 : rssi >= -65 ? 3 : rssi >= -75 ? 2 : rssi >= -85 ? 1 : 0;
  for (int i = 0; i < 4; i++) {
    int h = 2 + i * 2;
    if (i < n) oled->drawBox(x + i * 3, y - h, 2, h);
    else       oled->drawPixel(x + i * 3, y - 1);
  }
}

// Desenha o ecrã. Alterna entre 2 páginas a cada 5 segundos.
void ecraDesenhar(const EcraDados &d) {
  if (!oled) return;
  // Para não "queimar" o OLED: o desenho mexe-se 1 píxel de minuto a minuto.
  int dx = (d.segundos / 60) % 2;
  int pagina = (d.segundos / 5) % 2;

  oled->clearBuffer();
  // Barra de título (invertida)
  oled->setDrawColor(1);
  oled->drawBox(0, 0, 128, 12);
  oled->setDrawColor(0);
  oled->setFont(u8g2_font_6x10_tf);
  oled->drawUTF8(2 + dx, 9, "ORGANIZADOR");
  oled->drawUTF8(74 + dx, 9, pagina == 0 ? "rede" : "uso");
  // indicador de página: bolinha cheia = página atual
  for (int i = 0; i < 2; i++) {
    if (i == pagina) oled->drawDisc(112 + i * 8, 6, 2);
    else             oled->drawCircle(112 + i * 8, 6, 2);
  }
  oled->setDrawColor(1);

  char l[32];
  if (!d.wifiLigado) {
    oled->drawUTF8(dx, 26, "Sem Wi-Fi!");
    oled->drawUTF8(dx, 38, d.rede);
    oled->drawUTF8(dx, 50, "a tentar ligar...");
    oled->drawUTF8(dx, 62, ("ligado " + duracao(d.segundos)).c_str());
    oled->sendBuffer();
    return;
  }

  if (pagina == 0) {
    oled->drawUTF8(dx, 24, d.ip.c_str());
    barrasWifi(112, 24, d.rssi);
    snprintf(l, sizeof(l), "Wi-Fi %d dBm", d.rssi);
    oled->drawUTF8(dx, 36, l);
    snprintf(l, sizeof(l), "Contas: %d", d.contas);
    oled->drawUTF8(dx, 48, l);
    oled->drawUTF8(dx, 60, ("Ligado " + duracao(d.segundos)).c_str());
  } else {
    snprintf(l, sizeof(l), "Pedidos: %lu", (unsigned long)d.pedidos);
    oled->drawUTF8(dx, 23, l);
    snprintf(l, sizeof(l), "Entr. %lu  Grav. %lu", (unsigned long)d.entradas, (unsigned long)d.gravacoes);
    oled->drawUTF8(dx, 33, l);
    snprintf(l, sizeof(l), "Disco %uK  RAM %luK", (unsigned)d.livreKB, (unsigned long)d.ramKB);
    oled->drawUTF8(dx, 43, l);
    if (d.ultimoHa == 0xFFFFFFFF) {
      oled->drawUTF8(dx, 55, "Ainda sem atividade");
    } else {
      oled->drawUTF8(dx, 53, d.ultimo);
      oled->drawUTF8(dx, 63, haQuanto(d.ultimoHa).c_str());
    }
  }
  oled->sendBuffer();
}

#else   // sem ecrã: funções vazias
bool ecraIniciar() { return false; }
void ecraMensagem(const char *, const char * = "", const char * = "") {}
void ecraDesenhar(const EcraDados &) {}
#endif
