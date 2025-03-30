/*
  # Fix search_images function type mismatch

  1. Changes
    - Cast similarity values to double precision to match expected type
    - Update function return type to use double precision
*/

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
  similarity double precision  -- Changed from float to double precision
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
    CAST(
      GREATEST(
        COALESCE(similarity(i.title, search_query), 0),
        COALESCE(similarity(i.description, search_query), 0),
        COALESCE((
          SELECT MAX(similarity(tag, search_query))
          FROM unnest(i.tags) tag
        ), 0)
      ) AS double precision  -- Cast the similarity calculation to double precision
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
    CAST(similarity(COALESCE(i.title, ''), search_query) AS double precision) >= similarity_threshold
    OR CAST(similarity(COALESCE(i.description, ''), search_query) AS double precision) >= similarity_threshold
    OR EXISTS (
      SELECT 1 
      FROM unnest(i.tags) tag 
      WHERE CAST(similarity(tag, search_query) AS double precision) >= similarity_threshold
    )
  )
  ORDER BY similarity DESC;
END;
$$;