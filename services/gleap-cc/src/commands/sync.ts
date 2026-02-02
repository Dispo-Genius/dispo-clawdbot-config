import { Command } from 'commander';
import { createClient } from '../api/client';
import { output } from '../utils/output';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';

export const sync = new Command('sync')
  .description('Sync project metadata and cache users')
  .action(async () => {
    const client = createClient();
    if (!client) return;

    try {
      // Fetch project info
      const projectRes = await client.get('/project');
      const project = projectRes.data;

      // Fetch team members
      const usersRes = await client.get('/users', {
        params: { limit: 100 }
      });
      const users = usersRes.data?.data || [];

      // Cache to ~/.cache/gleap-cc/
      const cacheDir = resolve(homedir(), '.cache/gleap-cc');
      mkdirSync(cacheDir, { recursive: true });

      writeFileSync(
        resolve(cacheDir, 'project.json'),
        JSON.stringify(project, null, 2)
      );
      writeFileSync(
        resolve(cacheDir, 'users.json'),
        JSON.stringify(users, null, 2)
      );

      output({
        success: true,
        summary: `sync:complete | Project: ${project?.name || 'Unknown'} | Users: ${users.length}`,
        data: { project: project?.name, userCount: users.length }
      });
    } catch (error) {
      // Error already handled by client interceptor
    }
  });
