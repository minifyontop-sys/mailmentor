"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UserProfile } from "@/types";

const STORAGE_KEY = "mailmentor.profile.v1";
const STALE_DAYS = 7;

/**
 * Reply behaviour for emails that don't match the user's profile.
 * - "always": always draft a real, useful reply — never say "not related" / "outside your domain"
 * - "strict": may decline / say "not related" when the email is outside the user's usual scope
 */
export type ReplyMode = "always" | "strict";

function isStale(p: UserProfile | null): boolean {
  if (!p?.generatedAt) return true;
  const ageMs = Date.now() - new Date(p.generatedAt).getTime();
  return ageMs > STALE_DAYS * 24 * 60 * 60 * 1000;
}

interface ProfileState {
  profile: UserProfile | null;
  replyMode: ReplyMode;
  generating: boolean;
  lastError: string | null;
  setProfile: (p: UserProfile) => void;
  patchProfile: (patch: Partial<UserProfile>) => void;
  setReplyMode: (m: ReplyMode) => void;
  setGenerating: (g: boolean) => void;
  setError: (e: string | null) => void;
  clear: () => void;
  isStale: () => boolean;
  isEmpty: () => boolean;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      replyMode: "always",
      generating: false,
      lastError: null,
      setProfile: (p) =>
        set({ profile: p, generating: false, lastError: null }),
      patchProfile: (patch) =>
        set((s) =>
          s.profile
            ? { profile: { ...s.profile, ...patch }, lastError: null }
            : {}
        ),
      setReplyMode: (m) => set({ replyMode: m }),
      setGenerating: (g) => set({ generating: g }),
      setError: (e) => set({ lastError: e, generating: false }),
      clear: () =>
        set({
          profile: null,
          generating: false,
          lastError: null,
        }),
      isStale: () => isStale(get().profile),
      isEmpty: () => get().profile === null,
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ profile: s.profile, replyMode: s.replyMode }),
    }
  )
);
