// Gleap API Types

export interface GleapTicket {
  id: string;
  title?: string;
  status: 'OPEN' | 'INPROGRESS' | 'CLOSED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  type: 'BUG' | 'FEEDBACK' | 'FEATURE_REQUEST' | 'TICKET';
  createdAt: string;
  updatedAt: string;
  assignedTo?: GleapUser;
  sender?: GleapUser;
  tags?: string[];
  customData?: Record<string, unknown>;
}

export interface GleapMessage {
  id: string;
  text: string;
  type: 'BOT' | 'ADMIN' | 'USER';
  createdAt: string;
  sender?: GleapUser;
  attachments?: GleapAttachment[];
}

export interface GleapUser {
  id: string;
  email?: string;
  name?: string;
  phone?: string;
  value?: number;
  createdAt?: string;
  lastActivity?: string;
  customData?: Record<string, unknown>;
}

export interface GleapAttachment {
  url: string;
  name: string;
  type: string;
}

export interface GleapConversation {
  id: string;
  type: 'ticket' | 'chat' | 'bot';
  status: 'OPEN' | 'INPROGRESS' | 'CLOSED';
  priority?: string;
  createdAt: string;
  updatedAt: string;
  sender?: GleapUser;
  assignedTo?: GleapUser;
  messages?: GleapMessage[];
  tags?: string[];
  title?: string;
}

export interface GleapKBArticle {
  id: string;
  title: string;
  content: string;
  category?: string;
  url?: string;
}

export interface GleapApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ListTicketsParams {
  status?: 'OPEN' | 'INPROGRESS' | 'CLOSED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  limit?: number;
  skip?: number;
  sort?: string;
  search?: string;
  assignedTo?: string;
  type?: string;
}

export interface UpdateTicketParams {
  status?: 'OPEN' | 'INPROGRESS' | 'CLOSED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedTo?: string;
  tags?: string[];
}
