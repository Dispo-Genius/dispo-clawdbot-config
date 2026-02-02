import { Command } from 'commander';
import { getDevice, getDeviceRoutes } from '../utils/api.js';
import { output, error } from '../utils/output.js';

export const status = new Command('status')
  .description('Get detailed status of a device')
  .argument('<device-id>', 'Device ID to get status for')
  .action(async (deviceId: string) => {
    try {
      const device = await getDevice(deviceId);
      const routes = await getDeviceRoutes(deviceId);

      const data = {
        id: device.id,
        name: device.name,
        hostname: device.hostname,
        os: device.os,
        addresses: device.addresses.join(', '),
        online: device.online ? 'yes' : 'no',
        authorized: device.authorized ? 'yes' : 'no',
        lastSeen: device.lastSeen ? new Date(device.lastSeen).toISOString() : 'never',
        routes: routes.routes?.join(', ') || 'none',
        advertisedRoutes: routes.advertisedRoutes?.join(', ') || 'none',
      };

      output(data);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
    }
  });
