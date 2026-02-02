type OutputFormat = 'json' | 'compact';

let globalFormat: OutputFormat = 'compact';

export function setGlobalFormat(format: OutputFormat): void {
  globalFormat = format;
}

export function getGlobalFormat(): OutputFormat {
  return globalFormat;
}

export interface OutputResult {
  success: boolean;
  data?: unknown;
  error?: string;
  summary?: string;
}

export function output(result: OutputResult): void {
  if (globalFormat === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else {
    // Compact format
    if (result.success) {
      if (result.summary) {
        console.log(result.summary);
      } else if (result.data) {
        console.log(JSON.stringify(result.data));
      } else {
        console.log('success');
      }
    } else {
      console.log(`error: ${result.error}`);
    }
  }
}

export function formatTicketSummary(ticket: {
  id: string;
  status: string;
  priority?: string;
  title?: string;
  sender?: { name?: string; email?: string };
  createdAt: string;
}): string {
  const sender = ticket.sender?.name || ticket.sender?.email || 'Unknown';
  const priority = ticket.priority || 'MEDIUM';
  const title = ticket.title || '(no title)';
  const date = new Date(ticket.createdAt).toLocaleDateString();

  return `[${ticket.id}] ${ticket.status} | ${priority} | ${sender} | ${date} | ${title}`;
}

export function formatUserSummary(user: {
  id: string;
  name?: string;
  email?: string;
  lastActivity?: string;
}): string {
  const name = user.name || '(no name)';
  const email = user.email || '(no email)';
  const lastActive = user.lastActivity
    ? new Date(user.lastActivity).toLocaleDateString()
    : 'never';

  return `[${user.id}] ${name} <${email}> | Last active: ${lastActive}`;
}

export function formatMessageSummary(message: {
  id: string;
  type: string;
  text: string;
  createdAt: string;
  sender?: { name?: string };
}): string {
  const sender = message.sender?.name || message.type;
  const date = new Date(message.createdAt).toLocaleString();
  const text = message.text.length > 100
    ? message.text.substring(0, 100) + '...'
    : message.text;

  return `[${date}] ${sender}: ${text}`;
}
