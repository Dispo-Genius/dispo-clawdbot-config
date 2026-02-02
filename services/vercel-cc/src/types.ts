// Vercel API Types

export interface VercelTeam {
  id: string;
  slug: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface VercelProject {
  id: string;
  name: string;
  accountId: string;
  createdAt: number;
  updatedAt: number;
  framework?: string;
  devCommand?: string;
  installCommand?: string;
  buildCommand?: string;
  outputDirectory?: string;
  rootDirectory?: string;
  nodeVersion?: string;
  serverlessFunctionRegion?: string;
  latestDeployments?: VercelDeployment[];
  targets?: Record<string, VercelDeployment>;
}

export interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  created: number;
  createdAt?: number;
  buildingAt?: number;
  ready?: number;
  readyState?: DeploymentState;
  state?: DeploymentState;
  type?: string;
  creator?: {
    uid: string;
    email: string;
    username: string;
  };
  meta?: Record<string, string>;
  target?: 'production' | 'preview' | 'staging';
  aliasAssigned?: number;
  aliasError?: { code: string; message: string };
  inspectorUrl?: string;
  source?: string;
  projectId?: string;
}

export type DeploymentState =
  | 'BUILDING'
  | 'ERROR'
  | 'INITIALIZING'
  | 'QUEUED'
  | 'READY'
  | 'CANCELED';

export interface VercelEnvVar {
  id: string;
  key: string;
  value: string;
  type: 'system' | 'secret' | 'encrypted' | 'plain' | 'sensitive';
  target: ('production' | 'preview' | 'development')[];
  gitBranch?: string;
  configurationId?: string;
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
  decrypted?: boolean;
  comment?: string;
}

export interface VercelDomain {
  name: string;
  apexName: string;
  projectId: string;
  verified: boolean;
  redirect?: string;
  redirectStatusCode?: 301 | 302 | 307 | 308;
  gitBranch?: string;
  customEnvironmentId?: string;
  createdAt: number;
  updatedAt: number;
  verification?: DomainVerification[];
}

export interface DomainVerification {
  type: string;
  domain: string;
  value: string;
  reason: string;
}

export interface VercelUser {
  id: string;
  email: string;
  name?: string;
  username: string;
  avatar?: string;
}

// API Response Types

export interface ListProjectsResponse {
  projects: VercelProject[];
  pagination?: PaginationInfo;
}

export interface ListDeploymentsResponse {
  deployments: VercelDeployment[];
  pagination?: PaginationInfo;
}

export interface ListEnvVarsResponse {
  envs: VercelEnvVar[];
}

export interface ListDomainsResponse {
  domains: VercelDomain[];
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  count: number;
  next?: number;
  prev?: number;
}

// Cache Types

export interface VercelCache {
  lastSync: number;
  teamId?: string;
  teamSlug?: string;
  teamName?: string;
  projects: Record<string, CachedProject>;
}

export interface CachedProject {
  id: string;
  name: string;
  framework?: string;
  updatedAt: number;
}

// CLI Output Types

export interface SuccessResponse {
  success: true;
  [key: string]: unknown;
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export type CLIResponse = SuccessResponse | ErrorResponse;
