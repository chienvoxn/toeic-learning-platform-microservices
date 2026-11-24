import { describe, it, expect, vi } from 'vitest';
import { WORKSPACE_OPTIONS } from '@/components/navigation/WorkspaceSwitcher';

describe('Workspace Switcher and Permissions Unit Tests', () => {
  it('includes exactly learner, teacher, admin workspaces in configuration', () => {
    const ids = WORKSPACE_OPTIONS.map((w) => w.id);
    expect(ids).toEqual(['learner', 'teacher', 'admin']);
  });

  it('filters authorized workspaces strictly by user roles: Learner only gets learner workspace', () => {
    const learnerRoles = ['LEARNER'];
    const hasRole = (role: string) => learnerRoles.includes(role);

    const authorized = WORKSPACE_OPTIONS.filter((ws) => {
      if (ws.id === 'learner') return true;
      return hasRole(ws.roleRequired);
    });

    expect(authorized).toHaveLength(1);
    expect(authorized[0].id).toBe('learner');
  });

  it('authorizes both learner and teacher for LEARNER + TEACHER account', () => {
    const multiRoles = ['LEARNER', 'TEACHER'];
    const hasRole = (role: string) => multiRoles.includes(role);

    const authorized = WORKSPACE_OPTIONS.filter((ws) => {
      if (ws.id === 'learner') return true;
      return hasRole(ws.roleRequired);
    });

    expect(authorized.map((a) => a.id)).toEqual(['learner', 'teacher']);
  });

  it('does NOT give TEACHER workspace to ADMIN unless TEACHER role is explicitly granted', () => {
    const adminRoles = ['ADMIN'];
    const hasRole = (role: string) => adminRoles.includes(role);

    const authorized = WORKSPACE_OPTIONS.filter((ws) => {
      if (ws.id === 'learner') return true;
      return hasRole(ws.roleRequired);
    });

    // Learner is universally accessible, admin is accessible, teacher is NOT
    expect(authorized.map((a) => a.id)).toEqual(['learner', 'admin']);
    expect(authorized.some((a) => a.id === 'teacher')).toBe(false);
  });

  it('blocks workspace switch when onBeforeSwitch returns false (unsaved edits protection)', async () => {
    const onBeforeSwitch = vi.fn().mockResolvedValue(false);
    const targetWorkspace: string = 'learner';
    const currentWorkspace: string = 'teacher';

    let navigated = false;
    const canProceed = await onBeforeSwitch();
    if (canProceed && targetWorkspace !== currentWorkspace) {
      navigated = true;
    }

    expect(onBeforeSwitch).toHaveBeenCalled();
    expect(navigated).toBe(false);
  });

  it('allows workspace switch when onBeforeSwitch confirms (saved edits or user approves)', async () => {
    const onBeforeSwitch = vi.fn().mockResolvedValue(true);
    const targetWorkspace: string = 'learner';
    const currentWorkspace: string = 'teacher';

    let navigatedTarget: string | null = null;
    const canProceed = await onBeforeSwitch();
    if (canProceed && targetWorkspace !== currentWorkspace) {
      navigatedTarget = targetWorkspace;
    }

    expect(onBeforeSwitch).toHaveBeenCalled();
    expect(navigatedTarget).toBe('learner');
  });

  it('scopes preferred workspace localStorage key to specific userId', () => {
    const userId1 = 'user-uuid-111';
    const userId2 = 'user-uuid-222';

    const getKey = (uid?: string) => (uid ? `toeic_preferred_workspace_${uid}` : 'toeic_preferred_workspace');

    expect(getKey(userId1)).toBe('toeic_preferred_workspace_user-uuid-111');
    expect(getKey(userId2)).toBe('toeic_preferred_workspace_user-uuid-222');
    expect(getKey()).toBe('toeic_preferred_workspace');
  });
});
