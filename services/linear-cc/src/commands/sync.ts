import { Command } from 'commander';
import { linearClient } from '../api/client';
import { saveCache, getCacheFilePath } from '../config/cache';
import type { LinearCache, TeamQueryResponse, ProjectsQueryResponse } from '../types';
import { output, formatSuccess, errorOutput } from '../utils/output';

// PROTOTYPE team ID - hardcoded as default
const DEFAULT_TEAM_ID = '05e533b4-661d-43df-84af-bec6f6c38f65';

export const sync = new Command('sync')
  .description('Sync team configuration from Linear API')
  .option('--team <id>', 'Team ID to sync', DEFAULT_TEAM_ID)
  .action(async (options: { team: string }) => {
    try {
      // Fetch team with states, labels, members
      const teamQuery = `
        query GetTeam($teamId: String!) {
          team(id: $teamId) {
            id
            name
            key
            states {
              nodes {
                id
                name
              }
            }
            labels {
              nodes {
                id
                name
              }
            }
            members {
              nodes {
                id
                name
              }
            }
          }
        }
      `;

      const teamResult = await linearClient.request<TeamQueryResponse>(teamQuery, {
        teamId: options.team,
      });

      // Fetch all accessible projects with milestones (organization-wide)
      const projectsQuery = `
        query GetProjects {
          projects {
            nodes {
              id
              name
              projectMilestones {
                nodes {
                  id
                  name
                }
              }
            }
          }
        }
      `;

      const projectsResult = await linearClient.request<{ projects: { nodes: Array<{ id: string; name: string; projectMilestones: { nodes: Array<{ id: string; name: string }> } }> } }>(projectsQuery);

      // Build milestones map: { "Project Name": { "Milestone Name": "uuid" } }
      const milestones: Record<string, Record<string, string>> = {};
      for (const project of projectsResult.projects.nodes) {
        if (project.projectMilestones.nodes.length > 0) {
          milestones[project.name] = Object.fromEntries(
            project.projectMilestones.nodes.map((m) => [m.name, m.id])
          );
        }
      }

      // Build cache object
      const cache: LinearCache = {
        lastSynced: new Date().toISOString(),
        team: {
          id: teamResult.team.id,
          name: teamResult.team.name,
          key: teamResult.team.key,
        },
        states: Object.fromEntries(
          teamResult.team.states.nodes.map((s) => [
            s.name.toLowerCase().replace(/ /g, '-'),
            s.id,
          ])
        ),
        labels: Object.fromEntries(
          teamResult.team.labels.nodes.map((l) => [l.name.toLowerCase(), l.id])
        ),
        projects: Object.fromEntries(
          projectsResult.projects.nodes.map((p) => [p.name, p.id])
        ),
        members: Object.fromEntries(
          teamResult.team.members.nodes.map((m) => [m.name, m.id])
        ),
        milestones,
      };

      // Save to disk
      saveCache(cache);

      // Count total milestones
      const totalMilestones = Object.values(milestones).reduce(
        (sum, m) => sum + Object.keys(m).length,
        0
      );

      // Output success
      output(formatSuccess({
        message: `Synced ${Object.keys(cache.states).length} states, ${Object.keys(cache.labels).length} labels, ${Object.keys(cache.projects).length} projects, ${Object.keys(cache.members).length} members, ${totalMilestones} milestones`,
        cacheFile: getCacheFilePath(),
        team: cache.team.name,
      }));
    } catch (error) {
      errorOutput(error instanceof Error ? error.message : 'Unknown error');
    }
  });
