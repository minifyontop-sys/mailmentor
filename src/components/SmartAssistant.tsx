"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles,
  Reply,
  Copy,
  Check,
  ListChecks,
  Send,
  Inbox as InboxIcon,
  Wand2,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";

import type { AIResult, Email } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/Skeleton";
import { useEmailStore } from "@/store/emailStore";
import { useTaskStore } from "@/store/taskStore";
import { useProfileStore } from "@/store/profileStore";
import { useEmails } from "@/hooks/useEmails";
import { useEmail } from "@/hooks/useEmail";
import { useToast } from "@/components/Toast";
import { scoreBreakdown } from "@/lib/importance";
import { cn } from "@/lib/utils";

type SendStatus = "idle" | "sending" | "sent" | "error";

export function SmartAssistant() {
  const selectedId = useEmailStore((s) => s.selectedEmailId);
  const generateReplyToken = useEmailStore((s) => s.generateReplyToken);
  const addTasks = useTaskStore((s) => s.addTasks);
  const profile = useProfileStore((s) => s.profile);
  const replyMode = useProfileStore((s) => s.replyMode);
  const { emails: listEmails } = useEmails();
  const { email: fullEmail, isLoading: bodyLoading } = useEmail(selectedId);
  const toast = useToast();

  const listEmail = useMemo(
    () => listEmails.find((e) => e.id === selectedId) ?? null,
    [listEmails, selectedId]
  );
  const email: Email | null = fullEmail ?? listEmail;

  const [summary, setSummary] = useState<AIResult | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [taskChecks, setTaskChecks] = useState<Record<number, boolean>>({});
  const [sendStatus, setSendStatus] = useState<SendStatus>("idle");

  useEffect(() => {
    setSummary(null);
    setReply(null);
    setTaskChecks({});
    setSendStatus("idle");
  }, [selectedId]);

  useEffect(() => {
    if (generateReplyToken > 0 && email && email.body.length > 0) {
      onGenerateReply();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generateReplyToken]);

  if (!email) {
    return <EmptyState />;
  }

  const breakdown = scoreBreakdown(email);
  const score = breakdown.total;
  const hasBody = email.body.length > 0;
  const isWorking = summaryLoading || replyLoading;

  const onSummarize = async () => {
    if (!email || !hasBody) return;
    setSummaryLoading(true);
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId: email.id,
          body: email.body,
          subject: email.subject,
          senderName: email.sender.name,
          profile,
          replyMode,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      if (!data) throw new Error("Empty response from server");
      setSummary(data);
      addTasks(data.tasks ?? [], email.id, email.subject);
      toast.success("Summary ready", `${data.tasks?.length ?? 0} task(s) added.`);
    } catch (e: any) {
      toast.error("AI: summarize failed", e?.message ?? "Try again.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const onGenerateReply = async () => {
    if (!email || !hasBody) return;
    setReplyLoading(true);
    try {
      const res = await fetch("/api/ai/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId: email.id,
          body: email.body,
          subject: email.subject,
          senderName: email.sender.name,
          profile,
          replyMode,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      if (!data) throw new Error("Empty response from server");
      setReply(data.text);
    } catch (e: any) {
      toast.error("AI: reply failed", e?.message ?? "Try again.");
    } finally {
      setReplyLoading(false);
    }
  };

  const onCopy = async () => {
    if (!reply) return;
    await navigator.clipboard.writeText(reply);
    setCopied(true);
    toast.info("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  };

  const onSend = async () => {
    if (!email || !reply) return;
    setSendStatus("sending");
    try {
      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: email.threadId,
          to: email.sender.email,
          subject: email.subject,
          body: reply,
          inReplyTo: email.messageId,
          references: email.references,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      if (!data) throw new Error("Empty response from server");
      setSendStatus("sent");
      toast.success("Reply sent", "Check your Sent folder in Gmail.");
      setTimeout(() => setSendStatus("idle"), 3000);
    } catch (e: any) {
      setSendStatus("error");
      toast.error("Send failed", e?.message ?? "Try again.");
    }
  };

  return (
    <aside className="relative flex h-full w-[400px] shrink-0 flex-col border-l border-border bg-card/50 backdrop-blur-xl">
      {/* Top edge glow — static, no pulse */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/[0.05] to-transparent"
      />

      <div className="relative flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
            <Wand2 className="h-3 w-3 text-primary" strokeWidth={2} />
          </div>
          <h2 className="text-[13px] font-medium text-foreground">
            Smart Assistant
          </h2>
        </div>
        <ScoreChip
          score={score}
          vip={breakdown.vip}
          keyword={breakdown.keyword}
          reply={breakdown.reply}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 px-5 py-5">
          <section>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground/80">
              {email.sender.name}
              <span className="mx-1.5 opacity-50">·</span>
              {new Date(email.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
            <h3 className="mt-1.5 font-serif-italic text-[20px] font-normal leading-snug tracking-tight text-foreground">
              {email.subject}
            </h3>
            {hasBody ? (
              <p className="mt-3 whitespace-pre-line text-[12.5px] leading-relaxed text-muted-foreground">
                {email.body}
              </p>
            ) : bodyLoading ? (
              <div className="mt-3 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-11/12" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ) : (
              <p className="mt-3 text-[12.5px] italic text-muted-foreground/70">
                No content.
              </p>
            )}
          </section>

          <div className="space-y-2">
            <Button
              className="w-full gap-2"
              disabled={replyLoading || !hasBody}
              onClick={onGenerateReply}
            >
              {replyLoading ? (
                <Spinner />
              ) : (
                <Reply className="h-3.5 w-3.5" strokeWidth={2} />
              )}
              {replyLoading ? "Drafting…" : "Generate reply"}
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2"
              disabled={summaryLoading || !hasBody}
              onClick={onSummarize}
            >
              {summaryLoading ? (
                <Spinner />
              ) : (
                <ListChecks className="h-3.5 w-3.5" strokeWidth={2} />
              )}
              {summaryLoading ? "Analyzing…" : "Summarize & extract tasks"}
            </Button>
          </div>

          <AnimatePresence>
            {summary && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                className="space-y-4"
              >
                {summary.tasks.length > 0 && (
                  <div>
                    <SectionLabel icon={ListChecks}>
                      Tasks ({summary.tasks.length})
                    </SectionLabel>
                    <ul className="mt-2 space-y-1">
                      {summary.tasks.map((t, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex items-start gap-2.5 rounded-md px-2 py-1.5 text-[12.5px] leading-relaxed transition-colors hover:bg-secondary/40"
                        >
                          <Checkbox
                            checked={!!taskChecks[i]}
                            onCheckedChange={(v) =>
                              setTaskChecks((prev) => ({
                                ...prev,
                                [i]: v === true,
                              }))
                            }
                            className="mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <span
                              className={cn(
                                "block",
                                taskChecks[i]
                                  ? "text-muted-foreground/60 line-through"
                                  : "text-foreground"
                              )}
                            >
                              {t.description}
                            </span>
                            {t.deadline && (
                              <span className="text-[11px] text-muted-foreground">
                                {t.deadline}
                              </span>
                            )}
                          </div>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <SectionLabel icon={Sparkles}>Summary</SectionLabel>
                  <blockquote className="mt-2 border-l-2 border-primary/40 pl-3 text-[12.5px] leading-relaxed text-foreground/90">
                    {summary.summary}
                  </blockquote>
                </div>
              </motion.section>
            )}

            {reply && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <SectionLabel icon={Reply}>Reply draft</SectionLabel>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={onCopy}
                      className="h-6 px-2 text-[11px]"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Copy
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={onSend}
                      disabled={
                        sendStatus === "sending" || sendStatus === "sent"
                      }
                      className="h-6 px-2 text-[11px]"
                    >
                      {sendStatus === "sending" ? (
                        <Spinner />
                      ) : sendStatus === "sent" ? (
                        <>
                          <Check className="h-3 w-3" /> Sent
                        </>
                      ) : (
                        <>
                          <Send className="h-3 w-3" /> Send
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  className="min-h-[200px] border-border bg-background/40 text-[12.5px] leading-relaxed focus-visible:border-primary/40 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]"
                />
                {sendStatus === "error" && (
                  <p className="mt-1.5 flex items-center gap-1 text-[11px] text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    Couldn&apos;t send. Try again.
                  </p>
                )}
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3 w-3 text-primary" strokeWidth={2} />
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </h4>
    </div>
  );
}

function ScoreChip({
  score,
  vip,
  keyword,
  reply,
}: {
  score: number;
  vip: boolean;
  keyword: boolean;
  reply: boolean;
}) {
  return (
    <div className="group/score relative">
      <Badge
        variant="outline"
        className={cn(
          "font-normal text-[10px] tabular-nums",
          score >= 10 && "border-amber-400/35 text-amber-300",
          score >= 5 && score < 10 && "border-primary/45 text-primary"
        )}
      >
        {score} pts
      </Badge>
      <div className="invisible absolute right-0 top-full z-10 mt-2 w-44 rounded-md border border-border bg-popover p-2.5 text-[11px] text-popover-foreground shadow-xl group-hover/score:visible">
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Importance breakdown
        </p>
        <ul className="space-y-1 text-muted-foreground">
          <li className="flex justify-between">
            <span>VIP sender</span>
            <span className={vip ? "text-moss" : "opacity-40"}>
              {vip ? "+10" : "—"}
            </span>
          </li>
          <li className="flex justify-between">
            <span>Urgent keyword</span>
            <span className={keyword ? "text-primary" : "opacity-40"}>
              {keyword ? "+5" : "—"}
            </span>
          </li>
          <li className="flex justify-between">
            <span>Reply to you</span>
            <span className={reply ? "text-primary" : "opacity-40"}>
              {reply ? "+3" : "—"}
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

function EmptyState() {
  return (
    <aside className="relative flex h-full w-[400px] shrink-0 flex-col items-center justify-center border-l border-border bg-card/50 px-8 text-center backdrop-blur-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
      />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary/30">
          <InboxIcon
            className="h-5 w-5 text-muted-foreground"
            strokeWidth={1.5}
          />
        </div>
        <h2 className="mt-5 font-serif-italic text-2xl text-foreground">
          Select a message.
        </h2>
        <p className="mt-2 max-w-[260px] text-[13px] leading-relaxed text-muted-foreground">
          Summarize it, extract your to-dos, and draft a reply — all in one
          click.
        </p>
        <div className="mt-6 inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/30 px-2.5 py-1.5 text-[11px] text-muted-foreground">
          <kbd className="rounded border border-border bg-background/60 px-1.5 py-0.5 text-[10px]">
            ⌘K
          </kbd>
          to jump to anything
        </div>
      </motion.div>
    </aside>
  );
}
