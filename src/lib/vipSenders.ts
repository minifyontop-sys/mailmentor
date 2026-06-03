export const VIP_SENDERS = [
  { name: "Sarah Chen", email: "sarah.chen@acme.com" },
  { name: "Marcus Webb", email: "marcus@globalclient.io" },
  { name: "Emma Larsen", email: "emma.larsen@gmail.com" },
] as const;

export const VIP_EMAILS = VIP_SENDERS.map((s) => s.email.toLowerCase());

export function isVip(email: string): boolean {
  return VIP_EMAILS.includes(email.toLowerCase());
}
