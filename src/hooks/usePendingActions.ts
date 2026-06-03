"use client";

import useSWR from "swr";
import type { PendingAction } from "@/types/automation";

interface ListResponse {
  pending: PendingAction[];
  count: number;
}

export function usePendingActions() {
  const { data, error, isLoading, mutate, isValidating } = useSWR<ListResponse>(
    "/api/pending-actions",
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );
  return {
    pending: data?.pending ?? [],
    count: data?.count ?? 0,
    isLoading,
    isRefreshing: isValidating,
    error,
    refresh: () => mutate(),
  };
}
