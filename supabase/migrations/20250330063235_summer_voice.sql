/*
  # Image Search System Schema

  1. New Tables
    - `images`
      - `id` (uuid, primary key)
      - `url` (text, required) - URL of the stored image
      - `title` (text) - User-provided title
      - `description` (text) - AI-generated or user-provided description
      - `metadata` (jsonb) - Stores AI-generated metadata including:
        - objects
        - scenes
        - colors
        - emotions
        - technical_details
      - `tags` (text[]) - Searchable tags
      - `created_at` (timestamp)
      - `user_id` (uuid) - Reference to auth.users
    
  2. Security
    - Enable RLS on `images` table
    - Add policies for authenticated users to:
      - Read all images
      - Create/update/delete their own images
*/

CREATE TABLE IF NOT EXISTS images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  title text,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view all images"
  ON images
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own images"
  ON images
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own images"
  ON images
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images"
  ON images
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_images_tags ON images USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_images_metadata ON images USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_images_created_at ON images (created_at DESC);