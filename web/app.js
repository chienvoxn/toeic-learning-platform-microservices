"use strict";
const $=id=>document.getElementById(id);
const state={token:sessionStorage.getItem('toeic.jwt')||'',user:null,permissions:[],roles:[],active:null,workspace:null,
  page:null,routeId:null,routePath:'',plan:null,library:null,recent:null,opening:null};
const attemptEdits = new Map();
const quizzesById = new Map();
const questionOrderByQuiz = new Map();
const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const regionRequests = new Map();
let authPending = false;
let flashTimer;
let teacherEditor;
let teacherProbe;
let navigationRequest = 0;
const ownedQuizzesPath = '/ms/v1/contents/quizzes/mine';
const teacherMessages = {
  checking: 'Đang kiểm tra tính năng quản lý bản nháp…',
  unverified: 'Chưa xác minh được máy chủ hỗ trợ bản nháp. Việc tạo, lưu và xuất bản đang tạm khóa.',
  unsupported: 'Phản hồi của máy chủ chưa hỗ trợ quản lý bản nháp. Việc tạo, lưu và xuất bản đang tạm khóa.',
  unauthenticated: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Bạn cần đăng nhập lại để quản lý bản nháp.',
  unauthorized: 'Tài khoản này không có quyền quản lý bản nháp.',
  unavailable: 'Không thể kết nối với dịch vụ nội dung. Hãy thử kiểm tra lại.',
  timeout: 'Dịch vụ nội dung phản hồi quá thời gian chờ. Hãy thử kiểm tra lại.'
};
let teacherAccess = 'unverified';

function alertMsg(message, brief = false) {
  clearTimeout(flashTimer);
  $('flash').textContent = message;
  $('toast').classList.toggle('toast-empty', !message);
  $('dismiss-toast').classList.toggle('hidden', !message);
  if (message && brief) flashTimer = setTimeout(() => {
    if (document.activeElement !== $('dismiss-toast')) alertMsg('');
  }, 4500);
}

const roleLabels = {LEARNER: 'Học viên', TEACHER: 'Giáo viên', ADMIN: 'Quản trị viên'};
const adminUserPages = {admin: 'ALL', 'admin-learners': 'LEARNER', 'admin-teachers': 'TEACHER'};
const workspaces = {
  admin: {label: 'Quản trị', role: 'ADMIN', pages: ['admin-home', ...Object.keys(adminUserPages), 'admin-quizzes', 'profile']},
  teacher: {label: 'Giáo viên', role: 'TEACHER', pages: ['teacher-home', 'teacher', 'practice', 'profile']},
  learner: {label: 'Học viên', role: 'LEARNER', pages: ['dashboard', 'practice', 'results', 'membership', 'profile']}
};
const pageTitles = {dashboard: 'Tổng quan học tập', practice: 'Luyện thi TOEIC', results: 'Kết quả của tôi',
  membership: 'Gói thành viên', profile: 'Hồ sơ cá nhân', interaction: 'Đánh giá đề', 'teacher-home': 'Không gian giáo viên',
  teacher: 'Tạo đề', 'admin-home': 'Tổng quan quản trị', admin: 'Quản lý người dùng',
  'admin-learners': 'Quản lý học viên', 'admin-teachers': 'Quản lý giáo viên', 'admin-quizzes': 'Quản lý đề thi', quiz: 'Chi tiết đề',
  attempt: 'Phòng luyện thi', result: 'Kết quả lượt làm'};
const can = permission => state.permissions.includes(permission) || state.roles.includes('ADMIN');
const practicePages = ['quiz', 'attempt', 'result'];

function workspaceOptions() {
  return [
    ...(can('rbac:manage') && state.roles.includes('ADMIN') ? ['admin'] : []),
    ...(can('content:write') ? ['teacher'] : []),
    ...(state.roles.includes('LEARNER') || can('assessment:submit') ? ['learner'] : [])
  ];
}

function visiblePages(workspace) {
  return workspaces[workspace].pages.filter(page => {
    if (['practice', 'results'].includes(page)) return can('assessment:submit');
    if (page === 'membership') return can('membership:read');
    return true;
  });
}

function apiError(status, authenticated) {
  let message = 'Không thể xử lý yêu cầu. Vui lòng thử lại.';
  if (status === 0) message = 'Không thể kết nối. Kiểm tra kết nối rồi thử lại.';
  if (status === 401) message = authenticated
    ? 'Phiên đăng nhập đã hết hạn hoặc không còn hợp lệ. Vui lòng đăng nhập lại.'
    : 'Email hoặc mật khẩu không đúng.';
  if (status === 403) message = 'Bạn không có quyền thực hiện thao tác này.';
  if (status === 404) message = 'Không tìm thấy dữ liệu yêu cầu.';
  if (status === 408 || status === 504) message = 'Dịch vụ phản hồi quá thời gian chờ.';
  if (status === 409) message = 'Yêu cầu xung đột với dữ liệu hiện tại.';
  if (status === 429) message = 'Bạn đã hết lượt luyện tập hôm nay.';
  if (status >= 500 && status !== 504) message = 'Máy chủ đang gặp lỗi. Vui lòng thử lại.';
  return Object.assign(new Error(message), {status});
}

async function api(path, {expectedStatus, ...options} = {}, token = state.token) {
  const headers = {'Content-Type': 'application/json', ...(token ? {Authorization: 'Bearer ' + token} : {}), ...options.headers};
  let response;
  try {
    response = await fetch(path, {...options, headers});
  } catch {
    throw apiError(options.signal?.reason?.name === 'TimeoutError' ? 408 : 0);
  }
  if (!response.ok || (expectedStatus && response.status !== expectedStatus)) {
    throw apiError(response.status, Boolean(token));
  }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('json')) return null;
  try {
    return await response.json();
  } catch (error) {
    if (options.signal?.reason?.name === 'TimeoutError') throw apiError(408);
    throw error;
  }
}

function hasUnsavedAnswers() {
  const edits = attemptEdits.get(state.active?.id);
  return state.page === 'attempt' && state.routeId === state.active?.id && edits && (edits.submitting ||
    [...edits.answers.values()].some(answer => answer.pending || answer.failed));
}

function confirmExit(discardEditor = false) {
  if (hasUnsavedAnswers() && !globalThis.confirm('Bài đang lưu đáp án hoặc chờ chấm. Nếu rời trang, hãy mở lại lượt làm để kiểm tra trạng thái. Bạn có muốn rời phòng?')) return false;
  if (!teacherEditor || (state.page !== 'teacher' && !discardEditor)) return true;
  if (teacherEditor.isSaving()) {
    alertMsg('Đang lưu đề. Hãy đợi kết quả trước khi rời trang.');
    return false;
  }
  if (!teacherEditor.hasChanges()) return true;
  return globalThis.confirm(discardEditor
    ? 'Đề chưa xuất bản sẽ bị bỏ khi đăng xuất. Bạn có muốn đăng xuất?'
    : 'Đề chưa xuất bản chỉ được giữ trong tab này. Bạn có muốn rời trình soạn?');
}

