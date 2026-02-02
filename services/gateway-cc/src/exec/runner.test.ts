import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import type { ServiceConfig } from '../config/loader';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

vi.mock('../config/loader', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('../config/loader');
  return {
    ...actual,
    resolveToolEntryPoint: vi.fn(),
  };
});

function makeConfig(overrides?: Partial<ServiceConfig>): ServiceConfig {
  return {
    name: 'test-svc',
    tool: 'test-cc',
    toolPath: 'test-cc',
    enabled: true,
    authVars: [],
    rateLimit: { type: 'rpm', limit: 60 },
    approval: { requires: [], auto: [] },
    execution: { type: 'local' },
    ...overrides,
  };
}

function createMockChild() {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
  };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  // pipe is called on stdout/stderr
  (child.stdout as any).pipe = vi.fn();
  (child.stderr as any).pipe = vi.fn();
  return child;
}

describe('runner', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rejects when entry point does not exist', async () => {
    const { existsSync } = await import('fs');
    const { resolveToolEntryPoint } = await import('../config/loader');
    (resolveToolEntryPoint as ReturnType<typeof vi.fn>).mockReturnValue('/fake/path/index.ts');
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const { execTool } = await import('./runner');
    await expect(execTool(makeConfig(), 'run', [])).rejects.toThrow('Tool entry point not found');
  });

  it('rejects with missing env var names', async () => {
    const { existsSync } = await import('fs');
    const { resolveToolEntryPoint } = await import('../config/loader');
    (resolveToolEntryPoint as ReturnType<typeof vi.fn>).mockReturnValue('/fake/path/index.ts');
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);

    // Ensure env vars are NOT set
    delete process.env.SECRET_VAR_1;
    delete process.env.SECRET_VAR_2;

    const { execTool } = await import('./runner');
    const config = makeConfig({ authVars: ['SECRET_VAR_1', 'SECRET_VAR_2'] });
    await expect(execTool(config, 'run', [])).rejects.toThrow('SECRET_VAR_1, SECRET_VAR_2');
  });

  it('spawns with correct npx/tsx/args', async () => {
    const { existsSync } = await import('fs');
    const { resolveToolEntryPoint } = await import('../config/loader');
    const { spawn } = await import('child_process');
    (resolveToolEntryPoint as ReturnType<typeof vi.fn>).mockReturnValue('/tool/src/index.ts');
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const mockChild = createMockChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValue(mockChild);

    const { execTool } = await import('./runner');
    const promise = execTool(makeConfig(), 'analyze', ['--verbose', 'file.txt']);

    // Emit close to resolve promise
    mockChild.emit('close', 0);
    await promise;

    expect(spawn).toHaveBeenCalledWith(
      'npx',
      ['tsx', '/tool/src/index.ts', 'analyze', '--verbose', 'file.txt'],
      expect.objectContaining({ shell: false }),
    );
  });

  it('returns exit code 0 and duration', async () => {
    const { existsSync } = await import('fs');
    const { resolveToolEntryPoint } = await import('../config/loader');
    const { spawn } = await import('child_process');
    (resolveToolEntryPoint as ReturnType<typeof vi.fn>).mockReturnValue('/tool/src/index.ts');
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const mockChild = createMockChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValue(mockChild);

    const { execTool } = await import('./runner');
    const promise = execTool(makeConfig(), 'run', []);
    mockChild.emit('close', 0);

    const result = await promise;
    expect(result.exitCode).toBe(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('propagates non-zero exit code', async () => {
    const { existsSync } = await import('fs');
    const { resolveToolEntryPoint } = await import('../config/loader');
    const { spawn } = await import('child_process');
    (resolveToolEntryPoint as ReturnType<typeof vi.fn>).mockReturnValue('/tool/src/index.ts');
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const mockChild = createMockChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValue(mockChild);

    const { execTool } = await import('./runner');
    const promise = execTool(makeConfig(), 'run', []);
    mockChild.emit('close', 42);

    const result = await promise;
    expect(result.exitCode).toBe(42);
  });

  it('rejects on spawn error', async () => {
    const { existsSync } = await import('fs');
    const { resolveToolEntryPoint } = await import('../config/loader');
    const { spawn } = await import('child_process');
    (resolveToolEntryPoint as ReturnType<typeof vi.fn>).mockReturnValue('/tool/src/index.ts');
    (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const mockChild = createMockChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValue(mockChild);

    const { execTool } = await import('./runner');
    const promise = execTool(makeConfig(), 'run', []);
    mockChild.emit('error', new Error('ENOENT'));

    await expect(promise).rejects.toThrow('Failed to spawn tool process');
  });
});
