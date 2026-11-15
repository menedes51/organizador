/* Organizador · testes automáticos da lógica (corre no browser: abre tests/index.html).
   Cobre: datas por texto, médias, repetições, validação dos dados, limpeza, calendário (.ics) e segurança do HTML. */
'use strict';
const results = [];
let group = '';
const describe = name => { group = name; };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function test(name, fn) {
  try { fn(); results.push({ group, name, ok: true }); }
  catch (e) { results.push({ group, name, ok: false, err: e.message }); }
}
function expect(v) {
  return {
    toBe: x => { if (!eq(v, x)) throw new Error(`esperava ${JSON.stringify(x)}, veio ${JSON.stringify(v)}`); },
    toContain: x => { if (!String(v).includes(x)) throw new Error(`esperava conter ${JSON.stringify(x)}`); },
    notToContain: x => { if (String(v).includes(x)) throw new Error(`não devia conter ${JSON.stringify(x)}`); },
    truthy: () => { if (!v) throw new Error(`esperava verdadeiro, veio ${JSON.stringify(v)}`); },
  };
}
const T = today();
const wd = n => { let d = T; while (parseISO(d).getDay() !== n) d = addDays(d, 1); return d; }; // próximo dia da semana (hoje incluído)
const fresh = () => { db = blank(); };

/* ------------------------------------------------------------ datas por texto */
describe('Datas por texto');
test('amanhã + hora', () => {
  const p = parseQuick('Entregar relatório amanhã 14h');
  expect([p.date, p.time, p.title]).toBe([addDays(T, 1), '14:00', 'Entregar relatório']);
});
test('dia da semana + "às" + minutos', () => {
  const p = parseQuick('Jantar com a Rita sexta às 20h30');
  expect([p.date, p.time, p.title]).toBe([wd(5), '20:30', 'Jantar com a Rita']);
});
test('"ter de" não é terça-feira', () => expect(parseQuick('Ter de estudar')).toBe(null));
test('texto sem datas → null', () => expect(parseQuick('Comprar pão')).toBe(null));
test('data numérica 25/12', () => {
  const p = parseQuick('Jantar de Natal 25/12');
  expect(p.date.slice(5)).toBe('12-25');
});
test('data impossível 31/02 é ignorada', () => expect(parseQuick('Coisa 31/02')).toBe(null));
test('"em 3 dias às 18:00"', () => {
  const p = parseQuick('Estudar em 3 dias às 18:00');
  expect([p.date, p.time]).toBe([addDays(T, 3), '18:00']);
});
test('hora inválida 25h é ignorada', () => expect((parseQuick('Treino 25h') || {}).time).toBe(undefined));
test('"!" marca importante e "exame" marca exame', () => {
  const p = parseQuick('Exame de Física amanhã !');
  expect([p.important, p.exam, p.title]).toBe([true, true, 'Exame de Física']);
});
test('#categoria', () => {
  fresh();
  expect(parseQuick('Café #soc').cat).toBe('social');
});

/* ------------------------------------------------------------ médias */
describe('Notas e médias');
const g = (score, weight, max = 20) => ({ score, weight, max });
test('sem pesos → média simples', () => expect(gradeCalc([g(10), g(16)]).avg).toBe(13));
test('todas com peso → ponderada', () => expect(gradeCalc([g(15.5, 40), g(12, 20)]).avg).toBe(14.3));
test('algumas sem peso → dividem o que falta para 100%', () => {
  const r = gradeCalc([g(10, 60), g(20, null)]);
  expect(r.avg).toBe(14);
  expect(r.warn).toContain('40%');
});
test('pesos já a 100% → notas sem peso não contam (com aviso)', () => {
  const r = gradeCalc([g(10, 100), g(20, null)]);
  expect(r.avg).toBe(10);
  expect(r.warn).toContain('não conta');
});
test('pesos acima de 100% → aviso', () => expect(gradeCalc([g(10, 70), g(12, 50)]).warn).toContain('mais de 100%'));
test('escalas diferentes (/10 e /20)', () => expect(gradeCalc([g(5, null, 10), g(10, null, 20)]).avg).toBe(10));
test('sem notas → null', () => expect(gradeCalc([g(null, 50)]).avg).toBe(null));

