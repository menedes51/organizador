/* ==========================================================================
   Organizador — app (PC + telemóvel)
   Sem servidor: cada dispositivo guarda as suas tarefas.
   • Telemóvel / browser: no armazenamento do próprio browser.
   • App de PC (organizador.py): num ficheiro dados.json.
   Para passar tarefas entre dispositivos: Exportar / Importar cópia.
   ========================================================================== */
'use strict';

/* ------------------------------------------------------------------ utils */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const now = () => Date.now();
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const isMobile = () => matchMedia('(max-width: 760px)').matches;

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const DIAS_C = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const REPEATS = { none: 'Não repetir', daily: 'Todos os dias', weekdays: 'Dias úteis', weekly: 'Todas as semanas' };
const REMINDS = { 0: 'à hora', 5: '5 min antes', 15: '15 min antes', 30: '30 min antes', 60: '1 h antes', 1440: '1 dia antes' };
const PALETTE = ['#6b78e5', '#d4708f', '#45a283', '#b7925a', '#8b74d6', '#4f9cc4', '#c7744f', '#8a8f98'];

const z = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const today = () => iso(new Date());
const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); };
const diffDays = (a, b) => Math.round((parseISO(a) - parseISO(b)) / 864e5);
const dayOf = ms => (ms ? iso(new Date(ms)) : null);

function fmtDay(s) {
  const d = diffDays(s, today());
  if (d === 0) return 'Hoje';
  if (d === 1) return 'Amanhã';
  if (d === -1) return 'Ontem';
  const dt = parseISO(s);
  if (d > 1 && d < 7) return cap(DIAS[dt.getDay()]);
  const y = dt.getFullYear() !== new Date().getFullYear() ? ` ${dt.getFullYear()}` : '';
  return `${dt.getDate()} ${MESES[dt.getMonth()].slice(0, 3)}${y}`;
}
const fmtLong = s => { const dt = parseISO(s); return `${cap(DIAS[dt.getDay()])}, ${dt.getDate()} de ${MESES[dt.getMonth()]}`; };
const nextWeekday = (wd) => { let s = addDays(today(), 1); while (parseISO(s).getDay() !== wd) s = addDays(s, 1); return s; };

