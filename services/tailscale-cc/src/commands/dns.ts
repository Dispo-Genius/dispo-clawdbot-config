import { Command } from 'commander';
import { getDNS } from '../utils/api.js';
import { output, error } from '../utils/output.js';

export const dns = new Command('dns')
  .description('Get DNS configuration for the tailnet')
  .option('-t, --tailnet <name>', 'Tailnet name (default: - for current)', '-')
  .action(async (opts) => {
    try {
      const dnsConfig = await getDNS(opts.tailnet);

      const data = {
        nameservers: dnsConfig.dns?.join(', ') || 'none',
        magicDNS: dnsConfig.magicDNS ? 'enabled' : 'disabled',
        searchPaths: dnsConfig.searchPaths?.join(', ') || 'none',
      };

      output(data);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
    }
  });
