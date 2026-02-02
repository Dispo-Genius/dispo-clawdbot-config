import type {
  VercelProject,
  VercelDeployment,
  VercelEnvVar,
  VercelDomain,
  VercelTeam,
  VercelUser,
  ListProjectsResponse,
  ListDeploymentsResponse,
  ListEnvVarsResponse,
  ListDomainsResponse,
} from '../types.js';

const VERCEL_API_BASE = 'https://api.vercel.com';

function getToken(): string {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    throw new Error('VERCEL_TOKEN environment variable is not set');
  }
  return token;
}

function getTeamId(): string | undefined {
  return process.env.VERCEL_TEAM_ID;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | undefined>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params = {} } = options;

  const teamId = getTeamId();
  if (teamId) {
    params.teamId = teamId;
  }

  const url = new URL(`${VERCEL_API_BASE}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  };

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), fetchOptions);

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage: string;

    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorJson.message || errorText;
    } catch {
      errorMessage = errorText;
    }

    throw new Error(`Vercel API error (${response.status}): ${errorMessage}`);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

// User endpoints

export async function getUser(): Promise<VercelUser> {
  const response = await request<{ user: VercelUser }>('/v2/user');
  return response.user;
}

// Team endpoints

export async function getTeams(): Promise<VercelTeam[]> {
  const response = await request<{ teams: VercelTeam[] }>('/v2/teams');
  return response.teams;
}

// Project endpoints

export async function listProjects(limit = 100): Promise<VercelProject[]> {
  const response = await request<ListProjectsResponse>('/v9/projects', {
    params: { limit },
  });
  return response.projects;
}

export async function getProject(idOrName: string): Promise<VercelProject> {
  return request<VercelProject>(`/v9/projects/${encodeURIComponent(idOrName)}`);
}

// Deployment endpoints

export async function listDeployments(
  projectId?: string,
  limit = 20
): Promise<VercelDeployment[]> {
  const params: Record<string, string | number | undefined> = { limit };
  if (projectId) {
    params.projectId = projectId;
  }

  const response = await request<ListDeploymentsResponse>('/v6/deployments', {
    params,
  });
  return response.deployments;
}

export async function getDeployment(idOrUrl: string): Promise<VercelDeployment> {
  return request<VercelDeployment>(`/v13/deployments/${encodeURIComponent(idOrUrl)}`);
}

export async function cancelDeployment(deploymentId: string): Promise<VercelDeployment> {
  return request<VercelDeployment>(`/v12/deployments/${deploymentId}/cancel`, {
    method: 'PATCH',
  });
}

export async function promoteDeployment(
  projectId: string,
  deploymentId: string
): Promise<{ jobId: string }> {
  return request<{ jobId: string }>(
    `/v10/projects/${encodeURIComponent(projectId)}/promote/${deploymentId}`,
    { method: 'POST' }
  );
}

// Environment variable endpoints

export async function listEnvVars(projectIdOrName: string): Promise<VercelEnvVar[]> {
  const response = await request<ListEnvVarsResponse>(
    `/v10/projects/${encodeURIComponent(projectIdOrName)}/env`
  );
  return response.envs;
}

export async function createEnvVar(
  projectIdOrName: string,
  envVar: {
    key: string;
    value: string;
    type?: 'plain' | 'secret' | 'encrypted' | 'sensitive';
    target: ('production' | 'preview' | 'development')[];
    comment?: string;
  }
): Promise<{ created: VercelEnvVar[] }> {
  return request<{ created: VercelEnvVar[] }>(
    `/v10/projects/${encodeURIComponent(projectIdOrName)}/env`,
    {
      method: 'POST',
      body: envVar,
    }
  );
}

export async function deleteEnvVar(
  projectIdOrName: string,
  envVarId: string
): Promise<void> {
  await request<unknown>(
    `/v9/projects/${encodeURIComponent(projectIdOrName)}/env/${envVarId}`,
    { method: 'DELETE' }
  );
}

// Domain endpoints

export async function listDomains(projectIdOrName: string): Promise<VercelDomain[]> {
  const response = await request<ListDomainsResponse>(
    `/v9/projects/${encodeURIComponent(projectIdOrName)}/domains`
  );
  return response.domains;
}

export async function addDomain(
  projectIdOrName: string,
  domain: {
    name: string;
    gitBranch?: string;
    redirect?: string;
    redirectStatusCode?: 301 | 302 | 307 | 308;
  }
): Promise<VercelDomain> {
  return request<VercelDomain>(
    `/v10/projects/${encodeURIComponent(projectIdOrName)}/domains`,
    {
      method: 'POST',
      body: domain,
    }
  );
}

export async function removeDomain(
  projectIdOrName: string,
  domainName: string
): Promise<void> {
  await request<unknown>(
    `/v9/projects/${encodeURIComponent(projectIdOrName)}/domains/${encodeURIComponent(domainName)}`,
    { method: 'DELETE' }
  );
}

// Helper functions

export function formatDeploymentState(state?: string): string {
  switch (state) {
    case 'READY':
      return 'Ready';
    case 'BUILDING':
      return 'Building';
    case 'ERROR':
      return 'Error';
    case 'QUEUED':
      return 'Queued';
    case 'CANCELED':
      return 'Canceled';
    case 'INITIALIZING':
      return 'Initializing';
    default:
      return state || 'Unknown';
  }
}

export function formatTimestamp(ts?: number): string {
  if (!ts) return 'N/A';
  return new Date(ts).toISOString();
}
