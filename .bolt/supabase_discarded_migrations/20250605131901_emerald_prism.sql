/*
  # Add Playlist Functionality

  1. New Tables
    - `playlists` - Stores playlist metadata
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `name` (text)
      - `description` (text, nullable)
      - `is_public` (boolean)
      - `cover_image_url` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `playlist_tracks` - Stores tracks in playlists
      - `id` (uuid, primary key)
      - `playlist_id` (uuid, references playlists)
      - `track_id` (uuid, references tracks)
      - `position` (integer)
      - `added_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for playlist management
    - Add policies for playlist track management
*/

-- Create playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_public boolean DEFAULT false,
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

-- Playlist policies
-- Owners can manage their playlists
CREATE POLICY "Users can manage their own playlists"
  ON playlists
  FOR ALL
  TO public
  USING (user_id = uid());

-- Public playlists are viewable by everyone
CREATE POLICY "Public playlists are viewable by everyone"
  ON playlists
  FOR SELECT
  TO public
  USING (is_public = true);

-- Playlist tracks policies
-- Owners can manage tracks in their playlists
CREATE POLICY "Users can manage tracks in their playlists"
  ON playlist_tracks
  FOR ALL
  TO public
  USING (
    playlist_id IN (
      SELECT id FROM playlists WHERE user_id = uid()
    )
  );

-- Anyone can view tracks in public playlists
CREATE POLICY "Anyone can view tracks in public playlists"
  ON playlist_tracks
  FOR SELECT
  TO public
  USING (
    playlist_id IN (
      SELECT id FROM playlists WHERE is_public = true
    )
  );

-- Create storage bucket for playlist covers if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'playlist-covers'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('playlist-covers', 'playlist-covers', true);
  END IF;
END $$;

-- Create trigger function to update the updated_at column
CREATE OR REPLACE FUNCTION update_playlists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update the updated_at column
CREATE TRIGGER update_playlists_updated_at
BEFORE UPDATE ON playlists
FOR EACH ROW
EXECUTE FUNCTION update_playlists_updated_at();
