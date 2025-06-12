/*
  # Create profile photos storage bucket

  1. New Storage Bucket
    - Creates a new public bucket named 'profile-photos' for storing user profile images
    - Sets appropriate security policies for user access

  2. Security
    - Enables authenticated users to upload their own profile photos
    - Allows public read access to profile photos
    - Restricts file types to images only
    - Sets a maximum file size of 2MB
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true,
  2097152, -- 2MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Create policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos' AND
  owner = auth.uid()
);

-- Create policy to allow users to update their own files
CREATE POLICY "Allow users to update their own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  owner = auth.uid()
);

-- Create policy to allow users to delete their own files
CREATE POLICY "Allow users to delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  owner = auth.uid()
);

-- Create policy to allow public read access to files
CREATE POLICY "Allow public read access to files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-photos');
