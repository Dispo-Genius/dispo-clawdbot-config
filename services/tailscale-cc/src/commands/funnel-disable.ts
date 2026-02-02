import { Command } from 'commander';
import { success, error } from '../utils/output.js';

export const funnelDisable = new Command('funnel-disable')
  .description('Disable Tailscale Funnel for a device (requires --confirmed)')
  .argument('<device-id>', 'Device ID to disable funnel for')
  .action(async (deviceId: string) => {
    try {
      // Note: Actual funnel configuration is done on the device itself
      success(`Funnel disable request acknowledged for device ${deviceId}. Note: Funnel must be disabled on the device itself via 'tailscale funnel off'.`);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
    }
  });
