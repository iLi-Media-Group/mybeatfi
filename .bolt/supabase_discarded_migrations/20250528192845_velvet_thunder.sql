/*
  # Add licensee info to sales table

  1. Changes
    - Add `licensee_info` column to `sales` table to store licensee details
      - Type: JSONB to store structured data (name, email)
      - Nullable: true (for backward compatibility with existing records)

  2. Purpose
    - Store licensee information for each sale
    - Support tracking who the license is issued to
*/

ALTER TABLE sales
ADD COLUMN IF NOT EXISTS licensee_info JSONB;

-- Add a check constraint to ensure licensee_info has the required fields when present
ALTER TABLE sales
ADD CONSTRAINT valid_licensee_info
CHECK (
  licensee_info IS NULL OR (
    (licensee_info->>'name') IS NOT NULL AND
    (licensee_info->>'email') IS NOT NULL
  )
);
