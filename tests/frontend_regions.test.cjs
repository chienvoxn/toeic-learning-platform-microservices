const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {test} = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '../web/app.js'), 'utf8');
const authoring = readFileSync(join(__dirname, '../web/quiz-authoring.js'), 'utf8');
const markup = readFileSync(join(__dirname, '../web/index.html'), 'utf8');

function frontend(hash = '') {
  const nodes = new Map();
  const requests = [];
  const storage = new Map();
  const navTabs = [...markup.matchAll(/data-tab="([^"]+)"/g)].map(match => match[1]);
  const tabs = [...navTabs, 'interaction', 'quiz', 'attempt', 'result'];
  const location = {hash, pathname: '/', search: ''};
  const listeners = new Map();
  let focused;
  function element(id) {
    const classes = new Set();
    const attributes = new Map();
    let innerHTML = '';
    return {id, textContent: '', value: '', dataset: {},
      get innerHTML() { return innerHTML; },
      set innerHTML(value) {
        innerHTML = value;
        for (const [, nestedId] of value.matchAll(/\bid="([^"]+)"/g)) {
          if (!nodes.has(nestedId)) nodes.set(nestedId, element(nestedId));
        }
      },
      classList: {add: name => classes.add(name), remove: name => classes.delete(name),
        toggle: (name, on) => on ? classes.add(name) : classes.delete(name),
        contains: name => classes.has(name)},
      getAttribute: name => attributes.get(name), setAttribute: (name, value) => attributes.set(name, value),
      removeAttribute: name => attributes.delete(name), focus() { focused = this; },
      reset() {}, querySelectorAll: () => [],
      showModal() { this.open = true; }, close() { this.open = false; }};
  }
  for (const [, id] of markup.matchAll(/\bid="([^"]+)"/g)) nodes.set(id, element(id));
  const nav = navTabs.map(tab => Object.assign(element(tab), {dataset: {tab}}));
  const writeLocation = (_data, _title, path) => { location.hash = path.startsWith('#') ? path : ''; };
  const context = vm.createContext({
    document: {getElementById: id => nodes.get(id), querySelectorAll: selector => {
      if (selector === '.nav') return nav;
      if (selector === '.view') return tabs.map(tab => nodes.get(tab + '-view'));
      return [];
    }},
    location, history: {pushState: writeLocation, replaceState: writeLocation},
    addEventListener: (event, callback) => listeners.set(event, callback),
    atob, clearTimeout, setTimeout: () => 0, confirm: () => false, TextEncoder, TextDecoder,
    AbortSignal: {timeout: milliseconds => ({milliseconds})},
    sessionStorage: {getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key)},
    fetch: (path, options) => new Promise((resolve, reject) => requests.push({path, options,
      fail: () => reject(new TypeError('Fetch failed')),
      expire: () => { options.signal.reason = {name: 'TimeoutError'}; reject(new Error('Aborted')); },
      complete: (status, body) => resolve({ok: status < 400, status, headers: {get: () => 'application/json'},
        json: async () => body})}))
  });
  const run = code => vm.runInContext(code, context);
  run(authoring);
  run(source);
  return {run, requests, storage, nav, location, node: id => nodes.get(id), focused: () => focused,
    openHash: hash => { location.hash = hash; return listeners.get('hashchange')(); },
    offline: () => listeners.get('offline')()};
}

const learnerPermissions = ['assessment:submit', 'membership:read', 'interaction:write'];

function setLearner(ui) {
  ui.run(`state.user = {}; state.workspace = 'learner'; state.roles = ['LEARNER'];
    state.permissions = ${JSON.stringify(learnerPermissions)}`);
}

const jwt = (roles, permissions) => 'test.' + Buffer.from(JSON.stringify({roles, permissions})).toString('base64url') + '.signature';

