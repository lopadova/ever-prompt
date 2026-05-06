import { describe, it, expect } from 'vitest';
import { parseSearchQuery } from '../utils/query-parser';

describe('parseSearchQuery', () => {
  it('returns empty filters and trimmed freeText for a plain query', () => {
    const result = parseSearchQuery('hello world');
    expect(result.freeText).toBe('hello world');
    expect(result.filters).toEqual({});
  });

  it('extracts project: operator', () => {
    const result = parseSearchQuery('project:my-project some text');
    expect(result.filters.project_id).toBe('my-project');
    expect(result.freeText).toBe('some text');
  });

  it('extracts cat: operator', () => {
    const result = parseSearchQuery('cat:tools');
    expect(result.filters.category_id).toBe('tools');
    expect(result.freeText).toBe('');
  });

  it('extracts band: operator and uppercases the value', () => {
    const result = parseSearchQuery('band:a band:b');
    expect(result.filters.quality_band).toEqual(['A', 'B']);
    expect(result.freeText).toBe('');
  });

  it('extracts lang: operator', () => {
    const result = parseSearchQuery('lang:en');
    expect(result.filters.language).toBe('en');
  });

  it('extracts source: operator', () => {
    const result = parseSearchQuery('source:plugin');
    expect(result.filters.source).toBe('plugin');
  });

  it('extracts status: operator', () => {
    const result = parseSearchQuery('status:active');
    expect(result.filters.status).toBe('active');
  });

  it('extracts is:favorite operator', () => {
    const result = parseSearchQuery('is:favorite');
    expect(result.filters.is_favorite).toBe(true);
  });

  it('extracts is:pinned operator', () => {
    const result = parseSearchQuery('is:pinned');
    expect(result.filters.is_pinned).toBe(true);
  });

  it('extracts has:improved operator', () => {
    const result = parseSearchQuery('has:improved');
    expect(result.filters.has_improved).toBe(true);
  });

  it('extracts multiple tag: operators', () => {
    const result = parseSearchQuery('tag:foo tag:bar');
    expect(result.filters.tag_ids).toEqual(['foo', 'bar']);
  });

  it('extracts score> operator', () => {
    const result = parseSearchQuery('score>75');
    expect(result.filters.score_min).toBe(75);
    expect(result.freeText).toBe('');
  });

  it('extracts score< operator', () => {
    const result = parseSearchQuery('score<50');
    expect(result.filters.score_max).toBe(50);
  });

  it('keeps unknown operators as free text', () => {
    const result = parseSearchQuery('unknown:value hello');
    expect(result.freeText).toBe('unknown:value hello');
  });

  it('handles empty string', () => {
    const result = parseSearchQuery('');
    expect(result.freeText).toBe('');
    expect(result.filters).toEqual({});
  });

  it('handles created:today shorthand', () => {
    const result = parseSearchQuery('created:today');
    expect(result.filters.created_after).toBeDefined();
    // Should be an ISO string representing midnight today
    const parsed = new Date(result.filters.created_after!);
    const today = new Date();
    expect(parsed.getFullYear()).toBe(today.getFullYear());
    expect(parsed.getMonth()).toBe(today.getMonth());
    expect(parsed.getDate()).toBe(today.getDate());
  });

  it('handles created:last7d shorthand', () => {
    const before = Date.now();
    const result = parseSearchQuery('created:last7d');
    const after = Date.now();
    const parsed = new Date(result.filters.created_after!).getTime();
    const expectedMin = before - 7 * 24 * 60 * 60 * 1000;
    const expectedMax = after - 7 * 24 * 60 * 60 * 1000;
    expect(parsed).toBeGreaterThanOrEqual(expectedMin);
    expect(parsed).toBeLessThanOrEqual(expectedMax + 100);
  });

  it('trims extra whitespace from freeText', () => {
    const result = parseSearchQuery('  hello   world  ');
    expect(result.freeText).toBe('hello world');
  });

  it('combines multiple operators with freeText', () => {
    const result = parseSearchQuery('lang:en status:active my prompt text');
    expect(result.filters.language).toBe('en');
    expect(result.filters.status).toBe('active');
    expect(result.freeText).toBe('my prompt text');
  });
});
