-- Create storage bucket for license agreements
BEGIN;

SET LOCAL ROLE postgres;

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

-- Set up RLS policies
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for object access
DROP POLICY IF EXISTS "Allow PDF uploads" ON storage.objects;
CREATE POLICY "Allow PDF uploads" ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (
  bucket_id = 'license-agreements' 
  AND lower(split_part(name, '.', -1)) = 'pdf'
);

DROP POLICY IF EXISTS "Public license downloads" ON storage.objects;
CREATE POLICY "Public license downloads" ON storage.objects 
FOR SELECT TO public 
USING (bucket_id = 'license-agreements');

DROP POLICY IF EXISTS "Owner deletions" ON storage.objects;
CREATE POLICY "Owner deletions" ON storage.objects 
FOR DELETE TO authenticated 
USING (
  bucket_id = 'license-agreements' 
  AND owner = auth.uid()
);

COMMIT;
