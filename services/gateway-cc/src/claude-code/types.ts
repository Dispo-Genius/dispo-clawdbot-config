// Session states
export type SessionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'killed' | 'timeout';

// Spawn request
export interface SpawnRequest {
  prompt: string;                    // Task description for Claude Code
  cwd: string;                       // Working directory (must be in allowlist)
  model?: string;                    // Model: sonnet, opus, haiku (default: sonnet)
  timeout?: number;                  // Seconds (default: 600, max: 3600)
  permissionMode?: 'default' | 'plan' | 'bypassPermissions';  // Default: bypassPermissions
  allowedTools?: string[];           // Tool restrictions
  systemPrompt?: string;             // Additional system prompt
  callbackUrl?: string;              // Webhook on completion
}

// Spawn response
export interface SpawnResponse {
  sessionId: string;
  status: 'pending';
  createdAt: string;
}

// Session state
export interface Session {
  id: string;
  status: SessionStatus;
  prompt: string;
  cwd: string;
  model: string;
  pid?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  timeout: number;
  exitCode?: number;
  error?: string;
  callbackUrl?: string;
}

// Session result (from Claude Code output)
export interface SessionResult {
  session: Session;
  output?: ClaudeCodeOutput;         // Parsed JSON output
  rawOutput?: string;                // Raw stdout if JSON parse fails
}

// Claude Code JSON output format
export interface ClaudeCodeOutput {
  type: 'result';
  subtype: 'success' | 'error_max_turns' | 'error_during_execution';
  cost_usd: number;
  duration_ms: number;
  duration_api_ms: number;
  is_error: boolean;
  num_turns: number;
  result?: string;                   // Final result text
  session_id: string;
  total_cost_usd: number;
}
