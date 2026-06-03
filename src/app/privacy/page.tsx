export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 text-foreground/80">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">Privacy Policy</h1>
      <div className="space-y-4 text-sm leading-relaxed">
        <p>MailMentor does not store or share your personal data beyond what is necessary to provide the service.</p>
        <h2 className="text-lg font-medium text-foreground">Data We Access</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Email messages</strong> — read and send via Gmail / Outlook APIs, only for the account you explicitly connect.</li>
          <li><strong>Calendar events</strong> — read free/busy to propose meeting times, only if you connect Google Calendar.</li>
          <li><strong>User profile</strong> — name, email address from your authentication provider (Clerk).</li>
        </ul>
        <h2 className="text-lg font-medium text-foreground">How We Use Data</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>AI features (reply suggestions, meeting detection) process email content ephemerally via Groq API. No email text is stored in our database.</li>
          <li>Email provider tokens are encrypted at rest and used only to make API calls on your behalf.</li>
        </ul>
        <h2 className="text-lg font-medium text-foreground">Data Retention</h2>
        <p>No email content is stored server-side. OAuth tokens persist until you disconnect the account.</p>
        <h2 className="text-lg font-medium text-foreground">Contact</h2>
        <p>Email: notbasicminh@gmail.com</p>
        <p className="mt-8 text-xs text-muted-foreground">Last updated: June 3, 2026</p>
      </div>
    </main>
  );
}
