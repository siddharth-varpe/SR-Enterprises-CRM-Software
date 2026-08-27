import { QueryClient } from '@tanstack/react-query';

/**
 * High-performance TanStack QueryClient for SR Enterprises CRM
 * Fast caching with 30s staleTime and instant page mounting
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds fresh cache for instant page switching
      gcTime: 10 * 60 * 1000, // 10 minutes cache retention in memory
      retry: 1, // Retry once on transient network glitch
      refetchOnWindowFocus: false, // Prevent distracting flickers on alt-tab
      refetchOnReconnect: true,
      refetchOnMount: true, // Always verify and fetch latest data on page visit
    },
    mutations: {
      retry: 1,
    },
  },
});