async function authenticate(ui, roles, permissions, currentAccess = {roles, permissions}) {
  const token = jwt(roles, permissions);
  const loggingIn = ui.run('login("/ms/v1/identity/login", {})');
  ui.requests.at(-1).complete(200, {accessToken: token, user: {displayName: 'Account', role: 'LEARNER'}});
  await new Promise(setImmediate);
  assert.equal(ui.requests.at(-1).path, '/ms/v1/identity/rbac/me');
  ui.requests.at(-1).complete(200, currentAccess);
  await loggingIn;
  return token;
}

test('dashboard regions independently show loading, results, empty state, or server error', async () => {
  const ui = frontend();
  const loading = ui.run('loadHome()');
  assert.match(ui.node('home-catalog-status').textContent, /Đang tải danh mục/);
  assert.match(ui.node('home-history-status').textContent, /Đang tải/);
  assert.equal(ui.node('home-catalog-status').classList.contains('region-loading'), true);
  ui.requests[0].complete(200, [{id: 'quiz', title: 'TOEIC Test', part: 5, premium: false, count: 1}]);
  ui.requests[1].complete(200, []);
  ui.requests[2].complete(503);
  await loading;
  assert.equal(ui.node('stat-quizzes').textContent, 1);
  assert.match(ui.node('home-quizzes').innerHTML, /TOEIC Test/);
  assert.match(ui.node('home-quizzes').innerHTML, /PART 5 · FREE/);
  assert.equal(ui.node('home-catalog-status').textContent, '');
  assert.equal(ui.node('home-catalog-status').classList.contains('region-loading'), false);
  assert.equal(ui.node('stat-attempts').textContent, 0);
  assert.match(ui.node('home-history-status').textContent, /chưa có lượt luyện tập/);
  assert.equal(ui.node('home-history-status').classList.contains('region-empty'), true);
  assert.equal(ui.node('home-history-detail').textContent, '');
  assert.match(ui.node('home-membership-status').textContent, /Máy chủ/);
  assert.equal(ui.node('home-membership-status').classList.contains('region-error'), true);
  assert.equal(ui.node('home-membership-detail').textContent, '');

  const refresh = ui.run('loadHome()');
  ui.requests[3].complete(502);
  ui.requests[4].complete(200, [
    {id: 'first', status: 'GRADED', correct: 4, total: 8},
    {id: 'second', status: 'IN_PROGRESS', correct: null, total: 8},
    {id: 'third', status: 'GRADED', correct: 7, total: 8}
  ]);
  ui.requests[5].complete(200, {planCode: 'FREE', maxPracticePerDay: 10});
  await refresh;
  assert.match(ui.node('home-catalog-status').textContent, /dữ liệu tải gần nhất/);
  assert.match(ui.node('home-quizzes').innerHTML, /TOEIC Test/);
  assert.equal(ui.node('stat-attempts').textContent, 3);
  assert.equal(ui.node('home-history-detail').textContent, '2 đã chấm · 1 đang làm');
  assert.equal(ui.node('stat-plan').textContent, 'FREE');
  assert.equal(ui.node('stat-plan').classList.contains('plan-free'), true);
  assert.equal(ui.node('home-membership-detail').textContent, 'Giới hạn 10 lượt/ngày');
});

test('dashboard refresh updates entitlement and empties the catalog when the API has no quizzes', async () => {
  const ui = frontend();
  let loading = ui.run('loadHome()');
  ui.requests[0].complete(200, [{id: 'quiz', title: 'Premium TOEIC', part: 6, premium: true, count: 4}]);
  ui.requests[1].complete(200, []);
  ui.requests[2].complete(200, {planCode: 'FREE', maxPracticePerDay: 10});
  await loading;
  assert.match(ui.node('home-quizzes').innerHTML, /PART 6 · PRO/);

  loading = ui.node('refresh-home').onclick();
  ui.requests[3].complete(200, []);
  ui.requests[4].complete(503);
  ui.requests[5].complete(200, {planCode: 'PRO', maxPracticePerDay: 750});
  await loading;
  assert.equal(ui.node('stat-quizzes').textContent, 0);
  assert.equal(ui.node('home-catalog-status').classList.contains('region-empty'), true);
  assert.equal(ui.node('home-quizzes').innerHTML, '');
  assert.match(ui.node('home-history-status').textContent, /dữ liệu tải gần nhất/);
  assert.equal(ui.node('stat-plan').textContent, 'PRO');
  assert.equal(ui.node('stat-plan').classList.contains('plan-pro'), true);
  assert.equal(ui.node('stat-plan').classList.contains('plan-free'), false);
  assert.equal(ui.node('home-membership-detail').textContent, 'Giới hạn 750 lượt/ngày');
});

