import { describe, it, expect } from 'vitest';
import { formatPartName, isListeningPart, isReadingPart, formatTime } from '../lib/utils';
import { sanitizeRedirectUrl } from '../components/navigation/ProtectedRoute';

describe('Frontend Utils and Domain Helpers', () => {
  it('correctly formats TOEIC part names', () => {
    expect(formatPartName(1)).toContain('Photographs');
    expect(formatPartName(5)).toContain('Incomplete Sentences');
    expect(formatPartName(7)).toContain('Reading Comprehension');
  });

  it('differentiates listening and reading parts', () => {
    expect(isListeningPart(1)).toBe(true);
    expect(isListeningPart(4)).toBe(true);
    expect(isListeningPart(5)).toBe(false);

    expect(isReadingPart(5)).toBe(true);
    expect(isReadingPart(7)).toBe(true);
    expect(isReadingPart(3)).toBe(false);
  });

  it('formats exam countdown time accurately', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(65)).toBe('01:05');
    expect(formatTime(3600)).toBe('60:00');
    expect(formatTime(7200)).toBe('120:00');
  });

  it('sanitizes redirect URLs against open redirect attacks', () => {
    expect(sanitizeRedirectUrl('/learner/quizzes')).toBe('/learner/quizzes');
    expect(sanitizeRedirectUrl('https://evil.com')).toBe('/learner/dashboard');
    expect(sanitizeRedirectUrl('//evil.com/hack')).toBe('/learner/dashboard');
    expect(sanitizeRedirectUrl('/\\evil.com')).toBe('/learner/dashboard');
    expect(sanitizeRedirectUrl(null)).toBe('/learner/dashboard');
  });
});
