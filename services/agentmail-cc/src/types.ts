export interface Inbox {
  inboxId: string;
  username?: string;
  domain?: string;
  displayName?: string;
  createdAt?: string;
}

export interface Message {
  messageId: string;
  threadId?: string;
  inboxId: string;
  from?: string;
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
  labels?: string[];
  createdAt?: string;
}

export interface MessageSummary {
  messageId: string;
  threadId?: string;
  from?: string;
  to?: string;
  subject?: string;
  createdAt?: string;
}

export interface InboxListResponse {
  count: number;
  inboxes: Inbox[];
}

export interface MessageListResponse {
  count: number;
  messages: MessageSummary[];
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  labels?: string[];
}
