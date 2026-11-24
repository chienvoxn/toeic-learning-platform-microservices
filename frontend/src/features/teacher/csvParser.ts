import { QuestionInput } from '@/types/quiz';

export interface CsvParseResult {
  success: boolean;
  questions: QuestionInput[];
  errors: string[];
}

/**
 * Parses CSV text for TOEIC Question import.
 * Expected columns:
 * prompt, a, b, c, d, answer, explanation
 *
 * Supports header detection, quoted multiline strings, trimming, and validation.
 */
export function parseQuestionCsv(csvContent: string): CsvParseResult {
  const errors: string[] = [];
  const questions: QuestionInput[] = [];

  if (!csvContent || csvContent.trim().length === 0) {
    return { success: false, questions: [], errors: ['Tệp CSV không có nội dung.'] };
  }

  // Regex-based robust CSV line parser handling quotes
  const lines = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const validLines = lines.filter((l) => l.trim().length > 0);

  if (validLines.length === 0) {
    return { success: false, questions: [], errors: ['Tệp CSV trống.'] };
  }

  // Helper to split a CSV line considering quotes
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  let startIndex = 0;
  const firstRow = parseLine(validLines[0]).map((h) => h.toLowerCase());
  // Detect if first row is a header
  if (
    firstRow.includes('prompt') ||
    firstRow.includes('câu hỏi') ||
    firstRow.includes('answer') ||
    firstRow.includes('đáp án')
  ) {
    startIndex = 1;
  }

  for (let i = startIndex; i < validLines.length; i++) {
    const rowNum = i + 1;
    const cols = parseLine(validLines[i]);

    if (cols.length < 6) {
      errors.push(`Dòng ${rowNum}: Cần tối thiểu 6 cột (prompt, a, b, c, [d], answer, explanation). Hiện có ${cols.length} cột.`);
      continue;
    }

    let prompt = '';
    let a = '';
    let b = '';
    let c = '';
    let d: string | null = null;
    let rawAnswer = '';
    let explanation = '';

    if (cols.length === 6) {
      // 3 choices (Part 2): prompt, a, b, c, answer, explanation
      [prompt, a, b, c, rawAnswer, explanation] = cols;
    } else {
      [prompt, a, b, c, d, rawAnswer, explanation] = cols;
      if (d && !d.trim()) d = null;
    }

    const answer = rawAnswer ? rawAnswer.trim().toUpperCase() : '';

    if (!prompt) {
      errors.push(`Dòng ${rowNum}: Nội dung câu hỏi (prompt) không được để trống.`);
      continue;
    }
    if (!a || !b || !c) {
      errors.push(`Dòng ${rowNum}: Các lựa chọn A, B, C không được để trống.`);
      continue;
    }
    const validLetters = d ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C'];
    if (answer && !validLetters.includes(answer)) {
      errors.push(`Dòng ${rowNum}: Đáp án đúng phải là một trong [${validLetters.join(', ')}] hoặc để trống (nếu là nháp). Nhận được: '${answer}'`);
      continue;
    }

    questions.push({
      prompt,
      a,
      b,
      c,
      d: d || '',
      answer,
      explanation: explanation || '',
    });
  }

  return {
    success: errors.length === 0 && questions.length > 0,
    questions,
    errors,
  };
}
