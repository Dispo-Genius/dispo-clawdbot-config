import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';

interface EmailConfig {
  dmPolicy: 'allowlist' | 'open';
  allowFrom: string[];
  allowDomains: string[];
  approvedRecipients: string[];
  alertOnBlocked: boolean;
}

interface SecurityConfig {
  alertChannel: string;
  alertTo: string;
  outboundApprovalChannel: string;
  outboundApprovalTo: string;
  email?: EmailConfig;
}

export function loadSecurityConfig(): SecurityConfig | null {
  const configPath = path.join(os.homedir(), '.clawdbot/agentmail-security.json');
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function extractEmail(sender: string): string {
  // Handle "Name <email@domain.com>" format
  const match = sender.match(/<([^>]+)>/);
  return match ? match[1].toLowerCase() : sender.toLowerCase();
}

function extractDomain(email: string): string {
  const atIndex = email.indexOf('@');
  return atIndex !== -1 ? email.slice(atIndex + 1) : '';
}

export function isSenderAllowed(sender: string): boolean {
  const security = loadSecurityConfig();
  const emailConfig = security?.email;

  // No config = allow all (backwards compatibility)
  if (!emailConfig || emailConfig.dmPolicy !== 'allowlist') {
    return true;
  }

  const email = extractEmail(sender);
  const domain = extractDomain(email);

  // Check exact email match
  const allowedEmails = emailConfig.allowFrom || [];
  if (allowedEmails.some(allowed => allowed.toLowerCase() === email)) {
    return true;
  }

  // Check domain match
  const allowedDomains = emailConfig.allowDomains || [];
  if (allowedDomains.some(d => d.toLowerCase() === domain)) {
    return true;
  }

  return false;
}

export function isRecipientApproved(recipient: string): boolean {
  const security = loadSecurityConfig();
  const emailConfig = security?.email;

  // No config = allow all
  if (!emailConfig) {
    return true;
  }

  const email = extractEmail(recipient);
  const domain = extractDomain(email);

  // Check if in approvedRecipients
  const approved = emailConfig.approvedRecipients || [];
  if (approved.some(r => r.toLowerCase() === email)) {
    return true;
  }

  // Check if in allowDomains (internal domains always approved)
  const allowedDomains = emailConfig.allowDomains || [];
  if (allowedDomains.some(d => d.toLowerCase() === domain)) {
    return true;
  }

  // Check if in allowFrom (known contacts)
  const allowedEmails = emailConfig.allowFrom || [];
  if (allowedEmails.some(allowed => allowed.toLowerCase() === email)) {
    return true;
  }

  return false;
}

export async function alertBlockedSender(sender: string, subject: string): Promise<void> {
  const security = loadSecurityConfig();

  if (!security?.alertTo) {
    console.error('[agentmail] No alert config, skipping alert');
    return;
  }

  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const message = `[BLOCKED] Email from ${sender}\nSubject: "${subject}"\nTime: ${timestamp}`;

  try {
    if (security.alertChannel === 'slack') {
      // Use clawdbot to send Slack DM
      execFileSync('clawdbot', ['message', 'send', '--channel', 'slack', '--target', security.alertTo, '--message', message], {
        encoding: 'utf-8',
        timeout: 60000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      console.error(`[agentmail] Alert sent to Slack ${security.alertTo}`);
    } else if (security.alertChannel === 'whatsapp') {
      // Use polaris-cc to send WhatsApp (WhatsApp is native to clawdbot on Mac Mini)
      const polarisPath = path.join(os.homedir(), '.claude/services/polaris-cc/src/index.ts');
      const prompt = `Send a WhatsApp message to ${security.alertTo}: ${message}`;
      execFileSync('npx', ['tsx', polarisPath, 'send', prompt], {
        encoding: 'utf-8',
        timeout: 60000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      console.error(`[agentmail] Alert sent to WhatsApp ${security.alertTo}`);
    }
  } catch (error) {
    console.error('[agentmail] Failed to send alert:', error);
  }
}

export function addApprovedRecipient(recipient: string): void {
  const configPath = path.join(os.homedir(), '.clawdbot/agentmail-security.json');
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content);

    if (!config.email) config.email = {};
    if (!config.email.approvedRecipients) config.email.approvedRecipients = [];

    const email = extractEmail(recipient);
    if (!config.email.approvedRecipients.includes(email)) {
      config.email.approvedRecipients.push(email);
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.error(`[agentmail] Added ${email} to approved recipients`);
    }
  } catch (error) {
    console.error('[agentmail] Failed to add approved recipient:', error);
  }
}
