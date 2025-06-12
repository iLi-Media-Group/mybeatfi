-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'about-photos',
  'about-photos',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated admins to upload about photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own about photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own about photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to about photos" ON storage.objects;

-- Create policy to allow admin users to upload files
CREATE POLICY "Allow authenticated admins to upload about photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'about-photos' AND
  (SELECT email FROM profiles WHERE id = auth.uid()) IN (
    'knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com'
  )
);

-- Create policy to allow admin users to update files
CREATE POLICY "Allow admins to update about photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'about-photos' AND
  (SELECT email FROM profiles WHERE id = auth.uid()) IN (
    'knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com'
  )
);

-- Create policy to allow admin users to delete files
CREATE POLICY "Allow admins to delete about photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'about-photos' AND
  (SELECT email FROM profiles WHERE id = auth.uid()) IN (
    'knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com'
  )
);

-- Create policy to allow public read access to files
CREATE POLICY "Allow public read access to about photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'about-photos');

-- Create RPC function to create storage bucket if needed
CREATE OR REPLACE FUNCTION create_storage_bucket(bucket_name text, public_access boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES (bucket_name, bucket_name, public_access)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN json_build_object('success', true);
EXCEPTION
  WHEN others THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_storage_bucket TO authenticated;
