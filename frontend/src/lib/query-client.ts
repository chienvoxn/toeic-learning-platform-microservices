import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/types/api';

/**
 * Global TanStack Query Client Configuration.
 *
 * Technical Corrections Enforced:
 * 1. Do not retry non-idempotent mutations blindly.
 * 2. Don't retry client errors (401, 403, 404, 409, 422).
 * 3. Clear private caches on logout via `clearPrivateQueryCache()`.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes default
      gcTime: 1000 * 60 * 15,    // 15 minutes garbage collection
      retry: (failureCount, error) => {
        if (error instanceof ApiError) {
          // Do not retry 4xx errors
          if (error.status >= 400 && error.status < 500) {
            return false;
          }
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Never retry mutations automatically to prevent duplicate side-effects
      retry: false,
    },
  },
});

/**
 * Purges all private/authenticated caches when the user logs out
 * or switches roles/accounts.
 */
export function clearPrivateQueryCache(): void {
  queryClient.removeQueries({
    predicate: (query) => {
      const key = query.queryKey[0];
      // Keep public quiz catalog, purge everything else
      return key !== 'public-quizzes';
    },
  });
}
