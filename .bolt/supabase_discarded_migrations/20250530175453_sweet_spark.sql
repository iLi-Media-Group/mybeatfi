-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'announcements',
  'announcements',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated admins to upload announcement images" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to update announcement images" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to delete announcement images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to announcement images" ON storage.objects;

-- Create policy to allow admin users to upload files
CREATE POLICY "Allow authenticated admins to upload announcement images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'announcements' AND
  (SELECT email FROM profiles WHERE id = auth.uid()) IN (
    'knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com'
  )
);

-- Create policy to allow admin users to update files
CREATE POLICY "Allow admins to update announcement images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'announcements' AND
  (SELECT email FROM profiles WHERE id = auth.uid()) IN (
    'knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com'
  )
);

-- Create policy to allow admin users to delete files
CREATE POLICY "Allow admins to delete announcement images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'announcements' AND
  (SELECT email FROM profiles WHERE id = auth.uid()) IN (
    'knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com'
  )
);

-- Create policy to allow public read access to files
CREATE POLICY "Allow public read access to announcement images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'announcements');
