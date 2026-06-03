import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parse a Response as JSON. Returns a fallback object when
 * the body is empty or non-JSON (e.g. a Next.js HTML 401/404 page).
 * Use this everywhere `res.json()` is called on user-driven fetches
 * so we never throw "Failed to execute 'json' on 'Response'" to the
 * browser console.
 */
export async function safeJson<T = Record<string, unknown>>(
  res: Response,
  fallback: T = {} as T
): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}
