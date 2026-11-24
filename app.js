'use strict';
// Локальный интерактивный прототип. Для полноценного входа требуется серверная авторизация.
const subjectsSeed = [{
  id: 1, name: 'Базы данных', hours: 96
}
, {
  id: 2, name: 'Разработка программных модулей', hours: 144
}
, {
  id: 3, name: 'Веб-программирование', hours: 108
}
, {
  id: 4, name: 'Информационная безопасность', hours: 72
}
, {
  id: 5, name: 'Операционные системы', hours: 80
}
, {
  id: 6, name: 'Математическое моделирование', hours: 64
}
, {
  id: 7, name: 'Тестирование ПО', hours: 90
}
, {
  id: 8, name: 'Проектирование ИС', hours: 120
}
];
const groupsSeed = [{
  id: 1, name: 'ИСП-23-1', year: 2023
}
, {
  id: 2, name: 'ИСП-23-2', year: 2023
}
, {
  id: 3, name: 'ИСП-24-1', year: 2024
}
, {
  id: 4, name: 'ИСП-24-2', year: 2024
}
, {
  id: 5, name: 'ИСП-25-1', year: 2025
}
, {
  id: 6, name: 'ИСП-25-2', year: 2025
}
];
const names = [['Иванов', 'Артём', 'Сергеевич'], ['Петрова', 'Анастасия', 'Игоревна'], ['Смирнов', 'Максим', 'Алексеевич'], ['Кузнецова', 'Дарья', 'Павловна'], ['Соколов', 'Даниил', 'Михайлович'], ['Морозова', 'Елизавета', 'Андреевна'], ['Васильев', 'Никита', 'Романович'], ['Орлова', 'Софья', 'Дмитриевна'], ['Новиков', 'Кирилл', 'Олегович'], ['Фёдорова', 'Мария', 'Ильинична'], ['Белов', 'Дмитрий', 'Викторович'], ['Волкова', 'Полина', 'Сергеевна'], ['Михайлов', 'Александр', 'Евгеньевич'], ['Крылова', 'Алина', 'Николаевна'], ['Захаров', 'Глеб', 'Андреевич'], ['Попова', 'Виктория', 'Олеговна'], ['Антонов', 'Руслан', 'Максимович'], ['Козлова', 'Валерия', 'Петровна']];
let groups, subjects, students, grades, imports;
let state = {
  view: 'dashboard', search: '', group: 'all', subject: 'all', grade: 'all', file: null, importGroup: '1', importSemester: '1'
}
;
const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function reset() {
  groups = structuredClone(groupsSeed); subjects = structuredClone(subjectsSeed); students = groups.flatMap((g, gi) => names.slice(0, gi % 2 ? 14 : 16).map((n, j) => ({ id: gi * 100 + j + 1, group: g.id, last: n[0], first: n[1], middle: n[2] }))); grades = []; students.forEach((st, i) => subjects.forEach((s, j) => {
    if (((i + j) % 7) !== 0)
    grades.push({ id: grades.length + 1, student: st.id, subject: s.id, value: (i * 7 + j * 3) % 17 === 0 ? 2 : (i + j) % 5 === 0 ? 3 : (i + j) % 3 === 0 ? 4 : 5, period: 1 });
  })); imports = [{ file: 'omni_isp_23_1.xlsx', group: 1, date: '21.11.2026, 14:32', count: 120, status: 'Завершён' }, { file: 'omni_isp_24_1.xlsx', group: 3, date: '19.11.2026, 10:18', count: 108, status: 'Завершён' }, { file: 'omni_isp_25_2.xlsx', group: 6, date: '16.11.2026, 16:05', count: 98, status: 'Завершён' }];
}
reset();
const getGroup = id => groups.find(g => g.id == id), getSubject = id => subjects.find(s => s.id == id), getStudent = id => students.find(s => s.id == id);
const fullname = s => s ? `${s.last} ${s.first} ${s.middle}` : '';
const average = a => a.length ? (a.reduce((sum, g) => sum + Number(g.value), 0) / a.length).toFixed(2) : '—';
const gradePill = v => v == null ? '<span class="grade empty">—</span>' : typeof v === 'number' ? `<span class="grade g${
  v
}
">${v}</span>` : `<span class="grade text blue">${esc(v)}</span>`;
const btn = (label, action, primary = false) => `<button class="btn ${
  primary ? 'primary' : ''
}
" data-action="${
  action
}
">${label}</button>`;
const titles = { dashboard: ['Обзор', 'Обзор успеваемости', 'Ключевые показатели и последние события журнала'], grades: ['Журнал оценок', 'Журнал оценок', 'Просмотр, поиск и фильтрация выгруженных результатов'], groups: ['Учебные группы', 'Учебные группы', 'Результаты успеваемости в разрезе учебных групп'], students: ['Студенты', 'Список студентов', 'Поиск студентов и просмотр их результатов'], subjects: ['Дисциплины', 'Учебные дисциплины', 'Перечень дисциплин и количество учебных часов'], imports: ['Импорт из Excel', 'Импорт из журнала Omni', 'Загрузка и проверка файла с оценками'], analytics: ['Аналитика', 'Аналитика успеваемости', 'Сводные показатели и распределение результатов'] };
function setView(view) { state.view = view; state.search = ''; state.group = 'all'; state.subject = 'all'; state.grade = 'all'; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function statsData() { const vals = grades.filter(g => typeof g.value === 'number'); return { students: students.length, groups: groups.length, average: average(vals), bad: vals.filter(g => g.value === 2).length, vals }; }
function stat(label, value, note, icon, kind = '') { return `<div class="stat"><div class="stat-top"><span>${label}</span><div class="stat-icon ${
  kind
}
">${icon}</div></div><div class="stat-value">${value}</div><div class="stat-note">${note}</div></div>`; }
function panel(title, body, action = '') { return `<section class="panel"><div class="panel-head"><h2>${title}</h2>${action}</div>${body}</section>`; }
function table(head, rows, empty = 'Нет данных по выбранным фильтрам') { return `<div class="table-wrap"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.join('') : `<tr><td colspan="${
  head.length
}
" class="empty-state">${empty}</td></tr>`}</tbody></table></div>`; }
function dashboard() { const d = statsData(); const byGroup = groups.map(group => ({ name: group.name, avg: parseFloat(average(grades.filter(x => getStudent(x.student)?.group === group.id && typeof x.value === 'number'))) || 0 })); const recent = grades.slice(0, 5).map(g => { const s = getStudent(g.student); return `<tr><td><strong>${esc(fullname(s))}</strong></td><td>${esc(getGroup(s.group).name)}</td><td>${esc(getSubject(g.subject).name)}</td><td>${gradePill(g.value)}</td></tr>`; }); return `<div class="stats">${stat('Всего студентов', d.students, 'В 6 учебных группах', '♙')}${stat('Средний балл', d.average, 'По всем числовым оценкам', '↗', 'green')}${stat('Учебных групп', d.groups, 'Подключены к системе', '▤')}${stat('Неудовлетворительных', d.bad, 'Оценки «2», требуют внимания', '!', 'red')}</div><div class="layout-two">${panel('Успеваемость по группам', `<div class="panel-body"><p style="font-size:11px">Средний балл за 1 семестр 2026/2027</p><div class="chart">${byGroup.map(g => `<div class="bar-col"><b>${g.avg.toFixed(1)}</b><div class="bar" style="height:${
  Math.round(g.avg / 5 * 80)
}
%"></div></div>`).join('')}</div><div class="chart-labels">${byGroup.map(g => `<span>${esc(g.name.replace('ИСП-', ''))}</span>`).join('')}</div></div>`)}${panel('Последние действия', `<div class="panel-body activity"><div class="activity-item"><div class="activity-icon green">✓</div><div><strong>Завершена выгрузка оценок</strong><p>ИСП-23-1 · 21 ноября 2026</p></div></div><div class="activity-item"><div class="activity-icon">⇧</div><div><strong>Добавлен Excel-файл</strong><p>omni_isp_24_1.xlsx · 19 ноября 2026</p></div></div><div class="activity-item"><div class="activity-icon amber">!</div><div><strong>Есть результаты, требующие внимания</strong><p>${d.bad} неудовлетворительных оценок в журнале</p></div></div></div>`)} </div><div style="height:20px"></div>${panel('Последние оценки', table(['Студент', 'Группа', 'Дисциплина', 'Оценка'], recent), '<button class="link" data-action="go-grades">Весь журнал →</button>')}`; }
function filteredGrades() {
  return grades.filter(g => {
    const s = getStudent(g.student); if (!s)
    return false; return (state.group === 'all' || String(s.group) === state.group) && (state.subject === 'all' || String(g.subject) === state.subject) && (state.grade === 'all' || String(g.value) === state.grade) && (!state.search || fullname(s).toLowerCase().includes(state.search.toLowerCase()));
  });
}
function gradesView() { const groupSelect = `<select class="field" data-filter="group"><option value="all">Все группы</option>${groups.map(x => `<option value="${
  x.id
}
" ${state.group == x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>`; const subjSelect = `<select class="field" data-filter="subject"><option value="all">Все дисциплины</option>${subjects.map(x => `<option value="${
  x.id
}
" ${state.subject == x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>`; const gradeSelect = `<select class="field" data-filter="grade"><option value="all">Все оценки</option>${[5, 4, 3, 2].map(v => `<option ${state.grade == v ? 'selected' : ''}>${v}</option>`).join('')}</select>`; let filtered = filteredGrades(); let rows = filtered.slice(0, 200).map((g, i) => { let s = getStudent(g.student); return `<tr><td>${i + 1}</td><td><strong>${esc(fullname(s))}</strong></td><td>${esc(getGroup(s.group).name)}</td><td>${esc(getSubject(g.subject).name)}</td><td>${gradePill(g.value)}</td><td><span class="tag success">Импортировано</span></td></tr>`; }); return `<div class="toolbar"><input class="field search" data-filter="search" placeholder="⌕  Поиск по фамилии или ФИО" value="${
  esc(state.search)
}
">${groupSelect}${subjSelect}${gradeSelect}</div>${panel('Результаты выборки', table(['№', 'ФИО студента', 'Группа', 'Дисциплина', 'Оценка', 'Статус'], rows) + `<div class="table-footer"><span>Показано ${rows.length} из ${filtered.length} записей</span><span>Учебный год 2026/2027 · 1 семестр</span></div>`, `<span class="note">${filtered.length} записей</span>`)}`; }
function groupsView() { return `<div class="group-grid">${groups.map(group => { let ss = students.filter(x => x.group === group.id), gr = grades.filter(x => ss.some(s => s.id === x.student) && typeof x.value === 'number'); let av = +average(gr); return `<button class="group-card" data-open-group="${
  group.id
}
"><div style="display:flex;justify-content:space-between;align-items:center"><h3>${esc(group.name)}</h3><span class="tag blue">${group.year} г.</span></div><p>Программирование и информационные системы</p><div class="group-meta"><span>Студентов <strong>${ss.length}</strong></span><span>Средний балл <strong>${av.toFixed(2)}</strong></span></div><div class="progress"><div style="width:${
  Math.round(av / 5 * 100)
}
%"></div></div></button>`; }).join('')}</div>`; }
function studentsView() { const filtered = students.filter(s => (state.group === 'all' || state.group == s.group) && fullname(s).toLowerCase().includes(state.search.toLowerCase())); return `<div class="toolbar"><input class="field search" data-filter="search" placeholder="⌕  Поиск по фамилии или ФИО" value="${
  esc(state.search)
}
"><select class="field" data-filter="group"><option value="all">Все группы</option>${groups.map(g => `<option value="${
  g.id
}
" ${state.group == g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></div>${panel('Студенты', table(['ФИО', 'Учебная группа', 'Оценок', 'Средний балл', 'Подробнее'], filtered.map(s => { const gg = grades.filter(g => g.student === s.id && typeof g.value === 'number'); return `<tr><td><strong>${esc(fullname(s))}</strong></td><td>${esc(getGroup(s.group).name)}</td><td>${gg.length}</td><td><span class="tag blue">${average(gg)}</span></td><td><button class="link" data-student="${
  s.id
}
">Открыть →</button></td></tr>`; })))}`; }
function subjectsView() { return `${panel('Учебный план и нагрузка', table(['Дисциплина', 'Часы обучения', 'Групп с дисциплиной', 'Действия'], subjects.map((s, i) => `<tr><td><div class="subject-name"><div class="sub-icon">▣</div><strong>${esc(s.name)}</strong></div></td><td><strong>${s.hours} ч.</strong></td><td>${groups.length}</td><td><button class="editable" data-edit-subject="${
  s.id
}
">Изменить часы</button></td></tr>`)) + `<div class="table-footer"><span>Всего дисциплин: ${subjects.length}</span><span>Общая учебная нагрузка: <b>${subjects.reduce((n, s) => n + s.hours, 0)} ч.</b></span></div>`)}<p class="note" style="margin-top:15px">Часы дисциплин хранятся в поле subjects.study_hours базы PostgreSQL.</p>`; }
function importsView() { return `<div class="layout-two" style="grid-template-columns:1.4fr 1fr">${panel('Новая загрузка', `<div class="panel-body"><label class="import-zone" id="drop-zone"><input type="file" id="file-input" accept=".xlsx,.xls,.csv"><div class="upload-icon">⇧</div><h3 id="filename">${state.file ? esc(state.file.name) : 'Перетащите файл сюда'}</h3><p>или нажмите для выбора файла · Excel (.xlsx, .xls) или CSV</p></label><div class="form-row"><div class="form-group"><label>Учебная группа</label><select class="field" id="import-group">${groups.map(g => `<option value="${
  g.id
}
" ${state.importGroup == g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></div><div class="form-group"><label>Учебный период</label><select class="field" id="import-period"><option value="1">2026/2027 · 1 семестр</option><option value="2">2026/2027 · 2 семестр</option></select></div></div><div style="margin-top:20px">${btn('⇧  Смоделировать импорт', 'import', true)}</div><div class="hint"><b>Как будет работать готовая версия:</b> приложение проверит заголовки Excel, сопоставит ФИО и дисциплины, покажет предварительный просмотр и сохранит оценки в PostgreSQL. <b>В текущей версии</b> файл не анализируется и на сервер не отправляется — добавляется только запись в историю.</div></div>`)}${panel('Что должно быть в файле', `<div class="panel-body"><p style="margin-bottom:17px;font-size:11px">Пример структуры выгрузки Omni</p><div class="mini-list"><div><strong>Строки</strong><span>ФИО студентов</span></div><div><strong>Столбцы</strong><span>Названия дисциплин</span></div><div><strong>Ячейки</strong><span>Оценка или результат</span></div><div><strong>Группа</strong><span>Указывается перед импортом</span></div><div><strong>Период</strong><span>Указывается перед импортом</span></div></div><div class="hint">При повторном импорте готовая система должна проверять дубли, а отсутствие оценки не считать неудовлетворительной оценкой.</div></div>`)}</div><div style="height:20px"></div>${panel('История загрузок', table(['Файл', 'Группа', 'Дата и время', 'Записей', 'Статус'], imports.map(it => `<tr><td><strong>${esc(it.file)}</strong></td><td>${esc(getGroup(it.group)?.name || '—')}</td><td>${esc(it.date)}</td><td>${it.count}</td><td><span class="tag success">${esc(it.status)}</span></td></tr>`)))}`; }
function analyticsView() { let d = statsData(); let dist = [5, 4, 3, 2].map(v => ({ grade: v, num: d.vals.filter(g => g.value === v).length })); let top = Math.max(...dist.map(g => g.num), 1); return `<div class="stats">${stat('Средний балл', d.average, 'По всем группам', '↗', 'green')}${stat('Отличных оценок', dist[0].num, 'Оценки «5»', '★', 'green')}${stat('Хороших оценок', dist[1].num, 'Оценки «4»', '✓')}${stat('Неудовлетворительных', d.bad, 'Оценки «2»', '!', 'red')}</div><div class="layout-two">${panel('Распределение оценок', `<div class="panel-body"><div class="chart">${dist.map(g => `<div class="bar-col"><b>${g.num}</b><div class="bar" style="height:${
  Math.round(g.num / top * 82)
}
%"></div></div>`).join('')}</div><div class="chart-labels">${dist.map(g => `<span>Оценка ${g.grade}</span>`).join('')}</div></div>`)}${panel('Сводка по оценкам', `<div class="panel-body"><div class="mini-list">${dist.map(g => `<div><span>${gradePill(g.grade)} &nbsp; Оценка ${g.grade}</span><b>${g.num} · ${Math.round(g.num / d.vals.length * 100)}%</b></div>`).join('')}</div><div class="hint">Средний балл рассчитывается только по числовым оценкам. Зачёты и пустые ячейки не участвуют в среднем.</div></div>`)}</div><div style="height:20px"></div>${panel('Рейтинг учебных групп', table(['Группа', 'Студентов', 'Средний балл', 'Оценок «2»'], groups.map(g => { let ss = students.filter(s => s.group === g.id), gg = grades.filter(x => ss.some(s => s.id === x.student) && typeof x.value === 'number'); return `<tr><td><strong>${esc(g.name)}</strong></td><td>${ss.length}</td><td><span class="tag blue">${average(gg)}</span></td><td>${gg.filter(x => x.value === 2).length}</td></tr>`; })))}`; }
function render() { let t = titles[state.view]; $('#page-title').textContent = t[1]; $('#page-subtitle').textContent = t[2]; $('#crumb-current').textContent = t[0]; $$('.navitem').forEach(el => el.classList.toggle('active', el.dataset.view === state.view)); let actions = state.view === 'dashboard' ? btn('⇧  Импорт оценок', 'go-import', true) : state.view === 'grades' ? btn('↓  Экспорт CSV', 'export', true) : state.view === 'analytics' ? btn('↓  Отчёт CSV', 'export-analytics', true) : state.view === 'subjects' ? btn('+  Добавить дисциплину', 'add-subject', true) : ''; $('#head-actions').innerHTML = actions; $('#content').innerHTML = ({ dashboard, grades: gradesView, groups: groupsView, students: studentsView, subjects: subjectsView, imports: importsView, analytics: analyticsView })[state.view](); attachFilters(); }
function attachFilters() {
  $$('[data-filter]').forEach(el => {
    el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => {
      state[el.dataset.filter] = el.value; let pos = el.selectionStart; render(); if (el.dataset.filter === 'search') {
        let el2 = $('[data-filter="search"]');
        el2.focus();
        el2.setSelectionRange(pos, pos);
      }
    });
  }); let inp = $('#file-input'); if (inp) {
    inp.onchange = () => { state.file = inp.files[0] || null; $('#filename').textContent = state.file ? state.file.name : 'Перетащите файл сюда'; };
    const drop = $('#drop-zone');
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('dragover'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
    drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('dragover'); state.file = e.dataTransfer.files[0] || null; $('#filename').textContent = state.file ? state.file.name : 'Перетащите файл сюда'; });
  }
}
function toast(message) { let el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2900); }
function modal(title, body, okText, onOk) {
  $('#modal-root').innerHTML = `<div class="modal-cover"><div class="modal" role="dialog" aria-modal="true"><h2>${title}</h2>${body}<div class="modal-actions"><button class="btn" id="cancel-modal">Отмена</button><button class="btn primary" id="ok-modal">${okText}</button></div></div></div>`; $('#cancel-modal').onclick = closeModal; $('.modal-cover').addEventListener('click', e => {
    if (e.target.classList.contains('modal-cover'))
    closeModal();
  }); $('#ok-modal').onclick = onOk;
}
function closeModal() { $('#modal-root').innerHTML = ''; }
function exportCSV(rows, name) { let csv = '\ufeff' + rows.map(row => row.map(v => '"' + String(v ?? '').replaceAll('"', '""') + '"').join(';')).join('\r\n'); let url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); let a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500); toast('CSV-файл сформирован'); }
function doExport() { let rows = [['ФИО', 'Группа', 'Дисциплина', 'Часы', 'Оценка', 'Семестр'], ...filteredGrades().map(g => { let st = getStudent(g.student), su = getSubject(g.subject); return [fullname(st), getGroup(st.group).name, su.name, su.hours, g.value, '2026/2027 · 1']; })]; exportCSV(rows, 'omni_grades.csv'); }
function studentDetails(id) {
  let st = getStudent(id); if (!st)
  return; let gg = grades.filter(g => g.student == id); modal(esc(fullname(st)), `<p>Группа: <b>${esc(getGroup(st.group).name)}</b> · Средний балл: <b>${average(gg)}</b></p><div style="max-height:260px;overflow:auto" class="mini-list">${gg.map(g => `<div><span>${esc(getSubject(g.subject).name)}</span>${gradePill(g.value)}</div>`).join('')}</div>`, 'Закрыть', closeModal);
}
function editSubject(id) {
  let s = getSubject(id); modal('Часы дисциплины', `<p>${esc(s.name)}</p><div class="form-group"><label>Количество часов обучения</label><input id="hours-field" class="field" type="number" min="0" step="1" value="${s.hours}"></div>`, 'Сохранить', () => {
    let v = Number($('#hours-field').value); if (!Number.isInteger(v) || v < 0) {
      toast('Введите целое неотрицательное количество часов');
      return;
    } s.hours = v; closeModal(); render(); toast('Часы дисциплины обновлены');
  });
}
function addSubject() {
  modal('Новая дисциплина', `<div class="form-group"><label>Название дисциплины</label><input class="field" id="new-subject-name" placeholder="Например, Мобильная разработка"></div><div class="form-group"><label>Часы обучения</label><input class="field" id="new-subject-hours" type="number" min="0" value="72"></div>`, 'Добавить', () => {
    let name = $('#new-subject-name').value.trim(), h = Number($('#new-subject-hours').value); if (!name || !Number.isInteger(h) || h < 0) {
      toast('Проверьте название и часы');
      return;
    } if (subjects.some(x => x.name.toLowerCase() === name.toLowerCase())) {
      toast('Такая дисциплина уже есть');
      return;
    } subjects.push({ id: Math.max(...subjects.map(x => x.id)) + 1, name, hours: h }); closeModal(); render(); toast('Дисциплина добавлена');
  });
}
document.addEventListener('click', e => {
  let nav = e.target.closest('[data-view]'); if (nav) {
    setView(nav.dataset.view);
    return;
  } let act = e.target.closest('[data-action]')?.dataset.action; if (act) {
    if (act === 'go-grades')
    setView('grades');
    if (act === 'go-import')
    setView('imports');
    if (act === 'export')
    doExport();
    if (act === 'add-subject')
    addSubject();
    if (act === 'export-analytics') {
      let rows = [['Группа', 'Студентов', 'Средний балл', 'Неудовлетворительных'], ...groups.map(g => { let ss = students.filter(s => s.group === g.id), gg = grades.filter(x => ss.some(s => s.id === x.student)); return [g.name, ss.length, average(gg), gg.filter(x => x.value === 2).length]; })];
      exportCSV(rows, 'omni_analytics.csv');
    }
    if (act === 'import') {
      let group = Number($('#import-group').value), name = state.file?.name;
      if (!name) {
        toast('Сначала выберите Excel или CSV файл');
        return;
      }
      imports.unshift({ file: name, group, date: new Date().toLocaleString('ru-RU'), count: 0, status: 'Завершён' });
      state.file = null;
      render();
      toast('Запись добавлена в историю; содержимое файла не обрабатывается');
    }
    return;
  } let edit = e.target.closest('[data-edit-subject]'); if (edit) {
    editSubject(+edit.dataset.editSubject);
    return;
  } let st = e.target.closest('[data-student]'); if (st) {
    studentDetails(+st.dataset.student);
    return;
  } let group = e.target.closest('[data-open-group]'); if (group) {
    state.group = String(group.dataset.openGroup);
    state.view = 'grades';
    render();
    return;
  }
});
$('#reset-demo').onclick = () => { reset(); state.file = null; render(); toast('Изменения сброшены'); };
render();

// Выход из личного кабинета.
document.querySelector("#logout-button").addEventListener("click", () => {
  sessionStorage.removeItem("omni_teacher_session");
  window.location.replace("login.html");
});
