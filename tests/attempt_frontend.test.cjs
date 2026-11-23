const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {test} = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '../web/app.js'), 'utf8');
const path = '/ms/v1/attempts/attempt';

function attempt(choices = {}, status = 'IN_PROGRESS') {
  return {
    id: 'attempt', status, total: 2, correct: status === 'GRADED' ? 1 : null,
    questions: ['first', 'second'].map(id => ({
      id, prompt: id, choices: {A: 'Option A', B: 'Option B'},
      selectedChoice: choices[id] ?? null, correct: status === 'GRADED',
      explanation: status === 'GRADED' ? 'Answer explanation' : null
    }))
  };
}

function response(body, status = 200) {
  return {ok: status === 200, status, headers: {get: () => 'application/json'}, json: async () => body};
}

function frontend() {
  const nodes = new Map();
  const requests = [];
  let radios = [];
  const node = id => {
    if (!nodes.has(id)) {
      const classes = new Set();
      const attributes = new Map();
      nodes.set(id, {disabled: false, classList: {
        add: value => classes.add(value), remove: value => classes.delete(value),
        toggle: (value, enabled) => enabled ? classes.add(value) : classes.delete(value),
        contains: value => classes.has(value)
      }, scrollIntoView() {}, querySelectorAll: () => [],
      setAttribute: (name, value) => attributes.set(name, value),
      getAttribute: name => attributes.get(name),
      showModal() { this.open = true; }, close() { this.open = false; }});
    }
    return nodes.get(id);
  };
  Object.defineProperty(node('attempt-area'), 'innerHTML', {
    set(markup) {
      this.markup = markup;
      for (const id of ['submit-attempt', 'retry-answers', 'answer-save-status', 'submit-dialog']) nodes.delete(id);
      for (const [, id] of markup.matchAll(/id="([^"]+)"/g)) node(id);
      radios = [];
    }
  });
  Object.defineProperty(node('question-slot'), 'innerHTML', {
    set(markup) {
      this.markup = markup;
      radios = Array.from(markup.matchAll(/<input type="radio" name="([^"]+)" value="([^"]+)"([^>]*)>/g),
        ([, name, value, flags]) => ({name, value, checked: flags.includes('checked'), disabled: flags.includes('disabled')}));
    }
  });

  const context = vm.createContext({
    document: {getElementById: node, querySelectorAll: selector => selector.includes('radio') ? radios : []},
    addEventListener() {},
    sessionStorage: {getItem: () => null},
    fetch: (url, options) => {
      if (url === '/ms/v1/contents/quizzes' || url === '/ms/v1/attempts') return Promise.resolve(response([]));
      return new Promise(resolve => requests.push({url, method: options.method ?? 'GET',
        choice: options.body && JSON.parse(options.body).choice,
        complete: (body, status) => resolve(response(body, status))}));
    }
  });
  vm.runInContext(source, context, {filename: 'web/app.js'});
  const moveTo = question => {
    if (!radios.some(radio => radio.name === 'q-' + question)) {
      node(question === 'first' ? 'prev-question' : 'next-question').onclick();
    }
  };
  const select = (question, choice) => {
    moveTo(question);
    const group = radios.filter(radio => radio.name === `q-${question}`);
    const selected = group.find(radio => radio.value === choice);
    assert.equal(selected.disabled, false);
    for (const radio of group) radio.checked = radio === selected;
    return selected.onchange();
  };
  return {
    requests, node, select, moveTo,
    reopen: () => vm.runInContext('loadAttempt("attempt")', context),
    render: data => vm.runInContext(`renderAttempt(${JSON.stringify(data)})`, context),
    loadCatalogOrder: detail => vm.runInContext(`rememberQuizDetail(${JSON.stringify(detail)})`, context),
    selected: question => radios.find(radio => radio.name === `q-${question}` && radio.checked)?.value,
    radios: () => radios,
    clickSubmit: () => node('submit-attempt').onclick(),
    confirmSubmit: () => node('confirm-submit').onclick(),
    submits: () => requests.filter(request => request.url === `${path}/submit`)
  };
}

