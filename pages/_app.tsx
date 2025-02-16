// pages/_app.tsx

import QueryProvider from "@/app/providers/QueryProvider";
import type { AppProps } from "next/app";

export default function Pages({ Component, pageProps }: AppProps) {
  return (
    <QueryProvider>
      <Component {...pageProps} />
    </QueryProvider>
  );
}
