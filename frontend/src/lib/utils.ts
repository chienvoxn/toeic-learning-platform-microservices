import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPartName(part: number): string {
  switch (part) {
    case 1: return 'Part 1: Mô tả hình ảnh (Photographs)';
    case 2: return 'Part 2: Hỏi & Đáp (Question-Response)';
    case 3: return 'Part 3: Đoạn hội thoại (Conversations)';
    case 4: return 'Part 4: Bài nói ngắn (Short Talks)';
    case 5: return 'Part 5: Hoàn thành câu (Incomplete Sentences)';
    case 6: return 'Part 6: Hoàn thành đoạn văn (Text Completion)';
    case 7: return 'Part 7: Đọc hiểu đoạn văn (Reading Comprehension)';
    default: return `Part ${part}`;
  }
}

export function isListeningPart(part: number): boolean {
  return part >= 1 && part <= 4;
}

export function isReadingPart(part: number): boolean {
  return part >= 5 && part <= 7;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
