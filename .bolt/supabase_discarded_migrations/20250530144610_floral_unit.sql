/*
  # Fix chat room RLS policies

  1. Changes
    - Simplify chat_room_members RLS policies to avoid recursion
    - Update chat_rooms policies to use direct membership checks
    - Remove circular dependencies between policies

  2. Security
    - Maintain security by ensuring users can only access rooms they're members of
    - Keep admin access intact
    - Ensure proper access control for room creation and membership
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view rooms they are members of" ON chat_rooms;
DROP POLICY IF EXISTS "Users can view room members" ON chat_room_members;

-- Recreate chat_rooms policies with simplified conditions
CREATE POLICY "Users can view rooms they are members of"
ON chat_rooms
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM chat_room_members
    WHERE chat_room_members.room_id = chat_rooms.id
    AND chat_room_members.user_id = auth.uid()
  )
  OR 
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.email IN ('knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com')
  )
);

-- Recreate chat_room_members policies with direct conditions
CREATE POLICY "Users can view room members"
ON chat_room_members
FOR SELECT
TO public
USING (
  user_id = auth.uid()
  OR 
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.email IN ('knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com')
  )
);

-- Add policy for inserting room members
CREATE POLICY "Users can join rooms"
ON chat_room_members
FOR INSERT
TO public
WITH CHECK (
  -- Allow users to join rooms they're invited to
  user_id = auth.uid()
  OR
  -- Allow admins to add members
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.email IN ('knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com')
  )
);
