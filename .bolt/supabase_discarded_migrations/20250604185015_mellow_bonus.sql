/*
  # Add User Playlists

  1. New Tables
    - `playlists`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `name` (text)
      - `description` (text, nullable)
      - `is_public` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `playlist_tracks`
      - `playlist_id` (uuid, foreign key to playlists)
      - `track_id` (uuid, foreign key to tracks)
      - `added_at` (timestamptz)
      - `position` (integer)
  
  2. Security
    - Enable RLS on both tables
    - Add policies for user access control
    - Allow public access to public playlists
*/

-- Create playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  name text NOT NULL,
  description text,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create playlist_tracks table
CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id uuid NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  position integer NOT NULL,
  PRIMARY KEY (playlist_id, track_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_is_public ON playlists(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track_id ON playlist_tracks(track_id);

-- Enable Row Level Security
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for playlists
CREATE POLICY "Users can manage their own playlists"
  ON playlists
  FOR ALL
  TO public
  USING (user_id = uid());

CREATE POLICY "Public playlists are viewable by everyone"
  ON playlists
  FOR SELECT
  TO public
  USING (is_public = true);

-- Create RLS policies for playlist_tracks
CREATE POLICY "Users can manage tracks in their own playlists"
  ON playlist_tracks
  FOR ALL
  TO public
  USING (
    playlist_id IN (
      SELECT id FROM playlists WHERE user_id = uid()
    )
  );

CREATE POLICY "Tracks in public playlists are viewable by everyone"
  ON playlist_tracks
  FOR SELECT
  TO public
  USING (
    playlist_id IN (
      SELECT id FROM playlists WHERE is_public = true
    )
  );

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_playlists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_playlists_updated_at
BEFORE UPDATE ON playlists
FOR EACH ROW
EXECUTE FUNCTION update_playlists_updated_at();
