/*
  # Update announcements table RLS policies

  1. Changes
    - Drop existing RLS policies for announcements table
    - Create new comprehensive RLS policies that properly handle all operations
    
  2. Security
    - Enable RLS on announcements table
    - Add policies for:
      - Admin users to manage all announcements
      - Public users to view published announcements
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view published announcements" ON announcements;
DROP POLICY IF EXISTS "Only admins can manage announcements" ON announcements;

-- Create new policies
CREATE POLICY "Admin users can manage announcements"
ON announcements
FOR ALL
TO public
USING (
  (jwt() ->> 'email'::text) = ANY (ARRAY['knockriobeats@gmail.com'::text, 'info@mybeatfi.io'::text, 'derykbanks@yahoo.com'::text])
)
WITH CHECK (
  (jwt() ->> 'email'::text) = ANY (ARRAY['knockriobeats@gmail.com'::text, 'info@mybeatfi.io'::text, 'derykbanks@yahoo.com'::text])
);

CREATE POLICY "Public users can view published announcements"
ON announcements
FOR SELECT
TO public
USING (
  published_at <= now() 
  AND (expires_at IS NULL OR expires_at > now())
);
