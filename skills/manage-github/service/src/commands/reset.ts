import { Command } from 'commander';
import { isGitRepo, git } from '../api/git';
import { formatSuccess, output, errorOutput } from '../utils/output';

export const reset = new Command('reset')
  .description('Reset staged changes or reset to a commit')
  .argument('[target]', 'File to unstage, or commit to reset to')
  .option('--hard', 'Hard reset (discards all changes)')
  .option('--soft', 'Soft reset (keeps changes staged)')
  .action((target: string | undefined, options: { hard?: boolean; soft?: boolean }) => {
    try {
      if (!isGitRepo()) {
        errorOutput('not a git repository');
      }

      // If no target, unstage all
      if (!target) {
        git(['reset', 'HEAD']);
        output(formatSuccess('reset', 'unstaged all changes'));
        return;
      }

      // Check if target looks like a file path (contains / or .)
      const looksLikeFile = target.includes('/') || target.includes('.');

      // If it looks like a file, unstage that file
      if (looksLikeFile && !options.hard && !options.soft) {
        git(['reset', 'HEAD', '--', target]);
        output(formatSuccess('reset', `unstaged ${target}`));
        return;
      }

      // Otherwise treat as commit reference
      const args = ['reset'];
      if (options.hard) {
        args.push('--hard');
      } else if (options.soft) {
        args.push('--soft');
      }
      args.push(target);

      git(args);
      output(formatSuccess('reset', `reset to ${target}`));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
