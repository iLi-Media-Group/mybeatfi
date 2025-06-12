-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view published announcements" ON announcements;
DROP POLICY IF EXISTS "Only admins can manage announcements" ON announcements;

-- Create new policies
CREATE POLICY "Admin users can manage announcements"
ON announcements
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'email'::text) = ANY (ARRAY['knockriobeats@gmail.com'::text, 'info@mybeatfi.io'::text, 'derykbanks@yahoo.com'::text])
)
WITH CHECK (
  (auth.jwt() ->> 'email'::text) = ANY (ARRAY['knockriobeats@gmail.com'::text, 'info@mybeatfi.io'::text, 'derykbanks@yahoo.com'::text])
);

CREATE POLICY "Public users can view published announcements"
ON announcements
FOR SELECT
TO public
USING (
  published_at <= now() 
  AND (expires_at IS NULL OR expires_at > now())
);
