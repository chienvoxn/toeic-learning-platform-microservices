const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {test} = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '../web/app.js'), 'utf8');
const markup = readFileSync(join(__dirname, '../web/index.html'), 'utf8');

function frontend() {
  const nodes = new Map();
  const requests = [];
  const storage = new Map();
  const tabs = ['dashboard', 'practice', 'membership', 'interaction', 'teacher', 'admin', 'architecture'];
  let focused;
  function element(id) {
    const classes = new Set();
    const attributes = new Map();
    return {id, textContent: '', innerHTML: '', value: '',
      classList: {add: name => classes.add(name), toggle: (name, on) => on ? classes.add(name) : classes.delete(name),
        contains: name => classes.has(name)},
      getAttribute: name => attributes.get(name), setAttribute: (name, value) => attributes.set(name, value),
      removeAttribute: name => attributes.delete(name), focus() { focused = this; }, querySelectorAll: () => []};
  }
  for (const [, id] of markup.matchAll(/\bid="([^"]+)"/g)) nodes.set(id, element(id));
  const nav = tabs.map(tab => Object.assign(element(tab), {dataset: {tab}}));
  const context = vm.createContext({
    document: {getElementById: id => nodes.get(id), querySelectorAll: selector => {
      if (selector === '.nav') return nav;
      if (selector === '.view') return tabs.map(tab => nodes.get(tab + '-view'));
      return [];
    }},
    sessionStorage: {getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key)},
    fetch: (path, options) => new Promise(resolve => requests.push({path, options,
      complete: (status, body) => resolve({ok: status < 400, status, headers: {get: () => 'application/json'},
        json: async () => body})}))
  });
  const run = code => vm.runInContext(code, context);
  run(source);
  return {run, requests, storage, nav, node: id => nodes.get(id), focused: () => focused};
}

test('dashboard regions independently show loading, results, empty state, or server error', async () => {
  const ui = frontend();
  const loading = ui.run('loadHome()');
  assert.match(ui.node('home-catalog-status').textContent, /Đang tải danh mục/);
  assert.match(ui.node('home-history-status').textContent, /Đang tải/);
  ui.requests[0].complete(200, [{id: 'quiz', title: 'TOEIC Test', part: 5, premium: false, count: 1}]);
  ui.requests[1].complete(200, []);
  ui.requests[2].complete(503);
  await loading;
  assert.equal(ui.node('stat-quizzes').textContent, 1);
  assert.match(ui.node('home-quizzes').innerHTML, /TOEIC Test/);
  assert.equal(ui.node('stat-attempts').textContent, 0);
  assert.match(ui.node('home-history-status').textContent, /chưa có lượt luyện tập/);
  assert.match(ui.node('home-membership-status').textContent, /Máy chủ/);

  const refresh = ui.run('loadHome()');
  ui.requests[3].complete(502);
  ui.requests[4].complete(200, [{id: 'attempt'}]);
  ui.requests[5].complete(200, {planCode: 'FREE', maxPracticePerDay: 10});
  await refresh;
  assert.match(ui.node('home-catalog-status').textContent, /Máy chủ/);
  assert.match(ui.node('home-quizzes').innerHTML, /TOEIC Test/);
  assert.equal(ui.node('stat-attempts').textContent, 1);
  assert.equal(ui.node('stat-plan').textContent, 'FREE');
});

test('latest practice refresh wins and an active navigation item moves focus to the heading', async () => {
  const ui = frontend();
  const first = ui.run('setTab("practice")');
  const second = ui.run('loadPractice()');
  assert.equal(ui.focused(), ui.node('page-title'));
  assert.equal(ui.nav.filter(button => button.getAttribute('aria-current') === 'page').length, 1);
  assert.equal(ui.nav[1].getAttribute('aria-current'), 'page');
  ui.requests[2].complete(200, []);
  ui.requests[3].complete(200, [{id: 'attempt', status: 'IN_PROGRESS', total: 1}]);
  await second;
  ui.requests[0].complete(503);
  ui.requests[1].complete(503);
  await first;
  assert.match(ui.node('practice-catalog-status').textContent, /Chưa có đề/);
  assert.match(ui.node('attempt-list').innerHTML, /IN_PROGRESS/);
});

