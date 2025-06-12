/*
  # Fix chat messages RLS policies

  1. Changes
    - Drop existing chat messages policies that might conflict
    - Create new comprehensive RLS policies for chat messages:
      - Allow users to insert messages in rooms they're members of
      - Allow users to view messages in rooms they're members of
      - Allow admins full access to all messages
  
  2. Security
    - Enable RLS on chat_messages table
    - Add policies for insert and select operations
    - Ensure users can only interact with messages in rooms they're members of
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can send messages to their rooms" ON chat_messages;
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON chat_messages;

-- Ensure RLS is enabled
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting messages
CREATE POLICY "Users can send messages to their rooms"
ON chat_messages
FOR INSERT
TO public
WITH CHECK (
  -- User must be a member of the room
  EXISTS (
    SELECT 1 FROM chat_room_members
    WHERE chat_room_members.room_id = chat_messages.room_id
    AND chat_room_members.user_id = auth.uid()
  )
  -- And must be the sender
  AND auth.uid() = sender_id
);

-- Create policy for viewing messages
CREATE POLICY "Users can view messages in their rooms"
ON chat_messages
FOR SELECT
TO public
USING (
  -- User must be a member of the room
  EXISTS (
    SELECT 1 FROM chat_room_members
    WHERE chat_room_members.room_id = chat_messages.room_id
    AND chat_room_members.user_id = auth.uid()
  )
);

-- Create admin policy for full access
CREATE POLICY "Admins have full access to messages"
ON chat_messages
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.email IN ('knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.email IN ('knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com')
  )
);
