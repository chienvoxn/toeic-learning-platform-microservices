export interface QuizView {
  id: string;
  title: string;
  part: number;
  premium: boolean;
  count: number;
}

export interface PublicQuestion {
  id: string;
  prompt: string;
  choices: Record<'A' | 'B' | 'C' | 'D', string>;
}

export interface QuizDetail {
  quiz: QuizView;
  questions: PublicQuestion[];
}

export interface QuestionInput {
  prompt: string;
  a: string;
  b: string;
  c: string;
  d: string;
  answer: string;
  explanation: string;
}

export interface QuizInput {
  title: string;
  part: number;
  premium: boolean;
  questions: QuestionInput[];
}

export interface OwnedQuiz {
  id: string;
  title: string;
  part: number;
  premium: boolean;
  count: number;
  status: 'PUBLISHED' | 'DRAFT';
  version: number;
}

export interface DraftDetail {
  quiz: OwnedQuiz;
  questions: QuestionInput[];
}

export interface AdminQuiz extends OwnedQuiz {
  ownerUserId: string;
}

export interface AdminQuizzes {
  quizzes: AdminQuiz[];
  total: number;
  page: number;
  size: number;
}
