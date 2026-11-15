/* Organizador · 06-extras.js — Lembretes, arrastar, instalação, Foco, Estatísticas, gestos e boas-vindas
   (os ficheiros js/01…08 são carregados por esta ordem; partilham as mesmas variáveis globais) */
'use strict';

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
if ('serviceWorker' in navigator && window.isSecureContext && !window.ORG_TEST && !window.pywebview && location.hostname !== '127.0.0.1') {
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
  if (window.ORG_TEST) return;
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
