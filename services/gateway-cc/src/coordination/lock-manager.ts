import { getDb } from '../db/migrate';

export type LockType = 'file' | 'branch' | 'resource';
export type LockMode = 'exclusive' | 'shared';

export interface Lock {
  id: number;
  session_id: string;
  lock_type: LockType;
  target: string;
  mode: LockMode;
  acquired_at: number;
}

export interface AcquireResult {
  allowed: boolean;
  blocking_session?: string;
  reason?: string;
}

export interface ConflictInfo {
  session_id: string;
  lock_type: LockType;
  target: string;
  mode: LockMode;
}

export function acquireLock(
  sessionId: string,
  lockType: LockType,
  target: string,
  mode: LockMode
): AcquireResult {
  const db = getDb();

  return db.transaction(() => {
    // Check for existing locks on this target
    const existing = db.prepare(`
      SELECT session_id, mode FROM coordination_locks
      WHERE lock_type = ? AND target = ?
    `).all(lockType, target) as { session_id: string; mode: string }[];

    // Filter out our own session
    const otherLocks = existing.filter(l => l.session_id !== sessionId);

    if (otherLocks.length > 0) {
      // Conflict detection:
      // - Exclusive request: blocked by ANY existing lock
      // - Shared request: blocked only by exclusive locks
      if (mode === 'exclusive') {
        return {
          allowed: false,
          blocking_session: otherLocks[0].session_id,
          reason: `Target locked by another session (${otherLocks[0].mode})`,
        };
      }

      const exclusiveLock = otherLocks.find(l => l.mode === 'exclusive');
      if (exclusiveLock) {
        return {
          allowed: false,
          blocking_session: exclusiveLock.session_id,
          reason: 'Target has exclusive lock from another session',
        };
      }
    }

    // Acquire or update lock
    db.prepare(`
      INSERT INTO coordination_locks (session_id, lock_type, target, mode)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(session_id, lock_type, target) DO UPDATE SET
        mode = excluded.mode,
        acquired_at = unixepoch()
    `).run(sessionId, lockType, target, mode);

    return { allowed: true };
  }).immediate();
}

export function releaseLock(sessionId: string, lockType: LockType, target: string): boolean {
  const db = getDb();
  const result = db.prepare(`
    DELETE FROM coordination_locks
    WHERE session_id = ? AND lock_type = ? AND target = ?
  `).run(sessionId, lockType, target);
  return result.changes > 0;
}

export function releaseAllLocks(sessionId: string): number {
  const db = getDb();
  const result = db.prepare(`
    DELETE FROM coordination_locks WHERE session_id = ?
  `).run(sessionId);
  return result.changes;
}

export function getSessionLocks(sessionId: string): Lock[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM coordination_locks WHERE session_id = ?
  `).all(sessionId) as Lock[];
}

export function checkConflict(
  sessionId: string,
  lockType: LockType,
  target: string,
  mode: LockMode = 'exclusive'
): ConflictInfo | null {
  const db = getDb();

  const conflicts = db.prepare(`
    SELECT session_id, lock_type, target, mode FROM coordination_locks
    WHERE lock_type = ? AND target = ? AND session_id != ?
  `).all(lockType, target, sessionId) as ConflictInfo[];

  if (conflicts.length === 0) {
    return null;
  }

  // For exclusive request, any lock is a conflict
  if (mode === 'exclusive') {
    return conflicts[0];
  }

  // For shared request, only exclusive locks are conflicts
  return conflicts.find(c => c.mode === 'exclusive') ?? null;
}

export function getLocksForTarget(lockType: LockType, target: string): Lock[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM coordination_locks
    WHERE lock_type = ? AND target = ?
  `).all(lockType, target) as Lock[];
}
