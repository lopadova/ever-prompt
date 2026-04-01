import type { SearchFilters } from '../types/search';

interface ParsedQuery {
  freeText: string;
  filters: Partial<SearchFilters>;
}

const OPERATOR_REGEX = /(\w+):([^\s]+)/g;
const SCORE_GT_REGEX = /score>(\d+)/g;
const SCORE_LT_REGEX = /score<(\d+)/g;

export function parseSearchQuery(raw: string): ParsedQuery {
  const filters: Partial<SearchFilters> = {};
  let freeText = raw;

  // Extract score operators
  freeText = freeText.replace(SCORE_GT_REGEX, (_, val) => {
    filters.score_min = parseInt(val, 10);
    return '';
  });
  freeText = freeText.replace(SCORE_LT_REGEX, (_, val) => {
    filters.score_max = parseInt(val, 10);
    return '';
  });

  // Extract key:value operators
  freeText = freeText.replace(OPERATOR_REGEX, (match, key, value) => {
    switch (key) {
      case 'project': filters.project_id = value; break;
      case 'tag':
        filters.tag_ids = filters.tag_ids || [];
        filters.tag_ids.push(value);
        break;
      case 'cat': filters.category_id = value; break;
      case 'band':
        filters.quality_band = filters.quality_band || [];
        filters.quality_band.push(value.toUpperCase() as 'A' | 'B' | 'C' | 'D');
        break;
      case 'lang': filters.language = value; break;
      case 'source': filters.source = value; break;
      case 'status': filters.status = value; break;
      case 'is':
        if (value === 'favorite') filters.is_favorite = true;
        if (value === 'pinned') filters.is_pinned = true;
        break;
      case 'has':
        if (value === 'improved') filters.has_improved = true;
        break;
      case 'created':
        filters.created_after = resolveDateShorthand(value);
        break;
      case 'updated':
        filters.updated_after = resolveDateShorthand(value);
        break;
      default:
        return match; // keep unknown operators in freeText
    }
    return '';
  });

  freeText = freeText.replace(/\s+/g, ' ').trim();

  return { freeText, filters };
}

function resolveDateShorthand(value: string): string {
  const now = new Date();
  switch (value) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    case 'thisweek': {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      return d.toISOString();
    }
    case 'last7d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d.toISOString();
    }
    case 'last30d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d.toISOString();
    }
    default:
      return value; // assume ISO date
  }
}
