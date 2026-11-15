# Registo de alterações — Organizador

Todas as mudanças à app ficam registadas aqui, da mais recente para a mais antiga.

---

## v4.2.2 — 15 nov 2026 · Servidor testado numa placa a sério

### Novo
- O servidor (versão **0.2-beta**) passa a funcionar também em **ESP8266** (ex.: NodeMCU / ideaspark com OLED), com o mesmo ficheiro `.ino`. Foi testado numa ESP8266 ideaspark: criar conta, entrar, guardar e ler dados, e os dados continuam lá depois de reiniciar a placa.

### Corrigido
- As respostas da API indicam agora `charset=utf-8`, e os acentos (ex.: "Física") já não aparecem trocados.
- `ArduinoJson.h` é incluído antes de `AsyncJson.h`, a ordem que a biblioteca exige.

### Alterado
- README: como compilar e enviar com o `arduino-cli`, como impedir que o `config.h` com a palavra-passe entre num commit, e o truque da pasta de compilação curta no Windows.

---

## v4.2.1 — 15 nov 2026 · Projeto completo no GitHub

### Alterado
- O repositório **menedes51/organizador** passou a ter **todo o projeto**: a app (`static/`), a app de PC, o servidor do ESP32 com o guia em PDF, este registo, o QR code e um README.
- O site passa a ser publicado **automaticamente** a partir da pasta `static/` (GitHub Actions). O endereço continua o mesmo.
- `publicar.sh` passou a enviar o projeto inteiro com uma descrição: `./publicar.sh "o que mudou"`. Recusa publicar se o `config.h` do ESP32 tiver a palavra-passe do Wi-Fi.

### Segurança
- As tuas tarefas (`dados.json`), a pasta `.venv` e as configurações locais **nunca** são enviadas (`.gitignore`).

---

## v4.2 — 15 nov 2026 · Voltar atrás, temas e atalhos

### Novo
- **Botão "‹ Voltar"** no topo das páginas a que chegas a partir de outra: disciplina, trabalho de grupo, lista, Aparência, Horário, e no telemóvel também Disciplinas, Estatísticas e Próximos. Mostra o nome da página para onde volta (ex.: "‹ Disciplinas").
- **Gesto/botão de voltar do telemóvel**: fecha primeiro o painel que estiver aberto e depois recua página a página, em vez de fechar a app.
- **"‹ Tarefa" / "‹ Aula"** no topo do painel de edição, para fechar e voltar.
- **9 temas:** Automático, Claro, Escuro, Preto puro (ideal para ecrãs OLED), Meia-noite, Floresta, Areia, Lavanda e Menta.
- **Página Aparência** (Mais → Temas e personalização, ou no menu de tema do PC → "Mais temas e personalização…"):
  - tema com pré-visualização e cor de destaque;
  - **tamanho do texto** (pequeno, normal, grande);
  - **densidade** (normal, compacta);
  - **cantos** (arredondados, retos);
  - **abrir a app em**: onde fiquei, Hoje, Calendário, Trabalhos, Disciplinas ou Foco;
  - pré-visualização ao vivo das tarefas.
- **Atalhos no ícone (telemóvel):** manténs o dedo no ícone do Organizador e aparecem "Nova tarefa", "Hoje", "Calendário" e "Foco".
  - No Android pode demorar até um dia a aparecer, ou aparece logo se reinstalares a app.
  - Widgets no ecrã principal não são possíveis numa web app; precisariam de uma versão nativa.

### Corrigido
- App de PC: o tema, a cor de destaque e as preferências não ficavam guardados depois de fechar a app.

---

## v4.1 — 14 nov 2026 · Trabalhos de grupo, disciplinas, notas e subtarefas

### Novo
- **Trabalhos de grupo** (novo separador "Trabalhos"):
  - cada trabalho tem nome, disciplina, data de entrega e membros do grupo;
  - **quadro com três colunas** (Por fazer / Em curso / Feito): arrastas os tópicos entre colunas e para mudar a ordem (no telemóvel, manténs o dedo e arrastas);
  - **tópicos com responsável opcional**: escreve "Diagrama de classes @rita" e fica atribuído à Rita; também percebe datas ("… sexta");
  - filtro por pessoa, contagem de tópicos por membro e barra de progresso;
  - "Arquivar (entregue)" para trabalhos terminados.
- **Disciplinas:**
  - página por disciplina com a próxima aula, exames, tarefas, notas e horário;
  - as aulas do Horário criam e ligam a disciplina automaticamente;
  - as tarefas, aulas e trabalhos ganham a cor da disciplina;
  - novo botão **Disciplina** ao adicionar, ou "#álgebra" no texto; ao escolher uma disciplina, a data passa a ser a da **próxima aula**.
