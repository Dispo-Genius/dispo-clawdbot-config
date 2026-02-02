import { checkConflict, type ConflictInfo, type LockType } from './lock-manager';
import { getSession } from './session-registry';

export type Operation = 'Edit' | 'Write' | 'Read' | 'Bash' | 'Delete';

export interface CheckRequest {
  session_id: string;
  operation: Operation;
  target: string;
}

export interface CheckResult {
  allowed: boolean;
  reason?: string;
  blocking_session?: {
    id: string;
    client_id?: string;
    user?: string;
    current_operation?: string;
  };
}

// Map operations to required lock modes
function getRequiredLockMode(operation: Operation): 'exclusive' | 'shared' | null {
  switch (operation) {
    case 'Edit':
    case 'Write':
    case 'Delete':
      return 'exclusive';
    case 'Read':
      return 'shared';
    case 'Bash':
      // Bash operations don't require file locks
      return null;
    default:
      return null;
  }
}

// Get lock type based on target
function getLockType(target: string): LockType {
  // Branch references
  if (target.startsWith('refs/') || target.startsWith('origin/')) {
    return 'branch';
  }
  // Resource patterns (could be extended)
  if (target.startsWith('resource:')) {
    return 'resource';
  }
  // Default to file
  return 'file';
}

export function checkOperation(request: CheckRequest): CheckResult {
  const { session_id, operation, target } = request;

  const requiredMode = getRequiredLockMode(operation);
  if (!requiredMode) {
    return { allowed: true };
  }

  const lockType = getLockType(target);
  const conflict = checkConflict(session_id, lockType, target, requiredMode);

  if (!conflict) {
    return { allowed: true };
  }

  // Get details about the blocking session
  const blockingSession = getSession(conflict.session_id);

  return {
    allowed: false,
    reason: `File "${target}" is being edited by another session`,
    blocking_session: {
      id: conflict.session_id,
      client_id: blockingSession?.client_id,
      user: blockingSession?.user,
      current_operation: blockingSession?.current_operation,
    },
  };
}

// Quick check without detailed session info
export function isTargetLocked(
  sessionId: string,
  target: string,
  operation: Operation = 'Edit'
): boolean {
  const requiredMode = getRequiredLockMode(operation);
  if (!requiredMode) {
    return false;
  }

  const lockType = getLockType(target);
  const conflict = checkConflict(sessionId, lockType, target, requiredMode);
  return conflict !== null;
}
