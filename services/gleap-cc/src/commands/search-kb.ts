import { Command } from 'commander';
import { createClient } from '../api/client';
import { output } from '../utils/output';
import { GleapKBArticle } from '../types';

export const searchKb = new Command('search-kb')
  .description('Search knowledge base articles')
  .argument('<query>', 'Search query')
  .option('-l, --limit <number>', 'Max results', '5')
  .action(async (query, opts) => {
    const client = createClient();
    if (!client) return;

    try {
      // Search AI/help center content
      const response = await client.get('/ai/content', {
        params: {
          search: query,
          limit: parseInt(opts.limit)
        }
      });

      const articles: GleapKBArticle[] = response.data?.data || [];

      if (articles.length === 0) {
        output({
          success: true,
          summary: `No KB articles found for: "${query}"`,
          data: []
        });
        return;
      }

      const summaries = articles.map((a, i) =>
        `${i + 1}. [${a.id}] ${a.title}${a.category ? ` (${a.category})` : ''}`
      );

      output({
        success: true,
        summary: `${articles.length} articles found:\n${summaries.join('\n')}`,
        data: articles
      });
    } catch (error) {
      // Error already handled by client interceptor
    }
  });
