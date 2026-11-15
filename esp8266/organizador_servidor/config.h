// ===========================================================================
//  Organizador — configuração do servidor (ESP8266)
//  Muda só as duas linhas da rede Wi-Fi. A rede tem de ser de 2,4 GHz
//  (o ESP8266 não liga a redes de 5 GHz).
//  NUNCA envies este ficheiro para o GitHub com a palavra-passe verdadeira.
// ===========================================================================
#pragma once

#define WIFI_SSID     "NOME_DA_TUA_REDE"
#define WIFI_PASSWORD "PALAVRA_PASSE_DA_REDE"

// Nome na rede: o servidor fica em http://organizador.local
#define HOSTNAME      "organizador"

// Tamanho máximo dos dados de cada conta (bytes). 200 KB chega para milhares de tarefas.
#define MAX_DATA_BYTES (200 * 1024)
