import QueryProvider from "@/app/providers/QueryProvider";
import type { AppProps } from "next/app";
import PagesLayout from "./layout";
import "@/app/globals.css";

export default function Pages({ Component, pageProps }: AppProps) {
  return (
    <QueryProvider>
      <PagesLayout>
        <Component {...pageProps} />
      </PagesLayout>
    </QueryProvider>
  );
}
