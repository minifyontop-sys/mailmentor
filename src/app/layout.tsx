import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { GradientBg } from "@/components/GradientBg";
import { Providers } from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
  style: ["italic", "normal"],
  axes: ["SOFT", "opsz"],
});

export const metadata: Metadata = {
  title: "MailMentor — your inbox, intelligently.",
  description:
    "Read your real Gmail or Outlook, rank what matters, extract to-dos, draft replies in your voice, and run one-line automations. OAuth-only. No email stored. Free during private beta.",
  verification: {
    google: "3FQ2VbsVeSFWmTgFvz8sgw9sR3QCE9422bhtl3qb_eY",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
    >
      <html
        lang="en"
        className={`dark ${inter.variable} ${fraunces.variable}`}
      >
        <body className="antialiased">
          <GradientBg />
          <div className="relative z-10">
            <Providers>{children}</Providers>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
