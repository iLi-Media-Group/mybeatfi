/*
  # Fix chat messages RLS policies

  1. Changes
    - Add new RLS policy to allow authenticated users to insert messages in their rooms
    - Modify existing policies to ensure proper access control

  2. Security
    - Enable RLS on chat_messages table
    - Add policy for message insertion
    - Ensure users can only send messages to rooms they are members of
*/

-- First ensure RLS is enabled
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to clean up
DROP POLICY IF EXISTS "Users can send messages to their rooms" ON chat_messages;
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON chat_messages;

-- Create new policies with proper checks
CREATE POLICY "Users can send messages to their rooms"
ON chat_messages
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_room_members
    WHERE chat_room_members.room_id = chat_messages.room_id
    AND chat_room_members.user_id = auth.uid()
  )
  AND auth.uid() = sender_id
);

CREATE POLICY "Users can view messages in their rooms"
ON chat_messages
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM chat_room_members
    WHERE chat_room_members.room_id = chat_messages.room_id
    AND chat_room_members.user_id = auth.uid()
  )
);
