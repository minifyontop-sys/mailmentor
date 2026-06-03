"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import {
  X,
  Plus,
  Sparkles,
  Pause,
  Play,
  Trash2,
  Loader2,
  Wand2,
  PowerOff,
  Power,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRecipes } from "@/hooks/useRecipes";
import { useToast } from "@/components/Toast";
import type { Recipe } from "@/types/automation";
import { SEED_RECIPES } from "@/lib/recipe/seed";

const ICON_FOR_TYPE: Record<string, string> = {
  "calendar.propose_slots": "📅",
  "calendar.create_event": "📅",
  "calendar.propose_slots_with_reply": "📅",
  "ai.draft_reply": "✨",
  "email.archive": "📥",
  "email.label": "🏷",
  "slack.post_message": "💬",
  "notion.create_page": "📝",
};

export function RecipePanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { recipes, isLoading, refresh } = useRecipes();
  const toast = useToast();
  const [composerOpen, setComposerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) onClose();
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-y-0 right-0 z-40 w-[420px] max-w-[calc(100vw-2rem)] border-l border-border bg-card/95 shadow-2xl backdrop-blur-xl"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          />
          <div className="flex h-14 items-center justify-between border-b border-border/60 px-5">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" strokeWidth={1.75} />
              <h2 className="text-[13px] font-medium tracking-tight text-foreground">
                Recipes
              </h2>
              {recipes.length > 0 && (
                <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                  {recipes.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setComposerOpen(true)}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="h-3 w-3" strokeWidth={2.5} />
                New
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <div
            className="overflow-y-auto p-3"
            style={{ maxHeight: "calc(100vh - 3.5rem)" }}
          >
            {isLoading && recipes.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              </div>
            ) : recipes.length === 0 ? (
              <EmptyState onCreate={() => setComposerOpen(true)} />
            ) : (
              <ul className="space-y-2">
                {recipes.map((r) => (
                  <RecipeCard
                    key={r.id}
                    recipe={r}
                    onChanged={() => {
                      refresh();
                    }}
                    onError={(msg) => toast.error("Recipe update failed", msg)}
                  />
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      )}

      <RecipeComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={() => {
          setComposerOpen(false);
          refresh();
        }}
        onError={(msg) => toast.error("Could not create recipe", msg)}
      />
    </AnimatePresence>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-secondary/50">
        <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />
      </div>
      <p className="text-[13px] text-foreground">No recipes yet</p>
      <p className="mt-1 max-w-[280px] text-[11px] leading-relaxed text-muted-foreground">
        Describe what should happen in plain English — MailMentor turns it into a saved rule that watches your inbox.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Plus className="h-3 w-3" strokeWidth={2.5} />
        Create your first recipe
      </button>
    </div>
  );
}

function RecipeCard({
  recipe,
  onChanged,
  onError,
}: {
  recipe: Recipe;
  onChanged: () => void;
  onError: (msg: string) => void;
}) {
  const [busy, setBusy] = useState<"toggle" | "delete" | null>(null);

  const toggle = async () => {
    setBusy("toggle");
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: !recipe.enabled }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      onChanged();
    } catch (e: any) {
      onError(e?.message ?? "Toggle failed");
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("delete");
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      onChanged();
    } catch (e: any) {
      onError(e?.message ?? "Delete failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <li
      className={cn(
        "rounded-lg border border-border/60 bg-card/60 p-3 transition-colors hover:border-border",
        !recipe.enabled && "opacity-60"
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-base">
          {recipe.actions[0] ? ICON_FOR_TYPE[recipe.actions[0].type] ?? "✨" : "✨"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-[12.5px] font-medium text-foreground">
              {recipe.name}
            </h3>
            {!recipe.enabled && (
              <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                paused
              </span>
            )}
          </div>
          {recipe.description && (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
              {recipe.description}
            </p>
          )}
          <p className="mt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/70">
            {recipe.actions.map((a) => a.type).join(" + ")}
            {recipe.runCount > 0 && ` · ran ${recipe.runCount}×`}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggle}
          disabled={busy !== null}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
        >
          {busy === "toggle" ? (
            <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
          ) : recipe.enabled ? (
            <Pause className="h-3 w-3" strokeWidth={2} />
          ) : (
            <Play className="h-3 w-3" strokeWidth={2} />
          )}
          {recipe.enabled ? "Pause" : "Resume"}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={busy !== null}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
        >
          {busy === "delete" ? (
            <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
          ) : (
            <Trash2 className="h-3 w-3" strokeWidth={2} />
          )}
        </button>
      </div>
    </li>
  );
}

function RecipeComposer({
  open,
  onClose,
  onCreated,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Recipe | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) onClose();
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setText("");
      setPreview(null);
    }
  }, [open]);

  const submit = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setPreview(null);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ naturalLanguage: text.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
      if (j.draft) {
        setPreview(j.draft);
        return;
      }
      onCreated();
    } catch (e: any) {
      onError(e?.message ?? "Could not create recipe");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!preview || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draft: preview }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
      onCreated();
    } catch (e: any) {
      onError(e?.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex max-h-[calc(100vh-2rem)] w-[520px] max-w-full flex-col overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
              <h2 className="font-serif text-[18px] tracking-tight text-foreground">
                New recipe
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={busy || preview !== null}
                rows={3}
                placeholder='Describe the pattern. e.g. "When my boss emails me to meet, draft a reply proposing 3 free 30-min slots."'
                className="w-full resize-none rounded-lg border border-border bg-background/60 px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              />

              {preview && (
                <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-primary/80">
                    Translated recipe
                  </p>
                  <h3 className="mt-1 text-[13px] font-medium text-foreground">
                    {preview.name}
                  </h3>
                  {preview.description && (
                    <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                      {preview.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {preview.conditions.map((c, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {c.field} {c.op} {c.value ?? ""}
                      </span>
                    ))}
                    {preview.conditions.length > 0 && (
                      <span className="text-[10px] text-muted-foreground/60">+ then</span>
                    )}
                    {preview.actions.map((a, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary"
                      >
                        {a.type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!preview && text.trim().length === 0 && (
                <div className="mt-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                    Or pick a template
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-1.5">
                    {SEED_RECIPES.map((s) => (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => setText(s.naturalLanguage)}
                        className="group flex items-center gap-2.5 rounded-md border border-border bg-card/40 p-2 text-left transition-colors hover:border-border hover:bg-secondary/40"
                      >
                        <span className="text-base">{s.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12px] font-medium text-foreground">
                            {s.name}
                          </span>
                          <span className="block truncate text-[10.5px] text-muted-foreground">
                            {s.description}
                          </span>
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary" strokeWidth={2} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Cancel
              </button>
              {preview ? (
                <>
                  <button
                    type="button"
                    onClick={() => setPreview(null)}
                    disabled={busy}
                    className="rounded-md border border-border bg-card px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
                    ) : (
                      <Sparkles className="h-3 w-3" strokeWidth={2} />
                    )}
                    Save
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  disabled={!text.trim() || busy}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
                  ) : (
                    <Wand2 className="h-3 w-3" strokeWidth={2} />
                  )}
                  Translate
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
