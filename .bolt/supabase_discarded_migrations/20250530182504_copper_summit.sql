/*
  # Fix Announcements Table RLS Policies
  
  1. Changes
    - Drop existing policies that were causing issues
    - Create new policies with correct syntax for JWT access
    - Maintain public read access for published announcements
    - Fix admin access for all operations
    
  2. Security
    - Ensure admin users can manage all announcements
    - Restrict public users to only viewing published, non-expired announcements
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view published announcements" ON announcements;
DROP POLICY IF EXISTS "Only admins can manage announcements" ON announcements;

-- Create new policies with correct syntax
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
