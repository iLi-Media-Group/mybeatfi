-- Create storage bucket for license agreements
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the bucket
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

-- Create security policies function
CREATE OR REPLACE FUNCTION storage.create_license_policies()
RETURNS void AS $$
BEGIN
  -- Enable RLS
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Allow PDF uploads" ON storage.objects;
  DROP POLICY IF EXISTS "Public license downloads" ON storage.objects;
  DROP POLICY IF EXISTS "Owner deletions" ON storage.objects;

  -- Create new policies
  CREATE POLICY "Allow PDF uploads" ON storage.objects 
    FOR INSERT TO authenticated 
    WITH CHECK (
      bucket_id = 'license-agreements' 
      AND lower(split_part(name, '.', -1)) = 'pdf'
    );

  CREATE POLICY "Public license downloads" ON storage.objects 
    FOR SELECT TO public 
    USING (bucket_id = 'license-agreements');

  CREATE POLICY "Owner deletions" ON storage.objects 
    FOR DELETE TO authenticated 
    USING (
      bucket_id = 'license-agreements' 
      AND owner = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the policy creation function
SELECT storage.create_license_policies();
