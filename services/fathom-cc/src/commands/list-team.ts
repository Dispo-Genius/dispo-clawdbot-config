import { Command } from 'commander';
import { fathomClient } from '../api/client';
import { output, formatTeamMembers, errorOutput } from '../utils/output';

export const listTeam = new Command('list-team')
  .description('List team members')
  .option('--limit <n>', 'Max members to return', '50')
  .action(async (options) => {
    try {
      const limit = parseInt(options.limit || '50', 10);

      const iterator = await fathomClient.listTeamMembers();
      const members: Array<{ email: string; name: string }> = [];

      let count = 0;
      for await (const page of iterator) {
        if (!page?.result?.items) break;

        for (const member of page.result.items) {
          if (count >= limit) break;

          members.push({
            email: member.email,
            name: member.name || member.email,
          });
          count++;
        }

        if (count >= limit) break;
      }

      output(formatTeamMembers(members));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
