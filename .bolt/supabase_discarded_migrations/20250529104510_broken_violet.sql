-- Create storage bucket for license agreements if it doesn't exist
SELECT storage.create_bucket('license-agreements', {'public': true});

-- Update bucket public access
UPDATE storage.buckets 
SET public = true 
WHERE name = 'license-agreements';

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
