import Link from "next/link";
import { ArrowRight, Check, Sparkles, Inbox, Wand2, Calendar, ListChecks, ShieldCheck, Zap, BookOpen, KeyRound } from "lucide-react";
import { Brand, BrandMark } from "@/components/Brand";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <BackgroundField />

      <Navbar />

      <main className="relative">
        <Hero />
        <FeatureGrid />
        <ProductPreview />
        <HowItWorks />
        <CallToAction />
      </main>

      <Footer />
    </div>
  );
}

/* ───────────── NAV ───────────── */

function Navbar() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="group inline-flex items-center gap-2">
          <BrandMark size={22} />
          <span className="font-serif-italic text-[15px] font-medium tracking-tight">
            MailMentor
          </span>
        </Link>
        <nav className="hidden items-center gap-1 text-[13px] text-muted-foreground sm:flex">
          <a
            href="#features"
            className="rounded-md px-3 py-1.5 transition-colors hover:bg-secondary hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="rounded-md px-3 py-1.5 transition-colors hover:bg-secondary hover:text-foreground"
          >
            How it works
          </a>
          <a
            href="#privacy"
            className="rounded-md px-3 py-1.5 transition-colors hover:bg-secondary hover:text-foreground"
          >
            Privacy
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/signin" className="hidden sm:inline-flex">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/signin">
            <Button size="sm" className="primary-halo">
              Get started
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ───────────── HERO ───────────── */

function Hero() {
  return (
    <section className="relative pt-20 pb-24 sm:pt-28 sm:pb-32">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
          <Sparkles className="h-3 w-3 text-primary" strokeWidth={2} />
          In private beta — Gmail &amp; Outlook
        </div>
        <h1 className="mx-auto mt-8 max-w-3xl text-balance font-serif-italic text-[44px] font-normal leading-[1.05] tracking-tight sm:text-[64px]">
          <span className="text-foreground">Your inbox,</span>{" "}
          <span className="title-shimmer">intelligently.</span>
        </h1>
        <p className="mx-auto mt-7 max-w-2xl text-balance text-[15.5px] leading-relaxed text-muted-foreground sm:text-[17px]">
          MailMentor reads your real Gmail or Outlook, ranks what matters,
          surfaces your to-dos, drafts replies in your voice, and turns
          one-line automations into a working assistant — all in one calm,
          focused surface.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signin">
            <Button size="lg" className="primary-halo gap-2 px-6 text-[14px]">
              <Sparkles className="h-4 w-4" strokeWidth={2} />
              Get started — it&apos;s free
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Button>
          </Link>
          <a href="#features">
            <Button variant="ghost" size="lg" className="gap-2 text-[14px]">
              See what it does
            </Button>
          </a>
        </div>
        <p className="mt-5 text-[11.5px] text-muted-foreground/70">
          No credit card. No email stored. Cancels itself when you unlink.
        </p>
      </div>
    </section>
  );
}

/* ───────────── FEATURES ───────────── */

