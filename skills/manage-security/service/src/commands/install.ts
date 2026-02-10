import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { getPreCommitHookPath, hasGitDirectory, isGGShieldInstalled } from '../utils/ggshield';
import { errorOutput, successOutput } from '../utils/output';

const PRE_COMMIT_HOOK_CONTENT = `#!/bin/bash
# Security pre-commit hook - blocks commits containing secrets
# Installed by manage-security skill

# Check if ggshield is installed
if ! command -v ggshield &> /dev/null; then
    echo "Warning: ggshield not installed, skipping secret scan"
    echo "Install with: brew install gitguardian/tap/ggshield"
    exit 0
fi

# Run ggshield on staged files
echo "Scanning for secrets..."
ggshield secret scan pre-commit

exit_code=$?

if [ $exit_code -ne 0 ]; then
    echo ""
    echo "Secret detected! Commit blocked."
    echo "Remove the secret and try again."
    echo ""
    echo "If this is a false positive, you can:"
    echo "  1. Add to .gitguardian.yaml allowlist"
    echo "  2. Use: git commit --no-verify (not recommended)"
fi

exit $exit_code
`;

export const install = new Command('install')
  .description('Install pre-commit hooks in a repository')
  .argument('[path]', 'Path to git repository (defaults to current directory)', '.')
  .option('--force', 'Overwrite existing pre-commit hook')
  .action(async (targetPath: string, options: { force?: boolean }) => {
    try {
      const resolvedPath = path.resolve(targetPath);

      if (!hasGitDirectory(resolvedPath)) {
        errorOutput(`Not a git repository: ${resolvedPath}`);
        return;
      }

      if (!isGGShieldInstalled()) {
        errorOutput('ggshield not installed. Run: brew install gitguardian/tap/ggshield');
        return;
      }

      const hookPath = getPreCommitHookPath(resolvedPath);
      const hooksDir = path.dirname(hookPath);

      // Ensure hooks directory exists
      if (!fs.existsSync(hooksDir)) {
        fs.mkdirSync(hooksDir, { recursive: true });
      }

      // Check for existing hook
      if (fs.existsSync(hookPath) && !options.force) {
        // Check if it's our hook
        const existingContent = fs.readFileSync(hookPath, 'utf-8');
        if (existingContent.includes('manage-security skill')) {
          successOutput('Pre-commit hook already installed', { path: hookPath });
          return;
        }

        errorOutput(
          `Pre-commit hook already exists at ${hookPath}. Use --force to overwrite, or manually integrate ggshield.`
        );
        return;
      }

      // Write the hook
      fs.writeFileSync(hookPath, PRE_COMMIT_HOOK_CONTENT, { mode: 0o755 });

      successOutput('Pre-commit hook installed', {
        path: hookPath,
        repository: resolvedPath,
      });
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
