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
  choices: Record<string, string>;
  passageText?: string | null;
  audioUrl?: string | null;
  imageUrl?: string | null;
  groupId?: string | null;
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
  d?: string | null;
  answer: string;
  explanation: string;
  passageText?: string | null;
  audioUrl?: string | null;
  imageUrl?: string | null;
  groupId?: string | null;
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

export interface MediaUploadResponse {
  url: string;
  mediaType: string;
  size: number;
}
