import type { SecurityIssue } from '@everprompt/shared';

export interface SecurityScanResult {
  has_issues: boolean;
  issues: SecurityIssue[];
  redacted_body: string;
}

export interface PatternDef {
  regex: RegExp;
  type: SecurityIssue['type'];
  severity: SecurityIssue['severity'];
  desc: string;
}

// ---------------------------------------------------------------------------
// Built-in patterns — comprehensive list for developer scenarios
// ---------------------------------------------------------------------------

const BUILTIN_PATTERNS: PatternDef[] = [
  // ── AI / LLM API keys ──────────────────────────────────────────────────
  { regex: /sk-ant-api\d{2}-[a-zA-Z0-9_-]{80,}/g, type: 'api_key', severity: 'critical', desc: 'Anthropic API key' },
  { regex: /sk-ant-[a-zA-Z0-9_-]{20,}/g, type: 'api_key', severity: 'critical', desc: 'Anthropic API key (legacy)' },
  { regex: /sk-(?:proj-|live-|test-)?[a-zA-Z0-9_-]{20,}/g, type: 'api_key', severity: 'critical', desc: 'OpenAI API key' },
  { regex: /sk-or-v1-[a-zA-Z0-9]{48,}/g, type: 'api_key', severity: 'critical', desc: 'OpenRouter API key' },
  { regex: /sk-or-[a-zA-Z0-9_-]{20,}/g, type: 'api_key', severity: 'critical', desc: 'OpenRouter API key (legacy)' },
  { regex: /key-[a-zA-Z0-9]{32,}/g, type: 'api_key', severity: 'high', desc: 'Cohere API key' },

  // ── Cloud provider keys ─────────────────────────────────────────────────
  { regex: /AKIA[0-9A-Z]{16}/g, type: 'api_key', severity: 'critical', desc: 'AWS Access Key ID' },
  { regex: /(?:aws_secret_access_key|AWS_SECRET)\s*[:=]\s*['"]?([a-zA-Z0-9/+=]{40})['"]?/gi, type: 'api_key', severity: 'critical', desc: 'AWS Secret Access Key' },
  { regex: /AIza[a-zA-Z0-9_-]{35}/g, type: 'api_key', severity: 'critical', desc: 'Google API key' },
  { regex: /[0-9]+-[a-z0-9]{32}\.apps\.googleusercontent\.com/g, type: 'api_key', severity: 'high', desc: 'Google OAuth Client ID' },
  { regex: /ya29\.[a-zA-Z0-9_-]{50,}/g, type: 'token', severity: 'critical', desc: 'Google OAuth access token' },
  { regex: /az_[a-zA-Z0-9]{32,}/g, type: 'api_key', severity: 'critical', desc: 'Azure API key' },
  { regex: /AccountKey=[a-zA-Z0-9+/=]{60,}/g, type: 'api_key', severity: 'critical', desc: 'Azure Storage Account Key' },

  // ── GitHub / GitLab / Bitbucket ────────────────────────────────────────
  { regex: /ghp_[a-zA-Z0-9]{36}/g, type: 'token', severity: 'critical', desc: 'GitHub personal access token' },
  { regex: /gho_[a-zA-Z0-9]{36}/g, type: 'token', severity: 'critical', desc: 'GitHub OAuth token' },
  { regex: /ghs_[a-zA-Z0-9]{36}/g, type: 'token', severity: 'critical', desc: 'GitHub server-to-server token' },
  { regex: /ghu_[a-zA-Z0-9]{36}/g, type: 'token', severity: 'critical', desc: 'GitHub user-to-server token' },
  { regex: /github_pat_[a-zA-Z0-9_]{22,}/g, type: 'token', severity: 'critical', desc: 'GitHub fine-grained token' },
  { regex: /glpat-[a-zA-Z0-9_-]{20,}/g, type: 'token', severity: 'critical', desc: 'GitLab personal access token' },
  { regex: /gloas-[a-zA-Z0-9_-]{20,}/g, type: 'token', severity: 'critical', desc: 'GitLab OAuth token' },

  // ── Communication platforms ────────────────────────────────────────────
  { regex: /xoxb-[a-zA-Z0-9-]{24,}/g, type: 'token', severity: 'critical', desc: 'Slack bot token' },
  { regex: /xoxp-[a-zA-Z0-9-]{24,}/g, type: 'token', severity: 'critical', desc: 'Slack user token' },
  { regex: /xoxa-[a-zA-Z0-9-]{24,}/g, type: 'token', severity: 'critical', desc: 'Slack app token' },
  { regex: /xoxr-[a-zA-Z0-9-]{24,}/g, type: 'token', severity: 'critical', desc: 'Slack refresh token' },
  { regex: /hooks\.slack\.com\/services\/T[A-Z0-9]{8,}\/B[A-Z0-9]{8,}\/[a-zA-Z0-9]{20,}/g, type: 'token', severity: 'critical', desc: 'Slack webhook URL' },
  { regex: /(?:discord(?:app)?\.com\/api\/webhooks\/)\d+\/[a-zA-Z0-9_-]+/g, type: 'token', severity: 'high', desc: 'Discord webhook URL' },

  // ── Payment / Financial ────────────────────────────────────────────────
  { regex: /sk_live_[a-zA-Z0-9]{24,}/g, type: 'api_key', severity: 'critical', desc: 'Stripe live secret key' },
  { regex: /pk_live_[a-zA-Z0-9]{24,}/g, type: 'api_key', severity: 'high', desc: 'Stripe live publishable key' },
  { regex: /rk_live_[a-zA-Z0-9]{24,}/g, type: 'api_key', severity: 'critical', desc: 'Stripe restricted key' },
  { regex: /sk_test_[a-zA-Z0-9]{24,}/g, type: 'api_key', severity: 'medium', desc: 'Stripe test secret key' },
  { regex: /sq0atp-[a-zA-Z0-9_-]{22,}/g, type: 'api_key', severity: 'critical', desc: 'Square access token' },
  { regex: /sq0csp-[a-zA-Z0-9_-]{43,}/g, type: 'api_key', severity: 'critical', desc: 'Square OAuth secret' },
  { regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, type: 'credit_card', severity: 'critical', desc: 'Credit card number pattern' },

  // ── Database connection strings ────────────────────────────────────────
  { regex: /(?:mongodb(?:\+srv)?:\/\/)[^\s'"]{10,}/g, type: 'password', severity: 'critical', desc: 'MongoDB connection string' },
  { regex: /(?:postgres(?:ql)?:\/\/)[^\s'"]{10,}/g, type: 'password', severity: 'critical', desc: 'PostgreSQL connection string' },
  { regex: /(?:mysql:\/\/)[^\s'"]{10,}/g, type: 'password', severity: 'critical', desc: 'MySQL connection string' },
  { regex: /(?:redis:\/\/)[^\s'"]{10,}/g, type: 'password', severity: 'critical', desc: 'Redis connection string' },
  { regex: /(?:amqp:\/\/)[^\s'"]{10,}/g, type: 'password', severity: 'critical', desc: 'AMQP/RabbitMQ connection string' },
  { regex: /Server=[^;]+;.*(?:Password|Pwd)=[^;]+/gi, type: 'password', severity: 'critical', desc: 'SQL Server connection string' },

  // ── Cryptographic material ─────────────────────────────────────────────
  { regex: /-----BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g, type: 'private_key', severity: 'critical', desc: 'Private key (PEM)' },
  { regex: /-----BEGIN CERTIFICATE-----/g, type: 'private_key', severity: 'medium', desc: 'Certificate (PEM)' },

  // ── JWT / Auth tokens ──────────────────────────────────────────────────
  { regex: /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, type: 'token', severity: 'high', desc: 'JWT token' },
  { regex: /(?:bearer|token|authorization)\s+[a-zA-Z0-9._-]{20,}/gi, type: 'token', severity: 'high', desc: 'Auth bearer token' },

  // ── SaaS / third-party services ────────────────────────────────────────
  { regex: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g, type: 'api_key', severity: 'critical', desc: 'SendGrid API key' },
  { regex: /key-[a-f0-9]{32}/g, type: 'api_key', severity: 'high', desc: 'Mailgun API key' },
  { regex: /(?:TWILIO|twilio)[a-zA-Z_]*\s*[:=]\s*['"]?[a-f0-9]{32}['"]?/g, type: 'api_key', severity: 'critical', desc: 'Twilio credentials' },
  { regex: /AC[a-f0-9]{32}/g, type: 'api_key', severity: 'high', desc: 'Twilio Account SID' },
  { regex: /np_[a-z0-9]{24,}/g, type: 'api_key', severity: 'critical', desc: 'npm token' },
  { regex: /pypi-[a-zA-Z0-9_-]{50,}/g, type: 'api_key', severity: 'critical', desc: 'PyPI API token' },
  { regex: /nuget_[a-zA-Z0-9]{40,}/g, type: 'api_key', severity: 'critical', desc: 'NuGet API key' },
  { regex: /ATATT[a-zA-Z0-9_-]{50,}/g, type: 'api_key', severity: 'critical', desc: 'Atlassian API token' },
  { regex: /(?:heroku.*api[_-]?key)\s*[:=]\s*['"]?[a-f0-9-]{36,}['"]?/gi, type: 'api_key', severity: 'critical', desc: 'Heroku API key' },
  { regex: /(?:vercel|vc)_[a-zA-Z0-9]{24,}/g, type: 'api_key', severity: 'critical', desc: 'Vercel token' },
  { regex: /dop_v1_[a-f0-9]{64}/g, type: 'api_key', severity: 'critical', desc: 'DigitalOcean token' },
  { regex: /nfp_[a-zA-Z0-9]{40,}/g, type: 'api_key', severity: 'critical', desc: 'Netlify token' },
  { regex: /CF_API_KEY\s*[:=]\s*['"]?[a-f0-9]{37,}['"]?/gi, type: 'api_key', severity: 'critical', desc: 'Cloudflare API key' },

  // ── Passwords in config ────────────────────────────────────────────────
  { regex: /(?:password|passwd|pwd|secret|api_key|apikey|api_secret|app_secret|client_secret|access_key|private_key)\s*[:=]\s*['"]([^'"]{8,})['"]/gi, type: 'password', severity: 'high', desc: 'Password/secret in config' },
  { regex: /(?:PASSWORD|PASSWD|SECRET|API_KEY|APIKEY)\s*=\s*([^\s'"]{8,})/g, type: 'password', severity: 'high', desc: 'Secret in env variable' },

  // ── Personal data (GDPR / PII) ────────────────────────────────────────
  { regex: /\b[A-Z]{2}\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{0,4}\b/g, type: 'other', severity: 'medium', desc: 'IBAN bank account number' },
  { regex: /\b\d{3}-\d{2}-\d{4}\b/g, type: 'other', severity: 'high', desc: 'US Social Security Number (SSN)' },
  { regex: /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/g, type: 'other', severity: 'medium', desc: 'Italian Codice Fiscale' },

  // ── Infrastructure / DevOps ────────────────────────────────────────────
  { regex: /(?:ssh-rsa|ssh-ed25519|ecdsa-sha2-nistp\d+)\s+[A-Za-z0-9+/=]{50,}/g, type: 'private_key', severity: 'medium', desc: 'SSH public key (might leak identity)' },
  { regex: /(?:DOCKER_AUTH|REGISTRY_PASSWORD)\s*[:=]\s*['"]?[^\s'"]{8,}['"]?/gi, type: 'password', severity: 'critical', desc: 'Docker registry credentials' },
  { regex: /(?:KUBECONFIG|KUBE_TOKEN)\s*[:=]\s*['"]?[^\s'"]{20,}['"]?/gi, type: 'token', severity: 'critical', desc: 'Kubernetes credentials' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function redactText(text: string): string {
  if (text.length > 12) {
    return text.slice(0, 5) + '***..***' + text.slice(-4);
  }
  if (text.length > 6) {
    return text.slice(0, 3) + '****' + text.slice(-2);
  }
  return '****';
}

/**
 * Parse custom patterns from DB/KV.
 * Each custom pattern is stored as: { pattern: string, flags: string, type, severity, description }
 */
export interface CustomPatternDef {
  pattern: string;   // regex string, e.g. "my-corp-key-[a-z0-9]{32}"
  flags?: string;    // regex flags, e.g. "gi"
  type: SecurityIssue['type'];
  severity: SecurityIssue['severity'];
  description: string;
}

function parseCustomPatterns(custom: CustomPatternDef[]): PatternDef[] {
  const result: PatternDef[] = [];
  for (const c of custom) {
    try {
      const flags = c.flags || 'g';
      const regex = new RegExp(c.pattern, flags.includes('g') ? flags : flags + 'g');
      result.push({ regex, type: c.type, severity: c.severity, desc: c.description });
    } catch {
      // Invalid regex — skip silently
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Main scanner
// ---------------------------------------------------------------------------

export function scanForSecurityIssues(
  body: string,
  customPatterns?: CustomPatternDef[],
): SecurityScanResult {
  const issues: SecurityIssue[] = [];
  let redacted = body;
  const seen = new Set<string>(); // avoid duplicate matches

  const allPatterns = [
    ...BUILTIN_PATTERNS,
    ...(customPatterns ? parseCustomPatterns(customPatterns) : []),
  ];

  for (const { regex, type, severity, desc } of allPatterns) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(body)) !== null) {
      const text = match[0];
      if (seen.has(text)) continue; // skip duplicates
      seen.add(text);
      const redactedText = redactText(text);
      issues.push({ type, severity, description: desc, matched_text: redactedText });
      redacted = redacted.replaceAll(text, redactedText);
    }
  }

  // Sort by severity: critical first
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return { has_issues: issues.length > 0, issues, redacted_body: redacted };
}
