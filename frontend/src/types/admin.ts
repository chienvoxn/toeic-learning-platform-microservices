import { PublicQuestion } from './quiz';

export interface DirectoryUser {
  userId: string;
  email: string;
  displayName: string;
  roles: string[];
}

export interface UserDirectoryPage {
  users: DirectoryUser[];
  total: number;
  page: number;
  size: number;
}

export interface RbacAccess {
  roles: string[];
  permissions: string[];
}

export interface AdminQuiz {
  id: string;
  title: string;
  part: number;
  premium: boolean;
  count: number;
  status: 'PUBLISHED' | 'DRAFT';
  version: number;
  ownerUserId: string;
}

export interface AdminQuizzes {
  quizzes: AdminQuiz[];
  total: number;
  page: number;
  size: number;
}

export interface AdminQuizDetail {
  quiz: AdminQuiz;
  questions: PublicQuestion[];
}

export interface VisibilityChangePayload {
  version: number;
  published: boolean;
}