- **Notas e médias:**
  - regista avaliações com nota, escala (ex.: /20) e peso (%), na página da disciplina ou no detalhe de um exame;
  - **média por disciplina** (ponderada pelos pesos) e **média geral** (ponderada por ECTS se os definires);
  - as notas negativas aparecem a vermelho.
- **Subtarefas:** divide uma tarefa em passos no detalhe (Enter para adicionar). A lista mostra o progresso (ex.: 2/4).
- **Boas-vindas** na primeira vez que alguém abre a app: tema, cor, vista compacta e as suas disciplinas.
- **Tema automático:** segue o modo claro/escuro do sistema. É agora o padrão para quem nunca escolheu.
- **Vista compacta:** mostra mais tarefas no ecrã.
- **Semana deslizável no telemóvel:** a vista Semana mostra a grelha de horas e deslizas entre os dias, com as horas e os dias sempre visíveis.

### Alterado
- O botão de tema passou a abrir o menu **Aparência** (claro / escuro / automático, cor de destaque, vista compacta).
- Telemóvel: a barra de baixo é agora **Hoje, Calendário, Trabalhos, Foco, Mais**. "Próximos" e "Disciplinas e notas" passaram para Mais.
- PC: na barra lateral, "Trabalhos" e uma secção "Disciplinas" com a média de cada uma.
- A pesquisa encontra também disciplinas, trabalhos, responsáveis e subtarefas.
- As cópias exportadas incluem as disciplinas, os trabalhos e as notas.

---

## v4.0 — 14 nov 2026 · Horário, eventos, exames, foco e estatísticas

### Novo
- **Horário das aulas:**
  - nova vista **Horário** no Calendário, ao lado de Dia / Semana / Mês;
  - mostra a semana de segunda a sexta (e o fim de semana se tiveres aulas nesses dias);
  - **+ Aula**, ou um clique numa hora vazia da grelha, cria uma aula nesse dia e hora;
  - cada aula tem disciplina, sala, dias da semana, hora de início e de fim, e data de fim (por omissão, daqui a ~4 meses);
  - por baixo da grelha aparece a lista "As tuas aulas".
- **Eventos recorrentes** (sem caixa de check, ao contrário das tarefas):
  - repetição: todos os dias, dias úteis, dias da semana à escolha, ou todos os meses;
  - data de fim opcional;
  - ao eliminar um evento recorrente escolhes "só este dia" ou "todas as repetições";
  - aparecem na grelha do calendário, nos pontos do mês e na **Agenda de hoje**;
  - criam-se com o botão **Evento** ao adicionar.
- **Exames e prazos:**
  - botão **Exame** ao criar uma tarefa, ou interruptor no detalhe;
  - em **Hoje**, cartões com a contagem decrescente ("faltam 6 dias") para os próximos 30 dias;
  - no calendário, os dias com exame têm um círculo vermelho.
- **Datas por texto:** escreves a data e a hora na própria frase e a app percebe:
  - "amanhã 14h", "sexta às 20h30", "dia 20", "25/11", "3 de dezembro", "em 3 dias", "próxima segunda", "depois de amanhã";
  - "#social" escolhe a categoria e "!" marca como importante;
  - as palavras "exame" e "teste" marcam como exame;
  - por baixo aparece "Percebi: …" e as palavras da data saem do título.
- **Temporizador de foco (Pomodoro):**
  - 25 min de foco, 5 de pausa e 15 de pausa longa a cada 4 sessões, tudo ajustável;
  - podes associar uma tarefa, e no detalhe da tarefa há um botão **Focar**;
  - aviso com som e notificação no fim de cada fase;
  - um pequeno indicador mostra o tempo restante quando estás noutra página;
  - o tempo de foco fica registado.
- **Estatísticas:**
  - concluídas nos últimos 7 dias (comparando com a semana anterior), taxa de conclusão, sequência de dias e tempo de foco;
  - gráfico de tarefas concluídas por dia (14 dias, também em tabela), tempo de foco por dia e concluídas por categoria.
- **Repetições mais flexíveis nas tarefas:** "Dias da semana…" (ex.: terças e quintas) e "Todos os meses".
- **Deslizar no telemóvel:** para a direita conclui a tarefa, para a esquerda adia para amanhã (com Desfazer).
- **Ordenar à mão** as tarefas de uma lista, arrastando pela pega ⋮⋮ à direita.
- **"Mover tudo para hoje"** na secção Em atraso (com Desfazer).
- **Cor de destaque à escolha:** índigo, azul, verde, laranja, rosa, violeta ou grafite. Fica no menu ⋯ (PC) ou em Mais (telemóvel).

