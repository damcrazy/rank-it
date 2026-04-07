export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// ── Row types ─────────────────────────────────────────────────────────────────

export type BoardRow = {
  id: string
  slug: string
  title: string
  description: string | null
  category: string | null
  location: string | null
  gps_lat: number | null
  gps_lng: number | null
  created_by: string | null
  view_count: number
  created_at: string
  updated_at: string
}

export type ItemRow = {
  id: string
  board_id: string
  name: string
  name_normalized: string
  description: string | null
  vote_count: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export type SubmissionRow = {
  id: string
  board_id: string
  item_id: string
  user_id: string | null
  phone_hash: string | null
  ip_hash: string | null
  gps_lat: number | null
  gps_lng: number | null
  screen_res: string | null
  timezone: string | null
  ua_hash: string | null
  language: string | null
  created_at: string
}

// ── Insert types ──────────────────────────────────────────────────────────────

export type BoardInsert = {
  id?: string
  slug: string
  title: string
  description?: string | null
  category?: string | null
  location?: string | null
  gps_lat?: number | null
  gps_lng?: number | null
  created_by?: string | null
  view_count?: number
  created_at?: string
  updated_at?: string
}

export type ItemInsert = {
  id?: string
  board_id: string
  name: string
  name_normalized: string
  description?: string | null
  vote_count?: number
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export type SubmissionInsert = {
  id?: string
  board_id: string
  item_id: string
  user_id?: string | null
  phone_hash?: string | null
  ip_hash?: string | null
  gps_lat?: number | null
  gps_lng?: number | null
  screen_res?: string | null
  timezone?: string | null
  ua_hash?: string | null
  language?: string | null
  created_at?: string
}

// ── Supabase Database shape ───────────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      boards: {
        Row: BoardRow
        Insert: BoardInsert
        Update: Partial<BoardInsert>
        Relationships: []
      }
      items: {
        Row: ItemRow
        Insert: ItemInsert
        Update: Partial<ItemInsert>
        Relationships: [
          {
            foreignKeyName: "items_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          }
        ]
      }
      submissions: {
        Row: SubmissionRow
        Insert: SubmissionInsert
        Update: Partial<SubmissionInsert>
        Relationships: [
          {
            foreignKeyName: "submissions_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      find_similar_items: {
        Args: { p_board_id: string; p_name: string; p_threshold?: number }
        Returns: SimilarItem[]
      }
      increment_vote: {
        Args: { p_item_id: string }
        Returns: ItemRow
      }
      boards_near_location: {
        Args: { user_lat: number; user_lng: number; radius_km?: number }
        Returns: BoardRow[]
      }
    }
  }
}

// ── Convenience aliases ───────────────────────────────────────────────────────

export type Board = BoardRow
export type Item = ItemRow
export type Submission = SubmissionRow
export type SimilarItem = { id: string; name: string; vote_count: number; sim: number }
