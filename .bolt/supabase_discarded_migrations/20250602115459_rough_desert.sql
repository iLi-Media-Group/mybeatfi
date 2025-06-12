-- First check if policies exist and drop them if they do
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'announcements' 
        AND policyname = 'Admin users can manage announcements'
    ) THEN
        DROP POLICY "Admin users can manage announcements" ON announcements;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'announcements' 
        AND policyname = 'Public users can view published announcements'
    ) THEN
        DROP POLICY "Public users can view published announcements" ON announcements;
    END IF;
    
    -- Drop old policies by name if they exist
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'announcements' 
        AND policyname = 'Anyone can view published announcements'
    ) THEN
        DROP POLICY "Anyone can view published announcements" ON announcements;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'announcements' 
        AND policyname = 'Only admins can manage announcements'
    ) THEN
        DROP POLICY "Only admins can manage announcements" ON announcements;
    END IF;
END
$$;

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
