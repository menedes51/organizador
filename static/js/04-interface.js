/* Organizador · 04-interface.js — Menus, diálogos, painel de detalhe, navegação e cliques
   (os ficheiros js/01…07 são carregados por esta ordem; partilham as mesmas variáveis globais) */
'use strict';

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
  if (!ui.detailPushed) { history.pushState({ d: 1 }, ''); ui.detailPushed = true; }
  render();
}
function closeDetail(fromPop) {
  if (!ui.openTask && !ui.openEvent) return;
  if (ui.detailPushed) { ui.detailPushed = false; if (fromPop !== true) { ignorePop++; history.back(); } }
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
      <button class="back-btn sm" data-close-detail>${icon('chevL')}<span>${t.done ? 'Concluída' : 'Tarefa'}</span></button>
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
        ${t.remind != null && t.time && t.date && !native ? '<div class="prop tight"><div class="prop-label"></div><div class="prop-value"><span class="hint-text">Só toca com a app aberta. Para um alarme garantido, usa o botão Calendário em baixo.</span></div></div>' : ''}
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
      <span style="display:flex;gap:6px">${t.date ? `<button class="btn ghost" data-d-ics title="Adicionar ao calendário do telemóvel ou do PC (alarme garantido)">${icon('calendar')}Calendário</button>` : ''}${t.done ? '' : `<button class="btn ghost" data-d-focus>${icon('timer')}Focar</button>`}<button class="btn danger" data-d-delete>${icon('trash')}Eliminar</button></span>
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
  el.querySelectorAll('[data-close-detail]').forEach(b => b.addEventListener('click', () => closeDetail()));
}

