export interface Entry {
  id: number;
  date: string; // YYYY-MM-DD
  title: string;
  content: string; // HTML from Tiptap
  topic_id: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: number;
  name: string;
  color: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface EntryTag {
  entry_id: number;
  tag_id: number;
}

export interface EntryWithTags extends Entry {
  topic: Topic | null;
  tags: Tag[];
}

export interface SearchResult {
  id: number;
  date: string;
  title: string;
  content: string;
  topic: Topic | null;
  tags: Tag[];
}
