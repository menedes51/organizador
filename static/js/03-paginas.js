/* Organizador · 03-paginas.js — Compositor, formulários, Disciplinas, Trabalhos, Aparência e datas por texto
   (os ficheiros js/01…08 são carregados por esta ordem; partilham as mesmas variáveis globais) */
'use strict';

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
  const gWarn = gradeCalc(gs).warn;
  const gradesHtml = `<div class="section"><div class="section-title">Notas<span class="n">${gs.length}</span><button class="sec-action" data-add-grade="${x.id}">+ Nota</button></div>
    ${gWarn ? `<div class="notice warn">${icon('flag')}<span>${esc(gWarn)}</span></div>` : ''}
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
    { label: 'Partilhar resumo com o grupo', icon: 'share', onClick: () => shareProject(id) },
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
  const top = head('Trabalhos de grupo', 'Divide o trabalho em tópicos e distribui pelo grupo · fica só neste dispositivo', '', actions);
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
    <button class="chip" data-proj-members>${icon('users')}${members.length ? 'Membros' : 'Adicionar membros'}</button>
    <button class="chip" data-share-project="${p.id}" title="Envia a divisão de tópicos por WhatsApp, email…">${icon('share')}Partilhar resumo</button></div>`;
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

/* ------------------------------------------------------------------ aparência */
function viewAppearance() {
  const p = themePref(), acc = localStorage.getItem('organizador.accent') || '';
  const segP = (k, opts) => `<div class="seg wide">${opts.map(([v, l]) => `<button class="${pref(k) === v ? 'on' : ''}" data-set-pref="${k}" data-val="${v}">${l}</button>`).join('')}</div>`;
  const card = ([k, n, c]) => {
    const cols = c || (matchMedia('(prefers-color-scheme: dark)').matches ? THEMES[2][2] : THEMES[1][2]);
    const split = !c ? `background:linear-gradient(135deg, ${THEMES[1][2][0]} 50%, ${THEMES[2][2][0]} 50%)` : `background:${cols[0]}`;
    return `<button class="theme-card ${p === k ? 'on' : ''}" data-set-theme="${k}">
      <span class="tp" style="${split}"><i style="background:${cols[1]}"></i><b style="background:${acc || cols[3]}"></b><em style="background:${cols[2]}"></em><em style="background:${cols[2]};width:40%"></em></span>
      <span class="tn">${n}</span></button>`;
  };
  const content = `
    <div class="section"><div class="section-title">Tema</div><div class="theme-grid">${THEMES.map(card).join('')}</div></div>
    <div class="section"><div class="section-title">Cor de destaque</div>
      <div class="accent-row">${ACCENTS.map(([n, c]) => `<button class="accent-dot ${acc === (c || '') ? 'on' : ''}" style="--c:${c || 'var(--theme-accent, #6b78e5)'}" data-set-accent="${c || ''}" title="${n}"><span>${n}</span></button>`).join('')}</div></div>
    <div class="pref-list">
      <div class="pref"><div><b>Tamanho do texto</b><span>Afeta tarefas, listas e títulos</span></div>${segP('text', [['small', 'Pequeno'], ['normal', 'Normal'], ['large', 'Grande']])}</div>
      <div class="pref"><div><b>Densidade</b><span>Compacta mostra mais tarefas no ecrã</span></div>${segP('density', [['', 'Normal'], ['compact', 'Compacta']])}</div>
      <div class="pref"><div><b>Cantos</b><span>Botões e cartões arredondados ou retos</span></div>${segP('corners', [['round', 'Arredondados'], ['square', 'Retos']])}</div>
      <div class="pref"><div><b>Abrir a app em</b><span>A página que aparece ao abrir</span></div>
        <select class="field" data-pref-select="start">${[['last', 'Onde fiquei'], ['today', 'Hoje'], ['calendar', 'Calendário'], ['projects', 'Trabalhos'], ['subjects', 'Disciplinas'], ['focus', 'Foco']].map(([v, l]) => `<option value="${v}" ${pref('start') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    </div>
    <div class="section" style="margin-top:22px"><div class="section-title">Pré-visualização</div>
      ${taskRow({ id: '__p1', title: 'Rever apontamentos de Álgebra', date: today(), time: '18:00', cat: 'faculdade', created: 0, done: false, subtasks: [{ done: true }, { done: false }] }, { showDate: false })}
      ${taskRow({ id: '__p2', title: 'Jantar com o grupo', date: addDays(today(), 1), cat: 'social', important: true, created: 0, done: false })}
    </div>`;
  return { top: head('Aparência', 'Temas, cores e personalização'), content };
}
document.addEventListener('change', e => { if (e.target.matches && e.target.matches('[data-pref-select]')) setPref(e.target.dataset.prefSelect, e.target.value); });

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
