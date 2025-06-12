/*
  # Add membership plan to profiles

  1. Changes
    - Add membership_plan column to profiles table
    - Set default plan for existing profiles
    - Add check constraint for valid plan types

  2. Security
    - No changes to RLS policies needed
*/

-- Add membership_plan column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS membership_plan text 
DEFAULT 'Single Track'
CHECK (
  membership_plan IN (
    'Single Track',
    'Gold Access',
    'Platinum Access',
    'Ultimate Access'
  )
);

-- Update existing profiles to have default plan
UPDATE profiles 
SET membership_plan = 'Single Track' 
WHERE membership_plan IS NULL;
