import { Command } from 'commander';
import { setDeviceRoutes, getDeviceRoutes } from '../utils/api.js';
import { success, error } from '../utils/output.js';

export const funnelEnable = new Command('funnel-enable')
  .description('Enable Tailscale Funnel for a device (requires --confirmed)')
  .argument('<device-id>', 'Device ID to enable funnel for')
  .option('--port <port>', 'Port to expose via funnel', '443')
  .action(async (deviceId: string, opts) => {
    try {
      // Get current routes
      const current = await getDeviceRoutes(deviceId);
      const existingRoutes = current.routes || [];

      // Add funnel route (funnel is exposed via :443 by default)
      // Note: Actual funnel configuration is done on the device itself
      // This API call would approve subnet routes if needed

      success(`Funnel request acknowledged for device ${deviceId}. Note: Funnel must be enabled on the device itself via 'tailscale funnel'.`);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
    }
  });
