/*
  # Add Boombox.io URL fields to tracks table

  1. Changes
    - Add mp3_url column for MP3 Only Link
    - Add trackouts_url column for Full Trackouts
*/

-- Add new columns to tracks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tracks' AND column_name = 'mp3_url'
  ) THEN
    ALTER TABLE tracks ADD COLUMN mp3_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tracks' AND column_name = 'trackouts_url'
  ) THEN
    ALTER TABLE tracks ADD COLUMN trackouts_url text;
  END IF;
END $$;
