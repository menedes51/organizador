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
const REPEATS = { none: 'Não repetir', daily: 'Todos os dias', weekdays: 'Dias úteis', weekly: 'Todas as semanas', custom: 'Dias da semana…', monthly: 'Todos os meses' };
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
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
  chart: '<path d="M3 3v18h18"/><path d="M8 16v-4M13 16V8M18 16v-7"/>',
  grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
  pin: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  school: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
  exam: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="m9 15 2 2 4-4"/>',
  event: '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/><rect x="7" y="13.5" width="4" height="4" rx=".6"/>',
  play: '<path d="M7 4.5v15l12.5-7.5z"/>',
  pause: '<path d="M8 4.5v15M16 4.5v15"/>',
  skip: '<path d="M5 4.5v15l10-7.5zM19 5v14"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  palette: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.1"/><circle cx="12" cy="7.5" r="1.1"/><circle cx="16" cy="10" r="1.1"/><path d="M12 21a3 3 0 0 1 0-6h2a3 3 0 0 0 3-3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  checklist: '<path d="m4 6 1.5 1.5L8.5 4.5M4 13l1.5 1.5L8.5 11.5M12 6h8M12 13h8M12 20h8M4 20h4"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  star: '<path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.4l-5.6 2.9 1.1-6.2L3 9.7l6.2-.9z"/>',
  board: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9 4v16M15 4v16"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  pencil: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
};
const icon = (name, cls = '') =>
  `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

/* ------------------------------------------------------------------ data */
const APP_VERSION = '4.1';
const KEY = 'organizador.v2';
const UI_KEY = 'organizador.ui';
const CAT_DEFAULTS = [
  { id: 'faculdade', name: 'Faculdade', color: '#6b78e5' },
  { id: 'social', name: 'Social', color: '#d4708f' },
  { id: 'pessoal', name: 'Pessoal', color: '#45a283' },
  { id: 'outros', name: 'Outros', color: '#b7925a' },
];
const COLLS = ['tasks', 'lists', 'categories', 'events', 'focus', 'subjects', 'projects', 'grades'];
const blank = () => ({
  tasks: [], lists: [], events: [], focus: [], subjects: [], projects: [], grades: [],
  categories: CAT_DEFAULTS.map((c, i) => ({ ...c, order: i, updatedAt: 1 })),
});

function loadLocal() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.tasks)) { COLLS.forEach(k => { d[k] ||= []; }); return d; }
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

/* ------------------------------------------------------------------ disciplinas, trabalhos, notas */
const subjects = () => live(db.subjects || []).sort((a, b) => a.name.localeCompare(b.name, 'pt'));
const subjectById = id => (id ? (db.subjects || []).find(x => x.id === id && !x.deleted) : null);
const projects = () => live(db.projects || []).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || a.created - b.created);
const projectById = id => (id ? (db.projects || []).find(x => x.id === id && !x.deleted) : null);
const grades = () => live(db.grades || []);
const gradeOfTask = id => grades().find(g => g.taskId === id);
const SUBJ_PALETTE = ['#6b78e5', '#45a283', '#d4708f', '#b7925a', '#8b74d6', '#4f9cc4', '#c7744f', '#5a9e9e', '#a8879b', '#7f8c5a'];

function addSubject(name, extra = {}) {
  const used = subjects().map(x => x.color);
  const sub = { id: uid(), name: name.trim(), color: SUBJ_PALETTE.find(c => !used.includes(c)) || SUBJ_PALETTE[subjects().length % SUBJ_PALETTE.length],
    ects: null, created: now(), updatedAt: now(), ...extra };
  db.subjects.push(sub);
  return sub;
}
function findOrCreateSubject(name) {
  const n = norm(name).trim();
  if (!n) return null;
  return subjects().find(x => norm(x.name) === n) || addSubject(name);
}
function migrateClasses() {
  let changed = false;
  for (const ev of live(db.events || [])) {
    if (ev.isClass && !ev.subject && (ev.title || '').trim()) { ev.subject = findOrCreateSubject(ev.title).id; changed = true; }
  }
  if (changed) saveLocal();
}
function subjectAverage(sid) {
  const gs = grades().filter(g => g.subject === sid && g.score != null && g.score !== '');
  if (!gs.length) return null;
  const val = g => (Number(g.score) / (Number(g.max) || 20)) * 20;
  const sw = gs.reduce((a, g) => a + (Number(g.weight) || 0), 0);
  const avg = sw > 0 ? gs.reduce((a, g) => a + val(g) * (Number(g.weight) || 0), 0) / sw : gs.reduce((a, g) => a + val(g), 0) / gs.length;
  return Math.round(avg * 10) / 10;
}
function overallAverage() {
  const rows = subjects().map(x => ({ x, a: subjectAverage(x.id) })).filter(r => r.a != null);
  if (!rows.length) return null;
  const ew = rows.reduce((a, r) => a + (Number(r.x.ects) || 0), 0);
  const avg = ew > 0 && rows.every(r => Number(r.x.ects) > 0)
    ? rows.reduce((a, r) => a + r.a * Number(r.x.ects), 0) / ew
    : rows.reduce((a, r) => a + r.a, 0) / rows.length;
  return Math.round(avg * 10) / 10;
}
const fmtGrade = v => (v == null ? '—' : String(v).replace('.', ','));
function nextClass(sid) {
  const nowM = new Date().getHours() * 60 + new Date().getMinutes();
  for (let i = 0; i < 70; i++) {
    const d = addDays(today(), i);
    const ev = live(db.events || []).filter(e => e.isClass && e.subject === sid && occursOn(e, d))
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
      .find(e => i > 0 || !e.time || toMin(e.time) > nowM);
    if (ev) return { date: d, ev };
  }
  return null;
}
const AV_COLORS = ['#6b78e5', '#45a283', '#d4708f', '#c7744f', '#8b74d6', '#4f9cc4', '#b7925a', '#5a9e9e'];
function avatar(name, cls = '') {
  if (!name) return '';
  let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const ini = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return `<span class="av ${cls}" style="--c:${AV_COLORS[h % AV_COLORS.length]}" title="${esc(name)}">${esc(ini)}</span>`;
}

function mergeArr(a = [], b = []) {
  const m = new Map();
  for (const x of [...a, ...b]) {
    if (!x || !x.id) continue;
    const y = m.get(x.id);
    if (!y || (x.updatedAt || 0) > (y.updatedAt || 0)) m.set(x.id, x);
  }
  return [...m.values()];
}
const merge = (a, b) => Object.fromEntries(COLLS.map(k => [k, mergeArr(a[k], b[k])]));

function commit() { saveLocal(); render(); }

/* ------------------------------------------------------------------ ui state */
const ui = Object.assign({
  view: 'today', listId: null, cat: null,
  calSel: today(), calMonth: today().slice(0, 7),
  showDone: { today: true }, calMode: 'month',
}, JSON.parse(localStorage.getItem(UI_KEY) || '{}'));
ui.openTask = null;
ui.openEvent = null;
ui.query = '';
const saveUi = () => localStorage.setItem(UI_KEY, JSON.stringify({
  view: ui.view, listId: ui.listId, cat: ui.cat, showDone: ui.showDone, calMode: ui.calMode, subjectId: ui.subjectId, projectId: ui.projectId,
}));
const draft = { date: null, time: null, cat: null, subject: null, list: null, important: false, exam: false, event: false, parsed: null };
let lastAdded = null;

/* ------------------------------------------------------------------ task ops */
function addTask(t) {
  const id = uid();
  lastAdded = id;
  setTimeout(() => { if (lastAdded === id) lastAdded = null; }, 1500);
  db.tasks.push({
    id,
    title: '', notes: '', cat: null, list: null, date: null, time: null,
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
    const nd = nextTaskDate(t);
    t.spawned = true;
    db.tasks.push({ ...t, id: uid(), done: false, doneAt: null, spawned: false, date: nd, created: now(), updatedAt: now() });
    toast(`Próxima repetição: ${fmtDay(nd).toLowerCase()}`);
  }
  commit();
}

function nextTaskDate(t) {
  const base = t.date || today();
  if (t.repeat === 'monthly') {
    const d = parseISO(base), day = d.getDate();
    const n = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    n.setDate(Math.min(day, new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate()));
    return iso(n);
  }
  if (t.repeat === 'weekly' || (t.repeat === 'custom' && !(t.repeatDays || []).length)) return addDays(base, 7);
  const ok = s => {
    const w = parseISO(s).getDay();
    if (t.repeat === 'weekdays') return w >= 1 && w <= 5;
    if (t.repeat === 'custom') return t.repeatDays.includes(w);
    return true;
  };
  let nd = addDays(base, 1);
  for (let i = 0; i < 8 && !ok(nd); i++) nd = addDays(nd, 1);
  return nd;
}

function examLabel(d) {
  const n = diffDays(d, today());
  if (n < 0) return 'Exame já passou';
  if (n === 0) return 'Exame hoje';
  if (n === 1) return 'Exame amanhã';
  return `Exame · faltam ${n} dias`;
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
const cmpTask = (a, b) =>
  (a.date || '9999').localeCompare(b.date || '9999') ||
  (a.time || '99').localeCompare(b.time || '99') ||
  (b.important ? 1 : 0) - (a.important ? 1 : 0) ||
  a.created - b.created;
const sortTasks = arr => arr.sort(cmpTask);
const sortManual = arr => arr.sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || cmpTask(a, b));
const nextOrder = listId => {
  const os = tasks().filter(t => t.list === listId && t.order != null).map(t => t.order);
  return os.length ? Math.max(...os) + 1 : undefined;
};

/* ------------------------------------------------------------------ events (aulas e eventos recorrentes) */
const events = () => live(db.events || []);
const eventById = id => (db.events || []).find(e => e.id === id && !e.deleted);
const FREQS = { none: 'Não repete', daily: 'Todos os dias', weekdays: 'Dias úteis', weekly: 'Semanalmente', monthly: 'Todos os meses' };
const WD_ORDER = [1, 2, 3, 4, 5, 6, 0];

function occursOn(ev, d) {
  if (!ev.date || d < ev.date) return false;
  const r = ev.repeat || { freq: 'none' };
  if (r.until && d > r.until) return false;
  if ((ev.exceptions || []).includes(d)) return false;
  const w = parseISO(d).getDay();
  switch (r.freq) {
    case 'daily': return true;
    case 'weekdays': return w >= 1 && w <= 5;
    case 'weekly': return ((r.days && r.days.length) ? r.days : [parseISO(ev.date).getDay()]).includes(w);
    case 'monthly': return parseISO(d).getDate() === parseISO(ev.date).getDate();
    default: return d === ev.date;
  }
}
function eventsOn(d, opt = {}) {
  return events().filter(e => (!ui.cat || e.cat === ui.cat) && (!opt.classes || e.isClass) && occursOn(e, d))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
}
function addEvent(e) {
  const ev = {
    id: uid(), title: '', notes: '', cat: null, location: '', date: today(), time: '09:00', end: '10:00',
    repeat: { freq: 'none', days: [], until: null }, exceptions: [], isClass: false,
    created: now(), updatedAt: now(), ...e,
  };
  db.events.push(ev);
  commit();
  return ev;
}
function deleteEvent(id, occ, scope) {
  const ev = eventById(id);
  if (!ev) return;
  if (scope === 'one' && occ) {
    const prev = [...(ev.exceptions || [])];
    touch(ev, { exceptions: [...prev, occ] });
    closeDetail(); commit();
    toast(`Removido de ${fmtDay(occ).toLowerCase()}`, 'Desfazer', () => { touch(ev, { exceptions: prev }); commit(); });
  } else {
    touch(ev, { deleted: true });
    closeDetail(); commit();
    toast(ev.isClass ? 'Aula eliminada' : 'Evento eliminado', 'Desfazer', () => { touch(ev, { deleted: false }); commit(); });
  }
}
function repeatSummary(ev) {
  const r = ev.repeat || {};
  if (!r.freq || r.freq === 'none') return '';
  if (r.freq === 'weekly') {
    const days = (r.days && r.days.length) ? r.days : [parseISO(ev.date).getDay()];
    return WD_ORDER.filter(d => days.includes(d)).map(d => DIAS_C[(d + 6) % 7]).join(', ');
  }
  return FREQS[r.freq];
}
function dayPills(days, attr) {
  return `<div class="daypills">${WD_ORDER.map(d => `<button class="daypill ${days.includes(d) ? 'on' : ''}" ${attr}="${d}">${DIAS_C[(d + 6) % 7]}</button>`).join('')}</div>`;
}
function newClass(day, time, sid = null) {
  const d = day || today();
  const t = time || '09:00';
  const ev = addEvent({
    title: sid ? subjectById(sid).name : '', subject: sid, isClass: true, cat: catById('faculdade') ? 'faculdade' : null,
    date: weekStart(d), time: t, end: fromMin(Math.min(toMin(t) + 90, 1439)),
    repeat: { freq: 'weekly', days: [parseISO(d).getDay()], until: addDays(d, 120) },
  });
  openEvent(ev.id, null);
  setTimeout(() => { const ta = $('#detail textarea.title'); if (ta) ta.focus(); }, 300);
}
const sortDone = arr => arr.sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));

/* ------------------------------------------------------------------ rendering: tasks */
function taskRow(t, opt = {}) {
  const c = catById(t.cat);
  const l = listById(t.list);
  const meta = [];
  if (t.exam) meta.push(`<span class="meta exam">${icon('exam')}${t.date && !t.done ? examLabel(t.date) : 'Exame'}</span>`);
  if (t.important) meta.push(`<span class="meta flag">${icon('flag')}Importante</span>`);
  if (opt.showDate !== false && t.date) {
    const overdue = !t.done && t.date < today();
    meta.push(`<span class="meta ${overdue ? 'overdue' : ''}">${icon('calendar')}${fmtDay(t.date)}${t.time ? ' · ' + t.time : ''}</span>`);
  } else if (t.time) {
    meta.push(`<span class="meta">${icon('clock')}${t.time}</span>`);
  }
  const sub = subjectById(t.subject), prj = projectById(t.project);
  if (t.assignee && opt.showWho !== false) meta.push(`<span class="meta who">${avatar(t.assignee, 'xs')}${esc(t.assignee)}</span>`);
  if (sub && opt.showSubject !== false) meta.push(`<span class="meta"><span class="dot" style="--c:${sub.color}"></span>${esc(sub.name)}</span>`);
  else if (c) meta.push(`<span class="meta"><span class="dot" style="--c:${c.color}"></span>${esc(c.name)}</span>`);
  if (prj && opt.showProject !== false) meta.push(`<span class="meta">${icon('users')}${esc(prj.name)}</span>`);
  if ((t.subtasks || []).length) meta.push(`<span class="meta ${t.subtasks.every(x => x.done) ? 'ok' : ''}">${icon('checklist')}${t.subtasks.filter(x => x.done).length}/${t.subtasks.length}</span>`);
  if (l && opt.showList !== false) meta.push(`<span class="meta">${icon('folder')}${esc(l.name)}</span>`);
  if (t.repeat && t.repeat !== 'none') meta.push(`<span class="meta" title="${REPEATS[t.repeat]}">${icon('repeat')}</span>`);
  if (t.remind != null && t.time) meta.push(`<span class="meta" title="Lembrete ${REMINDS[t.remind] || ''}">${icon('bell')}</span>`);
  if (t.notes) meta.push(`<span class="meta">${icon('note')}</span>`);
  return `
    <div class="task ${t.done ? 'done' : ''} ${ui.openTask === t.id ? 'open' : ''} ${t.exam ? 'is-exam' : ''} ${t.id === lastAdded ? 'new' : ''}" data-task="${t.id}">
      <button class="check" data-toggle="${t.id}" style="${(sub || c) ? `--c:${catColor(t)}` : ''}" aria-label="Concluir">${icon('check')}</button>
      <div class="task-body">
        <div class="task-title">${opt.hl ? highlight(t.title, opt.hl) : esc(t.title)}</div>
        ${meta.length ? `<div class="task-meta">${meta.join('')}</div>` : ''}
      </div>
      ${opt.reorder && !t.done ? `<span class="grip" data-grip="${t.id}" title="Arrastar para ordenar">${icon('grip')}</span>` : ''}
    </div>`;
}

function eventRow(ev, d) {
  const meta = [];
  if (ev.isClass) meta.push(`<span class="meta">${icon('school')}Aula</span>`);
  if (ev.location) meta.push(`<span class="meta">${icon('pin')}${esc(ev.location)}</span>`);
  const rs = repeatSummary(ev);
  if (rs) meta.push(`<span class="meta">${icon('repeat')}${esc(rs)}</span>`);
  return `<div class="evrow" data-event="${ev.id}" data-occ="${d || ''}" style="--c:${catColor(ev)}">
    <div class="evrow-time">${ev.time ? `${ev.time}<small>${ev.end || ''}</small>` : 'Dia todo'}</div>
    <div class="evrow-body"><div class="evrow-title">${esc(ev.title || 'Sem título')}</div>${meta.length ? `<div class="task-meta">${meta.join('')}</div>` : ''}</div>
  </div>`;
}
function agendaBlock(d, title = 'Agenda', list = null) {
  const evs = list || eventsOn(d);
  if (!evs.length) return '';
  return `<div class="section"><div class="section-title">${esc(title)}<span class="n">${evs.length}</span></div>${evs.map(e => eventRow(e, d)).join('')}</div>`;
}

function section(title, items, opt = {}) {
  if (!items.length) return '';
  return `<div class="section">
    ${title ? `<div class="section-title ${opt.danger ? 'danger' : ''}">${esc(title)}<span class="n">${items.length}</span>${opt.action || ''}</div>` : ''}
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
    const hay = [t.title, t.notes, listById(t.list)?.name, catById(t.cat)?.name, subjectById(t.subject)?.name, projectById(t.project)?.name, t.assignee, ...(t.subtasks || []).map(x => x.title)].map(norm).join(' \n ');
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

