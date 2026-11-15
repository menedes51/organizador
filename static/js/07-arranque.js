/* Organizador · 07-arranque.js — Arranque da app
   (os ficheiros js/01…07 são carregados por esta ordem; partilham as mesmas variáveis globais) */
'use strict';

/* ------------------------------------------------------------------ start */
applyPrefs();
const launch = new URLSearchParams(location.search);
if (pref('start') !== 'last') ui.view = pref('start');
if (launch.get('view') && VIEW_NAMES[launch.get('view')]) ui.view = launch.get('view');
if (launch.toString()) history.replaceState(null, '', location.pathname);
if ((ui.view === 'list' && !listById(ui.listId)) || ui.view === 'search' || (ui.view === 'subject' && !subjectById(ui.subjectId)) || (ui.view === 'project' && !projectById(ui.projectId))) ui.view = 'today';
COLLS.forEach(k => { db[k] ||= []; });
if (purgeOld()) saveLocal();
migrateClasses();
applyTheme();

applyAccent();
(() => { const pill = document.createElement('button'); pill.id = 'focusPill'; pill.className = 'focus-pill'; pill.dataset.nav = 'focus'; pill.hidden = true; document.body.appendChild(pill); })();
buildComposer();
resetDraft();
render();
startNative().then(() => {
  maybeOnboard();
  autoBackup();
  setTimeout(exportNag, 4000);
  if (launch.get('action') === 'new') { if (isMobile()) openComposerSheet(); else { const i = $('#newTitle'); if (i) i.focus(); } }
});
setTimeout(checkReminders, 1500);
setInterval(autoBackup, 3600e3);
// Se a app ficar aberta de um dia para o outro, atualiza as vistas ("Hoje", atrasadas…) à meia-noite.
let lastDay = today();
setInterval(() => { if (today() !== lastDay) { lastDay = today(); autoBackup(); if (!ui.openTask && !ui.openEvent) render(); } }, 60000);
