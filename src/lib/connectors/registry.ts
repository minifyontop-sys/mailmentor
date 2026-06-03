/**
 * Central registry of cross-app connectors. Each connector declares:
 *   - The OAuth / API surface (scopes, scopes, etc.)
 *   - Human-facing metadata (label, description, icon)
 *   - Action-handler methods (called by lib/recipe/run-action)
 *
 * To add a new connector, append a new entry to CONNECTORS, implement its
 * handler module, and add its action types to lib/recipe/schema.ts.
 */

export interface ConnectorSpec {
  provider: string;
  label: string;
  description: string;
  icon: string;
  scopes: string[];
  requiresOAuth: boolean;
}

export const CONNECTORS: ConnectorSpec[] = [
  {
    provider: "gmail",
    label: "Gmail",
    description:
      "Connect your Gmail account to read, send, and manage email messages through MailMentor.",
    icon: "✉️",
    scopes: [
      "gmail.readonly",
      "gmail.send",
      "gmail.modify",
      "openid",
      "email",
      "profile",
    ],
    requiresOAuth: true,
  },
  {
    provider: "outlook",
    label: "Outlook",
    description:
      "Connect your Outlook or Microsoft account to read, send, and manage email messages through MailMentor.",
    icon: "📧",
    scopes: [
      "Mail.Read",
      "Mail.ReadWrite",
      "Mail.Send",
      "offline_access",
      "openid",
      "profile",
      "email",
      "User.Read",
    ],
    requiresOAuth: true,
  },
  {
    provider: "google_calendar",
    label: "Google Calendar",
    description:
      "Read free/busy across your calendars and create events on your behalf. Required for meeting-proposal recipes.",
    icon: "📅",
    scopes: ["https://www.googleapis.com/auth/calendar"],
    requiresOAuth: true,
  },
  {
    provider: "slack",
    label: "Slack",
    description:
      "Post a message to a Slack channel when something happens in your inbox. (Coming soon.)",
    icon: "💬",
    scopes: ["chat:write", "channels:read"],
    requiresOAuth: true,
  },
  {
    provider: "notion",
    label: "Notion",
    description: "Create a Notion page from an email. (Coming soon.)",
    icon: "📝",
    scopes: [],
    requiresOAuth: true,
  },
];

export function listRegisteredConnectors(): ConnectorSpec[] {
  return CONNECTORS;
}

export function getConnectorSpec(provider: string): ConnectorSpec | undefined {
  return CONNECTORS.find((c) => c.provider === provider);
}
