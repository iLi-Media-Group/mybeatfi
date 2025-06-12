/*
  # Playlist Management System

  1. New Tables
    - `playlists` - Stores playlist metadata
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `name` (text)
      - `description` (text, nullable)
      - `is_public` (boolean)
      - `cover_image_url` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `playlist_tracks` - Stores tracks in playlists with ordering
      - `id` (uuid, primary key)
      - `playlist_id` (uuid, foreign key to playlists)
      - `track_id` (uuid, foreign key to tracks)
      - `position` (integer)
      - `added_at` (timestamptz)
  
  2. Security
    - Enable RLS on both tables
    - Add policies for playlist ownership and public access
    - Add policies for playlist track management
*/

-- Create playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  name text NOT NULL,
  description text,
  is_public boolean NOT NULL DEFAULT false,
  cover_image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create playlist_tracks table
CREATE TABLE IF NOT EXISTS playlist_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  position integer NOT NULL,
  added_at timestamptz DEFAULT now(),
  UNIQUE(playlist_id, track_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_is_public ON playlists(is_public);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track_id ON playlist_tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_position ON playlist_tracks(playlist_id, position);

-- Enable Row Level Security
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;

-- Create policies for playlists
CREATE POLICY "Users can create their own playlists" 
  ON playlists FOR INSERT 
  TO public
  WITH CHECK (user_id = uid());

CREATE POLICY "Users can view their own playlists" 
  ON playlists FOR SELECT 
  TO public
  USING (user_id = uid());

CREATE POLICY "Users can view public playlists" 
  ON playlists FOR SELECT 
  TO public
  USING (is_public = true);

CREATE POLICY "Users can update their own playlists" 
  ON playlists FOR UPDATE 
  TO public
  USING (user_id = uid())
  WITH CHECK (user_id = uid());

CREATE POLICY "Users can delete their own playlists" 
  ON playlists FOR DELETE 
  TO public
  USING (user_id = uid());

-- Create policies for playlist_tracks
CREATE POLICY "Users can add tracks to their own playlists" 
  ON playlist_tracks FOR INSERT 
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_id 
      AND playlists.user_id = uid()
    )
  );

CREATE POLICY "Users can view tracks in their own playlists" 
  ON playlist_tracks FOR SELECT 
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_id 
      AND playlists.user_id = uid()
    )
  );

CREATE POLICY "Users can view tracks in public playlists" 
  ON playlist_tracks FOR SELECT 
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_id 
      AND playlists.is_public = true
    )
  );

CREATE POLICY "Users can update tracks in their own playlists" 
  ON playlist_tracks FOR UPDATE 
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_id 
      AND playlists.user_id = uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_id 
      AND playlists.user_id = uid()
    )
  );

CREATE POLICY "Users can delete tracks from their own playlists" 
  ON playlist_tracks FOR DELETE 
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE playlists.id = playlist_id 
      AND playlists.user_id = uid()
    )
  );

-- Create trigger function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_playlists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update the updated_at timestamp
CREATE TRIGGER update_playlists_updated_at
BEFORE UPDATE ON playlists
FOR EACH ROW
EXECUTE FUNCTION update_playlists_updated_at();

-- Create function to reorder tracks when a track is deleted
CREATE OR REPLACE FUNCTION reorder_playlist_tracks()
RETURNS TRIGGER AS $$
BEGIN
  -- Update positions of tracks with higher position than the deleted track
  UPDATE playlist_tracks
  SET position = position - 1
  WHERE playlist_id = OLD.playlist_id
  AND position > OLD.position;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to reorder tracks when a track is deleted
CREATE TRIGGER reorder_playlist_tracks_after_delete
AFTER DELETE ON playlist_tracks
FOR EACH ROW
EXECUTE FUNCTION reorder_playlist_tracks();
