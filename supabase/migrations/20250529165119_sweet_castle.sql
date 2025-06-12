/*
  # Add soft delete support to tracks table

  1. Changes
    - Add `deleted_at` column to `tracks` table for soft deletion
    - Add index on `deleted_at` for efficient filtering
    - Add trigger to update `updated_at` when `deleted_at` changes

  2. Notes
    - Column is nullable (null = active track, timestamp = deleted track)
    - Index helps optimize queries filtering by deleted status
*/

-- Add deleted_at column
ALTER TABLE tracks 
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Add index for efficient filtering of deleted/active tracks
CREATE INDEX IF NOT EXISTS idx_tracks_deleted_at 
ON tracks(deleted_at);

-- Ensure updated_at is set when deleted_at changes
CREATE OR REPLACE FUNCTION update_tracks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tracks_deleted_at ON tracks;
CREATE TRIGGER update_tracks_deleted_at
  BEFORE UPDATE OF deleted_at
  ON tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_tracks_updated_at();
