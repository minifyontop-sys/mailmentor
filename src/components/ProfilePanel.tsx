"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  RefreshCw,
  Pencil,
  Save,
  User,
  Briefcase,
  Users,
  Folder,
  Hash,
  Settings2,
  Quote,
  Sparkles,
  MessageSquare,
  ShieldOff,
  EyeOff,
  Eye,
  Globe,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useProfileStore } from "@/store/profileStore";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export function ProfilePanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const profile = useProfileStore((s) => s.profile);
  const patchProfile = useProfileStore((s) => s.patchProfile);
  const setProfile = useProfileStore((s) => s.setProfile);
  const setGenerating = useProfileStore((s) => s.setGenerating);
  const setError = useProfileStore((s) => s.setError);
  const generating = useProfileStore((s) => s.generating);
  const replyMode = useProfileStore((s) => s.replyMode);
  const setReplyMode = useProfileStore((s) => s.setReplyMode);
  const toast = useToast();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);

  useEffect(() => {
    setDraft(profile);
    setEditing(false);
  }, [profile]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const refresh = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          excludedDomains: profile?.excludedDomains ?? [],
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      if (!data) throw new Error("Empty response from server");
      // Preserve user-managed exclusion lists across a refresh. The server
      // strips these fields from its response; we merge them back from the
      // existing profile so the user's intent survives a rebuild.
      const merged = {
        ...data.profile,
        excludedTopics: profile?.excludedTopics ?? [],
        excludedPeople: profile?.excludedPeople ?? [],
        excludedProjects: profile?.excludedProjects ?? [],
        excludedDomains: profile?.excludedDomains ?? [],
      };
      setProfile(merged);
      toast.success(
        "Profile refreshed",
        `Learned from ${data.profile.sourceEmailCount} emails.`
      );
    } catch (e: any) {
      setError(e?.message ?? "Failed.");
      toast.error("Profile refresh failed", e?.message ?? "Try again.");
    }
  };

  const save = () => {
    if (!draft) return;
    patchProfile(draft);
    setEditing(false);
    toast.success("Profile saved");
  };

  const isExcluded = (name: string, list: string[] | undefined): boolean => {
    if (!list?.length) return false;
    const lower = name.toLowerCase();
    return list.some((e) => e && lower.includes(e.toLowerCase()));
  };

  const toggleExclude = (
    field: "excludedTopics" | "excludedPeople" | "excludedProjects",
    name: string
  ) => {
    if (!profile) return;
    const current = profile[field] ?? [];
    const next = isExcluded(name, current)
      ? current.filter((n) => !name.toLowerCase().includes(n.toLowerCase()))
      : [...current, name];
    patchProfile({ [field]: next } as Partial<typeof profile>);
  };

  const setExcludedDomains = (domains: string[]) => {
    patchProfile({ excludedDomains: domains });
  };

  const restorePerson = (name: string) => toggleExclude("excludedPeople", name);
  const restoreProject = (name: string) => toggleExclude("excludedProjects", name);
  const restoreTopic = (name: string) => toggleExclude("excludedTopics", name);

  const excludedCount =
    (profile?.excludedTopics?.length ?? 0) +
    (profile?.excludedPeople?.length ?? 0) +
    (profile?.excludedProjects?.length ?? 0) +
    (profile?.excludedDomains?.length ?? 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 h-full w-[460px] max-w-[calc(100vw-2rem)] overflow-y-auto border-l border-border bg-card/90 shadow-2xl backdrop-blur-xl"
          >
            <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-card/70 px-5 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <User className="h-3 w-3" strokeWidth={2} />
                </div>
                <h2 className="text-[13px] font-medium text-foreground">
                  Your profile
                </h2>
                {profile && (
                  <span className="text-[11px] text-muted-foreground">
                    · {profile.sourceEmailCount} emails
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {profile && !editing && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1.5 px-2 text-[11px]"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1.5 px-2 text-[11px]"
                  onClick={refresh}
                  disabled={generating}
                  title="Rebuild from recent emails"
                >
                  <RefreshCw
                    className={cn("h-3 w-3", generating && "spin-slow text-primary")}
                    strokeWidth={2}
                  />
                  {generating ? "Learning…" : "Refresh"}
                </Button>
                <button
                  onClick={onClose}
                  className="ml-1 rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {!profile && !generating && (
              <EmptyState onRefresh={refresh} />
            )}

            {generating && <GeneratingState />}

            <div className="border-b border-border bg-card/40 px-5 py-4">
              <ReplyModeToggle
                mode={replyMode}
                onChange={setReplyMode}
              />
            </div>

            {profile && !generating && (
              <div className="space-y-6 p-5">
                <BioBlock
                  bio={editing ? draft?.bio ?? "" : profile.bio}
                  editing={editing}
                  onChange={(v) => setDraft((d) => (d ? { ...d, bio: v } : d))}
                />

                <Section icon={Briefcase} title="Identity">
                  {editing ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Field
                        label="Name"
                        value={draft?.identity.fullName ?? ""}
                        onChange={(v) =>
                          setDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  identity: { ...d.identity, fullName: v },
                                }
                              : d
                          )
                        }
                      />
                      <Field
                        label="Role"
                        value={draft?.identity.role ?? ""}
                        onChange={(v) =>
                          setDraft((d) =>
                            d
                              ? { ...d, identity: { ...d.identity, role: v } }
                              : d
                          )
                        }
                      />
                      <Field
                        label="Company"
                        value={draft?.identity.company ?? ""}
                        onChange={(v) =>
                          setDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  identity: { ...d.identity, company: v },
                                }
                              : d
                          )
                        }
                      />
                      <Field
                        label="Location"
                        value={draft?.identity.location ?? ""}
                        onChange={(v) =>
                          setDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  identity: { ...d.identity, location: v },
                                }
                              : d
                          )
                        }
                      />
                    </div>
                  ) : (
                    <div className="space-y-1 text-[12.5px] leading-relaxed">
                      {profile.identity.fullName && (
                        <Row k="Name" v={profile.identity.fullName} />
                      )}
                      {profile.identity.role && (
                        <Row k="Role" v={profile.identity.role} />
                      )}
                      {profile.identity.company && (
                        <Row k="Company" v={profile.identity.company} />
                      )}
                      {profile.identity.location && (
                        <Row k="Location" v={profile.identity.location} />
                      )}
                      {!profile.identity.fullName &&
                        !profile.identity.role &&
                        !profile.identity.company && (
                          <p className="text-muted-foreground/70">
                            Nothing inferred.
                          </p>
                        )}
                    </div>
                  )}
                </Section>

                <Section icon={Settings2} title="Writing style">
                  <div className="space-y-1 text-[12.5px] leading-relaxed">
                    <Row k="Tone" v={profile.writingStyle.tone} />
                    <Row k="Formality" v={profile.writingStyle.formality} />
                    <Row k="Typical length" v={profile.writingStyle.avgLength} />
                    {profile.writingStyle.signOffs.length > 0 && (
                      <Row
                        k="Sign-offs"
                        v={profile.writingStyle.signOffs.join(" / ")}
                      />
                    )}
                    {profile.writingStyle.quirks.length > 0 && (
                      <Row
                        k="Quirks"
                        v={profile.writingStyle.quirks.join("; ")}
                      />
                    )}
                  </div>
                </Section>

                <Section
                  icon={Users}
                  title={`People (${profile.keyPeople.length})`}
                >
                  {profile.keyPeople.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground/70">
                      No key people identified yet.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {profile.keyPeople.slice(0, 12).map((p, i) => {
                        const excluded = isExcluded(p.name, profile.excludedPeople);
                        return (
                          <motion.li
                            key={`${p.name}-${i}`}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: Math.min(i, 8) * 0.03,
                              duration: 0.35,
                              ease: EASE,
                            }}
                            className={cn(
                              "group relative rounded-md border border-border/50 bg-background/40 px-3 py-2 transition-opacity",
                              excluded && "opacity-40"
                            )}
                          >
                            <div className="flex items-baseline gap-2">
                              <span
                                className={cn(
                                  "text-[12.5px] font-medium text-foreground",
                                  excluded && "line-through"
                                )}
                              >
                                {p.name}
                              </span>
                              {p.role && (
                                <span className="text-[11px] text-muted-foreground">
                                  {p.role}
                                </span>
                              )}
                              <span className="ml-auto text-[10px] text-muted-foreground/70 tabular-nums">
                                {p.emailCount}×
                              </span>
                              <button
                                onClick={() => toggleExclude("excludedPeople", p.name)}
                                title={
                                  excluded
                                    ? "Restore to AI context"
                                    : "Exclude from AI context"
                                }
                                className="ml-1 rounded p-0.5 text-muted-foreground/50 opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100"
                              >
                                {excluded ? (
                                  <Eye className="h-3 w-3" />
                                ) : (
                                  <EyeOff className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                              <span className="text-moss">{p.relationship}</span>
                              {" · "}
                              {p.notes}
                            </p>
                          </motion.li>
                        );
                      })}
                    </ul>
                  )}
                </Section>

                <Section
                  icon={Folder}
                  title={`Projects (${profile.activeProjects.length})`}
                >
                  {profile.activeProjects.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground/70">
                      No active projects identified.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {profile.activeProjects.map((p, i) => {
                        const excluded = isExcluded(p.name, profile.excludedProjects);
                        return (
                          <li
                            key={`${p.name}-${i}`}
                            className={cn(
                              "group relative rounded-md border border-border/50 bg-background/40 px-3 py-2 transition-opacity",
                              excluded && "opacity-40"
                            )}
                          >
                            <div className="flex items-baseline gap-2">
                              <span
                                className={cn(
                                  "text-[12.5px] font-medium text-foreground",
                                  excluded && "line-through"
                                )}
                              >
                                {p.name}
                              </span>
                              <button
                                onClick={() =>
                                  toggleExclude("excludedProjects", p.name)
                                }
                                title={
                                  excluded
                                    ? "Restore to AI context"
                                    : "Exclude from AI context"
                                }
                                className="ml-auto rounded p-0.5 text-muted-foreground/50 opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100"
                              >
                                {excluded ? (
                                  <Eye className="h-3 w-3" />
                                ) : (
                                  <EyeOff className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                              {p.description}
                            </p>
                            {p.stakeholders.length > 0 && (
                              <p className="mt-1 text-[10.5px] uppercase tracking-wider text-muted-foreground/70">
                                Stakeholders: {p.stakeholders.join(", ")}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Section>

                {profile.recurringTopics.length > 0 && (
                  <Section icon={Hash} title="Recurring topics">
                    <div className="flex flex-wrap gap-1.5">
                      {profile.recurringTopics.map((t) => {
                        const excluded = isExcluded(t, profile.excludedTopics);
                        return (
                          <button
                            key={t}
                            onClick={() => toggleExclude("excludedTopics", t)}
                            title={
                              excluded
                                ? "Restore to AI context"
                                : "Exclude from AI context"
                            }
                            className={cn(
                              "group inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-[11px] transition-all",
                              excluded
                                ? "bg-background/30 text-muted-foreground/50 line-through"
                                : "bg-secondary/40 text-muted-foreground hover:border-border hover:text-foreground"
                            )}
                          >
                            {t}
                            {excluded ? (
                              <Eye className="h-2.5 w-2.5 opacity-60" />
                            ) : (
                              <EyeOff className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-60" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </Section>
                )}

                {profile.preferences.length > 0 && (
                  <Section icon={Sparkles} title="Preferences">
                    <ul className="space-y-1 text-[12.5px] text-muted-foreground">
                      {profile.preferences.map((p, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-primary">·</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                <ExclusionsSection
                  excludedTopics={profile.excludedTopics ?? []}
                  excludedPeople={profile.excludedPeople ?? []}
                  excludedProjects={profile.excludedProjects ?? []}
                  excludedDomains={profile.excludedDomains ?? []}
                  onChangeDomains={setExcludedDomains}
                  onRestoreTopic={restoreTopic}
                  onRestorePerson={restorePerson}
                  onRestoreProject={restoreProject}
                />

                {editing && (
                  <div className="sticky bottom-0 -mx-5 border-t border-border bg-card/80 px-5 py-3 backdrop-blur-md">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDraft(profile);
                          setEditing(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" className="gap-1.5" onClick={save}>
                        <Save className="h-3 w-3" />
                        Save
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ReplyModeToggle({
  mode,
  onChange,
}: {
  mode: "always" | "strict";
  onChange: (m: "always" | "strict") => void;
}) {
  const isAlways = mode === "always";
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
            isAlways
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isAlways ? (
            <MessageSquare className="h-3 w-3" strokeWidth={2} />
          ) : (
            <ShieldOff className="h-3 w-3" strokeWidth={2} />
          )}
        </div>
        <h3 className="text-[12px] font-medium text-foreground">
          Reply behavior
        </h3>
      </div>

      <div className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
        {isAlways
          ? "Always draft a real, useful reply — even for newsletters, cold pitches, or unfamiliar senders. The AI never says “not related”."
          : "The AI may politely decline emails that are clearly outside your usual scope (cold pitches, mass marketing, automated noise)."}
      </div>

      <div
        role="tablist"
        aria-label="Reply behavior"
        className="relative inline-flex w-full rounded-md border border-border bg-muted/40 p-0.5"
      >
        <motion.span
          aria-hidden
          layout
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className={cn(
            "absolute inset-y-0.5 w-[calc(50%-2px)] rounded-[5px] shadow-sm",
            isAlways
              ? "left-0.5 bg-primary text-primary-foreground"
              : "left-[calc(50%+1.5px)] bg-background text-foreground"
          )}
        />
        <button
          role="tab"
          aria-selected={isAlways}
          onClick={() => onChange("always")}
          className={cn(
            "relative z-10 flex-1 rounded-[5px] px-2 py-1.5 text-[11px] font-medium transition-colors",
            isAlways ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Always reply
        </button>
        <button
          role="tab"
          aria-selected={!isAlways}
          onClick={() => onChange("strict")}
          className={cn(
            "relative z-10 flex-1 rounded-[5px] px-2 py-1.5 text-[11px] font-medium transition-colors",
            !isAlways ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Decline if unrelated
        </button>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-primary" strokeWidth={2} />
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-24 shrink-0 text-muted-foreground">{k}</span>
      <span className="flex-1 text-foreground/90">{v}</span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-background/50 px-2.5 py-1.5 text-[12.5px] text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
      />
    </label>
  );
}

function ExclusionsSection({
  excludedTopics,
  excludedPeople,
  excludedProjects,
  excludedDomains,
  onChangeDomains,
  onRestoreTopic,
  onRestorePerson,
  onRestoreProject,
}: {
  excludedTopics: string[];
  excludedPeople: string[];
  excludedProjects: string[];
  excludedDomains: string[];
  onChangeDomains: (d: string[]) => void;
  onRestoreTopic: (n: string) => void;
  onRestorePerson: (n: string) => void;
  onRestoreProject: (n: string) => void;
}) {
  const [draft, setDraft] = useState(excludedDomains.join(", "));
  useEffect(() => {
    setDraft(excludedDomains.join(", "));
  }, [excludedDomains]);

  const commit = () => {
    const next = draft
      .split(/[,\n]/)
      .map((d) => d.trim())
      .filter(Boolean);
    if (
      next.length === excludedDomains.length &&
      next.every((d, i) => d === excludedDomains[i])
    ) {
      return;
    }
    onChangeDomains(next);
  };

  const anyExcluded =
    excludedTopics.length +
      excludedPeople.length +
      excludedProjects.length +
      excludedDomains.length >
    0;

  return (
    <Section
      icon={ShieldOff}
      title={`What to ignore${anyExcluded ? ` (${excludedTopics.length + excludedPeople.length + excludedProjects.length + excludedDomains.length})` : ""}`}
    >
      <p className="mb-3 text-[11.5px] leading-relaxed text-muted-foreground">
        Exclude things from the profile so they don&apos;t bleed into replies. Click
        the <EyeOff className="inline h-2.5 w-2.5 align-middle" /> icon on any
        topic, person, or project to hide it. Add domains below to skip those
        senders entirely on the next refresh.
      </p>

      <div className="mb-3">
        <label className="mb-1 flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
          <Globe className="h-3 w-3" />
          Domains to ignore
        </label>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          placeholder="steam.com, twitch.tv, roblox.com"
          spellCheck={false}
          autoComplete="off"
          className="w-full rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-[12px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/60"
        />
        <p className="mt-1 text-[10.5px] text-muted-foreground/70">
          Comma- or newline-separated. Compared as substrings of email addresses.
          Applies to the next profile refresh.
        </p>
      </div>

      {excludedTopics.length > 0 && (
        <div className="mb-2">
          <div className="mb-1 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
            Topics
          </div>
          <div className="flex flex-wrap gap-1.5">
            {excludedTopics.map((t) => (
              <button
                key={t}
                onClick={() => onRestoreTopic(t)}
                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/30 px-2 py-1 text-[11px] text-muted-foreground/70 line-through transition-colors hover:border-primary/40 hover:text-foreground"
                title="Restore to AI context"
              >
                {t}
                <Eye className="h-2.5 w-2.5 opacity-60" />
              </button>
            ))}
          </div>
        </div>
      )}

      {excludedPeople.length > 0 && (
        <div className="mb-2">
          <div className="mb-1 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
            People
          </div>
          <div className="flex flex-wrap gap-1.5">
            {excludedPeople.map((p) => (
              <button
                key={p}
                onClick={() => onRestorePerson(p)}
                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/30 px-2 py-1 text-[11px] text-muted-foreground/70 line-through transition-colors hover:border-primary/40 hover:text-foreground"
                title="Restore to AI context"
              >
                {p}
                <Eye className="h-2.5 w-2.5 opacity-60" />
              </button>
            ))}
          </div>
        </div>
      )}

      {excludedProjects.length > 0 && (
        <div className="mb-2">
          <div className="mb-1 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
            Projects
          </div>
          <div className="flex flex-wrap gap-1.5">
            {excludedProjects.map((p) => (
              <button
                key={p}
                onClick={() => onRestoreProject(p)}
                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/30 px-2 py-1 text-[11px] text-muted-foreground/70 line-through transition-colors hover:border-primary/40 hover:text-foreground"
                title="Restore to AI context"
              >
                {p}
                <Eye className="h-2.5 w-2.5 opacity-60" />
              </button>
            ))}
          </div>
        </div>
      )}

      {excludedDomains.length > 0 && (
        <div>
          <div className="mb-1 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
            Domains
          </div>
          <div className="flex flex-wrap gap-1.5">
            {excludedDomains.map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/30 px-2 py-1 text-[11px] text-muted-foreground/70"
              >
                <Globe className="h-2.5 w-2.5 opacity-60" />
                {d}
              </span>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}

function BioBlock({
  bio,
  editing,
  onChange,
}: {
  bio: string;
  editing: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-4">
      <div className="mb-2 flex items-center gap-1.5">
        <Quote className="h-3 w-3 text-primary" strokeWidth={2} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          About you
        </span>
      </div>
      {editing ? (
        <textarea
          value={bio}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-md border border-border bg-background/60 px-3 py-2 font-serif-italic text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
        />
      ) : (
        <p className="font-serif-italic text-[14px] leading-relaxed text-foreground/90">
          {bio || "No bio yet — refresh to generate one from your recent emails."}
        </p>
      )}
    </div>
  );
}

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex h-[calc(100%-3.5rem)] flex-col items-center justify-center px-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary/30">
        <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.5} />
      </div>
      <h3 className="mt-5 font-serif-italic text-2xl text-foreground">
        No profile yet.
      </h3>
      <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-muted-foreground">
        Learn from your last 100 emails to make every reply and summary yours.
      </p>
      <Button onClick={onRefresh} className="mt-6 gap-2">
        <Sparkles className="h-3.5 w-3.5" />
        Build my profile
      </Button>
    </div>
  );
}

function GeneratingState() {
  return (
    <div className="flex h-[calc(100%-3.5rem)] flex-col items-center justify-center px-8 text-center">
      <div className="relative flex h-14 w-14 items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-primary/20" />
        <span className="absolute inset-1 rounded-full border border-primary/30 spin-slow border-t-transparent" />
        <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.5} />
      </div>
      <h3 className="mt-5 font-serif-italic text-xl text-foreground">
        Reading your emails…
      </h3>
      <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-muted-foreground">
        Looking at your last 100 messages to learn your voice, projects, and
        the people you work with.
      </p>
    </div>
  );
}