test('slow answer blocks submit until the saved choice is acknowledged', async () => {
  const ui = frontend();
  ui.render(attempt());
  const saving = ui.select('first', 'A');
  await ui.clickSubmit();
  assert.equal(ui.node('submit-attempt').disabled, true);
  assert.equal(ui.submits().length, 0);
  ui.requests[0].complete(attempt({first: 'A'}));
  await saving;
  assert.equal(ui.node('submit-attempt').disabled, false);
  ui.clickSubmit();
  assert.equal(ui.submits().length, 0);
  const submitting = ui.confirmSubmit();
  assert.equal(ui.submits().length, 1);
  ui.submits()[0].complete(attempt({first: 'A'}, 'GRADED'));
  await submitting;
});

test('failed save keeps the selected answer, blocks submit, and supports retry', async () => {
  const ui = frontend();
  ui.render(attempt());
  const saving = ui.select('second', 'B');
  ui.requests[0].complete({}, 503);
  await saving;
  assert.match(ui.node('answer-save-status').textContent, /câu 2/);
  assert.equal(ui.node('retry-answers').classList.contains('hidden'), false);
  assert.equal(ui.selected('second'), 'B');
  await ui.clickSubmit();
  assert.equal(ui.submits().length, 0);
  const retrying = ui.node('retry-answers').onclick();
  assert.equal(ui.requests[1].choice, 'B');
  ui.requests[1].complete(attempt({second: 'B'}));
  await retrying;
  assert.equal(ui.node('submit-attempt').disabled, false);
  assert.equal(ui.node('retry-answers').classList.contains('hidden'), true);
});

test('a successful HTTP status without the selected choice does not unlock submission', async () => {
  const ui = frontend();
  ui.render(attempt({first: 'A'}));
  const saving = ui.select('first', 'B');
  ui.requests[0].complete(attempt({first: 'A'}));
  await saving;
  assert.equal(ui.selected('first'), 'B');
  assert.equal(ui.node('submit-attempt').disabled, true);
  assert.match(ui.node('answer-save-status').textContent, /câu 1/);
  await ui.clickSubmit();
  assert.equal(ui.submits().length, 0);
});

test('A to B on one question is serialized while other responses may arrive first', async () => {
  const ui = frontend();
  ui.render(attempt());
  const first = ui.select('first', 'A');
  await ui.select('first', 'B');
  const second = ui.select('second', 'A');
  assert.deepEqual(ui.requests.map(request => request.choice), ['A', 'A']);
  ui.requests[1].complete(attempt({second: 'A'}));
  await second;
  ui.requests[0].complete(attempt({first: 'A'}));
  await new Promise(setImmediate);
  assert.equal(ui.requests[2].url, `${path}/answers/first`);
  assert.equal(ui.requests[2].choice, 'B');
  assert.equal(ui.selected('second'), 'A');
  ui.moveTo('first');
  assert.equal(ui.selected('first'), 'B');
  await ui.clickSubmit();
  assert.equal(ui.submits().length, 0);
  ui.requests[2].complete(attempt({first: 'B', second: 'A'}));
  await first;
  assert.equal(ui.node('submit-attempt').disabled, false);
});

test('double click sends only one submit and locks choices while grading', async () => {
  const ui = frontend();
  ui.render(attempt({first: 'A'}));
  ui.clickSubmit();
  assert.match(ui.node('submit-summary').textContent, /1 câu bỏ trống/);
  const submitting = ui.confirmSubmit();
  await ui.clickSubmit();
  await ui.confirmSubmit();
  assert.equal(ui.submits().length, 1);
  assert.ok(ui.radios().every(radio => radio.disabled));
  ui.submits()[0].complete(attempt({first: 'A'}, 'GRADED'));
  await submitting;
  assert.match(ui.node('result-area').innerHTML, /Kết quả: 1\/2/);
  assert.match(ui.node('result-area').innerHTML, /Lựa chọn của bạn: A/);
  assert.equal(ui.radios().length, 0);
});

