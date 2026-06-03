"use client";

import useSWR from "swr";
import { useEmailStore } from "@/store/emailStore";
import type { Email } from "@/types";

interface DetailResponse {
  message: Email;
}

export function useEmail(id: string | null | undefined) {
  const activeId = useEmailStore((s) => s.activeAccountId);
  const key =
    id && activeId
      ? `/api/mail/messages/${encodeURIComponent(id)}?accountId=${encodeURIComponent(activeId)}`
      : null;

  const { data, error, isLoading, mutate } = useSWR<DetailResponse>(
    key,
    { revalidateOnFocus: false }
  );

  return {
    email: data?.message ?? null,
    isLoading: !!id && isLoading,
    error,
    refresh: () => mutate(),
  };
}
