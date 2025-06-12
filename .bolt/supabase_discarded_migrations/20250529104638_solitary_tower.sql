-- Create storage bucket for license agreements if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'license-agreements',
  'license-agreements',
  true,
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET 
  public = EXCLUDED.public,
  avif_autodetection = EXCLUDED.avif_autodetection,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Enable RLS on objects table if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to license agreements" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own license agreements" ON storage.objects;

-- Create storage.objects policies for license agreements
CREATE POLICY "Allow authenticated users to upload PDFs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  (bucket_id = 'license-agreements')
  AND (lower(split_part(name, '.', -1)) = 'pdf')
);

CREATE POLICY "Allow public read access to license agreements"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'license-agreements');

CREATE POLICY "Users can delete their own license agreements"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'license-agreements'
  AND owner = auth.uid()
);
