export interface PendingAction {
  id: string;
  recipeId: string | null;
  triggerEmailId: string | null;
  actionType: string;
  payload: Record<string, unknown>;
  preview: string;
  status: "pending" | "approved" | "denied" | "expired";
  expiresAt: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface Recipe {
  id: string;
  name: string;
  description: string | null;
  naturalLanguage: string;
  trigger: {
    type: "email.arrived" | "email.sent" | "schedule" | "manual";
    cron?: string;
  };
  conditions: Array<{
    field: "sender" | "senderEmail" | "subject" | "body" | "hasAttachment" | "fromVip" | "label";
    op: "contains" | "equals" | "matches" | "exists";
    value?: string;
  }>;
  actions: Array<{
    type: string;
    params: Record<string, unknown>;
  }>;
  enabled: boolean;
  lastRunAt: string | null;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectorStatus {
  provider: string;
  connected: boolean;
  metadata?: Record<string, unknown> | null;
  expiresAt?: string | null;
}
