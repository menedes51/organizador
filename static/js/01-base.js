/* Organizador · 01-base.js — Dados, validação, disciplinas/trabalhos/notas, tarefas e eventos
   (os ficheiros js/01…07 são carregados por esta ordem; partilham as mesmas variáveis globais) */
'use strict';

/* ==========================================================================
   Organizador — app (PC + telemóvel)
   Sem servidor: cada dispositivo guarda as suas tarefas.
   • Telemóvel / browser: no armazenamento do próprio browser.
   • App de PC (organizador.py): num ficheiro dados.json.
   Para passar tarefas entre dispositivos: Exportar / Importar cópia.
   ========================================================================== */

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
  shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
  share: '<path d="M12 15V3M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  pencil: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
};
const icon = (name, cls = '') =>
  `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

/* ------------------------------------------------------------------ data */
const APP_VERSION = '4.3';
const KEY_PREFIX = window.ORG_TEST ? 'teste.' : '';
const KEY = KEY_PREFIX + 'organizador.v2';
const UI_KEY = KEY_PREFIX + 'organizador.ui';
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

/* ------------------------------------------------------------------ validação dos dados
   Tudo o que entra na app (armazenamento, ficheiro importado, cópia de segurança)
   passa por aqui: só ficam campos conhecidos, com o tipo e o formato certos. */
const RE_ID = /^[\w.-]{1,64}$/, RE_DATE = /^\d{4}-\d{2}-\d{2}$/, RE_TIME = /^([01]\d|2[0-3]):[0-5]\d$/, RE_COLOR = /^#[0-9a-fA-F]{6}$/;
const sStr = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const sId = v => (typeof v === 'string' && RE_ID.test(v) ? v : null);
const sDate = v => (typeof v === 'string' && RE_DATE.test(v) && iso(parseISO(v)) === v ? v : null); // rejeita 31/02, mês 13…
const sTime = v => (typeof v === 'string' && RE_TIME.test(v) ? v : null);
const sColor = (v, def) => (typeof v === 'string' && RE_COLOR.test(v) ? v : def);
const sNum = (v, lo, hi, def = null) => {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return def;
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def;
};
const sDays = v => (Array.isArray(v) ? [...new Set(v.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6))] : []);
const sBase = (x, max = 9e15) => ({ updatedAt: sNum(x.updatedAt, 0, max, 0), ...(x.deleted === true ? { deleted: true } : {}) });
const CLEANERS = {
  tasks: x => {
    const t = {
      id: x.id, title: sStr(x.title, 300), notes: sStr(x.notes, 5000),
      cat: sId(x.cat), list: sId(x.list), subject: sId(x.subject), project: sId(x.project),
      date: sDate(x.date), time: sTime(x.time),
      repeat: ['daily', 'weekdays', 'weekly', 'custom', 'monthly'].includes(x.repeat) ? x.repeat : 'none',
      important: x.important === true, exam: x.exam === true, done: x.done === true,
      doneAt: sNum(x.doneAt, 0, 9e15), created: sNum(x.created, 0, 9e15, 0), ...sBase(x),
    };
    if (x.assignee) t.assignee = sStr(x.assignee, 40) || null;
    if (['todo', 'doing', 'done'].includes(x.status)) t.status = x.status;
    if (x.duration != null) t.duration = sNum(x.duration, 5, 1440, 60);
    if (x.remind != null && [0, 5, 15, 30, 60, 1440].includes(Number(x.remind))) t.remind = Number(x.remind);
    if (x.order != null) { const o = sNum(x.order, -1e9, 1e9); if (o != null) t.order = o; }
    if (x.repeatDays) t.repeatDays = sDays(x.repeatDays);
    if (x.spawned === true) t.spawned = true;
    if (sId(x.spawnedId)) t.spawnedId = x.spawnedId;
    if (Array.isArray(x.subtasks) && x.subtasks.length) {
      t.subtasks = x.subtasks.slice(0, 100).filter(k => k && sId(k.id)).map(k => ({ id: k.id, title: sStr(k.title, 200), done: k.done === true }));
    }
    return t;
  },
  lists: x => ({ id: x.id, name: sStr(x.name, 60) || 'Lista', order: sNum(x.order, 0, 9e15, 0), ...sBase(x) }),
  categories: x => ({ id: x.id, name: sStr(x.name, 60) || 'Categoria', color: sColor(x.color, '#8a8f98'), order: sNum(x.order, 0, 9e15, 0), ...sBase(x) }),
  events: x => {
    const date = sDate(x.date);
    if (!date) return null;
    const r = x.repeat && typeof x.repeat === 'object' ? x.repeat : {};
    return {
      id: x.id, title: sStr(x.title, 200), notes: sStr(x.notes, 5000), location: sStr(x.location, 80),
      cat: sId(x.cat), subject: sId(x.subject), date, time: sTime(x.time), end: sTime(x.end),
      repeat: { freq: ['daily', 'weekdays', 'weekly', 'monthly'].includes(r.freq) ? r.freq : 'none', days: sDays(r.days), until: sDate(r.until) },
      exceptions: Array.isArray(x.exceptions) ? x.exceptions.map(sDate).filter(Boolean).slice(0, 500) : [],
      isClass: x.isClass === true, created: sNum(x.created, 0, 9e15, 0), ...sBase(x),
    };
  },
  focus: x => {
    const date = sDate(x.date);
    return date ? { id: x.id, date, minutes: sNum(x.minutes, 1, 600, 25), taskId: sId(x.taskId), at: sNum(x.at, 0, 9e15, 0), ...sBase(x) } : null;
  },
  subjects: x => ({ id: x.id, name: sStr(x.name, 60) || 'Disciplina', color: sColor(x.color, '#6b78e5'), ects: sNum(x.ects, 0, 60), created: sNum(x.created, 0, 9e15, 0), ...sBase(x) }),
  projects: x => ({
    id: x.id, name: sStr(x.name, 80) || 'Trabalho', subject: sId(x.subject), due: sDate(x.due),
    members: Array.isArray(x.members) ? [...new Set(x.members.map(m => sStr(m, 40).trim()).filter(Boolean))].slice(0, 12) : [],
    archived: x.archived === true, created: sNum(x.created, 0, 9e15, 0), ...sBase(x),
  }),
  grades: x => ({
    id: x.id, taskId: sId(x.taskId), subject: sId(x.subject), name: sStr(x.name, 80),
    score: sNum(x.score, 0, 1000), max: sNum(x.max, 1, 1000, 20), weight: sNum(x.weight, 0, 100),
    date: sDate(x.date), created: sNum(x.created, 0, 9e15, 0), ...sBase(x),
  }),
};
function sanitizeDb(raw) {
  const out = {};
  let dropped = 0;
  for (const k of COLLS) {
    const arr = raw && Array.isArray(raw[k]) ? raw[k] : [];
    const seen = new Set();
    out[k] = [];
    for (const x of arr) {
      let clean = null;
      if (x && typeof x === 'object' && !Array.isArray(x) && sId(x.id) && !seen.has(x.id)) {
        try { clean = CLEANERS[k](x); } catch (e) { clean = null; }
      }
      if (clean) { seen.add(x.id); out[k].push(clean); } else dropped++;
    }
  }
  if (!out.categories.length) out.categories = blank().categories;
  return { db: out, dropped };
}

function loadLocal() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.tasks)) return sanitizeDb(d).db;
  } catch (e) { /* ignore */ }
  return blank();
}
let db = loadLocal();
let native = null; // API da app de PC (pywebview), quando corre como app de secretária
let loadFailed = false;
function saveLocal() {
  const text = JSON.stringify(db);
  try { localStorage.setItem(KEY, text); }
  catch (e) { if (!native) toast('Sem espaço para guardar. Exporta uma cópia e apaga tarefas antigas.'); }
  if (native && !loadFailed) native.save(text);
}

// Itens apagados há mais de 30 dias são removidos de vez (evita que os dados cresçam para sempre).
function purgeOld() {
  const limit = now() - 30 * 864e5;
  let n = 0;
  for (const k of COLLS) {
    const before = db[k].length;
    db[k] = db[k].filter(x => !(x.deleted && (x.updatedAt || 0) < limit));
    n += before - db[k].length;
  }
  try {
    const fired = JSON.parse(localStorage.getItem('organizador.reminded') || '{}');
    const ids = new Set(db.tasks.map(t => t.id));
    const kept = Object.fromEntries(Object.entries(fired).filter(([id]) => ids.has(id)));
    if (Object.keys(kept).length !== Object.keys(fired).length) localStorage.setItem('organizador.reminded', JSON.stringify(kept));
  } catch (e) { /* ignore */ }
  return n;
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
// Média de uma disciplina. Devolve { avg, warn }.
//  • Sem pesos: média simples.
//  • Todas com peso: média ponderada.
//  • Algumas sem peso: essas dividem entre si o que falta para 100%; se já não sobrar nada, não contam (e avisa).
function gradeCalc(gs) {
  gs = gs.filter(g => g.score != null && g.score !== '');
  if (!gs.length) return { avg: null, warn: null };
  const val = g => (Number(g.score) / (Number(g.max) || 20)) * 20;
  const w = g => Number(g.weight) || 0;
  const withW = gs.filter(g => w(g) > 0), noW = gs.filter(g => !(w(g) > 0));
  const sum = withW.reduce((a, g) => a + w(g), 0);
  const round = v => Math.round(v * 10) / 10;
  const plural = n => `${n} nota${n === 1 ? '' : 's'} sem peso`;
  if (!withW.length) return { avg: round(gs.reduce((a, g) => a + val(g), 0) / gs.length), warn: null };
  const weighted = withW.reduce((a, g) => a + val(g) * w(g), 0);
  if (!noW.length) return { avg: round(weighted / sum), warn: sum > 100 ? `Os pesos somam ${sum}% (mais de 100%). Confirma os pesos.` : null };
  const rem = 100 - sum;
  if (rem > 0) {
    const each = rem / noW.length;
    return { avg: round((weighted + noW.reduce((a, g) => a + val(g) * each, 0)) / 100),
      warn: `${plural(noW.length)}: ${noW.length === 1 ? 'fica com' : 'dividem'} os ${round(rem)}% que faltam. Define o peso para acertar a média.` };
  }
  return { avg: round(weighted / sum), warn: `${plural(noW.length)} não ${noW.length === 1 ? 'conta' : 'contam'} para a média (os pesos já somam ${sum}%).` };
}
const subjectGrades = sid => grades().filter(g => g.subject === sid);
function subjectAverage(sid) { return gradeCalc(subjectGrades(sid)).avg; }
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
    const nid = uid();
    t.spawned = true;
    t.spawnedId = nid;
    db.tasks.push({ ...t, id: nid, done: false, doneAt: null, spawned: false, spawnedId: null, date: nd, created: now(), updatedAt: now(),
      subtasks: (t.subtasks || []).map(x => ({ ...x, done: false })) });
    toast(`Próxima repetição: ${fmtDay(nd).toLowerCase()}`);
  } else if (!done && t.spawned) {
    // Desmarcada: remove a repetição que tinha sido criada (se ainda não foi mexida), para não ficar em duplicado.
    const nd = nextTaskDate(t);
    const copy = (t.spawnedId && taskById(t.spawnedId)) || tasks().find(x => x.id !== t.id && !x.done && x.title === t.title && x.repeat === t.repeat && x.date === nd);
    if (copy && !copy.done) touch(copy, { deleted: true });
    t.spawned = false;
    t.spawnedId = null;
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
