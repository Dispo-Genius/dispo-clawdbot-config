type OutputFormat = 'json' | 'compact';

let globalFormat: OutputFormat = 'compact';

export function setGlobalFormat(format: OutputFormat): void {
  globalFormat = format;
}

export function output(data: unknown): void {
  if (globalFormat === 'json') {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  }
}

export function errorOutput(message: string): never {
  console.error(JSON.stringify({ success: false, error: message }));
  process.exit(1);
}

interface MeetingListItem {
  recordingId: number;
  title: string;
  createdAt: Date;
  recordedBy: string;
  url: string;
}

export function formatMeetingList(meetings: MeetingListItem[]): string {
  if (globalFormat === 'json') {
    return JSON.stringify(meetings, null, 2);
  }

  if (meetings.length === 0) {
    return 'No meetings found.';
  }

  const lines = meetings.map(m => {
    const date = new Date(m.createdAt).toLocaleDateString();
    return `[${m.recordingId}] ${m.title} (${date}) - ${m.recordedBy}`;
  });

  return lines.join('\n');
}

interface ActionItemDisplay {
  description: string;
  assignee: string;
  completed: boolean;
  timestamp: string;
}

export function formatActionItems(items: ActionItemDisplay[]): string {
  if (globalFormat === 'json') {
    return JSON.stringify(items, null, 2);
  }

  if (items.length === 0) {
    return 'No action items found.';
  }

  const lines = items.map(item => {
    const status = item.completed ? '[x]' : '[ ]';
    const assignee = item.assignee ? ` (@${item.assignee})` : '';
    return `${status} ${item.description}${assignee} [${item.timestamp}]`;
  });

  return lines.join('\n');
}

interface TeamMemberDisplay {
  email: string;
  name: string;
}

export function formatTeamMembers(members: TeamMemberDisplay[]): string {
  if (globalFormat === 'json') {
    return JSON.stringify(members, null, 2);
  }

  if (members.length === 0) {
    return 'No team members found.';
  }

  return members.map(m => `${m.name} <${m.email}>`).join('\n');
}
