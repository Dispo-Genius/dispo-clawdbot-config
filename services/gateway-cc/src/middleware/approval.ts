import type { ApprovalConfig } from '../config/loader';

export interface ApprovalResult {
  approved: boolean;
  reason?: string;
  requiresUserConfirmation?: boolean;
}

/**
 * Check if a command is approved for automatic execution.
 * - If command is in `auto` list → approved
 * - If command is in `requires` list → approved with requiresUserConfirmation flag
 *   (actual enforcement happens at the Claude Code layer via chat-based user confirmation)
 * - If neither list contains the command → approved (default-allow for unlisted commands)
 */
export function checkApproval(command: string, config: ApprovalConfig): ApprovalResult {
  if (config.auto.includes(command)) {
    return { approved: true };
  }

  if (config.requires.includes(command)) {
    return {
      approved: true,
      requiresUserConfirmation: true,
      reason: `Command "${command}" is sensitive (user confirmation enforced by Claude Code).`,
    };
  }

  return { approved: true };
}
