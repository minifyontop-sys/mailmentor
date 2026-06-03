"use client";

import { SWRConfig } from "swr";
import { ToastProvider } from "@/components/Toast";
import { safeJson } from "@/lib/utils";

const fetcher = (url: string) =>
  fetch(url).then(async (r) => {
    if (!r.ok) {
      const j = (await safeJson(r, {})) as { error?: string };
      throw new Error(j?.error ?? `Request failed: ${r.status}`);
    }
    return safeJson(r, null);
  });

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: true,
        shouldRetryOnError: false,
      }}
    >
      <ToastProvider>{children}</ToastProvider>
    </SWRConfig>
  );
}
