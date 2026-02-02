import { Command } from 'commander';
import { listProjects, getUser, getTeams } from '../api/client.js';
import { saveCache } from '../config/cache.js';
import type { VercelCache, CachedProject, VercelTeam } from '../types.js';

export const syncCommand = new Command('sync')
  .description('Sync Vercel projects and cache metadata locally')
  .action(async () => {
    try {
      // Get user info
      const user = await getUser();

      // Get teams (may fail if token lacks teams:read scope)
      let teams: VercelTeam[] = [];
      try {
        teams = await getTeams();
      } catch {
        // Token may lack teams:read scope - continue without team info
      }
      const teamId = process.env.VERCEL_TEAM_ID;
      const team = teamId ? teams.find((t) => t.id === teamId) : undefined;

      // Get all projects
      const projects = await listProjects();

      // Build cache
      const projectCache: Record<string, CachedProject> = {};
      for (const project of projects) {
        projectCache[project.id] = {
          id: project.id,
          name: project.name,
          framework: project.framework,
          updatedAt: project.updatedAt,
        };
      }

      const cache: VercelCache = {
        lastSync: Date.now(),
        teamId: team?.id,
        teamSlug: team?.slug,
        teamName: team?.name,
        projects: projectCache,
      };

      saveCache(cache);

      console.log(
        JSON.stringify({
          success: true,
          user: user.username,
          team: team?.name || 'Personal Account',
          projectCount: projects.length,
          projects: projects.map((p) => ({
            id: p.id,
            name: p.name,
            framework: p.framework,
          })),
        })
      );
    } catch (error) {
      console.log(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })
      );
      process.exit(1);
    }
  });
