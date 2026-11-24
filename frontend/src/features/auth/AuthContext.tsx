import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserView, Session, RbacAccess } from '@/types/auth';
import { getAuthToken, setAuthToken, apiRequest } from '@/lib/api-client';
import { clearPrivateQueryCache } from '@/lib/query-client';

interface AuthContextType {
  user: UserView | null;
  roles: string[];
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (session: Session) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  refreshRbac: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserView | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRbacAndProfile = useCallback(async () => {
    try {
      const [userProfile, rbac] = await Promise.all([
        apiRequest<UserView>('/ms/v1/identity/me'),
        apiRequest<RbacAccess>('/ms/v1/identity/rbac/me'),
      ]);
      setUser(userProfile);
      setRoles(rbac.roles || []);
      setPermissions(rbac.permissions || []);
    } catch (error) {
      console.warn('Phiên đăng nhập không hợp lệ hoặc đã hết hạn:', error);
      setAuthToken(null);
      setUser(null);
      setRoles([]);
      setPermissions([]);
      clearPrivateQueryCache();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      fetchRbacAndProfile();
    } else {
      setIsLoading(false);
    }
  }, [fetchRbacAndProfile]);

  const login = async (session: Session) => {
    setAuthToken(session.accessToken);
    setUser(session.user);
    await fetchRbacAndProfile();
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setRoles([]);
    setPermissions([]);
    clearPrivateQueryCache();
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    if (user.role === role) return true;
    return roles.includes(role);
  };

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const refreshRbac = async () => {
    if (getAuthToken()) {
      await fetchRbacAndProfile();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        permissions,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
        hasPermission,
        refreshRbac,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