/* ------------------------------------------------------------------ icons */
const ICONS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
  upcoming: '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18M8 14.5h.01M12 14.5h.01M16 14.5h.01M8 18h.01M12 18h.01"/>',
  today: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4.5" cy="6" r=".6"/><circle cx="4.5" cy="12" r=".6"/><circle cx="4.5" cy="18" r=".6"/>',
  lists: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  note: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M16 13H8M16 17H8"/>',
  trash: '<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>',
  chevR: '<path d="m9 18 6-6-6-6"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1"/>',
  folder: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  pencil: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
};
const icon = (name, cls = '') =>
  `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

/* ------------------------------------------------------------------ data */
const APP_VERSION = '3.2';
const KEY = 'organizador.v2';
const UI_KEY = 'organizador.ui';
const CAT_DEFAULTS = [
  { id: 'faculdade', name: 'Faculdade', color: '#6b78e5' },
  { id: 'social', name: 'Social', color: '#d4708f' },
  { id: 'pessoal', name: 'Pessoal', color: '#45a283' },
  { id: 'outros', name: 'Outros', color: '#b7925a' },
];
const blank = () => ({
  tasks: [], lists: [],
  categories: CAT_DEFAULTS.map((c, i) => ({ ...c, order: i, updatedAt: 1 })),
});

function loadLocal() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.tasks)) return d;
  } catch (e) { /* ignore */ }
  return blank();
}
let db = loadLocal();
let native = null; // API da app de PC (pywebview), quando corre como app de secretária
function saveLocal() {
  const text = JSON.stringify(db);
  localStorage.setItem(KEY, text);
  if (native) native.save(text);
}

const live = a => a.filter(x => !x.deleted);
const tasks = () => live(db.tasks);
const lists = () => live(db.lists).sort((a, b) => a.order - b.order);
const cats = () => live(db.categories).sort((a, b) => a.order - b.order);
const catById = id => (id ? db.categories.find(c => c.id === id && !c.deleted) : null);
const listById = id => (id ? db.lists.find(l => l.id === id && !l.deleted) : null);
const taskById = id => db.tasks.find(t => t.id === id && !t.deleted);
const touch = (o, patch) => Object.assign(o, patch, { updatedAt: now() });

function mergeArr(a = [], b = []) {
  const m = new Map();
  for (const x of [...a, ...b]) {
    if (!x || !x.id) continue;
    const y = m.get(x.id);
    if (!y || (x.updatedAt || 0) > (y.updatedAt || 0)) m.set(x.id, x);
  }
  return [...m.values()];
}
const merge = (a, b) => ({
  tasks: mergeArr(a.tasks, b.tasks),
  lists: mergeArr(a.lists, b.lists),
  categories: mergeArr(a.categories, b.categories),
});

function commit() { saveLocal(); render(); }

/* ------------------------------------------------------------------ ui state */
const ui = Object.assign({
  view: 'today', listId: null, cat: null,
  calSel: today(), calMonth: today().slice(0, 7),
  showDone: { today: true }, calMode: 'month',
}, JSON.parse(localStorage.getItem(UI_KEY) || '{}'));
ui.openTask = null;
ui.query = '';
const saveUi = () => localStorage.setItem(UI_KEY, JSON.stringify({
  view: ui.view, listId: ui.listId, cat: ui.cat, showDone: ui.showDone, calMode: ui.calMode,
}));
const draft = { date: null, time: null, cat: null, list: null, important: false };

/* ------------------------------------------------------------------ task ops */
function addTask(t) {
  db.tasks.push({
    id: uid(), title: '', notes: '', cat: null, list: null, date: null, time: null,
    repeat: 'none', important: false, done: false, doneAt: null,
    created: now(), updatedAt: now(), ...t,
  });
  commit();
}

function toggleTask(id) {
  const t = taskById(id);
  if (!t) return;
  const done = !t.done;
  touch(t, { done, doneAt: done ? now() : null });
  if (done && t.repeat && t.repeat !== 'none' && !t.spawned) {
    let nd = addDays(t.date || today(), t.repeat === 'weekly' ? 7 : 1);
    if (t.repeat === 'weekdays') while ([0, 6].includes(parseISO(nd).getDay())) nd = addDays(nd, 1);
    t.spawned = true;
    db.tasks.push({ ...t, id: uid(), done: false, doneAt: null, spawned: false, date: nd, created: now(), updatedAt: now() });
    toast(`Próxima repetição: ${fmtDay(nd).toLowerCase()}`);
  }
  commit();
}

function deleteTask(id) {
  const t = taskById(id);
  if (!t) return;
  touch(t, { deleted: true });
  if (ui.openTask === id) closeDetail();
  commit();
  toast('Tarefa eliminada', 'Desfazer', () => { touch(t, { deleted: false }); commit(); });
}

const visible = t => !ui.cat || t.cat === ui.cat;
const sortTasks = arr => arr.sort((a, b) =>
  (a.date || '9999').localeCompare(b.date || '9999') ||
  (a.time || '99').localeCompare(b.time || '99') ||
  (b.important ? 1 : 0) - (a.important ? 1 : 0) ||
  a.created - b.created);
const sortDone = arr => arr.sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));

/* ------------------------------------------------------------------ rendering: tasks */
function taskRow(t, opt = {}) {
  const c = catById(t.cat);
  const l = listById(t.list);
  const meta = [];
  if (t.important) meta.push(`<span class="meta flag">${icon('flag')}Importante</span>`);
  if (opt.showDate !== false && t.date) {
    const overdue = !t.done && t.date < today();
    meta.push(`<span class="meta ${overdue ? 'overdue' : ''}">${icon('calendar')}${fmtDay(t.date)}${t.time ? ' · ' + t.time : ''}</span>`);
  } else if (t.time) {
    meta.push(`<span class="meta">${icon('clock')}${t.time}</span>`);
  }
  if (c) meta.push(`<span class="meta"><span class="dot" style="--c:${c.color}"></span>${esc(c.name)}</span>`);
  if (l && opt.showList !== false) meta.push(`<span class="meta">${icon('folder')}${esc(l.name)}</span>`);
  if (t.repeat && t.repeat !== 'none') meta.push(`<span class="meta" title="${REPEATS[t.repeat]}">${icon('repeat')}</span>`);
  if (t.remind != null && t.time) meta.push(`<span class="meta" title="Lembrete ${REMINDS[t.remind] || ''}">${icon('bell')}</span>`);
  if (t.notes) meta.push(`<span class="meta">${icon('note')}</span>`);
  return `
    <div class="task ${t.done ? 'done' : ''} ${ui.openTask === t.id ? 'open' : ''}" data-task="${t.id}">
      <button class="check" data-toggle="${t.id}" style="${c ? `--c:${c.color}` : ''}" aria-label="Concluir">${icon('check')}</button>
      <div class="task-body">
        <div class="task-title">${opt.hl ? highlight(t.title, opt.hl) : esc(t.title)}</div>
        ${meta.length ? `<div class="task-meta">${meta.join('')}</div>` : ''}
      </div>
    </div>`;
}

function section(title, items, opt = {}) {
  if (!items.length) return '';
  return `<div class="section">
    ${title ? `<div class="section-title ${opt.danger ? 'danger' : ''}">${esc(title)}<span class="n">${items.length}</span></div>` : ''}
    ${items.map(t => taskRow(t, opt)).join('')}
  </div>`;
}

function doneBlock(key, items, opt = {}) {
  if (!items.length) return '';
  const open = !!ui.showDone[key];
  return `<div class="section">
    <button class="done-toggle ${open ? 'open' : ''}" data-done-toggle="${key}">${icon('chevR')}Concluídas <span>${items.length}</span></button>
    ${open ? sortDone(items).map(t => taskRow(t, opt)).join('') : ''}
  </div>`;
}

const empty = (title, text) => `<div class="empty"><strong>${esc(title)}</strong>${esc(text)}</div>`;

/* ------------------------------------------------------------------ rendering: views */
function catChips() {
  return `<div class="cat-chips">
    <button class="chip ${!ui.cat ? 'on' : ''}" data-cat-filter="">Todas</button>
    ${cats().map(c => `<button class="chip ${ui.cat === c.id ? 'on' : ''}" data-cat-filter="${c.id}"><span class="dot" style="--c:${c.color}"></span>${esc(c.name)}</button>`).join('')}
  </div>`;
}

function head(title, sub = '', extra = '', actions = '') {
  return `<div class="page-head">
      <div><h1 class="page-title">${esc(title)}</h1>${sub ? `<div class="page-sub">${sub}</div>` : ''}${extra}</div>
      <div class="head-actions">${actions}<button class="icon-btn m-only" data-nav="search" aria-label="Procurar">${icon('search')}</button></div>
    </div>`;
}

/* ------------------------------------------------------------------ search */
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function highlight(text, q) {
  const chars = [...text];
  const map = [], nArr = [];
  chars.forEach((c, i) => { for (const b of [...norm(c)]) { nArr.push(b); map.push(i); } });
  const qArr = [...q];
  for (let at = 0; at + qArr.length <= nArr.length; at++) {
    if (nArr.slice(at, at + qArr.length).join('') === q) {
      const a = map[at], b = map[at + qArr.length - 1] + 1;
      return esc(chars.slice(0, a).join('')) + '<mark>' + esc(chars.slice(a, b).join('')) + '</mark>' + esc(chars.slice(b).join(''));
    }
  }
  return esc(text);
}

function searchResults() {
  const q = norm(ui.query).trim();
  if (!q) return empty('Procura em todas as tarefas.', 'Títulos, notas, listas e categorias.');
  const hits = tasks().filter(t => {
    const hay = [t.title, t.notes, listById(t.list)?.name, catById(t.cat)?.name].map(norm).join(' \n ');
    return hay.includes(q);
  });
  if (!hits.length) return empty('Sem resultados.', `Nada encontrado para "${ui.query.trim()}".`);
  return section('Por fazer', sortTasks(hits.filter(t => !t.done)), { hl: q }) +
    section('Concluídas', sortDone(hits.filter(t => t.done)), { hl: q });
}

function viewSearch() {
  const top = head('Procurar') + `<div class="search-box">${icon('search')}
    <input id="searchInput" type="search" placeholder="Procurar tarefas, notas, listas…" value="${esc(ui.query)}" autocomplete="off" enterkeyhint="search">
  </div>`;
  return { top, content: searchResults() };
}

function viewToday() {
  const T = today();
  const all = tasks().filter(visible);
  const overdue = sortTasks(all.filter(t => !t.done && t.date && t.date < T));
  const pend = sortTasks(all.filter(t => !t.done && t.date === T));
  const done = all.filter(t => t.done && (t.date === T || dayOf(t.doneAt) === T));
  const total = pend.length + done.length + overdue.length;
  const pct = total ? Math.round(100 * done.length / total) : 0;
  const progress = total ? `<div class="progress"><div class="progress-bar"><i style="width:${pct}%"></i></div>${done.length} de ${total} concluídas</div>` : '';
  const top = head('Hoje', fmtLong(T), progress) + catChips();
  let content = section('Em atraso', overdue, { danger: true }) +
    section(overdue.length ? 'Hoje' : '', pend, { showDate: false });
  if (!overdue.length && !pend.length) {
    content += done.length ? empty('Tudo feito por hoje.', 'Bom trabalho.') : empty('Nada para hoje.', 'Adiciona uma tarefa para começar.');
  }
  content += doneBlock('today', done, { showDate: false });
  return { top, content };
}

function viewUpcoming() {
  const T = today();
  const all = tasks().filter(t => visible(t) && !t.done);
  const horizon = addDays(T, 14);
  let content = '';
  for (let i = 1; i <= 14; i++) {
    const d = addDays(T, i);
    const items = sortTasks(all.filter(t => t.date === d));
    if (!items.length) continue;
    const dt = parseISO(d);
    const label = i === 1 ? `Amanhã · ${cap(DIAS[dt.getDay()])}` : `${cap(DIAS[dt.getDay()])}, ${dt.getDate()} ${MESES[dt.getMonth()].slice(0, 3)}`;
    content += section(label, items, { showDate: false });
  }
  content += section('Mais tarde', sortTasks(all.filter(t => t.date && t.date > horizon)));
  content += section('Sem data', sortTasks(all.filter(t => !t.date)));
  if (!content) content = empty('Nada planeado.', 'As tarefas com data nos próximos dias aparecem aqui.');
  return { top: head('Próximos', 'O que vem aí') + catChips(), content };
}

const HOUR_PX = 48;
const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const fromMin = m => `${z(Math.floor(m / 60) % 24)}:${z(m % 60)}`;
const weekStart = s => addDays(s, -((parseISO(s).getDay() + 6) % 7));
const fmtDur = m => (m < 60 ? `${m} min` : (m % 60 ? `${Math.floor(m / 60)}h${z(m % 60)}` : `${m / 60} h`));
const catColor = t => catById(t.cat)?.color || 'var(--text-3)';

function dayCell(s, items, out) {
  const pendCols = [...new Set(items.filter(t => !t.done).map(catColor))].slice(0, 3);
  const dots = pendCols.length ? pendCols.map(c => `<i style="--c:${c}"></i>`).join('')
    : (items.length ? '<i class="faded" style="--c:var(--text-3)"></i>' : '');
  return `<button class="cal-day ${out ? 'out' : ''} ${s === today() ? 'today' : ''} ${s === ui.calSel ? 'sel' : ''}" data-cal-day="${s}">
    <span class="num">${parseISO(s).getDate()}</span><span class="cal-dots">${dots}</span></button>`;
}

function monthGrid(byDay) {
  const [y, m] = ui.calMonth.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const weeks = Math.ceil((offset + new Date(y, m, 0).getDate()) / 7);
  const start = iso(new Date(y, m - 1, 1 - offset));
  let cells = DIAS_C.map(d => `<div class="cal-wd">${d}</div>`).join('');
  for (let i = 0; i < weeks * 7; i++) {
    const s = addDays(start, i);
    cells += dayCell(s, byDay[s] || [], parseISO(s).getMonth() !== m - 1);
  }
  return `<div class="cal-grid">${cells}</div>`;
}

function weekStrip(byDay) {
  const s0 = weekStart(ui.calSel);
  return `<div class="cal-grid">${DIAS_C.map(d => `<div class="cal-wd">${d}</div>`).join('')}${
    [0, 1, 2, 3, 4, 5, 6].map(i => { const s = addDays(s0, i); return dayCell(s, byDay[s] || [], false); }).join('')}</div>`;
}

function layoutDay(items) {
  const evs = items.map(t => {
    const st = toMin(t.time);
    return { t, s: st, e: Math.min(st + (t.duration || 60), 1440) };
  }).sort((a, b) => a.s - b.s || b.e - a.e);
  const out = [];
  let cluster = [], clusterEnd = -1;
  const flush = () => {
    const lanes = [];
    for (const ev of cluster) {
      let i = lanes.findIndex(end => end <= ev.s);
      if (i < 0) { i = lanes.length; lanes.push(0); }
      lanes[i] = ev.e; ev.lane = i;
    }
    cluster.forEach(ev => { ev.lanes = lanes.length; });
    out.push(...cluster); cluster = [];
  };
  for (const ev of evs) {
    if (cluster.length && ev.s >= clusterEnd) flush();
    cluster.push(ev); clusterEnd = Math.max(clusterEnd, ev.e);
  }
  if (cluster.length) flush();
  return out;
}

function timeGrid(days, byDay, allDay) {
  const T = today();
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const head = days.length > 1 ? `<div class="tg-row tg-head"><div class="tg-gutter"></div>${days.map(d => {
    const dt = parseISO(d);
    return `<button class="tg-dh ${d === T ? 'today' : ''} ${d === ui.calSel ? 'sel' : ''}" data-cal-day="${d}"><span>${DIAS_C[(dt.getDay() + 6) % 7]}</span><b>${dt.getDate()}</b></button>`;
  }).join('')}</div>` : '';
  const ad = allDay ? `<div class="tg-row tg-allday"><div class="tg-gutter">Sem hora</div>${days.map(d =>
    `<div class="tg-adcell">${sortTasks((byDay[d] || []).filter(t => !t.time)).map(t =>
      `<div class="ad-chip ${t.done ? 'done' : ''}" style="--c:${catColor(t)}" data-task="${t.id}">${esc(t.title)}</div>`).join('')}</div>`).join('')}</div>` : '';
  let labels = '';
  for (let h = 1; h < 24; h++) labels += `<div class="tg-hour" style="top:${h * HOUR_PX}px">${z(h)}:00</div>`;
  const cols = days.map(d => {
    const evs = layoutDay((byDay[d] || []).filter(t => t.time)).map(({ t, s, e, lane, lanes }) =>
      `<div class="ev ${t.done ? 'done' : ''}" data-task="${t.id}" style="top:${s * HOUR_PX / 60}px;height:${Math.max(22, (e - s) * HOUR_PX / 60 - 2)}px;left:calc(${lane} * 100% / ${lanes} + 2px);width:calc(100% / ${lanes} - 4px);--c:${catColor(t)}">
        <button class="ev-check" data-toggle="${t.id}" aria-label="Concluir">${icon('check')}</button>
        <div class="ev-text"><div class="ev-title">${esc(t.title)}</div><div class="ev-time">${t.time} – ${fromMin(e === 1440 ? 1439 : e)}</div></div>
      </div>`).join('');
    const now = d === T ? `<div class="now-line" style="top:${nowMin * HOUR_PX / 60}px"></div>` : '';
    return `<div class="tg-col ${d === T ? 'today' : ''}" data-slot-day="${d}">${evs}${now}</div>`;
  }).join('');
  return `<div class="tg" style="--cols:${days.length};--hour:${HOUR_PX}px">${head}${ad}
    <div class="tg-scroll" id="tgScroll"><div class="tg-row tg-body" style="height:${24 * HOUR_PX}px"><div class="tg-gutter">${labels}</div>${cols}</div></div></div>`;
}

function calTitle() {
  if (ui.calMode === 'month') {
    const [y, m] = ui.calMonth.split('-').map(Number);
    return `${cap(MESES[m - 1])} <span>${y}</span>`;
  }
  if (ui.calMode === 'week') {
    const a = parseISO(weekStart(ui.calSel)), b = parseISO(addDays(weekStart(ui.calSel), 6));
    const ma = MESES[a.getMonth()].slice(0, 3), mb = MESES[b.getMonth()].slice(0, 3);
    return `${a.getDate()}${ma !== mb ? ' ' + ma : ''} – ${b.getDate()} ${mb} <span>${b.getFullYear()}</span>`;
  }
  return `${fmtLong(ui.calSel)} <span>${ui.calSel.slice(0, 4)}</span>`;
}

function viewCalendar() {
  const byDay = {};
  for (const t of tasks()) if (t.date && visible(t)) (byDay[t.date] ||= []).push(t);
  const mode = ui.calMode;
  let body;
  if (mode === 'month') body = monthGrid(byDay);
  else if (mode === 'week') {
    const s0 = weekStart(ui.calSel);
    body = isMobile() ? weekStrip(byDay) : timeGrid([0, 1, 2, 3, 4, 5, 6].map(i => addDays(s0, i)), byDay, true);
  } else body = timeGrid([ui.calSel], byDay, false);

  const seg = `<div class="seg">${[['day', 'Dia'], ['week', 'Semana'], ['month', 'Mês']].map(([k, l]) =>
    `<button class="${mode === k ? 'on' : ''}" data-cal-mode="${k}">${l}</button>`).join('')}</div>`;
  const cal = `<div class="cal cal-mode-${mode}">
    <div class="cal-head">
      <div class="cal-month">${calTitle()}</div>
      ${seg}
      <div class="cal-nav">
        <button class="btn ghost" data-cal-today style="height:28px;padding:0 10px">Hoje</button>
        <button class="icon-btn" data-cal-nav="-1" aria-label="Anterior">${icon('chevL')}</button>
        <button class="icon-btn" data-cal-nav="1" aria-label="Seguinte">${icon('chevR')}</button>
      </div>
    </div>
    ${body}
  </div>`;

  const dayItems = byDay[ui.calSel] || [];
  const done = dayItems.filter(t => t.done);
  let content;
  if (mode === 'day') {
    const untimed = sortTasks(dayItems.filter(t => !t.done && !t.time));
    content = section('Sem hora', untimed, { showDate: false });
    if (!dayItems.some(t => !t.done)) content += empty('', 'Sem tarefas neste dia. Toca numa hora do calendário para marcar.');
  } else {
    const pend = sortTasks(dayItems.filter(t => !t.done));
    content = `<div class="section-title" style="font-size:15px;color:var(--text);margin-bottom:8px">${fmtLong(ui.calSel)}</div>` +
      section('', pend, { showDate: false });
    if (!pend.length) content += empty('', mode === 'week' && !isMobile() ? 'Sem tarefas neste dia. Clica numa hora para marcar.' : 'Sem tarefas neste dia.');
  }
  content += doneBlock('cal', done, { showDate: false });
  return { top: head('Calendário', 'Planeia com antecedência') + catChips() + cal, content };
}

function viewList() {
  const l = listById(ui.listId);
  if (!l) { ui.view = 'today'; return viewToday(); }
  const all = tasks().filter(t => t.list === l.id && visible(t));
  const pend = sortTasks(all.filter(t => !t.done));
  const done = all.filter(t => t.done);
  const actions = `<button class="icon-btn" data-list-more="${l.id}" aria-label="Opções da lista">${icon('more')}</button>`;
  let content = section('', pend, { showList: false });
  if (!pend.length) content += empty('Lista vazia.', 'Adiciona a primeira tarefa.');
  content += doneBlock('list:' + l.id, done, { showList: false });
  return { top: head(l.name, `${pend.length} por fazer`, '', actions) + catChips(), content };
}

function viewLists() { // vista de listas/categorias (telemóvel)
  const count = id => tasks().filter(t => t.list === id && !t.done).length;
  const ccount = id => tasks().filter(t => t.cat === id && !t.done).length;
  const content = `
    <div class="section-title">Listas</div>
    <div class="rows">
      ${lists().map(l => `<button class="row" data-nav="list" data-id="${l.id}">${icon('list')}<span class="label">${esc(l.name)}</span><span class="count">${count(l.id) || ''}</span>${icon('chevR')}</button>`).join('')}
      <button class="row add" data-add-list>${icon('plus')}<span class="label">Nova lista</span></button>
    </div>
    <div class="section-title">Categorias</div>
    <div class="rows">
      ${cats().map(c => `<button class="row" data-cat-more="${c.id}"><span class="dot" style="--c:${c.color};width:10px;height:10px"></span><span class="label">${esc(c.name)}</span><span class="count">${ccount(c.id) || ''}</span>${icon('more')}</button>`).join('')}
      <button class="row add" data-add-cat>${icon('plus')}<span class="label">Nova categoria</span></button>
    </div>
    <div class="section-title">Dados</div>
    <div class="rows">
      <button class="row" data-export>${icon('upload')}<span class="label">Exportar cópia</span></button>
      <button class="row" data-import>${icon('download')}<span class="label">Importar cópia</span></button>
    </div>
    <div class="section-title">Aparência</div>
    <div class="rows">
      <button class="row" data-install>${icon('phone')}<span class="label">Instalar app</span></button>
      <button class="row" data-theme-toggle>${icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon')}<span class="label">${document.documentElement.dataset.theme === 'dark' ? 'Tema claro' : 'Tema escuro'}</span></button>
    </div>
    <div class="empty" style="padding-top:4px">As tarefas ficam guardadas só neste dispositivo. Usa Exportar / Importar cópia para as passar para outro.<br><br>Versão ${APP_VERSION}</div>`;
  return { top: head('Listas'), content };
}

/* ------------------------------------------------------------------ rendering: chrome */
function renderSidebar() {
  const T = today();
  const nToday = tasks().filter(t => !t.done && t.date && t.date <= T).length;
  const nUp = tasks().filter(t => !t.done && t.date && t.date > T && t.date <= addDays(T, 14)).length;
  const nav = (v, ic, label, n) => `<button class="nav-item ${ui.view === v ? 'active' : ''}" data-nav="${v}">${icon(ic)}<span class="label">${label}</span><span class="count">${n || ''}</span></button>`;
  const theme = document.documentElement.dataset.theme;
  $('#sidebar').innerHTML = `
    <div class="brand"><svg viewBox="0 0 24 24"><rect width="24" height="24" rx="6.5" fill="var(--text)"/><path d="M7.2 12.4l3.1 3.1 6.5-6.8" stroke="var(--bg)" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>Organizador</div>
    <nav class="nav">
      ${nav('search', 'search', 'Procurar')}
      ${nav('today', 'today', 'Hoje', nToday)}
      ${nav('upcoming', 'upcoming', 'Próximos', nUp)}
      ${nav('calendar', 'calendar', 'Calendário')}
    </nav>
    <div class="side-section">
      <div class="side-label">Listas<button class="icon-btn sm" data-add-list title="Nova lista">${icon('plus')}</button></div>
      <div class="nav">
        ${lists().map(l => `<button class="nav-item ${ui.view === 'list' && ui.listId === l.id ? 'active' : ''}" data-nav="list" data-id="${l.id}">${icon('list')}<span class="label">${esc(l.name)}</span><span class="more" data-list-more="${l.id}">${icon('more')}</span><span class="count">${tasks().filter(t => t.list === l.id && !t.done).length || ''}</span></button>`).join('')
        || '<div class="side-empty">Sem listas</div>'}
      </div>
    </div>
    <div class="side-section">
      <div class="side-label">Categorias<button class="icon-btn sm" data-add-cat title="Nova categoria">${icon('plus')}</button></div>
      <div class="nav">
        ${cats().map(c => `<button class="nav-item ${ui.cat === c.id ? 'active' : ''}" data-cat-filter="${c.id}"><span class="dot" style="--c:${c.color};margin:0 5px"></span><span class="label">${esc(c.name)}</span><span class="more" data-cat-more="${c.id}">${icon('more')}</span><span class="count">${tasks().filter(t => t.cat === c.id && !t.done).length || ''}</span></button>`).join('')}
      </div>
    </div>
    <div class="side-foot">
      <span>Neste ${native ? 'PC' : 'dispositivo'} · v${APP_VERSION}</span>
      <span style="display:flex;gap:2px"><button class="icon-btn" data-install title="Instalar app">${icon('phone')}</button>
      <button class="icon-btn" data-data-menu title="Exportar / importar">${icon('more')}</button>
      <button class="icon-btn" data-theme-toggle title="${theme === 'dark' ? 'Tema claro' : 'Tema escuro'}">${icon(theme === 'dark' ? 'sun' : 'moon')}</button></span>
    </div>`;
}

function renderTabbar() {
  const tab = (v, ic, label) => {
    const active = ui.view === v || (v === 'lists' && ui.view === 'list');
    return `<button class="tab ${active ? 'active' : ''}" data-nav="${v}">${icon(ic)}${label}</button>`;
  };
  $('#tabbar').innerHTML = tab('today', 'today', 'Hoje') + tab('upcoming', 'upcoming', 'Próximos') +
    tab('calendar', 'calendar', 'Calendário') + tab('lists', 'lists', 'Listas');
}

function render() {
  const v = { today: viewToday, upcoming: viewUpcoming, calendar: viewCalendar, list: viewList, lists: viewLists, search: viewSearch }[ui.view] || viewToday;
  const { top, content } = v();
  const sc = $('#tgScroll');
  if (sc) ui.tgScroll = sc.scrollTop;
  $('#top').innerHTML = top;
  const sc2 = $('#tgScroll');
  if (sc2) sc2.scrollTop = ui.tgScroll ?? 7 * HOUR_PX;
  $('#content').innerHTML = content;
  $('#composer').classList.toggle('hidden', ui.view === 'lists' || ui.view === 'search');
  document.body.classList.toggle('lists-view', ui.view === 'lists' || ui.view === 'search');
  document.body.classList.toggle('wide', ui.view === 'calendar' && ui.calMode === 'week');
  renderSidebar();
  renderTabbar();
  updateComposer();
  updateInstallUi();
}

/* ------------------------------------------------------------------ composer */
function buildComposer() {
  $('#composer').innerHTML = `
    <div class="grabber"></div>
    <div class="composer-row">
      ${icon('plus')}
      <input id="newTitle" placeholder="Adicionar tarefa" autocomplete="off" enterkeyhint="done" maxlength="300">
      <button class="btn primary" id="addBtn" disabled>Adicionar</button>
    </div>
    <div class="composer-opts">
      <button class="chip" data-pick="date">${icon('calendar')}<span></span></button>
      <button class="chip" data-pick="time">${icon('clock')}<span></span></button>
      <button class="chip" data-pick="cat"><span class="dot"></span><span></span></button>
      <button class="chip" data-pick="list">${icon('folder')}<span></span></button>
      <button class="chip flag" data-pick="important">${icon('flag')}<span>Importante</span></button>
    </div>`;
  const input = $('#newTitle');
  input.addEventListener('input', () => {
    $('#addBtn').disabled = !input.value.trim();
    $('#composer').classList.toggle('active', !!input.value);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); submitComposer(); }
    if (e.key === 'Escape') { input.value = ''; input.blur(); closeComposerSheet(); }
  });
  $('#addBtn').addEventListener('click', submitComposer);
}

function resetDraft() {
  draft.date = ui.view === 'today' ? today() : ui.view === 'calendar' ? ui.calSel : null;
  draft.list = ui.view === 'list' ? ui.listId : null;
  draft.time = null;
  draft.cat = ui.cat || null;
  draft.important = false;
  updateComposer();
}

function updateComposer() {
  const el = $('#composer');
  if (!el.firstElementChild) return;
  const chip = k => el.querySelector(`[data-pick="${k}"]`);
  const [dateC, timeC, catC, listC, flagC] = ['date', 'time', 'cat', 'list', 'important'].map(chip);
  timeC.querySelector('span').textContent = draft.time || 'Hora';
  timeC.classList.toggle('set', !!draft.time);
  dateC.querySelector('span').textContent = draft.date ? fmtDay(draft.date) : 'Sem data';
  dateC.classList.toggle('set', !!draft.date);
  const c = catById(draft.cat);
  catC.querySelector('.dot').style.setProperty('--c', c ? c.color : 'var(--text-3)');
  catC.querySelector('span:last-child').textContent = c ? c.name : 'Categoria';
  catC.classList.toggle('set', !!c);
  const l = listById(draft.list);
  listC.querySelector('span').textContent = l ? l.name : 'Lista';
  listC.classList.toggle('set', !!l);
  flagC.classList.toggle('set', draft.important);
  const ph = ui.view === 'list' && l ? `Adicionar a ${l.name}`
    : ui.view === 'calendar' ? `Adicionar a ${fmtDay(ui.calSel).toLowerCase() === 'hoje' ? 'hoje' : fmtLong(ui.calSel).toLowerCase()}`
      : ui.view === 'today' ? 'Adicionar tarefa para hoje' : 'Adicionar tarefa';
  $('#newTitle').placeholder = ph + (draft.time ? ` às ${draft.time}` : '');
}

function submitComposer() {
  const input = $('#newTitle');
  const title = input.value.trim();
  if (!title) return;
  addTask({ title, date: draft.date, time: draft.time, cat: draft.cat, list: draft.list, important: draft.important });
  input.value = '';
  $('#addBtn').disabled = true;
  draft.important = false;
  updateComposer();
  input.focus();
}

function openComposerSheet(keepDraft = false) {
  if (!keepDraft) resetDraft();
  document.body.classList.add('composer-open');
  setTimeout(() => $('#newTitle').focus(), 60);
}
function closeComposerSheet() {
  document.body.classList.remove('composer-open');
  $('#composer').classList.remove('active');
}

/* ------------------------------------------------------------------ pickers */
function dateMenu(anchor, current, onPick) {
  const T = today();
  const it = (label, val, hint) => ({ label, hint, checked: current === val, onClick: () => onPick(val) });
  openMenu(anchor, [
    it('Hoje', T, cap(DIAS[parseISO(T).getDay()]).slice(0, 3)),
    it('Amanhã', addDays(T, 1), cap(DIAS[parseISO(addDays(T, 1)).getDay()]).slice(0, 3)),
    it('Próxima segunda', nextWeekday(1), fmtDay(nextWeekday(1))),
    it('Sem data', null),
    { sep: true },
    { html: `<label class="menu-date">Outra data<input type="date" value="${current || ''}"></label>` },
  ], {
    onMount: m => m.querySelector('input[type=date]').addEventListener('change', e => {
      if (e.target.value) { closeMenu(); onPick(e.target.value); }
    }),
  });
}

function timeMenu(anchor, current, onPick) {
  const quick = ['08:00', '09:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '21:00'];
  openMenu(anchor, [
    { html: `<div class="time-grid">${quick.map(t => `<button data-t="${t}" class="${current === t ? 'on' : ''}">${t}</button>`).join('')}</div>` },
    { sep: true },
    { html: `<label class="menu-date">Outra hora<input type="time" value="${current || ''}"></label>` },
    { label: 'Sem hora', checked: !current, onClick: () => onPick(null) },
  ], {
    onMount: m => {
      m.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => { closeMenu(); onPick(b.dataset.t); }));
      m.querySelector('input[type=time]').addEventListener('change', e => { if (e.target.value) { closeMenu(); onPick(e.target.value); } });
    },
  });
}

function catMenu(anchor, current, onPick) {
  openMenu(anchor, [
    ...cats().map(c => ({ label: c.name, dot: c.color, checked: current === c.id, onClick: () => onPick(c.id) })),
    { label: 'Sem categoria', checked: !current, onClick: () => onPick(null) },
  ]);
}

function listMenu(anchor, current, onPick) {
  openMenu(anchor, [
    ...lists().map(l => ({ label: l.name, icon: 'list', checked: current === l.id, onClick: () => onPick(l.id) })),
    { label: 'Sem lista', checked: !current, onClick: () => onPick(null) },
    { sep: true },
    { label: 'Nova lista…', icon: 'plus', onClick: async () => { const id = await newList(); if (id) onPick(id); } },
  ]);
}

/* ------------------------------------------------------------------ menu */
let menuEl = null;
function openMenu(anchor, items, opts = {}) {
  closeMenu();
  const m = document.createElement('div');
  m.className = 'menu';
  m.innerHTML = items.map((it, i) => {
    if (it.sep) return '<div class="menu-sep"></div>';
    if (it.html) return it.html;
    const lead = it.dot ? `<span class="dot" style="--c:${it.dot}"></span>` : it.icon ? icon(it.icon) : '';
    return `<button class="menu-item ${it.danger ? 'danger' : ''}" data-i="${i}">${lead}<span>${esc(it.label)}</span>${it.hint ? `<em class="hint">${esc(it.hint)}</em>` : ''}${it.checked ? icon('check', 'menu-check') : ''}</button>`;
  }).join('');
  document.body.appendChild(m);
  const r = anchor.getBoundingClientRect();
  let x = r.left, y = r.bottom + 6;
  if (x + m.offsetWidth > innerWidth - 8) x = innerWidth - m.offsetWidth - 8;
  if (y + m.offsetHeight > innerHeight - 8) y = r.top - m.offsetHeight - 6;
  m.style.left = Math.max(8, x) + 'px';
  m.style.top = Math.max(8, y) + 'px';
  m.addEventListener('click', e => {
    const b = e.target.closest('.menu-item');
    if (!b) return;
    const it = items[b.dataset.i];
    closeMenu();
    it.onClick && it.onClick();
  });
  opts.onMount && opts.onMount(m);
  menuEl = m;
}
function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }
document.addEventListener('pointerdown', e => { if (menuEl && !menuEl.contains(e.target)) closeMenu(); }, true);

/* ------------------------------------------------------------------ dialogs */
function dialog({ title, text = '', value = null, ok = 'Guardar', danger = false, colors = null, noCancel = false }) {
  return new Promise(resolve => {
    const w = document.createElement('div');
    w.className = 'modal-wrap';
    let color = colors ? colors.value : null;
    w.innerHTML = `<div class="modal" role="dialog">
      <div class="modal-title">${esc(title)}</div>
      ${text ? `<div class="modal-text">${esc(text)}</div>` : ''}
      ${value !== null ? `<input class="modal-input" value="${esc(value)}" maxlength="60">` : ''}
      ${colors ? `<div class="modal-colors">${PALETTE.map(c => `<button style="--c:${c}" data-c="${c}" class="${c === color ? 'on' : ''}"></button>`).join('')}</div>` : ''}
      <div class="modal-actions">
        ${noCancel ? '' : '<button class="btn ghost" data-r="0">Cancelar</button>'}
        <button class="btn ${danger ? 'danger' : 'primary'}" data-r="1">${esc(ok)}</button>
      </div></div>`;
    document.body.appendChild(w);
    const input = w.querySelector('input');
    const done = r => {
      w.remove();
      if (!r) return resolve(null);
      if (value !== null) { const v = input.value.trim(); return resolve(v ? (colors ? { name: v, color } : v) : null); }
      resolve(true);
    };
    w.addEventListener('click', e => {
      if (e.target === w) return done(false);
      const cb = e.target.closest('[data-c]');
      if (cb) { color = cb.dataset.c; w.querySelectorAll('[data-c]').forEach(b => b.classList.toggle('on', b === cb)); return; }
      const b = e.target.closest('[data-r]');
      if (b) done(b.dataset.r === '1');
    });
    w.addEventListener('keydown', e => {
      if (e.key === 'Enter') done(true);
      if (e.key === 'Escape') done(false);
    });
    (input || w.querySelector('[data-r="1"]')).focus();
    if (input) input.select();
  });
}

async function newList() {
  const name = await dialog({ title: 'Nova lista', value: '', ok: 'Criar' });
  if (!name) return null;
  const l = { id: uid(), name, order: now(), updatedAt: now() };
  db.lists.push(l);
  commit();
  return l.id;
}

async function newCategory() {
  const used = cats().map(c => c.color);
  const res = await dialog({ title: 'Nova categoria', value: '', ok: 'Criar', colors: { value: PALETTE.find(c => !used.includes(c)) || PALETTE[0] } });
  if (!res) return;
  db.categories.push({ id: uid(), name: res.name, color: res.color, order: now(), updatedAt: now() });
  commit();
}

function listOptions(anchor, id) {
  const l = listById(id);
  openMenu(anchor, [
    { label: 'Mudar nome', icon: 'pencil', onClick: async () => { const n = await dialog({ title: 'Mudar nome da lista', value: l.name }); if (n) { touch(l, { name: n }); commit(); } } },
    { label: 'Eliminar lista', icon: 'trash', danger: true, onClick: async () => {
      const n = tasks().filter(t => t.list === id).length;
      if (!await dialog({ title: `Eliminar "${l.name}"?`, text: n ? `As ${n} tarefas desta lista continuam disponíveis, sem lista.` : '', ok: 'Eliminar', danger: true })) return;
      touch(l, { deleted: true });
      tasks().filter(t => t.list === id).forEach(t => touch(t, { list: null }));
      if (ui.listId === id) { ui.view = isMobile() ? 'lists' : 'today'; ui.listId = null; }
      commit();
    } },
  ]);
}

function catOptions(anchor, id) {
  const c = catById(id);
  openMenu(anchor, [
    { label: 'Editar', icon: 'pencil', onClick: async () => {
      const r = await dialog({ title: 'Editar categoria', value: c.name, colors: { value: c.color } });
      if (r) { touch(c, { name: r.name, color: r.color }); commit(); }
    } },
    { label: 'Eliminar categoria', icon: 'trash', danger: true, onClick: async () => {
      if (!await dialog({ title: `Eliminar "${c.name}"?`, text: 'As tarefas ficam sem categoria.', ok: 'Eliminar', danger: true })) return;
      touch(c, { deleted: true });
      tasks().filter(t => t.cat === id).forEach(t => touch(t, { cat: null }));
      if (ui.cat === id) ui.cat = null;
      commit();
    } },
  ]);
}

/* ------------------------------------------------------------------ detail */
function openTask(id) {
  closeComposerSheet();
  ui.openTask = id;
  renderDetail();
  document.body.classList.add('detail-open');
  render();
}
function closeDetail() {
  if (!ui.openTask) return;
  ui.openTask = null;
  document.body.classList.remove('detail-open');
  render();
}

function renderDetail() {
  const id = ui.openTask;
  const t = taskById(id);
  if (!t) return closeDetail();
  const c = catById(t.cat);
  const created = new Date(t.created);
  const el = $('#detail');
  el.innerHTML = `
    <div class="grabber"></div>
    <div class="detail-head">
      <span>${t.done ? 'Concluída' : 'Tarefa'}</span>
      <button class="icon-btn" data-close-detail aria-label="Fechar">${icon('x')}</button>
    </div>
    <div class="detail-body">
      <div class="detail-title-row">
        <button class="check ${t.done ? '' : ''}" data-d-toggle style="${c ? `--c:${c.color}` : ''}${t.done ? ';background:var(--c,var(--text-3));color:var(--surface);border-color:var(--c,var(--text-3))' : ''}">${icon('check')}</button>
        <textarea class="title" rows="1" placeholder="Título" maxlength="300">${esc(t.title)}</textarea>
      </div>
      <textarea class="notes" placeholder="Notas">${esc(t.notes)}</textarea>
      <div class="props">
        <div class="prop"><div class="prop-label">${icon('calendar')}Data</div>
          <div class="prop-value"><input type="date" class="field ${t.date ? '' : 'empty-val'}" data-f="date" value="${t.date || ''}">
          ${t.date ? `<button class="icon-btn sm" data-clear="date" title="Remover data">${icon('x')}</button>` : ''}</div></div>
        <div class="prop"><div class="prop-label">${icon('clock')}Hora</div>
          <div class="prop-value"><input type="time" class="field ${t.time ? '' : 'empty-val'}" data-f="time" value="${t.time || ''}">
          ${t.time ? `<select class="field" data-f="duration" title="Duração">${[15, 30, 45, 60, 90, 120, 180, 240].map(m => `<option value="${m}" ${(t.duration || 60) === m ? 'selected' : ''}>${fmtDur(m)}</option>`).join('')}</select>
          <button class="icon-btn sm" data-clear="time" title="Remover hora">${icon('x')}</button>` : ''}</div></div>
        <div class="prop"><div class="prop-label">${icon('bell')}Lembrete</div>
          <div class="prop-value">${t.time && t.date
            ? `<select class="field ${t.remind == null ? 'empty-val' : ''}" data-f="remind"><option value="">Sem lembrete</option>${Object.entries(REMINDS).map(([k, v]) => `<option value="${k}" ${String(t.remind) === k ? 'selected' : ''}>${cap(v)}</option>`).join('')}</select>`
            : '<span class="field empty-val" style="border:0">Define uma data e hora primeiro</span>'}</div></div>
        <div class="prop"><div class="prop-label">${icon('tag')}Categoria</div>
          <div class="prop-value">${cats().map(k => `<button class="pill ${t.cat === k.id ? 'on' : ''}" style="--c:${k.color}" data-set-cat="${k.id}"><span class="dot"></span>${esc(k.name)}</button>`).join('')}</div></div>
        <div class="prop"><div class="prop-label">${icon('folder')}Lista</div>
          <div class="prop-value"><select class="field" data-f="list"><option value="">Sem lista</option>${lists().map(l => `<option value="${l.id}" ${t.list === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></div></div>
        <div class="prop"><div class="prop-label">${icon('repeat')}Repetir</div>
          <div class="prop-value"><select class="field" data-f="repeat">${Object.entries(REPEATS).map(([k, v]) => `<option value="${k}" ${t.repeat === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div>
        <div class="prop"><div class="prop-label">${icon('flag')}Importante</div>
          <div class="prop-value"><button class="switch ${t.important ? 'on' : ''}" data-d-important aria-label="Importante"></button></div></div>
      </div>
    </div>
    <div class="detail-foot">
      <span>Criada a ${created.getDate()} ${MESES[created.getMonth()].slice(0, 3)}</span>
      <button class="btn danger" data-d-delete>${icon('trash')}Eliminar</button>
    </div>`;

  const T = () => taskById(id);
  const save = (patch, rerenderDetail = false) => {
    const tk = T(); if (!tk) return;
    touch(tk, patch); saveLocal(); render();
    if (rerenderDetail) renderDetail();
  };
  const title = el.querySelector('textarea.title');
  const grow = () => { title.style.height = 'auto'; title.style.height = title.scrollHeight + 'px'; };
  grow();
  title.addEventListener('input', () => { grow(); if (title.value.trim()) save({ title: title.value.trim() }); });
  title.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); title.blur(); } });
  el.querySelector('textarea.notes').addEventListener('input', e => save({ notes: e.target.value }));
  el.querySelectorAll('[data-f]').forEach(f => f.addEventListener('change', () => {
    const k = f.dataset.f;
    let v = f.value || null;
    if (k === 'duration') return save({ duration: Number(f.value) });
    if (k === 'remind') {
      const val = f.value === '' ? null : Number(f.value);
      save({ remind: val }, true);
      if (val != null) askNotifyPermission();
      return;
    }
    if (k === 'repeat') {
      v = f.value;
      const tk = T();
      if (v !== 'none' && !tk.date) return save({ repeat: v, date: today() }, true);
    }
    save({ [k]: v }, k !== 'notes');
  }));
  el.querySelectorAll('[data-clear]').forEach(b => b.addEventListener('click', () => save({ [b.dataset.clear]: null }, true)));
  el.querySelectorAll('[data-set-cat]').forEach(b => b.addEventListener('click', () => {
    const tk = T(); save({ cat: tk.cat === b.dataset.setCat ? null : b.dataset.setCat }, true);
  }));
  el.querySelector('[data-d-important]').addEventListener('click', () => save({ important: !T().important }, true));
  el.querySelector('[data-d-toggle]').addEventListener('click', () => { toggleTask(id); renderDetail(); });
  el.querySelector('[data-d-delete]').addEventListener('click', () => deleteTask(id));
  el.querySelector('[data-close-detail]').addEventListener('click', closeDetail);
}

/* ------------------------------------------------------------------ toast */
let toastTimer;
function toast(msg, actionLabel, action) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span>${actionLabel ? `<button>${esc(actionLabel)}</button>` : ''}`;
  if (actionLabel) el.querySelector('button').onclick = () => { action(); el.classList.remove('show'); };
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), actionLabel ? 5000 : 2600);
}

/* ------------------------------------------------------------------ navigation */
function setView(view, listId = null) {
  ui.view = view;
  ui.listId = listId;
  if (view === 'calendar') ui.calMonth = ui.calSel.slice(0, 7);
  saveUi();
  closeMenu();
  resetDraft();
  render();
  window.scrollTo(0, 0);
  if (view === 'search') setTimeout(() => { const i = $('#searchInput'); if (i) { i.focus(); i.select(); } }, 30);
}

function setTheme(t) {
  document.documentElement.dataset.theme = t;
  localStorage.setItem('organizador.theme', t);
  $('meta[name=theme-color]').content = t === 'dark' ? '#111113' : '#fafaf9';
  render();
}

/* ------------------------------------------------------------------ events */
document.addEventListener('click', e => {
  if (suppressClick) { suppressClick = false; return; }
  const q = s => e.target.closest(s);
  let el;
  if ((el = q('[data-list-more]'))) { e.stopPropagation(); return listOptions(el, el.dataset.listMore); }
  if ((el = q('[data-cat-more]'))) { e.stopPropagation(); return catOptions(el, el.dataset.catMore); }
  if ((el = q('[data-toggle]'))) {
    const row = el.closest('.task');
    const id = el.dataset.toggle;
    if (row && !row.classList.contains('done')) {
      row.classList.add('completing');
      setTimeout(() => toggleTask(id), 260);
    } else toggleTask(id);
    if (ui.openTask === id) setTimeout(renderDetail, 280);
    return;
  }
  if ((el = q('[data-task]'))) return openTask(el.dataset.task);
  if ((el = q('[data-slot-day]'))) {
    const r = el.getBoundingClientRect();
    const min = Math.min(23 * 60 + 30, Math.max(0, Math.floor((e.clientY - r.top) / HOUR_PX * 2) * 30));
    ui.calSel = el.dataset.slotDay;
    resetDraft();
    draft.time = fromMin(min);
    render();
    if (isMobile()) openComposerSheet(true);
    else { const inp = $('#newTitle'); inp.focus(); inp.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    return;
  }
  if ((el = q('[data-cal-mode]'))) {
    ui.calMode = el.dataset.calMode;
    ui.calMonth = ui.calSel.slice(0, 7);
    ui.tgScroll = undefined;
    saveUi(); return render();
  }
  if ((el = q('[data-nav]'))) return setView(el.dataset.nav, el.dataset.id || null);
  if ((el = q('[data-cat-filter]'))) {
    const id = el.dataset.catFilter || null;
    ui.cat = ui.cat === id ? null : id;
    saveUi(); resetDraft(); return render();
  }
  if ((el = q('[data-cal-day]'))) {
    ui.calSel = el.dataset.calDay;
    if (ui.calSel.slice(0, 7) !== ui.calMonth) ui.calMonth = ui.calSel.slice(0, 7);
    resetDraft(); return render();
  }
  if ((el = q('[data-cal-nav]'))) {
    const n = Number(el.dataset.calNav);
    if (ui.calMode === 'month') {
      const [y, m] = ui.calMonth.split('-').map(Number);
      ui.calMonth = iso(new Date(y, m - 1 + n, 1)).slice(0, 7);
    } else {
      ui.calSel = addDays(ui.calSel, n * (ui.calMode === 'week' ? 7 : 1));
      ui.calMonth = ui.calSel.slice(0, 7);
      resetDraft();
    }
    return render();
  }
  if (q('[data-cal-today]')) { ui.calSel = today(); ui.calMonth = ui.calSel.slice(0, 7); resetDraft(); return render(); }
  if ((el = q('[data-done-toggle]'))) { const k = el.dataset.doneToggle; ui.showDone[k] = !ui.showDone[k]; saveUi(); return render(); }
  if (q('[data-add-list]')) return newList().then(id => id && setView('list', id));
  if (q('[data-add-cat]')) return newCategory();
  if (q('[data-install]')) return installApp();
  if (q('[data-export]')) return exportData();
  if (q('[data-import]')) return importData();
  if ((el = q('[data-data-menu]'))) return dataMenu(el);
  if (q('[data-theme-toggle]')) return setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  if ((el = q('[data-pick]'))) {
    const k = el.dataset.pick;
    if (k === 'date') dateMenu(el, draft.date, v => { draft.date = v; updateComposer(); });
    if (k === 'time') timeMenu(el, draft.time, v => { draft.time = v; updateComposer(); });
    if (k === 'cat') catMenu(el, draft.cat, v => { draft.cat = v; updateComposer(); });
    if (k === 'list') listMenu(el, draft.list, v => { draft.list = v; updateComposer(); });
    if (k === 'important') { draft.important = !draft.important; updateComposer(); }
    return;
  }
});

$('#fab').innerHTML = icon('plus');
$('#fab').addEventListener('click', () => openComposerSheet());
$('#backdrop').addEventListener('click', () => { closeDetail(); closeComposerSheet(); });

document.addEventListener('input', e => {
  if (e.target.id !== 'searchInput') return;
  ui.query = e.target.value;
  $('#content').innerHTML = searchResults();
});

document.addEventListener('keydown', e => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if (!typing && e.key === '/') { e.preventDefault(); setView('search'); return; }
  if (e.key === 'Escape') { closeMenu(); closeDetail(); closeComposerSheet(); }
  if (!typing && (e.key === 'n' || ((e.metaKey || e.ctrlKey) && e.key === 'k'))) {
    e.preventDefault();
    isMobile() ? openComposerSheet() : $('#newTitle').focus();
  }
});

/* ------------------------------------------------------------------ export / import */
async function exportData() {
  const text = JSON.stringify({ app: 'organizador', exportedAt: new Date().toISOString(), ...db }, null, 1);
  if (native) {
    if (await native.export_file(text)) toast('Cópia guardada');
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = `organizador-${today()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Cópia descarregada');
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
    if (!Array.isArray(d.tasks)) throw new Error('bad');
    const before = tasks().length;
    db = merge(db, { tasks: d.tasks, lists: d.lists || [], categories: d.categories || [] });
    commit();
    const n = tasks().length - before;
    toast(n ? `Importadas ${n} tarefa${n === 1 ? '' : 's'}` : 'Nada de novo para importar');
  } catch (e) {
    toast('Este ficheiro não é uma cópia do Organizador');
  }
}

function dataMenu(anchor) {
  openMenu(anchor, [
    { label: 'Exportar cópia', icon: 'upload', onClick: exportData },
    { label: 'Importar cópia', icon: 'download', onClick: importData },
  ]);
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
      const d = JSON.parse(text);
      db = {
        tasks: d.tasks || [], lists: d.lists || [],
        categories: (d.categories && d.categories.length) ? d.categories : blank().categories,
      };
    } catch (e) { /* ficheiro estragado: começa vazio */ }
  }
  saveLocal();
  if (ui.view === 'list' && !listById(ui.listId)) ui.view = 'today';
  resetDraft();
  render();
  checkReminders();
}

/* ------------------------------------------------------------------ reminders */
const FIRED_KEY = 'organizador.reminded';

async function askNotifyPermission() {
  if (native || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    const r = await Notification.requestPermission();
    if (r === 'granted') toast('Lembretes ativados');
  }
  if (Notification.permission === 'denied') toast('As notificações estão bloqueadas nas definições do browser');
}

function notifyTask(t) {
  const body = t.remind === 0 ? `Agora · ${t.time}` : `Às ${t.time} · ${REMINDS[t.remind]}`;
  toast(`Lembrete: ${t.title}`);
  if (native) { native.notify(t.title, body); return; }
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const opts = { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: t.id };
  const fallback = () => { try { new Notification(t.title, opts); } catch (e) { /* sem suporte */ } };
  if (navigator.serviceWorker) {
    navigator.serviceWorker.getRegistration()
      .then(reg => (reg ? reg.showNotification(t.title, opts) : fallback()))
      .catch(fallback);
  } else fallback();
}

function checkReminders() {
  let fired;
  try { fired = JSON.parse(localStorage.getItem(FIRED_KEY) || '{}'); } catch (e) { fired = {}; }
  const now = Date.now();
  let changed = false;
  for (const t of tasks()) {
    if (t.done || t.remind == null || !t.date || !t.time) continue;
    const at = parseISO(t.date);
    const [h, m] = t.time.split(':').map(Number);
    at.setHours(h, m, 0, 0);
    const fireAt = at.getTime() - t.remind * 60000;
    if (now < fireAt || now - fireAt > 2 * 3600e3 || fired[t.id] === fireAt) continue;
    fired[t.id] = fireAt; changed = true;
    notifyTask(t);
  }
  if (changed) localStorage.setItem(FIRED_KEY, JSON.stringify(fired));
}
setInterval(checkReminders, 20000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkReminders(); });

/* ------------------------------------------------------------------ drag in calendar (Dia / Semana) */
let drag = null, suppressClick = false;
document.addEventListener('pointerdown', e => {
  const ev = e.target.closest('.ev');
  if (!ev || e.target.closest('.ev-check') || e.button > 0) return;
  const t = taskById(ev.dataset.task);
  if (!t) return;
  const r = ev.getBoundingClientRect();
  drag = { el: ev, id: t.id, pid: e.pointerId, x0: e.clientX, y0: e.clientY, offY: e.clientY - r.top,
    dur: t.duration || 60, touch: e.pointerType !== 'mouse', active: false };
  if (drag.touch) drag.timer = setTimeout(() => { if (drag && !drag.active) startDrag(); }, 300);
});
function startDrag() {
  drag.active = true;
  drag.el.classList.add('dragging');
  if (navigator.vibrate) navigator.vibrate(12);
}
document.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.pid) return;
  const dist = Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0);
  if (!drag.active) {
    if (drag.touch) { if (dist > 8) { clearTimeout(drag.timer); drag = null; } return; }
    if (dist < 5) return;
    startDrag();
  }
  e.preventDefault();
  const cols = [...document.querySelectorAll('.tg-col')];
  const col = cols.find(c => { const r = c.getBoundingClientRect(); return e.clientX >= r.left && e.clientX < r.right; })
    || drag.el.parentElement;
  const cr = col.getBoundingClientRect();
  let min = Math.round((e.clientY - drag.offY - cr.top) / HOUR_PX * 4) * 15;
  min = Math.max(0, Math.min(1440 - 15, min));
  if (col !== drag.el.parentElement) col.appendChild(drag.el);
  Object.assign(drag.el.style, { top: `${min * HOUR_PX / 60}px`, left: '2px', width: 'calc(100% - 4px)' });
  drag.el.querySelector('.ev-time').textContent = `${fromMin(min)} – ${fromMin(Math.min(min + drag.dur, 1439))}`;
  drag.target = { date: col.dataset.slotDay, time: fromMin(min) };
  const sc = $('#tgScroll');
  if (sc) {
    const sr = sc.getBoundingClientRect();
    if (e.clientY < sr.top + 30) sc.scrollTop -= 10;
    else if (e.clientY > sr.bottom - 30) sc.scrollTop += 10;
  }
});
document.addEventListener('touchmove', e => { if (drag && drag.active) e.preventDefault(); }, { passive: false });
document.addEventListener('contextmenu', e => { if (drag) e.preventDefault(); });
function endDrag(cancelled) {
  if (!drag) return;
  clearTimeout(drag.timer);
  const d = drag; drag = null;
  if (!d.active) return;
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 400);
  const t = taskById(d.id);
  if (!cancelled && t && d.target && (d.target.date !== t.date || d.target.time !== t.time)) {
    touch(t, d.target);
    commit();
    toast(`Movida para ${fmtDay(d.target.date).toLowerCase()} às ${d.target.time}`);
  } else render();
}
document.addEventListener('pointerup', () => endDrag(false));
document.addEventListener('pointercancel', () => endDrag(true));

/* ------------------------------------------------------------------ install (PWA) */
let installEvt = null;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; updateInstallUi(); });
addEventListener('appinstalled', () => { installEvt = null; updateInstallUi(); toast('App instalada'); });
function updateInstallUi() {
  document.querySelectorAll('[data-install]').forEach(b => { b.hidden = isStandalone() || !!native; });
}
async function installApp() {
  if (installEvt) {
    installEvt.prompt();
    await installEvt.userChoice;
    installEvt = null;
    return updateInstallUi();
  }
  const ua = navigator.userAgent;
  const text = /iPhone|iPad|iPod/.test(ua)
    ? 'No Safari, toca no botão Partilhar e escolhe "Adicionar ao ecrã principal".'
    : /Android/.test(ua)
      ? 'No Chrome, abre o menu ⋮ e escolhe "Instalar app" ou "Adicionar ao ecrã principal".'
      : 'No PC, usa a app de secretária: abre o Organizador.app (Mac).';
  dialog({ title: 'Instalar a app', text, ok: 'Percebi', noCancel: true });
}
if ('serviceWorker' in navigator && window.isSecureContext && !window.pywebview && location.hostname !== '127.0.0.1') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

let wasMobile = isMobile();
addEventListener('resize', () => { if (isMobile() !== wasMobile) { wasMobile = isMobile(); render(); } });
setInterval(() => { if (ui.view === 'calendar' && ui.calMode !== 'month' && !document.hidden) render(); }, 60000);

/* ------------------------------------------------------------------ start */
if ((ui.view === 'list' && !listById(ui.listId)) || ui.view === 'search') ui.view = 'today';
buildComposer();
resetDraft();
render();
startNative();
setTimeout(checkReminders, 1500);