/* ------------------------------------------------------------ repetições */
describe('Tarefas repetidas');
test('dias úteis: de sexta salta para segunda', () => {
  const fri = wd(5);
  expect(nextTaskDate({ repeat: 'weekdays', date: fri })).toBe(addDays(fri, 3));
});
test('mensal: 31 de janeiro → último dia de fevereiro', () => {
  expect(nextTaskDate({ repeat: 'monthly', date: '2027-01-31' })).toBe('2027-02-28');
});
test('dias à escolha (terça e quinta): de terça vai para quinta', () => {
  const tue = wd(2);
  expect(nextTaskDate({ repeat: 'custom', repeatDays: [2, 4], date: tue })).toBe(addDays(tue, 2));
});
test('concluir cria a próxima; desmarcar apaga-a (sem duplicados)', () => {
  fresh();
  addTask({ title: 'Ginásio', date: T, repeat: 'daily' });
  const t = tasks()[0];
  toggleTask(t.id);
  expect(tasks().length).toBe(2);
  toggleTask(t.id);
  expect(tasks().length).toBe(1);
  expect(taskById(t.id).done).toBe(false);
  toggleTask(t.id);
  expect(tasks().length).toBe(2);
});

/* ------------------------------------------------------------ validação dos dados */
describe('Validação dos dados (importar / cópias)');
test('cor com código malicioso é trocada pela cor padrão', () => {
  const r = sanitizeDb({ tasks: [], categories: [{ id: 'x', name: 'X', color: 'red;}</style><script>alert(1)</script>' }] });
  expect(r.db.categories[0].color).toBe('#8a8f98');
});
test('id com aspas/HTML é rejeitado', () => {
  const r = sanitizeDb({ tasks: [{ id: '"><img src=x onerror=alert(1)>', title: 'a' }] });
  expect([r.db.tasks.length, r.dropped]).toBe([0, 1]);
});
test('campos desconhecidos são removidos', () => {
  const r = sanitizeDb({ tasks: [{ id: 'a1', title: 'Olá', evil: 'x', __proto__x: 1 }] });
  expect('evil' in r.db.tasks[0]).toBe(false);
});
test('datas e horas inválidas ficam vazias', () => {
  const r = sanitizeDb({ tasks: [{ id: 'a1', title: 'x', date: '2026-13-45', time: '99:99' }] });
  expect([r.db.tasks[0].date, r.db.tasks[0].time]).toBe([null, null]);
});
test('ids repetidos e entradas que não são objetos são ignorados', () => {
  const r = sanitizeDb({ tasks: [{ id: 'a', title: '1' }, { id: 'a', title: '2' }, 'lixo', null, 42] });
  expect([r.db.tasks.length, r.dropped]).toBe([1, 4]);
});
test('títulos enormes são cortados', () => {
  const r = sanitizeDb({ tasks: [{ id: 'a', title: 'x'.repeat(5000) }] });
  expect(r.db.tasks[0].title.length).toBe(300);
});
test('sem categorias → repõe as de origem', () => expect(sanitizeDb({ tasks: [] }).db.categories.length).toBe(4));
test('eventos sem data válida são ignorados', () => expect(sanitizeDb({ tasks: [], events: [{ id: 'e', title: 'x', date: 'ontem' }] }).db.events.length).toBe(0));

/* ------------------------------------------------------------ limpeza */
describe('Limpeza de itens apagados');
test('apagados há mais de 30 dias saem; recentes ficam (para desfazer)', () => {
  fresh();
  db.tasks.push({ id: 'velho', title: 'a', deleted: true, updatedAt: now() - 40 * 864e5, created: 0 });
  db.tasks.push({ id: 'novo', title: 'b', deleted: true, updatedAt: now() - 5 * 864e5, created: 0 });
  expect(purgeOld()).toBe(1);
  expect(db.tasks.map(t => t.id)).toBe(['novo']);
});

/* ------------------------------------------------------------ segurança do HTML */
describe('Segurança');
test('esc() neutraliza HTML', () => expect(esc('<img src=x onerror="a">')).notToContain('<img'));
test('título com HTML aparece como texto na lista', () => {
  fresh();
  addTask({ title: '<b id="xss">oi</b>', date: T });
  setView('today');
  expect(!!document.getElementById('xss')).toBe(false);
  expect($('#content').textContent).toContain('<b id="xss">oi</b>');
});

/* ------------------------------------------------------------ calendário (.ics) */
describe('Exportar para o calendário (.ics)');
test('aula semanal → RRULE com os dias e data de fim', () => {
  fresh();
  const mon = weekStart(T);
  const ev = { id: 'e1', title: 'Álgebra', date: mon, time: '09:00', end: '10:30', location: 'B-204',
    repeat: { freq: 'weekly', days: [1, 3], until: addDays(mon, 60) }, exceptions: [], isClass: true };
  const txt = icsFile([icsEvent(ev)]);
  expect(txt).toContain('BEGIN:VCALENDAR');
  expect(txt).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=');
  expect(txt).toContain('LOCATION:B-204');
});
test('exame tem alarme na véspera', () => {
  const txt = icsFile([icsTask({ id: 't1', title: 'Exame de Física', date: T, time: '09:00', exam: true })]);
  expect(txt).toContain('TRIGGER:-P1D');
});
test('vírgulas e ponto e vírgula são escapados', () => expect(icsEsc('a,b;c')).toBe('a\\,b\\;c'));

