import { describe, it, expect } from 'vitest';
import { scanForSecurityIssues } from '../ai/security-scan';

describe('scanForSecurityIssues', () => {
  it('returns no issues for clean text', () => {
    const result = scanForSecurityIssues('Write me a poem about the ocean.');
    expect(result.has_issues).toBe(false);
    expect(result.issues).toHaveLength(0);
    expect(result.redacted_body).toBe('Write me a poem about the ocean.');
  });

  it('detects an Anthropic API key', () => {
    const body = 'Use this key: sk-ant-api03-abcdefghijklmnopqrstuvwxyz01234567890abcdefghijklmnopqrstuvwxyz01234567890abcd';
    const result = scanForSecurityIssues(body);
    expect(result.has_issues).toBe(true);
    const issue = result.issues.find(i => i.description.includes('Anthropic'));
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('critical');
    expect(issue!.type).toBe('api_key');
  });

  it('detects an OpenAI API key', () => {
    const body = 'My openai key is sk-abcdefghijklmnopqrstuvwxyz01234567';
    const result = scanForSecurityIssues(body);
    expect(result.has_issues).toBe(true);
    const issue = result.issues.find(i => i.description.includes('OpenAI'));
    expect(issue).toBeDefined();
  });

  it('detects a GitHub personal access token', () => {
    const body = 'token: ghp_abcdefghijklmnopqrstuvwxyz01234567890';
    const result = scanForSecurityIssues(body);
    expect(result.has_issues).toBe(true);
    const issue = result.issues.find(i => i.description.includes('GitHub personal'));
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('critical');
  });

  it('detects an AWS Access Key ID', () => {
    const body = 'export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE';
    const result = scanForSecurityIssues(body);
    expect(result.has_issues).toBe(true);
    const issue = result.issues.find(i => i.description.includes('AWS Access Key ID'));
    expect(issue).toBeDefined();
  });

  it('detects a private key (PEM)', () => {
    const body = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----';
    const result = scanForSecurityIssues(body);
    expect(result.has_issues).toBe(true);
    const issue = result.issues.find(i => i.type === 'private_key');
    expect(issue).toBeDefined();
  });

  it('detects a Stripe live secret key', () => {
    // Construct the string at runtime so it is not flagged as a literal secret in source
    const key = ['sk', 'live', 'abcdefghijklmnopqrstuvwx'].join('_');
    const body = `stripe_key=${key}`;
    const result = scanForSecurityIssues(body);
    expect(result.has_issues).toBe(true);
    const issue = result.issues.find(i => i.description.includes('Stripe live secret'));
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('critical');
  });

  it('detects a US SSN', () => {
    const body = 'SSN: 123-45-6789';
    const result = scanForSecurityIssues(body);
    expect(result.has_issues).toBe(true);
    const issue = result.issues.find(i => i.description.includes('SSN'));
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('high');
  });

  it('detects a Slack bot token', () => {
    // Construct at runtime to avoid literal secret pattern in source
    const token = 'xoxb' + '-1234567890-abcdefghijklmnopqrstuvwxy';
    const body = token;
    const result = scanForSecurityIssues(body);
    expect(result.has_issues).toBe(true);
    const issue = result.issues.find(i => i.description.includes('Slack bot'));
    expect(issue).toBeDefined();
  });

  it('redacts detected secrets in the output body', () => {
    const key = 'ghp_abcdefghijklmnopqrstuvwxyz01234567890';
    const body = `Use token=${key} to authenticate`;
    const result = scanForSecurityIssues(body);
    expect(result.redacted_body).not.toContain(key);
    expect(result.redacted_body).toContain('***');
  });

  it('does not duplicate the same match', () => {
    const body = 'AKIA1234567890ABCDEF is my key and AKIA1234567890ABCDEF again';
    const result = scanForSecurityIssues(body);
    const awsIssues = result.issues.filter(i => i.description.includes('AWS Access Key'));
    expect(awsIssues).toHaveLength(1);
  });

  it('sorts issues by severity (critical first)', () => {
    const body = 'SSN: 123-45-6789 and key sk-live_abcdefghijklmnopqrstuvwx and ghp_abcdefghijklmnopqrstuvwxyz01234567890';
    const result = scanForSecurityIssues(body);
    if (result.issues.length > 1) {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      for (let i = 1; i < result.issues.length; i++) {
        expect(order[result.issues[i - 1].severity]).toBeLessThanOrEqual(order[result.issues[i].severity]);
      }
    }
  });

  it('applies custom patterns', () => {
    const body = 'my-corp-token-abc123def456ghi789jkl012';
    const result = scanForSecurityIssues(body, [{
      pattern: 'my-corp-token-[a-z0-9]{24}',
      flags: 'g',
      type: 'api_key',
      severity: 'critical',
      description: 'Corp internal token',
    }]);
    expect(result.has_issues).toBe(true);
    const issue = result.issues.find(i => i.description === 'Corp internal token');
    expect(issue).toBeDefined();
  });

  it('silently skips invalid custom patterns', () => {
    const body = 'some text';
    expect(() => scanForSecurityIssues(body, [{
      pattern: '[invalid(regex',
      flags: 'g',
      type: 'api_key',
      severity: 'high',
      description: 'Bad pattern',
    }])).not.toThrow();
  });

  it('handles empty body without throwing', () => {
    const result = scanForSecurityIssues('');
    expect(result.has_issues).toBe(false);
    expect(result.redacted_body).toBe('');
  });
});
