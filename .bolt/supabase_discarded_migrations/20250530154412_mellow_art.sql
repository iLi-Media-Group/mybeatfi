-- Add new columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_path TEXT,
ADD COLUMN IF NOT EXISTS show_location BOOLEAN DEFAULT false;

-- Add constraint for bio length
ALTER TABLE profiles 
ADD CONSTRAINT bio_length_check CHECK (char_length(bio) <= 800);

-- Add constraint for avatar path format
ALTER TABLE profiles 
ADD CONSTRAINT avatar_path_format CHECK (avatar_path ~ '^profile-photos/.*\.(jpg|jpeg|png)$' OR avatar_path IS NULL);