function examCard(t) {
  const n = diffDays(t.date, today());
  return `<button class="exam-card" data-task="${t.id}" style="--c:${catColor(t)}">
    <span class="exam-days"><b>${n === 0 ? 'Hoje' : n}</b>${n === 0 ? '' : (n === 1 ? 'dia' : 'dias')}</span>
    <span class="exam-info"><span class="exam-title">${esc(t.title)}</span><span class="exam-date">${fmtDay(t.date)}${t.time ? ' · ' + t.time : ''}</span></span>
  </button>`;
}

function viewToday() {
  const T = today();
  const all = tasks().filter(visible);
  const overdue = sortTasks(all.filter(t => !t.done && t.date && t.date < T));
  const pend = sortTasks(all.filter(t => !t.done && t.date === T));
  const done = all.filter(t => t.done && (t.date === T || dayOf(t.doneAt) === T));
  const evs = eventsOn(T);
  const exams = all.filter(t => t.exam && !t.done && t.date && t.date >= T && diffDays(t.date, T) <= 30)
    .sort((a, b) => a.date.localeCompare(b.date));
  const total = pend.length + done.length + overdue.length;
  const pct = total ? Math.round(100 * done.length / total) : 0;
  const progress = total ? `<div class="progress"><div class="progress-bar"><i style="width:${pct}%"></i></div>${done.length} de ${total} concluídas</div>` : '';
  const top = head('Hoje', fmtLong(T), progress) + catChips();
  let content = exams.length ? `<div class="section"><div class="section-title">Exames e prazos<span class="n">${exams.length}</span></div><div class="exam-strip">${exams.map(examCard).join('')}</div></div>` : '';
  content += agendaBlock(T, 'Agenda de hoje', evs);
  content += section('Em atraso', overdue, { danger: true, action: `<button class="sec-action" data-move-overdue>Mover tudo para hoje</button>` }) +
    section(overdue.length || evs.length ? 'Tarefas de hoje' : '', pend, { showDate: false });
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
const catColor = t => subjectById(t.subject)?.color || catById(t.cat)?.color || 'var(--text-3)';

function dayCell(s, items, out) {
  const cols = [...new Set([...eventsOn(s).map(catColor), ...items.filter(t => !t.done).map(catColor)])].slice(0, 3);
  const dots = cols.length ? cols.map(c => `<i style="--c:${c}"></i>`).join('')
    : (items.length ? '<i class="faded" style="--c:var(--text-3)"></i>' : '');
  const exam = items.some(t => t.exam && !t.done);
  return `<button class="cal-day ${out ? 'out' : ''} ${s === today() ? 'today' : ''} ${s === ui.calSel ? 'sel' : ''} ${exam ? 'has-exam' : ''}" data-cal-day="${s}">
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
  const evs = items.slice().sort((a, b) => a.s - b.s || b.e - a.e);
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

function timeGrid(days, byDay, allDay, o = {}) {
  const h0 = o.h0 ?? 0, h1 = o.h1 ?? 24, withTasks = o.tasks !== false;
  const T = today();
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const evsOf = d => eventsOn(d, { classes: o.classesOnly });
  const head = days.length > 1 ? `<div class="tg-row tg-head"><div class="tg-gutter"></div>${days.map(d => {
    const dt = parseISO(d);
    return `<button class="tg-dh ${d === T ? 'today' : ''} ${d === ui.calSel ? 'sel' : ''}" data-cal-day="${d}"><span>${DIAS_C[(dt.getDay() + 6) % 7]}</span><b>${dt.getDate()}</b></button>`;
  }).join('')}</div>` : '';
  const ad = allDay ? `<div class="tg-row tg-allday"><div class="tg-gutter">Sem hora</div>${days.map(d =>
    `<div class="tg-adcell">${evsOf(d).filter(e => !e.time).map(e =>
      `<div class="ad-chip evt" style="--c:${catColor(e)}" data-event="${e.id}" data-occ="${d}">${esc(e.title || 'Sem título')}</div>`).join('')}${
      withTasks ? sortTasks((byDay[d] || []).filter(t => !t.time)).map(t =>
        `<div class="ad-chip ${t.done ? 'done' : ''}" style="--c:${catColor(t)}" data-task="${t.id}">${esc(t.title)}</div>`).join('') : ''}</div>`).join('')}</div>` : '';
  let labels = '';
  for (let h = h0 + 1; h < h1; h++) labels += `<div class="tg-hour" style="top:${(h - h0) * HOUR_PX}px">${z(h)}:00</div>`;
  const y = m => (m - h0 * 60) * HOUR_PX / 60;
  const cols = days.map(d => {
    const items = [];
    if (withTasks) for (const t of (byDay[d] || [])) if (t.time) { const st = toMin(t.time); items.push({ t, s: st, e: Math.min(st + (t.duration || 60), 1440) }); }
    for (const ev of evsOf(d)) if (ev.time) { const st = toMin(ev.time); let en = ev.end ? toMin(ev.end) : st + 60; if (en <= st) en = st + 30; items.push({ ev, s: st, e: en }); }
    const blocks = layoutDay(items).map(it => {
      const st = Math.max(it.s, h0 * 60), en = Math.min(it.e, h1 * 60);
      if (en <= st) return '';
      const pos = `top:${y(st)}px;height:${Math.max(22, (en - st) * HOUR_PX / 60 - 2)}px;left:calc(${it.lane} * 100% / ${it.lanes} + 2px);width:calc(100% / ${it.lanes} - 4px)`;
      if (it.t) {
        const t = it.t;
        return `<div class="ev ${t.done ? 'done' : ''} ${t.exam ? 'is-exam' : ''}" data-task="${t.id}" style="${pos};--c:${catColor(t)}">
          <button class="ev-check" data-toggle="${t.id}" aria-label="Concluir">${icon('check')}</button>
          <div class="ev-text"><div class="ev-title">${esc(t.title)}</div><div class="ev-time">${t.time} – ${fromMin(it.e === 1440 ? 1439 : it.e)}</div></div></div>`;
      }
      const ev = it.ev;
      return `<div class="ev evt ${ev.isClass ? 'cls' : ''}" data-event="${ev.id}" data-occ="${d}" style="${pos};--c:${catColor(ev)}">
        <div class="ev-text"><div class="ev-title">${esc(ev.title || 'Sem título')}</div><div class="ev-time">${ev.time}${ev.end ? ' – ' + ev.end : ''}${ev.location ? ' · ' + esc(ev.location) : ''}</div></div></div>`;
    }).join('');
    const nowL = d === T && nowMin >= h0 * 60 && nowMin < h1 * 60 ? `<div class="now-line" style="top:${y(nowMin)}px"></div>` : '';
    return `<div class="tg-col ${d === T ? 'today' : ''}" data-slot-day="${d}" data-h0="${h0}">${blocks}${nowL}</div>`;
  }).join('');
  const fit = (o.cls || '').includes('fit'), swipe = (o.cls || '').includes('swipe-week');
  return `<div class="tg ${o.cls || ''}" ${swipe ? 'id="tgScroll"' : ''} style="--cols:${days.length};--hour:${HOUR_PX}px">${head}${ad}
    <div class="tg-scroll" ${fit || swipe ? '' : 'id="tgScroll"'}><div class="tg-row tg-body" style="height:${(h1 - h0) * HOUR_PX}px"><div class="tg-gutter">${labels}</div>${cols}</div></div></div>`;
}

function timetableBody() {
  const s0 = weekStart(ui.calSel);
  let days = [0, 1, 2, 3, 4].map(i => addDays(s0, i));
  days = days.concat([5, 6].map(i => addDays(s0, i)).filter(d => eventsOn(d, { classes: true }).length));
  let h0 = 8, h1 = 19;
  for (const d of days) for (const e of eventsOn(d, { classes: true })) if (e.time) {
    h0 = Math.min(h0, Math.floor(toMin(e.time) / 60));
    h1 = Math.max(h1, Math.ceil(toMin(e.end || e.time) / 60));
  }
  return timeGrid(days, {}, false, { h0, h1: Math.min(24, h1), classesOnly: true, tasks: false, cls: 'timetable fit' });
}

function classesList() {
  const cls = events().filter(e => e.isClass).sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  if (!cls.length) return empty('Ainda não tens aulas no horário.', 'Carrega em "+ Aula" ou clica numa hora da grelha para adicionar a primeira.');
  return `<div class="section"><div class="section-title">As tuas aulas<span class="n">${cls.length}</span></div>${cls.map(ev => `
    <div class="evrow" data-event="${ev.id}" data-occ="" style="--c:${catColor(ev)}">
      <div class="evrow-time">${ev.time || '—'}<small>${ev.end || ''}</small></div>
      <div class="evrow-body"><div class="evrow-title">${esc(ev.title || 'Sem título')}</div>
        <div class="task-meta"><span class="meta">${icon('repeat')}${esc(repeatSummary(ev) || fmtDay(ev.date))}</span>${ev.location ? `<span class="meta">${icon('pin')}${esc(ev.location)}</span>` : ''}${ev.repeat && ev.repeat.until ? `<span class="meta">até ${fmtDay(ev.repeat.until)}</span>` : ''}</div></div>
    </div>`).join('')}</div>`;
}

function calTitle() {
  if (ui.calMode === 'month') {
    const [y, m] = ui.calMonth.split('-').map(Number);
    return `${cap(MESES[m - 1])} <span>${y}</span>`;
  }
  if (ui.calMode === 'week' || ui.calMode === 'timetable') {
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
    body = timeGrid([0, 1, 2, 3, 4, 5, 6].map(i => addDays(s0, i)), byDay, true, isMobile() ? { cls: 'swipe-week' } : {});
  } else if (mode === 'timetable') body = timetableBody();
  else body = timeGrid([ui.calSel], byDay, false);

  const seg = `<div class="seg">${[['day', 'Dia'], ['week', 'Semana'], ['month', 'Mês'], ['timetable', 'Horário']].map(([k, l]) =>
    `<button class="${mode === k ? 'on' : ''}" data-cal-mode="${k}">${l}</button>`).join('')}</div>`;
  const first = mode === 'timetable'
    ? `<button class="btn primary" data-add-class style="height:28px;padding:0 11px">${icon('plus')}Aula</button>`
    : `<button class="btn ghost" data-cal-today style="height:28px;padding:0 10px">Hoje</button>`;
  const cal = `<div class="cal cal-mode-${mode}">
    <div class="cal-head">
      <div class="cal-month">${calTitle()}</div>
      ${seg}
      <div class="cal-nav">
        ${first}
        <button class="icon-btn" data-cal-nav="-1" aria-label="Anterior">${icon('chevL')}</button>
        <button class="icon-btn" data-cal-nav="1" aria-label="Seguinte">${icon('chevR')}</button>
      </div>
    </div>
    ${body}
  </div>`;

  if (mode === 'timetable') return { top: head('Calendário', 'O teu horário semanal de aulas') + cal, content: classesList() };

  const dayItems = byDay[ui.calSel] || [];
  const dayEvs = eventsOn(ui.calSel);
  const done = dayItems.filter(t => t.done);
  let content;
  if (mode === 'day') {
    const untimed = sortTasks(dayItems.filter(t => !t.done && !t.time));
    content = agendaBlock(ui.calSel, 'Dia todo', dayEvs.filter(e => !e.time)) + section('Sem hora', untimed, { showDate: false });
    if (!dayItems.some(t => !t.done) && !dayEvs.length) content += empty('', 'Sem tarefas neste dia. Toca numa hora do calendário para marcar.');
  } else {
    const pend = sortTasks(dayItems.filter(t => !t.done));
    content = `<div class="section-title" style="font-size:15px;color:var(--text);margin-bottom:8px">${fmtLong(ui.calSel)}</div>` +
      agendaBlock(ui.calSel, 'Agenda', dayEvs) + section(dayEvs.length ? 'Tarefas' : '', pend, { showDate: false });
    if (!pend.length && !dayEvs.length) content += empty('', mode === 'week' && !isMobile() ? 'Sem tarefas neste dia. Clica numa hora para marcar.' : 'Sem tarefas neste dia.');
  }
  content += doneBlock('cal', done, { showDate: false });
  return { top: head('Calendário', 'Planeia com antecedência') + catChips() + cal, content };
}

function viewList() {
  const l = listById(ui.listId);
  if (!l) { ui.view = 'today'; return viewToday(); }
  const all = tasks().filter(t => t.list === l.id && visible(t));
  const pend = sortManual(all.filter(t => !t.done));
  const done = all.filter(t => t.done);
  const actions = `<button class="icon-btn" data-list-more="${l.id}" aria-label="Opções da lista">${icon('more')}</button>`;
  let content = section('', pend, { showList: false, reorder: true });
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
    <div class="section-title">Ferramentas</div>
    <div class="rows">
      <button class="row" data-nav="upcoming">${icon('upcoming')}<span class="label">Próximos</span>${icon('chevR')}</button>
      <button class="row" data-nav="subjects">${icon('book')}<span class="label">Disciplinas e notas</span><span class="count">${overallAverage() != null ? 'média ' + fmtGrade(overallAverage()) : ''}</span>${icon('chevR')}</button>
      <button class="row" data-nav="stats">${icon('chart')}<span class="label">Estatísticas</span>${icon('chevR')}</button>
      <button class="row" data-nav="focus">${icon('timer')}<span class="label">Temporizador de foco</span>${icon('chevR')}</button>
    </div>
    <div class="section-title">Dados</div>
    <div class="rows">
      <button class="row" data-export>${icon('upload')}<span class="label">Exportar cópia</span></button>
      <button class="row" data-import>${icon('download')}<span class="label">Importar cópia</span></button>
    </div>
    <div class="section-title">Aparência</div>
    <div class="rows">
      <button class="row" data-install>${icon('phone')}<span class="label">Instalar app</span></button>
      <button class="row" data-accent>${icon('palette')}<span class="label">Cor de destaque</span><span class="dot" style="--c:var(--accent);width:12px;height:12px"></span></button>
      <button class="row" data-theme-toggle>${icon('sliders')}<span class="label">Tema e vista</span><span class="count">${{ light: 'Claro', dark: 'Escuro', auto: 'Automático' }[themePref()]}${localStorage.getItem('organizador.density') ? ' · compacta' : ''}</span></button>
    </div>
    <div class="empty" style="padding-top:4px">As tarefas ficam guardadas só neste dispositivo. Usa Exportar / Importar cópia para as passar para outro.<br><br>Versão ${APP_VERSION}</div>`;
  return { top: head('Mais'), content };
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
      ${nav('projects', 'users', 'Trabalhos', projects().filter(p => !p.archived).length)}
      ${nav('focus', 'timer', 'Foco')}
      ${nav('stats', 'chart', 'Estatísticas')}
    </nav>
    <div class="side-section">
      <div class="side-label"><button class="side-link" data-nav="subjects">Disciplinas${overallAverage() != null ? ` <em>${fmtGrade(overallAverage())}</em>` : ''}</button><button class="icon-btn sm" data-add-subject title="Nova disciplina">${icon('plus')}</button></div>
      <div class="nav">
        ${subjects().map(x => `<button class="nav-item ${ui.view === 'subject' && ui.subjectId === x.id ? 'active' : ''}" data-nav="subject" data-id="${x.id}"><span class="dot" style="--c:${x.color};margin:0 5px"></span><span class="label">${esc(x.name)}</span><span class="count">${subjectAverage(x.id) != null ? fmtGrade(subjectAverage(x.id)) : ''}</span></button>`).join('')
        || '<div class="side-empty">Sem disciplinas</div>'}
      </div>
    </div>
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
      <button class="icon-btn" data-theme-toggle title="Aparência (tema, cor, vista compacta)">${icon(theme === 'dark' ? 'moon' : 'sun')}</button></span>
    </div>`;
}

function renderTabbar() {
  const tab = (v, ic, label) => {
    const active = ui.view === v || (v === 'lists' && ['list', 'stats', 'subjects', 'subject', 'upcoming'].includes(ui.view)) || (v === 'projects' && ui.view === 'project');
    return `<button class="tab ${active ? 'active' : ''}" data-nav="${v}">${icon(ic)}${label}</button>`;
  };
  $('#tabbar').innerHTML = tab('today', 'today', 'Hoje') + tab('calendar', 'calendar', 'Calendário') +
    tab('projects', 'users', 'Trabalhos') + tab('focus', 'timer', 'Foco') + tab('lists', 'lists', 'Mais');
}

function render() {
  const v = { today: viewToday, upcoming: viewUpcoming, calendar: viewCalendar, list: viewList, lists: viewLists, search: viewSearch, focus: viewFocus, stats: viewStats, subjects: viewSubjects, subject: viewSubject, projects: viewProjects, project: viewProject }[ui.view] || viewToday;
  const { top, content } = v();
  const sc = $('#tgScroll');
  if (sc) ui.tgScroll = sc.scrollTop;
  const swo = $('.tg.swipe-week');
  if (swo) ui.tgScrollX = swo.scrollLeft;
  $('#top').innerHTML = top;
  const sc2 = $('#tgScroll');
  if (sc2) sc2.scrollTop = ui.tgScroll ?? 7 * HOUR_PX;
  const sw = $('.tg.swipe-week');
  if (sw) {
    if (ui.tgScrollX != null) sw.scrollLeft = ui.tgScrollX;
    else {
      const sel = sw.querySelector('.tg-dh.sel') || sw.querySelector('.tg-dh.today');
      if (sel) sw.scrollLeft = sel.getBoundingClientRect().left - sw.getBoundingClientRect().left + sw.scrollLeft - 40;
    }
  }
  $('#content').innerHTML = content;
  const noComposer = ['lists', 'search', 'focus', 'stats', 'subjects', 'projects', 'project'].includes(ui.view) || (ui.view === 'calendar' && ui.calMode === 'timetable');
  $('#composer').classList.toggle('hidden', noComposer);
  document.body.classList.toggle('lists-view', noComposer);
  document.body.classList.toggle('wide', (ui.view === 'calendar' && (ui.calMode === 'week' || ui.calMode === 'timetable')) || ui.view === 'project');
  renderSidebar();
  renderTabbar();
  updateComposer();
  updateInstallUi();
  updatePomoUi();
  if (ui.kaddFocus) { ui.kaddFocus = false; const i = $('[data-kadd]'); if (i) i.focus({ preventScroll: true }); }
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
      <button class="chip" data-pick="subject">${icon('book')}<span></span></button>
      <button class="chip" data-pick="list">${icon('folder')}<span></span></button>
      <button class="chip flag" data-pick="important">${icon('flag')}<span>Importante</span></button>
      <button class="chip examc" data-pick="exam">${icon('exam')}<span>Exame</span></button>
      <button class="chip evtc" data-pick="event">${icon('event')}<span>Evento</span></button>
    </div>
    <div class="composer-hint" id="composerHint"></div>`;
  const input = $('#newTitle');
  input.addEventListener('input', () => {
    draft.parsed = input.value.trim() ? parseQuick(input.value) : null;
    updateComposer();
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
  draft.subject = ui.view === 'subject' ? ui.subjectId : null;
  draft.important = false;
  draft.exam = false;
  draft.event = false;
  draft.parsed = null;
  updateComposer();
}

function effDraft() {
  const p = draft.parsed || {};
  return {
    date: p.date !== undefined ? p.date : draft.date, time: p.time || draft.time, cat: p.cat || draft.cat,
    subject: p.subject || draft.subject,
    list: draft.list, important: draft.important || !!p.important, exam: draft.exam || !!p.exam,
    event: draft.event, title: p.title, p,
  };
}

function updateComposer() {
  const el = $('#composer');
  if (!el.firstElementChild) return;
  const e = effDraft(), p = e.p;
  const chip = k => el.querySelector(`[data-pick="${k}"]`);
  const [dateC, timeC, catC, listC, flagC, examC, evtC, subC] = ['date', 'time', 'cat', 'list', 'important', 'exam', 'event', 'subject'].map(chip);
  const sb = subjectById(e.subject);
  subC.querySelector('span').textContent = sb ? sb.name : 'Disciplina';
  subC.classList.toggle('set', !!sb);
  subC.classList.toggle('auto', !!p.subject);
  subC.hidden = e.event;
  timeC.querySelector('span').textContent = e.time || 'Hora';
  timeC.classList.toggle('set', !!e.time);
  timeC.classList.toggle('auto', !!p.time);
  dateC.querySelector('span').textContent = e.date ? fmtDay(e.date) : 'Sem data';
  dateC.classList.toggle('set', !!e.date);
  dateC.classList.toggle('auto', p.date !== undefined);
  const c = catById(e.cat);
  catC.querySelector('.dot').style.setProperty('--c', c ? c.color : 'var(--text-3)');
  catC.querySelector('span:last-child').textContent = c ? c.name : 'Categoria';
  catC.classList.toggle('set', !!c);
  catC.classList.toggle('auto', !!p.cat);
  const l = listById(e.list);
  listC.querySelector('span').textContent = l ? l.name : 'Lista';
  listC.classList.toggle('set', !!l);
  listC.hidden = e.event;
  flagC.classList.toggle('set', e.important);
  flagC.classList.toggle('auto', !!p.important);
  flagC.hidden = e.event;
  examC.classList.toggle('set', e.exam);
  examC.classList.toggle('auto', !!p.exam);
  examC.hidden = e.event;
  evtC.classList.toggle('set', e.event);
  const ph = e.event ? 'Novo evento no calendário'
    : ui.view === 'list' && l ? `Adicionar a ${l.name}`
      : ui.view === 'calendar' ? `Adicionar a ${fmtDay(ui.calSel).toLowerCase() === 'hoje' ? 'hoje' : fmtLong(ui.calSel).toLowerCase()}`
        : ui.view === 'today' ? 'Adicionar tarefa — ex.: "Estudar amanhã 14h"' : 'Adicionar tarefa';
  $('#newTitle').placeholder = ph + (draft.time && !p.time ? ` às ${draft.time}` : '');
  const parts = [];
  if (p.date !== undefined) parts.push(p.date ? fmtDay(p.date) : 'sem data');
  if (p.time) parts.push(p.time);
  if (p.cat) parts.push(catById(p.cat)?.name);
  if (p.subject) parts.push(subjectById(p.subject)?.name);
  if (p.important) parts.push('importante');
  if (p.exam) parts.push('exame');
  const hint = $('#composerHint');
  hint.innerHTML = parts.length ? `${icon('check')}Percebi: <b>${esc(parts.join(' · '))}</b>${p.title ? ` — "${esc(p.title)}"` : ''}` : '';
  hint.classList.toggle('show', parts.length > 0);
}

function submitComposer() {
  const input = $('#newTitle');
  const raw = input.value.trim();
  if (!raw) return;
  const e = effDraft();
  const title = (e.title || '').trim() || raw;
  if (e.event) {
    const time = e.time || fromMin(Math.min((new Date().getHours() + 1) * 60, 23 * 60));
    addEvent({ title, date: e.date || today(), time, end: fromMin(Math.min(toMin(time) + 60, 1439)), cat: e.cat });
    toast('Evento adicionado ao calendário');
  } else {
    addTask({ title, date: e.date, time: e.time, cat: e.cat, list: e.list, important: e.important, exam: e.exam, subject: e.subject,
      order: e.list ? nextOrder(e.list) : undefined });
  }
  input.value = '';
  $('#addBtn').disabled = true;
  draft.parsed = null;
  draft.important = false;
  draft.exam = false;
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

/* ------------------------------------------------------------------ formulários */
function formDialog({ title, fields, ok = 'Guardar', danger = null }) {
  return new Promise(resolve => {
    const w = document.createElement('div');
    w.className = 'modal-wrap';
    const fieldHtml = f => {
      if (f.type === 'select') return `<select name="${f.key}" class="modal-input">${f.options.map(([v, l]) => `<option value="${esc(v)}" ${String(f.value ?? '') === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
      if (f.type === 'textarea') return `<textarea name="${f.key}" class="modal-input" rows="3" placeholder="${esc(f.placeholder || '')}">${esc(f.value ?? '')}</textarea>`;
      if (f.type === 'color') return `<div class="modal-colors">${SUBJ_PALETTE.map(c => `<button type="button" style="--c:${c}" data-c="${c}" class="${c === f.value ? 'on' : ''}"></button>`).join('')}<input type="hidden" name="${f.key}" value="${esc(f.value || '')}"></div>`;
      return `<input name="${f.key}" class="modal-input" type="${f.type || 'text'}" value="${esc(f.value ?? '')}" placeholder="${esc(f.placeholder || '')}"${f.min != null ? ` min="${f.min}"` : ''}${f.max != null ? ` max="${f.max}"` : ''}${f.step ? ` step="${f.step}"` : ''}>`;
    };
    w.innerHTML = `<form class="modal form" novalidate><div class="modal-title">${esc(title)}</div>
      ${fields.map(f => `<label class="mfield ${f.half ? 'half' : ''}"><span>${esc(f.label)}</span>${fieldHtml(f)}${f.hint ? `<em>${esc(f.hint)}</em>` : ''}</label>`).join('')}
      <div class="modal-actions">${danger ? `<button type="button" class="btn danger" data-r="del" style="margin-right:auto">${esc(danger)}</button>` : ''}
        <button type="button" class="btn ghost" data-r="0">Cancelar</button><button type="submit" class="btn primary">${esc(ok)}</button></div></form>`;
    document.body.appendChild(w);
    const form = w.querySelector('form');
    const done = v => { w.remove(); resolve(v); };
    w.addEventListener('click', e => {
      if (e.target === w) return done(null);
      const cb = e.target.closest('[data-c]');
      if (cb) {
        cb.parentElement.querySelectorAll('[data-c]').forEach(b => b.classList.toggle('on', b === cb));
        cb.parentElement.querySelector('input[type=hidden]').value = cb.dataset.c;
        return;
      }
      const b = e.target.closest('[data-r]');
      if (b) done(b.dataset.r === 'del' ? '__delete' : null);
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(form);
      done(Object.fromEntries(fields.map(f => [f.key, String(fd.get(f.key) ?? '').trim()])));
    });
    w.addEventListener('keydown', e => { if (e.key === 'Escape') done(null); });
    const first = form.querySelector('input:not([type=hidden]), select, textarea');
    if (first) { first.focus(); if (first.select) first.select(); }
  });
}
const numOrNull = v => (v === '' || v == null || isNaN(Number(String(v).replace(',', '.'))) ? null : Number(String(v).replace(',', '.')));
const splitNames = txt => [...new Set(String(txt || '').split(/[,\n;]+/).map(x => x.trim()).filter(Boolean))].slice(0, 12);

function subjectMenu(anchor, current, onPick) {
  openMenu(anchor, [
    ...subjects().map(x => ({ label: x.name, dot: x.color, checked: current === x.id, onClick: () => onPick(x.id) })),
    { label: 'Sem disciplina', checked: !current, onClick: () => onPick(null) },
    { sep: true },
    { label: 'Nova disciplina…', icon: 'plus', onClick: async () => { const n = await dialog({ title: 'Nova disciplina', value: '', ok: 'Criar' }); if (n) { const sb = findOrCreateSubject(n); saveLocal(); onPick(sb.id); } } },
  ]);
}

/* ------------------------------------------------------------------ disciplinas */
async function editSubject(id) {
  const x = id ? subjectById(id) : null;
  const r = await formDialog({
    title: x ? 'Editar disciplina' : 'Nova disciplina', ok: x ? 'Guardar' : 'Criar', danger: x ? 'Eliminar' : null,
    fields: [
      { key: 'name', label: 'Nome', value: x ? x.name : '', placeholder: 'Ex.: Álgebra Linear' },
      { key: 'color', label: 'Cor', type: 'color', value: x ? x.color : SUBJ_PALETTE.find(c => !subjects().some(s2 => s2.color === c)) || SUBJ_PALETTE[0] },
      { key: 'ects', label: 'Créditos (ECTS)', type: 'number', value: x && x.ects != null ? x.ects : '', min: 0, step: 0.5, hint: 'Opcional. Se todas tiverem ECTS, a média geral é ponderada.' },
    ],
  });
  if (!r) return;
  if (r === '__delete') {
    if (!await dialog({ title: `Eliminar "${x.name}"?`, text: 'As tarefas, aulas e notas ficam sem disciplina (não são apagadas).', ok: 'Eliminar', danger: true })) return;
    touch(x, { deleted: true });
    tasks().filter(t => t.subject === id).forEach(t => touch(t, { subject: null }));
    live(db.events).filter(e => e.subject === id).forEach(e => touch(e, { subject: null }));
    grades().filter(g => g.subject === id).forEach(g => touch(g, { subject: null }));
    if (ui.view === 'subject') ui.view = 'subjects';
    return commit();
  }
  if (!r.name) return;
  if (x) touch(x, { name: r.name, color: r.color || x.color, ects: numOrNull(r.ects) });
  else { const sb = addSubject(r.name, { color: r.color, ects: numOrNull(r.ects) }); commit(); return setView('subject', sb.id); }
  commit();
}

async function editGrade(sid, gid) {
  const g = gid ? grades().find(x => x.id === gid) : null;
  const r = await formDialog({
    title: g ? 'Editar nota' : 'Nova nota', ok: g ? 'Guardar' : 'Adicionar', danger: g ? 'Eliminar' : null,
    fields: [
      { key: 'name', label: 'Avaliação', value: g ? g.name : '', placeholder: 'Ex.: Teste 1, Projeto, Exame final' },
      { key: 'score', label: 'Nota', type: 'number', value: g && g.score != null ? g.score : '', step: 0.1, min: 0, half: true },
      { key: 'max', label: 'Em', type: 'number', value: g ? g.max || 20 : 20, step: 1, min: 1, half: true },
      { key: 'weight', label: 'Peso na nota final (%)', type: 'number', value: g && g.weight != null ? g.weight : '', min: 0, max: 100, step: 1, half: true, hint: 'Deixa vazio se todas valem o mesmo.' },
      { key: 'date', label: 'Data', type: 'date', value: g ? g.date || '' : today(), half: true },
    ],
  });
  if (!r) return;
  if (r === '__delete') { touch(g, { deleted: true }); return commit(); }
  const patch = { name: r.name || 'Avaliação', score: numOrNull(r.score), max: numOrNull(r.max) || 20, weight: numOrNull(r.weight), date: r.date || null };
  if (g) touch(g, patch);
  else db.grades.push({ id: uid(), subject: sid, created: now(), updatedAt: now(), ...patch });
  commit();
}

function seriesRow(ev) {
  return `<div class="evrow" data-event="${ev.id}" data-occ="" style="--c:${catColor(ev)}">
    <div class="evrow-time">${ev.time || '—'}<small>${ev.end || ''}</small></div>
    <div class="evrow-body"><div class="evrow-title">${esc(ev.title || 'Sem título')}</div>
      <div class="task-meta"><span class="meta">${icon('repeat')}${esc(repeatSummary(ev) || fmtDay(ev.date))}</span>${ev.location ? `<span class="meta">${icon('pin')}${esc(ev.location)}</span>` : ''}${ev.repeat && ev.repeat.until ? `<span class="meta">até ${fmtDay(ev.repeat.until)}</span>` : ''}</div></div>
  </div>`;
}

function viewSubjects() {
  const avg = overallAverage();
  const list = subjects();
  const actions = `<button class="btn primary" data-add-subject style="height:30px">${icon('plus')}Disciplina</button>`;
  const top = head('Disciplinas', avg != null ? `Média geral <b class="avg-pill">${fmtGrade(avg)}</b>` : 'As tuas cadeiras deste semestre', '', actions);
  if (!list.length) return { top, content: empty('Ainda sem disciplinas.', 'Cria uma aqui, ou adiciona aulas no Horário — cada aula cria a sua disciplina.') };
  const T = today();
  return {
    top,
    content: `<div class="subj-grid">${list.map(x => {
      const pend = tasks().filter(t => t.subject === x.id && !t.done).length;
      const ex = tasks().filter(t => t.subject === x.id && t.exam && !t.done && t.date && t.date >= T).sort(cmpTask)[0];
      const nc = nextClass(x.id), a = subjectAverage(x.id);
      return `<button class="subj-card" data-nav="subject" data-id="${x.id}" style="--c:${x.color}">
        <div class="subj-top"><span class="subj-name">${esc(x.name)}</span><span class="subj-avg ${a == null ? 'none' : ''}">${fmtGrade(a)}</span></div>
        <div class="subj-meta">${icon('school')}${nc ? `${fmtDay(nc.date)}${nc.ev.time ? ' · ' + nc.ev.time : ''}` : 'Sem aulas marcadas'}</div>
        <div class="subj-meta">${icon('checklist')}${pend} por fazer${ex ? ` · <span class="exam-txt">${examLabel(ex.date)}</span>` : ''}</div>
      </button>`;
    }).join('')}</div>`,
  };
}

function viewSubject() {
  const x = subjectById(ui.subjectId);
  if (!x) { ui.view = 'subjects'; return viewSubjects(); }
  const ts = tasks().filter(t => t.subject === x.id);
  const exams = sortTasks(ts.filter(t => t.exam && !t.done));
  const pend = sortTasks(ts.filter(t => !t.done && !t.exam));
  const done = ts.filter(t => t.done);
  const cls = live(db.events).filter(e => e.isClass && e.subject === x.id);
  const nc = nextClass(x.id), a = subjectAverage(x.id);
  const gs = grades().filter(g => g.subject === x.id).sort((p, q) => (p.date || '').localeCompare(q.date || ''));
  const actions = `<button class="icon-btn" data-subject-edit="${x.id}" aria-label="Editar disciplina">${icon('more')}</button>`;
  const sub = nc ? `Próxima aula: ${fmtLong(nc.date)}${nc.ev.time ? ' às ' + nc.ev.time : ''}${nc.ev.location ? ' · ' + esc(nc.ev.location) : ''}` : 'Sem aulas no horário';
  const stats = `<div class="subj-stats" style="--c:${x.color}">
    <div><b>${fmtGrade(a)}</b><span>média</span></div><div><b>${pend.length}</b><span>por fazer</span></div>
    <div><b>${exams.length}</b><span>exame${exams.length === 1 ? '' : 's'}</span></div><div><b>${gs.length}</b><span>nota${gs.length === 1 ? '' : 's'}</span></div></div>`;
  const gradesHtml = `<div class="section"><div class="section-title">Notas<span class="n">${gs.length}</span><button class="sec-action" data-add-grade="${x.id}">+ Nota</button></div>
    ${gs.length ? gs.map(g => `<div class="grade-row" data-grade="${g.id}" data-grade-subject="${x.id}">
      <span class="g-name">${esc(g.name || 'Avaliação')}</span>
      <span class="g-meta">${g.date ? fmtDay(g.date) : ''}${g.weight != null ? ' · peso ' + g.weight + '%' : ''}</span>
      <span class="g-score ${g.score != null && g.score / (g.max || 20) < 0.475 ? 'low' : ''}">${g.score == null ? '—' : fmtGrade(g.score)}<small>/${g.max || 20}</small></span></div>`).join('')
    : '<div class="empty" style="padding:6px 10px">Ainda sem notas. Regista aqui as avaliações, ou no detalhe de um exame.</div>'}</div>`;
  const clsHtml = `<div class="section"><div class="section-title">Horário<span class="n">${cls.length}</span><button class="sec-action" data-add-class-subject="${x.id}">+ Aula</button></div>
    ${cls.length ? cls.map(seriesRow).join('') : '<div class="empty" style="padding:6px 10px">Sem aulas. Adiciona-as aqui ou no Calendário → Horário.</div>'}</div>`;
  const content = section('Exames e avaliações', exams, { showSubject: false }) + section('Por fazer', pend, { showSubject: false })
    + gradesHtml + clsHtml + doneBlock('subj:' + x.id, done, { showSubject: false });
  return { top: head(x.name, sub, stats, actions), content };
}

/* ------------------------------------------------------------------ trabalhos de grupo */
const topicStatus = t => (t.done ? 'done' : t.status === 'doing' ? 'doing' : 'todo');
function setTopicStatus(id, st, order) {
  const t = taskById(id);
  if (!t) return;
  const patch = st === 'done' ? (t.done ? {} : { done: true, doneAt: now() }) : { done: false, doneAt: null, status: st };
  if (order != null) patch.order = order;
  if (st === 'done') patch.status = 'done';
  touch(t, patch);
  commit();
  if (ui.openTask === id) renderDetail();
}

async function editProject(id) {
  const p = id ? projectById(id) : null;
  const r = await formDialog({
    title: p ? 'Editar trabalho' : 'Novo trabalho de grupo', ok: p ? 'Guardar' : 'Criar', danger: p ? 'Eliminar' : null,
    fields: [
      { key: 'name', label: 'Nome', value: p ? p.name : '', placeholder: 'Ex.: Projeto de Programação' },
      { key: 'subject', label: 'Disciplina', type: 'select', value: p ? p.subject || '' : '', options: [['', 'Nenhuma'], ...subjects().map(x => [x.id, x.name])] },
      { key: 'due', label: 'Data de entrega', type: 'date', value: p ? p.due || '' : '' },
      { key: 'members', label: 'Membros do grupo', type: 'textarea', value: p ? (p.members || []).join(', ') : 'Eu, ', placeholder: 'Eu, Rita, João, Ana', hint: 'Separa os nomes com vírgulas.' },
    ],
  });
  if (!r) return;
  if (r === '__delete') {
    const n = tasks().filter(t => t.project === id).length;
    if (!await dialog({ title: `Eliminar "${p.name}"?`, text: n ? `Os ${n} tópicos também são eliminados.` : '', ok: 'Eliminar', danger: true })) return;
    touch(p, { deleted: true });
    tasks().filter(t => t.project === id).forEach(t => touch(t, { deleted: true }));
    ui.view = 'projects';
    return commit();
  }
  if (!r.name) return;
  const data = { name: r.name, subject: r.subject || null, due: r.due || null, members: splitNames(r.members) };
  if (p) {
    touch(p, data);
    tasks().filter(t => t.project === id && t.assignee && !data.members.includes(t.assignee)).forEach(t => touch(t, { assignee: null }));
    if (data.subject) tasks().filter(t => t.project === id && !t.subject).forEach(t => touch(t, { subject: data.subject }));
    commit();
  } else {
    const np = { id: uid(), created: now(), updatedAt: now(), archived: false, ...data };
    db.projects.push(np);
    commit();
    setView('project', np.id);
  }
}

function projectMenu(anchor, id) {
  const p = projectById(id);
  openMenu(anchor, [
    { label: 'Editar trabalho', icon: 'pencil', onClick: () => editProject(id) },
    { label: p.archived ? 'Desarquivar' : 'Arquivar (entregue)', icon: 'folder', onClick: () => { touch(p, { archived: !p.archived }); commit(); } },
  ]);
}

function projCard(p) {
  const ts = tasks().filter(t => t.project === p.id);
  const d = ts.filter(t => t.done).length, pct = ts.length ? Math.round(100 * d / ts.length) : 0;
  const sub = subjectById(p.subject);
  const due = p.due ? diffDays(p.due, today()) : null;
  return `<button class="proj-card ${p.archived ? 'archived' : ''}" data-nav="project" data-id="${p.id}" style="--c:${sub ? sub.color : 'var(--accent)'}">
    <div class="proj-top"><span class="proj-name">${esc(p.name)}</span>${p.due ? `<span class="proj-due ${!p.archived && due < 3 ? 'soon' : ''}">${due === 0 ? 'Entrega hoje' : due > 0 ? `${due} dia${due === 1 ? '' : 's'}` : fmtDay(p.due)}</span>` : ''}</div>
    ${sub ? `<div class="subj-meta"><span class="dot" style="--c:${sub.color}"></span>${esc(sub.name)}</div>` : ''}
    <div class="proj-progress"><i style="width:${pct}%"></i></div>
    <div class="proj-foot"><span>${d}/${ts.length} tópicos</span><span class="av-stack">${(p.members || []).slice(0, 5).map(m => avatar(m, 'sm')).join('')}</span></div>
  </button>`;
}

function viewProjects() {
  const ps = projects();
  const actions = `<button class="btn primary" data-add-project style="height:30px">${icon('plus')}Trabalho</button>`;
  const top = head('Trabalhos de grupo', 'Divide o trabalho em tópicos e distribui pelo grupo', '', actions);
  if (!ps.length) return { top, content: empty('Ainda sem trabalhos de grupo.', 'Cria um, adiciona os membros e divide-o em tópicos.') };
  const act = ps.filter(p => !p.archived), arch = ps.filter(p => p.archived);
  return {
    top,
    content: `<div class="proj-grid">${act.map(projCard).join('')}</div>` +
      (arch.length ? `<div class="section-title" style="margin-top:22px">Arquivados<span class="n">${arch.length}</span></div><div class="proj-grid">${arch.map(projCard).join('')}</div>` : ''),
  };
}

function kcard(t) {
  const subs = t.subtasks || [];
  return `<div class="kcard ${t.done ? 'done' : ''} ${t.id === lastAdded ? 'new' : ''}" data-task="${t.id}" data-kcard="${t.id}">
    <div class="kcard-title">${esc(t.title)}</div>
    <div class="kcard-meta">${t.assignee ? `<span class="meta who">${avatar(t.assignee, 'xs')}${esc(t.assignee)}</span>` : '<span class="meta faint">Sem responsável</span>'}
      ${t.date ? `<span class="meta ${!t.done && t.date < today() ? 'overdue' : ''}">${icon('calendar')}${fmtDay(t.date)}</span>` : ''}
      ${subs.length ? `<span class="meta">${icon('checklist')}${subs.filter(x => x.done).length}/${subs.length}</span>` : ''}</div>
  </div>`;
}

function viewProject() {
  const p = projectById(ui.projectId);
  if (!p) { ui.view = 'projects'; return viewProjects(); }
  const sub = subjectById(p.subject);
  const all = tasks().filter(t => t.project === p.id);
  const who = ui.projWho ?? null;
  const vis = all.filter(t => who === null || (who === '' ? !t.assignee : t.assignee === who));
  const col = st => sortManual(vis.filter(t => topicStatus(t) === st));
  const d = all.filter(t => t.done).length, pct = all.length ? Math.round(100 * d / all.length) : 0;
  const due = p.due ? diffDays(p.due, today()) : null;
  const subParts = [sub ? `<span class="dot" style="--c:${sub.color}"></span>${esc(sub.name)}` : '',
    p.due ? (due === 0 ? '<b class="danger-txt">Entrega hoje</b>' : due > 0 ? `Entrega ${fmtDay(p.due).toLowerCase()} · faltam ${due} dia${due === 1 ? '' : 's'}` : `Entrega foi ${fmtDay(p.due).toLowerCase()}`) : ''].filter(Boolean);
  const members = p.members || [];
  const actions = `<button class="icon-btn" data-project-more="${p.id}" aria-label="Opções do trabalho">${icon('more')}</button>`;
  const progress = `<div class="progress"><div class="progress-bar"><i style="width:${pct}%"></i></div>${d} de ${all.length} tópicos concluídos</div>`;
  const membersHtml = `<div class="proj-members">${members.map(m => `<span class="member">${avatar(m)}<span>${esc(m)}</span><b>${all.filter(t => t.assignee === m && !t.done).length}</b></span>`).join('')}
    <button class="chip" data-proj-members>${icon('users')}${members.length ? 'Membros' : 'Adicionar membros'}</button></div>`;
  const chips = members.length ? `<div class="cat-chips show">${[['__all', 'Todos'], ...members.map(m => [m, m]), ['', 'Sem responsável']].map(([k, l]) =>
    `<button class="chip ${(who === null && k === '__all') || who === k ? 'on' : ''}" data-proj-who="${esc(k)}">${k && k !== '__all' ? avatar(k, 'xs') : ''}${esc(l)}</button>`).join('')}</div>` : '';
  const empties = { todo: 'Sem tópicos', doing: 'Arrasta para aqui o que está em curso', done: 'Nada concluído ainda' };
  const board = `<div class="board">${[['todo', 'Por fazer'], ['doing', 'Em curso'], ['done', 'Feito']].map(([st, l]) => {
    const items = col(st);
    return `<div class="kcol" data-col="${st}">
      <div class="kcol-head"><span class="kdot ${st}"></span>${l}<span class="n">${items.length}</span></div>
      ${st === 'todo' ? `<input class="kadd" data-kadd placeholder="Novo tópico… (@nome para atribuir)" maxlength="200" enterkeyhint="done">` : ''}
      <div class="kcards">${items.map(kcard).join('') || `<div class="kempty">${empties[st]}</div>`}</div></div>`;
  }).join('')}</div>`;
  return { top: head(p.name, subParts.join(' · '), progress, actions) + membersHtml + chips, content: board };
}

function addTopic(text) {
  const p = projectById(ui.projectId);
  if (!p || !text.trim()) return;
  let s2 = ` ${text} `, assignee = null;
  const m = s2.match(/(?:^|\s)@([\p{L}\d_-]+)/u);
  if (m) {
    const tag = norm(m[1]);
    assignee = (p.members || []).find(x => norm(x).startsWith(tag)) || null;
    if (assignee) s2 = s2.replace(m[0], ' ');
  }
  const pq = parseQuick(s2.trim());
  const title = (pq && pq.title) || s2.trim();
  const os = tasks().filter(t => t.project === p.id && t.order != null).map(t => t.order);
  ui.kaddFocus = true;
  addTask({ title, project: p.id, status: 'todo', assignee, subject: p.subject || null, date: pq ? pq.date ?? null : null, time: pq ? pq.time || null : null,
    order: os.length ? Math.max(...os) + 1 : 0 });
  ui.kaddFocus = true;
}

/* ------------------------------------------------------------------ datas por texto */
const LB = '(?<![\\p{L}\\d])', RB = '(?![\\p{L}\\d])';
const WD_RE = [
  ['domingo', 0], ['segunda(?:-feira)?|seg', 1], ['ter[çc]a(?:-feira)?', 2], ['quarta(?:-feira)?|qua', 3],
  ['quinta(?:-feira)?|qui', 4], ['sexta(?:-feira)?|sex', 5], ['s[áa]bado|s[áa]b', 6],
];
const MES_RE = 'janeiro|jan|fevereiro|fev|mar[çc]o|mar|abril|abr|maio|mai|junho|jun|julho|jul|agosto|ago|setembro|set|outubro|out|novembro|nov|dezembro|dez';
const monthIdx = m => ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'].indexOf(norm(m).slice(0, 3));

function mkDate(y, m, d) {
  const dt = new Date(y, m, d);
  return dt.getMonth() === m && dt.getDate() === d ? iso(dt) : null;
}

function parseQuick(raw) {
  let s = ` ${raw} `;
  const out = {};
  const T = today(), tY = new Date().getFullYear();
  const take = (re, fn) => {
    const m = s.match(re);
    if (!m) return false;
    if (fn(m) === false) return false;
    s = s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length);
    return true;
  };
  const pre = '(?:(?:no|na|em|para|at[ée]|ate|a)\\s+)?';
  // hora
  take(new RegExp(`${LB}(?:(?:[àa]s?|pelas|a\\s+partir\\s+das)\\s+)?(\\d{1,2})(?::(\\d{2})|h(\\d{2})?)${RB}`, 'iu'), m => {
    const h = +m[1], mi = +(m[2] || m[3] || 0);
    if (h > 23 || mi > 59) return false;
    out.time = `${z(h)}:${z(mi)}`;
  }) ||
  take(new RegExp(`${LB}(?:[àa]s|pelas)\\s+(\\d{1,2})${RB}`, 'iu'), m => {
    if (+m[1] > 23) return false;
    out.time = `${z(+m[1])}:00`;
  }) ||
  take(new RegExp(`${LB}(?:ao\\s+)?meio[\\s-]dia${RB}`, 'iu'), () => { out.time = '12:00'; });
  // data
  take(new RegExp(`${LB}${pre}depois\\s+de\\s+amanh[ãa]${RB}`, 'iu'), () => { out.date = addDays(T, 2); }) ||
  take(new RegExp(`${LB}${pre}amanh[ãa]${RB}`, 'iu'), () => { out.date = addDays(T, 1); }) ||
  take(new RegExp(`${LB}${pre}hoje${RB}`, 'iu'), () => { out.date = T; }) ||
  take(new RegExp(`${LB}(?:em|daqui\\s+a)\\s+(\\d{1,3})\\s+dias?${RB}`, 'iu'), m => { out.date = addDays(T, +m[1]); }) ||
  take(new RegExp(`${LB}(?:na\\s+)?pr[óo]xima\\s+semana${RB}`, 'iu'), () => { out.date = nextWeekday(1); }) ||
  take(new RegExp(`${LB}${pre}(?:dia\\s+)?(\\d{1,2})[/.-](\\d{1,2})(?:[/.-](\\d{2,4}))?${RB}`, 'iu'), m => {
    let y = m[3] ? +m[3] : tY; if (y < 100) y += 2000;
    let d = mkDate(y, +m[2] - 1, +m[1]);
    if (d && !m[3] && d < T) d = mkDate(y + 1, +m[2] - 1, +m[1]);
    if (!d) return false;
    out.date = d;
  }) ||
  take(new RegExp(`${LB}${pre}(?:dia\\s+)?(\\d{1,2})\\s*(?:de\\s+)?(${MES_RE})(?:\\s+(?:de\\s+)?(\\d{4}))?${RB}`, 'iu'), m => {
    const mo = monthIdx(m[2]); const y = m[3] ? +m[3] : tY;
    let d = mkDate(y, mo, +m[1]);
    if (d && !m[3] && d < T) d = mkDate(y + 1, mo, +m[1]);
    if (!d) return false;
    out.date = d;
  }) ||
  take(new RegExp(`${LB}${pre}dia\\s+(\\d{1,2})${RB}`, 'iu'), m => {
    const n = new Date(); let d = mkDate(n.getFullYear(), n.getMonth(), +m[1]);
    if (d && d < T) d = mkDate(n.getFullYear(), n.getMonth() + 1, +m[1]);
    if (!d) return false;
    out.date = d;
  }) ||
  WD_RE.some(([re, wd]) => take(new RegExp(`${LB}(?:(?:na|no|esta|este|nesta|neste)\\s+)?((?:pr[óo]xim[ao])\\s+)?(?:${re})${RB}`, 'iu'), m => {
    let n = (wd - new Date().getDay() + 7) % 7;
    if (m[1] && n === 0) n = 7;
    out.date = addDays(T, n);
  }));
  // categoria (#nome)
  take(/(?:^|\s)#([\p{L}\d_-]+)/u, m => {
    const tag = norm(m[1]);
    const c = cats().find(k => norm(k.name).startsWith(tag));
    if (c) { out.cat = c.id; return; }
    const sb = subjects().find(k => norm(k.name).startsWith(tag) || norm(k.name).split(/\s+/).some(w => w.startsWith(tag)));
    if (!sb) return false;
    out.subject = sb.id;
  });
  // importante (!)
  take(/(?:^|\s)!+(?=\s|$)/u, () => { out.important = true; });
  // exame (a palavra fica no título)
  if (new RegExp(`${LB}(?:exame|teste|frequ[êe]ncia|prova)${RB}`, 'iu').test(s)) out.exam = true;
  let title = s.replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 3; i++) title = title.replace(/(?:^|\s)(?:[àa]s|no|na|dia|para|em|de|at[ée]|a|,|-|–)$/iu, '').trim();
  title = title.replace(/^(?:para|no|na)\s+/iu, '').trim();
  if (title && title !== raw.trim()) out.title = title;
  return (out.date !== undefined || out.time || out.cat || out.subject || out.important || out.exam) ? out : null;
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
  ui.openEvent = null;
  ui.openTask = id;
  renderDetail();
  document.body.classList.add('detail-open');
  render();
}
function closeDetail() {
  if (!ui.openTask && !ui.openEvent) return;
  if (ui.openEvent) {
    const ev = eventById(ui.openEvent.id);
    if (ev && !ev.title.trim()) touch(ev, { title: ev.isClass ? 'Aula' : 'Evento' }), saveLocal();
    migrateClasses();
  }
  ui.openTask = null;
  ui.openEvent = null;
  document.body.classList.remove('detail-open');
  render();
}

function renderDetail() {
  const id = ui.openTask;
  const t = taskById(id);
  if (!t) return closeDetail();
  const c = catById(t.cat);
  const created = new Date(t.created);
  const prj = projectById(t.project);
  const g = t.exam ? gradeOfTask(t.id) : null;
  const subs = t.subtasks || [];
  const el = $('#detail');
  el.innerHTML = `
    <div class="grabber"></div>
    <div class="detail-head">
      <span>${t.done ? 'Concluída' : 'Tarefa'}</span>
      <button class="icon-btn" data-close-detail aria-label="Fechar">${icon('x')}</button>
    </div>
    <div class="detail-body">
      <div class="detail-title-row">
        <button class="check ${t.done ? '' : ''}" data-d-toggle style="${(c || subjectById(t.subject)) ? `--c:${catColor(t)}` : ''}${t.done ? ';background:var(--c,var(--text-3));color:var(--surface);border-color:var(--c,var(--text-3))' : ''}">${icon('check')}</button>
        <textarea class="title" rows="1" placeholder="Título" maxlength="300">${esc(t.title)}</textarea>
      </div>
      <textarea class="notes" placeholder="Notas">${esc(t.notes)}</textarea>
      <div class="subtasks">
        <div class="subtasks-head">${icon('checklist')}Subtarefas${subs.length ? `<span>${subs.filter(x => x.done).length}/${subs.length}</span>` : ''}</div>
        ${subs.length ? `<div class="sub-progress"><i style="width:${Math.round(100 * subs.filter(x => x.done).length / subs.length)}%"></i></div>` : ''}
        ${subs.map(x => `<div class="subtask ${x.done ? 'done' : ''}" data-sub="${x.id}">
          <button class="check sm" data-sub-toggle="${x.id}" aria-label="Concluir subtarefa">${icon('check')}</button>
          <input class="sub-title" value="${esc(x.title)}" data-sub-title="${x.id}" maxlength="200">
          <button class="icon-btn sm" data-sub-del="${x.id}" title="Remover">${icon('x')}</button></div>`).join('')}
        <div class="subtask add">${icon('plus')}<input class="sub-title" id="subNew" placeholder="Adicionar subtarefa" maxlength="200" enterkeyhint="done"></div>
      </div>
      ${prj ? `<div class="props project-props">
        <div class="prop"><div class="prop-label">${icon('users')}Trabalho</div>
          <div class="prop-value"><button class="link-btn" data-nav="project" data-id="${prj.id}">${esc(prj.name)}</button></div></div>
        <div class="prop"><div class="prop-label">${icon('board')}Estado</div>
          <div class="prop-value"><div class="seg">${[['todo', 'Por fazer'], ['doing', 'Em curso'], ['done', 'Feito']].map(([k, l2]) => `<button class="${topicStatus(t) === k ? 'on' : ''}" data-d-status="${k}">${l2}</button>`).join('')}</div></div></div>
        <div class="prop"><div class="prop-label">${icon('users')}Responsável</div>
          <div class="prop-value"><div class="who-pick">${['', ...(prj.members || [])].map(m => `<button class="pill ${(t.assignee || '') === m ? 'on' : ''}" data-d-who="${esc(m)}">${m ? avatar(m, 'xs') + esc(m) : 'Ninguém'}</button>`).join('')}</div></div></div>
      </div>` : ''}
      <div class="props">
        <div class="prop"><div class="prop-label">${icon('book')}Disciplina</div>
          <div class="prop-value"><select class="field ${t.subject ? '' : 'empty-val'}" data-f="subject"><option value="">Nenhuma</option>${subjects().map(x => `<option value="${x.id}" ${t.subject === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}<option value="__new">+ Nova disciplina…</option></select>
          ${t.subject && !t.date && nextClass(t.subject) ? `<button class="link-btn" data-d-nextclass>Próxima aula: ${fmtDay(nextClass(t.subject).date)}</button>` : ''}</div></div>
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
        ${t.repeat === 'custom' ? `<div class="prop"><div class="prop-label"></div><div class="prop-value">${dayPills(t.repeatDays || [], 'data-d-day')}</div></div>` : ''}
        <div class="prop"><div class="prop-label">${icon('flag')}Importante</div>
          <div class="prop-value"><button class="switch ${t.important ? 'on' : ''}" data-d-important aria-label="Importante"></button></div></div>
        <div class="prop"><div class="prop-label">${icon('exam')}Exame</div>
          <div class="prop-value"><button class="switch exam-sw ${t.exam ? 'on' : ''}" data-d-exam aria-label="Exame ou prazo"></button>${t.exam ? `<span class="hint-text">${t.date ? examLabel(t.date) : 'Define a data para ver a contagem'}</span>` : ''}</div></div>
        ${t.exam ? `<div class="prop"><div class="prop-label">${icon('star')}Nota</div>
          <div class="prop-value"><input type="number" class="field num" data-g="score" min="0" step="0.1" value="${g && g.score != null ? g.score : ''}" placeholder="—"><span class="hint-text">/</span>
          <input type="number" class="field num" data-g="max" min="1" step="1" value="${g ? g.max || 20 : 20}"><span class="hint-text">peso</span>
          <input type="number" class="field num" data-g="weight" min="0" max="100" step="1" value="${g && g.weight != null ? g.weight : ''}" placeholder="%"><span class="hint-text">%</span></div></div>
          ${!t.subject ? '<div class="prop"><div class="prop-label"></div><div class="prop-value"><span class="hint-text">Liga a uma disciplina para a nota contar na média.</span></div></div>' : ''}` : ''}
      </div>
    </div>
    <div class="detail-foot">
      <span>Criada a ${created.getDate()} ${MESES[created.getMonth()].slice(0, 3)}</span>
      <span style="display:flex;gap:6px">${t.done ? '' : `<button class="btn ghost" data-d-focus>${icon('timer')}Focar</button>`}<button class="btn danger" data-d-delete>${icon('trash')}Eliminar</button></span>
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
    if (k === 'subject') {
      if (f.value === '__new') {
        return dialog({ title: 'Nova disciplina', value: '', ok: 'Criar' }).then(n => {
          if (!n) return renderDetail();
          const sub = findOrCreateSubject(n);
          save({ subject: sub.id }, true);
        });
      }
      const gg = gradeOfTask(id);
      if (gg) touch(gg, { subject: f.value || null });
      return save({ subject: f.value || null }, true);
    }
    if (k === 'remind') {
      const val = f.value === '' ? null : Number(f.value);
      save({ remind: val }, true);
      if (val != null) askNotifyPermission();
      return;
    }
    if (k === 'repeat') {
      const tk = T();
      const patch = { repeat: f.value };
      if (f.value !== 'none' && !tk.date) patch.date = today();
      if (f.value === 'custom' && !(tk.repeatDays || []).length) patch.repeatDays = [parseISO(patch.date || tk.date).getDay()];
      return save(patch, true);
    }
    save({ [k]: v }, k !== 'notes');
  }));
  el.querySelectorAll('[data-clear]').forEach(b => b.addEventListener('click', () => save({ [b.dataset.clear]: null }, true)));
  el.querySelectorAll('[data-set-cat]').forEach(b => b.addEventListener('click', () => {
    const tk = T(); save({ cat: tk.cat === b.dataset.setCat ? null : b.dataset.setCat }, true);
  }));
  el.querySelector('[data-d-important]').addEventListener('click', () => save({ important: !T().important }, true));
  el.querySelector('[data-d-exam]').addEventListener('click', () => save({ exam: !T().exam }, true));
  // subtarefas
  const subNew = el.querySelector('#subNew');
  subNew.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !subNew.value.trim()) return;
    e.preventDefault();
    save({ subtasks: [...(T().subtasks || []), { id: uid(), title: subNew.value.trim(), done: false }] }, true);
    setTimeout(() => { const n = $('#subNew'); if (n) n.focus(); }, 0);
  });
  el.querySelectorAll('[data-sub-toggle]').forEach(b => b.addEventListener('click', () => {
    save({ subtasks: T().subtasks.map(x => x.id === b.dataset.subToggle ? { ...x, done: !x.done } : x) }, true);
  }));
  el.querySelectorAll('[data-sub-del]').forEach(b => b.addEventListener('click', () => {
    save({ subtasks: T().subtasks.filter(x => x.id !== b.dataset.subDel) }, true);
  }));
  el.querySelectorAll('[data-sub-title]').forEach(inp => inp.addEventListener('change', () => {
    const v = inp.value.trim();
    save({ subtasks: v ? T().subtasks.map(x => x.id === inp.dataset.subTitle ? { ...x, title: v } : x) : T().subtasks.filter(x => x.id !== inp.dataset.subTitle) }, true);
  }));
  // trabalho de grupo
  el.querySelectorAll('[data-d-status]').forEach(b => b.addEventListener('click', () => setTopicStatus(id, b.dataset.dStatus)));
  el.querySelectorAll('[data-d-who]').forEach(b => b.addEventListener('click', () => save({ assignee: b.dataset.dWho || null }, true)));
  const nc = el.querySelector('[data-d-nextclass]');
  if (nc) nc.addEventListener('click', () => { const n = nextClass(T().subject); if (n) save({ date: n.date, time: n.ev.time || null }, true); });
  // nota do exame
  el.querySelectorAll('[data-g]').forEach(inp => inp.addEventListener('change', () => {
    const tk = T();
    let gg = gradeOfTask(id);
    if (!gg) { gg = { id: uid(), taskId: id, subject: tk.subject || null, name: tk.title, score: null, max: 20, weight: null, date: tk.date || today(), created: now() }; db.grades.push(gg); }
    const v = inp.value === '' ? null : Number(inp.value);
    touch(gg, { [inp.dataset.g]: v, name: tk.title, subject: tk.subject || null, date: tk.date || gg.date });
    saveLocal(); render();
  }));
  el.querySelectorAll('[data-d-day]').forEach(b => b.addEventListener('click', () => {
    const d = +b.dataset.dDay, cur = T().repeatDays || [];
    const days = cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d];
    if (days.length) save({ repeatDays: days }, true);
  }));
  const fb = el.querySelector('[data-d-focus]');
  if (fb) fb.addEventListener('click', () => { pomo.taskId = id; savePomo(); closeDetail(); setView('focus'); });
  el.querySelector('[data-d-toggle]').addEventListener('click', () => { toggleTask(id); renderDetail(); });
  el.querySelector('[data-d-delete]').addEventListener('click', () => deleteTask(id));
  el.querySelector('[data-close-detail]').addEventListener('click', closeDetail);
}

