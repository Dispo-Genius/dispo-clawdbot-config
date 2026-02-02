import type { SlackCache } from '../types';

/**
 * Resolve @name patterns in a message to Slack <@USER_ID> format.
 *
 * Supported patterns:
 * - @zeeshan → matches displayName (case-insensitive)
 * - @muhammad zeeshan → matches realName (case-insensitive)
 * - Unmatched @mentions are left unchanged
 * - Email addresses (no space before @) are not affected
 */
export function resolveUserMentions(message: string, cache: SlackCache): string {
  // Match @word or @word word patterns (but not email@domain.com)
  // Negative lookbehind (?<!\S) ensures @ is preceded by whitespace or start of string
  return message.replace(/(?<=^|\s)@(\w+(?:\s+\w+)?)/gi, (match, name) => {
    const normalizedName = name.toLowerCase();

    // Check displayName first (e.g., "zeeshan" -> MemberInfo)
    const member = cache.members[normalizedName];
    if (member) {
      return `<@${member.id}>`;
    }

    // Check by realName (case-insensitive)
    for (const [realName, userId] of Object.entries(cache.membersByRealName)) {
      if (realName.toLowerCase() === normalizedName) {
        return `<@${userId}>`;
      }
    }

    // No match - return original
    return match;
  });
}
