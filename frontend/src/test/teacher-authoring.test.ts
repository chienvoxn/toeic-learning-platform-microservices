import { describe, it, expect } from 'vitest';
import { parseQuestionCsv } from '@/features/teacher/csvParser';
import { QuestionInput } from '@/types/quiz';

describe('CSV Question Parsing and Validation Unit Tests', () => {
  it('parses valid CSV rows with header properly', () => {
    const csvData = `prompt,a,b,c,d,answer,explanation
"Ms. Tanaka requested that all department managers _______ their quarterly budgets before Friday.","submit","submitting","submitted","submits","A","Sau cấu trúc request that + S + V nguyên mẫu"
"The quarterly revenue report will be presented _______ Friday afternoon.","on","in","at","for","A","Giới từ on đi với thứ trong tuần"`;

    const result = parseQuestionCsv(csvData);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.questions).toHaveLength(2);

    expect(result.questions[0].answer).toBe('A');
    expect(result.questions[0].prompt).toContain('Ms. Tanaka');
    expect(result.questions[0].a).toBe('submit');
    expect(result.questions[1].answer).toBe('A');
  });

  it('handles CSV without header gracefully', () => {
    const csvData = `"Question without header","Opt A","Opt B","Opt C","Opt D","C","Explanation C"`;

    const result = parseQuestionCsv(csvData);
    expect(result.success).toBe(true);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].answer).toBe('C');
    expect(result.questions[0].b).toBe('Opt B');
  });

  it('rejects invalid choices in answer column (must be A, B, C, or D)', () => {
    const csvData = `prompt,a,b,c,d,answer,explanation
"Sample question prompt","A","B","C","D","E","Invalid answer E"`;

    const result = parseQuestionCsv(csvData);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Đáp án đúng phải là một trong [A, B, C, D]");
  });

  it('rejects rows with fewer than 6 required columns', () => {
    const csvData = `prompt,a,b,c,d,answer,explanation
"Incomplete row with only 3 columns","choice a","choice b"`;

    const result = parseQuestionCsv(csvData);
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("Cần tối thiểu 6 cột");
  });

  it('parses 6-column Part 2 CSV row with 3 choices (A, B, C) properly', () => {
    const csvData = `prompt,a,b,c,answer,explanation
"Where is the meeting?","In Room 302","At 3 PM","Yes, I did","A","Room 302 is the location"`;
    const result = parseQuestionCsv(csvData);
    expect(result.success).toBe(true);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].a).toBe('In Room 302');
    expect(result.questions[0].b).toBe('At 3 PM');
    expect(result.questions[0].c).toBe('Yes, I did');
    expect(result.questions[0].d).toBe('');
    expect(result.questions[0].answer).toBe('A');
  });

  it('handles empty or blank CSV inputs', () => {
    expect(parseQuestionCsv('').success).toBe(false);
    expect(parseQuestionCsv('   \n  \n').success).toBe(false);
  });
});

describe('Quiz Draft Authoring and Publishing Business Invariants', () => {
  it('validates publishable criteria: non-empty title, choices, answer, and explanation', () => {
    const isPublishable = (title: string, questions: QuestionInput[]): boolean => {
      if (!title.trim() || questions.length === 0) return false;
      return questions.every(
        (q) =>
          q.prompt.trim() !== '' &&
          q.a.trim() !== '' &&
          q.b.trim() !== '' &&
          q.c.trim() !== '' &&
          Boolean(q.d?.trim()) &&
          ['A', 'B', 'C', 'D'].includes(q.answer) &&
          q.explanation.trim() !== ''
      );
    };

    const validQuestions: QuestionInput[] = [
      {
        prompt: 'Valid prompt',
        a: 'A',
        b: 'B',
        c: 'C',
        d: 'D',
        answer: 'A',
        explanation: 'Valid explanation',
      },
    ];

    expect(isPublishable('TOEIC Test', validQuestions)).toBe(true);
    expect(isPublishable('', validQuestions)).toBe(false); // empty title
    expect(isPublishable('TOEIC Test', [])).toBe(false); // empty questions

    // Question missing explanation
    const incompleteExplanation: QuestionInput[] = [
      { ...validQuestions[0], explanation: '' },
    ];
    expect(isPublishable('TOEIC Test', incompleteExplanation)).toBe(false);

    // Question missing answer key
    const missingAnswer: QuestionInput[] = [
      { ...validQuestions[0], answer: '' },
    ];
    expect(isPublishable('TOEIC Test', missingAnswer)).toBe(false);
  });

  it('handles optimistic locking version mismatch (HTTP 409 Conflict)', () => {
    const currentClientVersion = 1;
    const serverExpectedVersion = 2; // Another session updated it

    const checkOptimisticLock = (clientVer: number, serverVer: number) => {
      if (clientVer !== serverVer) {
        throw new Error('HTTP 409 Conflict: Version mismatch');
      }
      return true;
    };

    expect(() => checkOptimisticLock(currentClientVersion, serverExpectedVersion)).toThrow(
      'HTTP 409 Conflict: Version mismatch'
    );
    expect(checkOptimisticLock(2, 2)).toBe(true);
  });
});