function openEvent(id, occ) {
  closeComposerSheet();
  ui.openTask = null;
  ui.openEvent = { id, occ: occ || null };
  renderEventDetail();
  document.body.classList.add('detail-open');
  render();
}

function renderEventDetail() {
  const { id, occ } = ui.openEvent;
  const ev = eventById(id);
  if (!ev) return closeDetail();
  const r = ev.repeat || { freq: 'none' };
  const days = (r.days && r.days.length) ? r.days : [parseISO(ev.date).getDay()];
  const el = $('#detail');
  el.innerHTML = `
    <div class="grabber"></div>
    <div class="detail-head">
      <span>${ev.isClass ? 'Aula' : 'Evento'}${occ && r.freq !== 'none' ? ' · ' + fmtLong(occ) : ''}</span>
      <button class="icon-btn" data-close-detail aria-label="Fechar">${icon('x')}</button>
    </div>
    <div class="detail-body">
      <div class="detail-title-row">
        <span class="ev-swatch" style="--c:${catColor(ev)}"></span>
        <textarea class="title" rows="1" placeholder="${ev.isClass ? 'Nome da disciplina' : 'Título do evento'}" maxlength="200">${esc(ev.title)}</textarea>
      </div>
      <textarea class="notes" placeholder="Notas">${esc(ev.notes || '')}</textarea>
      <div class="props">
        <div class="prop"><div class="prop-label">${icon('school')}Aula</div>
          <div class="prop-value"><button class="switch accent ${ev.isClass ? 'on' : ''}" data-e-class aria-label="É uma aula"></button><span class="hint-text">${ev.isClass ? 'Aparece no Horário' : 'Evento normal'}</span></div></div>
        ${ev.isClass ? `<div class="prop"><div class="prop-label">${icon('book')}Disciplina</div>
          <div class="prop-value"><select class="field ${ev.subject ? '' : 'empty-val'}" data-e="subject"><option value="">Automática (pelo nome)</option>${subjects().map(x => `<option value="${x.id}" ${ev.subject === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div></div>` : ''}
        <div class="prop"><div class="prop-label">${icon('pin')}${ev.isClass ? 'Sala' : 'Local'}</div>
          <div class="prop-value"><input class="field grow" data-e="location" value="${esc(ev.location || '')}" placeholder="${ev.isClass ? 'Ex.: B-204' : 'Opcional'}" maxlength="80"></div></div>
        <div class="prop"><div class="prop-label">${icon('calendar')}${r.freq !== 'none' ? 'Começa' : 'Data'}</div>
          <div class="prop-value"><input type="date" class="field" data-e="date" value="${ev.date}"></div></div>
        <div class="prop"><div class="prop-label">${icon('clock')}Hora</div>
          <div class="prop-value">${ev.time
            ? `<input type="time" class="field" data-e="time" value="${ev.time}"><span class="hint-text">até</span><input type="time" class="field" data-e="end" value="${ev.end || ''}"><button class="icon-btn sm" data-e-allday title="Dia todo">${icon('x')}</button>`
            : `<span class="hint-text">Dia todo</span><button class="btn ghost" data-e-settime style="height:28px;padding:0 10px">Definir hora</button>`}</div></div>
        <div class="prop"><div class="prop-label">${icon('repeat')}Repetir</div>
          <div class="prop-value"><select class="field" data-e="freq">${Object.entries(FREQS).map(([k, v]) => `<option value="${k}" ${r.freq === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div>
        ${r.freq === 'weekly' ? `<div class="prop"><div class="prop-label"></div><div class="prop-value">${dayPills(days, 'data-e-day')}</div></div>` : ''}
        ${r.freq !== 'none' ? `<div class="prop"><div class="prop-label">${icon('calendar')}Até</div>
          <div class="prop-value"><input type="date" class="field ${r.until ? '' : 'empty-val'}" data-e="until" value="${r.until || ''}">${r.until ? `<button class="icon-btn sm" data-e-nountil title="Sem data de fim">${icon('x')}</button>` : '<span class="hint-text">sem fim</span>'}</div></div>` : ''}
        <div class="prop"><div class="prop-label">${icon('tag')}Categoria</div>
          <div class="prop-value">${cats().map(k => `<button class="pill ${ev.cat === k.id ? 'on' : ''}" style="--c:${k.color}" data-e-cat="${k.id}"><span class="dot"></span>${esc(k.name)}</button>`).join('')}</div></div>
      </div>
    </div>
    <div class="detail-foot">
      <span>${r.freq !== 'none' ? 'Repete: ' + esc(repeatSummary(ev)) : 'Evento único'}</span>
      <button class="btn danger" data-e-delete>${icon('trash')}Eliminar</button>
    </div>`;

  const E = () => eventById(id);
  const save = (patch, re = false) => { const e = E(); if (!e) return; touch(e, patch); saveLocal(); render(); if (re) renderEventDetail(); };
  const setRepeat = p => save({ repeat: { ...(E().repeat || { freq: 'none' }), ...p } }, true);
  const title = el.querySelector('textarea.title');
  const grow = () => { title.style.height = 'auto'; title.style.height = title.scrollHeight + 'px'; };
  grow();
  title.addEventListener('input', () => { grow(); save({ title: title.value.trim() }); });
  title.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); title.blur(); } });
  el.querySelector('textarea.notes').addEventListener('input', e => save({ notes: e.target.value }));
  el.querySelector('[data-e="location"]').addEventListener('input', e => save({ location: e.target.value.trim() }));
  el.querySelectorAll('[data-e]').forEach(f => f.addEventListener('change', () => {
    const k = f.dataset.e, v = f.value;
    if (k === 'freq') {
      const p = { freq: v };
      if (v === 'weekly' && !((E().repeat || {}).days || []).length) p.days = [parseISO(E().date).getDay()];
      return setRepeat(p);
    }
    if (k === 'until') return setRepeat({ until: v || null });
    if (k === 'date' && v) return save({ date: v }, true);
    if (k === 'subject') return save({ subject: v || null }, true);
    if (k === 'time' || k === 'end') {
      const e = E();
      if (!v) return;
      let time = k === 'time' ? v : e.time, end = k === 'end' ? v : e.end;
      if (k === 'time' && e.time && e.end && toMin(e.end) > toMin(e.time)) end = fromMin(Math.min(toMin(time) + toMin(e.end) - toMin(e.time), 1439));
      if (!end || toMin(end) <= toMin(time)) end = fromMin(Math.min(toMin(time) + 60, 1439));
      return save({ time, end }, true);
    }
  }));
  el.querySelectorAll('[data-e-day]').forEach(b => b.addEventListener('click', () => {
    const d = +b.dataset.eDay;
    const cur = (E().repeat || {}).days && E().repeat.days.length ? E().repeat.days : [parseISO(E().date).getDay()];
    const nd = cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d];
    if (nd.length) setRepeat({ days: nd });
  }));
  const q = s2 => el.querySelector(s2);
  q('[data-e-nountil]') && q('[data-e-nountil]').addEventListener('click', () => setRepeat({ until: null }));
  q('[data-e-allday]') && q('[data-e-allday]').addEventListener('click', () => save({ time: null, end: null }, true));
  q('[data-e-settime]') && q('[data-e-settime]').addEventListener('click', () => save({ time: '09:00', end: '10:00' }, true));
  q('[data-e-class]').addEventListener('click', () => save({ isClass: !E().isClass }, true));
  el.querySelectorAll('[data-e-cat]').forEach(b => b.addEventListener('click', () => save({ cat: E().cat === b.dataset.eCat ? null : b.dataset.eCat }, true)));
  q('[data-e-delete]').addEventListener('click', e => {
    const ev2 = E();
    if ((ev2.repeat || {}).freq !== 'none' && occ) {
      openMenu(e.currentTarget, [
        { label: `Só ${fmtDay(occ).toLowerCase()}`, icon: 'calendar', onClick: () => deleteEvent(id, occ, 'one') },
        { label: ev2.isClass ? 'Toda a aula (todas as semanas)' : 'Todas as repetições', icon: 'trash', danger: true, onClick: () => deleteEvent(id, null, 'all') },
      ]);
    } else deleteEvent(id, null, 'all');
  });
  q('[data-close-detail]').addEventListener('click', closeDetail);
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
  if (ui.openTask || ui.openEvent) closeDetail();
  ui.view = view;
  ui.listId = view === 'list' ? listId : null;
  if (view === 'subject') ui.subjectId = listId;
  if (view === 'project') { if (ui.projectId !== listId) ui.projWho = null; ui.projectId = listId; }
  if (view === 'calendar') ui.calMonth = ui.calSel.slice(0, 7);
  saveUi();
  closeMenu();
  resetDraft();
  render();
  window.scrollTo(0, 0);
  for (const sel of ['#top', '#content']) {
    const el = $(sel);
    el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter');
    setTimeout(() => el.classList.remove('enter'), 350);
  }
  if (view === 'search') setTimeout(() => { const i = $('#searchInput'); if (i) { i.focus(); i.select(); } }, 30);
}

