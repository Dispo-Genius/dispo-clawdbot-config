import { Command } from 'commander';
import { isGitRepo } from '../api/git';
import { stageFiles } from '../utils/parsers';
import { formatStageResult, output, errorOutput, handleError } from '../utils/output';

export const stage = new Command('stage')
  .description('Stage files and confirm')
  .argument('<files...>', 'Files to stage')
  .action((files: string[]) => {
    try {
      if (!isGitRepo()) {
        errorOutput('not a git repository');
      }

      const staged = stageFiles(files);

      if (staged.length === 0) {
        errorOutput('no files staged');
      }

      output(formatStageResult(staged));
    } catch (error) {
      handleError(error);
    }
  });
