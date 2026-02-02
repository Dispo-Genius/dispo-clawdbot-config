/**
 * Tailscale API client.
 * Uses TAILSCALE_API_KEY from environment (injected by gateway).
 */

const BASE_URL = 'https://api.tailscale.com/api/v2';

function getApiKey(): string {
  const apiKey = process.env.TAILSCALE_API_KEY;
  if (!apiKey) {
    throw new Error('TAILSCALE_API_KEY not set. Ensure gateway is configured with authVars.');
  }
  return apiKey;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getApiKey()}`,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const text = await response.text();

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const errorData = JSON.parse(text);
      errorMsg = errorData.message || errorData.error || errorMsg;
    } catch {
      if (text) errorMsg = text;
    }
    throw new Error(errorMsg);
  }

  if (!text) return {} as T;
  return JSON.parse(text);
}

export interface Device {
  id: string;
  name: string;
  hostname: string;
  addresses: string[];
  os: string;
  lastSeen: string;
  online: boolean;
  authorized: boolean;
  tailnetLockKey?: string;
  nodeKey: string;
}

export interface Tailnet {
  name: string;
  magicDNSSuffix: string;
  magicDNSEnabled: boolean;
  devices: Device[];
}

export interface DNSNameservers {
  dns: string[];
  magicDNS: boolean;
  searchPaths: string[];
}

/**
 * List all devices in the tailnet.
 */
export async function listDevices(tailnet: string = '-'): Promise<Device[]> {
  const response = await apiRequest<{ devices: Device[] }>('GET', `/tailnet/${tailnet}/devices`);
  return response.devices || [];
}

/**
 * Get device details by ID.
 */
export async function getDevice(deviceId: string): Promise<Device> {
  return apiRequest<Device>('GET', `/device/${deviceId}`);
}

/**
 * Get DNS nameservers configuration.
 */
export async function getDNS(tailnet: string = '-'): Promise<DNSNameservers> {
  return apiRequest<DNSNameservers>('GET', `/tailnet/${tailnet}/dns/nameservers`);
}

/**
 * Set device routes (for funnel/subnet routing).
 */
export async function setDeviceRoutes(
  deviceId: string,
  routes: string[]
): Promise<void> {
  await apiRequest('POST', `/device/${deviceId}/routes`, { routes });
}

/**
 * Get device routes.
 */
export async function getDeviceRoutes(
  deviceId: string
): Promise<{ routes: string[]; advertisedRoutes: string[] }> {
  return apiRequest('GET', `/device/${deviceId}/routes`);
}
