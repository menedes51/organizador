/* Organizador · 05-dados.js — Exportar/importar, cópias de segurança, calendário (.ics), partilha e app de PC
   (os ficheiros js/01…07 são carregados por esta ordem; partilham as mesmas variáveis globais) */
'use strict';

/* ------------------------------------------------------------------ export / import */
async function saveFile(name, text, mime) {
  if (native) return native.export_file(text, name);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: mime }));
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return true;
}

async function exportData() {
  const text = JSON.stringify({ app: 'organizador', version: APP_VERSION, exportedAt: new Date().toISOString(), ...db }, null, 1);
  if (!await saveFile(`organizador-${today()}.json`, text, 'application/json')) return;
  localStorage.setItem(EXP_LAST, String(now()));
  toast(native ? 'Cópia guardada' : 'Cópia descarregada');
  if (ui.view === 'backups') render();
}

async function importData() {
  let text;
  if (native) text = await native.import_file();
  else {
    text = await new Promise(res => {
      const i = document.createElement('input');
      i.type = 'file'; i.accept = '.json,application/json';
      i.onchange = () => (i.files[0] ? i.files[0].text().then(res) : res(null));
      i.click();
    });
  }
  if (!text) return;
  try {
    const d = JSON.parse(text);
    if (!d || !Array.isArray(d.tasks)) throw new Error('bad');
    const { db: clean, dropped } = sanitizeDb(d);
    await makeBackup('Antes de importar');
    const before = tasks().length;
    db = merge(db, clean);
    commit();
    const n = tasks().length - before;
    toast((n ? `Importadas ${n} tarefa${n === 1 ? '' : 's'}` : 'Nada de novo para importar') + (dropped ? ` · ${dropped} item(ns) inválido(s) ignorado(s)` : ''));
  } catch (e) {
    toast('Este ficheiro não é uma cópia do Organizador');
  }
}

function dataMenu(anchor) {
  openMenu(anchor, [
    { label: 'Cópias de segurança…', icon: 'shield', onClick: () => setView('backups') },
    { label: 'Exportar cópia', icon: 'upload', onClick: exportData },
    { label: 'Importar cópia', icon: 'download', onClick: importData },
    { label: 'Exportar para o calendário (.ics)', icon: 'calendar', onClick: exportIcsAll },
    { sep: true },
    { label: 'Cor de destaque…', icon: 'palette', onClick: () => accentMenu(anchor) },
  ]);
}

/* ------------------------------------------------------------------ cópias de segurança automáticas
   Telemóvel / browser: guardadas no próprio dispositivo (IndexedDB), separadas dos dados em uso.
   App de PC: ficheiros na pasta backups/, ao lado da app. */
