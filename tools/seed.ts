#!/usr/bin/env bun
/**
 * seed.ts -- Seed the EverPrompt D1 database with sample data.
 *
 * Usage:
 *   bun run tools/seed.ts                          # uses local wrangler D1
 *   D1_API=https://... bun run tools/seed.ts       # uses remote D1 HTTP API
 *
 * Creates: 3 projects, 5 categories, 10 tags, 20 prompts (with versions & tag links).
 */

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let idCounter = 0;
function ulid(): string {
  const t = Date.now().toString(36).padStart(10, '0');
  const r = crypto.randomBytes(10).toString('hex').slice(0, 16);
  idCounter++;
  return (t + r + idCounter.toString(36)).toUpperCase().slice(0, 26);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function softFingerprint(text: string): string {
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return sha256(normalized);
}

function now(): string {
  return new Date().toISOString();
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function esc(s: string): string {
  return s.replace(/'/g, "''");
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const PROJECTS = [
  { name: 'Engineering Handbook', color: '#3b82f6', icon: 'code', description: 'Prompts for software development, architecture, and code review' },
  { name: 'Content Studio', color: '#10b981', icon: 'pen-tool', description: 'Writing, editing, and creative content generation prompts' },
  { name: 'Research Lab', color: '#8b5cf6', icon: 'microscope', description: 'Analysis, data science, and research methodology prompts' },
];

const CATEGORIES = [
  { name: 'Code Generation', icon: 'terminal', color: '#3b82f6' },
  { name: 'Architecture', icon: 'layers', color: '#f59e0b' },
  { name: 'Technical Writing', icon: 'file-text', color: '#10b981' },
  { name: 'Data Analysis', icon: 'bar-chart', color: '#8b5cf6' },
  { name: 'Creative Writing', icon: 'sparkles', color: '#ec4899' },
];

const TAGS = [
  { name: 'TypeScript', kind: 'language' },
  { name: 'Python', kind: 'language' },
  { name: 'System Design', kind: 'topic' },
  { name: 'Refactoring', kind: 'technique' },
  { name: 'Testing', kind: 'technique' },
  { name: 'API Design', kind: 'topic' },
  { name: 'Documentation', kind: 'topic' },
  { name: 'Performance', kind: 'topic' },
  { name: 'Security', kind: 'topic' },
  { name: 'Code Review', kind: 'technique' },
];

interface PromptDef {
  title: string;
  body: string;
  projectIdx: number;
  categoryIdx: number;
  tagIndices: number[];
  status: string;
  quality_band: string;
  overall_score: number;
  is_favorite: boolean;
}

const PROMPTS: PromptDef[] = [
  {
    title: 'TypeScript Strict Mode Migration',
    body: `You are a senior TypeScript engineer. I need to migrate a large JavaScript codebase to strict TypeScript.

Requirements:
- Enable strict mode incrementally using tsconfig paths
- Prioritize files by dependency depth (leaf modules first)
- Generate proper type declarations for untyped third-party modules
- Add discriminated unions where plain string types are used
- Ensure no "any" types remain in the final pass

For each file, output:
1. The original problematic patterns
2. The strict-typed replacement
3. A brief explanation of why the new types are safer`,
    projectIdx: 0, categoryIdx: 0, tagIndices: [0, 3], status: 'reviewed', quality_band: 'excellent', overall_score: 92, is_favorite: true,
  },
  {
    title: 'REST API Design Review Checklist',
    body: `Act as an API architect. Review the following REST API design and evaluate it against these criteria:

1. Resource naming: Are nouns used? Is pluralization consistent?
2. HTTP methods: Are GET/POST/PUT/PATCH/DELETE used correctly?
3. Status codes: Are appropriate codes returned for each scenario?
4. Pagination: Is cursor-based or offset pagination implemented?
5. Versioning: Is the API versioned via URL path or headers?
6. Error format: Do errors follow RFC 7807 Problem Details?
7. Authentication: Is OAuth 2.0 or API key auth used appropriately?
8. Rate limiting: Are rate limit headers included?

Output a structured review with severity (critical/warning/info) for each finding.`,
    projectIdx: 0, categoryIdx: 1, tagIndices: [5, 2], status: 'reviewed', quality_band: 'good', overall_score: 85, is_favorite: false,
  },
  {
    title: 'Microservices Decomposition Strategy',
    body: `You are a systems architect. Help me decompose a monolithic e-commerce application into microservices.

Current monolith modules: User Management, Product Catalog, Order Processing, Payment, Inventory, Shipping, Notifications, Analytics.

For each proposed service:
- Define bounded context boundaries
- List owned data entities
- Specify synchronous vs asynchronous communication patterns
- Identify shared libraries vs duplicated code trade-offs
- Propose a migration sequence that avoids big-bang rewrites

Constraints: Team size is 4 engineers, budget favors managed cloud services, current traffic is 10k RPM with 3x holiday spikes.`,
    projectIdx: 0, categoryIdx: 1, tagIndices: [2, 7], status: 'active', quality_band: 'excellent', overall_score: 94, is_favorite: true,
  },
  {
    title: 'Python Data Pipeline Code Review',
    body: `Review the following Python data pipeline code for:

1. Error handling: Are exceptions caught and logged appropriately?
2. Resource management: Are connections and file handles properly closed?
3. Idempotency: Can the pipeline be safely re-run without duplicating data?
4. Performance: Are there N+1 query problems or unnecessary data copies?
5. Testing: Is the code structured for unit testing with dependency injection?
6. Type hints: Are all functions properly annotated with type hints?

Provide specific code suggestions using Python 3.12+ features where beneficial.`,
    projectIdx: 0, categoryIdx: 0, tagIndices: [1, 9, 7], status: 'active', quality_band: 'good', overall_score: 82, is_favorite: false,
  },
  {
    title: 'Technical Architecture Decision Record',
    body: `Write an Architecture Decision Record (ADR) using the following template:

# ADR-{number}: {title}

## Status
{Proposed | Accepted | Deprecated | Superseded}

## Context
What is the issue that we are seeing that motivates this decision?

## Decision
What is the change that we are proposing and/or doing?

## Consequences
What becomes easier or more difficult because of this change?

## Alternatives Considered
What other options were evaluated?

Fill in this template for the following architectural decision: {describe your decision here}

Output should be professional, concise, and reference specific technical trade-offs.`,
    projectIdx: 0, categoryIdx: 2, tagIndices: [2, 6], status: 'reviewed', quality_band: 'good', overall_score: 88, is_favorite: false,
  },
  {
    title: 'Blog Post from Technical Concept',
    body: `You are a technical writer who makes complex concepts accessible. Write a blog post that:

1. Opens with a relatable analogy or real-world scenario
2. Explains the concept progressively (beginner -> intermediate -> advanced)
3. Includes at least 2 code examples with inline comments
4. Adds a "Common Mistakes" section with corrections
5. Ends with practical next steps the reader can take today

Tone: Conversational but authoritative. Like explaining to a smart colleague over coffee.
Length: 1200-1800 words.
Format: Markdown with proper headings, code blocks, and callout boxes.`,
    projectIdx: 1, categoryIdx: 2, tagIndices: [6], status: 'active', quality_band: 'good', overall_score: 79, is_favorite: true,
  },
  {
    title: 'Unit Test Generator for TypeScript',
    body: `Generate comprehensive unit tests for the provided TypeScript function/class.

Requirements:
- Use Vitest as the test framework
- Follow AAA pattern (Arrange, Act, Assert)
- Cover: happy path, edge cases, error cases, boundary values
- Mock external dependencies using vi.mock()
- Use descriptive test names: "should {expected behavior} when {condition}"
- Add type-safe test fixtures
- Target >90% branch coverage

For each test, add a brief comment explaining what scenario it validates.
Output the complete test file ready to run.`,
    projectIdx: 0, categoryIdx: 0, tagIndices: [0, 4], status: 'reviewed', quality_band: 'excellent', overall_score: 91, is_favorite: true,
  },
  {
    title: 'SQL Query Performance Analyzer',
    body: `Analyze the following SQL query for performance issues:

1. Identify missing indexes based on WHERE, JOIN, and ORDER BY clauses
2. Detect N+1 patterns or correlated subqueries
3. Suggest query rewrites using CTEs, window functions, or lateral joins
4. Estimate complexity (table scan vs index scan vs index seek)
5. Recommend EXPLAIN ANALYZE interpretation guidelines

Database: PostgreSQL 16
Table sizes: Assume 1M-10M rows per table
Constraints: Query must complete in <100ms at p99

Provide the optimized query and the CREATE INDEX statements needed.`,
    projectIdx: 2, categoryIdx: 3, tagIndices: [7], status: 'active', quality_band: 'good', overall_score: 86, is_favorite: false,
  },
  {
    title: 'Security Threat Model Template',
    body: `Create a STRIDE threat model for the described system:

For each component in the system:
1. **Spoofing**: Can an attacker impersonate a legitimate user or service?
2. **Tampering**: Can data be modified in transit or at rest?
3. **Repudiation**: Can actions be performed without proper audit trails?
4. **Information Disclosure**: Can sensitive data leak through logs, errors, or side channels?
5. **Denial of Service**: Can the system be overwhelmed or made unavailable?
6. **Elevation of Privilege**: Can a user gain unauthorized access levels?

For each threat found:
- Assign a risk rating (Critical/High/Medium/Low)
- Propose specific mitigations
- Reference relevant OWASP guidelines or CWE numbers`,
    projectIdx: 2, categoryIdx: 1, tagIndices: [8, 2], status: 'reviewed', quality_band: 'excellent', overall_score: 93, is_favorite: true,
  },
  {
    title: 'Creative Short Story Generator',
    body: `Write a short story (800-1200 words) with the following parameters:

Genre: {genre}
Setting: {time period and location}
Protagonist: {brief character description}
Central conflict: {the main tension or problem}
Tone: {e.g., whimsical, dark, hopeful, satirical}

Requirements:
- Open with a hook that establishes voice within the first paragraph
- Use "show don't tell" for emotional beats
- Include at least one moment of subverted expectations
- End with a resonant final line that reframes the opening
- Vary sentence length for rhythm
- Use sensory details (sight, sound, smell, touch, taste)

Do not use cliches. Prefer specific, concrete details over abstract descriptions.`,
    projectIdx: 1, categoryIdx: 4, tagIndices: [], status: 'active', quality_band: 'good', overall_score: 77, is_favorite: false,
  },
  {
    title: 'Refactoring Legacy Code Safely',
    body: `You are a refactoring expert. Help me safely refactor legacy code using these principles:

1. **Characterization Tests First**: Write tests that capture current behavior before changing anything
2. **Extract Method**: Identify long methods and break them into focused units
3. **Replace Conditional with Polymorphism**: Find switch/if chains that should be class hierarchies
4. **Introduce Parameter Object**: Group related parameters into typed objects
5. **Remove Dead Code**: Identify unreachable code paths

For each refactoring step:
- Show the before/after code
- Explain why the refactoring improves maintainability
- Note any behavior changes to watch for
- Suggest what tests to run after each step

Approach: Small, verifiable steps. Never refactor and change behavior in the same commit.`,
    projectIdx: 0, categoryIdx: 0, tagIndices: [3, 4, 9], status: 'reviewed', quality_band: 'good', overall_score: 87, is_favorite: false,
  },
  {
    title: 'Data Visualization Dashboard Spec',
    body: `Design a data visualization dashboard for the following dataset and audience:

Dataset: {describe your data}
Audience: {who will use this dashboard}
Key decisions to be supported: {what questions should the dashboard answer}

For each visualization:
1. Chart type and justification (why this chart over alternatives)
2. Axes, legends, and color encoding specification
3. Interactive features (filters, drill-down, tooltips)
4. Responsive behavior for mobile/tablet/desktop
5. Accessibility considerations (color-blind safe palettes, screen reader labels)

Use Recharts/D3.js conventions for implementation details.
Include a wireframe description for the overall layout using a 12-column grid.`,
    projectIdx: 2, categoryIdx: 3, tagIndices: [0, 6], status: 'active', quality_band: 'fair', overall_score: 72, is_favorite: false,
  },
  {
    title: 'Email Newsletter Copy Template',
    body: `Write a weekly newsletter email for a tech audience:

Structure:
1. **Subject Line**: 6-10 words, curiosity-driven, no clickbait
2. **Preview Text**: 40-90 characters that complement (not repeat) the subject
3. **Opening Hook**: 1-2 sentences connecting to a timely event or trend
4. **Main Story**: 150-250 words on the primary topic with a clear takeaway
5. **Quick Links**: 3-5 curated links with one-line descriptions
6. **Tool of the Week**: Brief recommendation with use case
7. **Sign-off**: Personal, warm, with a question to encourage replies

Tone: Smart-casual. Like a knowledgeable friend sharing what they learned this week.
Avoid: Corporate jargon, excessive exclamation marks, "In this issue" openings.`,
    projectIdx: 1, categoryIdx: 2, tagIndices: [6], status: 'active', quality_band: 'fair', overall_score: 74, is_favorite: false,
  },
  {
    title: 'CI/CD Pipeline Architecture',
    body: `Design a CI/CD pipeline for a monorepo containing 3 services (API, web frontend, shared library).

Requirements:
- Affected-service detection: Only build/test/deploy changed services
- Parallel execution where possible
- Environment promotion: dev -> staging -> production
- Rollback strategy for each service type
- Secret management approach
- Cache strategy for dependencies and build artifacts
- Notification channels for failures and deployments

Platform: GitHub Actions
Deployment target: Cloudflare Workers (API), Cloudflare Pages (web)
Constraints: Free tier limits, <10 min total pipeline time

Output: YAML workflow files with inline comments explaining each step.`,
    projectIdx: 0, categoryIdx: 1, tagIndices: [2, 7], status: 'reviewed', quality_band: 'good', overall_score: 84, is_favorite: false,
  },
  {
    title: 'Python Statistical Analysis Template',
    body: `Perform a statistical analysis on the provided dataset:

Steps:
1. **Descriptive Statistics**: Mean, median, mode, std dev, quartiles, skewness, kurtosis
2. **Data Quality Check**: Missing values, outliers (IQR and Z-score methods), duplicates
3. **Distribution Analysis**: Histogram, Q-Q plot, Shapiro-Wilk normality test
4. **Correlation Analysis**: Pearson, Spearman, and point-biserial correlations as appropriate
5. **Hypothesis Testing**: t-test, chi-square, or ANOVA based on data types
6. **Effect Size**: Cohen's d, Cramer's V, or eta-squared as appropriate

Use pandas, scipy, and matplotlib/seaborn. Include interpretations in plain English after each statistical output. Flag any assumptions that may be violated.`,
    projectIdx: 2, categoryIdx: 3, tagIndices: [1], status: 'active', quality_band: 'good', overall_score: 81, is_favorite: false,
  },
  {
    title: 'Accessible React Component Audit',
    body: `Audit the following React component for accessibility compliance:

Check against WCAG 2.1 AA standards:
1. **Semantic HTML**: Are appropriate elements used (button vs div, nav vs div)?
2. **Keyboard Navigation**: Can all interactive elements be reached and activated via keyboard?
3. **ARIA Labels**: Are dynamic content and custom widgets properly labeled?
4. **Focus Management**: Is focus trapped in modals? Is focus restored on close?
5. **Color Contrast**: Do text/background combinations meet 4.5:1 ratio?
6. **Screen Reader Testing**: Will announcements make sense in linear reading order?
7. **Motion**: Is prefers-reduced-motion respected?
8. **Error States**: Are form errors associated with their inputs?

For each issue found, provide:
- The specific WCAG criterion violated
- A code fix with before/after
- Testing instructions using axe-core or VoiceOver`,
    projectIdx: 0, categoryIdx: 0, tagIndices: [0, 9], status: 'reviewed', quality_band: 'excellent', overall_score: 90, is_favorite: true,
  },
  {
    title: 'Product Requirements Document Template',
    body: `Write a Product Requirements Document (PRD) for the described feature:

## 1. Overview
- Problem statement (who has this problem and why it matters)
- Proposed solution (one paragraph)
- Success metrics (2-3 measurable outcomes)

## 2. User Stories
- As a {persona}, I want to {action}, so that {benefit}
- Include acceptance criteria for each story

## 3. Functional Requirements
- Numbered list of specific behaviors
- Include happy path and error scenarios

## 4. Non-Functional Requirements
- Performance targets
- Security requirements
- Scalability expectations

## 5. Design Considerations
- Key UX decisions and trade-offs
- Edge cases to handle

## 6. Out of Scope
- Explicitly list what this feature does NOT include

## 7. Timeline
- Milestones with estimated dates`,
    projectIdx: 1, categoryIdx: 2, tagIndices: [6], status: 'active', quality_band: 'fair', overall_score: 75, is_favorite: false,
  },
  {
    title: 'Database Schema Migration Plan',
    body: `Plan a zero-downtime database schema migration for the described change:

Migration strategy:
1. **Expand Phase**: Add new columns/tables without removing old ones
2. **Migrate Phase**: Backfill data, update application to write to both old and new
3. **Contract Phase**: Remove old columns/tables after verification

For each step provide:
- The exact SQL migration (up and down)
- Application code changes needed
- Rollback procedure
- Data validation queries to run after each step
- Estimated duration based on table size

Constraints:
- No downtime allowed
- Must be reversible at every step
- Must work with PostgreSQL logical replication
- Maximum lock time: 5 seconds`,
    projectIdx: 2, categoryIdx: 1, tagIndices: [2, 8], status: 'reviewed', quality_band: 'good', overall_score: 88, is_favorite: false,
  },
  {
    title: 'Persuasive Product Landing Page Copy',
    body: `Write landing page copy for a SaaS product using the PAS framework:

**Problem**: Agitate the pain point. Make the reader feel understood.
**Agitation**: Deepen the problem. What happens if they don't solve it?
**Solution**: Present the product as the natural answer.

Sections needed:
1. Hero: Headline (8 words max) + subheadline (20 words max) + CTA button text
2. Social proof: Template for testimonial cards
3. Features: 3 feature blocks with icon suggestion, headline, and 2-sentence description
4. Pricing: Copy for 3 tiers (Free, Pro, Team) with positioning language
5. FAQ: 5 common objections reframed as questions with reassuring answers
6. Final CTA: Urgency without sleaze

Tone: Confident, clear, human. No buzzwords. No "revolutionary" or "game-changing."`,
    projectIdx: 1, categoryIdx: 4, tagIndices: [], status: 'active', quality_band: 'good', overall_score: 80, is_favorite: false,
  },
  {
    title: 'Incident Postmortem Template',
    body: `Write an incident postmortem using the blameless format:

# Incident Postmortem: {Title}

**Date**: {date}
**Duration**: {start time} - {end time} ({total duration})
**Severity**: {SEV-1 | SEV-2 | SEV-3}
**Author**: {name}

## Summary
One paragraph describing what happened, impact, and resolution.

## Timeline
Chronological events from detection to resolution with timestamps.

## Root Cause
Technical root cause analysis. Use 5 Whys methodology.

## Impact
- Users affected: {number and percentage}
- Revenue impact: {if applicable}
- SLA impact: {which SLAs were breached}

## What Went Well
- List things that helped during the incident

## What Went Wrong
- List process failures or gaps (not people failures)

## Action Items
| Action | Owner | Priority | Due Date |
|--------|-------|----------|----------|

## Lessons Learned
Key takeaways for the team.`,
    projectIdx: 0, categoryIdx: 2, tagIndices: [6, 2], status: 'reviewed', quality_band: 'excellent', overall_score: 91, is_favorite: true,
  },
];

// ---------------------------------------------------------------------------
// SQL Generation
// ---------------------------------------------------------------------------

const statements: string[] = [];
const ts = now();

// Projects
const projectIds: string[] = [];
for (const p of PROJECTS) {
  const id = ulid();
  projectIds.push(id);
  statements.push(
    `INSERT INTO projects (id, name, slug, color, icon, description, prompt_count, created_at, updated_at) VALUES ('${id}', '${esc(p.name)}', '${slugify(p.name)}', '${p.color}', '${p.icon}', '${esc(p.description)}', 0, '${ts}', '${ts}');`
  );
}

// Categories
const categoryIds: string[] = [];
for (let i = 0; i < CATEGORIES.length; i++) {
  const c = CATEGORIES[i];
  const id = ulid();
  categoryIds.push(id);
  statements.push(
    `INSERT INTO categories (id, name, slug, parent_id, sort_order, color, icon, prompt_count) VALUES ('${id}', '${esc(c.name)}', '${slugify(c.name)}', NULL, ${i}, '${c.color}', '${c.icon}', 0);`
  );
}

// Tags
const tagIds: string[] = [];
for (const t of TAGS) {
  const id = ulid();
  tagIds.push(id);
  statements.push(
    `INSERT INTO tags (id, name, slug, kind, color, usage_count, is_ai_generated, created_at) VALUES ('${id}', '${esc(t.name)}', '${slugify(t.name)}', '${t.kind}', NULL, 0, 0, '${ts}');`
  );
}

// Prompts + versions + tags
for (const p of PROMPTS) {
  const id = ulid();
  const hash = sha256(p.body);
  const fp = softFingerprint(p.body);
  const wc = wordCount(p.body);
  const cc = p.body.length;
  const projId = projectIds[p.projectIdx];
  const catId = categoryIds[p.categoryIdx];
  const searchText = `${p.title} ${p.body}`.toLowerCase();

  statements.push(
    `INSERT INTO prompts (id, project_id, category_id, title, abstract, body_original, body_normalized, language, source, status, quality_band, overall_score, ai_status, is_favorite, is_pinned, has_improved_version, hash_sha256, fingerprint, word_count, char_count, search_text, ai_analyzed_at, last_used_at, created_at, updated_at) VALUES ('${id}', '${projId}', '${catId}', '${esc(p.title)}', '${esc(p.body.slice(0, 120))}...', '${esc(p.body)}', '${esc(p.body)}', 'en', 'manual', '${p.status}', '${p.quality_band}', ${p.overall_score}, 'completed', ${p.is_favorite ? 1 : 0}, 0, 0, '${hash}', '${fp}', ${wc}, ${cc}, '${esc(searchText)}', '${ts}', NULL, '${ts}', '${ts}');`
  );

  // Create initial version
  const versionId = ulid();
  statements.push(
    `INSERT INTO prompt_versions (id, prompt_id, version_no, body, kind, diff_from_previous, created_at) VALUES ('${versionId}', '${id}', 1, '${esc(p.body)}', 'original', NULL, '${ts}');`
  );

  // Link tags
  for (const tagIdx of p.tagIndices) {
    statements.push(
      `INSERT INTO prompt_tags (prompt_id, tag_id, confidence, origin) VALUES ('${id}', '${tagIds[tagIdx]}', 1.0, 'manual');`
    );
  }
}

// Update counts
statements.push(`UPDATE projects SET prompt_count = (SELECT COUNT(*) FROM prompts WHERE prompts.project_id = projects.id);`);
statements.push(`UPDATE categories SET prompt_count = (SELECT COUNT(*) FROM prompts WHERE prompts.category_id = categories.id);`);
statements.push(`UPDATE tags SET usage_count = (SELECT COUNT(*) FROM prompt_tags WHERE prompt_tags.tag_id = tags.id);`);

// ---------------------------------------------------------------------------
// Execute via wrangler d1
// ---------------------------------------------------------------------------

const DB_NAME = 'everprompt-db';

async function runLocal() {
  console.log(`\n  Seeding ${DB_NAME} via wrangler d1 execute (local)...\n`);
  console.log(`  Projects:   ${PROJECTS.length}`);
  console.log(`  Categories: ${CATEGORIES.length}`);
  console.log(`  Tags:       ${TAGS.length}`);
  console.log(`  Prompts:    ${PROMPTS.length}`);
  console.log(`  Total SQL:  ${statements.length} statements\n`);

  // Write SQL to a temp file and execute via wrangler
  const tmpFile = '.seed-tmp.sql';
  await Bun.write(tmpFile, statements.join('\n'));

  try {
    execFileSync('npx', ['wrangler', 'd1', 'execute', DB_NAME, '--local', `--file=${tmpFile}`], {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
    console.log('\n  Seed completed successfully!\n');
  } catch {
    console.error('\n  Wrangler execution failed. Falling back to printing SQL...\n');
    console.log('-- Copy and paste the following SQL into your D1 console:\n');
    console.log(statements.join('\n'));
  } finally {
    const fs = await import('node:fs');
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

async function runRemote() {
  const apiUrl = process.env.D1_API!;
  console.log(`\n  Seeding via D1 HTTP API: ${apiUrl}\n`);

  const resp = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.D1_TOKEN ? { Authorization: `Bearer ${process.env.D1_TOKEN}` } : {}),
    },
    body: JSON.stringify({ sql: statements.join('\n') }),
  });

  if (!resp.ok) {
    console.error(`  HTTP ${resp.status}: ${await resp.text()}`);
    process.exit(1);
  }

  console.log('  Seed completed successfully via HTTP API!\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

if (process.env.D1_API) {
  await runRemote();
} else {
  await runLocal();
}