const themePref = () => localStorage.getItem('organizador.theme') || 'auto';
function applyTheme() {
  const p = themePref();
  const t = p === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : p;
  document.documentElement.dataset.theme = t;
  const m = $('meta[name=theme-color]');
  if (m) m.content = t === 'dark' ? '#111113' : '#fafaf9';
}
function setTheme(p) { localStorage.setItem('organizador.theme', p); applyTheme(); render(); }
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (themePref() === 'auto') { applyTheme(); render(); } });
function setDensity(on) {
  if (on) localStorage.setItem('organizador.density', 'compact'); else localStorage.removeItem('organizador.density');
  document.documentElement.classList.toggle('compact', !!on);
  render();
}
function appearanceMenu(anchor) {
  const p = themePref(), compact = !!localStorage.getItem('organizador.density');
  openMenu(anchor, [
    { label: 'Tema claro', icon: 'sun', checked: p === 'light', onClick: () => setTheme('light') },
    { label: 'Tema escuro', icon: 'moon', checked: p === 'dark', onClick: () => setTheme('dark') },
    { label: 'Automático (segue o sistema)', icon: 'sliders', checked: p === 'auto', onClick: () => setTheme('auto') },
    { sep: true },
    { label: 'Cor de destaque…', icon: 'palette', onClick: () => accentMenu(anchor) },
    { label: 'Vista compacta', icon: 'list', checked: compact, onClick: () => setDensity(!compact) },
  ]);
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
      setTimeout(() => toggleTask(id), 420);
    } else toggleTask(id);
    if (ui.openTask === id) setTimeout(renderDetail, 440);
    return;
  }
  if (q('[data-grip]')) return;
  if (q('[data-kadd]')) return;
  if ((el = q('[data-event]'))) return openEvent(el.dataset.event, el.dataset.occ || null);
  if ((el = q('[data-task]'))) return openTask(el.dataset.task);
  if ((el = q('[data-slot-day]'))) {
    const r = el.getBoundingClientRect();
    const min = Math.min(23 * 60 + 30, Math.max(0, Math.floor((e.clientY - r.top) / HOUR_PX * 2) * 30 + Number(el.dataset.h0 || 0) * 60));
    if (el.closest('.timetable')) return newClass(el.dataset.slotDay, fromMin(min));
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
    ui.tgScrollX = undefined;
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
    ui.tgScrollX = undefined;
    if (ui.calMode === 'month') {
      const [y, m] = ui.calMonth.split('-').map(Number);
      ui.calMonth = iso(new Date(y, m - 1 + n, 1)).slice(0, 7);
    } else {
      ui.calSel = addDays(ui.calSel, n * (ui.calMode === 'day' ? 1 : 7));
      ui.calMonth = ui.calSel.slice(0, 7);
      resetDraft();
    }
    return render();
  }
  if (q('[data-cal-today]')) { ui.tgScrollX = undefined; ui.calSel = today(); ui.calMonth = ui.calSel.slice(0, 7); resetDraft(); return render(); }
  if ((el = q('[data-done-toggle]'))) { const k = el.dataset.doneToggle; ui.showDone[k] = !ui.showDone[k]; saveUi(); return render(); }
  if (q('[data-add-list]')) return newList().then(id => id && setView('list', id));
  if (q('[data-add-cat]')) return newCategory();
  if (q('[data-add-class]')) return newClass(ui.calSel);
  if ((el = q('[data-add-class-subject]'))) { const nc = nextClass(el.dataset.addClassSubject); return newClass(nc ? nc.date : today(), null, el.dataset.addClassSubject); }
  if (q('[data-add-subject]')) return editSubject(null);
  if ((el = q('[data-subject-edit]'))) return editSubject(el.dataset.subjectEdit);
  if ((el = q('[data-add-grade]'))) return editGrade(el.dataset.addGrade, null);
  if ((el = q('[data-grade]'))) return editGrade(el.dataset.gradeSubject, el.dataset.grade);
  if (q('[data-add-project]')) return editProject(null);
  if ((el = q('[data-project-more]'))) return projectMenu(el, el.dataset.projectMore);
  if (q('[data-proj-members]')) return editProject(ui.projectId);
  if ((el = q('[data-proj-who]'))) { const k = el.dataset.projWho; ui.projWho = k === '__all' ? null : k; return render(); }
  if (q('[data-move-overdue]')) return moveOverdue();
  if ((el = q('[data-accent]'))) return accentMenu(el);
  if ((el = q('[data-pomo]'))) return pomoAction(el.dataset.pomo);
  if ((el = q('[data-pomo-phase]'))) return pomoSetPhase(el.dataset.pomoPhase);
  if (q('[data-install]')) return installApp();
  if (q('[data-export]')) return exportData();
  if (q('[data-import]')) return importData();
  if ((el = q('[data-data-menu]'))) return dataMenu(el);
  if ((el = q('[data-theme-toggle]'))) return appearanceMenu(el);
  if ((el = q('[data-pick]'))) {
    const k = el.dataset.pick;
    const dropParsed = f => { if (draft.parsed) delete draft.parsed[f]; };
    if (k === 'date') dateMenu(el, effDraft().date, v => { draft.date = v; dropParsed('date'); updateComposer(); });
    if (k === 'time') timeMenu(el, effDraft().time, v => { draft.time = v; dropParsed('time'); updateComposer(); });
    if (k === 'cat') catMenu(el, effDraft().cat, v => { draft.cat = v; dropParsed('cat'); updateComposer(); });
    if (k === 'subject') subjectMenu(el, effDraft().subject, v => {
      draft.subject = v; dropParsed('subject');
      const ed = effDraft();
      if (v && (!ed.date || ed.date === today())) {
        const nc = nextClass(v);
        if (nc) { draft.date = nc.date; dropParsed('date'); toast(`Data: próxima aula (${fmtDay(nc.date).toLowerCase()})`); }
      }
      updateComposer();
    });
    if (k === 'list') listMenu(el, draft.list, v => { draft.list = v; updateComposer(); });
    if (k === 'important') { draft.important = !effDraft().important; dropParsed('important'); updateComposer(); }
    if (k === 'exam') { draft.exam = !effDraft().exam; dropParsed('exam'); updateComposer(); }
    if (k === 'event') { draft.event = !draft.event; updateComposer(); }
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
  if (e.target.matches && e.target.matches('[data-kadd]') && e.key === 'Enter') { e.preventDefault(); const v = e.target.value; e.target.value = ''; addTopic(v); return; }
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
    db = merge(db, Object.fromEntries(COLLS.map(k => [k, d[k] || []])));
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
    { sep: true },
    { label: 'Cor de destaque…', icon: 'palette', onClick: () => accentMenu(anchor) },
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
      db = Object.fromEntries(COLLS.map(k => [k, d[k] || []]));
      if (!db.categories.length) db.categories = blank().categories;
    } catch (e) { /* ficheiro estragado: começa vazio */ }
  }
  migrateClasses();
  saveLocal();
  if (ui.view === 'list' && !listById(ui.listId)) ui.view = 'today';
  resetDraft();
  render();
  checkReminders();
  if (tasks().length || events().length) localStorage.setItem('organizador.onboarded', '1');
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
  systemNotify(t.title, body, t.id);
}

