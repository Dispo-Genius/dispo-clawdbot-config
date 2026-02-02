const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SUBJECT_LENGTH = 998; // RFC 2822 limit
const MAX_BODY_LENGTH = 25 * 1024 * 1024; // 25MB Gmail limit

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email || email.trim() === '') {
    errors.push('Email address is required');
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.push(`Invalid email format: ${email}`);
  }

  return { valid: errors.length === 0, errors };
}

export function validateEmails(emails: string): ValidationResult {
  const errors: string[] = [];
  const addresses = emails.split(',').map((e) => e.trim()).filter(Boolean);

  if (addresses.length === 0) {
    errors.push('At least one email address is required');
  }

  for (const addr of addresses) {
    const result = validateEmail(addr);
    errors.push(...result.errors);
  }

  return { valid: errors.length === 0, errors };
}

export function validateSubject(subject: string): ValidationResult {
  const errors: string[] = [];

  if (!subject || subject.trim() === '') {
    errors.push('Subject is required');
  } else if (subject.length > MAX_SUBJECT_LENGTH) {
    errors.push(`Subject too long (${subject.length} chars, max ${MAX_SUBJECT_LENGTH})`);
  }

  return { valid: errors.length === 0, errors };
}

export function validateBody(body: string): ValidationResult {
  const errors: string[] = [];

  if (!body || body.trim() === '') {
    errors.push('Body is required');
  } else if (Buffer.byteLength(body, 'utf-8') > MAX_BODY_LENGTH) {
    errors.push(`Body too large (max 25MB)`);
  }

  return { valid: errors.length === 0, errors };
}

export function validateDraftInput(options: {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
}): ValidationResult {
  const errors: string[] = [];

  const toResult = validateEmails(options.to);
  errors.push(...toResult.errors);

  const subjectResult = validateSubject(options.subject);
  errors.push(...subjectResult.errors);

  const bodyResult = validateBody(options.body);
  errors.push(...bodyResult.errors);

  if (options.cc) {
    const ccResult = validateEmails(options.cc);
    errors.push(...ccResult.errors.map((e) => `CC: ${e}`));
  }

  if (options.bcc) {
    const bccResult = validateEmails(options.bcc);
    errors.push(...bccResult.errors.map((e) => `BCC: ${e}`));
  }

  return { valid: errors.length === 0, errors };
}
