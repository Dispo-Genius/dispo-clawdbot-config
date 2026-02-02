// Cache structure stored in .slack-cache.json
export interface SlackCache {
  lastSynced: string;
  workspace: {
    id: string;
    name: string;
  };
  channels: Record<string, ChannelInfo>; // Keyed by normalized name (lowercase, no #)
  members: Record<string, MemberInfo>; // Keyed by display_name (lowercase)
  membersByRealName: Record<string, string>; // "Jane Smith" -> user ID
}

export interface ChannelInfo {
  id: string;
  name: string;
  isPrivate: boolean;
}

export interface MemberInfo {
  id: string;
  displayName: string;
  realName: string;
  email?: string;
}

// Response types
export interface SuccessResponse {
  success: true;
  [key: string]: unknown;
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export type CommandResponse = SuccessResponse | ErrorResponse;

// Command-specific response types
export interface SyncResponse extends SuccessResponse {
  message: string;
  channelCount: number;
  memberCount: number;
  cacheFile: string;
}

export interface SendMessageResponse extends SuccessResponse {
  channel: string;
  channelId: string;
  messageTs: string;
  permalink: string;
}

export interface SendDmResponse extends SuccessResponse {
  user: string;
  userId: string;
  channelId: string;
  messageTs: string;
}

export interface ListChannelsResponse extends SuccessResponse {
  count: number;
  channels: Array<{
    name: string;
    id: string;
    isPrivate: boolean;
  }>;
}

export interface ListMembersResponse extends SuccessResponse {
  count: number;
  members: Array<{
    id: string;
    displayName: string;
    realName: string;
    email?: string;
  }>;
}

export interface SlackMessage {
  ts: string;
  text: string;
  user: string;
  userName?: string;
  timestamp: string;
  threadTs?: string;
  replyCount?: number;
}

export interface GetHistoryResponse extends SuccessResponse {
  channel: string;
  channelId: string;
  count: number;
  messages: SlackMessage[];
}

export interface EditMessageResponse extends SuccessResponse {
  channel: string;
  channelId: string;
  messageTs: string;
  permalink: string;
}

export interface DeleteMessageResponse extends SuccessResponse {
  channel: string;
  channelId: string;
  deletedTs: string;
}