function openEvent(id, occ) {
  closeComposerSheet();
  ui.openTask = null;
  ui.openEvent = { id, occ: occ || null };
  renderEventDetail();
  document.body.classList.add('detail-open');
  if (!ui.detailPushed) { history.pushState({ d: 1 }, ''); ui.detailPushed = true; }
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
      <button class="back-btn sm" data-close-detail>${icon('chevL')}<span>${ev.isClass ? 'Aula' : 'Evento'}${occ && r.freq !== 'none' ? ' · ' + fmtLong(occ) : ''}</span></button>
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
      <span style="display:flex;gap:6px"><button class="btn ghost" data-d-ics title="Adicionar ao calendário do telemóvel ou do PC">${icon('calendar')}Calendário</button><button class="btn danger" data-e-delete>${icon('trash')}Eliminar</button></span>
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
  el.querySelectorAll('[data-close-detail]').forEach(b => b.addEventListener('click', () => closeDetail()));
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
const navStack = [];
let ignorePop = 0;
const curId = () => (ui.view === 'list' ? ui.listId : ui.view === 'subject' ? ui.subjectId : ui.view === 'project' ? ui.projectId : null);
function pushNav(entry, replace) {
  navStack.push(entry);
  if (navStack.length > 40) navStack.shift();
  if (replace) history.replaceState({ n: navStack.length }, ''); else history.pushState({ n: navStack.length }, '');
}
function goBack() {
  if (ui.openTask || ui.openEvent) return closeDetail();
  if (navStack.length) return history.back();
  setView(parentOf(ui.view), null, { back: true });
}
function restoreNav(prev) {
  if (prev.view === 'calendar' && prev.mode) { ui.calMode = prev.mode; ui.tgScroll = undefined; ui.tgScrollX = undefined; }
  setView(prev.view, prev.id, { back: true });
}
addEventListener('popstate', () => {
  if (ignorePop) { ignorePop--; return; }
  if (ui.openTask || ui.openEvent) return closeDetail(true);
  closeMenu();
  const prev = navStack.pop();
  if (prev) restoreNav(prev);
});

function setView(view, listId = null, opts = {}) {
  const hadDetail = !!ui.detailPushed;
  if (ui.openTask || ui.openEvent) closeDetail(true);
  if (!opts.back && (view !== ui.view || listId !== curId())) pushNav({ view: ui.view, id: curId(), mode: ui.calMode }, hadDetail);
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

const THEMES = [
  ['auto', 'Automático', null],
  ['light', 'Claro', ['#fafaf9', '#ffffff', '#1c1c1f', '#5561d6']],
  ['dark', 'Escuro', ['#111113', '#18181b', '#ececef', '#7b84e6']],
  ['oled', 'Preto puro', ['#000000', '#0c0c0d', '#ededf0', '#8a93f0']],
  ['midnight', 'Meia-noite', ['#0d1117', '#151b26', '#e6edf3', '#6d8cff']],
  ['forest', 'Floresta', ['#0f1412', '#161d1a', '#e4ece7', '#4fb386']],
  ['sand', 'Areia', ['#f6f1e8', '#fffdf8', '#2b2620', '#b06b3a']],
  ['lavender', 'Lavanda', ['#f6f5fb', '#ffffff', '#1f1d2b', '#7a5cd6']],
  ['mint', 'Menta', ['#f1f7f4', '#ffffff', '#16231d', '#2f8f6a']],
];
const themePref = () => localStorage.getItem('organizador.theme') || 'auto';
function applyTheme() {
  const p = themePref();
  const t = p === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : (THEMES.some(x => x[0] === p) ? p : 'dark');
  document.documentElement.dataset.theme = t;
  const m = $('meta[name=theme-color]');
  if (m) m.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#111113';
}
const PREFS = {
  text: ['organizador.text', 'normal'],
  corners: ['organizador.corners', 'round'],
  start: ['organizador.start', 'last'],
  density: ['organizador.density', ''],
};
const pref = k => localStorage.getItem(PREFS[k][0]) || PREFS[k][1];
function applyPrefs() {
  const h = document.documentElement;
  h.dataset.text = pref('text');
  h.classList.toggle('square', pref('corners') === 'square');
  h.classList.toggle('compact', pref('density') === 'compact');
}
function setPref(k, v) {
  if (!v || v === PREFS[k][1]) localStorage.removeItem(PREFS[k][0]); else localStorage.setItem(PREFS[k][0], v);
  applyPrefs();
  render();
}
function setTheme(p) { localStorage.setItem('organizador.theme', p); applyTheme(); render(); }
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (themePref() === 'auto') { applyTheme(); render(); } });
function setDensity(on) { setPref('density', on ? 'compact' : ''); }
function appearanceMenu(anchor) {
  const p = themePref(), compact = !!localStorage.getItem('organizador.density');
  openMenu(anchor, [
    ...THEMES.map(([k, n, c]) => ({ label: k === 'auto' ? 'Automático (segue o sistema)' : n, dot: c ? c[0] : null, icon: c ? null : 'sliders', checked: p === k, onClick: () => setTheme(k) })),
    { sep: true },
    { label: 'Cor de destaque…', icon: 'palette', onClick: () => accentMenu(anchor) },
    { label: 'Vista compacta', icon: 'list', checked: compact, onClick: () => setDensity(!compact) },
    { sep: true },
    { label: 'Mais temas e personalização…', icon: 'sliders', onClick: () => setView('appearance') },
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
  if (q('[data-task^="__p"], [data-toggle^="__p"]')) return;
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
    if (el.dataset.calMode === ui.calMode) return;
    if (el.dataset.calMode === 'timetable') pushNav({ view: 'calendar', id: null, mode: ui.calMode });
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
  if (q('[data-back]')) return goBack();
  if ((el = q('[data-set-theme]'))) return setTheme(el.dataset.setTheme);
  if ((el = q('[data-set-accent]'))) { const c = el.dataset.setAccent; if (c) localStorage.setItem('organizador.accent', c); else localStorage.removeItem('organizador.accent'); applyAccent(); return render(); }
  if ((el = q('[data-set-pref]'))) return setPref(el.dataset.setPref, el.dataset.val);
  if ((el = q('[data-accent]'))) return accentMenu(el);
  if ((el = q('[data-pomo]'))) return pomoAction(el.dataset.pomo);
  if ((el = q('[data-pomo-phase]'))) return pomoSetPhase(el.dataset.pomoPhase);
  if (q('[data-install]')) return installApp();
  if (q('[data-export]')) return exportData();
  if (q('[data-ics-all]')) return exportIcsAll();
  if (q('[data-d-ics]')) return exportIcsOpen();
  if (q('[data-bk-now]')) return makeBackup('Manual').then(ok => { toast(ok ? 'Cópia criada' : 'Ainda não há nada para guardar'); fillBackups(); });
  if (q('[data-bk-toggle]')) { localStorage.setItem(BK_ON, backupsOn() ? 'off' : 'on'); if (backupsOn()) autoBackup(); return render(); }
  if ((el = q('[data-bk-restore]'))) return restoreBackup(el.dataset.bkRestore);
  if ((el = q('[data-bk-del]'))) return backupStore.remove(el.dataset.bkDel).then(fillBackups);
  if (q('[data-persist]')) return navigator.storage.persist().then(ok => { toast(ok ? 'Armazenamento protegido' : 'O browser não autorizou. Instalar a app ajuda.'); fillBackups(); });
  if ((el = q('[data-share-project]'))) return shareProject(el.dataset.shareProject);
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
