import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';
import { homedir } from 'os';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
}));

describe('loader', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  function mockServicesDir(
    dirs: { name: string; gatewayJson?: object | null; malformed?: boolean }[]
  ) {
    return async () => {
      const fs = await import('fs');
      const existsSyncMock = fs.existsSync as ReturnType<typeof vi.fn>;
      const readFileSyncMock = fs.readFileSync as ReturnType<typeof vi.fn>;
      const readdirSyncMock = fs.readdirSync as ReturnType<typeof vi.fn>;

      // Services dir exists
      existsSyncMock.mockImplementation((p: string) => {
        if (p.endsWith('services')) return true;
        // gateway.json existence
        for (const d of dirs) {
          if (p.endsWith(path.join(d.name, 'gateway.json'))) {
            return d.gatewayJson !== null && d.gatewayJson !== undefined;
          }
        }
        return false;
      });

      readdirSyncMock.mockReturnValue(
        dirs.map((d) => ({ name: d.name, isDirectory: () => true }))
      );

      readFileSyncMock.mockImplementation((p: string) => {
        for (const d of dirs) {
          if (p.endsWith(path.join(d.name, 'gateway.json'))) {
            if (d.malformed) return '{ broken json';
            return JSON.stringify(d.gatewayJson);
          }
        }
        return '{}';
      });

      const loader = await import('./loader');
      return { loader, fs };
    };
  }

  it('discovers services from gateway.json files', async () => {
    const load = mockServicesDir([
      {
        name: 'linear-cc',
        gatewayJson: {
          enabled: true,
          authVars: ['LINEAR_API_KEY'],
          rateLimit: { type: 'rpm', limit: 80 },
          approval: { auto: ['list-projects'], requires: [] },
        },
      },
      {
        name: 'diagram-cc',
        gatewayJson: {
          enabled: true,
          rateLimit: { type: 'none' },
        },
      },
    ]);
    const { loader } = await load();
    const services = loader.listServices();
    expect(services).toHaveLength(2);
  });

  it('strips -cc suffix for service name', async () => {
    const load = mockServicesDir([
      { name: 'linear-cc', gatewayJson: { rateLimit: { type: 'rpm', limit: 80 } } },
    ]);
    const { loader } = await load();
    const svc = loader.getService('linear');
    expect(svc).toBeDefined();
    expect(svc!.name).toBe('linear');
    expect(svc!.tool).toBe('linear-cc');
    expect(svc!.toolPath).toBe('linear-cc');
  });

  it('parses RateLimitConfig with type and limit', async () => {
    const load = mockServicesDir([
      { name: 'slack-cc', gatewayJson: { rateLimit: { type: 'rpm', limit: 50 } } },
    ]);
    const { loader } = await load();
    const svc = loader.getService('slack')!;
    expect(svc.rateLimit).toEqual({ type: 'rpm', limit: 50 });
  });

  it('parses concurrency rate limit type', async () => {
    const load = mockServicesDir([
      { name: 'polaris-cc', gatewayJson: { rateLimit: { type: 'concurrency', limit: 3 } } },
    ]);
    const { loader } = await load();
    const svc = loader.getService('polaris')!;
    expect(svc.rateLimit).toEqual({ type: 'concurrency', limit: 3 });
  });

  it('parses none rate limit type (no limit field)', async () => {
    const load = mockServicesDir([
      { name: 'diagram-cc', gatewayJson: { rateLimit: { type: 'none' } } },
    ]);
    const { loader } = await load();
    const svc = loader.getService('diagram')!;
    expect(svc.rateLimit).toEqual({ type: 'none', limit: undefined });
  });

  it('defaults enabled to true', async () => {
    const load = mockServicesDir([
      { name: 'spec-cc', gatewayJson: { rateLimit: { type: 'none' } } },
    ]);
    const { loader } = await load();
    expect(loader.getService('spec')!.enabled).toBe(true);
  });

  it('defaults authVars to empty array', async () => {
    const load = mockServicesDir([
      { name: 'spec-cc', gatewayJson: { rateLimit: { type: 'none' } } },
    ]);
    const { loader } = await load();
    expect(loader.getService('spec')!.authVars).toEqual([]);
  });

  it('defaults approval to empty arrays', async () => {
    const load = mockServicesDir([
      { name: 'spec-cc', gatewayJson: { rateLimit: { type: 'none' } } },
    ]);
    const { loader } = await load();
    const svc = loader.getService('spec')!;
    expect(svc.approval).toEqual({ requires: [], auto: [] });
  });

  it('skips directories without gateway.json silently', async () => {
    const load = mockServicesDir([
      { name: 'wip-cc', gatewayJson: null },
      { name: 'linear-cc', gatewayJson: { rateLimit: { type: 'rpm', limit: 80 } } },
    ]);
    const { loader } = await load();
    const services = loader.listServices();
    expect(services).toHaveLength(1);
    expect(services[0].name).toBe('linear');
  });

  it('skips malformed gateway.json with stderr warning', async () => {
    const warnSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const load = mockServicesDir([
      { name: 'broken-cc', gatewayJson: {}, malformed: true },
      { name: 'linear-cc', gatewayJson: { rateLimit: { type: 'rpm', limit: 80 } } },
    ]);
    const { loader } = await load();
    const services = loader.listServices();
    expect(services).toHaveLength(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Skipping broken-cc'));
    warnSpy.mockRestore();
  });

  it('skips directories not ending in -cc', async () => {
    const load = mockServicesDir([
      { name: 'not-a-tool', gatewayJson: { rateLimit: { type: 'none' } } },
      { name: 'linear-cc', gatewayJson: { rateLimit: { type: 'rpm', limit: 80 } } },
    ]);
    const { loader } = await load();
    // not-a-tool doesn't end in -cc, so skipped
    expect(loader.listServices()).toHaveLength(1);
  });

  it('returns empty registry when services dir missing', async () => {
    vi.resetModules();
    const fs = await import('fs');
    (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const loader = await import('./loader');
    expect(loader.listServices()).toHaveLength(0);
  });

  it('caches — readdirSync called once across multiple loads', async () => {
    const load = mockServicesDir([
      { name: 'linear-cc', gatewayJson: { rateLimit: { type: 'rpm', limit: 80 } } },
    ]);
    const { loader, fs } = await load();
    (fs.readdirSync as ReturnType<typeof vi.fn>).mockClear();
    loader.loadServices();
    loader.loadServices();
    loader.loadServices();
    expect(fs.readdirSync).toHaveBeenCalledTimes(1);
  });

  it('reloadServices clears cache and re-reads', async () => {
    const load = mockServicesDir([
      { name: 'linear-cc', gatewayJson: { rateLimit: { type: 'rpm', limit: 80 } } },
    ]);
    const { loader, fs } = await load();
    (fs.readdirSync as ReturnType<typeof vi.fn>).mockClear();
    loader.loadServices();
    expect(fs.readdirSync).toHaveBeenCalledTimes(1);
    loader.loadServices();
    expect(fs.readdirSync).toHaveBeenCalledTimes(1);
    loader.reloadServices();
    expect(fs.readdirSync).toHaveBeenCalledTimes(2);
  });

  it('resolveToolEntryPoint returns correct path under services/', async () => {
    const load = mockServicesDir([
      { name: 'linear-cc', gatewayJson: { rateLimit: { type: 'rpm', limit: 80 } } },
    ]);
    const { loader } = await load();
    const config = loader.getService('linear')!;
    const entryPoint = loader.resolveToolEntryPoint(config);
    expect(entryPoint).toBe(
      path.join(homedir(), '.claude', 'services', 'linear-cc', 'src', 'index.ts')
    );
  });
});
