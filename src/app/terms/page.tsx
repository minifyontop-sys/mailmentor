export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 text-foreground/80">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">Terms of Service</h1>
      <div className="space-y-4 text-sm leading-relaxed">
        <p>By using MailMentor you agree to the following terms.</p>
        <h2 className="text-lg font-medium text-foreground">Service</h2>
        <p>MailMentor is an AI-powered email client. The service is provided &quot;as is&quot; without warranty of any kind.</p>
        <h2 className="text-lg font-medium text-foreground">API Usage</h2>
        <p>You retain ownership of your data. The service acts solely on your behalf through authorized API connections.</p>
        <h2 className="text-lg font-medium text-foreground">Limitations</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>AI-generated replies should be reviewed before sending.</li>
          <li>Recipe actions are always previewed for approval before execution.</li>
          <li>Service availability depends on third-party providers (Clerk, Groq, Google, Microsoft).</li>
        </ul>
        <h2 className="text-lg font-medium text-foreground">Contact</h2>
        <p>Email: notbasicminh@gmail.com</p>
        <p className="mt-8 text-xs text-muted-foreground">Last updated: June 3, 2026</p>
      </div>
    </main>
  );
}
