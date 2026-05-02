"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";



export default function QueryProvider({ children }: { children: ReactNode }) {

  const [queryClient] = useState(() => new QueryClient(
    {
      defaultOptions: {
        queries: {
          staleTime: 30000, // 30 seconds
          refetchOnWindowFocus: false, // Don't refetch on focus
        },
      },
    }
  ));
  
return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
