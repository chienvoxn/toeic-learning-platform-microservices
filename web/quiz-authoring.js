"use strict";

const QuizAuthoring = (() => {
  const maxQuestions = 200;
  const maxCsvBytes = 1024 * 1024;
  const maxRequestBytes = 2 * 1024 * 1024;
  const choices = ['A', 'B', 'C', 'D'];
  const fields = {
    prompt: 'Đề bài', a: 'Phương án A', b: 'Phương án B', c: 'Phương án C',
    d: 'Phương án D', answer: 'Đáp án đúng', explanation: 'Giải thích'
  };
  const csvFields = {
    question_text: 'prompt', option_a: 'a', option_b: 'b', option_c: 'c',
    option_d: 'd', correct_answer: 'answer', explanation: 'explanation'
  };
  const columns = ['question_no', 'part', ...Object.keys(csvFields)];
  const blankQuestion = () => Object.fromEntries(Object.keys(fields).map(key => [key, '']));
  const validateTitle = title => !title ? 'Nhập tên đề.' : title.length > 255 ? 'Tên đề tối đa 255 ký tự.' : '';
  const validationMessage = 'Kiểm tra các trường được đánh dấu trước khi xem trước đề.';

  function normalizeQuestion(question) {
    return Object.fromEntries(Object.keys(fields).map(key => [key, question[key].trim()]));
  }

  function validateQuestion(question) {
    const result = {};
    for (const [key, value] of Object.entries(normalizeQuestion(question))) {
      if (!value) result[key] = 'Bắt buộc.';
      else if (key === 'answer' && !choices.includes(value)) result[key] = 'Chọn A, B, C hoặc D.';
      else if (choices.includes(key.toUpperCase()) && value.length > 255) {
        result[key] = 'Tối đa 255 ký tự.';
      } else if (['prompt', 'explanation'].includes(key) && value.length > 10000) {
        result[key] = 'Tối đa 10.000 ký tự.';
      }
    }
    const seen = new Set();
    for (const choice of choices) {
      const key = choice.toLowerCase();
      const value = question[key].trim();
      if (value && seen.has(value) && !result[key]) result[key] = 'Trùng với một phương án trước.';
      seen.add(value);
    }
    return result;
  }

  function createDraft() {
    const draft = {title: '', part: '5', access: 'false', questions: [blankQuestion()]};
    const placeholder = () => draft.questions.length === 1 && Object.values(draft.questions[0]).every(value => !value);
    return {
      draft,
      hasChanges: () => Boolean(draft.title || draft.part !== '5' || draft.access !== 'false' || !placeholder()),
      add(index = draft.questions.length, question = blankQuestion()) {
        if (draft.questions.length >= maxQuestions) return false;
        draft.questions.splice(index, 0, {...question});
        return true;
      },
      remove(index) {
        draft.questions.splice(index, 1);
        if (!draft.questions.length) draft.questions.push(blankQuestion());
      },
      move(index, target) {
        if (target < 0 || target >= draft.questions.length) return false;
        const [question] = draft.questions.splice(index, 1);
        draft.questions.splice(target, 0, question);
        return true;
      },
      importCount: questions => (placeholder() ? 0 : draft.questions.length) + questions.length,
      importQuestions(questions) {
        const start = placeholder() ? 0 : draft.questions.length;
        if (!questions.length || start + questions.length > maxQuestions) return -1;
        if (!start) draft.questions = [];
        draft.questions.push(...questions.map(question => ({...question})));
        return start;
      }
    };
  }

  function prepareQuiz(draft) {
    const title = draft.title.trim();
    const titleError = validateTitle(title);
    const questions = draft.questions.map(validateQuestion);
    const problem = questions.findIndex(errors => Object.keys(errors).length);
    if (titleError || problem !== -1) return {titleError, questions, problem};
    const payload = {title, part: Number(draft.part), premium: draft.access === 'true',
      questions: draft.questions.map(normalizeQuestion)};
    const body = JSON.stringify(payload);
    if (new TextEncoder().encode(body).length > maxRequestBytes) {
      return {error: 'Nội dung gửi vượt quá 2 MiB. Hãy rút gọn câu hỏi hoặc lời giải.'};
    }
    return {payload, body};
  }

  function prepareDraft(draft) {
    if (draft.title.length > 255) return {error: 'Tên đề tối đa 255 ký tự.'};
    for (const [index, question] of draft.questions.entries()) {
      for (const key of ['prompt', 'a', 'b', 'c', 'd', 'explanation']) {
        const limit = key === 'prompt' || key === 'explanation' ? 10000 : 255;
        if (question[key].length > limit) return {error: `Câu ${index + 1}, ${fields[key]} tối đa ${limit} ký tự.`};
      }
    }
    const body = JSON.stringify({title: draft.title, part: Number(draft.part), premium: draft.access === 'true',
      questions: draft.questions});
    return new TextEncoder().encode(body).length > maxRequestBytes
      ? {error: 'Nội dung gửi vượt quá 2 MiB. Hãy rút gọn câu hỏi hoặc lời giải.'} : {body};
  }

  function readCsvRows(input) {
    const text = input.replace(/^\uFEFF/, '');
    const rows = [];
    let values = [];
    let value = '';
    let mode = 'start';
    let line = 1;
    let recordLine = 1;
    const endField = () => {
      values.push(value);
      value = '';
      mode = 'start';
    };
    const endRow = () => {
      endField();
      if (values.length > 1 || values[0] !== '') rows.push({line: recordLine, values});
      values = [];
    };
    const syntax = message => new Error(`Dòng ${line}, cột ${values.length + 1}: ${message}`);
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '\r' || char === '\n') {
        if (char === '\r' && text[i + 1] === '\n') i++;
        if (mode === 'quoted') value += '\n';
        else endRow();
        line++;
        if (mode !== 'quoted') recordLine = line;
      } else if (mode === 'quoted') {
        if (char !== '"') value += char;
        else if (text[i + 1] === '"') {
          value += '"';
          i++;
        } else mode = 'closed';
      } else if (char === ',') {
        endField();
      } else if (mode === 'closed') {
        throw syntax('Chỉ chấp nhận dấu phẩy hoặc xuống dòng sau dấu nháy đóng.');
      } else if (char === '"') {
        if (mode !== 'start') throw syntax('Dấu nháy phải nằm ở đầu trường hoặc được viết thành hai dấu nháy.');
        mode = 'quoted';
      } else {
        value += char;
        mode = 'plain';
      }
    }
    if (mode === 'quoted') throw syntax('Thiếu dấu nháy đóng.');
    if (values.length || value || mode === 'closed') endRow();
    return rows;
  }

  function parseQuizCsv(text, part) {
    let rows;
    try {
      rows = readCsvRows(text);
    } catch (error) {
      return {issues: [error.message], questions: []};
    }
    const [header, ...data] = rows;
    if (!header) return {issues: ['Tệp CSV trống.'], questions: []};
    const labels = header.values.map(value => value.trim());
    const issues = [];
    const issue = (line, column, message) => issues.push(`Dòng ${line}, cột ${column}: ${message}`);
    labels.forEach((label, index) => {
      if (!columns.includes(label)) issue(header.line, index + 1, 'Tên cột không hợp lệ.');
      else if (labels.indexOf(label) !== index) issue(header.line, label, 'Tên cột bị lặp.');
    });
    for (const name of columns) {
      if (!labels.includes(name)) issue(header.line, name, 'Thiếu cột bắt buộc.');
    }
    if (issues.length) return {issues, questions: []};
    if (!data.length) return {issues: ['Tệp CSV chưa có câu hỏi.'], questions: []};
    if (data.length > maxQuestions) {
      return {issues: [`Dòng ${data[maxQuestions].line}: Tối đa 200 câu hỏi mỗi tệp.`], questions: []};
    }

    const numbered = new Map();
    for (const row of data) {
      if (row.values.length !== labels.length) {
        issue(row.line, Math.min(row.values.length, labels.length) + 1, 'Số cột không khớp tiêu đề.');
        continue;
      }
      const cells = Object.fromEntries(labels.map((label, index) => [label, row.values[index].trim()]));
      const number = Number(cells.question_no);
      if (!/^[1-9]\d*$/.test(cells.question_no) || !Number.isSafeInteger(number)) {
        issue(row.line, 'question_no', 'Cần số nguyên dương.');
      } else if (numbered.has(number)) {
        issue(row.line, 'question_no', `Số ${number} bị trùng.`);
      }
      if (!/^[1-7]$/.test(cells.part) || cells.part !== String(part)) {
        issue(row.line, 'part', `Phải khớp Part ${part} của đề.`);
      }
      const question = Object.fromEntries(Object.entries(csvFields).map(([column, key]) => [key, cells[column]]));
      question.answer = question.answer.toUpperCase();
      const errors = validateQuestion(question);
      for (const [column, key] of Object.entries(csvFields)) {
        if (errors[key]) issue(row.line, column, errors[key]);
      }
      if (!numbered.has(number)) numbered.set(number, {line: row.line, question});
    }
    if (issues.length) return {issues, questions: []};
    const sorted = [...numbered].sort(([a], [b]) => a - b);
    sorted.forEach(([number, row], index) => {
      if (number !== index + 1 && !issues.length) {
        issue(row.line, 'question_no', `Thứ tự phải liên tục từ 1 (thiếu số ${index + 1}).`);
      }
    });
    return {issues, questions: issues.length ? [] : sorted.map(([, row]) => row.question)};
  }

  async function readQuizFile(file, part) {
    if (file.size > maxCsvBytes) return {issues: ['Tệp vượt quá 1 MiB.'], questions: []};
    try {
      const text = new TextDecoder('utf-8', {fatal: true}).decode(await file.arrayBuffer());
      return parseQuizCsv(text, part);
    } catch {
      return {issues: ['Không đọc được tệp. Hãy chọn CSV mã hóa UTF-8.'], questions: []};
    }
  }

  function createEditor({byId, escape, confirm, load, save, publish, onSaved, onPublished, status}) {
    const el = name => byId('editor-' + name);
    const form = byId('teacher-form');
    const csvDialog = el('csv-dialog');
    const previewDialog = el('preview-dialog');
    let model = createDraft();
    let current = 0;
    let validationShown = false;
    let pendingCsv;
    let pendingQuiz;
    let fileRevision = 0;
    let writing = false;
    let writeEnabled = true;
    let draft;
    let requestedId;
    let baseline;
    let viewRevision = 0;
    const hasChanges = () => draft ? baseline !== JSON.stringify(model.draft) : model.hasChanges();

    function showDraftState() {
      el('draft-state').textContent = draft
        ? (hasChanges() ? 'Có thay đổi chưa lưu' : 'Bản nháp đã lưu')
        : 'Đề mới chưa lưu';
    }

    function previewQuestions(questions) {
      return `<ol class="editor-preview-questions">${questions.map((question, index) => `<li>
        <details ${index === 0 ? 'open' : ''}>
          <summary>Câu ${index + 1}. ${escape(question.prompt)}</summary>
          <ul>${choices.map(choice => `<li${choice === question.answer ? ' class="statusgood"' : ''}>
            ${choice}. ${escape(question[choice.toLowerCase()])}${choice === question.answer ? ' · Đáp án đúng' : ''}
          </li>`).join('')}</ul>
          <p><strong>Giải thích</strong> · ${escape(question.explanation)}</p>
        </details>
      </li>`).join('')}</ol>`;
    }

    function renderList() {
      const questions = model.draft.questions;
      let incompleteQuestions = false;
      el('question-count').textContent = `${questions.length} câu hỏi`;
      el('questions').innerHTML = questions.map((question, index) => {
        const incomplete = validationShown && Object.keys(validateQuestion(question)).length > 0;
        if (incomplete) incompleteQuestions = true;
        const preview = question.prompt.trim().slice(0, 65);
        return `<li><button type="button" class="ghost" data-question="${index}" ${index === current ? 'aria-current="true"' : ''}>
          <strong>Câu ${index + 1}</strong><span>${escape(preview || 'Chưa có đề bài')}</span>
          ${incomplete ? '<small class="statusbad">Cần kiểm tra</small>' : ''}
        </button></li>`;
      }).join('');
      el('add').disabled = el('duplicate').disabled = questions.length >= maxQuestions;
      el('up').disabled = current === 0;
      el('down').disabled = current === questions.length - 1;
      showDraftState();
      if (!incompleteQuestions && !validateTitle(model.draft.title.trim()) &&
        byId('teacher-status').textContent === validationMessage) status('teacher-status', '');
    }

    function markField(id, message) {
      if (message) el(id).setAttribute('aria-invalid', 'true');
      else el(id).removeAttribute('aria-invalid');
      el(id + '-error').textContent = message;
    }

    function showValidation() {
      const title = model.draft.title.trim();
      markField('title', validateTitle(title));
      const errors = validateQuestion(model.draft.questions[current]);
      for (const key of Object.keys(fields)) markField(key, errors[key] || '');
    }

    function renderQuestion() {
      const question = model.draft.questions[current];
      const field = key => {
        const attributes = `id="editor-${key}" name="${key}" data-field="${key}" required aria-describedby="editor-${key}-error"`;
        let control;
        if (key === 'answer') {
          control = `<select ${attributes}><option value="">Chọn đáp án</option>${choices.map(choice =>
            `<option${question[key] === choice ? ' selected' : ''}>${choice}</option>`).join('')}</select>`;
        } else if (['prompt', 'explanation'].includes(key)) {
          control = `<textarea ${attributes} rows="3">\n${escape(question[key])}</textarea>`;
        } else {
          control = `<input ${attributes} value="${escape(question[key])}">`;
        }
        return `<div><label>${fields[key]}${control}</label><p id="editor-${key}-error" class="editor-field-error"></p></div>`;
      };
      el('question-heading').textContent = `Câu ${current + 1}`;
      el('question-fields').innerHTML = field('prompt') + '<div class="formcolumns">' +
        ['a', 'b', 'c', 'd'].map(field).join('') + '</div>' + field('answer') + field('explanation');
      if (validationShown) showValidation();
    }

    function selectQuestion(index, focus = true) {
      current = index;
      renderQuestion();
      renderList();
      if (focus) el('question-heading').focus();
    }

    function clearCsv() {
      pendingCsv = null;
      el('csv-errors').innerHTML = '';
      el('csv-errors').classList.add('hidden');
      status('editor-csv-status', '');
    }

    function showCsvErrors(issues) {
      const list = el('csv-errors');
      status('editor-csv-status', `Có ${issues.length} lỗi trong tệp. Nội dung đang soạn được giữ lại.`, true);
      list.innerHTML = issues.map(issue => `<li>${escape(issue)}</li>`).join('');
      list.classList.remove('hidden');
      list.focus();
    }

    function dismissDialogs() {
      if (csvDialog.open) csvDialog.close();
      if (previewDialog.open) previewDialog.close();
      pendingQuiz = pendingCsv = null;
      fileRevision++;
      if (el('csv-status').textContent === 'Đang đọc tệp…') clearCsv();
    }

    function reset() {
      dismissDialogs();
      model = createDraft();
      draft = requestedId = baseline = null;
      viewRevision++;
      validationShown = false;
      form.reset();
      byId('teacher-fields').disabled = false;
      el('reload').classList.add('hidden');
      markField('title', '');
      clearCsv();
      status('teacher-status', '');
      selectQuestion(0, false);
    }

    function setDraft(detail) {
      draft = detail.quiz;
      requestedId = draft.id;
      Object.assign(model.draft, {title: draft.title, part: String(draft.part), access: String(draft.premium),
        questions: detail.questions.length ? detail.questions.map(question => ({...question})) : [blankQuestion()]});
      baseline = JSON.stringify(model.draft);
      el('title').value = model.draft.title;
      el('part').value = model.draft.part;
      el('access').value = model.draft.access;
      markField('title', '');
      validationShown = false;
      el('reload').classList.add('hidden');
      selectQuestion(Math.min(current, model.draft.questions.length - 1), false);
    }

    async function open(id = '', reload = false) {
      if (!reload && requestedId === id) return;
      reset();
      requestedId = id;
      if (!id) return;
      const revision = viewRevision;
      byId('teacher-fields').disabled = true;
      status('teacher-status', 'Đang tải bản nháp…');
      try {
        const detail = await load(id);
        if (viewRevision !== revision) return;
        setDraft(detail);
        byId('teacher-fields').disabled = false;
        status('teacher-status', '');
      } catch (error) {
        if (viewRevision !== revision) return;
        status('teacher-status', error.status === 409 ? 'Đề đã xuất bản. Hãy quay về Đề của tôi.' : error.message, true);
        el('reload').classList.toggle('hidden', error.status === 409);
      }
    }

    function writeError(error) {
      if (error.status === 409) {
        status('teacher-status', 'Phiên bản trên máy chủ đã thay đổi. Nội dung đang soạn vẫn được giữ. Hãy sao chép phần cần giữ trước khi tải lại.', true);
        el('reload').classList.remove('hidden');
      } else {
        const uncertain = error.status === 0 || error.status === 408 || error.status >= 500;
        status('teacher-status', uncertain
          ? 'Chưa xác nhận được kết quả. Hãy kiểm tra Đề của tôi trước khi thử lại.'
          : error.message, true);
      }
    }

    function setWriting(active, message = '') {
      writing = active;
      byId('teacher-fields').disabled = active;
      if (message) status('teacher-status', message);
    }

    function setWriteEnabled(enabled) {
      writeEnabled = enabled;
      el('save').disabled = !enabled;
      el('publish').disabled = !enabled || !pendingQuiz;
    }

    el('reload').onclick = () => {
      if (!requestedId || writing) return;
      if (hasChanges() && !confirm('Tải lại sẽ thay phần chưa lưu bằng bản trên máy chủ. Bạn có muốn tiếp tục?')) return;
      return open(requestedId, true);
    };
    el('save').onclick = async () => {
      if (!writeEnabled || writing || byId('teacher-fields').disabled) return;
      const input = prepareDraft(model.draft);
      if (input.error) {
        status('teacher-status', input.error, true);
        byId('teacher-status').focus();
        return;
      }
      dismissDialogs();
      setWriting(true, 'Đang lưu bản nháp…');
      try {
        const detail = await save(draft, input.body);
        setDraft(detail);
        onSaved(draft);
        status('teacher-status', 'Đã lưu bản nháp.');
      } catch (error) {
        writeError(error);
      } finally {
        setWriting(false);
        byId('teacher-status').focus();
      }
    };

    form.oninput = event => {
      const input = event.target;
      if (input.dataset.field) model.draft.questions[current][input.dataset.field] = input.value;
      else if (input === el('title')) model.draft.title = input.value;
      else if (input === el('part')) {
        model.draft.part = input.value;
        fileRevision++;
        clearCsv();
      } else if (input === el('access')) model.draft.access = input.value;
      else return;
      if (validationShown) showValidation();
      renderList();
    };
    el('questions').onclick = event => {
      const button = event.target.closest('button[data-question]');
      if (button) selectQuestion(Number(button.dataset.question));
    };
    el('add').onclick = () => {
      if (model.add()) selectQuestion(model.draft.questions.length - 1);
    };
    el('duplicate').onclick = () => {
      if (model.add(current + 1, model.draft.questions[current])) selectQuestion(current + 1);
    };
    el('up').onclick = () => { if (model.move(current, current - 1)) selectQuestion(current - 1); };
    el('down').onclick = () => { if (model.move(current, current + 1)) selectQuestion(current + 1); };
    el('delete').onclick = () => {
      if (!confirm(`Xóa câu ${current + 1} khỏi đề đang soạn?`)) return;
      model.remove(current);
      selectQuestion(Math.min(current, model.draft.questions.length - 1));
    };

    el('file').onchange = async event => {
      const file = event.target.files[0];
      event.target.value = '';
      if (!file || writing) return;
      const revision = ++fileRevision;
      const part = model.draft.part;
      clearCsv();
      status('editor-csv-status', 'Đang đọc tệp…');
      const {issues, questions} = await readQuizFile(file, part);
      if (revision !== fileRevision || writing) return;
      if (issues.length) return showCsvErrors(issues);
      if (model.importCount(questions) > maxQuestions) return showCsvErrors(['Tổng số câu sau khi nhập vượt quá 200.']);
      pendingCsv = questions;
      el('csv-preview-summary').textContent = `${questions.length} câu · Part ${part}. Câu nhập sẽ được thêm vào đề đang soạn.`;
      el('csv-preview').innerHTML = previewQuestions(questions);
      status('editor-csv-status', '');
      csvDialog.showModal();
    };
    el('csv-cancel').onclick = () => csvDialog.close();
    el('csv-apply').onclick = () => {
      if (!csvDialog.open || !pendingCsv) return;
      const count = pendingCsv.length;
      const start = model.importQuestions(pendingCsv);
      csvDialog.close();
      pendingCsv = null;
      if (start < 0) return showCsvErrors(['Tổng số câu sau khi nhập vượt quá 200.']);
      selectQuestion(start);
      status('editor-csv-status', `Đã thêm ${count} câu vào trình soạn.`);
    };

    form.onsubmit = event => {
      event.preventDefault();
      if (writing || byId('teacher-fields').disabled || previewDialog.open) return;
      const prepared = prepareQuiz(model.draft);
      if (prepared.error) {
        status('teacher-status', prepared.error, true);
        byId('teacher-status').focus();
        return;
      }
      if (!prepared.payload) {
        validationShown = true;
        selectQuestion(prepared.problem === -1 ? current : prepared.problem, false);
        status('teacher-status', validationMessage, true);
        el(prepared.titleError ? 'title' : Object.keys(prepared.questions[prepared.problem])[0]).focus();
        return;
      }
      dismissDialogs();
      pendingQuiz = draft && !hasChanges() ? draft : null;
      el('publish').disabled = !writeEnabled || !pendingQuiz;
      el('publish-note').textContent = !writeEnabled
        ? 'Chưa thể xuất bản. Quay lại trình soạn và kiểm tra kết nối với dịch vụ nội dung.'
        : pendingQuiz ? 'Đề sẽ xuất hiện trong thư viện ngay sau khi xuất bản.'
          : 'Lưu phiên bản đang xem dưới dạng nháp trước khi xuất bản.';
      const {title, part, premium, questions} = prepared.payload;
      el('preview').innerHTML = `<h3>${escape(title)}</h3>
        <p>Part ${part} · ${premium ? 'PRO' : 'FREE'} · ${questions.length} câu</p>${previewQuestions(questions)}`;
      previewDialog.showModal();
    };
    el('preview-cancel').onclick = () => previewDialog.close();
    el('publish').onclick = async () => {
      if (!writeEnabled || writing || !previewDialog.open || !pendingQuiz) return;
      const version = pendingQuiz;
      pendingQuiz = null;
      previewDialog.close();
      setWriting(true, 'Đang xuất bản đề…');
      let published;
      try {
        published = await publish(version);
        reset();
      } catch (error) {
        writeError(error);
      } finally {
        setWriting(false);
      }
      if (published) onPublished(published);
      else byId('teacher-status').focus();
    };

    reset();
    return {hasChanges, isSaving: () => writing, isOpen: id => requestedId === id,
      dismissDialogs, reset, open, setWriteEnabled};
  }

  return {createDraft, prepareQuiz, parseQuizCsv, readQuizFile, maxQuestions, fields, choices, createEditor};
})();
