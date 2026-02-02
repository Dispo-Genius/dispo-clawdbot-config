// Domain types - customize for your tool

export interface StatusResult {
  status: 'ok' | 'error';
  message: string;
}

export interface Item {
  id: string;
  name: string;
  state: 'active' | 'inactive';
}

// Output format
export type OutputFormat = 'compact' | 'json';
