"use client";

import useSWR from "swr";
import type { Recipe } from "@/types/automation";

interface ListResponse {
  recipes: Recipe[];
}

export function useRecipes() {
  const { data, error, isLoading, mutate, isValidating } = useSWR<ListResponse>(
    "/api/recipes",
    { revalidateOnFocus: true }
  );
  return {
    recipes: data?.recipes ?? [],
    isLoading,
    isRefreshing: isValidating,
    error,
    refresh: () => mutate(),
  };
}