test('reopening an in-progress attempt restores server choices and preserves pending changes', async () => {
  const ui = frontend();
  const reopening = ui.reopen();
  ui.requests[0].complete(attempt({first: 'A'}));
  await reopening;
  assert.equal(ui.selected('first'), 'A');
  const saving = ui.select('first', 'B');
  const reopeningWhileSaving = ui.reopen();
  ui.requests[2].complete(attempt({first: 'A'}));
  await reopeningWhileSaving;
  assert.equal(ui.selected('first'), 'B');
  await ui.clickSubmit();
  assert.equal(ui.submits().length, 0);
  ui.requests[1].complete(attempt({first: 'B'}));
  await saving;
  assert.equal(ui.node('submit-attempt').disabled, false);
});

test('reopening and trying to submit a graded attempt only displays its stored result', async () => {
  const ui = frontend();
  ui.render(attempt());
  const staleSubmit = ui.node('submit-attempt').onclick;
  const reopening = ui.reopen();
  ui.requests[0].complete(attempt({first: 'B'}, 'GRADED'));
  await reopening;
  await staleSubmit();
  assert.equal(ui.submits().length, 0);
  assert.doesNotMatch(ui.node('attempt-area').markup, /id="submit-attempt"/);
  assert.match(ui.node('result-area').innerHTML, /Answer explanation/);
  assert.match(ui.node('result-area').innerHTML, /Lựa chọn của bạn: B/);
  assert.equal(ui.radios().length, 0);
});

test('exam shows one question, retains review flags and cancels submission without a write', async () => {
  const ui = frontend();
  ui.render(attempt());
  assert.ok(ui.radios().every(radio => radio.name === 'q-first'));
  ui.node('flag-question').onclick();
  assert.equal(ui.node('flag-question').getAttribute('aria-pressed'), 'true');
  ui.node('next-question').onclick();
  assert.ok(ui.radios().every(radio => radio.name === 'q-second'));
  await ui.clickSubmit();
  assert.match(ui.node('submit-summary').textContent, /2 câu bỏ trống/);
  ui.node('cancel-submit').onclick();
  assert.equal(ui.submits().length, 0);
  ui.node('prev-question').onclick();
  assert.match(ui.node('question-slot').markup, /aria-pressed="true"/);
});

test('published catalog order controls presentation without altering saved answer identities', () => {
  const ui = frontend();
  ui.loadCatalogOrder({quiz: {id: 'quiz', title: 'Ordered', part: 5}, questions: [{id: 'second'}, {id: 'first'}]});
  ui.render({...attempt({first: 'A', second: 'B'}), quizId: 'quiz'});
  assert.ok(ui.radios().every(radio => radio.name === 'q-second'));
  assert.equal(ui.selected('second'), 'B');
  ui.node('next-question').onclick();
  assert.equal(ui.selected('first'), 'A');
});

test('server snapshot order wins over the current catalog for positioned and legacy attempts', () => {
  for (const positions of [[1, 2], [null, null]]) {
    const ui = frontend();
    ui.loadCatalogOrder({quiz: {id: 'quiz', title: 'Catalog', part: 5}, questions: [{id: 'second'}, {id: 'first'}]});
    const data = attempt({first: 'A', second: 'B'});
    data.questions.forEach((question, index) => { question.position = positions[index]; });
    ui.render({...data, quizId: 'quiz'});
    assert.ok(ui.radios().every(radio => radio.name === 'q-first'));
    assert.equal(ui.selected('first'), 'A');
    ui.node('next-question').onclick();
    assert.equal(ui.selected('second'), 'B');
  }
});
