/* Organizador · 07-conta.js — Conta no servidor (Raspberry Pi; antes ESP8266) e sincronização
   (os ficheiros js/01…08 são carregados por esta ordem; partilham as mesmas variáveis globais)

   Como funciona a sincronização:
   1. GET /api/data  → dados que estão no servidor;
   2. junta-os com os deste dispositivo, item a item: fica a versão com o updatedAt mais recente
      (os itens apagados também têm updatedAt, por isso apagar passa para os outros dispositivos);
   3. PUT /api/data  → envia o resultado (o servidor substitui tudo o que tinha, por isso a fusão
      é sempre feita aqui, antes de enviar). Se nada mudou, não envia (poupa o servidor).
   Se dois dispositivos sincronizarem ao mesmo tempo, nada se perde: cada um guarda os seus dados
   e volta a juntá-los na sincronização seguinte. */
'use strict';

const ACC_KEY = KEY_PREFIX + 'organizador.conta';
const SYNC_AUTO = KEY_PREFIX + 'organizador.sync.auto';
// Se a app foi aberta a partir do próprio servidor (ex.: http://organizador.local no telemóvel),
// o servidor é esse endereço. No site (github.io), na app de PC e em testes (localhost), é organizador.local.
const DEFAULT_SERVER = /^https?:$/.test(location.protocol) && !/(^|\.)github\.io$|^localhost$|^127\.0\.0\.1$|^\[::1\]$/.test(location.hostname)
  ? location.origin : 'http://organizador.local';
const SERVER_MAX_BYTES = 200 * 1024; // limite prudente (o servidor da Raspberry Pi aceita até 5 MB; a ESP8266 só 200 KB)
const RE_USER = /^[a-z0-9._-]{3,24}$/;

function account() {
  try {
    const a = JSON.parse(localStorage.getItem(ACC_KEY));
    if (a && typeof a.server === 'string') return a;
  } catch (e) { /* ignore */ }
  return { server: DEFAULT_SERVER };
}
const saveAccount = a => localStorage.setItem(ACC_KEY, JSON.stringify(a));
const loggedIn = () => !!account().token;
const syncAutoOn = () => localStorage.getItem(SYNC_AUTO) !== 'off';
const sync = { busy: false, timer: null, dirty: false, applying: false, error: '' };

