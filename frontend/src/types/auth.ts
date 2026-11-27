export interface UserView {
  userId: string;
  email: string;
  displayName: string;
  role: 'LEARNER' | 'TEACHER' | 'ADMIN';
  roles?: string[];
}

export interface Session {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserView;
}

export type {
  RbacAccess,
  DirectoryUser as UserDirectoryItem,
  UserDirectoryPage,
} from './admin';