function navigate(tab, workspace = state.workspace, replace = false, id = '', attempt = null, teacherResult) {
  if (!state.user) return;
  const request = ++navigationRequest;
  const options = workspaceOptions();
  const pages = options.includes(workspace) ? visiblePages(workspace) : [];
  const reviewAllowed = pages.includes('practice') && can('interaction:write');
  const practiceAllowed = pages.includes('practice') && practicePages.includes(tab) && Boolean(id);
  const denied = !pages.includes(tab) && !practiceAllowed && !(tab === 'interaction' && reviewAllowed);
  if (denied) {
    workspace = options.find(option => state.roles.includes(workspaces[option].role)) ?? options[0];
    tab = visiblePages(workspace)[0];
    id = '';
  }
  if (tab === 'teacher' && !teacherResult) {
    const token = state.token;
    if (!state.page) regionStatus('route-status', teacherMessages.checking);
    return checkTeacherAccess().then(result => {
      if (request !== navigationRequest || state.token !== token) return;
      const access = result || {phase: teacherAccess};
      const existing = teacherEditor?.isOpen(id) && teacherEditor.hasChanges();
      if (access.phase !== 'ready' && !existing) {
        return navigate('teacher-home', workspace, replace, '', null, access);
      }
      return navigate(tab, workspace, replace, id, null, access);
    });
  }
  const path = '#/' + workspace + '/' + tab + (id ? '/' + id : '');
  const replacesEditor = tab === 'teacher' && teacherEditor?.hasChanges() &&
    !teacherEditor.isSaving() && !teacherEditor.isOpen(id);
  const allowed = replacesEditor
    ? globalThis.confirm('Mở đề khác sẽ bỏ phần chưa lưu trong trình soạn. Bạn có muốn tiếp tục?')
    : attempt || state.routePath === path || confirmExit();
  if (!allowed) {
    if (location.hash !== state.routePath) history.pushState(null, '', state.routePath);
    $('workspace-picker').value = state.workspace;
    return;
  }
  if (state.routePath !== path && $('submit-dialog')?.open) $('submit-dialog').close();
  if (state.routePath !== path) closeAdminDialogs();
  if (state.page === 'teacher' && tab !== 'teacher') teacherEditor?.dismissDialogs();
  if (location.hash !== path) history[replace || denied ? 'replaceState' : 'pushState'](null, '', path);
  state.workspace = workspace;
  state.page = tab;
  state.routeId = id;
  state.routePath = path;
  $('workspace-picker').value = workspace;
  alertMsg('');
  regionStatus('route-status', denied ? 'Bạn không có quyền mở trang này.' : '', denied);
  const currentPage = practicePages.includes(tab) ? 'practice'
    : tab === 'interaction' ? (workspace === 'learner' ? 'results' : 'practice') : tab;
  const navPages = visiblePages(workspace);
  document.querySelectorAll('.nav').forEach(button => {
    const visible = navPages.includes(button.dataset.tab);
    const current = visible && button.dataset.tab === currentPage;
    button.classList.toggle('hidden', !visible);
    if (button.dataset.tab === 'teacher') button.disabled = teacherAccess !== 'ready';
    if (current) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  for (const id of ['practice-review', 'results-review']) $(id).classList.toggle('hidden', !reviewAllowed);
  $('jump-practice').classList.toggle('hidden', !can('assessment:submit'));
  $('app-shell').classList.toggle('exam-mode', tab === 'attempt');
  $('attempt-loading').classList.add('hidden');
  const viewId = Object.hasOwn(adminUserPages, tab) ? 'admin-view' : tab + '-view';
  document.querySelectorAll('.view').forEach(view => view.classList.toggle('hidden', view.id !== viewId));
  const title = $('page-title');
  title.textContent = pageTitles[tab];
  (tab === 'attempt' ? $('exit-attempt') : title).focus();
  if (tab === 'dashboard') return loadHome();
  if (tab === 'practice') return loadPractice();
  if (tab === 'quiz') return loadQuiz(id);
  if (tab === 'attempt' || tab === 'result') {
    if (attempt) showAttempt(attempt);
    else return loadAttempt(id);
  }
  if (tab === 'results') return loadHistory();
  if (tab === 'membership') return loadMembership();
  if (tab === 'profile') return loadProfile();
  if (tab === 'interaction') return loadInteraction();
  if (tab === 'admin-home') return loadAdminOverview();
  if (Object.hasOwn(adminUserPages, tab)) return openAdminUsers(tab);
  if (tab === 'admin-quizzes') return openAdminQuizzes();
  if (tab === 'teacher-home') return teacherResult ? renderTeacherQuizzes(teacherResult) : loadTeacherQuizzes();
  if (tab === 'teacher' && !teacherEditor) {
    teacherEditor = QuizAuthoring.createEditor({
      byId: $, escape: html, confirm: message => globalThis.confirm(message), status: regionStatus,
      load: id => teacherRequest('/ms/v1/contents/quizzes/' + id + '/draft'),
      save: (draft, body) => {
        const path = '/ms/v1/contents/quizzes/';
        return draft ? teacherWrite(path + draft.id + '/draft', {
          method: 'PUT', body: JSON.stringify({version: draft.version, quiz: JSON.parse(body)})
        }) : teacherWrite(path + 'drafts', {method: 'POST', body});
      },
      publish: draft => teacherWrite('/ms/v1/contents/quizzes/' + draft.id + '/publish', {
        method: 'POST', body: JSON.stringify({version: draft.version})
      }),
      onSaved: quiz => {
        state.routeId = quiz.id;
        state.routePath = '#/teacher/teacher/' + quiz.id;
        history.replaceState(null, '', state.routePath);
      },
      onPublished: quiz => {
        navigate('teacher-home', 'teacher');
        alertMsg('Đã xuất bản đề “' + quiz.title + '”.', true);
      }
    });
  }
  if (tab === 'teacher') {
    teacherEditor.setWriteEnabled(teacherAccess === 'ready');
    return teacherEditor.open(id);
  }
}

function routeFromHash() {
  if (!state.user) return;
  const options = workspaceOptions();
  const workspace = options.find(option => state.roles.includes(workspaces[option].role)) ?? options[0];
  if (!location.hash) return navigate(visiblePages(workspace)[0], workspace, true);
  const match = /^#\/([a-z]+)\/([a-z-]+)(?:\/([a-z0-9-]+))?$/i.exec(location.hash);
  const id = practicePages.includes(match?.[2]) || match?.[2] === 'teacher' ? match?.[3] : '';
  return navigate(match?.[3] && !id ? undefined : match?.[2], match?.[1] ?? '', true, id);
}

function authUi() {
  const logged = Boolean(state.user);
  $('auth-panel').classList.toggle('hidden', logged);
  $('app-panel').classList.toggle('hidden', !logged);
  $('primary-nav').classList.toggle('hidden', !logged);
  $('logout').classList.toggle('hidden', !logged);
  const roles = Object.keys(roleLabels).filter(role => state.roles.includes(role)).map(role => roleLabels[role]);
  $('identity-state').textContent = logged ? [state.user.displayName, ...roles].join(' · ') : 'Chưa đăng nhập';
  const options = logged ? workspaceOptions() : [];
  $('workspace-picker').innerHTML = options.map(key => `<option value="${key}">${workspaces[key].label}</option>`).join('');
  if (state.workspace) $('workspace-picker').value = state.workspace;
  $('workspace-switch').classList.toggle('hidden', options.length < 2);
}

async function enterSession(token, user) {
  const access = await api('/ms/v1/identity/rbac/me', {}, token);
  // Identity validated the token. Its claims cap UI access until the next sign-in.
  const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const claims = JSON.parse(atob(payload));
  state.roles = (access.roles || []).filter(role => claims.roles.includes(role));
  state.permissions = (access.permissions || []).filter(permission => claims.permissions.includes(permission));
  if (!workspaceOptions().length) throw apiError(403, true);
  state.token = token;
  state.user = user;
  sessionStorage.setItem('toeic.jwt', token);
  $('restore-session').classList.add('hidden');
  $('welcome').textContent = 'Xin chào, ' + user.displayName;
  authUi();
  routeFromHash();
}

async function authenticate(action) {
  if (authPending) return;
  authPending = true;
  const buttons = ['login-submit', 'register-submit', 'restore-session'].map($);
  buttons.forEach(button => { button.disabled = true; });
  alertMsg('Đang xác thực…');
  try {
    await action();
    alertMsg('');
  } catch (error) {
    alertMsg(error.message);
  } finally {
    authPending = false;
    buttons.forEach(button => { button.disabled = false; });
  }
}

function login(path, payload) {
  return authenticate(async () => {
    const session = await api(path, {method: 'POST', body: JSON.stringify(payload)}, '');
    await enterSession(session.accessToken, session.user);
  });
}

function restoreSession() {
  if (!state.token) return;
  return authenticate(async () => {
    try {
      const user = await api('/ms/v1/identity/me');
      await enterSession(state.token, user);
    } catch (error) {
      if (error.status === 401) {
        state.token = '';
        sessionStorage.removeItem('toeic.jwt');
      }
      $('restore-session').classList.toggle('hidden', !state.token);
      throw error;
    }
  });
}

$('login-form').onsubmit = event => {
  event.preventDefault();
  return login('/ms/v1/identity/login', {email: $('login-email').value, password: $('login-password').value});
};
$('register-form').onsubmit = event => {
  event.preventDefault();
  return login('/ms/v1/identity/register', {
    displayName: $('register-name').value, email: $('register-email').value, password: $('register-password').value
  });
};
$('restore-session').onclick = restoreSession;

function showAuthForm(name) {
  for (const form of ['login', 'register']) {
    const current = name === form;
    $('show-' + form).classList.toggle('active', current);
    $('show-' + form).setAttribute('aria-pressed', String(current));
    $(form + '-form').classList.toggle('hidden', !current);
  }
  $(name === 'login' ? 'login-email' : 'register-name').focus();
}
$('show-login').onclick = () => showAuthForm('login');
$('show-register').onclick = () => showAuthForm('register');
$('logout').onclick = () => {
  if (!confirmExit(true)) return;
  state.token = '';
  state.user = null;
  state.roles = [];
  state.permissions = [];
  state.workspace = null;
  state.active = null;
  state.page = null;
  state.routeId = null;
  state.routePath = '';
  state.plan = state.library = state.recent = state.opening = null;
  teacherProbe = null;
  setTeacherAccess('unverified');
  navigationRequest++;
  quizzesById.clear();
  questionOrderByQuiz.clear();
  attemptEdits.clear();
  regionRequests.clear();
  sessionStorage.removeItem('toeic.jwt');
  history.replaceState(null, '', location.pathname + location.search);
  $('page-title').textContent = 'Đăng nhập';
  $('app-shell').classList.toggle('exam-mode', false);
  $('home-resume').classList.add('hidden');
  for (const id of ['quiz-search', 'quiz-part', 'quiz-plan']) $(id).value = '';
  regionStatus('route-status', '');
  for (const id of ['attempt-area', 'result-area', 'quiz-detail', 'practice-catalog', 'home-quizzes', 'attempt-list',
    'activity-list', 'reviews-list', 'review-quiz', 'teacher-quiz-list']) $(id).innerHTML = '';
  for (const id of ['stat-attempts', 'stat-plan', 'plan-current', 'attempt-open-status']) $(id).textContent = '—';
  $('stat-plan').classList.toggle('plan-pro', false);
  $('stat-plan').classList.toggle('plan-free', false);
  for (const id of ['home-history-detail', 'home-membership-detail']) $(id).textContent = '';
  for (const id of ['home-history-status', 'home-membership-status']) {
    regionStatus(id, '');
  }
  teacherEditor?.reset();
  resetAdminWorkspace();
  $('profile-form').reset();
  $('password-form').reset();
  for (const id of ['profile-save', 'password-save']) $(id).disabled = false;
  for (const id of ['profile-status', 'password-status']) regionStatus(id, '');
  regionStatus('teacher-status', '');
  regionStatus('admin-status', '');
  $('review-stars').value = '5';
  $('attempt-area').classList.add('hidden');
  $('save-review').disabled = true;
  $('review-quiz').disabled = true;
  $('review-comment').value = '';
  authUi();
  showAuthForm('login');
  alertMsg('Đã đăng xuất.', true);
};
globalThis.addEventListener('hashchange', routeFromHash);
globalThis.addEventListener('offline', () => {
  if (!state.user || !can('content:write')) return;
  teacherProbe = null;
  setTeacherAccess('unavailable');
});
globalThis.addEventListener('beforeunload', event => {
  if (!hasUnsavedAnswers() && !teacherEditor?.hasChanges() && !teacherEditor?.isSaving()) return;
  event.preventDefault();
  event.returnValue = true;
});
$('skip-main').onclick = event => {
  event.preventDefault();
  if (state.page === 'attempt') ($('attempt-title') || $('exit-attempt')).focus();
  else $('page-title').focus();
};
$('workspace-picker').onchange = event => {
  const workspace = event.target.value;
  if (workspaceOptions().includes(workspace)) return navigate(visiblePages(workspace)[0], workspace);
};
$('dismiss-toast').onclick = () => {
  alertMsg('');
  if (state.user) $('page-title').focus();
  else $('login-email').focus();
};
document.querySelectorAll('.nav').forEach(button => {
  button.onclick = () => navigate(button.dataset.tab);
});
$('jump-practice').onclick = () => navigate('practice');
$('teacher-create').onclick = () => navigate('teacher');
$('teacher-list-refresh').onclick = loadTeacherQuizzes;
$('editor-access-retry').onclick = checkTeacherAccess;
$('practice-review').onclick = $('results-review').onclick = () => navigate('interaction');
$('refresh-home').onclick = loadHome;
$('refresh-practice').onclick = loadPractice;
$('refresh-history').onclick = loadHistory;
$('quiz-back').onclick = $('exit-attempt').onclick = () => navigate('practice');
$('retry-quiz').onclick = () => loadQuiz(state.routeId);
$('retry-attempt').onclick = () => loadAttempt(state.routeId);
$('quiz-search').oninput = $('quiz-part').onchange = $('quiz-plan').onchange = renderLibrary;

function regionStatus(id, message, error = false, phase = '') {
  const status = $(id);
  status.textContent = message;
  status.classList.toggle('region-error', error);
  status.classList.toggle('region-loading', phase === 'loading');
  status.classList.toggle('region-empty', phase === 'empty');
}

function setTeacherAccess(phase) {
  teacherAccess = phase;
  const ready = phase === 'ready';
  const checking = phase === 'checking';
  const message = teacherMessages[phase] || '';
  const guidance = message && !checking
    ? message + ' Nội dung đang soạn vẫn được giữ trong tab này.' : message;
  regionStatus('teacher-access-status', message, !ready && !checking, checking ? 'loading' : '');
  regionStatus('editor-access-status', guidance, !ready && !checking, checking ? 'loading' : '');
  $('teacher-create').disabled = !ready;
  $('teacher-list-refresh').disabled = checking;
  $('editor-access-retry').classList.toggle('hidden', ready || checking);
  document.querySelectorAll('.nav').forEach(button => {
    if (button.dataset.tab === 'teacher') button.disabled = !ready;
  });
  $('teacher-quiz-list').querySelectorAll('.own-quiz').forEach(button => {
    if (button.dataset.draft === 'true') button.disabled = !ready;
  });
  teacherEditor?.setWriteEnabled(ready);
}

function teacherFailure(status) {
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'unauthorized';
  if (status === 408 || status === 504) return 'timeout';
  if (status === 0 || status >= 500) return 'unavailable';
  return 'unverified';
}

function isOwnedQuiz(quiz) {
  return !!quiz && typeof quiz.id === 'string' && quiz.id.length > 0 && typeof quiz.title === 'string'
    && Number.isInteger(quiz.part) && quiz.part >= 1 && quiz.part <= 7 && typeof quiz.premium === 'boolean'
    && Number.isSafeInteger(quiz.count) && quiz.count >= 0 && Number.isSafeInteger(quiz.version)
    && quiz.version >= 0 && ['DRAFT', 'PUBLISHED'].includes(quiz.status);
}

function checkTeacherAccess() {
  if (!state.user || !state.token) return Promise.resolve({phase: 'unauthenticated'});
  if (!can('content:write')) {
    setTeacherAccess('unauthorized');
    return Promise.resolve({phase: 'unauthorized'});
  }
  if (teacherProbe?.token === state.token) return teacherProbe.promise;
  const probe = {token: state.token};
  teacherProbe = probe;
  setTeacherAccess('checking');
  probe.promise = (async () => {
    let result;
    try {
      const quizzes = await api(ownedQuizzesPath, {
        expectedStatus: 200, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000)
      }, probe.token);
      // An empty owner list is a valid V3 response. HTTP errors never identify a version.
      result = Array.isArray(quizzes) && quizzes.every(isOwnedQuiz) ? {phase: 'ready', quizzes}
        : {phase: Array.isArray(quizzes) ? 'unsupported' : 'unverified'};
    } catch (error) {
      result = {phase: error.name === 'TimeoutError' ? 'timeout' : teacherFailure(error.status)};
    }
    if (teacherProbe !== probe || state.token !== probe.token) return null;
    teacherProbe = null;
    setTeacherAccess(result.phase);
    return result;
  })();
  return probe.promise;
}

async function teacherRequest(path, options = {}) {
  const token = state.token;
  try {
    return await api(path, {...options, signal: AbortSignal.timeout(5000)}, token);
  } catch (error) {
    const phase = error.name === 'TimeoutError' ? 'timeout' : teacherFailure(error.status);
    if (state.token === token && phase !== 'unverified') {
      teacherProbe = null;
      setTeacherAccess(phase);
    }
    throw error;
  }
}

async function teacherWrite(path, options) {
  if (!state.user || !state.token) throw apiError(401, true);
  if (state.page !== 'teacher' || !can('content:write')) throw apiError(403, true);
  const token = state.token;
  const route = state.routePath;
  const access = await checkTeacherAccess();
  if (state.token !== token || state.routePath !== route || !can('content:write')) throw apiError(403, true);
  if (access?.phase !== 'ready' || teacherAccess !== 'ready') {
    throw new Error('Chưa gửi yêu cầu. ' + (teacherMessages[teacherAccess] || teacherMessages.unverified));
  }
  return teacherRequest(path, options);
}

function renderTeacherQuizzes(result) {
  if (!result || state.page !== 'teacher-home') return;
  const list = $('teacher-quiz-list');
  const quizzes = result.phase === 'ready' ? result.quizzes : [];
  list.innerHTML = quizzes.map(quiz => {
    const draft = quiz.status === 'DRAFT';
    const action = draft || can('assessment:submit')
      ? `<button type="button" class="ghost own-quiz" data-id="${html(quiz.id)}" data-draft="${draft}">${draft ? 'Mở bản nháp' : 'Xem đề'}</button>`
      : '';
    return `<article class="quizcard library-card">
      <span class="pill ${quiz.premium ? 'premium' : ''}">Part ${html(quiz.part)} · ${quiz.premium ? 'PRO' : 'FREE'}</span>
      <h3>${html(quiz.title || 'Đề chưa đặt tên')}</h3><p>${html(quiz.count)} câu · ${draft ? 'Bản nháp' : 'Đã xuất bản'}</p>
      ${action}</article>`;
  }).join('');
  list.querySelectorAll('.own-quiz').forEach(button => {
    button.onclick = () => navigate(button.dataset.draft === 'true' ? 'teacher' : 'quiz', 'teacher', false, button.dataset.id);
  });
  const empty = result.phase === 'ready' && !quizzes.length;
  regionStatus('teacher-list-status', empty ? 'Bạn chưa có đề. Chọn Tạo đề mới để bắt đầu.' : '', false, empty ? 'empty' : '');
}

function loadTeacherQuizzes() {
  $('teacher-quiz-list').innerHTML = '';
  regionStatus('teacher-list-status', '');
  return checkTeacherAccess().then(renderTeacherQuizzes);
}


async function loadRegion(id, label, path, render, cachedMetric) {
  const token = state.token;
  const request = Symbol();
  regionRequests.set(id, request);
  regionStatus(id, 'Đang tải ' + label + '…', false, 'loading');
  const isCurrent = () => state.token === token && regionRequests.get(id) === request;
  try {
    const data = await api(path);
    if (isCurrent()) {
      const message = render(data) || '';
      regionStatus(id, message, false, message ? 'empty' : '');
    }
  } catch (error) {
    if (isCurrent()) {
      const cached = cachedMetric && !['', '—'].includes($(cachedMetric).textContent);
      const previous = cached ? ' Đang hiển thị dữ liệu tải gần nhất.' : '';
      regionStatus(id, `Không tải được ${label}. ${error.message}${previous}`, true);
    }
  }
}

function rememberQuizzes(quizzes) {
  for (const quiz of quizzes) quizzesById.set(quiz.id, quiz);
}

function rememberQuizDetail(detail) {
  rememberQuizzes([detail.quiz]);
  questionOrderByQuiz.set(detail.quiz.id, new Map(detail.questions.map((question, index) => [question.id, index])));
}

function quizAccess(quiz) {
  if (!quiz.premium || state.plan === 'PRO') return 'Có thể luyện';
  return state.plan === 'FREE' ? 'Cần gói PRO' : 'Đang xác minh quyền truy cập';
}

function card(quiz) {
  return `<article class="quizcard library-card">
    <span class="pill ${quiz.premium ? 'premium' : ''}">PART ${html(quiz.part)} · ${quiz.premium ? 'PRO' : 'FREE'}</span>
    <h3>${html(quiz.title)}</h3>
    <p>${html(quiz.count)} câu · ${quizAccess(quiz)}</p>
    <button type="button" class="ghost open-quiz" data-id="${html(quiz.id)}" aria-label="Xem chi tiết: ${html(quiz.title)}">Xem chi tiết</button>
  </article>`;
}

function renderCatalog(id, quizzes) {
  const root = $(id);
  root.innerHTML = quizzes.map(card).join('');
  root.querySelectorAll('.open-quiz').forEach(button => {
    button.onclick = () => navigate('quiz', state.workspace, false, button.dataset.id);
  });
}

function renderResume() {
  const resume = $('home-resume');
  resume.classList.toggle('hidden', !state.recent || !can('assessment:submit'));
  if (!state.recent || !can('assessment:submit')) return;
  const attempt = state.recent;
  const title = quizzesById.get(attempt.quizId)?.title || 'Đề luyện tập';
  resume.innerHTML = `<div><h2>Tiếp tục lượt đang làm</h2><p>${html(title)}</p></div>
    <button type="button" class="primary resume-attempt">Tiếp tục làm</button>`;
  resume.querySelectorAll('.resume-attempt').forEach(button => {
    button.onclick = () => navigate('attempt', state.workspace, false, attempt.id);
  });
}

function loadHome() {
  let suggested;
  return Promise.all([
    loadRegion('home-catalog-status', 'danh mục đề', '/ms/v1/contents/quizzes', quizzes => {
      rememberQuizzes(quizzes);
      $('stat-quizzes').textContent = quizzes.length;
      suggested = quizzes.slice(0, 3);
      renderCatalog('home-quizzes', suggested);
      renderResume();
      return quizzes.length ? '' : 'Chưa có đề luyện tập.';
    }, 'stat-quizzes'),
    loadRegion('home-history-status', 'số lượt luyện tập', '/ms/v1/attempts', attempts => {
      $('stat-attempts').textContent = attempts.length;
      const graded = attempts.filter(attempt => attempt.status === 'GRADED').length;
      const inProgress = attempts.filter(attempt => attempt.status === 'IN_PROGRESS');
      state.recent = inProgress[0] ?? null;
      renderResume();
      $('home-history-detail').textContent = attempts.length
        ? `${graded} đã chấm · ${inProgress.length} đang làm`
        : '';
      return attempts.length ? '' : 'Bạn chưa có lượt luyện tập.';
    }, 'stat-attempts'),
    loadRegion('home-membership-status', 'gói hiện tại', '/api/v1/memberships/me', member => {
      showMembership(member);
      if (suggested) renderCatalog('home-quizzes', suggested);
    }, 'stat-plan')
  ]);
}

function renderLibrary() {
  if (!state.library) return;
  const query = ($('quiz-search').value || '').trim().toLocaleLowerCase('vi');
  const part = $('quiz-part').value;
  const plan = $('quiz-plan').value;
  const matches = state.library.filter(quiz => quiz.title.toLocaleLowerCase('vi').includes(query)
    && (!part || String(quiz.part) === part) && (!plan || plan === (quiz.premium ? 'PRO' : 'FREE')));
  renderCatalog('practice-catalog', matches);
  regionStatus('library-count', !state.library.length ? '' : matches.length
    ? `${matches.length} / ${state.library.length} đề` : 'Không tìm thấy đề phù hợp.', false, matches.length ? '' : 'empty');
}

function loadPractice() {
  return Promise.all([
    loadRegion('practice-catalog-status', 'danh mục đề', '/ms/v1/contents/quizzes', quizzes => {
      rememberQuizzes(quizzes);
      state.library = quizzes;
      const parts = [...new Set(quizzes.map(quiz => quiz.part))].sort((a, b) => a - b);
      const select = $('quiz-part');
      const selected = select.value;
      select.innerHTML = '<option value="">Tất cả Part</option>' + parts.map(part =>
        `<option value="${html(part)}">Part ${html(part)}</option>`).join('');
      select.value = parts.includes(Number(selected)) ? selected : '';
      renderLibrary();
      return quizzes.length ? '' : 'Chưa có đề luyện tập.';
    }),
    loadRegion('practice-plan-status', 'quyền truy cập đề PRO', '/api/v1/memberships/me', member => {
      showMembership(member);
      renderLibrary();
    })
  ]);
}

async function loadQuiz(id) {
  const route = state.routePath;
  let quiz;
  let accessReady = false;
  const area = $('quiz-detail');
  area.innerHTML = '';
  $('retry-quiz').classList.add('hidden');
  regionStatus('attempt-open-status', '');
  function render() {
    if (state.routePath !== route || !quiz) return;
    const locked = quiz.premium && (!accessReady || state.plan !== 'PRO');
    const membership = locked && visiblePages('learner').includes('membership');
    const accessLabel = quiz.premium && !accessReady ? 'Quyền truy cập chưa được xác minh' : quizAccess(quiz);
    area.innerHTML = `<article class="panel quiz-overview">
      <span class="pill ${quiz.premium ? 'premium' : ''}">Part ${html(quiz.part)} · ${quiz.premium ? 'PRO' : 'FREE'}</span>
      <h2>${html(quiz.title)}</h2><p>${html(quiz.count)} câu hỏi · ${accessLabel}</p>
      ${locked ? (membership ? '<button class="ghost" type="button" id="quiz-membership">Xem gói thành viên</button>' : '')
        : '<button class="primary" type="button" id="start-quiz">Bắt đầu làm bài</button>'}
    </article>`;
    if (membership) $('quiz-membership').onclick = () => navigate('membership', 'learner');
    if (!locked) {
      const button = $('start-quiz');
      button.disabled = Boolean(state.opening);
      button.onclick = () => startAttempt(id, quiz.premium);
    }
  }
  const token = state.token;
  const catalog = loadRegion('quiz-detail-status', 'thông tin đề', '/ms/v1/contents/quizzes/' + id, detail => {
    quiz = detail.quiz;
    rememberQuizDetail(detail);
    render();
  }).then(() => {
    if (state.token === token && state.routePath === route && !quiz) $('retry-quiz').classList.remove('hidden');
  });
  const access = loadRegion('quiz-plan-status', 'quyền truy cập đề PRO', '/api/v1/memberships/me', member => {
    accessReady = true;
    showMembership(member);
    render();
  });
  await Promise.all([catalog, access]);
  if (state.token === token && state.routePath === route && quiz?.premium && !accessReady) {
    $('retry-quiz').classList.remove('hidden');
  }
}

function dateLabel(value) {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime()) ? date.toLocaleString('vi-VN', {
    dateStyle: 'medium', timeStyle: 'short'
  }) : '';
}

