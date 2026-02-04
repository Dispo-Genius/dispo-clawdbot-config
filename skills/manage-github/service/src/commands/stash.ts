import { Command } from 'commander';
import { isGitRepo, git } from '../api/git';
import { formatSuccess, output, errorOutput, handleError } from '../utils/output';

export const stash = new Command('stash')
  .description('Stash or restore changes')
  .argument('[action]', 'Action: push (default), pop, list, drop', 'push')
  .option('-m, --message <message>', 'Stash message')
  .action((action: string, options: { message?: string }) => {
    try {
      if (!isGitRepo()) {
        errorOutput('not a git repository');
      }

      switch (action) {
        case 'push': {
          const args = ['stash', 'push'];
          if (options.message) {
            args.push('-m', options.message);
          }
          git(args);
          output(formatSuccess('stash', 'changes stashed'));
          break;
        }
        case 'pop': {
          git(['stash', 'pop']);
          output(formatSuccess('stash', 'changes restored'));
          break;
        }
        case 'list': {
          const result = git(['stash', 'list'], { throwOnError: false });
          if (!result || result.trim() === '') {
            output('stash[0]:empty');
          } else {
            const stashes = result.trim().split('\n');
            output(`stash[${stashes.length}]:${stashes.map(s => s.split(':')[0]).join('|')}`);
          }
          break;
        }
        case 'drop': {
          git(['stash', 'drop']);
          output(formatSuccess('stash', 'stash dropped'));
          break;
        }
        default:
          errorOutput(`unknown stash action: ${action}`);
      }
    } catch (error) {
      handleError(error);
    }
  });
