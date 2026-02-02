import { describe, it, expect } from 'vitest';
import { checkApproval } from './approval';
import type { ApprovalConfig } from '../config/loader';

describe('checkApproval', () => {
  it('approves command in auto list', () => {
    const config: ApprovalConfig = { auto: ['analyze', 'generate'], requires: [] };
    const result = checkApproval('analyze', config);
    expect(result).toEqual({ approved: true });
  });

  it('rejects command in requires list', () => {
    const config: ApprovalConfig = { auto: [], requires: ['delete', 'purge'] };
    const result = checkApproval('delete', config);
    expect(result.approved).toBe(false);
    expect(result.reason).toContain('delete');
  });

  it('approves unlisted command (default-allow)', () => {
    const config: ApprovalConfig = { auto: ['analyze'], requires: ['delete'] };
    const result = checkApproval('status', config);
    expect(result).toEqual({ approved: true });
  });

  it('approves any command when both lists are empty', () => {
    const config: ApprovalConfig = { auto: [], requires: [] };
    expect(checkApproval('anything', config)).toEqual({ approved: true });
  });

  it('auto takes precedence when command is in both lists', () => {
    const config: ApprovalConfig = { auto: ['deploy'], requires: ['deploy'] };
    const result = checkApproval('deploy', config);
    expect(result).toEqual({ approved: true });
  });
});