function loadHistory() {
  let history;
  const render = () => {
    if (!history) return;
    const list = $('attempt-list');
    list.innerHTML = history.map(attempt => {
      const graded = attempt.status === 'GRADED';
      const quiz = quizzesById.get(attempt.quizId);
      const detail = graded ? `${html(attempt.correct)}/${html(attempt.total)} câu đúng` : `${html(attempt.total)} câu`;
      const started = dateLabel(attempt.createdAt);
      return `<div class="feeditem history-row">
        <div><b>${html(quiz?.title || 'Đề luyện tập')}</b>
        <br>${graded ? 'Đã chấm' : 'Đang làm'} · ${detail}${started ? `<br><small>Bắt đầu ${html(started)}</small>` : ''}</div>
        <button type="button" data-id="${html(attempt.id)}" data-page="${graded ? 'result' : 'attempt'}" class="ghost openattempt">${graded ? 'Xem kết quả' : 'Tiếp tục làm'}</button>
      </div>`;
    }).join('');
    list.querySelectorAll('.openattempt').forEach(button => {
      button.onclick = () => navigate(button.dataset.page, state.workspace, false, button.dataset.id);
    });
  };
  return Promise.all([
    loadRegion('practice-history-status', 'lịch sử làm bài', '/ms/v1/attempts', attempts => {
      history = attempts;
      render();
      return attempts.length ? '' : 'Chưa có lượt làm bài nào.';
    }),
    loadRegion('history-catalog-status', 'tên đề từ thư viện', '/ms/v1/contents/quizzes', quizzes => {
      rememberQuizzes(quizzes);
      render();
    })
  ]);
}

