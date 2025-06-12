-- Convert genres and moods arrays to comma-separated strings
ALTER TABLE tracks 
  ALTER COLUMN genres TYPE text USING array_to_string(genres, ','),
  ALTER COLUMN moods TYPE text USING array_to_string(moods, ','),
  ALTER COLUMN sub_genres TYPE text USING array_to_string(sub_genres, ',');

-- Update existing records to ensure consistent format
UPDATE tracks 
SET 
  genres = LOWER(genres),
  moods = LOWER(moods),
  sub_genres = LOWER(sub_genres);

-- Add check constraints for valid formats
ALTER TABLE tracks
  ADD CONSTRAINT valid_genres CHECK (genres ~ '^[a-z][a-z0-9\s,]*$'),
  ADD CONSTRAINT valid_moods CHECK (moods ~ '^[a-z][a-z0-9\s,]*$' OR moods IS NULL),
  ADD CONSTRAINT valid_sub_genres CHECK (sub_genres ~ '^[a-z][a-z0-9\s,]*$' OR sub_genres IS NULL);

-- Create indexes for text search
CREATE INDEX idx_tracks_genres ON tracks USING gin (to_tsvector('english', genres));
CREATE INDEX idx_tracks_moods ON tracks USING gin (to_tsvector('english', moods));
