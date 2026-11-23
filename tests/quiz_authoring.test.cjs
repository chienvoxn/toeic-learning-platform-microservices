const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {test} = require('node:test');
const vm = require('node:vm');

const context = vm.createContext({TextEncoder, TextDecoder});
vm.runInContext(readFileSync(join(__dirname, '../web/quiz-authoring.js'), 'utf8'), context);
const {parseQuizCsv, readQuizFile, createDraft, prepareQuiz, createEditor} = vm.runInContext('QuizAuthoring', context);
const template = readFileSync(join(__dirname, '../web/quiz-import-template.csv'), 'utf8');
const header = template.split('\n')[0];
const valid = {prompt: 'Question?', a: 'First', b: 'Second', c: 'Third', d: 'Fourth', answer: 'B', explanation: 'Reason.'};
const row = (number, part = 5, answer = 'B') => `${number},${part},Question?,First,Second,Third,Fourth,${answer},Reason.`;

test('downloadable template uses the supported CSV schema', () => {
  const parsed = parseQuizCsv(template, '5');
  assert.equal(parsed.issues.length, 0);
  assert.equal(parsed.questions.length, 2);
  assert.match(parsed.questions[0].explanation, /"by"/);
});

test('CSV preserves Vietnamese, quoted commas, escaped quotes, line breaks and question_no order', () => {
  const csv = '\ufeff' + header + '\r\n' + row(2) +
    '\r\n1,5,"Lời nhắc: ""Xin chào"",\r\ndòng tiếp theo",First,Second,Third,Fourth,b,Giải thích.';
  const {questions, issues} = parseQuizCsv(csv, 5);
  assert.equal(issues.length, 0);
  assert.equal(questions[0].prompt, 'Lời nhắc: "Xin chào",\ndòng tiếp theo');
  assert.equal(questions[0].answer, 'B');
  assert.equal(questions[1].prompt, 'Question?');
});

test('CSV validation reports physical lines, duplicate/gapped numbers, Part, answers and required fields', () => {
  const csv = [header, '1,5,"Line 1\nLine 2",First,Second,Third,Fourth,B,Reason.',
    '1,6,Other question,First,Second,Third,Fourth,E,'].join('\n');
  const report = parseQuizCsv(csv, 5);
  assert.equal(report.questions.length, 0);
  assert.match(report.issues.join('\n'), /Dòng 4, cột question_no.*trùng/);
  assert.match(report.issues.join('\n'), /Dòng 4, cột part.*Part 5/);
  assert.match(report.issues.join('\n'), /Dòng 4, cột correct_answer/);
  assert.match(report.issues.join('\n'), /Dòng 4, cột explanation/);
  assert.match(parseQuizCsv([header, row(1), row(3)].join('\n'), 5).issues[0], /thiếu số 2/);
});

test('CSV rejects malformed quoting, wrong headers, missing columns, and empty inputs', () => {
  assert.match(parseQuizCsv(header + '\n1,5,"unfinished', 5).issues[0], /Dòng 2, cột 3.*nháy đóng/);
  assert.match(parseQuizCsv(header + '\n1,5,"question"junk', 5).issues[0], /Dòng 2, cột 3/);
  assert.match(parseQuizCsv(header + '\n1,5,Question', 5).issues[0], /cột 4/);
  assert.match(parseQuizCsv('part,part', 5).issues.join('\n'), /Thiếu cột bắt buộc/);
  assert.match(parseQuizCsv('\ufeff\r\n', 5).issues[0], /trống/);
  assert.match(parseQuizCsv(header, 5).issues[0], /chưa có câu hỏi/);
});

test('CSV checks file size before reading bytes, rejects invalid UTF-8 and caps questions', async () => {
  const oversized = await readQuizFile({size: 1024 * 1024 + 1, arrayBuffer: () => assert.fail('read')}, 5);
  assert.match(oversized.issues[0], /1 MiB/);
  const invalid = await readQuizFile({size: 1, arrayBuffer: async () => Uint8Array.of(0xff).buffer}, 5);
  assert.match(invalid.issues[0], /UTF-8/);
  const rows = Array.from({length: 201}, (_, index) => row(index + 1));
  assert.match(parseQuizCsv([header, ...rows].join('\n'), 5).issues[0], /Dòng 202.*200/);
});