async function startAttempt(id, premium) {
  if (state.opening) return;
  const token = state.token;
  const route = state.routePath;
  const request = Symbol();
  const isCurrent = () => state.token === token && state.routePath === route && state.opening === request;
  state.opening = request;
  const button = $('start-quiz');
  if (button) button.disabled = true;
  regionStatus('attempt-open-status', 'Đang mở lượt luyện tập…');
  try {
    const attempt = await api('/ms/v1/attempts', {method: 'POST', body: JSON.stringify({quizId: id})});
    if (isCurrent()) renderAttempt(attempt);
  } catch (error) {
    let message = error.message;
    // Assessment uses the same 403 for permission and entitlement failures.
    if (error.status === 403 && premium && isCurrent() && can('assessment:submit')) {
      try {
        const member = await api('/api/v1/memberships/me');
        if (member?.planCode === 'FREE') {
          message = 'Đề này yêu cầu gói PRO. Xem quyền lợi trong mục Gói thành viên.';
        }
      } catch (membershipError) {
        if (membershipError.status === 401) message = membershipError.message;
      }
    }
    if (isCurrent()) regionStatus('attempt-open-status', 'Không thể bắt đầu lượt luyện tập. ' + message, true);
  } finally {
    if (state.opening === request) {
      state.opening = null;
      const currentButton = $('start-quiz');
      if (currentButton) currentButton.disabled = false;
    }
  }
}