test('activity still loads when review catalog fails, and review failure is local', async () => {
  const ui = frontend();
  const loading = ui.run('loadInteraction()');
  ui.requests[0].complete(503);
  ui.requests[1].complete(200, [{kind: 'ATTEMPT_GRADED', attemptId: 'attempt'}]);
  await loading;
  assert.match(ui.node('review-catalog-status').textContent, /Máy chủ/);
  assert.match(ui.node('activity-list').innerHTML, /ATTEMPT_GRADED/);
  ui.node('review-quiz').value = 'quiz';
  const reviews = ui.run('loadReviews()');
  ui.requests[2].complete(503);
  await reviews;
  assert.match(ui.node('reviews-status').textContent, /Máy chủ/);
  assert.match(ui.node('activity-list').innerHTML, /ATTEMPT_GRADED/);
});

test('attempt errors distinguish permission, FREE entitlement, expired token, and server error', async () => {
  const ui = frontend();
  ui.run('state.token = "test-token"');
  let opening = ui.run('startAttempt("premium", true)');
  ui.requests[0].complete(403);
  await opening;
  assert.match(ui.node('attempt-open-status').textContent, /không có quyền/);
  assert.equal(ui.requests.length, 1);

  ui.run('state.permissions = ["assessment:submit"]');
  opening = ui.run('startAttempt("premium", true)');
  ui.requests[1].complete(403);
  await new Promise(setImmediate);
  assert.equal(ui.requests[2].path, '/api/v1/memberships/me');
  ui.requests[2].complete(200, {planCode: 'FREE'});
  await opening;
  assert.match(ui.node('attempt-open-status').textContent, /yêu cầu gói PRO/);

  for (const [status, message] of [[401, /Phiên đăng nhập/], [502, /Máy chủ/], [429, /hết lượt/]]) {
    opening = ui.run('startAttempt("free", false)');
    ui.requests.at(-1).complete(status);
    await opening;
    assert.match(ui.node('attempt-open-status').textContent, message);
  }
});

test('login does not persist a partial session and distinguishes bad credentials', async () => {
  const ui = frontend();
  let loggingIn = ui.run('login("/ms/v1/identity/login", {})');
  assert.equal(ui.node('login-submit').disabled, true);
  ui.requests[0].complete(401);
  await loggingIn;
  assert.match(ui.node('flash').textContent, /Email hoặc mật khẩu/);
  assert.equal(ui.node('login-submit').disabled, false);

  loggingIn = ui.run('login("/ms/v1/identity/login", {})');
  ui.requests[1].complete(200, {accessToken: 'candidate', user: {displayName: 'Learner'}});
  await new Promise(setImmediate);
  assert.equal(ui.requests[2].options.headers.Authorization, 'Bearer candidate');
  ui.requests[2].complete(503);
  await loggingIn;
  assert.equal(ui.storage.has('toeic.jwt'), false);
  assert.equal(ui.run('state.user'), null);
  assert.match(ui.node('flash').textContent, /Máy chủ/);
});

test('successful authentication keeps role-specific navigation tied to API permissions', async () => {
  for (const [permissions, teacher, admin] of [
    [[], false, false],
    [['content:write'], true, false],
    [['content:write', 'rbac:manage'], true, true]
  ]) {
    const ui = frontend();
    const loggingIn = ui.run('login("/ms/v1/identity/login", {})');
    ui.requests[0].complete(200, {accessToken: 'candidate', user: {displayName: 'Account'}});
    await new Promise(setImmediate);
    ui.requests[1].complete(200, {permissions, roles: []});
    await loggingIn;
    assert.equal(ui.storage.get('toeic.jwt'), 'candidate');
    assert.equal(ui.node('teacher-tab').classList.contains('hidden'), !teacher);
    assert.equal(ui.node('admin-tab').classList.contains('hidden'), !admin);
    ui.requests[2].complete(200, []);
    ui.requests[3].complete(200, []);
    ui.requests[4].complete(200, {planCode: 'FREE', maxPracticePerDay: 10});
  }
});
