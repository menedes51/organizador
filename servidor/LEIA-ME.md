# Servidor do Organizador na Raspberry Pi 5

O servidor guarda as contas e os dados de cada conta, para a app ficar igual em todos os
dispositivos. Substitui a placa ESP8266 (pasta `esp32/`, que fica só como histórico).

| | ESP8266 (antes) | Raspberry Pi 5 (agora) |
|---|---|---|
| Programa | `esp32/organizador_servidor.ino` (Arduino) | `servidor/organizador_servidor.py` (Python, sem bibliotecas extra) |
| Dados por conta | 200 KB | 5 MB |
| Sessões | nunca expiram | expiram ao fim de 180 dias sem uso; só o *hash* fica guardado |
| Palavras-passe erradas | sem limite | 8 erradas → 15 min bloqueada |
| Mudar palavra-passe / apagar conta | não havia | `POST /api/password`, `POST /api/delete` |
| Dois dispositivos a gravar ao mesmo tempo | o último apagava o outro | o servidor também junta item a item |
| Cópias de segurança | não | uma por dia, guarda 14 |
| A app | — | servida em `http://organizador.local` |

A API é a mesma, por isso a app não precisa de mudar nada.

---

## 1. Preparar o cartão (no Mac, uma vez)

Precisas de: a Raspberry Pi 5, um cartão microSD (16 GB ou mais), a fonte de alimentação USB-C
oficial (27 W) e o Mac.

1. Instala o **Raspberry Pi Imager**: https://www.raspberrypi.com/software/
2. Mete o cartão no Mac e abre o Imager:
   - **Dispositivo:** Raspberry Pi 5
   - **Sistema operativo:** *Raspberry Pi OS (other)* → **Raspberry Pi OS Lite (64-bit)**
     (sem ambiente gráfico: chega e gasta menos)
   - **Armazenamento:** o cartão
3. Carrega em **Seguinte** → **Editar definições** e preenche:
   - **Nome do anfitrião (hostname):** `organizador` → a Pi fica em `organizador.local`
   - **Nome de utilizador e palavra-passe:** à tua escolha (ex.: `rui`). Guarda a palavra-passe.
   - **Wi-Fi:** o nome e a palavra-passe da rede de casa; país **PT**
     (a Pi 5 liga a 2,4 GHz e a 5 GHz)
   - **Local:** fuso horário `Europe/Lisbon`, teclado `pt`
   - Separador **Serviços:** ativa **SSH** com palavra-passe
4. **Guardar** → **Sim** → espera que acabe de escrever e verificar.

## 2. Ligar a Pi

1. **Desliga a placa ESP8266** — as duas usariam o mesmo nome `organizador.local`.
2. Mete o cartão na Pi e liga a fonte. Espera **2 a 3 minutos** no primeiro arranque.
3. No Mac, abre o **Terminal** e entra na Pi (troca `rui` pelo teu utilizador):

```bash
ssh rui@organizador.local
```

   Na primeira vez pergunta se confias na máquina: escreve `yes`. Depois, a palavra-passe da Pi
   (não aparece nada enquanto escreves — é normal).

## 3. Instalar o servidor (na Pi, pelo `ssh`)

```bash
sudo apt update && sudo apt install -y git
sudo git clone https://github.com/menedes51/organizador.git /opt/organizador
sudo /opt/organizador/servidor/instalar.sh
```

No fim deve aparecer **✓ Servidor a funcionar**. A partir daqui o servidor arranca sozinho
sempre que a Pi liga.

Confirma no Mac, no browser: http://organizador.local/api/ping

## 4. Usar na app

A conta antiga ficou na ESP8266, por isso no servidor novo cria-se uma conta outra vez.
As tarefas não se perdem: estão no PC e voltam a ser enviadas.

1. App de PC → **Mais → Conta e sincronização** → **Sair** (da conta da ESP8266).
2. **Criar conta**, com o servidor `organizador.local`.
3. Os outros dispositivos: **Entrar** com a mesma conta.

## Manutenção

| Quero… | Na Pi (pelo `ssh`) |
|---|---|
| Atualizar para a versão mais recente do GitHub | `sudo /opt/organizador/servidor/atualizar.sh` |
| Ver se está a funcionar | `systemctl status organizador` |
| Ver o que tem acontecido (contas, gravações, erros) | `sudo journalctl -u organizador -n 50` |
| Reiniciar o servidor | `sudo systemctl restart organizador` |
| Ver as cópias de segurança | `sudo ls -l /var/lib/organizador/copias` |
| Desligar a Pi em segurança | `sudo poweroff` (espera que a luz verde pare antes de tirar a corrente) |

Onde fica tudo: o programa em `/opt/organizador`, os dados em `/var/lib/organizador`
(contas em `contas.json`, sessões em `sessoes.json`, os dados de cada conta em `dados/`).

**Restaurar uma cópia** (substitui as contas e os dados atuais pelos da cópia):

```bash
sudo systemctl stop organizador
sudo tar -xzf /var/lib/organizador/copias/organizador-AAAA-MM-DD.tar.gz -C /var/lib/organizador
sudo systemctl start organizador
```

## Experimentar no Mac (sem a Pi)

```bash
python3 servidor/organizador_servidor.py --port 8790 --dados /tmp/org-dados
```

Na app, usa o servidor `localhost:8790`. Testes do servidor:

```bash
python3 -m unittest servidor/test_servidor.py -v
```

## Próximos passos

- **Reservar o IP da Pi no router** (para o endereço nunca mudar).
- **HTTPS para o telemóvel**: o site da app é `https` e o servidor é `http`, por isso o browser do
  telemóvel bloqueia a ligação. Duas maneiras:
  - **já hoje, em casa:** abrir a app no telemóvel em `http://organizador.local` (servida pela Pi).
    (Alguns Android não encontram nomes `.local`: aí usa o IP da Pi, ex. `http://192.168.0.120`.)
    Funciona e sincroniza, mas é outra "origem": o Android não a deixa instalar como app, e as
    tarefas desse separador são diferentes das da app instalada (a conta junta-as).
  - **a sério, em qualquer sítio:** um túnel **Cloudflare** (`cloudflared`) a correr na própria Pi,
    que dá um endereço `https://…` ao servidor. Com um domínio próprio (~10 €/ano) o endereço é fixo.