async function loadAttempt(id) {
  const token = state.token;
  const route = state.routePath;
  const request = Symbol();
  regionRequests.set('attempt-load-status', request);
  const isCurrent = () => state.token === token && state.routePath === route &&
    regionRequests.get('attempt-load-status') === request;
  $('attempt-loading').classList.remove('hidden');
  $('retry-attempt').classList.add('hidden');
  $('attempt-area').classList.add('hidden');
  $('result-area').classList.add('hidden');
  regionStatus('attempt-load-status', 'Đang tải lượt luyện tập…', false, 'loading');
  try {
    const attempt = await api('/ms/v1/attempts/' + id);
    if (isCurrent() && state.user && attempt.quizId && !questionOrderByQuiz.has(attempt.quizId)) {
      try {
        const detail = await api('/ms/v1/contents/quizzes/' + attempt.quizId, {signal: AbortSignal.timeout(1500)});
        if (isCurrent()) rememberQuizDetail(detail);
      } catch {
        // The snapshot remains usable when the catalog is unavailable.
      }
    }
    if (isCurrent()) renderAttempt(attempt);
  } catch (error) {
    if (isCurrent()) {
      regionStatus('attempt-load-status', 'Không thể mở lượt luyện tập. ' + error.message, true);
      $('retry-attempt').classList.remove('hidden');
    }
  }
}

function updateAttemptControls(attemptId, edits) {
  const attempt = state.active;
  if (attempt?.id !== attemptId || attempt.status === 'GRADED' ||
    (state.user && (state.page !== 'attempt' || state.routeId !== attemptId))) return;

  const pending = [...edits.answers.values()].some(answer => answer.pending);
  const failed = attempt.questions.flatMap((q, i) => edits.answers.get(q.id)?.failed ? [i + 1] : []);
  const submit = $('submit-attempt');
  submit.disabled = edits.submitting || pending || failed.length > 0;
  submit.textContent = edits.submitting ? 'Đang nộp bài…' : 'Nộp bài';
  const answered = attempt.questions.filter(question => selectedChoice(question, edits)).length;
  $('attempt-progress').textContent = `${answered}/${attempt.questions.length} đã trả lời · ${attempt.questions.length - answered} chưa trả lời`;
  document.querySelectorAll('#question-map .question-jump').forEach((button, index) => {
    const question = attempt.questions[index];
    const selected = Boolean(selectedChoice(question, edits));
    const flagged = edits.flagged.has(question.id);
    button.classList.toggle('answered', selected);
    button.classList.toggle('flagged', flagged);
    if (edits.index === index) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
    button.setAttribute('aria-label', `Câu ${index + 1}, ${selected ? 'đã trả lời' : 'chưa trả lời'}${flagged ? ', đánh dấu xem lại' : ''}`);
  });
  $('retry-answers').classList.toggle('hidden', failed.length === 0);
  const errorMessages = [...new Set([...edits.answers.values()].filter(answer => answer.failed).map(answer => answer.error))];
  regionStatus('answer-save-status', failed.length
    ? `Không lưu được đáp án ở câu ${failed.join(', ')}. ${errorMessages.join(' ')} Hãy thử lưu lại trước khi nộp bài.`
    : pending ? 'Đang lưu đáp án…' : answered ? 'Đã lưu các đáp án đã chọn.' : 'Chưa có đáp án. Lựa chọn sẽ được lưu tự động.', failed.length > 0);
  document.querySelectorAll('#attempt-area input[type=radio]').forEach(input => {
    input.disabled = edits.submitting;
  });
}

async function saveAnswer(attemptId, questionId, edits, answer) {
  if (answer.pending) return;
  answer.pending = true;
  answer.failed = false;
  answer.error = '';
  updateAttemptControls(attemptId, edits);

  // Send only one write per question at a time. Keep the most recent choice queued.
  try {
    while (attemptEdits.get(attemptId) === edits) {
      const choice = answer.choice;
      const saved = await api(`/ms/v1/attempts/${attemptId}/answers/${questionId}`, {
        method: 'PUT', body: JSON.stringify({choice})
      });
      if (saved?.questions?.find(q => q.id === questionId)?.selectedChoice !== choice) {
        throw new Error('Lựa chọn lưu trên hệ thống không khớp.');
      }
      if (answer.choice === choice) break;
    }
  } catch (error) {
    answer.failed = true;
    answer.error = error.status === undefined ? 'Máy chủ chưa xác nhận lựa chọn.' : error.message;
  } finally {
    answer.pending = false;
    if (attemptEdits.get(attemptId) === edits) updateAttemptControls(attemptId, edits);
  }
}

function selectedChoice(question, edits) {
  return edits.answers.get(question.id)?.choice ?? question.selectedChoice;
}

function renderAttempt(attempt) {
  if (attempt.status !== 'GRADED' && state.active?.id === attempt.id && state.active.status === 'GRADED') {
    attempt = state.active;
  }
  const page = attempt.status === 'GRADED' ? 'result' : 'attempt';
  if (state.user && (state.page !== page || state.routeId !== attempt.id)) {
    const replace = ['attempt', 'result'].includes(state.page);
    return navigate(page, state.workspace, replace, attempt.id, attempt);
  }
  showAttempt(attempt);
}

function showAttempt(attempt) {
  state.active = attempt;
  if (!attempt.questions.every(question => Object.hasOwn(question, 'position'))) {
    const positions = questionOrderByQuiz.get(attempt.quizId);
    const position = question => positions?.get(question.id) ?? Number.MAX_SAFE_INTEGER;
    attempt.questions = [...attempt.questions].sort((a, b) => position(a) - position(b) || a.id.localeCompare(b.id));
  }
  $('attempt-loading').classList.add('hidden');
  if (attempt.status === 'GRADED') {
    attemptEdits.delete(attempt.id);
    showResult(attempt);
  } else {
    showExam(attempt);
  }
}

function attemptHeading(attempt) {
  const quiz = quizzesById.get(attempt.quizId);
  return `<p id="attempt-part" class="eyebrow">${quiz ? 'Part ' + html(quiz.part) : 'Không có thông tin Part'}</p>
    <h2 id="attempt-title" tabindex="-1">${html(quiz?.title || 'Đề luyện tập')}</h2>`;
}