/* ------------------------------------------------------------ resumo de trabalhos */
describe('Trabalhos de grupo');
test('resumo agrupa por pessoa', () => {
  fresh();
  db.projects.push({ id: 'p1', name: 'Projeto', members: ['Rita', 'João'], created: 0, updatedAt: 0 });
  addTask({ title: 'Interface', project: 'p1', assignee: 'Rita' });
  addTask({ title: 'Testes', project: 'p1' });
  const txt = projectSummary(projectById('p1'));
  expect(txt).toContain('Rita:');
  expect(txt).toContain('Sem responsável:');
});

/* ------------------------------------------------------------ sincronização com o servidor */
describe('Sincronização (conta)');
const tk = (id, title, updatedAt, extra = {}) => ({ id, title, cat: 'pessoal', created: 1, updatedAt, ...extra });
const dbWith = (...ts) => ({ ...blank(), tasks: ts });
test('servidor vazio: envia tudo, não muda nada cá', () => {
  const r = syncMerge(sanitizeDb(dbWith(tk('a', 'A', 10))).db, {});
  expect([r.merged.tasks.map(t => t.id), r.changedLocal, r.changedRemote]).toBe([['a'], false, true]);
});
test('fica a alteração mais recente de cada item', () => {
  const local = sanitizeDb(dbWith(tk('a', 'A local', 20), tk('b', 'B local', 5))).db;
  const r = syncMerge(local, dbWith(tk('a', 'A servidor', 10), tk('b', 'B servidor', 30), tk('c', 'C novo', 1)));
  const t = id => r.merged.tasks.find(x => x.id === id).title;
  expect([t('a'), t('b'), t('c'), r.changedLocal, r.changedRemote]).toBe(['A local', 'B servidor', 'C novo', true, true]);
});
test('apagar noutro dispositivo apaga cá', () => {
  const r = syncMerge(sanitizeDb(dbWith(tk('a', 'A', 10))).db, dbWith(tk('a', 'A', 50, { deleted: true })));
  expect([r.merged.tasks[0].deleted, live(r.merged.tasks).length]).toBe([true, 0]);
});
test('dados iguais: nada para enviar', () => {
  const d = sanitizeDb(dbWith(tk('a', 'A', 10), tk('b', 'B', 11))).db;
  const r = syncMerge(d, { ...JSON.parse(JSON.stringify(d)), tasks: [...d.tasks].reverse(), savedAt: 1 });
  expect([r.changedLocal, r.changedRemote]).toBe([false, false]);
});
test('itens inválidos vindos do servidor são ignorados', () => {
  const r = syncMerge(sanitizeDb(dbWith()).db, dbWith(tk('<script>', 'X', 99), tk('ok', 'Bom', 1)));
  expect(r.merged.tasks.map(t => t.id)).toBe(['ok']);
});
test('endereço do servidor', () => {
  expect([normServer('organizador.local'), normServer(' 192.168.0.109/ '), normServer('https://x.pt/api'), normServer('ftp://x'), normServer(''), normServer('rui'), normServer('localhost:8790')])
    .toBe(['http://organizador.local', 'http://192.168.0.109', 'https://x.pt', null, null, null, 'http://localhost:8790']);
});

/* ------------------------------------------------------------ relatório */
localStorage.removeItem('teste.organizador.v2');
localStorage.removeItem('teste.organizador.ui');
const ok = results.filter(r => r.ok).length, fail = results.length - ok;
const groups = [...new Set(results.map(r => r.group))];
const el = document.createElement('div');
el.id = 'report';
el.innerHTML = `<h1>Testes do Organizador</h1>
  <p class="sum"><b class="${fail ? 'fail' : 'ok'}">${ok} de ${results.length} passaram</b>${fail ? ` · ${fail} falharam` : ''}</p>
  ${groups.map(gr => `<h2>${esc(gr)}</h2><ul>${results.filter(r => r.group === gr).map(r =>
    `<li class="${r.ok ? 'ok' : 'fail'}">${r.ok ? '✓' : '✗'} ${esc(r.name)}${r.err ? ` — <code>${esc(r.err)}</code>` : ''}</li>`).join('')}</ul>`).join('')}`;
document.body.appendChild(el);
window.TEST_RESULTS = { ok, fail, total: results.length, failed: results.filter(r => !r.ok) };
document.title = `${fail ? '✗' : '✓'} ${ok}/${results.length} · Testes`;
