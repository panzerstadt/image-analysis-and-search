/*
  # Create Storage Bucket for Images

  1. New Storage Bucket
    - Create a new public bucket called 'images' for storing uploaded images
    - Enable public access to allow direct image URLs
  
  2. Security
    - Enable RLS on the storage bucket
    - Add policies to allow authenticated users to:
      - Upload their own images
      - Read all images
*/

-- Enable storage by inserting into storage.buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true);

-- Set up RLS for the storage bucket
CREATE POLICY "Authenticated users can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

CREATE POLICY "Anyone can view images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'images');