function showExam(attempt) {
  if (!attemptEdits.has(attempt.id)) {
    attemptEdits.set(attempt.id, {answers: new Map(), flagged: new Set(), index: 0, submitting: false});
  }
  const edits = attemptEdits.get(attempt.id);
  const area = $('attempt-area');
  $('result-area').innerHTML = '';
  area.classList.remove('hidden');
  area.innerHTML = `<header class="exam-heading">${attemptHeading(attempt)}
      <p id="attempt-progress" class="muted"></p>
    </header>
    <div class="exam-layout">
      <div class="exam-main">
        <div class="exam-question panel" id="question-slot"></div>
        <div class="exam-navigation">
          <button type="button" class="ghost" id="prev-question">← Câu trước</button>
          <button type="button" class="ghost" id="next-question">Câu tiếp theo →</button>
        </div>
      </div>
      <div class="exam-map">
        <button type="button" class="ghost question-toggle" id="question-toggle" aria-controls="question-map" aria-expanded="false">Danh sách câu</button>
        <aside class="panel question-map" id="question-map" aria-labelledby="question-map-title">
          <h3 id="question-map-title">Danh sách câu</h3>
          <div class="question-grid">${attempt.questions.map((_, index) =>
            `<button type="button" class="ghost question-jump">${index + 1}</button>`).join('')}</div>
          <p class="muted">✓ Đã trả lời · ⚑ Xem lại</p>
        </aside>
      </div>
    </div>
    <div class="panel exam-footer">
      <p class="region-status" id="answer-save-status" role="status"></p>
      <button type="button" class="ghost hidden" id="retry-answers">Thử lưu lại đáp án</button>
      <button type="button" class="primary" id="submit-attempt" aria-describedby="answer-save-status">Nộp bài</button>
      <p class="region-status" id="submit-status" role="status"></p>
    </div>
    <dialog id="submit-dialog" aria-labelledby="confirm-title" aria-describedby="submit-summary">
      <h3 id="confirm-title">Xác nhận nộp bài</h3>
      <p id="submit-summary"></p>
      <div class="view-actions">
        <button type="button" class="ghost" id="cancel-submit" autofocus>Quay lại</button>
        <button type="button" class="primary" id="confirm-submit">Xác nhận nộp</button>
      </div>
    </dialog>`;

  function showQuestion(index, focus = false) {
    edits.index = index;
    const question = attempt.questions[index];
    edits.questionId = question.id;
    const selected = selectedChoice(question, edits);
    const options = ['A', 'B', 'C', 'D'].filter(key => Object.hasOwn(question.choices, key)).map(key =>
      `<label class="option"><input type="radio" name="q-${html(question.id)}" value="${key}" ${selected === key ? 'checked' : ''}> <span>${key}. ${html(question.choices[key])}</span></label>`
    ).join('');
    $('question-slot').innerHTML = `<fieldset class="question">
      <legend id="exam-question-title" tabindex="-1">Câu ${index + 1}. ${html(question.prompt)}</legend>
      <div class="options">${options}</div>
    </fieldset>
    <button type="button" class="ghost flag-question" id="flag-question" aria-pressed="${edits.flagged.has(question.id)}">Đánh dấu xem lại</button>`;
    $('prev-question').disabled = index === 0;
    $('next-question').disabled = index === attempt.questions.length - 1;
    $('flag-question').onclick = () => {
      if (edits.flagged.has(question.id)) edits.flagged.delete(question.id);
      else edits.flagged.add(question.id);
      $('flag-question').setAttribute('aria-pressed', String(edits.flagged.has(question.id)));
      updateAttemptControls(attempt.id, edits);
    };
    document.querySelectorAll('#attempt-area input[type=radio]').forEach(input => {
      input.onchange = () => {
        if (state.active !== attempt || edits.submitting) return;
        const answer = edits.answers.get(question.id) ?? {pending: false, failed: false};
        answer.choice = input.value;
        edits.answers.set(question.id, answer);
        return saveAnswer(attempt.id, question.id, edits, answer);
      };
    });
    updateAttemptControls(attempt.id, edits);
    if (focus) $('exam-question-title').focus?.();
  }

  function toggleMap(open) {
    $('question-toggle').setAttribute('aria-expanded', String(open));
    $('question-map').classList.toggle('map-open', open);
  }

  $('question-toggle').onclick = () => toggleMap($('question-toggle').getAttribute('aria-expanded') !== 'true');
  document.querySelectorAll('#question-map .question-jump').forEach((button, index) => {
    button.onclick = () => {
      toggleMap(false);
      showQuestion(index, true);
    };
  });
  $('prev-question').onclick = () => showQuestion(edits.index - 1, true);
  $('next-question').onclick = () => showQuestion(edits.index + 1, true);
  $('retry-answers').onclick = () => Promise.all([...edits.answers]
    .filter(([, answer]) => answer.failed)
    .map(([questionId, answer]) => saveAnswer(attempt.id, questionId, edits, answer)));

  const dialog = $('submit-dialog');
  const isActive = () => state.active?.id === attempt.id &&
    (!state.user || (state.page === 'attempt' && state.routeId === attempt.id));
  const canSubmit = () => state.active === attempt && isActive() &&
    !edits.submitting && ![...edits.answers.values()].some(answer => answer.pending || answer.failed);
  $('submit-attempt').onclick = () => {
    if (!canSubmit() || dialog.open) return;
    const unanswered = attempt.questions.filter(question => !selectedChoice(question, edits)).length;
    $('submit-summary').textContent = `Bạn còn ${unanswered} câu bỏ trống. Sau khi nộp, bạn sẽ chuyển sang xem kết quả.`;
    dialog.showModal();
  };
  $('cancel-submit').onclick = () => dialog.close();
  $('confirm-submit').onclick = async () => {
    if (!dialog.open || !canSubmit()) return;
    edits.submitting = true;
    dialog.close();
    updateAttemptControls(attempt.id, edits);
    regionStatus('submit-status', 'Đang chấm bài…');
    try {
      const updated = await api(`/ms/v1/attempts/${attempt.id}/submit`, {method: 'POST'});
      if (attemptEdits.get(attempt.id) !== edits) return;
      if (isActive()) renderAttempt(updated);
      else attemptEdits.delete(attempt.id);
    } catch (error) {
      if (isActive()) regionStatus('submit-status', 'Không thể nộp bài. ' + error.message, true);
    } finally {
      edits.submitting = false;
      if (attemptEdits.get(attempt.id) === edits) updateAttemptControls(attempt.id, edits);
    }
  };
  const previousIndex = attempt.questions.findIndex(question => question.id === edits.questionId);
  if (attempt.questions.length) showQuestion(previousIndex === -1 ? 0 : previousIndex);
  else updateAttemptControls(attempt.id, edits);
  $('attempt-title').focus?.();
}

function showResult(attempt) {
  const area = $('result-area');
  $('attempt-area').classList.add('hidden');
  $('attempt-area').innerHTML = '';
  area.classList.remove('hidden');
  const correct = attempt.correct;
  const unanswered = attempt.questions.filter(question => !question.selectedChoice).length;
  const incorrect = attempt.total - correct - unanswered;
  const accuracy = attempt.total ? Math.round(correct * 100 / attempt.total) + '%' : '—';
  area.innerHTML = `<section class="panel result-summary" aria-labelledby="attempt-title">
    ${attemptHeading(attempt)}
    <p class="result-score">Kết quả: ${html(correct)}/${html(attempt.total)} câu đúng</p>
    <dl class="result-metrics">
      <div><dt>Đúng</dt><dd class="statusgood">${html(correct)}</dd></div>
      <div><dt>Sai</dt><dd class="statusbad">${html(incorrect)}</dd></div>
      <div><dt>Bỏ trống</dt><dd>${html(unanswered)}</dd></div>
      <div><dt>Tỷ lệ đúng</dt><dd>${html(accuracy)}</dd></div>
    </dl>
    <div class="view-actions"><button type="button" id="result-practice" class="primary">Luyện đề khác</button>
    <button type="button" id="result-history" class="ghost">Về lịch sử</button></div>
  </section>
  <section class="result-review" aria-labelledby="review-heading"><h2 id="review-heading">Xem lại từng câu</h2>
    ${attempt.questions.map((question, index) => {
      const selected = question.selectedChoice;
      const outcome = !selected ? 'Bỏ trống' : question.correct ? 'Đúng' : 'Sai';
      const status = !selected ? '' : question.correct ? 'statusgood' : 'statusbad';
      const answer = selected ? selected + '. ' + (question.choices[selected] ?? '') : 'Chưa chọn';
      return `<details class="panel result-question"><summary><span>Câu ${index + 1}. ${html(question.prompt)}</span>
        <strong class="${status}">${outcome}</strong></summary>
        <p>Lựa chọn của bạn: ${html(answer)}</p>
        ${question.explanation ? `<p><strong>Giải thích</strong> · ${html(question.explanation)}</p>` : ''}
      </details>`;
    }).join('')}
  </section>`;
  $('result-practice').onclick = () => navigate('practice');
  $('result-history').onclick = () => navigate('results', 'learner');
  $('attempt-title').focus?.();
}

function showMembership(member) {
  state.plan = member.planCode;
  const plan = $('stat-plan');
  plan.textContent = member.planCode;
  plan.classList.toggle('plan-pro', member.planCode === 'PRO');
  plan.classList.toggle('plan-free', member.planCode === 'FREE');
  $('home-membership-detail').textContent = `Giới hạn ${member.maxPracticePerDay.toLocaleString('vi-VN')} lượt/ngày`;
  $('plan-current').textContent = `Gói hiện tại: ${member.planCode} · ${member.maxPracticePerDay} lượt/ngày.`;
}

function loadMembership() {
  return loadRegion('plan-status', 'gói thành viên', '/api/v1/memberships/me', showMembership);
}
$('refresh-plan').onclick = loadMembership;

async function changePlan(planCode) {
  const token = state.token;
  regionStatus('plan-status', 'Đang đổi gói demo…');
  try {
    const member = await api('/api/v1/memberships/me', {method: 'PUT', body: JSON.stringify({planCode})});
    if (state.token !== token) return;
    regionRequests.delete('home-membership-status');
    regionRequests.delete('plan-status');
    showMembership(member);
    regionStatus('home-membership-status', '');
    regionStatus('plan-status', 'Đã chọn ' + member.planCode + ' trong môi trường demo.');
  } catch (error) {
    if (state.token === token) regionStatus('plan-status', 'Không thể đổi gói demo. ' + error.message, true);
  }
}
$('choose-free').onclick = () => changePlan('FREE');
$('choose-pro').onclick = () => changePlan('PRO');

function loadInteraction() {
  let reviewsReady;
  return Promise.all([
    loadRegion('review-catalog-status', 'danh mục đề để đánh giá', '/ms/v1/contents/quizzes', quizzes => {
      const select = $('review-quiz');
      const selected = select.value;
      select.innerHTML = quizzes.map(q => `<option value="${html(q.id)}">${html(q.title)}</option>`).join('');
      if (quizzes.some(q => q.id === selected)) select.value = selected;
      select.disabled = $('save-review').disabled = quizzes.length === 0;
      if (select.value !== selected) $('reviews-list').innerHTML = '';
      reviewsReady = loadReviews();
      return quizzes.length ? '' : 'Chưa có đề để đánh giá.';
    }).then(() => reviewsReady),
    loadRegion('activity-status', 'hoạt động học tập', '/api/v1/interactions/activities/me', activities => {
      $('activity-list').innerHTML = activities.map(activity => {
        const label = activity.kind === 'ATTEMPT_GRADED' ? 'Đã chấm bài luyện tập' : 'Hoạt động học tập';
        const date = dateLabel(activity.recordedAt);
        return `<div class="feeditem">${label}${date ? ' · ' + html(date) : ''}</div>`;
      }).join('');
      return activities.length ? '' : 'Chưa có hoạt động học tập.';
    })
  ]);
}