test('learner dashboard CTA opens Practice and updates focus and current navigation', async () => {
  const ui = frontend();
  setLearner(ui);
  const opening = ui.node('jump-practice').onclick();
  assert.equal(ui.focused(), ui.node('page-title'));
  assert.equal(ui.node('dashboard-view').classList.contains('hidden'), true);
  assert.equal(ui.node('practice-view').classList.contains('hidden'), false);
  assert.equal(ui.nav.find(button => button.dataset.tab === 'practice').getAttribute('aria-current'), 'page');
  assert.deepEqual(ui.requests.map(request => request.path), ['/ms/v1/contents/quizzes', '/api/v1/memberships/me']);
  ui.requests[0].complete(200, []);
  ui.requests[1].complete(200, {planCode: 'FREE', maxPracticePerDay: 10});
  await opening;
});

test('latest practice refresh wins and an active navigation item moves focus to the heading', async () => {
  const ui = frontend();
  setLearner(ui);
  const first = ui.run('navigate("practice")');
  const history = ui.run('loadHistory()');
  const second = ui.run('loadPractice()');
  assert.equal(ui.focused(), ui.node('page-title'));
  assert.equal(ui.nav.filter(button => button.getAttribute('aria-current') === 'page').length, 1);
  assert.equal(ui.nav.find(button => button.dataset.tab === 'practice').getAttribute('aria-current'), 'page');
  ui.requests[4].complete(200, []);
  ui.requests[5].complete(200, {planCode: 'FREE', maxPracticePerDay: 10});
  ui.requests[2].complete(200, [{id: 'attempt', quizId: 'quiz', status: 'IN_PROGRESS', total: 1, createdAt: '2026-11-23T00:00:00Z'}]);
  ui.requests[3].complete(200, [{id: 'quiz', title: 'Grammar Basics'}]);
  await history;
  await second;
  ui.requests[0].complete(503);
  ui.requests[1].complete(503);
  await first;
  assert.match(ui.node('practice-catalog-status').textContent, /Chưa có đề/);
  assert.match(ui.node('attempt-list').innerHTML, /Đang làm/);
  assert.match(ui.node('attempt-list').innerHTML, /Grammar Basics/);
  assert.doesNotMatch(ui.node('attempt-list').innerHTML, /IN_PROGRESS|2026-11-23T/);
});