function systemNotify(title, body, tag) {
  if (native) { native.notify(title, body); return; }
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const opts = { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: tag || 'organizador' };
  const fallback = () => { try { new Notification(title, opts); } catch (e) { /* sem suporte */ } };
  if (navigator.serviceWorker) {
    navigator.serviceWorker.getRegistration()
      .then(reg => (reg ? reg.showNotification(title, opts) : fallback()))
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
  const h0 = Number(col.dataset.h0 || 0);
  let min = Math.round((e.clientY - drag.offY - cr.top) / HOUR_PX * 4) * 15 + h0 * 60;
  min = Math.max(0, Math.min(1440 - 15, min));
  if (col !== drag.el.parentElement) col.appendChild(drag.el);
  Object.assign(drag.el.style, { top: `${(min - h0 * 60) * HOUR_PX / 60}px`, left: '2px', width: 'calc(100% - 4px)' });
  drag.el.querySelector('.ev-time').textContent = `${fromMin(min)} – ${fromMin(Math.min(min + drag.dur, 1439))}`;
  drag.target = { date: col.dataset.slotDay, time: fromMin(min) };
  const sc = $('#tgScroll');
  if (sc) {
    const sr = sc.getBoundingClientRect();
    if (e.clientY < sr.top + 30) sc.scrollTop -= 10;
    else if (e.clientY > sr.bottom - 30) sc.scrollTop += 10;
  }
});
document.addEventListener('touchmove', e => { if ((drag && drag.active) || (kdrag && kdrag.active)) e.preventDefault(); }, { passive: false });
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

