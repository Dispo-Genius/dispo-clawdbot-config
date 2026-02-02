/**
 * Allowlist configuration for slack-cc
 * Restricts which channels and users Claude can message
 */

// Channels Claude is allowed to send messages to (lowercase, no # prefix)
export const ALLOWED_CHANNELS = [
  'insights',
  'prototype-v2-releases',
  'prototype-releases',
];

// Users Claude is allowed to DM (lowercase display names or real names)
export const ALLOWED_DM_RECIPIENTS = [
  'andy',
  'andy rong',
  'ali',
];

/**
 * Check if a channel is in the allowlist
 */
export function isChannelAllowed(channelName: string): boolean {
  const normalized = channelName.replace(/^#/, '').toLowerCase().trim();
  return ALLOWED_CHANNELS.some(
    (allowed) => normalized === allowed || normalized.includes(allowed) || allowed.includes(normalized)
  );
}

/**
 * Check if a DM recipient is in the allowlist
 */
export function isDmRecipientAllowed(userName: string): boolean {
  const normalized = userName.replace(/^@/, '').toLowerCase().trim();
  return ALLOWED_DM_RECIPIENTS.some(
    (allowed) => normalized === allowed || normalized.includes(allowed) || allowed.includes(normalized)
  );
}

/**
 * Get formatted list of allowed channels for error messages
 */
export function getAllowedChannelsList(): string {
  return ALLOWED_CHANNELS.map((c) => `#${c}`).join(', ');
}

/**
 * Get formatted list of allowed DM recipients for error messages
 */
export function getAllowedDmRecipientsList(): string {
  return ALLOWED_DM_RECIPIENTS.join(', ');
}
