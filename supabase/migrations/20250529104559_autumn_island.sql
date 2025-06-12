-- Create storage bucket for license agreements if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('license-agreements', 'license-agreements', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

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
