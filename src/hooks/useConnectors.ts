"use client";

import useSWR from "swr";
import type { ConnectorStatus } from "@/types/automation";

interface Connector extends ConnectorStatus {
  label: string;
  description: string;
  icon: string;
  scopes: string[];
}

interface ListResponse {
  connectors: Connector[];
}

export function useConnectors() {
  const { data, error, isLoading, mutate, isValidating } = useSWR<ListResponse>(
    "/api/connectors",
    { revalidateOnFocus: true }
  );
  return {
    connectors: data?.connectors ?? [],
    isLoading,
    isRefreshing: isValidating,
    error,
    refresh: () => mutate(),
  };
}
