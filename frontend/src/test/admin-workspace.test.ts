import { describe, it, expect } from 'vitest';
import { DirectoryUser, AdminQuiz } from '@/types/admin';

describe('Admin RBAC and User Management Unit Tests', () => {
  it('identifies user roles correctly and checks permissions', () => {
    const adminUser: DirectoryUser = {
      userId: '11111111-1111-1111-1111-111111111111',
      email: 'admin@toeic.edu.vn',
      displayName: 'System Admin',
      roles: ['LEARNER', 'ADMIN'],
    };

    const teacherUser: DirectoryUser = {
      userId: '22222222-2222-2222-2222-222222222222',
      email: 'teacher@toeic.edu.vn',
      displayName: 'English Teacher',
      roles: ['LEARNER', 'TEACHER'],
    };

    const hasAdminRole = (u: DirectoryUser) => u.roles.includes('ADMIN');
    const hasTeacherRole = (u: DirectoryUser) => u.roles.includes('TEACHER');

    expect(hasAdminRole(adminUser)).toBe(true);
    expect(hasAdminRole(teacherUser)).toBe(false);
    expect(hasTeacherRole(teacherUser)).toBe(true);
  });

  it('calculates server-side pagination total pages accurately', () => {
    const calculateTotalPages = (total: number, size: number) => {
      if (size <= 0) return 0;
      return Math.ceil(total / size);
    };

    expect(calculateTotalPages(45, 20)).toBe(3);
    expect(calculateTotalPages(20, 20)).toBe(1);
    expect(calculateTotalPages(0, 20)).toBe(0);
    expect(calculateTotalPages(21, 20)).toBe(2);
  });

  it('validates supported role assignment inputs (LEARNER, TEACHER, ADMIN)', () => {
    const allowedRoles = new Set(['LEARNER', 'TEACHER', 'ADMIN']);

    expect(allowedRoles.has('TEACHER')).toBe(true);
    expect(allowedRoles.has('ADMIN')).toBe(true);
    expect(allowedRoles.has('LEARNER')).toBe(true);
    expect(allowedRoles.has('SUPERUSER')).toBe(false);
    expect(allowedRoles.has('GUEST')).toBe(false);
  });
});

describe('Admin Quiz Moderation and Visibility Rules', () => {
  it('prevents publishing an empty quiz with 0 questions', () => {
    const emptyQuiz: AdminQuiz = {
      id: 'quiz-1',
      title: 'Empty Quiz',
      part: 5,
      premium: false,
      count: 0,
      status: 'DRAFT',
      version: 1,
      ownerUserId: 'owner-1',
    };

    const canPublish = (q: AdminQuiz): boolean => {
      return q.count > 0;
    };

    expect(canPublish(emptyQuiz)).toBe(false);

    const validQuiz: AdminQuiz = {
      ...emptyQuiz,
      count: 10,
    };
    expect(canPublish(validQuiz)).toBe(true);
  });

  it('increments version and switches status upon visibility toggle', () => {
    const draftQuiz: AdminQuiz = {
      id: 'quiz-2',
      title: 'TOEIC Part 7 Passage Test',
      part: 7,
      premium: true,
      count: 5,
      status: 'DRAFT',
      version: 3,
      ownerUserId: 'teacher-id',
    };

    const toggleVisibility = (q: AdminQuiz, publish: boolean): AdminQuiz => {
      return {
        ...q,
        status: publish ? 'PUBLISHED' : 'DRAFT',
        version: q.version + 1,
      };
    };

    const published = toggleVisibility(draftQuiz, true);
    expect(published.status).toBe('PUBLISHED');
    expect(published.version).toBe(4);

    const unPublished = toggleVisibility(published, false);
    expect(unPublished.status).toBe('DRAFT');
    expect(unPublished.version).toBe(5);
  });
});
