import { Command } from 'commander';
import { isGitRepo, git } from '../api/git';
import { output, errorOutput, getFormat } from '../utils/output';

interface LogEntry {
  hash: string;
  subject: string;
  author: string;
  date: string;
}

export const log = new Command('log')
  .description('Show commit history')
  .option('-n, --count <number>', 'Number of commits to show', '10')
  .option('--oneline', 'Show condensed output')
  .argument('[range]', 'Commit range (e.g., main..HEAD)')
  .action((range: string | undefined, options: { count: string; oneline?: boolean }) => {
    try {
      if (!isGitRepo()) {
        errorOutput('not a git repository');
      }

      const count = parseInt(options.count) || 10;
      const format = getFormat();

      if (options.oneline || format === 'compact') {
        // Compact format
        const args = ['log', '--oneline', `-n${count}`];
        if (range) args.push(range);

        const result = git(args, { throwOnError: false });
        if (!result || result.trim() === '') {
          output('log[0]:empty');
          return;
        }

        const lines = result.trim().split('\n');
        if (format === 'json') {
          const entries = lines.map(line => {
            const [hash, ...rest] = line.split(' ');
            return { hash, subject: rest.join(' ') };
          });
          output(JSON.stringify({ count: entries.length, commits: entries }, null, 2));
        } else {
          output(`log[${lines.length}]:\n${result.trim()}`);
        }
      } else {
        // Full format
        const args = ['log', `--format=%h|%s|%an|%as`, `-n${count}`];
        if (range) args.push(range);

        const result = git(args, { throwOnError: false });
        if (!result || result.trim() === '') {
          output('log[0]:empty');
          return;
        }

        const lines = result.trim().split('\n');
        const entries: LogEntry[] = lines.map(line => {
          const [hash, subject, author, date] = line.split('|');
          return { hash, subject, author, date };
        });

        if (format === 'json') {
          output(JSON.stringify({ count: entries.length, commits: entries }, null, 2));
        } else if (format === 'table') {
          const header = 'hash    | subject                                  | author       | date';
          const sep = '--------+------------------------------------------+--------------+------------';
          const rows = entries.map(e =>
            `${e.hash.padEnd(7)} | ${e.subject.slice(0, 40).padEnd(40)} | ${e.author.slice(0, 12).padEnd(12)} | ${e.date}`
          );
          output([header, sep, ...rows].join('\n'));
        } else {
          output(`log[${entries.length}]{hash|subject|author|date}:\n${lines.join('\n')}`);
        }
      }
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
