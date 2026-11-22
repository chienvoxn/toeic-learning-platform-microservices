"use strict";
const $=id=>document.getElementById(id);
const state={token:sessionStorage.getItem('toeic.jwt')||'',user:null,permissions:[],roles:[],active:null};
const attemptEdits = new Map();
const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function alertMsg(msg){$('flash').textContent=msg;}
const regionRequests = new Map();
let authPending = false;

function apiError(status, authenticated) {
  let message = 'Không thể xử lý yêu cầu. Vui lòng thử lại.';
  if (status === 0) message = 'Không thể kết nối. Kiểm tra kết nối rồi thử lại.';
  if (status === 401) message = authenticated
    ? 'Phiên đăng nhập đã hết hạn hoặc không còn hợp lệ. Vui lòng đăng nhập lại.'
    : 'Email hoặc mật khẩu không đúng.';
  if (status === 403) message = 'Bạn không có quyền thực hiện thao tác này.';
  if (status === 404) message = 'Không tìm thấy dữ liệu yêu cầu.';
  if (status === 409) message = 'Yêu cầu xung đột với dữ liệu hiện tại.';
  if (status === 429) message = 'Bạn đã hết lượt luyện tập hôm nay.';
  if (status >= 500) message = 'Máy chủ đang gặp lỗi. Vui lòng thử lại.';
  return Object.assign(new Error(message), {status});
}

async function api(path, options = {}, token = state.token) {
  const headers = {'Content-Type': 'application/json', ...(token ? {Authorization: 'Bearer ' + token} : {}), ...options.headers};
  let response;
  try {
    response = await fetch(path, {...options, headers});
  } catch {
    throw apiError(0);
  }
  if (!response.ok) throw apiError(response.status, Boolean(token));
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('json') ? response.json() : null;
}

