import { Command } from 'commander';
import { execFileSync, ExecSyncOptions } from 'child_process';
import { formatSuccess, output, errorOutput } from '../utils/output';
import * as path from 'path';
import * as os from 'os';

/**
 * Execute git clone (separate from the main git helper since clone doesn't require being in a repo)
 */
function gitClone(args: string[]): string {
  const execOptions: ExecSyncOptions = {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  };

  try {
    return (execFileSync('git', ['clone', ...args], execOptions) as string).trim();
  } catch (error) {
    if (error instanceof Error && 'stderr' in error) {
      const stderr = (error as { stderr?: Buffer | string }).stderr;
      const message = stderr
        ? Buffer.isBuffer(stderr) ? stderr.toString() : stderr
        : error.message;
      throw new Error(message.replace(/^(fatal|error):\s*/i, '').trim().split('\n')[0]);
    }
    throw error;
  }
}

/**
 * Expand ~ to home directory
 */
function expandPath(inputPath: string): string {
  if (inputPath.startsWith('~/')) {
    return path.join(os.homedir(), inputPath.slice(2));
  }
  return inputPath;
}

export const clone = new Command('clone')
  .description('Clone a repository')
  .argument('<repository>', 'Repository URL or GitHub shorthand (owner/repo)')
  .argument('[directory]', 'Directory to clone into')
  .option('--depth <number>', 'Create a shallow clone with specified depth')
  .option('--branch <name>', 'Clone specific branch')
  .option('--single-branch', 'Clone only the single branch')
  .option('--bare', 'Create a bare repository')
  .option('--mirror', 'Create a mirror clone')
  .option('--recurse-submodules', 'Initialize submodules in the clone')
  .action((repository: string, directory: string | undefined, options: {
    depth?: string;
    branch?: string;
    singleBranch?: boolean;
    bare?: boolean;
    mirror?: boolean;
    recurseSubmodules?: boolean;
  }) => {
    try {
      const args: string[] = [];

      // Handle GitHub shorthand (owner/repo)
      let repoUrl = repository;
      if (/^[\w-]+\/[\w.-]+$/.test(repository) && !repository.includes(':')) {
        repoUrl = `https://github.com/${repository}.git`;
      }

      // Build arguments
      if (options.depth) {
        args.push('--depth', options.depth);
      }
      if (options.branch) {
        args.push('--branch', options.branch);
      }
      if (options.singleBranch) {
        args.push('--single-branch');
      }
      if (options.bare) {
        args.push('--bare');
      }
      if (options.mirror) {
        args.push('--mirror');
      }
      if (options.recurseSubmodules) {
        args.push('--recurse-submodules');
      }

      args.push(repoUrl);

      // Expand ~ in directory path
      if (directory) {
        args.push(expandPath(directory));
      }

      gitClone(args);

      // Determine the target directory name for output
      const targetDir = directory
        ? expandPath(directory)
        : repoUrl.split('/').pop()?.replace(/\.git$/, '') || 'repository';

      output(formatSuccess('clone', `${repoUrl} → ${targetDir}`));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
