#!/usr/bin/env bun
/**
 * export.ts -- Export prompts from EverPrompt to various formats.
 *
 * Supported output formats:
 *   - JSON  (array of prompt objects)
 *   - JSONL (one prompt object per line)
 *   - CSV   (title, body, tags, category, project)
 *   - Markdown directory (one .md file per prompt)
 *
 * Usage:
 *   bun run tools/export.ts [--format json|jsonl|csv|md] [--output <path>] [--project <name>]
 *
 * Environment:
 *   D1_API   - optional D1 HTTP API endpoint for remote export
 *   D1_TOKEN - optional Bearer token for D1 API auth
 */

import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const { values } = parseArgs({
  options: {
    format: { type: 'string', short: 'f', default: 'json' },
    output: { type: 'string', short: 'o', default: './export' },
    project: { type: 'string', short: 'p' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help) {
  console.log(`
  EverPrompt Export Tool

  Usage:
    bun run tools/export.ts [options]

  Options:
    -f, --format   Output format: json, jsonl, csv, md  (default: json)
    -o, --output   Output file path or directory         (default: ./export)
    -p, --project  Filter by project name                (optional)
    -h, --help     Show this help message

  Examples:
    bun run tools/export.ts --format json --output ./backup.json
    bun run tools/export.ts --format md --output ./prompts-md/
    bun run tools/export.ts --format csv --project "Engineering Handbook"
  `);
  process.exit(0);
}

const format = (values.format ?? 'json') as string;
const outputPath = path.resolve((values.output ?? './export') as string);
const projectFilter = values.project as string | undefined;

// ---------------------------------------------------------------------------
// Data fetching (stub)
// ---------------------------------------------------------------------------

interface ExportPrompt {
  id: string;
  title: string;
  body: string;
  status: string;
  quality_band: string | null;
  overall_score: number | null;
  project_name: string | null;
  category_name: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

function fetchPrompts(): ExportPrompt[] {
  // TODO: Implement actual D1 query via wrangler or HTTP API
  //
  // Local approach using execFileSync for safety:
  //   const sql = `SELECT p.*, pr.name as project_name, c.name as category_name
  //                FROM prompts p
  //                LEFT JOIN projects pr ON p.project_id = pr.id
  //                LEFT JOIN categories c ON p.category_id = c.id
  //                ORDER BY p.created_at DESC`;
  //   const result = execFileSync('npx', [
  //     'wrangler', 'd1', 'execute', 'everprompt-db', '--local', `--command=${sql}`, '--json'
  //   ]);
  //
  // For now, return empty array as a stub
  console.log('  NOTE: Data fetching not yet implemented. Returning empty dataset.');
  return [];
}

// ---------------------------------------------------------------------------
// Format writers
// ---------------------------------------------------------------------------

async function writeJSON(prompts: ExportPrompt[], outPath: string): Promise<void> {
  const finalPath = outPath.endsWith('.json') ? outPath : `${outPath}.json`;
  await Bun.write(finalPath, JSON.stringify(prompts, null, 2));
  console.log(`  Written: ${finalPath}`);
}

async function writeJSONL(prompts: ExportPrompt[], outPath: string): Promise<void> {
  const finalPath = outPath.endsWith('.jsonl') ? outPath : `${outPath}.jsonl`;
  const lines = prompts.map((p) => JSON.stringify(p)).join('\n');
  await Bun.write(finalPath, lines);
  console.log(`  Written: ${finalPath}`);
}

async function writeCSV(prompts: ExportPrompt[], outPath: string): Promise<void> {
  const finalPath = outPath.endsWith('.csv') ? outPath : `${outPath}.csv`;
  const headers = 'id,title,body,status,quality_band,overall_score,project,category,tags,created_at,updated_at';
  const rows = prompts.map((p) => {
    const csvEscape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    return [
      p.id,
      csvEscape(p.title),
      csvEscape(p.body),
      p.status,
      p.quality_band ?? '',
      p.overall_score?.toString() ?? '',
      csvEscape(p.project_name ?? ''),
      csvEscape(p.category_name ?? ''),
      csvEscape(p.tags.join('; ')),
      p.created_at,
      p.updated_at,
    ].join(',');
  });
  await Bun.write(finalPath, [headers, ...rows].join('\n'));
  console.log(`  Written: ${finalPath}`);
}

async function writeMarkdownDir(prompts: ExportPrompt[], outDir: string): Promise<void> {
  fs.mkdirSync(outDir, { recursive: true });
  for (const p of prompts) {
    const slug = p.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 80);
    const filename = `${slug}.md`;
    const frontmatter = [
      '---',
      `title: "${p.title}"`,
      `status: ${p.status}`,
      p.quality_band ? `quality: ${p.quality_band}` : null,
      p.overall_score ? `score: ${p.overall_score}` : null,
      p.project_name ? `project: "${p.project_name}"` : null,
      p.category_name ? `category: "${p.category_name}"` : null,
      p.tags.length ? `tags: [${p.tags.map((t) => `"${t}"`).join(', ')}]` : null,
      `created: ${p.created_at}`,
      '---',
    ]
      .filter(Boolean)
      .join('\n');

    await Bun.write(path.join(outDir, filename), `${frontmatter}\n\n${p.body}\n`);
  }
  console.log(`  Written: ${prompts.length} files to ${outDir}/`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n  EverPrompt Export`);
  console.log(`  Format:  ${format}`);
  console.log(`  Output:  ${outputPath}`);
  if (projectFilter) console.log(`  Project: ${projectFilter}`);
  console.log('');

  const prompts = fetchPrompts();
  console.log(`  Found ${prompts.length} prompt(s)\n`);

  if (prompts.length === 0) {
    console.log('  No prompts to export. Run tools/seed.ts first to populate data.\n');
    return;
  }

  switch (format) {
    case 'json':
      await writeJSON(prompts, outputPath);
      break;
    case 'jsonl':
      await writeJSONL(prompts, outputPath);
      break;
    case 'csv':
      await writeCSV(prompts, outputPath);
      break;
    case 'md':
      await writeMarkdownDir(prompts, outputPath);
      break;
    default:
      console.error(`  Unknown format: ${format}`);
      process.exit(1);
  }

  console.log('\n  Export complete!\n');
}

main().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