const BK_ON = KEY_PREFIX + 'organizador.backup', BK_LAST = KEY_PREFIX + 'organizador.backup.last';
const EXP_LAST = KEY_PREFIX + 'organizador.export.last', EXP_NAG = KEY_PREFIX + 'organizador.export.nag', FIRST_RUN = KEY_PREFIX + 'organizador.first';
const backupsOn = () => localStorage.getItem(BK_ON) !== 'off';
function idbOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(KEY_PREFIX + 'organizador-backups', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('snaps', { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
const idbRun = (mode, fn) => idbOpen().then(d => new Promise((res, rej) => {
  const tx = d.transaction('snaps', mode);
  const rq = fn(tx.objectStore('snaps'));
  tx.oncomplete = () => { d.close(); res(rq && rq.result); };
  tx.onerror = tx.onabort = () => { d.close(); rej(tx.error); };
}));
const backupStore = {
  async list() {
    if (native) return JSON.parse(await native.backup_list());
    const all = await idbRun('readonly', st => st.getAll());
    return all.map(({ data, ...meta }) => meta).sort((x, y) => y.id - x.id);
  },
  async add(meta, text) { return native ? native.backup_save(JSON.stringify(meta), text) : idbRun('readwrite', st => st.put({ ...meta, data: text })); },
  async get(id) {
    if (native) return native.backup_read(String(id));
    const r = await idbRun('readonly', st => st.get(Number(id)));
    return r ? r.data : null;
  },
  async remove(id) { return native ? native.backup_delete(String(id)) : idbRun('readwrite', st => st.delete(Number(id))); },
};

async function makeBackup(label, auto = false) {
  try {
    if (!(tasks().length + events().length + subjects().length + projects().length)) return false;
    await backupStore.add({ id: now(), date: today(), label: String(label || ''), auto, tasks: tasks().length }, JSON.stringify(db));
    if (auto) localStorage.setItem(BK_LAST, today());
    const all = await backupStore.list();
    // guarda as últimas 7 automáticas e as últimas 10 manuais
    for (const old of [...all.filter(x => x.auto).slice(7), ...all.filter(x => !x.auto).slice(10)]) await backupStore.remove(old.id);
    return true;
  } catch (e) { return false; }
}
async function autoBackup() {
  if (!backupsOn() || loadFailed || localStorage.getItem(BK_LAST) === today()) return;
  await makeBackup('Automática', true);
}
async function restoreBackup(id) {
  const text = await backupStore.get(id);
  if (!text) return toast('Não encontrei esta cópia');
  if (!await dialog({ title: 'Restaurar esta cópia?', text: 'Os dados atuais são substituídos pelos desta cópia. Antes disso guardo uma cópia do estado atual, para poderes voltar atrás.', ok: 'Restaurar' })) return;
  let clean;
  try { clean = sanitizeDb(JSON.parse(text)).db; } catch (e) { return toast('Esta cópia está danificada'); }
  await makeBackup('Antes de restaurar');
  db = clean;
  loadFailed = false;
  commit();
  toast('Cópia restaurada');
}
function exportNag() {
  if (native) return;
  if (!localStorage.getItem(FIRST_RUN)) localStorage.setItem(FIRST_RUN, String(now()));
  const ref = Number(localStorage.getItem(EXP_LAST) || localStorage.getItem(FIRST_RUN));
  const days = Math.floor((now() - ref) / 864e5);
  if (tasks().length < 5 || days < 14 || now() - Number(localStorage.getItem(EXP_NAG) || 0) < 7 * 864e5) return;
  localStorage.setItem(EXP_NAG, String(now()));
  toast(`Há ${days} dias que não guardas uma cópia num ficheiro`, 'Guardar', exportData);
}

function viewBackups() {
  const last = Number(localStorage.getItem(EXP_LAST) || 0);
  const lastTxt = last ? (dayOf(last) === today() ? 'hoje' : `há ${Math.max(1, Math.floor((now() - last) / 864e5))} dia(s)`) : 'nunca';
  const where = native
    ? 'As cópias ficam na pasta <b>backups</b>, ao lado da app, neste PC.'
    : 'As cópias ficam <b>neste dispositivo</b>, dentro da app. Se desinstalares a app ou limpares os dados do browser, perdem-se com ela — por isso guarda de vez em quando uma cópia <b>num ficheiro</b> (Google Drive, email…).';
  const content = `
    <div class="notice">${icon('shield')}<span>${where}</span></div>
    <div class="pref-list">
      <div class="pref row-pref"><div><b>Cópias automáticas</b><span>Uma por dia. Guardo as últimas 7.</span></div>
        <button class="switch accent ${backupsOn() ? 'on' : ''}" data-bk-toggle aria-label="Cópias automáticas"></button></div>
      <div class="pref row-pref"><div><b>Guardar num ficheiro</b><span>Última vez: ${lastTxt}</span></div>
        <span class="btn-row"><button class="btn ghost" data-import>Importar</button><button class="btn primary" data-export>Exportar</button></span></div>
      ${native ? '' : `<div class="pref row-pref"><div><b>Proteger o armazenamento</b><span id="persistState">A verificar…</span></div>
        <button class="btn ghost" data-persist id="persistBtn" hidden>Proteger</button></div>`}
    </div>
    <div class="section" style="margin-top:22px">
      <div class="section-title">Cópias guardadas<button class="sec-action" data-bk-now>+ Criar cópia agora</button></div>
      <div id="backupList"><div class="empty" style="padding:10px">A carregar…</div></div>
    </div>`;
  return { top: head('Cópias de segurança', 'Para nunca perderes as tuas tarefas'), content };
}
async function fillBackups() {
  if (!$('#backupList')) return;
  let all = null;
  try { all = await backupStore.list(); } catch (e) { /* sem acesso ao armazenamento */ }
  const el = $('#backupList');
  if (!el) return;
  el.innerHTML = all === null ? '<div class="empty" style="padding:10px">Este browser não permite guardar cópias aqui. Usa "Exportar".</div>'
    : !all.length ? '<div class="empty" style="padding:10px">Ainda não há cópias. A primeira é criada automaticamente hoje.</div>'
      : all.map(x => {
        const d = new Date(Number(x.id));
        return `<div class="bk-row"><div><b>${fmtLong(iso(d))} · ${z(d.getHours())}:${z(d.getMinutes())}</b>
          <span>${esc(x.label || (x.auto ? 'Automática' : 'Manual'))} · ${Number(x.tasks) || 0} tarefa(s)</span></div>
          <button class="btn ghost" data-bk-restore="${Number(x.id)}">Restaurar</button>
          <button class="icon-btn" data-bk-del="${Number(x.id)}" title="Apagar esta cópia">${icon('trash')}</button></div>`;
      }).join('');
  const ps = $('#persistState');
  if (ps) {
    const ok = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null;
    ps.textContent = ok === null ? 'Não disponível neste browser' : ok ? 'Ativo: o browser não apaga os dados sozinho' : 'Desligado: o browser pode apagar os dados se faltar espaço';
    const btn = $('#persistBtn');
    if (btn) btn.hidden = ok !== false;
  }
}

/* ------------------------------------------------------------------ calendário do telemóvel / PC (.ics)
   Um ficheiro .ics abre no Google Calendar, Calendário da Apple, Outlook…
   É o calendário do sistema que toca o alarme, mesmo com o Organizador fechado. */
const icsEsc = v => String(v || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');
const icsD = d => d.replace(/-/g, '');
const icsDT = (d, t) => `${icsD(d)}T${t.replace(':', '')}00`;
const icsStamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const icsAlarm = (trigger, text) => ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(text)}`, `TRIGGER:${trigger}`, 'END:VALARM'];
function icsTask(t) {
  if (!t.date) return [];
  const L = ['BEGIN:VEVENT', `UID:${t.id}@organizador`, `DTSTAMP:${icsStamp()}`, `SUMMARY:${icsEsc(t.title)}`];
  if (t.time) {
    const end = toMin(t.time) + (t.duration || 60);
    L.push(`DTSTART:${icsDT(t.date, t.time)}`, `DTEND:${icsDT(end >= 1440 ? addDays(t.date, 1) : t.date, fromMin(end % 1440))}`);
  } else L.push(`DTSTART;VALUE=DATE:${icsD(t.date)}`, `DTEND;VALUE=DATE:${icsD(addDays(t.date, 1))}`);
  const desc = [t.notes, subjectById(t.subject) ? 'Disciplina: ' + subjectById(t.subject).name : '', ...(t.subtasks || []).map(x => `${x.done ? '[x]' : '[ ]'} ${x.title}`)].filter(Boolean).join('\n');
  if (desc) L.push(`DESCRIPTION:${icsEsc(desc)}`);
  if (t.time && t.remind != null) L.push(...icsAlarm(`-PT${t.remind}M`, t.title));
  else if (t.exam) L.push(...icsAlarm(t.time ? '-P1D' : '-PT15H', t.title)); // exame: aviso na véspera
  else if (!t.time) L.push(...icsAlarm('PT9H', t.title)); // tarefa sem hora: aviso às 9:00 do próprio dia
  L.push('END:VEVENT');
  return L;
}
function icsEvent(ev) {
  let first = null;
  for (let i = 0, d = ev.date; i < 400 && !first; i++, d = addDays(d, 1)) if (occursOn(ev, d)) first = d;
  if (!first) return [];
  const r = ev.repeat || {};
  const L = ['BEGIN:VEVENT', `UID:${ev.id}@organizador`, `DTSTAMP:${icsStamp()}`, `SUMMARY:${icsEsc(ev.title || (ev.isClass ? 'Aula' : 'Evento'))}`];
  if (ev.time) {
    const end = ev.end && toMin(ev.end) > toMin(ev.time) ? ev.end : fromMin(Math.min(toMin(ev.time) + 60, 1439));
    L.push(`DTSTART:${icsDT(first, ev.time)}`, `DTEND:${icsDT(first, end)}`);
  } else L.push(`DTSTART;VALUE=DATE:${icsD(first)}`, `DTEND;VALUE=DATE:${icsD(addDays(first, 1))}`);
  const BY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const days = (r.days && r.days.length) ? r.days : [parseISO(ev.date).getDay()];
  const rule = { daily: 'FREQ=DAILY', weekdays: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', weekly: `FREQ=WEEKLY;BYDAY=${days.map(d => BY[d]).join(',')}`, monthly: 'FREQ=MONTHLY' }[r.freq];
  if (rule) L.push(`RRULE:${rule}${r.until ? `;UNTIL=${icsD(r.until)}T235959` : ''}`);
  for (const x of (ev.exceptions || [])) L.push(ev.time ? `EXDATE:${icsDT(x, ev.time)}` : `EXDATE;VALUE=DATE:${icsD(x)}`);
  if (ev.location) L.push(`LOCATION:${icsEsc(ev.location)}`);
  if (ev.notes) L.push(`DESCRIPTION:${icsEsc(ev.notes)}`);
  if (ev.time && !ev.isClass) L.push(...icsAlarm('-PT30M', ev.title));
  L.push('END:VEVENT');
  return L;
}
const icsFile = blocks => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Organizador//PT', 'CALSCALE:GREGORIAN', ...blocks.flat(), 'END:VCALENDAR']
  .map(line => line.replace(/(.{70})(?=.)/gu, '$1\r\n ')).join('\r\n') + '\r\n';
async function exportIcs(blocks, name) {
  blocks = blocks.filter(x => x.length);
  if (!blocks.length) return toast('Nada com data para pôr no calendário');
  if (!await saveFile(name, icsFile(blocks), 'text/calendar')) return;
  toast(native ? 'Ficheiro guardado. Abre-o para o adicionar ao calendário.' : 'Abre o ficheiro descarregado para o adicionar ao calendário');
}
function exportIcsOpen() {
  if (ui.openTask) { const t = taskById(ui.openTask); if (t) exportIcs([icsTask(t)], 'tarefa.ics'); }
  else if (ui.openEvent) { const ev = eventById(ui.openEvent.id); if (ev) exportIcs([icsEvent(ev)], 'evento.ics'); }
}
function exportIcsAll() {
  const T = today();
  exportIcs([...tasks().filter(t => !t.done && t.date && t.date >= T).map(icsTask), ...events().map(icsEvent)], `organizador-${T}.ics`);
}

/* ------------------------------------------------------------------ partilhar resumo de um trabalho */
function projectSummary(p) {
  const ts = sortManual(tasks().filter(t => t.project === p.id));
  const line = t => `  ${t.done ? '[x]' : '[ ]'} ${t.title}${topicStatus(t) === 'doing' ? ' (em curso)' : ''}${t.date ? ' — ' + fmtDay(t.date).toLowerCase() : ''}`;
  const out = [p.name.toUpperCase()];
  const sub = subjectById(p.subject);
  if (sub) out.push(sub.name);
  if (p.due) out.push(`Entrega: ${fmtLong(p.due).toLowerCase()}`);
  out.push(`${ts.filter(t => t.done).length} de ${ts.length} tópicos concluídos`);
  for (const m of [...(p.members || []), '']) {
    const mine = ts.filter(t => (t.assignee || '') === m);
    if (!mine.length) continue;
    out.push('', (m || 'Sem responsável') + ':', ...mine.map(line));
  }
  return out.join('\n');
}
async function shareProject(id) {
  const p = projectById(id);
  if (!p) return;
  const text = projectSummary(p);
  if (!native && navigator.share) {
    try { await navigator.share({ title: p.name, text }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(text); }
  catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  toast('Resumo copiado. Cola-o no WhatsApp ou no email do grupo.');
}

/* ------------------------------------------------------------------ app de PC (pywebview) */
function detectNative() {
  return new Promise(resolve => {
    const api = () => (window.pywebview && window.pywebview.api && window.pywebview.api.load ? window.pywebview.api : null);
    if (api()) return resolve(api());
    addEventListener('pywebviewready', () => resolve(api()), { once: true });
    setTimeout(() => resolve(api()), window.pywebview ? 5000 : 400);
  });
}

async function startNative() {
  const api = await detectNative();
  if (!api) return;
  native = api;
  document.documentElement.classList.add('native');
  const text = await native.load();
  if (text) {
    try {
      db = sanitizeDb(JSON.parse(text)).db;
    } catch (e) {
      loadFailed = true; // não escrever por cima de um ficheiro que não consegui ler
      toast('Não consegui ler o ficheiro de dados. Restaura uma cópia de segurança.');
    }
  }
  purgeOld();
  migrateClasses();
  saveLocal();
  if (ui.view === 'list' && !listById(ui.listId)) ui.view = 'today';
  resetDraft();
  render();
  checkReminders();
  if (tasks().length || events().length) localStorage.setItem('organizador.onboarded', '1');
}