function setTab(tab) {
  document.querySelectorAll('.nav').forEach(button => {
    const current = button.dataset.tab === tab;
    button.classList.toggle('active', current);
    if (current) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  document.querySelectorAll('.view').forEach(view => view.classList.toggle('hidden', view.id !== tab + '-view'));
  const title = $('page-title');
  title.textContent = {dashboard: 'Bảng điều khiển', practice: 'Luyện thi TOEIC', membership: 'Thành viên',
    interaction: 'Tương tác', teacher: 'Giáo viên', admin: 'Quản trị RBAC', architecture: 'Kiến trúc'}[tab];
  title.focus();
  if (tab === 'dashboard') return loadHome();
  if (tab === 'practice') return loadPractice();
  if (tab === 'membership') return loadMembership();
  if (tab === 'interaction') return loadInteraction();
}

function authUi() {
  const logged = Boolean(state.user);
  $('auth-panel').classList.toggle('hidden', logged);
  $('app-panel').classList.toggle('hidden', !logged);
  $('primary-nav').classList.toggle('hidden', !logged);
  $('logout').classList.toggle('hidden', !logged);
  $('identity-state').textContent = logged ? state.user.displayName + ' · ' + state.user.role : 'Chưa đăng nhập';
  $('teacher-tab').classList.toggle('hidden', !logged || !state.permissions.includes('content:write'));
  $('admin-tab').classList.toggle('hidden', !logged || !state.permissions.includes('rbac:manage'));
}

async function enterSession(token, user) {
  const access = await api('/ms/v1/identity/rbac/me', {}, token);
  state.token = token;
  state.user = user;
  state.permissions = access.permissions || [];
  state.roles = access.roles || [];
  sessionStorage.setItem('toeic.jwt', token);
  $('restore-session').classList.add('hidden');
  $('welcome').textContent = 'Xin chào, ' + user.displayName;
  authUi();
  setTab('dashboard');
}

async function authenticate(action) {
  if (authPending) return;
  authPending = true;
  const buttons = ['login-submit', 'register-submit', 'restore-session'].map($);
  buttons.forEach(button => { button.disabled = true; });
  alertMsg('Đang xác thực…');
  try {
    await action();
    alertMsg('Đã đăng nhập thành công.');
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
  state.token = '';
  state.user = null;
  state.active = null;
  attemptEdits.clear();
  sessionStorage.removeItem('toeic.jwt');
  for (const id of ['attempt-area', 'attempt-list', 'activity-list', 'reviews-list', 'review-quiz']) $(id).innerHTML = '';
  for (const id of ['stat-attempts', 'stat-plan', 'plan-current', 'attempt-open-status']) $(id).textContent = '—';
  $('attempt-area').classList.add('hidden');
  $('save-review').disabled = true;
  $('review-quiz').disabled = true;
  $('review-comment').value = '';
  authUi();
  showAuthForm('login');
  alertMsg('Đã đăng xuất khỏi giao diện demo. JWT cũ sẽ hết hạn sau 30 phút.');
};
document.querySelectorAll('.nav').forEach(button => {
  button.onclick = () => { if (state.user) return setTab(button.dataset.tab); };
});
$('jump-practice').onclick = () => setTab('practice');
$('refresh-home').onclick = loadHome;
$('refresh-practice').onclick = loadPractice;

function regionStatus(id, message, error = false) {
  const status = $(id);
  status.textContent = message;
  status.classList.toggle('region-error', error);
}

async function loadRegion(id, label, path, render) {
  const token = state.token;
  const request = Symbol();
  regionRequests.set(id, request);
  regionStatus(id, 'Đang tải ' + label + '…');
  const isCurrent = () => state.token === token && regionRequests.get(id) === request;
  try {
    const data = await api(path);
    if (isCurrent()) regionStatus(id, render(data) || '');
  } catch (error) {
    if (isCurrent()) regionStatus(id, `Không tải được ${label}. ${error.message}`, true);
  }
}

function card(q) {
  return `<article class="quizcard"><span class="pill ${q.premium ? 'premium' : ''}">PART ${html(q.part)} · ${q.premium ? 'PRO' : 'FREE'}</span><h3>${html(q.title)}</h3><p>${html(q.count)} câu hỏi · Mẫu bài TOEIC</p><button type="button" class="primary startquiz" data-id="${html(q.id)}" data-premium="${q.premium === true}">Bắt đầu làm bài</button></article>`;
}

function renderCatalog(id, quizzes) {
  const root = $(id);
  root.innerHTML = quizzes.map(card).join('');
  root.querySelectorAll('.startquiz').forEach(button => {
    button.onclick = () => {
      setTab('practice');
      return startAttempt(button.dataset.id, button.dataset.premium === 'true');
    };
  });
  return quizzes.length ? '' : 'Chưa có đề luyện tập.';
}

function loadHome() {
  return Promise.all([
    loadRegion('home-catalog-status', 'danh mục đề', '/ms/v1/contents/quizzes', quizzes => {
      $('stat-quizzes').textContent = quizzes.length;
      return renderCatalog('home-quizzes', quizzes);
    }),
    loadRegion('home-history-status', 'số lượt luyện tập', '/ms/v1/attempts', attempts => {
      $('stat-attempts').textContent = attempts.length;
      return attempts.length ? '' : 'Bạn chưa có lượt luyện tập.';
    }),
    loadRegion('home-membership-status', 'gói hiện tại', '/api/v1/memberships/me', showMembership)
  ]);
}

function loadPractice() {
  return Promise.all([
    loadRegion('practice-catalog-status', 'danh mục đề', '/ms/v1/contents/quizzes', quizzes => renderCatalog('practice-catalog', quizzes)),
    loadRegion('practice-history-status', 'lịch sử làm bài', '/ms/v1/attempts', attempts => {
      const list = $('attempt-list');
      list.innerHTML = attempts.map(a => `<div class="feeditem"><b>${html(a.status)}</b> · ${html(a.correct ?? '—')}/${html(a.total)} câu · <button type="button" data-id="${html(a.id)}" class="ghost openattempt">Xem chi tiết</button></div>`).join('');
      list.querySelectorAll('.openattempt').forEach(button => { button.onclick = () => loadAttempt(button.dataset.id); });
      return attempts.length ? '' : 'Chưa có lượt làm bài nào.';
    })
  ]);
}

async function startAttempt(id, premium) {
  const token = state.token;
  regionStatus('attempt-open-status', 'Đang mở lượt luyện tập…');
  try {
    const attempt = await api('/ms/v1/attempts', {method: 'POST', body: JSON.stringify({quizId: id})});
    if (state.token !== token) return;
    renderAttempt(attempt);
    regionStatus('attempt-open-status', 'Đã mở lượt luyện tập.');
  } catch (error) {
    let message = error.message;
    // Assessment uses the same 403 for permission and entitlement failures.
    if (error.status === 403 && premium && state.token === token
      && (state.permissions.includes('assessment:submit') || state.roles.includes('ADMIN'))) {
      try {
        const member = await api('/api/v1/memberships/me');
        if (member?.planCode === 'FREE') message = 'Đề này yêu cầu gói PRO. Xem quyền lợi trong mục Gói thành viên.';
      } catch (membershipError) {
        if (membershipError.status === 401) message = membershipError.message;
      }
    }
    if (state.token === token) regionStatus('attempt-open-status', 'Không thể bắt đầu lượt luyện tập. ' + message, true);
  }
}

async function loadAttempt(id) {
  const token = state.token;
  regionStatus('attempt-open-status', 'Đang tải lượt luyện tập…');
  try {
    const attempt = await api('/ms/v1/attempts/' + id);
    if (state.token !== token) return;
    renderAttempt(attempt);
    regionStatus('attempt-open-status', '');
  } catch (error) {
    if (state.token === token) regionStatus('attempt-open-status', 'Không thể mở lượt luyện tập. ' + error.message, true);
  }
}
function updateAttemptControls(attemptId, edits) {
  const attempt = state.active;
  if (attempt?.id !== attemptId || attempt.status === 'GRADED') return;

  const pending = [...edits.answers.values()].some(answer => answer.pending);
  const failed = attempt.questions.flatMap((q, i) => edits.answers.get(q.id)?.failed ? [i + 1] : []);
  const submit = $('submit-attempt');
  submit.disabled = edits.submitting || pending || failed.length > 0;
  submit.textContent = edits.submitting ? 'Đang nộp bài…' : 'Nộp bài và chấm điểm';
  $('retry-answers').classList.toggle('hidden', failed.length === 0);
  const errorMessages = [...new Set([...edits.answers.values()].filter(answer => answer.failed).map(answer => answer.error))];
  regionStatus('answer-save-status', failed.length
    ? `Không lưu được đáp án ở câu ${failed.join(', ')}. ${errorMessages.join(' ')} Hãy thử lưu lại trước khi nộp bài.`
    : pending ? 'Đang lưu đáp án…' : 'Lựa chọn được lưu tự động từng câu.', failed.length > 0);
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

function renderAttempt(a) {
  const graded = a.status === 'GRADED';
  if (!graded && state.active?.id === a.id && state.active.status === 'GRADED') return;
  state.active = a;
  if (graded) attemptEdits.delete(a.id);
  if (!graded && !attemptEdits.has(a.id)) {
    attemptEdits.set(a.id, {answers: new Map(), submitting: false});
  }
  const edits = attemptEdits.get(a.id);
  const area = $('attempt-area');
  area.classList.remove('hidden');
  area.innerHTML = `<div class="sectionhead"><div><span class="eyebrow">ATTEMPT ${html(a.id.slice(0,8))}</span><h3 id="attempt-title" tabindex="-1">${graded?'Kết quả: '+a.correct+'/'+a.total:'Đang làm bài · '+a.total+' câu'}</h3></div><span class="pill">${html(a.status)}</span></div>`
    + a.questions.map((q, i) => {
      const selected = edits?.answers.get(q.id)?.choice ?? q.selectedChoice;
      const options = Object.entries(q.choices).map(([key, value]) =>
        `<label class="option"><input type="radio" name="q-${html(q.id)}" value="${html(key)}" ${selected === key ? 'checked' : ''} ${graded ? 'disabled' : ''}> ${html(key)}. ${html(value)}</label>`
      ).join('');
      const result = graded ? `<p class="${q.correct?'statusgood':'statusbad'}">${q.correct?'Đúng':'Sai hoặc bỏ trống'} · ${html(q.explanation)}</p>` : '';
      return `<fieldset class="question"><legend>Câu ${i + 1}. ${html(q.prompt)}</legend><div class="options">${options}</div>${result}</fieldset>`;
    }).join('')
    + (graded ? '<p class="statusgood">Bài đã chấm. Nộp lại sẽ trả kết quả đã lưu.</p>' : `
      <button type="button" class="primary" id="submit-attempt" aria-describedby="answer-save-status">Nộp bài và chấm điểm</button>
      <button type="button" class="ghost hidden" id="retry-answers">Thử lưu lại đáp án</button>
      <p class="region-status" id="answer-save-status" role="status"></p>`);

  if (!graded) {
    document.querySelectorAll('#attempt-area input[type=radio]').forEach(input => {
      input.onchange = () => {
        if (state.active !== a || edits.submitting) return;
        const questionId = input.name.slice(2);
        const answer = edits.answers.get(questionId) ?? {pending: false, failed: false};
        answer.choice = input.value;
        edits.answers.set(questionId, answer);
        return saveAnswer(a.id, questionId, edits, answer);
      };
    });
    $('retry-answers').onclick = () => Promise.all([...edits.answers]
      .filter(([, answer]) => answer.failed)
      .map(([questionId, answer]) => saveAnswer(a.id, questionId, edits, answer)));
    $('submit-attempt').onclick = async () => {
      if (state.active !== a || edits.submitting || [...edits.answers.values()].some(answer => answer.pending || answer.failed)) return;
      edits.submitting = true;
      updateAttemptControls(a.id, edits);
      try {
        const updated = await api(`/ms/v1/attempts/${a.id}/submit`, {method: 'POST'});
        if (attemptEdits.get(a.id) !== edits) return;
        if (state.active?.id === a.id) renderAttempt(updated);
        else attemptEdits.delete(a.id);
        await loadPractice();
      } catch (error) {
        if (state.active?.id === a.id) alertMsg(`Không thể nộp bài: ${error.message}`);
      } finally {
        edits.submitting = false;
        if (attemptEdits.get(a.id) === edits) updateAttemptControls(a.id, edits);
      }
    };
    updateAttemptControls(a.id, edits);
  }
  $('attempt-title').focus?.();
}
function showMembership(member) {
  $('stat-plan').textContent = member.planCode;
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
      $('activity-list').innerHTML = activities.map(a =>
        `<div class="feeditem">${html(a.kind)} · ${html(a.attemptId)} · ${html(a.recordedAt)}</div>`).join('');
      return activities.length ? '' : 'Chưa có hoạt động được xử lý. Hoạt động có thể xuất hiện sau khi bài được chấm.';
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
    alertMsg('Đã lưu đánh giá.');
    if ($('review-quiz').value === id) await loadReviews();
  } catch (error) {
    if (state.token === token) alertMsg('Không thể lưu đánh giá. ' + error.message);
  }
};

restoreSession();

$('teacher-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);const question={prompt:f.get('prompt'),a:f.get('a'),b:f.get('b'),c:f.get('c'),d:f.get('d'),answer:f.get('answer'),explanation:f.get('explanation')};try{const q=await api('/ms/v1/contents/quizzes',{method:'POST',body:JSON.stringify({title:f.get('title'),part:Number(f.get('part')),premium:f.get('premium')==='true',questions:[question]})});alertMsg('Đã xuất bản đề '+q.title);e.target.reset();}catch(err){alertMsg(err.message)}};
$('admin-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{const r=await api('/ms/v1/identity/admin/users/'+encodeURIComponent(f.get('userId'))+'/roles',{method:'POST',body:JSON.stringify({role:f.get('role')})});alertMsg('Đã cấp quyền: '+r.roles.join(', '));}catch(err){alertMsg(err.message)}};