function loadReviews() {
  const id = $('review-quiz').value;
  if (!id) {
    regionRequests.delete('reviews-status');
    $('reviews-list').innerHTML = '';
    regionStatus('reviews-status', '');
    return;
  }
  return loadRegion('reviews-status', 'đánh giá', '/api/v1/interactions/contents/' + id + '/reviews', reviews => {
    $('reviews-list').innerHTML = reviews.map(review =>
      `<div class="feeditem">★ ${html(review.stars)}/5 · ${html(review.comment || 'Không có nhận xét')}</div>`).join('');
    return reviews.length ? '' : 'Chưa có đánh giá.';
  });
}

$('review-quiz').onchange = () => {
  $('reviews-list').innerHTML = '';
  return loadReviews();
};
$('refresh-activities').onclick = loadInteraction;
$('save-review').onclick = async () => {
  const token = state.token;
  const id = $('review-quiz').value;
  if (!id) return;
  try {
    await api('/api/v1/interactions/contents/' + id + '/reviews/me', {method: 'PUT', body: JSON.stringify({
      stars: Number($('review-stars').value), comment: $('review-comment').value
    })});
    if (state.token !== token) return;
    alertMsg('Đã lưu đánh giá.', true);
    if ($('review-quiz').value === id) await loadReviews();
  } catch (error) {
    if (state.token === token) alertMsg('Không thể lưu đánh giá. ' + error.message);
  }
};

// Profile is self-service; update requests never contain a userId or role.
async function loadProfile(){
  const token=state.token;
  regionStatus('profile-status','Đang tải hồ sơ…');
  try {
    const user=await api('/ms/v1/identity/me');
    if(state.token!==token || state.page!=='profile')return;
    state.user=user;
    $('profile-name').value=user.displayName;
    $('profile-email').value=user.email;
    $('profile-roles').value=state.roles.map(r=>roleLabels[r]||r).join(', ');
    authUi();
    regionStatus('profile-status','');
  }catch(error){if(state.token===token)regionStatus('profile-status',error.message,true);}
}
$('profile-form').onsubmit=async event=>{
  event.preventDefault();
  if(!state.user)return;
  const token=state.token, button=$('profile-save');
  const displayName=$('profile-name').value.trim();
  if(displayName.length<2 || displayName.length>120){regionStatus('profile-status','Tên phải có 2–120 ký tự.',true);return;}
  button.disabled=true;
  regionStatus('profile-status','Đang lưu thông tin…');
  try {
    const user=await api('/ms/v1/identity/me',{method:'PATCH',body:JSON.stringify({displayName})});
    if(state.token!==token)return;
    state.user=user;
    authUi();
    $('welcome').textContent='Xin chào, '+user.displayName;
    regionStatus('profile-status','Đã lưu tên hiển thị.');
  }catch(error){if(state.token===token)regionStatus('profile-status',error.message,true);}
  finally{if(state.token===token)button.disabled=false;}
};
$('password-form').onsubmit=async event=>{
  event.preventDefault();
  if(!state.user)return;
  const token=state.token, button=$('password-save'), form=event.target;
  const currentPassword=form.elements.currentPassword.value;
  const newPassword=form.elements.newPassword.value;
  if(newPassword!==form.elements.confirmPassword.value){regionStatus('password-status','Xác nhận mật khẩu không khớp.',true);return;}
  if(newPassword.length<8 || newPassword.length>72){regionStatus('password-status','Mật khẩu phải có 8–72 ký tự.',true);return;}
  button.disabled=true;
  regionStatus('password-status','Đang đổi mật khẩu…');
  try {
    await api('/ms/v1/identity/me/password',{method:'POST',body:JSON.stringify({currentPassword,newPassword})});
    if(state.token!==token)return;
    form.reset();
    regionStatus('password-status','Đổi mật khẩu thành công.');
  }catch(error){if(state.token===token)regionStatus('password-status',error.message,true);}
  finally{if(state.token===token)button.disabled=false;}
};


const adminUsersPath = '/ms/v1/identity/admin/users';
const adminQuizzesPath = '/ms/v1/contents/quizzes/admin';
const adminUsers = {id: 'admin-user', path: adminUsersPath, key: 'users', noun: 'tài khoản', rows: [], render: userRow};
const adminQuizzes = {id: 'admin-quiz', path: adminQuizzesPath, key: 'quizzes', noun: 'đề thi', rows: [], render: quizRow};
let selectedAdminUser;

const adminOverview = [
  ['admin', 'admin-total-users', adminUsersPath, 'ALL'],
  ['admin-learners', 'admin-total-learners', adminUsersPath, 'LEARNER'],
  ['admin-teachers', 'admin-total-teachers', adminUsersPath, 'TEACHER'],
  ['admin-quizzes', 'admin-total-quizzes', adminQuizzesPath]
];

function adminRead(path, params = {}) {
  const query = new URLSearchParams(params).toString();
  return api(path + (query ? '?' + query : ''), {signal: AbortSignal.timeout(15000)});
}

function readAdminPage(data, key) {
  if (!data || !Array.isArray(data[key]) || !Number.isInteger(data.total) || data.total < 0 ||
      !Number.isInteger(data.page) || data.page < 0 || !Number.isInteger(data.size) || data.size < 1) {
    throw new Error('Máy chủ trả về dữ liệu phân trang không hợp lệ.');
  }
  return data;
}

async function loadAdminOverview() {
  const request = navigationRequest;
  const token = state.token;
  $('admin-home-retry').classList.add('hidden');
  regionStatus('admin-home-status', 'Đang tải thống kê…', false, 'loading');
  const results = await Promise.allSettled(adminOverview.map(async ([, id, path, role]) => {
    $(id).textContent = '—';
    const data = readAdminPage(await adminRead(path, role ? {role} : {}), role ? 'users' : 'quizzes');
    if (state.token === token && request === navigationRequest) $(id).textContent = data.total;
  }));
  if (state.token !== token || request !== navigationRequest) return;
  const failure = results.find(result => result.status === 'rejected');
  regionStatus('admin-home-status', failure ? 'Không tải được đầy đủ thống kê. ' + failure.reason.message : '', Boolean(failure));
  $('admin-home-retry').classList.toggle('hidden', !failure);
}

$('admin-home-view').onclick = event => {
  const button = event.target.closest('button[data-admin-page]');
  if (button) return navigate(button.dataset.adminPage);
};
$('admin-home-retry').onclick = loadAdminOverview;

function rolesText(roles) {
  return roles.map(role => roleLabels[role] || role).join(', ') || '—';
}

function userRow(user, index) {
  const badges = user.roles.map(role => '<span class="admin-badge">' + html(roleLabels[role] || role) + '</span>');
  return '<tr><th scope="row">' + html(user.displayName) + '</th><td>' + html(user.email) + '</td>' +
    '<td><div class="admin-badges">' + (badges.join('') || '—') + '</div></td>' +
    '<td><button class="ghost" type="button" data-manage-user="' + index + '">Quản lý</button></td></tr>';
}

function quizVisibility(quiz) {
  return quiz.status === 'PUBLISHED' ? 'Công khai' : 'Chưa công khai';
}

function quizRow(quiz, index) {
  const published = quiz.status === 'PUBLISHED';
  return '<tr><th scope="row">' + html(quiz.title) + '</th><td>' + html(quiz.part) + '</td>' +
    '<td><span class="admin-badge' + (quiz.premium ? ' admin-badge-premium' : '') + '">' +
    (quiz.premium ? 'PREMIUM' : 'FREE') + '</span></td><td>' + html(quiz.count) + '</td>' +
    '<td><span class="admin-badge' + (published ? ' admin-badge-live' : '') + '">' + quizVisibility(quiz) + '</span></td>' +
    '<td class="admin-author">' + html(quiz.ownerUserId || '—') + '</td><td><div class="admin-row-actions">' +
    '<button class="ghost" type="button" data-view-quiz="' + index + '">Chi tiết</button>' +
    '<button class="ghost" type="button" data-toggle-quiz="' + index + '">' +
    (published ? 'Ẩn đề' : 'Công khai') + '</button></div></td></tr>';
}

