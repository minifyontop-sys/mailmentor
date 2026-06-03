import { redirect } from "next/navigation";

/**
 * /signup redirects to /signin. In an OAuth-only flow there's no
 * separate registration step — signing in with Google or Microsoft
 * is the same as signing up. If the user doesn't have a MailMentor
 * row yet, the auth callback creates one.
 */
export default function SignupPage() {
  redirect("/signin");
}