test('activity still loads when review catalog fails, and review failure is local', async () => {
  const ui = frontend();
  const loading = ui.run('loadInteraction()');
  ui.requests[0].complete(503);
  ui.requests[1].complete(200, [{kind: 'ATTEMPT_GRADED', attemptId: 'attempt'}]);
  await loading;
  assert.match(ui.node('review-catalog-status').textContent, /Máy chủ/);
  assert.match(ui.node('activity-list').innerHTML, /Đã chấm bài luyện tập/);
  ui.node('review-quiz').value = 'quiz';
  const reviews = ui.run('loadReviews()');
  ui.requests[2].complete(503);
  await reviews;
  assert.match(ui.node('reviews-status').textContent, /Máy chủ/);
  assert.match(ui.node('activity-list').innerHTML, /Đã chấm bài luyện tập/);
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

const visibleNav = ui => ui.nav.filter(button => !button.classList.contains('hidden')).map(button => button.dataset.tab);

for (const [name, roles, permissions, path, pages] of [
  ['Learner only', ['LEARNER'], learnerPermissions, '#/learner/dashboard', ['dashboard', 'practice', 'results', 'membership']],
  ['Teacher only', ['TEACHER'], ['content:write', ...learnerPermissions], '#/teacher/teacher-home', ['teacher-home', 'teacher', 'practice']],
  ['Teacher without practice permission', ['TEACHER'], ['content:write'], '#/teacher/teacher-home', ['teacher-home', 'teacher']],
  ['Admin only', ['ADMIN'], ['rbac:manage', 'content:write'], '#/admin/admin-home', ['admin-home', 'admin']],
  ['multiple roles', ['LEARNER', 'TEACHER', 'ADMIN'], ['rbac:manage', 'content:write', ...learnerPermissions],
    '#/admin/admin-home', ['admin-home', 'admin']]
]) {
  test(name + ' lands in the appropriate workspace with its own navigation', async () => {
    const ui = frontend();
    const token = await authenticate(ui, roles, permissions);
    assert.equal(ui.storage.get('toeic.jwt'), token);
    assert.equal(ui.location.hash, path);
    assert.deepEqual(visibleNav(ui), pages);
    assert.equal(ui.nav.filter(button => button.getAttribute('aria-current') === 'page').length, 1);
    assert.equal(ui.node('flash').textContent, '');
    assert.doesNotMatch(ui.node('identity-state').textContent, /LEARNER|TEACHER|ADMIN/);
  });
}

test('direct forbidden routes fall back safely, while allowed deep links and workspace switching work', async () => {
  const ui = frontend('#/admin/admin');
  await authenticate(ui, ['LEARNER'], learnerPermissions);
  assert.equal(ui.location.hash, '#/learner/dashboard');
  assert.match(ui.node('route-status').textContent, /không có quyền/);
  assert.equal(ui.node('admin-view').classList.contains('hidden'), true);
  const results = ui.openHash('#/learner/results');
  ui.requests.at(-2).complete(200, []);
  ui.requests.at(-1).complete(200, []);
  await results;
  assert.equal(ui.node('page-title').textContent, 'Kết quả của tôi');
  assert.equal(ui.node('route-status').textContent, '');
  let prevented = false;
  ui.node('skip-main').onclick({preventDefault() { prevented = true; }});
  assert.equal(prevented, true);
  assert.equal(ui.location.hash, '#/learner/results');
  assert.equal(ui.focused(), ui.node('page-title'));

  const admin = frontend('#/admin/admin');
  await authenticate(admin, ['ADMIN', 'TEACHER'], ['rbac:manage', 'content:write']);
  assert.equal(admin.node('page-title').textContent, 'Phân quyền');
  admin.node('workspace-picker').onchange({target: {value: 'teacher'}});
  assert.equal(admin.location.hash, '#/teacher/teacher-home');
  assert.deepEqual(visibleNav(admin), ['teacher-home', 'teacher', 'practice']);
});

test('library filters API data, distinguishes a locked PRO quiz, and dashboard limits suggestions', async () => {
  const ui = frontend();
  setLearner(ui);
  const quizzes = [
    {id: 'free', title: 'Grammar Basics', part: 5, premium: false, count: 3},
    {id: 'pro', title: 'Reading Practice', part: 6, premium: true, count: 2},
    {id: 'other', title: 'Grammar Review', part: 5, premium: false, count: 4},
    {id: 'fourth', title: 'Another Quiz', part: 5, premium: false, count: 1}
  ];
  const library = ui.run('loadPractice()');
  ui.requests[0].complete(200, quizzes);
  ui.requests[1].complete(200, {planCode: 'FREE', maxPracticePerDay: 10});
  await library;
  assert.match(ui.node('practice-catalog').innerHTML, /Cần gói PRO/);
  ui.node('quiz-search').value = 'grammar';
  ui.node('quiz-part').value = '5';
  ui.node('quiz-plan').value = 'FREE';
  ui.node('quiz-search').oninput();
  assert.match(ui.node('library-count').textContent, /2 \/ 4/);
  assert.doesNotMatch(ui.node('practice-catalog').innerHTML, /Reading Practice/);
  ui.node('quiz-plan').value = 'PRO';
  ui.node('quiz-plan').onchange();
  assert.match(ui.node('library-count').textContent, /Không tìm thấy/);

  const dashboard = ui.run('loadHome()');
  ui.requests[2].complete(200, quizzes);
  ui.requests[3].complete(200, [{id: 'attempt', quizId: 'free', status: 'IN_PROGRESS'}]);
  ui.requests[4].complete(200, {planCode: 'FREE', maxPracticePerDay: 10});
  await dashboard;
  assert.equal(ui.node('stat-quizzes').textContent, 4);
  assert.doesNotMatch(ui.node('home-quizzes').innerHTML, /Another Quiz/);
  assert.match(ui.node('home-resume').innerHTML, /Grammar Basics/);
});

test('leaving an exam with failed writes keeps the user on the same route when they cancel', () => {
  const ui = frontend('#/learner/attempt/attempt');
  setLearner(ui);
  ui.run(`state.page = 'attempt'; state.routeId = 'attempt'; state.routePath = '#/learner/attempt/attempt';
    state.active = {id: 'attempt'}; attemptEdits.set('attempt', {answers: new Map([['q', {failed: true}]])})`);
  ui.openHash('#/learner/practice');
  assert.equal(ui.location.hash, '#/learner/attempt/attempt');
  assert.equal(ui.requests.length, 0);
});

test('logout resets workspace and account state; role grants take effect after a new JWT', async () => {
  const ui = frontend();
  const promoted = ['LEARNER', 'TEACHER'];
  const permissions = [...learnerPermissions, 'content:write'];
  await authenticate(ui, ['LEARNER'], learnerPermissions, {roles: promoted, permissions});
  assert.equal(ui.node('workspace-switch').classList.contains('hidden'), true);
  ui.openHash('#/teacher/teacher');
  assert.equal(ui.location.hash, '#/learner/dashboard');
  ui.node('logout').onclick();
  assert.equal(ui.location.hash, '');
  assert.equal(ui.storage.has('toeic.jwt'), false);
  assert.equal(ui.node('primary-nav').classList.contains('hidden'), true);
  assert.equal(ui.focused(), ui.node('login-email'));

  await authenticate(ui, promoted, permissions);
  assert.equal(ui.location.hash, '#/teacher/teacher-home');
  assert.equal(ui.node('workspace-switch').classList.contains('hidden'), false);
  ui.node('logout').onclick();
  await authenticate(ui, ['LEARNER'], learnerPermissions);
  assert.equal(ui.location.hash, '#/learner/dashboard');
  assert.equal(ui.node('teacher-view').classList.contains('hidden'), true);
});

const mine = '/ms/v1/contents/quizzes/mine';
const owned = {id: 'quiz', title: 'Đề kiểm thử', part: 5, premium: false, count: 1, version: 0, status: 'DRAFT'};
const question = {prompt: 'Question?', a: 'First', b: 'Second', c: 'Third', d: 'Fourth', answer: 'B', explanation: 'Reason.'};
const nextTurn = () => new Promise(setImmediate);

async function signInTeacher(ui) {
  await authenticate(ui, ['TEACHER'], ['content:write', ...learnerPermissions]);
  assert.equal(ui.requests.at(-1).path, mine);
}

function typeEditor(ui, id, value) {
  const input = ui.node('editor-' + id);
  input.value = value;
  if (Object.hasOwn(question, id)) input.dataset.field = id;
  ui.node('teacher-form').oninput({target: input});
}

test('Content V2 HTTP errors stay unverified and a direct create route returns to the safe workspace', async () => {
  const ui = frontend('#/teacher/teacher');
  await signInTeacher(ui);
  assert.equal(ui.node('teacher-form').onsubmit, undefined);
  ui.requests.at(-1).complete(400, {});
  await nextTurn();
  assert.equal(ui.location.hash, '#/teacher/teacher-home');
  assert.equal(ui.node('teacher-view').classList.contains('hidden'), true);
  assert.equal(ui.node('teacher-create').disabled, true);
  assert.match(ui.node('teacher-access-status').textContent, /Chưa xác minh/);
  const direct = ui.openHash('#/teacher/teacher');
  ui.requests.at(-1).complete(404, {});
  await direct;
  assert.equal(ui.location.hash, '#/teacher/teacher-home');
  assert.match(ui.node('teacher-access-status').textContent, /Chưa xác minh/);
  assert.ok(ui.requests.every(request => !request.path.endsWith('/drafts')));
});

test('a successful legacy-shaped catalog response is unsupported, and an empty V3 owner list is valid', async () => {
  const ui = frontend();
  await signInTeacher(ui);
  const {version, status, ...legacy} = owned;
  ui.requests.at(-1).complete(200, [legacy]);
  await nextTurn();
  assert.equal(ui.node('teacher-create').disabled, true);
  assert.match(ui.node('teacher-access-status').textContent, /Phản hồi.*chưa hỗ trợ/);
  const refresh = ui.node('teacher-list-refresh').onclick();
  ui.requests.at(-1).complete(200, []);
  await refresh;
  assert.equal(ui.node('teacher-create').disabled, false);
  assert.match(ui.node('teacher-list-status').textContent, /chưa có đề/);
});

for (const [scenario, reply, message] of [
  ['expired JWT', request => request.complete(401, {}), /Phiên đăng nhập đã hết hạn/],
  ['forbidden Teacher', request => request.complete(403, {}), /không có quyền/],
  ['network failure', request => request.fail(), /Không thể kết nối/],
  ['service unavailable', request => request.complete(503, {}), /Không thể kết nối/],
  ['timeout', request => request.expire(), /quá thời gian chờ/]
]) {
  test(scenario + ' is distinct from unsupported and cannot open the editor', async () => {
    const ui = frontend();
    await signInTeacher(ui);
    const check = ui.requests.at(-1);
    assert.equal(check.options.cache, 'no-store');
    assert.equal(check.options.signal.milliseconds, 5000);
    reply(check);
    await nextTurn();
    assert.match(ui.node('teacher-access-status').textContent, message);
    assert.doesNotMatch(ui.node('teacher-access-status').textContent, /chưa hỗ trợ/);
    assert.equal(ui.node('teacher-create').disabled, true);
    assert.equal(ui.node('teacher-form').onsubmit, undefined);
  });
}

test('a Teacher without content:write cannot probe or enter the authoring route', async () => {
  const ui = frontend('#/teacher/teacher');
  await authenticate(ui, ['TEACHER', 'LEARNER'], learnerPermissions);
  assert.equal(ui.location.hash, '#/learner/dashboard');
  assert.match(ui.node('route-status').textContent, /không có quyền/);
  assert.ok(ui.requests.every(request => request.path !== mine));
});

test('verified V3 opens a saved draft, preserves version on update, and refreshes the list after publish', async () => {
  const ui = frontend();
  await signInTeacher(ui);
  ui.requests.at(-1).complete(200, [owned]);
  await nextTurn();
  assert.match(ui.node('teacher-quiz-list').innerHTML, /Đề kiểm thử/);

  const opening = ui.openHash('#/teacher/teacher/quiz');
  ui.requests.at(-1).complete(200, [owned]);
  await nextTurn();
  assert.equal(ui.requests.at(-1).path, '/ms/v1/contents/quizzes/quiz/draft');
  ui.requests.at(-1).complete(200, {quiz: owned, questions: [question]});
  await opening;
  typeEditor(ui, 'title', 'Tên đã sửa');
  const saving = ui.node('editor-save').onclick();
  assert.equal(ui.requests.at(-1).path, mine);
  ui.requests.at(-1).complete(200, [owned]);
  await nextTurn();
  const update = ui.requests.at(-1);
  assert.equal(update.options.method, 'PUT');
  assert.equal(JSON.parse(update.options.body).version, 0);
  const updated = {...owned, title: 'Tên đã sửa', version: 1};
  update.complete(200, {quiz: updated, questions: [question]});
  await saving;
  ui.node('teacher-form').onsubmit({preventDefault() {}});
  const publishing = ui.node('editor-publish').onclick();
  assert.equal(ui.requests.at(-1).path, mine);
  ui.requests.at(-1).complete(200, [updated]);
  await nextTurn();
  const publish = ui.requests.at(-1);
  assert.match(publish.path, /\/publish$/);
  assert.deepEqual(JSON.parse(publish.options.body), {version: 1});
  const published = {...updated, status: 'PUBLISHED', version: 2};
  publish.complete(200, published);
  await publishing;
  ui.requests.at(-1).complete(200, [published]);
  await nextTurn();
  assert.equal(ui.location.hash, '#/teacher/teacher-home');
  assert.match(ui.node('teacher-quiz-list').innerHTML, /Đã xuất bản/);
});

test('losing V3 during editing blocks the write, retains the draft and allows retry after a positive check', async () => {
  const ui = frontend();
  await signInTeacher(ui);
  ui.requests.at(-1).complete(200, []);
  await nextTurn();
  const opening = ui.node('teacher-create').onclick();
  ui.requests.at(-1).complete(200, []);
  await opening;
  typeEditor(ui, 'title', 'Bản soạn cục bộ');
  typeEditor(ui, 'prompt', 'Local question');
  let saving = ui.node('editor-save').onclick();
  assert.equal(ui.requests.at(-1).path, mine);
  ui.requests.at(-1).fail();
  await saving;
  assert.match(ui.node('teacher-status').textContent, /Chưa gửi yêu cầu/);
  assert.equal(ui.node('editor-save').disabled, true);
  assert.equal(ui.node('editor-publish').disabled, true);
  assert.equal(ui.node('teacher-fields').disabled, false);
  assert.equal(ui.node('editor-title').value, 'Bản soạn cục bộ');
  assert.equal(ui.node('editor-prompt').value, 'Local question');
  assert.ok(ui.requests.every(request => request.options.method !== 'POST' || request.path.endsWith('/login')));

  const recovery = ui.node('editor-access-retry').onclick();
  ui.requests.at(-1).complete(200, []);
  await recovery;
  assert.equal(ui.node('editor-save').disabled, false);
  saving = ui.node('editor-save').onclick();
  ui.requests.at(-1).complete(200, []);
  await nextTurn();
  const write = ui.requests.at(-1);
  assert.match(write.path, /\/drafts$/);
  const body = JSON.parse(write.options.body);
  assert.equal(body.title, 'Bản soạn cục bộ');
  assert.equal(body.questions[0].prompt, 'Local question');
  write.fail();
  await saving;
  assert.equal(ui.node('editor-save').disabled, true);
  assert.match(ui.node('editor-access-status').textContent, /vẫn được giữ/);
  assert.match(ui.node('teacher-status').textContent, /Chưa xác nhận được kết quả/);
  assert.equal(ui.node('editor-title').value, 'Bản soạn cục bộ');
});

test('going offline invalidates an in-flight capability response', async () => {
  const ui = frontend('#/teacher/teacher/quiz');
  await signInTeacher(ui);
  const stale = ui.requests.at(-1);
  ui.offline();
  stale.complete(200, [owned]);
  await nextTurn();
  assert.equal(ui.location.hash, '#/teacher/teacher-home');
  assert.equal(ui.node('teacher-create').disabled, true);
  assert.match(ui.node('teacher-access-status').textContent, /Không thể kết nối/);
  assert.ok(ui.requests.every(request => !request.path.endsWith('/quiz/draft')));
});
