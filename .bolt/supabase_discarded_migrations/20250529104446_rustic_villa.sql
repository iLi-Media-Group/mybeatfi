-- Enable RLS
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Create policies for storage buckets
CREATE POLICY "Allow authenticated users to create buckets"
ON storage.buckets
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow users to view their own buckets"
ON storage.buckets
FOR SELECT
TO authenticated
USING (owner = auth.uid());

CREATE POLICY "Allow admins full access to buckets"
ON storage.buckets
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email IN ('knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com')
  )
);

-- Create public access policy for license-agreements bucket
CREATE POLICY "Allow public read access to license-agreements bucket"
ON storage.buckets
FOR SELECT
TO public
USING (name = 'license-agreements');
