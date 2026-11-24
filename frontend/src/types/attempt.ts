export interface AttemptQuestion {
  id: string;
  position: number;
  prompt: string;
  choices: Record<'A' | 'B' | 'C' | 'D', string>;
  selectedChoice: string | null;
  correct: boolean | null;       // Null when IN_PROGRESS, boolean when GRADED
  explanation: string | null;   // Null when IN_PROGRESS, string when GRADED
}

export interface AttemptView {
  id: string;
  quizId: string;
  status: 'IN_PROGRESS' | 'GRADED';
  total: number;
  correct: number | null;
  createdAt: string;
  questions: AttemptQuestion[];
}

export interface AnswerPayload {
  choice: 'A' | 'B' | 'C' | 'D';
}
