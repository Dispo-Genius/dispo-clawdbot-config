// Cache structure stored in .linear-cache.json
export interface LinearCache {
  lastSynced: string;
  team: {
    id: string;
    name: string;
    key: string;
  };
  states: Record<string, string>; // e.g., { "in-progress": "uuid" }
  labels: Record<string, string>; // e.g., { "feature": "uuid" }
  projects: Record<string, string>; // e.g., { "Authentication": "uuid" }
  members: Record<string, string>; // e.g., { "Jane Smith": "uuid" }
  milestones: Record<string, Record<string, string>>; // e.g., { "Project Polaris": { "Milestone 1": "uuid" } }
}

// Response types
export interface SuccessResponse {
  success: true;
  [key: string]: unknown;
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export type CommandResponse = SuccessResponse | ErrorResponse;

// Issue types
export interface Issue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  state: string;
  url: string;
  assignee?: string;
  labels: string[];
  project?: string;
}

// GraphQL response types
export interface TeamQueryResponse {
  team: {
    id: string;
    name: string;
    key: string;
    states: {
      nodes: Array<{ id: string; name: string }>;
    };
    labels: {
      nodes: Array<{ id: string; name: string }>;
    };
    members: {
      nodes: Array<{ id: string; name: string }>;
    };
  };
}

export interface ProjectsQueryResponse {
  team: {
    projects: {
      nodes: Array<{
        id: string;
        name: string;
        projectMilestones: {
          nodes: Array<{ id: string; name: string }>;
        };
      }>;
    };
  };
}