### Alterado
- **Animações subtis:** a tarefa desliza para fora ao ser concluída, as tarefas novas aparecem com um realce e as páginas entram suavemente. Desligam-se se o sistema pedir "reduzir movimento".
- Telemóvel: a barra de baixo tem agora 5 separadores (Hoje, Próximos, Calendário, Foco, Mais). "Listas" passou a chamar-se **Mais** e inclui Estatísticas, Foco, Dados e Aparência.
- PC: Foco e Estatísticas na barra lateral.
- As cópias exportadas incluem agora também os eventos, as aulas e as sessões de foco.

---

## v3.2 — 14 nov 2026 · Pesquisa, lembretes e arrastar no calendário

### Novo
- **Pesquisar tarefas:**
  - "Procurar" no topo da barra lateral (PC), ou a lupa no canto de cada página (telemóvel); tecla `/` no PC;
  - procura em títulos, notas, listas e categorias, sem ligar a acentos nem a maiúsculas ("algebra" encontra "Álgebra");
  - destaca o texto encontrado e separa "Por fazer" de "Concluídas".
- **Lembretes:**
  - no detalhe da tarefa, novo campo **Lembrete**: à hora, 5, 15 ou 30 min antes, 1 h antes ou 1 dia antes (só aparece quando a tarefa tem data e hora);
  - no PC aparece uma notificação do macOS com som; no telemóvel e no browser uma notificação do sistema, que pede autorização da primeira vez;
  - tocar na notificação abre a app;
  - as tarefas com lembrete mostram um sininho.
  - Limitação: no telemóvel o lembrete só dispara com a app aberta ou em segundo plano recente. As web apps não podem acordar o telemóvel sozinhas.
- **Arrastar tarefas no calendário** (vistas Dia e Semana):
  - no PC, clica e arrasta o bloco para outra hora ou outro dia;
  - no telemóvel, mantém o dedo no bloco por um instante e depois arrasta;
  - encaixa de 15 em 15 minutos e mostra a hora nova enquanto arrastas.
- **Número da versão visível:** no fundo da barra lateral (PC) e em Listas (telemóvel), para confirmar que a atualização chegou.

---

## v3.1 — 14 nov 2026 · Versão de telemóvel publicada online

### Novo
- **A versão de telemóvel está publicada** em https://menedes51.github.io/organizador/ (GitHub Pages, com HTTPS):
  - no Android aparece **"Instalar"** a sério (Chrome → ⋮ → Instalar app), e no iPhone usa-se Safari → Partilhar → Adicionar ao ecrã principal;
  - depois de instalada, a app abre mesmo sem internet;
  - as tarefas ficam só no telemóvel e nunca são enviadas para o GitHub.
- **`publicar.sh`**: publica as alterações da app no site com um único comando (`./publicar.sh`). Só envia a pasta `static/`.

---

## v3.0 — 13 nov 2026 · Apps independentes, sem servidor

O PC e o telemóvel passam a ter cada um a sua app, independente, sem servidor nem sincronização.

### Novo
- **App de secretária para o PC** (`organizador.py`):
  - abre numa **janela própria** "Organizador", sem browser;
  - abre-se com duplo clique em **Organizador.app**;
  - as tarefas ficam no ficheiro `dados.json` desta pasta.
- **Exportar / Importar cópia** das tarefas, num ficheiro `.json`:
  - no PC, no botão ⋯ do canto inferior da barra lateral; no telemóvel, em Listas → Dados;
  - serve para fazer cópias de segurança e para passar tarefas de um dispositivo para o outro;
  - importar **junta** as tarefas da cópia às que já existem e não apaga nada.
- **Ambiente Python próprio da app** (pasta `.venv`, com `pywebview`), separado do teu Python principal.

### Alterado
- O telemóvel e o browser guardam as tarefas no próprio dispositivo.
- O rodapé da barra lateral mostra onde estão guardados os dados ("Guardado neste PC" / "neste dispositivo").
- O Organizador.app abre a janela da app em vez do browser.

### Removido
- O servidor (`server.py`) e a sincronização automática entre o PC e o telemóvel.
- O ponto/estado de sincronização.

### Dados
- As tarefas que já estavam no PC (`dados.json`) passam para a app de PC sem perder nada.

---

## v2.1 — 13 nov 2026 · Instalar a app, vistas do calendário e horas