/* ------------------------------------------------------------------ foco (Pomodoro) */
const POMO_KEY = 'organizador.pomodoro';
const PHASE = { focus: 'Foco', short: 'Pausa', long: 'Pausa longa' };
const POMO_C = 2 * Math.PI * 100;
const pomo = Object.assign({ phase: 'focus', running: false, endsAt: 0, remaining: null, taskId: null, count: 0, len: { focus: 25, short: 5, long: 15 } },
  JSON.parse(localStorage.getItem(POMO_KEY) || '{}'));
const savePomo = () => localStorage.setItem(POMO_KEY, JSON.stringify(pomo));
const phaseLen = ph => pomo.len[ph] * 60000;
const pomoLeft = () => (pomo.running ? Math.max(0, pomo.endsAt - Date.now()) : (pomo.remaining ?? phaseLen(pomo.phase)));
const fmtClock = ms => { const sec = Math.ceil(ms / 1000); return `${z(Math.floor(sec / 60))}:${z(sec % 60)}`; };
const fmtMin = m => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ' ' + (m % 60) + ' min' : ''}`);
const focusOn = d => live(db.focus || []).filter(f => f.date === d).reduce((a, f) => a + (f.minutes || 0), 0);

function pomoAction(a) {
  if (a === 'toggle') {
    if (pomo.running) { pomo.remaining = pomoLeft(); pomo.running = false; }
    else { pomo.endsAt = Date.now() + pomoLeft(); pomo.running = true; pomo.remaining = null; askNotifyPermission(); }
  }
  if (a === 'reset') { pomo.running = false; pomo.remaining = null; }
  if (a === 'skip') return pomoFinish(true);
  savePomo();
  render();
}
function pomoSetPhase(ph) {
  if (pomo.running) return toast('Pausa o temporizador antes de mudar de modo');
  pomo.phase = ph; pomo.remaining = null; savePomo(); render();
}
function pomoFinish(skipped) {
  const was = pomo.phase;
  if (was === 'focus' && !skipped) {
    db.focus.push({ id: uid(), date: today(), minutes: pomo.len.focus, taskId: pomo.taskId, at: now(), updatedAt: now() });
    saveLocal();
    pomo.count++;
  }
  pomo.phase = was === 'focus' ? (!skipped && pomo.count % 4 === 0 ? 'long' : 'short') : 'focus';
  pomo.running = false; pomo.remaining = null;
  savePomo();
  if (!skipped) {
    beep();
    const msg = was === 'focus' ? `Sessão de foco concluída. ${PHASE[pomo.phase]} de ${pomo.len[pomo.phase]} min?` : 'Pausa terminada. Vamos voltar ao foco?';
    toast(msg);
    systemNotify('Organizador · Foco', msg, 'pomodoro');
  }
  render();
}
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.2, 0.4].forEach((t, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = [784, 988, 1175][i];
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.27);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch (e) { /* sem áudio */ }
}

function viewFocus() {
  const left = pomoLeft(), total = phaseLen(pomo.phase);
  const T = today();
  const pending = tasks().filter(t => !t.done).sort((a, b) => ((a.date === T ? 0 : 1) - (b.date === T ? 0 : 1)) || cmpTask(a, b)).slice(0, 60);
  const sessions = live(db.focus || []).filter(f => f.date === T).length;
  const sel = (k, opts) => `<select class="field" data-pomo-len="${k}">${opts.map(m => `<option value="${m}" ${pomo.len[k] === m ? 'selected' : ''}>${m} min</option>`).join('')}</select>`;
  const content = `<div class="pomo ${pomo.phase !== 'focus' ? 'brk' : ''}">
    <div class="seg pomo-seg">${Object.entries(PHASE).map(([k, l]) => `<button class="${pomo.phase === k ? 'on' : ''}" data-pomo-phase="${k}">${l}</button>`).join('')}</div>
    <div class="pomo-ring">
      <svg viewBox="0 0 220 220"><circle class="track" cx="110" cy="110" r="100"/><circle class="bar" id="pomoBar" cx="110" cy="110" r="100"
        style="stroke-dasharray:${POMO_C};stroke-dashoffset:${POMO_C * (1 - left / total)}"/></svg>
      <div class="pomo-center"><div class="pomo-time" id="pomoTime">${fmtClock(left)}</div><div class="pomo-label">${PHASE[pomo.phase]}</div></div>
    </div>
    <div class="pomo-controls">
      <button class="icon-btn lg" data-pomo="reset" title="Recomeçar" aria-label="Recomeçar">${icon('reset')}</button>
      <button class="pomo-main" data-pomo="toggle" id="pomoMain" aria-label="${pomo.running ? 'Pausar' : 'Iniciar'}">${icon(pomo.running ? 'pause' : 'play')}</button>
      <button class="icon-btn lg" data-pomo="skip" title="Saltar" aria-label="Saltar">${icon('skip')}</button>
    </div>
    <div class="pomo-dots" title="Sessões até à pausa longa">${[0, 1, 2, 3].map(i => `<i class="${i < pomo.count % 4 ? 'on' : ''}"></i>`).join('')}</div>
    <div class="pomo-form">
      <label>Tarefa<select class="field" data-pomo-task><option value="">Sem tarefa</option>${pending.map(t => `<option value="${t.id}" ${pomo.taskId === t.id ? 'selected' : ''}>${esc(t.title)}</option>`).join('')}</select></label>
      <div class="pomo-lens"><label>Foco${sel('focus', [15, 20, 25, 30, 45, 50, 60])}</label><label>Pausa${sel('short', [3, 5, 10])}</label><label>Pausa longa${sel('long', [10, 15, 20, 30])}</label></div>
    </div>
    <div class="pomo-today">Hoje: <b>${fmtMin(focusOn(T))}</b> de foco · ${sessions} sess${sessions === 1 ? 'ão' : 'ões'}</div>
  </div>`;
  return { top: head('Foco', 'Trabalha em blocos com pausas'), content };
}

function updatePomoUi() {
  const left = pomoLeft();
  const txt = fmtClock(left);
  const t = $('#pomoTime'); if (t) t.textContent = txt;
  const bar = $('#pomoBar'); if (bar) bar.style.strokeDashoffset = String(POMO_C * (1 - left / phaseLen(pomo.phase)));
  const mb = $('#pomoMain');
  if (mb && mb.dataset.state !== String(pomo.running)) { mb.dataset.state = String(pomo.running); mb.innerHTML = icon(pomo.running ? 'pause' : 'play'); }
  const pill = $('#focusPill');
  if (pill) {
    const active = pomo.running || pomo.remaining != null;
    pill.hidden = !active || ui.view === 'focus';
    pill.innerHTML = `${icon(pomo.running ? 'timer' : 'pause')}<span>${PHASE[pomo.phase]} · ${txt}</span>`;
    pill.classList.toggle('brk', pomo.phase !== 'focus');
  }
  document.title = pomo.running ? `${txt} · Organizador` : 'Organizador';
}
setInterval(() => { if (pomo.running && pomoLeft() <= 0) pomoFinish(false); else updatePomoUi(); }, 500);
document.addEventListener('change', e => {
  if (e.target.matches('[data-pomo-task]')) { pomo.taskId = e.target.value || null; savePomo(); }
  if (e.target.matches('[data-pomo-len]')) {
    pomo.len[e.target.dataset.pomoLen] = Number(e.target.value);
    if (!pomo.running) pomo.remaining = null;
    savePomo(); render();
  }
});

/* ------------------------------------------------------------------ estatísticas */
function barChart(rows, o) {
  const max = Math.max(1, ...rows.map(r => r.v));
  return `<div class="bars" role="img" aria-label="${esc(o.aria)}">
    <div class="bars-max">${o.fmt ? o.fmt(max) : max}</div>
    <div class="bars-plot">${rows.map(r => `<div class="bar-col ${r.d === today() ? 'today' : ''}" data-tip="${esc(o.tip(r))}">
      <div class="bar" style="height:${r.v ? Math.max(3, r.v / max * 100) : 0}%"></div></div>`).join('')}</div>
    <div class="bars-x">${rows.map(r => `<span class="${r.d === today() ? 'today' : ''}">${o.label(r)}</span>`).join('')}</div>
  </div>`;
}

function viewStats() {
  const T = today();
  const all = tasks();
  const doneOn = d => all.filter(t => t.done && dayOf(t.doneAt) === d).length;
  const days = n => [...Array(n)].map((_, i) => addDays(T, i - n + 1));
  const week = days(7), prev = week.map(d => addDays(d, -7));
  const doneW = week.reduce((a, d) => a + doneOn(d), 0), doneP = prev.reduce((a, d) => a + doneOn(d), 0);
  const due = all.filter(t => t.date && t.date >= week[0] && t.date <= T);
  const rate = due.length ? Math.round(100 * due.filter(t => t.done).length / due.length) : null;
  let streak = 0, d = T;
  if (!doneOn(d)) d = addDays(d, -1);
  while (doneOn(d) && streak < 999) { streak++; d = addDays(d, -1); }
  const focusW = week.reduce((a, x) => a + focusOn(x), 0);
  const delta = doneW - doneP;
  const tile = (label, value, sub) => `<div class="tile"><div class="tile-label">${label}</div><div class="tile-value">${value}</div><div class="tile-sub">${sub}</div></div>`;
  const tiles = `<div class="tiles">
    ${tile('Concluídas (7 dias)', doneW, delta === 0 ? 'igual à semana anterior' : `${delta > 0 ? '+' : '−'}${Math.abs(delta)} vs. semana anterior`)}
    ${tile('Taxa de conclusão', rate == null ? '—' : rate + '%', rate == null ? 'sem tarefas com data' : `${due.filter(t => t.done).length} de ${due.length} com data`)}
    ${tile('Sequência', `${streak} dia${streak === 1 ? '' : 's'}`, streak ? 'seguidos a concluir tarefas' : 'conclui uma tarefa hoje')}
    ${tile('Foco (7 dias)', fmtMin(focusW), `${live(db.focus || []).filter(f => week.includes(f.date)).length} sessões Pomodoro`)}
  </div>`;
  const d14 = days(14).map(x => ({ d: x, v: doneOn(x) }));
  const chart1 = barChart(d14, {
    aria: 'Tarefas concluídas por dia nos últimos 14 dias',
    label: r => parseISO(r.d).getDate(),
    tip: r => `${fmtDay(r.d)}: ${r.v} concluída${r.v === 1 ? '' : 's'}`,
  });
  const table = `<details class="data-table"><summary>Ver em tabela</summary><table><thead><tr><th>Dia</th><th>Concluídas</th><th>Foco</th></tr></thead><tbody>
    ${d14.slice().reverse().map(r => `<tr><td>${fmtLong(r.d)}</td><td>${r.v}</td><td>${fmtMin(focusOn(r.d))}</td></tr>`).join('')}</tbody></table></details>`;
  const f7 = week.map(x => ({ d: x, v: focusOn(x) }));
  const chart2 = barChart(f7, {
    aria: 'Minutos de foco por dia nos últimos 7 dias',
    label: r => DIAS_C[(parseISO(r.d).getDay() + 6) % 7],
    tip: r => `${fmtDay(r.d)}: ${fmtMin(r.v)} de foco`,
    fmt: m => fmtMin(m),
  });
  const since = addDays(T, -29);
  const byCat = cats().map(c => ({ c, v: all.filter(t => t.done && t.cat === c.id && dayOf(t.doneAt) >= since).length }))
    .concat([{ c: { name: 'Sem categoria', color: 'var(--text-3)' }, v: all.filter(t => t.done && !catById(t.cat) && dayOf(t.doneAt) >= since).length }])
    .filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  const maxC = Math.max(1, ...byCat.map(x => x.v));
  const cat = byCat.length ? byCat.map(x => `<div class="hbar" title="${esc(x.c.name)}: ${x.v}">
      <span class="hbar-name"><span class="dot" style="--c:${x.c.color}"></span>${esc(x.c.name)}</span>
      <span class="hbar-track"><i style="width:${x.v / maxC * 100}%;background:${x.c.color}"></i></span>
      <span class="hbar-v">${x.v}</span></div>`).join('')
    : '<div class="empty" style="padding:8px 0">Ainda sem tarefas concluídas nos últimos 30 dias.</div>';
  const content = `${tiles}
    <div class="card"><div class="card-title">Tarefas concluídas por dia<span>últimos 14 dias</span></div>${chart1}${table}</div>
    <div class="grid2">
      <div class="card"><div class="card-title">Tempo de foco<span>últimos 7 dias</span></div>${chart2}</div>
      <div class="card"><div class="card-title">Por categoria<span>concluídas, 30 dias</span></div>${cat}</div>
    </div>`;
  return { top: head('Estatísticas', 'O teu progresso'), content };
}

/* ------------------------------------------------------------------ mover atrasadas, cor de destaque */
function moveOverdue() {
  const T = today();
  const ov = tasks().filter(t => !t.done && t.date && t.date < T && visible(t));
  if (!ov.length) return;
  const prev = ov.map(t => [t, t.date]);
  ov.forEach(t => touch(t, { date: T }));
  commit();
  toast(`${ov.length} tarefa${ov.length === 1 ? '' : 's'} movida${ov.length === 1 ? '' : 's'} para hoje`, 'Desfazer', () => { prev.forEach(([t, d]) => touch(t, { date: d })); commit(); });
}

const ACCENTS = [['Índigo', null], ['Azul', '#3f7fd4'], ['Verde', '#3b9a6c'], ['Laranja', '#d07a2c'], ['Rosa', '#cf5b86'], ['Violeta', '#8b5cd6'], ['Grafite', '#7b808b']];
function applyAccent() {
  const a = localStorage.getItem('organizador.accent');
  if (a) document.documentElement.style.setProperty('--accent', a);
  else document.documentElement.style.removeProperty('--accent');
}
function accentMenu(anchor) {
  const cur = localStorage.getItem('organizador.accent') || null;
  openMenu(anchor, ACCENTS.map(([n, c]) => ({
    label: n, dot: c || (document.documentElement.dataset.theme === 'dark' ? '#7b84e6' : '#5561d6'), checked: cur === c,
    onClick: () => { if (c) localStorage.setItem('organizador.accent', c); else localStorage.removeItem('organizador.accent'); applyAccent(); render(); },
  })));
}

/* ------------------------------------------------------------------ deslizar no telemóvel */
let swipe = null;
document.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse') return;
  const row = e.target.closest('#content .task');
  if (!row || e.target.closest('.check, .grip') || row.classList.contains('done')) return;
  swipe = { row, id: row.dataset.task, pid: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, active: false };
});
document.addEventListener('pointermove', e => {
  if (!swipe || e.pointerId !== swipe.pid) return;
  const dx = e.clientX - swipe.x0, dy = e.clientY - swipe.y0;
  if (!swipe.active) {
    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { swipe = null; return; }
    if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
    swipe.active = true;
    swipe.row.classList.add('swiping');
  }
  swipe.dx = Math.max(-150, Math.min(150, dx));
  const r = swipe.row;
  r.style.setProperty('--dx', swipe.dx + 'px');
  r.classList.toggle('sw-right', swipe.dx > 0);
  r.classList.toggle('sw-left', swipe.dx < 0);
  r.classList.toggle('sw-armed', Math.abs(swipe.dx) > 90);
});
function endSwipe(cancel) {
  if (!swipe) return;
  const sw = swipe; swipe = null;
  if (!sw.active) return;
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 400);
  const r = sw.row;
  r.classList.remove('swiping', 'sw-right', 'sw-left', 'sw-armed');
  r.style.removeProperty('--dx');
  if (cancel || Math.abs(sw.dx) <= 90) return;
  const t = taskById(sw.id);
  if (!t) return;
  if (sw.dx > 0) {
    r.classList.add('completing');
    setTimeout(() => toggleTask(sw.id), 380);
  } else {
    const prevDate = t.date;
    const tm = addDays(today(), 1);
    touch(t, { date: tm });
    commit();
    toast('Adiada para amanhã', 'Desfazer', () => { touch(t, { date: prevDate }); commit(); });
  }
}
document.addEventListener('pointerup', () => endSwipe(false));
document.addEventListener('pointercancel', () => endSwipe(true));

/* ------------------------------------------------------------------ ordenar à mão (listas) */
let reorder = null;
document.addEventListener('pointerdown', e => {
  const grip = e.target.closest('[data-grip]');
  if (!grip) return;
  e.preventDefault();
  const row = grip.closest('.task');
  const rows = [...row.parentElement.querySelectorAll(':scope > .task:not(.done)')];
  reorder = { row, rows, idx: rows.indexOf(row), target: rows.indexOf(row), y0: e.clientY, pid: e.pointerId,
    rects: rows.map(r => r.getBoundingClientRect()), moved: false };
  row.classList.add('reordering');
  try { grip.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
});
document.addEventListener('pointermove', e => {
  if (!reorder || e.pointerId !== reorder.pid) return;
  e.preventDefault();
  const R = reorder, dy = e.clientY - R.y0;
  if (Math.abs(dy) > 3) R.moved = true;
  R.row.style.transform = `translateY(${dy}px)`;
  const self = R.rects[R.idx], center = self.top + self.height / 2 + dy;
  let target = 0;
  R.rects.forEach((rc, i) => { if (i !== R.idx && rc.top + rc.height / 2 < center) target++; });
  R.target = target;
  const h = self.height + 2;
  R.rows.forEach((r, i) => {
    if (i === R.idx) return;
    const shift = (i > R.idx && i <= target) ? -h : (i < R.idx && i >= target) ? h : 0;
    r.style.transform = shift ? `translateY(${shift}px)` : '';
  });
}, { passive: false });
function endReorder() {
  if (!reorder) return;
  const R = reorder; reorder = null;
  R.rows.forEach(r => { r.style.transform = ''; r.classList.remove('reordering'); });
  if (!R.moved) return;
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 300);
  if (R.target === R.idx) return;
  const ids = R.rows.map(r => r.dataset.task);
  const [m] = ids.splice(R.idx, 1);
  ids.splice(R.target, 0, m);
  ids.forEach((id, i) => { const t = taskById(id); if (t && t.order !== i) touch(t, { order: i }); });
  commit();
}
document.addEventListener('pointerup', endReorder);
document.addEventListener('pointercancel', endReorder);

/* ------------------------------------------------------------------ quadro (arrastar tópicos) */
let kdrag = null;
document.addEventListener('pointerdown', e => {
  const card = e.target.closest('[data-kcard]');
  if (!card || e.button > 0) return;
  kdrag = { card, id: card.dataset.kcard, pid: e.pointerId, x0: e.clientX, y0: e.clientY, touch: e.pointerType !== 'mouse', active: false };
  if (kdrag.touch) { const x = e.clientX, y = e.clientY; kdrag.timer = setTimeout(() => { if (kdrag && !kdrag.active) startK(x, y); }, 320); }
});
function startK(x, y) {
  const r = kdrag.card.getBoundingClientRect();
  const ghost = kdrag.card.cloneNode(true);
  ghost.classList.add('kghost');
  ghost.style.width = r.width + 'px';
  document.body.appendChild(ghost);
  Object.assign(kdrag, { ghost, offX: x - r.left, offY: y - r.top, active: true });
  kdrag.card.classList.add('kplaceholder');
  if (navigator.vibrate) navigator.vibrate(12);
  moveK(x, y);
}
function moveK(x, y) {
  kdrag.ghost.style.transform = `translate(${x - kdrag.offX}px, ${y - kdrag.offY}px) rotate(1.5deg)`;
  const col = [...document.querySelectorAll('.kcol')].find(c => { const r = c.getBoundingClientRect(); return x >= r.left && x < r.right; });
  document.querySelectorAll('.kcol.over').forEach(c => { if (c !== col) c.classList.remove('over'); });
  if (col) col.classList.add('over');
  kdrag.col = col; kdrag.y = y;
  const b = $('.board');
  if (b) { const br = b.getBoundingClientRect(); if (x < br.left + 30) b.scrollLeft -= 14; else if (x > br.right - 30) b.scrollLeft += 14; }
}
document.addEventListener('pointermove', e => {
  if (!kdrag || e.pointerId !== kdrag.pid) return;
  const dist = Math.hypot(e.clientX - kdrag.x0, e.clientY - kdrag.y0);
  if (!kdrag.active) {
    if (kdrag.touch) { if (dist > 8) { clearTimeout(kdrag.timer); kdrag = null; } return; }
    if (dist < 6) return;
    startK(e.clientX, e.clientY);
  }
  e.preventDefault();
  moveK(e.clientX, e.clientY);
});
function endK(cancel) {
  if (!kdrag) return;
  clearTimeout(kdrag.timer);
  const k = kdrag; kdrag = null;
  if (!k.active) return;
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 400);
  k.ghost.remove();
  k.card.classList.remove('kplaceholder');
  document.querySelectorAll('.kcol.over').forEach(c => c.classList.remove('over'));
  if (cancel || !k.col) return render();
  const cards = [...k.col.querySelectorAll('[data-kcard]')].filter(c => c !== k.card);
  let idx = cards.length;
  for (let i = 0; i < cards.length; i++) { const r = cards[i].getBoundingClientRect(); if (k.y < r.top + r.height / 2) { idx = i; break; } }
  const ids = cards.map(c => c.dataset.kcard);
  ids.splice(idx, 0, k.id);
  ids.forEach((id, i) => { const t = taskById(id); if (t && t.order !== i) touch(t, { order: i }); });
  setTopicStatus(k.id, k.col.dataset.col);
}
document.addEventListener('pointerup', () => endK(false));
document.addEventListener('pointercancel', () => endK(true));

/* ------------------------------------------------------------------ boas-vindas */
function maybeOnboard() {
  if (localStorage.getItem('organizador.onboarded')) return;
  if (tasks().length || events().length || subjects().length) { localStorage.setItem('organizador.onboarded', '1'); return; }
  onboarding();
}
function onboarding() {
  let step = 0;
  const subs = [];
  const w = document.createElement('div');
  w.className = 'modal-wrap ob-wrap';
  document.body.appendChild(w);
  const finish = () => {
    subs.forEach(n => findOrCreateSubject(n));
    localStorage.setItem('organizador.onboarded', '1');
    w.remove();
    commit();
  };
  const chipsHtml = () => subs.map((n, i) => `<span class="chip set">${esc(n)}<button data-ob-rm="${i}" aria-label="Remover">${icon('x')}</button></span>`).join('');
  const draw = () => {
    const p = themePref(), compact = !!localStorage.getItem('organizador.density'), acc = localStorage.getItem('organizador.accent') || '';
    const steps = [
      `<div class="ob-hero"><svg viewBox="0 0 24 24"><rect width="24" height="24" rx="6.5" fill="var(--text)"/><path d="M7.2 12.4l3.1 3.1 6.5-6.8" stroke="var(--bg)" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
       <div class="modal-title">Bem-vindo ao Organizador</div>
       <div class="modal-text">Tarefas, calendário, horário das aulas e trabalhos de grupo — num só sítio.</div>
       <ul class="ob-list">
         <li>${icon('calendar')}<span><b>Escreve naturalmente:</b> "Estudar amanhã 14h #álgebra"</span></li>
         <li>${icon('book')}<span><b>Disciplinas</b> com horário, exames, notas e médias</span></li>
         <li>${icon('users')}<span><b>Trabalhos de grupo</b> divididos por tópicos e pessoas</span></li>
       </ul>`,
      `<div class="modal-title">Aparência</div>
       <div class="modal-text">Podes mudar tudo isto mais tarde.</div>
       <div class="ob-label">Tema</div>
       <div class="seg ob-seg">${[['light', 'Claro'], ['dark', 'Escuro'], ['auto', 'Automático']].map(([k, l]) => `<button class="${p === k ? 'on' : ''}" data-ob-theme="${k}">${l}</button>`).join('')}</div>
       <div class="ob-label">Cor de destaque</div>
       <div class="modal-colors">${ACCENTS.map(([n, c]) => `<button title="${n}" style="--c:${c || '#6b78e5'}" data-ob-accent="${c || ''}" class="${acc === (c || '') ? 'on' : ''}"></button>`).join('')}</div>
       <label class="ob-check"><input type="checkbox" data-ob-compact ${compact ? 'checked' : ''}>Vista compacta (mais tarefas no ecrã)</label>`,
      `<div class="modal-title">As tuas disciplinas</div>
       <div class="modal-text">Escreve o nome de cada cadeira e carrega Enter. É opcional — também as podes criar depois no Horário.</div>
       <input class="modal-input" id="obSub" placeholder="Ex.: Álgebra Linear" maxlength="60" enterkeyhint="done" autocomplete="off">
       <div class="ob-chips">${chipsHtml()}</div>`,
      `<div class="modal-title">Tudo pronto</div>
       <div class="modal-text">Três dicas para começar:</div>
       <ul class="ob-list">
         <li>${icon('plus')}<span>Adiciona tarefas em <b>Hoje</b>. Marca <b>Exame</b> para veres a contagem decrescente.</span></li>
         <li>${icon('calendar')}<span>Em <b>Calendário → Horário</b>, clica numa hora para pôr uma aula.</span></li>
         <li>${icon('timer')}<span>Usa o <b>Foco</b> para estudar em blocos de 25 minutos.</span></li>
       </ul>`,
    ];
    w.innerHTML = `<div class="modal ob">
      <div class="ob-steps">${steps.map((_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>
      ${steps[step]}
      <div class="modal-actions">
        ${step < 3 ? '<button class="btn ghost" data-ob="skip" style="margin-right:auto">Saltar</button>' : ''}
        ${step > 0 ? '<button class="btn ghost" data-ob="back">Voltar</button>' : ''}
        <button class="btn primary" data-ob="next">${step === 3 ? 'Começar' : 'Seguinte'}</button>
      </div></div>`;
    setTimeout(() => w.classList.add('drawn'), 300);
    const inp = w.querySelector('#obSub');
    if (inp) {
      setTimeout(() => inp.focus(), 30);
      inp.addEventListener('keydown', e => {
        if (e.key !== 'Enter' || !inp.value.trim()) return;
        e.preventDefault();
        subs.push(inp.value.trim());
        inp.value = '';
        w.querySelector('.ob-chips').innerHTML = chipsHtml();
      });
    }
  };
  w.addEventListener('click', e => {
    const b = e.target.closest('[data-ob], [data-ob-theme], [data-ob-accent], [data-ob-rm], [data-ob-compact]');
    if (!b) return;
    if (b.matches('[data-ob-compact]')) { setDensity(b.checked); return; }
    if (b.dataset.obTheme) { localStorage.setItem('organizador.theme', b.dataset.obTheme); applyTheme(); }
    else if ('obAccent' in b.dataset) { if (b.dataset.obAccent) localStorage.setItem('organizador.accent', b.dataset.obAccent); else localStorage.removeItem('organizador.accent'); applyAccent(); }
    else if ('obRm' in b.dataset) { subs.splice(+b.dataset.obRm, 1); w.querySelector('.ob-chips').innerHTML = chipsHtml(); return; }
    else if (b.dataset.ob === 'skip') return finish();
    else if (b.dataset.ob === 'back') step--;
    else if (b.dataset.ob === 'next') {
      const inp = w.querySelector('#obSub');
      if (inp && inp.value.trim()) subs.push(inp.value.trim());
      if (step === 3) return finish();
      step++;
    }
    draw();
  });
  draw();
}

/* ------------------------------------------------------------------ start */
if ((ui.view === 'list' && !listById(ui.listId)) || ui.view === 'search' || (ui.view === 'subject' && !subjectById(ui.subjectId)) || (ui.view === 'project' && !projectById(ui.projectId))) ui.view = 'today';
COLLS.forEach(k => { db[k] ||= []; });
migrateClasses();
applyTheme();
document.documentElement.classList.toggle('compact', !!localStorage.getItem('organizador.density'));
applyAccent();
(() => { const pill = document.createElement('button'); pill.id = 'focusPill'; pill.className = 'focus-pill'; pill.dataset.nav = 'focus'; pill.hidden = true; document.body.appendChild(pill); })();
buildComposer();
resetDraft();
render();
startNative().then(maybeOnboard);
setTimeout(checkReminders, 1500);
