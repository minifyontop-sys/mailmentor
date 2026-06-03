"use client";

import { create } from "zustand";

interface EmailState {
  selectedEmailId: string | null;
  /** Ids the user has opened locally; merged with the server's UNREAD label for instant UI. */
  readIds: Set<string>;
  /**
   * Monotonic counter that bumps whenever an external caller (command palette,
   * keyboard shortcut) asks the SmartAssistant to generate a reply for the
   * currently-selected email. The SmartAssistant watches it via useEffect.
   */
  generateReplyToken: number;
  /** Currently active email account id. Persisted in localStorage. */
  activeAccountId: string | null;
  setActiveAccountId: (id: string | null) => void;
  selectEmail: (id: string | null) => void;
  markAsRead: (id: string) => void;
  triggerGenerateReply: () => void;
  reset: () => void;
}

function loadActiveAccount(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("mailmentor_activeAccountId");
  } catch {
    return null;
  }
}

function saveActiveAccount(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) localStorage.setItem("mailmentor_activeAccountId", id);
    else localStorage.removeItem("mailmentor_activeAccountId");
  } catch {
    /* noop */
  }
}

export const useEmailStore = create<EmailState>((set) => ({
  selectedEmailId: null,
  readIds: new Set<string>(),
  generateReplyToken: 0,
  activeAccountId: loadActiveAccount(),
  setActiveAccountId: (id) => {
    saveActiveAccount(id);
    set({ activeAccountId: id });
  },
  selectEmail: (id) => set({ selectedEmailId: id }),
  markAsRead: (id) =>
    set((s) => {
      if (s.readIds.has(id)) return s;
      const next = new Set(s.readIds);
      next.add(id);
      return { readIds: next };
    }),
  triggerGenerateReply: () =>
    set((s) => ({ generateReplyToken: s.generateReplyToken + 1 })),
  reset: () =>
    set({
      selectedEmailId: null,
      readIds: new Set<string>(),
      generateReplyToken: 0,
    }),
}));
