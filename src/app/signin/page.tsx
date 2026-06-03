"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { BrandMark } from "@/components/Brand";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-x-hidden">
      <BackgroundField />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-8 px-4 py-12 sm:px-8 sm:gap-10 lg:flex-row">
        {/* Left: brand + value prop */}
        <div className="flex-1">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <BrandMark size={16} />
            <span>← Back to home</span>
          </Link>
          <div className="mt-8">
            <h1 className="font-serif-italic text-3xl tracking-tight md:text-4xl">
              MailMentor
            </h1>
          </div>
          <h2 className="mt-10 text-balance font-serif-italic text-5xl font-normal leading-[1.05] tracking-tight md:text-6xl">
            <span className="text-foreground">Your inbox,</span>
            <br />
            <span className="title-shimmer">intelligently.</span>
          </h2>
          <p className="mt-6 max-w-md text-balance text-[15px] leading-relaxed text-muted-foreground">
            MailMentor reads your real Gmail or Outlook, ranks what matters,
            extracts your to-dos, drafts replies in your voice, and runs
            one-line automations — all in one calm, focused surface.
          </p>
          <ul className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              "OAuth-only — no password",
              "Tokens encrypted at rest",
              "Zero copies of your mail body",
              "Unlink deletes everything",
            ].map((b) => (
              <li
                key={b}
                className="flex items-center gap-2 text-[12px] text-muted-foreground"
              >
                <span className="h-1 w-1 rounded-full bg-primary" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Right: Clerk sign-in */}
        <div className="w-full min-w-0 max-w-[340px] shrink-0">
          <SignIn
            routing="hash"
            fallbackRedirectUrl="/inbox"
            appearance={{
              variables: {
                colorPrimary: "hsl(36, 65%, 55%)",
                colorBackground: "hsl(30, 6%, 8%)",
                colorInputBackground: "hsl(30, 6%, 12%)",
                colorInputText: "hsl(30, 5%, 85%)",
                colorText: "hsl(30, 5%, 85%)",
                colorTextSecondary: "hsl(30, 4%, 55%)",
                colorDanger: "hsl(5, 70%, 50%)",
                borderRadius: "0.625rem",
                fontFamily: '"Inter Variable", ui-sans-serif, system-ui, sans-serif',
              },
              elements: {
                rootBox: "w-full",
                card: "!bg-[hsl(30,6%,8%)] !border !border-[hsl(30,6%,20%)] !shadow-2xl !rounded-2xl p-5",
                headerTitle: "!text-foreground !font-serif-italic !text-[17px] !tracking-tight",
                headerSubtitle: "!text-muted-foreground !text-[12.5px] !mt-1",
                socialButtonsBlockButton:
                  "!bg-[hsl(30,6%,14%)] !border !border-[hsl(30,6%,20%)] !text-foreground hover:!bg-[hsl(30,6%,18%)] !rounded-lg !h-[42px] !shadow-none !transition-colors",
                socialButtonsBlockButtonText: "!text-foreground !text-[13px] !font-medium",
                socialButtonsProviderIcon: "",
                dividerLine: "!bg-[hsl(30,6%,20%)]",
                dividerText: "!text-muted-foreground !text-[11px]",
                formFieldLabel: "!text-muted-foreground !text-[12px] !mb-1.5",
                formFieldInput:
                  "!bg-[hsl(30,6%,12%)] !border !border-[hsl(30,6%,20%)] !text-foreground !rounded-lg !h-[42px] placeholder:!text-muted-foreground/40 focus:!border-primary/60 focus:!ring-1 focus:!ring-primary/30 !transition-colors",
                formButtonPrimary:
                  "!bg-primary !text-[hsl(30,6%,8%)] hover:!bg-primary/90 !font-semibold !text-[13px] !shadow-none !rounded-lg !h-[42px] !transition-colors",
                footerActionText: "!text-muted-foreground !text-[12px]",
                footerActionLink: "!text-primary hover:!text-primary/80 !font-medium",
                badge: "!hidden",
                poweredByClerk: "!hidden",
                footer: "!hidden",
              },
            }}
          />
          <p className="mt-4 text-center text-[10.5px] text-muted-foreground/50">
            By continuing you agree to our{" "}
            <a href="#" className="underline-offset-4 hover:text-foreground hover:underline">
              terms
            </a>{" "}
            and{" "}
            <a href="#" className="underline-offset-4 hover:text-foreground hover:underline">
              privacy policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

function BackgroundField() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-background"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-0 -z-10 h-[70vh] w-[120vw] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,_hsl(36_65%_55%_/_0.14),_transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-0 left-0 -z-10 h-[50vh] w-[50vw] bg-[radial-gradient(circle_at_bottom_left,_hsl(95_22%_42%_/_0.10),_transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-0 right-0 -z-10 h-[50vh] w-[50vw] bg-[radial-gradient(circle_at_bottom_right,_hsl(18_55%_45%_/_0.10),_transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 noise"
      />
    </>
  );
}