// "organizador.local", "192.168.0.109", "http://x/" → "http://…" (só http/https, sem caminho)
function normServer(s) {
  s = String(s || '').trim();
  if (!s) return null;
  if (/^[a-z][\w+.-]*:\/\//i.test(s) && !/^https?:\/\//i.test(s)) return null; // ftp://, file://…
  if (!/^https?:\/\//i.test(s)) s = 'http://' + s;
  try {
    const u = new URL(s);
    // "rui" sozinho não é um endereço: tem de ter um ponto (organizador.local, 192.168.0.109) ou ser localhost.
    const h = u.hostname;
    const okHost = h === 'localhost' || h.includes('.') || h.startsWith('[');
    return /^https?:$/.test(u.protocol) && okHost && !h.endsWith('.') ? u.origin : null;
  } catch (e) { return null; }
}

// O site (https) não pode falar com um servidor http: o browser bloqueia ("conteúdo misto").
const blockedByHttps = server => !native && location.protocol === 'https:' && server.startsWith('http:');

/* Pedido ao servidor. Devolve { status, data, error } — status 0 = sem ligação.
   Usa o fetch da janela. Na app de PC, se o fetch falhar, tenta pelo Python (organizador.py).
   (Não é ao contrário porque o macOS pode bloquear o Python na rede local — "Rede local" nas
   definições de privacidade — e o motor da janela não é bloqueado.) */
async function apiCall(server, method, path, { body = null, token = '' } = {}) {
  const url = server + path;
  const text = body === null ? '' : (typeof body === 'string' ? body : JSON.stringify(body));
  let status = 0, raw = '', error = '';
  if (blockedByHttps(server)) error = 'https';
  else {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 10000);
    try {
      const headers = {};
      if (text) headers['Content-Type'] = 'application/json';
      if (token) headers.Authorization = 'Bearer ' + token;
      const r = await fetch(url, { method, headers, body: text || undefined, signal: ctl.signal, cache: 'no-store' });
      status = r.status; raw = await r.text();
    } catch (e) { error = String(e); }
    clearTimeout(to);
  }
  if (!status && native && native.server_request) {
    try {
      const r = JSON.parse(await native.server_request(method, url, token, text));
      status = r.status || 0; raw = r.body || ''; error = r.error || error;
    } catch (e) { /* fica o erro do fetch */ }
  }
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch (e) { /* resposta que não é JSON */ }
  return { status, data, error };
}
const apiError = (r, def) => (r.error === 'https'
  ? 'O site não consegue ligar a um servidor sem HTTPS. Usa a app de PC (ou espera pela ligação segura).'
  : r.status === 0 ? 'Não consegui ligar ao servidor. Confirma o endereço e que estás na mesma rede Wi-Fi.'
    : (r.data && r.data.error) || def);

// Impressão digital dos dados (id + updatedAt + apagado) para saber se há algo a enviar.
function fingerprint(d) {
  return COLLS.map(k => (d[k] || []).map(x => `${x.id}:${x.updatedAt || 0}:${x.deleted ? 1 : 0}`).sort().join(',')).join('|');
}
// Junta os dados do servidor com os locais. Exposta à parte para os testes.
function syncMerge(local, remoteRaw) {
  const remote = sanitizeDb(remoteRaw && typeof remoteRaw === 'object' ? remoteRaw : {}).db;
  const merged = sanitizeDb(merge(local, remote)).db;
  return { merged, changedLocal: fingerprint(merged) !== fingerprint(local), changedRemote: fingerprint(merged) !== fingerprint(remote) };
}

async function syncNow(quiet = true) {
  const a = account();
  if (!a.token || loadFailed) return false;
  if (sync.busy) { sync.dirty = true; return false; }
  // Com um painel aberto, não troco os dados por baixo da edição: volto a tentar daqui a pouco.
  if (quiet && (ui.openTask || ui.openEvent)) { syncSoon(); return false; }
  clearTimeout(sync.timer);
  sync.busy = true; sync.dirty = false; sync.error = '';
  refreshSyncUi();
  let ok = false;
  try {
    const r = await apiCall(a.server, 'GET', '/api/data', { token: a.token });
    if (r.status === 401) return sessionLost();
    if (r.status !== 200 || !r.data || typeof r.data !== 'object' || Array.isArray(r.data)) throw new Error(apiError(r, 'O servidor respondeu com um erro'));
    if (account().token !== a.token) return false; // saiu da conta entretanto
    const { merged, changedLocal, changedRemote } = syncMerge(db, r.data);
    if (changedLocal) {
      db = merged;
      sync.applying = true;
      try { saveLocal(); } finally { sync.applying = false; }
      if (tasks().length || events().length) localStorage.setItem('organizador.onboarded', '1'); // dispositivo novo: sem boas-vindas
      if (!ui.openTask && !ui.openEvent) render();
    }
    if (changedRemote) {
      const text = JSON.stringify({ app: 'organizador', version: APP_VERSION, savedAt: now(), ...merged });
      if (text.length > SERVER_MAX_BYTES) throw new Error('Os dados são demasiado grandes para o servidor (máx. 200 KB).');
      const w = await apiCall(a.server, 'PUT', '/api/data', { body: text, token: a.token });
      if (w.status === 401) return sessionLost();
      if (w.status !== 200) throw new Error(apiError(w, 'O servidor não conseguiu guardar'));
    }
    if (account().token === a.token) saveAccount({ ...account(), lastSync: now() });
    ok = true;
  } catch (e) {
    sync.error = e.message || 'Erro a sincronizar';
    if (!quiet) toast(sync.error);
  } finally {
    sync.busy = false;
    refreshSyncUi();
    if (sync.dirty) syncSoon();
  }
  return ok;
}

// Chamada sempre que os dados mudam (saveLocal): sincroniza uns segundos depois.
function syncSoon(delay = 4000) {
  if (sync.applying || !loggedIn() || !syncAutoOn()) return;
  sync.dirty = true;
  clearTimeout(sync.timer);
  sync.timer = setTimeout(() => syncNow(true), delay);
}

function sessionLost() {
  const a = account();
  saveAccount({ server: a.server, user: a.user });
  sync.error = '';
  toast('A sessão terminou. Entra outra vez na tua conta.', 'Entrar', () => setView('account'));
  if (ui.view === 'account') render();
  return false;
}

/* ------------------------------------------------------------------ estado na interface */
function syncStatusText() {
  const a = account();
  if (!a.token) return 'Sem conta';
  if (sync.busy) return 'A sincronizar…';
  if (sync.error) return 'Não sincronizado: ' + sync.error;
  if (!a.lastSync) return 'Ainda não sincronizado';
  const s = Math.round((now() - a.lastSync) / 1000);
  return 'Sincronizado ' + (s < 60 ? 'agora mesmo' : s < 3600 ? `há ${Math.floor(s / 60)} min` : s < 86400 ? `há ${Math.floor(s / 3600)} h` : `há ${Math.floor(s / 86400)} dia(s)`);
}
function refreshSyncUi() {
  const st = $('#accStatus');
  if (st) { st.textContent = syncStatusText(); st.classList.toggle('bad', !!sync.error); }
  const btn = $('[data-acc-sync]');
  if (btn) btn.disabled = sync.busy;
  const foot = $('#syncFoot');
  if (foot) { foot.title = syncStatusText(); foot.classList.toggle('bad', !!sync.error); foot.classList.toggle('busy', sync.busy); }
}

/* ------------------------------------------------------------------ ecrã Conta */
function viewAccount() {
  const a = account();
  const httpsWarn = blockedByHttps(a.server)
    ? `<div class="notice warn" style="margin:0 0 14px">${icon('shield')}<span>Por agora o <b>site</b> não consegue ligar ao servidor, porque o servidor ainda não tem ligação segura (HTTPS). Usa a <b>app de PC</b>. No telemóvel fica para a próxima versão.</span></div>` : '';
  let content;
  if (a.token) {
    content = `
      <div class="pref-list">
        <div class="pref row-pref"><div><b>${esc(a.user || '')}</b><span>${esc(a.server.replace(/^https?:\/\//, ''))}</span></div>
          <button class="btn ghost" data-acc-logout>Sair</button></div>
        <div class="pref row-pref"><div><b>Sincronização</b><span id="accStatus" class="acc-status">${esc(syncStatusText())}</span></div>
          <button class="btn primary" data-acc-sync>Sincronizar agora</button></div>
        <div class="pref row-pref"><div><b>Sincronizar automaticamente</b><span>Ao abrir a app, depois de cada alteração e a cada 5 minutos.</span></div>
          <button class="switch accent ${syncAutoOn() ? 'on' : ''}" data-acc-auto aria-label="Sincronizar automaticamente"></button></div>
      </div>
      ${httpsWarn ? `<div style="margin-top:14px">${httpsWarn}</div>` : ''}
      <div class="notice" style="margin-top:18px">${icon('cloud')}<span>Os dados deste dispositivo e do servidor são <b>juntados item a item</b>: quando a mesma tarefa foi mudada em dois sítios, fica a alteração mais recente. Sair da conta <b>não apaga</b> as tarefas deste ${native ? 'PC' : 'dispositivo'}.</span></div>`;
  } else {
    const reg = ui.accMode === 'register';
    content = `
      <div class="notice">${icon('cloud')}<span>Com uma conta, as tuas tarefas ficam <b>iguais em todos os dispositivos</b> onde entrares. Por agora o servidor é a Raspberry Pi de casa e só funciona <b>na tua rede Wi-Fi de casa</b>.</span></div>
      ${httpsWarn}
      <div class="seg acc-seg" role="tablist">
        <button class="${reg ? '' : 'on'}" data-acc-mode="login">Entrar</button>
        <button class="${reg ? 'on' : ''}" data-acc-mode="register">Criar conta</button>
      </div>
      <form class="acc-form" id="accForm" autocomplete="on" onsubmit="return false">
        <label>Utilizador<input class="modal-input" id="accUser" name="username" value="${esc(a.user || '')}" placeholder="ex.: ana.silva" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="24"></label>
        <label>Palavra-passe<input class="modal-input" id="accPass" name="password" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}" maxlength="64"></label>
        ${reg ? '<label>Repetir palavra-passe<input class="modal-input" id="accPass2" type="password" autocomplete="new-password" maxlength="64"></label>' : ''}
        <details class="acc-adv"${a.server !== DEFAULT_SERVER ? ' open' : ''}><summary>Servidor: <b id="accServerShow">${esc(a.server.replace(/^https?:\/\//, ''))}</b> · mudar</summary>
          <label>Endereço do servidor<input class="modal-input" id="accServer" value="${esc(a.server.replace(/^http:\/\//, ''))}" placeholder="organizador.local" autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="url"></label>
          <div class="acc-hint">Não é o teu nome: é o endereço do servidor na rede, normalmente <b>organizador.local</b> (ou o IP da Raspberry Pi, ex.: 192.168.0.120).</div>
        </details>
        ${reg ? '<div class="acc-hint">Utilizador: 3 a 24 letras minúsculas, números, ponto, _ ou -. Palavra-passe: pelo menos 6 caracteres, e diferente das que usas noutros sítios (por agora a ligação não é cifrada).</div>' : ''}
        <div class="acc-actions">
          <button type="button" class="btn ghost" data-acc-ping>Testar ligação</button>
          <span id="accPing" class="acc-status"></span>
          <button type="submit" class="btn primary" data-acc-submit>${reg ? 'Criar conta' : 'Entrar'}</button>
        </div>
      </form>`;
  }
  return { top: head('Conta', a.token ? 'Sincronização entre dispositivos' : 'Para ter as tarefas em todos os dispositivos'), content };
}

function accFormServer() {
  const s = normServer($('#accServer') ? $('#accServer').value : account().server);
  if (!s) {
    const d = $('.acc-adv'); if (d) d.open = true;
    toast('Endereço do servidor inválido. Usa organizador.local ou o IP do servidor (ex.: 192.168.0.120).');
  }
  return s;
}

async function accPing() {
  const server = accFormServer();
  const out = $('#accPing');
  if (!server || !out) return;
  out.textContent = 'A testar…'; out.classList.remove('bad');
  const r = await apiCall(server, 'GET', '/api/ping');
  if (!$('#accPing')) return;
  const okSrv = r.status === 200 && r.data && r.data.app === 'organizador';
  out.textContent = okSrv ? `Ligado · servidor ${r.data.version}` : r.status ? 'Isto não é um servidor do Organizador' : apiError(r, '');
  out.classList.toggle('bad', !okSrv);
}

async function accSubmit() {
  if (sync.busy) return;
  const server = accFormServer();
  if (!server) return;
  const reg = ui.accMode === 'register';
  const user = ($('#accUser').value || '').trim().toLowerCase();
  const pass = $('#accPass').value || '';
  if (!RE_USER.test(user)) return toast('Utilizador: 3 a 24 letras minúsculas, números, ponto, _ ou -');
  if (pass.length < 6) return toast('A palavra-passe tem de ter pelo menos 6 caracteres');
  if (reg && pass !== ($('#accPass2').value || '')) return toast('As palavras-passe não são iguais');
  const btn = $('[data-acc-submit]');
  if (btn) { btn.disabled = true; btn.textContent = reg ? 'A criar…' : 'A entrar…'; }
  const r = await apiCall(server, 'POST', reg ? '/api/register' : '/api/login', { body: { user, pass } });
  if (!(r.status === 200 && r.data && r.data.token)) {
    if (btn) { btn.disabled = false; btn.textContent = reg ? 'Criar conta' : 'Entrar'; }
    return toast(apiError(r, reg ? 'Não consegui criar a conta' : 'Não consegui entrar'));
  }
  // Antes de juntar com o servidor pela primeira vez, guardo uma cópia do estado atual.
  // (no máximo 3 s: se o armazenamento do browser estiver pendurado, entra na mesma)
  await Promise.race([makeBackup('Antes de sincronizar'), new Promise(r => setTimeout(r, 3000))]);
  saveAccount({ server, user: r.data.user || user, token: r.data.token });
  ui.accMode = 'login';
  render();
  const ok = await syncNow(false);
  if (ok) toast(reg ? 'Conta criada. As tarefas deste dispositivo já estão no servidor.' : 'Entraste. Tarefas sincronizadas.');
}

async function accLogout() {
  const a = account();
  if (!await dialog({ title: 'Sair da conta?', text: `As tarefas ficam neste ${native ? 'PC' : 'dispositivo'}, mas deixam de ser sincronizadas.`, ok: 'Sair' })) return;
  if (loggedIn() && syncAutoOn()) await syncNow(true); // enviar o que ainda não foi
  apiCall(a.server, 'POST', '/api/logout', { token: a.token }); // apaga a sessão no servidor (sem esperar)
  clearTimeout(sync.timer);
  sync.error = '';
  saveAccount({ server: a.server, user: a.user });
  render();
  toast('Saíste da conta');
}

/* ------------------------------------------------------------------ eventos do ecrã Conta */
document.addEventListener('click', e => {
  const q = s => e.target.closest(s);
  let el;
  if ((el = q('[data-acc-mode]'))) { ui.accMode = el.dataset.accMode; return render(); }
  if (q('[data-acc-ping]')) return accPing();
  if (q('[data-acc-submit]')) { e.preventDefault(); return accSubmit(); }
  if (q('[data-acc-sync]')) return syncNow(false).then(ok => ok && toast('Sincronizado'));
  if (q('[data-acc-logout]')) return accLogout();
  if (q('[data-acc-auto]')) {
    localStorage.setItem(SYNC_AUTO, syncAutoOn() ? 'off' : 'on');
    if (syncAutoOn()) syncNow(true);
    return render();
  }
});
// A linha "Servidor: …" acompanha o que se escreve no campo.
document.addEventListener('input', e => {
  if (e.target.id !== 'accServer') return;
  const show = $('#accServerShow');
  if (show) show.textContent = e.target.value.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '') || '—';
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.closest && e.target.closest('#accForm')) { e.preventDefault(); accSubmit(); }
});

/* ------------------------------------------------------------------ sincronização automática */
function startSync() {
  if (loggedIn() && syncAutoOn()) syncNow(true);
  setInterval(() => { if (loggedIn() && syncAutoOn()) syncNow(true); }, 5 * 60e3);
  setInterval(refreshSyncUi, 30e3);
  // Ao voltar à app (outro separador, telemóvel desbloqueado…), sincroniza se já passou 1 minuto.
  const back = () => {
    const a = account();
    if (document.visibilityState === 'visible' && a.token && syncAutoOn() && now() - (a.lastSync || 0) > 60e3) syncNow(true);
  };
  document.addEventListener('visibilitychange', back);
  addEventListener('focus', back);
}
