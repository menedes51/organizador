/* Organizador · 02-vistas.js — Desenho das tarefas e das páginas (Hoje, Calendário, Listas…)
   (os ficheiros js/01…07 são carregados por esta ordem; partilham as mesmas variáveis globais) */
'use strict';

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

const VIEW_NAMES = { today: 'Hoje', upcoming: 'Próximos', calendar: 'Calendário', list: 'Lista', lists: 'Mais', search: 'Procurar', focus: 'Foco',
  stats: 'Estatísticas', subjects: 'Disciplinas', subject: 'Disciplina', projects: 'Trabalhos', project: 'Trabalho', appearance: 'Aparência', backups: 'Cópias de segurança' };
function parentOf(v) {
  if (v === 'subject') return 'subjects';
  if (v === 'project') return 'projects';
  if (['list', 'subjects', 'stats', 'upcoming', 'appearance', 'backups'].includes(v)) return isMobile() ? 'lists' : 'today';
  return 'today';
}
function needsBack() {
  if (['subject', 'project', 'list', 'appearance', 'backups'].includes(ui.view)) return true;
  if (ui.view === 'calendar' && ui.calMode === 'timetable' && navStack.length && navStack[navStack.length - 1].view === 'calendar') return true;
  return isMobile() && ['subjects', 'stats', 'upcoming'].includes(ui.view);
}
function backLabel() {
  const top = navStack[navStack.length - 1];
  if (top) {
    if (top.view === 'calendar' && ui.view === 'calendar') return { day: 'Dia', week: 'Semana', month: 'Mês' }[top.mode] || 'Calendário';
    if (top.view === 'subject') return subjectById(top.id)?.name || 'Disciplina';
    if (top.view === 'project') return projectById(top.id)?.name || 'Trabalho';
    if (top.view === 'list') return listById(top.id)?.name || 'Lista';
    return VIEW_NAMES[top.view] || 'Voltar';
  }
  return VIEW_NAMES[parentOf(ui.view)] || 'Voltar';
}

function head(title, sub = '', extra = '', actions = '') {
  const back = needsBack() ? `<button class="back-btn" data-back>${icon('chevL')}<span>${esc(backLabel())}</span></button>` : '';
  return `${back}<div class="page-head">
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
      <button class="row" data-nav="backups">${icon('shield')}<span class="label">Cópias de segurança</span><span class="count">${backupsOn() ? 'automáticas' : 'desligadas'}</span>${icon('chevR')}</button>
      <button class="row" data-ics-all>${icon('calendar')}<span class="label">Pôr tudo no calendário do telemóvel</span></button>
    </div>
    <div class="section-title">Aparência</div>
    <div class="rows">
      <button class="row" data-install>${icon('phone')}<span class="label">Instalar app</span></button>
      <button class="row" data-accent>${icon('palette')}<span class="label">Cor de destaque</span><span class="dot" style="--c:var(--accent);width:12px;height:12px"></span></button>
      <button class="row" data-nav="appearance">${icon('sliders')}<span class="label">Temas e personalização</span><span class="count">${(THEMES.find(x => x[0] === themePref()) || THEMES[0])[1]}</span>${icon('chevR')}</button>
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
    const active = ui.view === v || (v === 'lists' && ['list', 'stats', 'subjects', 'subject', 'upcoming', 'appearance', 'backups'].includes(ui.view)) || (v === 'projects' && ui.view === 'project');
    return `<button class="tab ${active ? 'active' : ''}" data-nav="${v}">${icon(ic)}${label}</button>`;
  };
  $('#tabbar').innerHTML = tab('today', 'today', 'Hoje') + tab('calendar', 'calendar', 'Calendário') +
    tab('projects', 'users', 'Trabalhos') + tab('focus', 'timer', 'Foco') + tab('lists', 'lists', 'Mais');
}

function render() {
  const v = { today: viewToday, upcoming: viewUpcoming, calendar: viewCalendar, list: viewList, lists: viewLists, search: viewSearch, focus: viewFocus, stats: viewStats, subjects: viewSubjects, subject: viewSubject, projects: viewProjects, project: viewProject, appearance: viewAppearance, backups: viewBackups }[ui.view] || viewToday;
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
  const noComposer = ['lists', 'search', 'focus', 'stats', 'subjects', 'projects', 'project', 'appearance', 'backups'].includes(ui.view) || (ui.view === 'calendar' && ui.calMode === 'timetable');
  $('#composer').classList.toggle('hidden', noComposer);
  document.body.classList.toggle('lists-view', noComposer);
  document.body.classList.toggle('wide', (ui.view === 'calendar' && (ui.calMode === 'week' || ui.calMode === 'timetable')) || ui.view === 'project');
  renderSidebar();
  renderTabbar();
  updateComposer();
  updateInstallUi();
  updatePomoUi();
  if (ui.kaddFocus) { ui.kaddFocus = false; const i = $('[data-kadd]'); if (i) i.focus({ preventScroll: true }); }
  if (ui.view === 'backups') fillBackups();
}
