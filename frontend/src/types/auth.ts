export interface UserView {
  userId: string;
  email: string;
  displayName: string;
  role: 'LEARNER' | 'TEACHER' | 'ADMIN';
}

export interface Session {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserView;
}

export interface RbacAccess {
  userId: string;
  roles: string[];
  permissions: string[];
}

export interface UserDirectoryItem {
  userId: string;
  email: string;
  displayName: string;
  role: string;
  roles?: string[];
}

export interface UserDirectoryPage {
  users: UserDirectoryItem[];
  totalUsers: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
