/*
  # Add chat rooms RLS policy

  1. Changes
    - Add RLS policy to allow authenticated users to create chat rooms
    - Add policy to allow users to manage their own chat rooms
  
  2. Security
    - Enable RLS on chat_rooms table (if not already enabled)
    - Add policy for authenticated users to create rooms
    - Add policy for room creators to manage their rooms
*/

-- Enable RLS if not already enabled
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to create chat rooms
CREATE POLICY "Users can create chat rooms"
ON chat_rooms
FOR INSERT
TO public
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to manage their own chat rooms
CREATE POLICY "Users can manage their own chat rooms"
ON chat_rooms
FOR ALL
TO public
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Allow users to view rooms they are members of (if not already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_rooms' 
    AND policyname = 'Users can view rooms they are members of'
  ) THEN
    CREATE POLICY "Users can view rooms they are members of"
    ON chat_rooms
    FOR SELECT
    TO public
    USING (
      EXISTS (
        SELECT 1 FROM chat_room_members 
        WHERE room_id = id 
        AND user_id = auth.uid()
      )
      OR created_by = auth.uid()
    );
  END IF;
END $$;
