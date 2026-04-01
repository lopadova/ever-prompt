export interface Project {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
  description: string | null;
  prompt_count: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  color: string | null;
  icon: string | null;
  prompt_count: number;
  children?: Category[];
}

export type TagKind = 'topic' | 'model' | 'tone' | 'task' | 'quality' | 'domain' | 'language' | 'technique';

export interface Tag {
  id: string;
  name: string;
  slug: string;
  kind: TagKind;
  color: string | null;
  usage_count: number;
  is_ai_generated: boolean;
  created_at: string;
}