async function loadAdminList(list, page = 0) {
  const {id, key, noun} = list;
  const request = Symbol();
  const navigation = navigationRequest;
  const token = state.token;
  regionRequests.set(id, request);
  const current = () => state.token === token && navigation === navigationRequest && regionRequests.get(id) === request;
  list.page = page;
  list.rows = [];
  $(id + '-rows').innerHTML = '';
  $(id + '-page').textContent = '';
  $(id + '-table').classList.add('hidden');
  $(id + '-retry').classList.add('hidden');
  $(id + '-prev').disabled = $(id + '-next').disabled = true;
  regionStatus(id + '-status', 'Đang tải danh sách ' + noun + '…', false, 'loading');
  try {
    const data = readAdminPage(await adminRead(list.path, {...list.filters, page}), key);
    if (!current()) return;
    const pages = Math.ceil(data.total / data.size);
    if (data.page > 0 && data.page >= pages) return loadAdminList(list, Math.max(0, pages - 1));
    list.page = data.page;
    list.rows = data[key];
    $(id + '-rows').innerHTML = list.rows.map(list.render).join('');
    $(id + '-table').classList.toggle('hidden', !list.rows.length);
    $(id + '-page').textContent = pages ? 'Trang ' + (data.page + 1) + '/' + pages + ' · ' + data.total + ' ' + noun : '';
    $(id + '-prev').disabled = data.page === 0;
    $(id + '-next').disabled = data.page + 1 >= pages;
    regionStatus(id + '-status', list.rows.length ? '' : 'Không tìm thấy ' + noun + ' phù hợp.', false,
      list.rows.length ? '' : 'empty');
  } catch (error) {
    if (!current()) return;
    regionStatus(id + '-status', 'Không tải được danh sách ' + noun + '. ' + error.message, true);
    $(id + '-retry').classList.remove('hidden');
  }
}

for (const list of [adminUsers, adminQuizzes]) {
  $(list.id + '-retry').onclick = () => loadAdminList(list, list.page);
  $(list.id + '-prev').onclick = () => loadAdminList(list, list.page - 1);
  $(list.id + '-next').onclick = () => loadAdminList(list, list.page + 1);
}

function searchAdminUsers() {
  adminUsers.filters = {
    q: $('admin-user-query').value.trim(),
    role: adminUserPages[state.page] === 'ALL' ? $('admin-user-role').value : adminUserPages[state.page]
  };
  return loadAdminList(adminUsers);
}

function openAdminUsers(tab) {
  $('admin-user-query').value = '';
  $('admin-user-role').value = adminUserPages[tab];
  $('admin-role-filter').classList.toggle('hidden', tab !== 'admin');
  return searchAdminUsers();
}

$('admin-user-search').onsubmit = event => {
  event.preventDefault();
  return searchAdminUsers();
};
$('admin-user-role').onchange = searchAdminUsers;

function showAdminAccount(user) {
  selectedAdminUser = user;
  $('admin-account-name').textContent = user.displayName;
  $('admin-account-email').textContent = user.email;
  $('admin-account-roles').textContent = rolesText(user.roles);
  const available = Object.keys(roleLabels).filter(role => !user.roles.includes(role));
  $('admin-grant-role').innerHTML = available.map(role =>
    '<option value="' + role + '">' + roleLabels[role] + '</option>').join('');
  $('admin-grant-field').classList.toggle('hidden', !available.length);
  $('admin-submit').classList.toggle('hidden', !available.length);
  $('admin-submit').disabled = $('admin-grant-role').disabled = !available.length;
  regionStatus('admin-status', available.length ? '' : 'Tài khoản đã có tất cả vai trò.');
}

$('admin-user-rows').onclick = event => {
  const index = event.target.closest('button[data-manage-user]')?.dataset.manageUser;
  const user = adminUsers.rows[index];
  if (!user) return;
  showAdminAccount(user);
  $('admin-user-dialog').showModal();
};
$('admin-user-close').onclick = () => $('admin-user-dialog').close();
$('admin-form').onsubmit = async event => {
  event.preventDefault();
  const user = selectedAdminUser;
  const role = $('admin-grant-role').value;
  const button = $('admin-submit');
  if (!user || button.disabled || !Object.hasOwn(roleLabels, role) || user.roles.includes(role)) return;
  if (!globalThis.confirm('Cấp vai trò ' + roleLabels[role] + ' cho ' + user.displayName + ' (' + user.email + ')?')) return;
  const token = state.token;
  const currentDialog = () => $('admin-user-dialog').open && selectedAdminUser === user;
  button.disabled = $('admin-grant-role').disabled = true;
  regionStatus('admin-status', 'Đang cấp vai trò…', false, 'loading');
  try {
    const result = await api(adminUsersPath + '/' + encodeURIComponent(user.userId) + '/roles',
      {method: 'POST', body: JSON.stringify({role})});
    if (state.token !== token) return;
    if (currentDialog()) {
      showAdminAccount({...user, roles: result.roles});
      regionStatus('admin-status', 'Đã cấp vai trò. Người dùng cần đăng nhập lại để nhận quyền mới.');
    }
    if (Object.hasOwn(adminUserPages, state.page)) await loadAdminList(adminUsers, adminUsers.page);
  } catch (error) {
    if (state.token !== token || !currentDialog()) return;
    regionStatus('admin-status', error.message, true);
    button.disabled = $('admin-grant-role').disabled = false;
  }
};

function searchAdminQuizzes() {
  adminQuizzes.filters = {q: $('admin-quiz-query').value.trim(), part: $('admin-quiz-part').value,
    status: $('admin-quiz-visibility').value};
  return loadAdminList(adminQuizzes);
}

function openAdminQuizzes() {
  $('admin-quiz-query').value = '';
  $('admin-quiz-part').value = '0';
  $('admin-quiz-visibility').value = 'ALL';
  return searchAdminQuizzes();
}

$('admin-quiz-search').onsubmit = event => {
  event.preventDefault();
  return searchAdminQuizzes();
};
$('admin-quiz-part').onchange = $('admin-quiz-visibility').onchange = searchAdminQuizzes;

async function openAdminQuizDetail(quiz) {
  const request = Symbol();
  const token = state.token;
  const dialog = $('admin-quiz-dialog');
  regionRequests.set('admin-quiz-detail', request);
  const current = () => state.token === token && dialog.open && regionRequests.get('admin-quiz-detail') === request;
  $('admin-quiz-title').textContent = quiz.title || 'Chi tiết đề thi';
  $('admin-quiz-detail').innerHTML = '';
  regionStatus('admin-quiz-detail-status', 'Đang tải chi tiết đề…', false, 'loading');
  dialog.showModal();
  try {
    const data = await adminRead(adminQuizzesPath + '/' + encodeURIComponent(quiz.id));
    if (!current()) return;
    $('admin-quiz-title').textContent = data.quiz.title || 'Chi tiết đề thi';
    $('admin-quiz-detail').innerHTML = '<p>Part ' + html(data.quiz.part) + ' · ' +
      (data.quiz.premium ? 'PREMIUM' : 'FREE') + ' · ' + html(data.quiz.count) + ' câu · ' +
      quizVisibility(data.quiz) + '</p>' +
      (data.quiz.ownerUserId ? '<p>Tác giả <span class="admin-author">' + html(data.quiz.ownerUserId) + '</span></p>' : '') +
      '<ol class="editor-preview-questions">' + data.questions.map(question =>
        '<li><strong>' + html(question.prompt) + '</strong><ul>' +
        Object.entries(question.choices).map(([letter, choice]) =>
          '<li>' + html(letter) + '. ' + html(choice) + '</li>').join('') + '</ul></li>').join('') + '</ol>';
    regionStatus('admin-quiz-detail-status', '');
  } catch (error) {
    if (current()) regionStatus('admin-quiz-detail-status', error.message, true);
  }
}

$('admin-quiz-rows').onclick = async event => {
  const button = event.target.closest('button[data-view-quiz], button[data-toggle-quiz]');
  if (!button || button.disabled) return;
  const quiz = adminQuizzes.rows[button.dataset.viewQuiz ?? button.dataset.toggleQuiz];
  if (!quiz) return;
  if (button.dataset.viewQuiz !== undefined) return openAdminQuizDetail(quiz);
  const published = quiz.status !== 'PUBLISHED';
  if (!globalThis.confirm((published ? 'Công khai' : 'Ẩn') + ' đề “' + quiz.title + '”?')) return;
  button.disabled = true;
  const token = state.token;
  try {
    await api(adminQuizzesPath + '/' + encodeURIComponent(quiz.id) + '/visibility',
      {method: 'POST', body: JSON.stringify({published, version: quiz.version})});
    if (state.token !== token) return;
    if (state.page === 'admin-quizzes') {
      alertMsg(published ? 'Đã công khai đề.' : 'Đã ẩn đề.', true);
      await loadAdminList(adminQuizzes, adminQuizzes.page);
    }
  } catch (error) {
    if (state.token !== token || state.page !== 'admin-quizzes') return;
    const message = error.status === 400 && published ? 'Đề cần có tiêu đề và câu hỏi hợp lệ để công khai.' : error.message;
    alertMsg(message);
    if (error.status === 409) await loadAdminList(adminQuizzes, adminQuizzes.page);
    button.disabled = false;
  }
};

function closeAdminDialogs() {
  for (const id of ['admin-user-dialog', 'admin-quiz-dialog']) {
    if ($(id).open) $(id).close();
  }
  selectedAdminUser = null;
}

function resetAdminWorkspace() {
  closeAdminDialogs();
  for (const list of [adminUsers, adminQuizzes]) {
    list.rows = [];
    list.filters = {};
    $(list.id + '-rows').innerHTML = '';
  }
  for (const id of ['admin-account-name', 'admin-account-email', 'admin-account-roles',
    'admin-quiz-detail', 'admin-quiz-title', ...adminOverview.map(([, id]) => id)]) {
    $(id).textContent = '';
  }
}

restoreSession();
