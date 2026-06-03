export interface Sender {
  name: string;
  email: string;
}

export interface Email {
  id: string;
  sender: Sender;
  subject: string;
  body: string;
  snippet: string;
  date: string;
  threadId: string;
  isUnread: boolean;
  labels: string[];
  isReplyToMine?: boolean;
  messageId?: string;
  references?: string;
}

export interface ExtractedTask {
  id: string;
  description: string;
  deadline?: string;
  sourceEmailId: string;
  sourceEmailSubject: string;
  done: boolean;
  createdAt: string;
}

export interface AIReply {
  text: string;
  generatedAt: string;
}

export interface AIResult {
  summary: string;
  tasks: { description: string; deadline?: string }[];
}

export type { UserProfile } from "@/lib/profile";
