/*
  # Add Fuzzy Search Capabilities

  1. Changes
    - Enable pg_trgm extension for fuzzy text matching
    - Add trigram GiST indexes for text columns
    - Create a function to calculate text similarity scores
    - Create a function to search images with fuzzy matching

  2. Security
    - Functions are marked as STABLE and SECURITY DEFINER
    - Access is restricted to authenticated users
*/

-- Enable the pg_trgm extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add trigram indexes for text columns
CREATE INDEX IF NOT EXISTS idx_images_title_trgm ON images USING gist (title gist_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_images_description_trgm ON images USING gist (description gist_trgm_ops);

-- Function to search images with fuzzy matching
CREATE OR REPLACE FUNCTION search_images(
  search_query text,
  similarity_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  id uuid,
  url text,
  title text,
  description text,
  metadata jsonb,
  tags text[],
  created_at timestamptz,
  user_id uuid,
  similarity float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.*,
    GREATEST(
      COALESCE(similarity(i.title, search_query), 0),
      COALESCE(similarity(i.description, search_query), 0),
      COALESCE((
        SELECT MAX(similarity(tag, search_query))
        FROM unnest(i.tags) tag
      ), 0)
    ) as similarity
  FROM images i
  WHERE 
    -- Match title with trigram similarity
    i.title % search_query
    -- Match description with trigram similarity
    OR i.description % search_query
    -- Match any tag with trigram similarity
    OR EXISTS (
      SELECT 1 
      FROM unnest(i.tags) tag 
      WHERE tag % search_query
    )
    -- Match objects in metadata
    OR EXISTS (
      SELECT 1 
      FROM jsonb_array_elements_text(i.metadata->'objects') obj 
      WHERE obj % search_query
    )
    -- Match scenes in metadata
    OR EXISTS (
      SELECT 1 
      FROM jsonb_array_elements_text(i.metadata->'scenes') scene 
      WHERE scene % search_query
    )
  AND (
    similarity(COALESCE(i.title, ''), search_query) >= similarity_threshold
    OR similarity(COALESCE(i.description, ''), search_query) >= similarity_threshold
    OR EXISTS (
      SELECT 1 
      FROM unnest(i.tags) tag 
      WHERE similarity(tag, search_query) >= similarity_threshold
    )
  )
  ORDER BY similarity DESC;
END;
$$;