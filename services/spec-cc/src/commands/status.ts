import { Command } from 'commander';
import { findSpec, updateStatusInFile, VALID_STATUSES, SpecStatus, getSpecsDir } from '../utils/spec-parser';
import { output, formatSuccess, errorOutput } from '../utils/output';
import { generateIndex } from './index-cmd';

export const status = new Command('status')
  .description('Update spec status')
  .argument('<slug>', 'Spec slug')
  .argument('<status>', `New status (${VALID_STATUSES.join('|')})`)
  .action(async (slug: string, newStatus: string) => {
    try {
      const statusLower = newStatus.toLowerCase() as SpecStatus;

      if (!VALID_STATUSES.includes(statusLower)) {
        errorOutput(`Invalid status "${newStatus}". Valid: ${VALID_STATUSES.join(', ')}`);
      }

      const spec = await findSpec(slug);
      if (!spec) {
        errorOutput(`Spec "${slug}" not found`);
      }

      const oldStatus = spec.status;
      const success = updateStatusInFile(spec.path, statusLower);

      if (!success) {
        errorOutput(`Failed to update status in ${spec.path}`);
      }

      // Regenerate INDEX.md
      await generateIndex(getSpecsDir());

      output(formatSuccess(`Updated ${slug}`, {
        from: oldStatus,
        to: statusLower,
      }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
