#!/usr/bin/env bun
/**
 * import.ts -- Import prompts into EverPrompt from various formats.
 *
 * Supported formats:
 *   - JSON  (array of prompt objects)
 *   - JSONL (one prompt object per line)
 *   - CSV   (title, body, tags columns)
 *   - Markdown directory (one .md file per prompt)
 *
 * Usage:
 *   bun run tools/import.ts <file-or-directory> [--format json|jsonl|csv|md] [--project <name>]
 *
 * Environment:
 *   D1_API   - optional D1 HTTP API endpoint for remote import
 *   D1_TOKEN - optional Bearer token for D1 API auth
 */

import { parseArgs } from 'node:util';
import path from 'node:path';
import fs from 'node:fs';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    format: { type: 'string', short: 'f', default: 'json' },
    project: { type: 'string', short: 'p', default: 'Default' },
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help || positionals.length === 0) {
  console.log(`
  EverPrompt Import Tool

  Usage:
    bun run tools/import.ts <file-or-directory> [options]

  Options:
    -f, --format   Input format: json, jsonl, csv, md  (default: json)
    -p, --project  Target project name                  (default: Default)
    --dry-run      Parse and validate without inserting
    -h, --help     Show this help message

  Examples:
    bun run tools/import.ts ./prompts.json
    bun run tools/import.ts ./prompts/ --format md --project "My Project"
    bun run tools/import.ts ./export.csv --format csv --dry-run
  `);
  process.exit(0);
}

const inputPath = path.resolve(positionals[0]);
const format = values.format as string;
const projectName = values.project as string;
const dryRun = values['dry-run'] as boolean;

// ---------------------------------------------------------------------------
// Format parsers (stubs -- expand as needed)
// ---------------------------------------------------------------------------

interface RawPrompt {
  title: string;
  body: string;
  tags?: string[];
  category?: string;
}

async function parseJSON(filePath: string): Promise<RawPrompt[]> {
  const content = await Bun.file(filePath).text();
  const data = JSON.parse(content);
  return Array.isArray(data) ? data : [data];
}

async function parseJSONL(filePath: string): Promise<RawPrompt[]> {
  const content = await Bun.file(filePath).text();
  return content
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

async function parseCSV(filePath: string): Promise<RawPrompt[]> {
  const content = await Bun.file(filePath).text();
  const [headerLine, ...rows] = content.split('\n').filter((l) => l.trim());
  const headers = headerLine.split(',').map((h) => h.trim().toLowerCase());

  const titleIdx = headers.indexOf('title');
  const bodyIdx = headers.indexOf('body');
  const tagsIdx = headers.indexOf('tags');

  if (titleIdx === -1 || bodyIdx === -1) {
    throw new Error('CSV must have "title" and "body" columns');
  }

  return rows.map((row) => {
    // Simple CSV split (does not handle quoted commas -- improve for production)
    const cols = row.split(',');
    return {
      title: cols[titleIdx]?.trim() ?? '',
      body: cols[bodyIdx]?.trim() ?? '',
      tags: tagsIdx >= 0 ? cols[tagsIdx]?.split(';').map((t) => t.trim()) : [],
    };
  });
}

async function parseMarkdownDir(dirPath: string): Promise<RawPrompt[]> {
  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.md'));
  const prompts: RawPrompt[] = [];

  for (const file of files) {
    const content = await Bun.file(path.join(dirPath, file)).text();
    const title = file.replace(/\.md$/, '').replace(/[-_]/g, ' ');
    prompts.push({ title, body: content });
  }

  return prompts;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n  EverPrompt Import`);
  console.log(`  Source:  ${inputPath}`);
  console.log(`  Format:  ${format}`);
  console.log(`  Project: ${projectName}`);
  if (dryRun) console.log(`  Mode:    DRY RUN`);
  console.log('');

  let prompts: RawPrompt[];

  switch (format) {
    case 'json':
      prompts = await parseJSON(inputPath);
      break;
    case 'jsonl':
      prompts = await parseJSONL(inputPath);
      break;
    case 'csv':
      prompts = await parseCSV(inputPath);
      break;
    case 'md':
      prompts = await parseMarkdownDir(inputPath);
      break;
    default:
      console.error(`  Unknown format: ${format}`);
      process.exit(1);
  }

  console.log(`  Parsed ${prompts.length} prompt(s)\n`);

  // Validate
  const valid: RawPrompt[] = [];
  for (const p of prompts) {
    if (!p.title || !p.body) {
      console.warn(`  SKIP: Missing title or body -- "${p.title?.slice(0, 40)}..."`);
      continue;
    }
    valid.push(p);
  }

  console.log(`  Valid:  ${valid.length}`);
  console.log(`  Skipped: ${prompts.length - valid.length}\n`);

  if (dryRun) {
    console.log('  Dry run complete. No data was imported.\n');
    return;
  }

  // TODO: Insert into D1 via wrangler or HTTP API
  // For now, generate SQL statements and print them
  console.log('  Import execution is not yet implemented.');
  console.log('  Use tools/seed.ts for initial data population.\n');
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