### Novo
- **Calendário com vistas Dia, Semana e Mês**, escolhidas no seletor ao lado do título.
  - **Dia:** grelha de horas com as tarefas em blocos, do tamanho da duração, e uma linha vermelha na hora atual. As tarefas sem hora aparecem em baixo.
  - **Semana:** no PC, grelha de 7 dias × horas, com uma linha de cima para as tarefas sem hora. No telemóvel, uma faixa com os 7 dias e a lista do dia escolhido.
  - **Mês:** a vista de antes.
  - As setas avançam um dia, uma semana ou um mês, conforme a vista.
  - **Clicar numa hora vazia** prepara uma tarefa para esse dia e essa hora.
  - Os blocos têm um círculo para concluir a tarefa diretamente na grelha.
- **Hora ao criar uma tarefa:** novo botão "Hora" com horas rápidas (08:00 a 21:00), "Outra hora" e "Sem hora".
- **Duração** da tarefa (15 min a 4 h) no painel de detalhe. Define o tamanho do bloco no calendário (1 h por omissão).
- **Instalar a app:**
  - botão "Instalar app" (ícone de download na barra lateral, ou em Listas no telemóvel);
  - a app guarda os seus ficheiros e abre mesmo sem rede no PC (service worker);
  - no iPhone e no Android aparecem instruções para adicionar ao ecrã principal.
- **Organizador.app (Mac):** com um duplo clique liga o servidor em segundo plano e abre a app, sem precisares do Spyder. Se a app tiver sido instalada pelo Chrome ou Edge, abre essa janela.

### Alterado
- A vista Semana no PC usa mais largura do ecrã.

---

## v2.0.1 — 13 nov 2026 · Arrumação da pasta

### Alterado
- A v2 passou para a raiz da pasta `claude`: `server.py`, `static/` e este registo deixaram de estar dentro de `organizador/`.
- Os dados passam a ficar em `claude/dados.json`.

### Removido
- O ficheiro da v1 (`organizador.py`, app desktop PyQt).

---

## v2.0 — 13 nov 2026 · Web app híbrida (PC + telemóvel)

A app foi refeita de raiz como **web app**: o mesmo código corre no browser do PC e instala-se no telemóvel como app (ícone no ecrã inicial).

### Novo
- **Funciona no telemóvel e no PC**, com layout próprio para cada um:
  - PC: barra lateral com vistas, listas e categorias; painel lateral de detalhe.
  - Telemóvel: barra de separadores em baixo, botão **+** flutuante e folhas que sobem do fundo do ecrã.
- **Sincronização entre dispositivos** através de um pequeno servidor no PC (`server.py`, sem instalar nada). As alterações feitas num dispositivo aparecem no outro em poucos segundos.
- **Funciona offline:** cada dispositivo guarda uma cópia local e sincroniza quando volta a ter ligação. O estado aparece no canto ("Sincronizado" / "Offline").
- **Instalável:** no iPhone usa Partilhar → "Adicionar ao ecrã principal"; no Android usa o menu ⋮ → "Instalar app".
- Vista **Próximos**: tarefas dos próximos 14 dias, agrupadas por dia, mais "Mais tarde" e "Sem data".
- **Tema claro e escuro** (segue o sistema e pode ser trocado).
- **Desfazer** ao eliminar uma tarefa.
- Atalhos no PC: `N` ou `Ctrl/Cmd+K` para nova tarefa; `Esc` para fechar.

### Alterado
- **Design limpo e sóbrio:** sem emojis, com ícones de linha, cores neutras e categorias distinguidas por um ponto de cor discreto.
- **Criar tarefas é mais simples:** escreves e carregas Enter. Por baixo há opções rápidas (Data, Categoria, Lista, Importante) com valores automáticos conforme a vista: em "Hoje" fica para hoje, no calendário fica para o dia selecionado e numa lista vai para essa lista.
- **Editar tarefas:** tocas na tarefa e abre um painel onde tudo se guarda automaticamente (título, notas, data, hora, categoria, lista, repetição, importante).
- Listas e categorias criam-se, renomeiam-se e eliminam-se com diálogos próprios (em vez de janelas do sistema).

### Removido
- Tarefas de exemplo: a app começa vazia.
- Anel de progresso, contador de dias seguidos e página Resumo. Foram substituídos por uma barra de progresso discreta em "Hoje".

### Dados
- As tarefas ficavam em `organizador/dados.json` no PC e em cada dispositivo (armazenamento do browser).
- Os dados da v1 (`~/organizador_dados.json`) não são importados.

---

## v1.0 — 13 nov 2026 · App desktop (PyQt)

Primeira versão: app de secretária em Python/PyQt5 (`organizador.py`).

- Vistas Hoje, Listas (tabs), Calendário e Resumo.
- Categorias Faculdade, Social, Pessoal, Trabalho e Outros, com cor e emoji.
- Tarefas com data, hora, prioridade, notas e repetição.
- Anel de progresso diário, contador de dias seguidos e gráfico semanal.
- Dados em `~/organizador_dados.json`.
