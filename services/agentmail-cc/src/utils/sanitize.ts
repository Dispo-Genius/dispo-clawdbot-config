const MAX_BODY_SIZE = 50 * 1024; // 50KB

export interface RawEmail {
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface SanitizedEmail {
  from: string;
  subject: string;
  body: string;
  text?: string;
  html?: string;
  truncated: boolean;
}

function stripControlChars(text: string): string {
  // Keep newlines, tabs, carriage returns - strip other control chars
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function truncateToSize(text: string, maxBytes: number): { text: string; truncated: boolean } {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);

  if (bytes.length <= maxBytes) {
    return { text, truncated: false };
  }

  // Binary search for the right cut point
  let low = 0;
  let high = text.length;

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    if (encoder.encode(text.slice(0, mid)).length <= maxBytes) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return {
    text: text.slice(0, low) + '\n\n[TRUNCATED - exceeded 50KB limit]',
    truncated: true,
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

export function sanitizeEmailInput(email: RawEmail): SanitizedEmail {
  // Prefer text over HTML
  let body = email.text || '';
  if (!body && email.html) {
    body = stripHtml(email.html);
  }

  // Sanitize
  body = stripControlChars(body);
  body = normalizeLineEndings(body);

  // Truncate
  const { text: truncatedBody, truncated } = truncateToSize(body, MAX_BODY_SIZE);

  return {
    from: email.from,
    subject: stripControlChars(email.subject || ''),
    body: truncatedBody,
    text: email.text ? stripControlChars(normalizeLineEndings(email.text)) : undefined,
    html: email.html,
    truncated,
  };
}

export function wrapForAI(email: SanitizedEmail): string {
  return `<email_content>
From: ${email.from}
Subject: ${email.subject}

${email.body}
</email_content>`;
}
