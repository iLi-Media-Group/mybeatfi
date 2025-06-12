/*
  # Add Membership Plan Column Migration
  
  1. Changes
    - Adds membership_plan column to profiles table
    - Sets default value to 'Single Track'
    - Adds check constraint for valid plan types
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
