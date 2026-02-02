// Output format
export type OutputFormat = 'compact' | 'json';

// Domain types
export interface SessionData {
  id?: string;
  recipient?: string;
  channel?: string;
  updatedAt?: string;
  messageCount?: number;
}

export interface MessageData {
  role?: string;
  content?: string;
  timestamp?: string;
  channel?: string;
}
