import { Command } from 'commander';
import { listDevices } from '../utils/api.js';
import { output, error } from '../utils/output.js';

export const devices = new Command('devices')
  .description('List all devices in the tailnet')
  .option('-t, --tailnet <name>', 'Tailnet name (default: - for current)', '-')
  .action(async (opts) => {
    try {
      const deviceList = await listDevices(opts.tailnet);

      const data = deviceList.map((d) => ({
        id: d.id,
        name: d.name,
        hostname: d.hostname,
        os: d.os,
        ip: d.addresses[0] || '',
        online: d.online ? 'yes' : 'no',
        lastSeen: d.lastSeen ? new Date(d.lastSeen).toISOString().slice(0, 16) : '',
      }));

      output(data);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
    }
  });
