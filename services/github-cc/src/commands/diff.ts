import { Command } from 'commander';
import { isGitRepo } from '../api/git';
import { getDiffStats, getDiff } from '../utils/parsers';
import { formatDiffStats, formatDiffFull, output, errorOutput, handleError } from '../utils/output';

export const diff = new Command('diff')
  .description('Show diff (use --stat for compact stats)')
  .option('--stat', 'Show only stats (compact)')
  .option('--staged', 'Show staged changes')
  .argument('[target]', 'Target branch/commit to diff against')
  .action((target: string | undefined, options: { stat?: boolean; staged?: boolean }) => {
    try {
      if (!isGitRepo()) {
        errorOutput('not a git repository');
      }

      if (options.stat) {
        const stats = getDiffStats(options.staged, target);
        output(formatDiffStats(stats));
      } else {
        const diffOutput = getDiff(options.staged, target);
        if (!diffOutput) {
          output('diff:empty');
        } else {
          output(formatDiffFull(diffOutput));
        }
      }
    } catch (error) {
      handleError(error);
    }
  });