function FeatureGrid() {
  const features = [
    {
      icon: Inbox,
      title: "Live Gmail & Outlook",
      body: "Streams your real inbox — multi-account, work and personal side by side. Switch accounts from the sidebar; everything else just works.",
    },
    {
      icon: ListChecks,
      title: "Tasks find themselves",
      body: "Reads each thread, extracts every action item, and lands them on your Tasks list with the source email one click away.",
    },
    {
      icon: Wand2,
      title: "Drafts in your voice",
      body: "Builds a profile of how you actually write — your openings, your sign-offs, your tone — and writes replies that sound like you.",
    },
    {
      icon: Calendar,
      title: "Meetings, in one click",
      body: "When someone proposes a time, propose three free slots from your calendar. When they confirm, an event appears — with a Meet link.",
    },
    {
      icon: Sparkles,
      title: "Recipes, in plain English",
      body: "Describe an automation in one sentence. MailMentor turns it into a working rule. Approve or skip every action before it runs.",
    },
    {
      icon: ShieldCheck,
      title: "Your data, your devices",
      body: "OAuth-only access. Tokens encrypted at rest. Zero copies of your mail body. Unlink and we delete the keys — instantly.",
    },
  ];
  return (
    <section id="features" className="relative border-t border-border/40 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary/80">
            What it does
          </p>
          <h2 className="mt-3 font-serif-italic text-3xl tracking-tight sm:text-4xl">
            Inbox triage, without the triage.
          </h2>
          <p className="mt-4 text-[14.5px] leading-relaxed text-muted-foreground">
            Six things MailMentor handles so you don&apos;t have to. All
            under your control — every action waits for your approval
            before it runs.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Inbox;
  title: string;
  body: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur-sm transition-colors hover:border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-px left-1/2 h-px w-1/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
      />
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <h3 className="mt-5 text-[15px] font-medium tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}

/* ───────────── PRODUCT PREVIEW ───────────── */

function ProductPreview() {
  return (
    <section className="relative border-t border-border/40 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary/80">
            The surface
          </p>
          <h2 className="mt-3 font-serif-italic text-3xl tracking-tight sm:text-4xl">
            One calm window.
          </h2>
          <p className="mt-4 text-[14.5px] leading-relaxed text-muted-foreground">
            Sidebar. Inbox. Smart panel. The same components you use daily,
            tuned to stay out of your way.
          </p>
        </div>
        <div className="relative mt-14">
          <PreviewMockup />
        </div>
      </div>
    </section>
  );
}

function PreviewMockup() {
  return (
    <div className="relative mx-auto max-w-5xl">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-12 -inset-y-6 rounded-3xl bg-primary/5 blur-3xl"
      />
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-2xl backdrop-blur-xl">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-px left-1/2 h-px w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/60 to-transparent"
        />
        {/* fake window chrome */}
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="ml-3 text-[10.5px] uppercase tracking-wider text-muted-foreground/60">
            mailmentor · inbox
          </span>
        </div>

        <div className="grid grid-cols-12 min-h-[420px]">
          {/* sidebar */}
          <aside className="col-span-3 border-r border-border/40 bg-background/30 p-3">
            <div className="flex items-center gap-2 px-1.5 pb-3">
              <BrandMark size={18} />
              <span className="font-serif-italic text-[12.5px]">MailMentor</span>
            </div>
            <ul className="space-y-0.5 text-[12px]">
              {[
                { label: "All mail", count: null, active: true },
                { label: "Important", count: "8" },
                { label: "Tasks", count: "3" },
              ].map((n) => (
                <li
                  key={n.label}
                  className={
                    "flex items-center justify-between rounded-md px-2.5 py-1.5 " +
                    (n.active
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground")
                  }
                >
                  <span>{n.label}</span>
                  {n.count && (
                    <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] tabular-nums">
                      {n.count}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-4 px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/60">
              Automation
            </div>
            <ul className="mt-1.5 space-y-0.5 text-[12px]">
              {[
                { label: "Pending", count: 2, accent: "primary" as const },
                { label: "Recipes", count: 5 },
                { label: "Connectors", count: 1, accent: "moss" as const },
              ].map((n) => (
                <li
                  key={n.label}
                  className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-muted-foreground"
                >
                  <span className="flex items-center gap-1.5">
                    {n.label}
                  </span>
                  <span
                    className={
                      "rounded-md px-1.5 py-0.5 text-[10px] tabular-nums " +
                      (n.accent === "primary"
                        ? "bg-primary/15 text-primary"
                        : n.accent === "moss"
                        ? "bg-moss/20 text-moss"
                        : "bg-secondary")
                    }
                  >
                    {n.count}
                  </span>
                </li>
              ))}
            </ul>
          </aside>

          {/* inbox */}
          <div className="col-span-6 border-r border-border/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-serif-italic text-[14px]">All mail</h3>
              <span className="text-[10.5px] text-muted-foreground/60">
                Updated just now
              </span>
            </div>
            <ul className="divide-y divide-border/30">
              {PREVIEW_EMAILS.map((e, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 py-2.5"
                >
                  <span
                    className={
                      "mt-1 h-1.5 w-1.5 shrink-0 rounded-full " +
                      (e.important
                        ? "bg-primary"
                        : "bg-muted-foreground/20")
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[12.5px] font-medium text-foreground">
                        {e.from}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground/60">
                        {e.time}
                      </span>
                    </div>
                    <p className="truncate text-[12px] text-foreground/80">
                      {e.subject}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground/70">
                      {e.preview}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* smart panel */}
          <aside className="col-span-3 p-3">
            <div className="rounded-lg border border-border/60 bg-background/40 p-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary" strokeWidth={2} />
                <span className="text-[10px] uppercase tracking-wider text-primary/80">
                  Pending
                </span>
              </div>
              <p className="mt-2 text-[12px] leading-snug text-foreground/90">
                Create &ldquo;Project sync&rdquo; on Thu 2:00 PM · Meet link
              </p>
              <div className="mt-2.5 flex items-center gap-1.5">
                <span className="inline-flex flex-1 items-center justify-center rounded-md bg-primary px-2 py-1 text-[10.5px] font-medium text-primary-foreground">
                  Approve
                </span>
                <span className="inline-flex items-center justify-center rounded-md border border-border bg-card px-2 py-1 text-[10.5px] text-muted-foreground">
                  Skip
                </span>
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-border/60 bg-background/40 p-3">
              <div className="flex items-center gap-1.5">
                <Wand2 className="h-3 w-3 text-primary" strokeWidth={2} />
                <span className="text-[10px] uppercase tracking-wider text-primary/80">
                  Smart draft
                </span>
              </div>
              <p className="mt-2 text-[12px] leading-snug text-foreground/90 line-clamp-3">
                &ldquo;Tuesday works. How about 2pm? I&apos;ll send a
                calendar invite with a Meet link — let me know if you need
                to reschedule.&rdquo;
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

const PREVIEW_EMAILS = [
  {
    from: "Sarah Chen",
    subject: "Re: Project sync",
    preview: "Let’s lock it in for Thursday at 2pm — I’ll send a Meet link.",
    time: "9:42 AM",
    important: true,
  },
  {
    from: "GitHub",
    subject: "[mailmentor] PR #128 ready for review",
    preview: "3 files changed by @minh · please review and merge when ready.",
    time: "9:14 AM",
    important: false,
  },
  {
    from: "Mom",
    subject: "Sunday lunch?",
    preview: "I’m making your favorite — what time should I expect you?",
    time: "8:51 AM",
    important: true,
  },
  {
    from: "Linear",
    subject: "Your daily digest",
    preview: "5 issues updated · 2 assigned to you · 1 due today",
    time: "8:00 AM",
    important: false,
  },
];

/* ───────────── HOW IT WORKS ───────────── */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Sign in with Google or Microsoft",
      body: "OAuth only. We never see your password. Token encrypted at rest with AES-256-GCM, deletable in one click.",
    },
    {
      n: "02",
      title: "MailMentor learns your voice",
      body: "Reads your last 50 sent emails to learn how you write — your openings, sign-offs, tone, the people you actually talk to.",
    },
    {
      n: "03",
      title: "Describe a recipe in one sentence",
      body: "“When my boss emails me, draft a reply in my voice.” MailMentor turns it into a saved rule. Every action waits for your approval before running.",
    },
  ];
  return (
    <section id="how-it-works" className="relative border-t border-border/40 py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary/80">
            How it works
          </p>
          <h2 className="mt-3 font-serif-italic text-3xl tracking-tight sm:text-4xl">
            Three minutes from sign-in to inbox.
          </h2>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 p-6"
            >
              <span className="absolute right-4 top-4 font-serif-italic text-[28px] leading-none text-primary/40">
                {s.n}
              </span>
              <h3 className="max-w-[80%] text-[15px] font-medium tracking-tight text-foreground">
                {s.title}
              </h3>
              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────── CTA ───────────── */

function CallToAction() {
  return (
    <section id="privacy" className="relative border-t border-border/40 py-24">
      <div className="mx-auto max-w-4xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/60 p-10 text-center backdrop-blur sm:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-px left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/60 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 left-1/2 h-48 w-[120%] -translate-x-1/2 bg-primary/10 blur-3xl"
          />
          <div className="relative">
            <h2 className="font-serif-italic text-3xl tracking-tight sm:text-5xl">
              Reclaim your inbox.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Sign in once, link your accounts, and start in under a
              minute. No card. No email stored. Your inbox, intelligently.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signin">
                <Button size="lg" className="primary-halo gap-2 px-6 text-[14px]">
                  <KeyRound className="h-4 w-4" strokeWidth={2} />
                  Get started
                  <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </Button>
              </Link>
              <a
                href="https://github.com"
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
              >
                <BookOpen className="h-3.5 w-3.5" strokeWidth={1.75} />
                Read the docs
              </a>
            </div>
            <ul className="mx-auto mt-10 grid max-w-md grid-cols-1 gap-2 text-left sm:grid-cols-2">
              {[
                "OAuth-only — no password",
                "Tokens encrypted at rest",
                "Zero copies of your mail body",
                "Unlink deletes everything",
              ].map((b) => (
                <li
                  key={b}
                  className="flex items-center gap-2 text-[12.5px] text-muted-foreground"
                >
                  <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── FOOTER ───────────── */

function Footer() {
  return (
    <footer className="relative border-t border-border/40 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-[11.5px] text-muted-foreground/70 sm:flex-row">
        <div className="flex items-center gap-2">
          <BrandMark size={14} />
          <span>© 2026 MailMentor</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#features" className="hover:text-foreground">
            Features
          </a>
          <a href="#privacy" className="hover:text-foreground">
            Privacy
          </a>
          <Link href="/signin" className="hover:text-foreground">
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}

/* ───────────── BACKDROP ───────────── */

function BackgroundField() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-background"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-0 -z-10 h-[80vh] w-[120vw] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,_hsl(36_65%_55%_/_0.12),_transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-0 left-0 -z-10 h-[40vh] w-[40vw] bg-[radial-gradient(circle_at_bottom_left,_hsl(95_22%_42%_/_0.08),_transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-0 right-0 -z-10 h-[40vh] w-[40vw] bg-[radial-gradient(circle_at_bottom_right,_hsl(18_55%_45%_/_0.07),_transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 noise"
      />
    </>
  );
}