test('draft adds, duplicates independently, reorders, and removes questions', () => {
  const model = createDraft();
  assert.equal(model.hasChanges(), false);
  Object.assign(model.draft.questions[0], valid);
  assert.equal(model.hasChanges(), true);
  assert.equal(model.add(1, model.draft.questions[0]), true);
  model.draft.questions[1].prompt = 'Duplicate edited separately';
  assert.equal(model.draft.questions[0].prompt, 'Question?');
  assert.equal(model.move(1, 0), true);
  assert.equal(model.draft.questions[0].prompt, 'Duplicate edited separately');
  model.remove(0);
  model.remove(0);
  assert.equal(model.hasChanges(), false);
});

test('import replaces only a blank first slot, appends to existing work, and rejects overflow atomically', () => {
  const model = createDraft();
  assert.equal(model.importQuestions([valid]), 0);
  assert.equal(model.importQuestions([{...valid, prompt: 'Imported'}]), 1);
  assert.equal(model.importQuestions(Array(199).fill(valid)), -1);
  assert.equal(model.draft.questions.length, 2);
  assert.equal(model.draft.questions[0].prompt, 'Question?');
});

test('publish validation pinpoints incomplete questions, checks payload size and uses the existing DTO shape', () => {
  const model = createDraft();
  model.draft.title = 'Quiz';
  assert.match(prepareQuiz(model.draft).questions[0].a, /Bắt buộc/);
  model.draft.questions = [valid, {...valid, prompt: 'Next', b: valid.a}];
  assert.match(prepareQuiz(model.draft).questions[1].b, /Trùng/);
  model.draft.questions = Array.from({length: 200}, () => ({...valid, explanation: 'ế'.repeat(4000)}));
  assert.match(prepareQuiz(model.draft).error, /2 MiB/);
  model.draft.questions = [valid, {...valid, prompt: 'Next'}];
  const payload = JSON.parse(prepareQuiz(model.draft).body);
  assert.deepEqual(payload, {title: 'Quiz', part: 5, premium: false, questions: [valid, {...valid, prompt: 'Next'}]});
});

test('editor saves separately, preview and cancel send no publish, and a conflict keeps local edits', async () => {
  const nodes = new Map();
  const byId = id => {
    if (!nodes.has(id)) {
      nodes.set(id, {
        value: '', dataset: {}, classList: {add() {}, remove() {}}, focus() {}, reset() {},
        setAttribute() {}, removeAttribute() {}, showModal() { this.open = true; }, close() { this.open = false; }
      });
    }
    return nodes.get(id);
  };
  let fail;
  const calls = [];
  const saves = [];
  const editor = createEditor({byId, escape: String, confirm: () => true,
    status: (id, message) => { byId(id).textContent = message; },
    save: async (_draft, body) => {
      const {questions, ...quiz} = JSON.parse(body);
      saves.push(questions);
      return {quiz: {...quiz, id: 'draft', version: 2}, questions};
    },
    onSaved() {},
    publish: draft => new Promise((_, reject) => { calls.push(draft.version); fail = reject; })
  });
  const form = byId('teacher-form');
  form.onsubmit({preventDefault() {}});
  assert.match(byId('teacher-status').textContent, /Kiểm tra/);
  const title = byId('editor-title');
  title.value = 'QA editor';
  form.oninput({target: title});
  Object.entries(valid).forEach(([key, value]) => form.oninput({target: {dataset: {field: key}, value}}));
  assert.equal(byId('teacher-status').textContent, '');
  form.onsubmit({preventDefault() {}});
  assert.equal(byId('editor-preview-dialog').open, true);
  assert.equal(byId('editor-publish').disabled, true);
  assert.equal(calls.length, 0);
  byId('editor-preview-cancel').onclick();
  assert.equal(calls.length, 0);
  await byId('editor-save').onclick();
  assert.deepEqual(saves[0], [valid]);
  assert.equal(editor.hasChanges(), false);
  form.onsubmit({preventDefault() {}});
  const request = byId('editor-publish').onclick();
  await byId('editor-publish').onclick();
  assert.equal(calls.length, 1);
  assert.equal(calls[0], 2);
  fail(Object.assign(new Error('Conflict.'), {status: 409}));
  await request;
  assert.equal(editor.hasChanges(), false);
  assert.match(byId('teacher-status').textContent, /Phiên bản/);
  title.value = 'Local edits after rejected publish';
  form.oninput({target: title});
  assert.equal(editor.hasChanges(), true);
});
