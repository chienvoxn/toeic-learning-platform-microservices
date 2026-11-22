// QA-04 targets the public quiz list on the local Compose Gateway.
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '60s',
  summaryTrendStats: ['med', 'p(90)', 'p(95)', 'p(99)'],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate==1'],
  },
};

const base = (__ENV.GATEWAY_URL || 'http://127.0.0.1:8088').replace(/\/+$/, '');
if (!/^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(base)) {
  throw new Error('QA-04 requires an HTTP loopback Gateway URL with an explicit port');
}
http.setResponseCallback(http.expectedStatuses(200));

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isQuizView(quiz) {
  return quiz !== null && typeof quiz === 'object' && Object.keys(quiz).length === 5
    && typeof quiz.id === 'string' && uuidPattern.test(quiz.id)
    && typeof quiz.title === 'string' && quiz.title.trim().length > 0
    && Number.isInteger(quiz.part) && quiz.part >= 1 && quiz.part <= 7
    && typeof quiz.premium === 'boolean'
    && Number.isInteger(quiz.count) && quiz.count >= 0;
}

function hasQuizList(response) {
  try {
    const quizzes = response.json();
    return Array.isArray(quizzes) && quizzes.length > 0 && quizzes.every(isQuizView);
  } catch (_) {
    return false;
  }
}

export default function () {
  const response = http.get(`${base}/ms/v1/contents/quizzes`, { redirects: 0 });
  check(response, {
    'HTTP 200': (r) => r.status === 200,
    'JSON content type': (r) => /^application\/json(?:\s*;|$)/i.test(r.headers['Content-Type'] || ''),
    'non-empty public QuizView list': hasQuizList,
  });
  sleep(0.5);
}
