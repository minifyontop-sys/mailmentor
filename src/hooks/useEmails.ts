"use client";

import useSWR from "swr";
import { useEmailStore } from "@/store/emailStore";
import type { Email } from "@/types";

interface ListResponse {
  messages: Email[];
  nextPageToken: string | null;
  account?: { id: string; provider: string; email: string; name?: string };
}

export function useEmails() {
  const activeId = useEmailStore((s) => s.activeAccountId);
  const key = activeId ? `/api/mail/messages?accountId=${encodeURIComponent(activeId)}` : null;

  const { data, error, isLoading, mutate, isValidating } = useSWR<ListResponse>(
    key,
    {
      refreshInterval: 30_000,
      revalidateOnFocus: true,
      keepPreviousData: true,
    }
  );

  return {
    emails: data?.messages ?? [],
    nextPageToken: data?.nextPageToken ?? null,
    account: data?.account,
    isLoading,
    isRefreshing: isValidating,
    error,
    refresh: () => mutate(),
  };
}
