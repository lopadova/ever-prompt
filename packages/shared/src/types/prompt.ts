export interface SecurityIssue {
  type: 'api_key' | 'password' | 'credit_card' | 'private_key' | 'token' | 'email' | 'ip_address' | 'other';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  matched_text: string; // partially redacted: "sk-ant-***...***f4aTw"
}

export type PromptStatus = 'inbox' | 'active' | 'archived' | 'deleted';
export type PromptSource = 'manual' | 'import' | 'plugin' | 'api' | 'extension';
export type QualityBand = 'A' | 'B' | 'C' | 'D';
export type AiStatus = 'pending' | 'analyzing' | 'complete' | 'partial' | 'failed_classify' | 'failed_score' | 'failed_embed';
export type VersionKind = 'original' | 'edited' | 'improved_ai' | 'snapshot';
export type TagOrigin = 'ai' | 'manual' | 'rule';

export interface Prompt {
  id: string;
  project_id: string | null;
  category_id: string | null;
  title: string;
  abstract: string;
  body_original: string;
  body_normalized: string;
  language: string;
  source: PromptSource;
  status: PromptStatus;
  quality_band: QualityBand | null;
  overall_score: number | null;
  ai_status: AiStatus;
  is_favorite: boolean;
  is_pinned: boolean;
  has_improved_version: boolean;
  has_security_issues: boolean;
  security_issues: SecurityIssue[];
  hash_sha256: string;
  fingerprint: string;
  word_count: number;
  char_count: number;
  search_text: string;
  ai_analyzed_at: string | null;
  session_id: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromptVersion {
  id: string;
  prompt_id: string;
  version_no: number;
  body: string;
  kind: VersionKind;
  diff_from_previous: string | null;
  created_at: string;
}

export interface PromptAiReview {
  id: string;
  prompt_id: string;
  overall_score: number;
  clarity_score: number;
  context_score: number;
  specificity_score: number;
  structure_score: number;
  reusability_score: number;
  actionability_score: number;
  evaluation_score: number;
  safety_score: number;
  compression_score: number;
  toolability_score: number;
  quality_band: QualityBand;
  short_verdict: string;
  justification_md: string;
  strengths_md: string;
  weaknesses_md: string;
  improved_prompt_md: string;
  improvement_diff: string;
  recommended_actions: string[];
  model_name: string;
  created_at: string;
}

export interface PromptTag {
  prompt_id: string;
  tag_id: string;
  confidence: number;
  origin: TagOrigin;
}

export interface PromptEmbedding {
  prompt_id: string;
  vector_id: string;
  embedding_model: string;
  embedded_text_hash: string;
  updated_at: string;
}

// List item (lighter than full Prompt)
export interface PromptListItem {
  id: string;
  title: string;
  abstract: string;
  project_id: string | null;
  category_id: string | null;
  quality_band: QualityBand | null;
  overall_score: number | null;
  ai_status: AiStatus;
  status: PromptStatus;
  source: PromptSource;
  is_favorite: boolean;
  is_pinned: boolean;
  has_improved_version: boolean;
  has_security_issues: boolean;
  language: string;
  word_count: number;
  created_at: string;
  updated_at: string;
  tags: { id: string; name: string; slug: string; color: string | null }[];
  project_name?: string;
  project_color?: string;
  category_name?: string;
}

// Full detail including review, versions, similar
export interface PromptDetail extends Prompt {
  tags: (Tag & { confidence: number; origin: TagOrigin })[];
  project: Project | null;
  category: Category | null;
  latest_review: PromptAiReview | null;
  versions: PromptVersion[];
  notes: Note[];
}

// Forward declarations for cross-references
import type { Tag, Project, Category } from './taxonomy';
import type { Note } from './api';
