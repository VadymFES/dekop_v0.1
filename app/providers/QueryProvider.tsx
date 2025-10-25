"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Request Deduplication Settings
        staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
        gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache (formerly cacheTime)

        // Prevent unnecessary refetches
        refetchOnWindowFocus: false,
        refetchOnMount: false, // Don't refetch if data is fresh
        refetchOnReconnect: false,

        // Retry configuration
        retry: 1, // Only retry failed requests once
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // Network mode
        networkMode: 'online',
      },
      mutations: {
        // Retry mutations only on network errors
        retry: 1,
        networkMode: 'online',
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
