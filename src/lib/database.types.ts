export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      images: {
        Row: {
          id: string
          url: string
          title: string | null
          description: string | null
          metadata: Json
          tags: string[]
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          url: string
          title?: string | null
          description?: string | null
          metadata?: Json
          tags?: string[]
          created_at?: string
          user_id: string
        }
        Update: {
          id?: string
          url?: string
          title?: string | null
          description?: string | null
          metadata?: Json
          tags?: string[]
          created_at?: string
          user_id?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}