const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export interface OutlookClient {
  baseUrl: string;
  accessToken: string;
  fetch<T>(path: string, init?: RequestInit): Promise<T>;
}

export function createOutlookClient(accessToken: string): OutlookClient {
  return {
    baseUrl: GRAPH_BASE,
    accessToken,
    async fetch<T>(path: string, init: RequestInit = {}): Promise<T> {
      const url = path.startsWith("http") ? path : `${GRAPH_BASE}${path}`;
      const res = await fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...(init.headers ?? {}),
        },
        cache: "no-store",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Graph ${init.method ?? "GET"} ${path} failed (${res.status}): ${text.slice(0, 240)}`
        );
      }
      if (res.status === 204) return undefined as T;
      return (await res.json()) as T;
    },
  };
}
