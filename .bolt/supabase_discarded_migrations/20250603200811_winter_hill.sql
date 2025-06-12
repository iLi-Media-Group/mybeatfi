/*
  # Add producer_id to sales table

  1. Changes
    - Add producer_id column to sales table
    - Add foreign key constraint to profiles table
    - Add index for performance
    - Update RLS policies to include producer access

  2. Security
    - Producers can view their own sales
    - Maintain existing RLS policies
*/

-- Add producer_id column
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS producer_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_sales_producer_id ON sales(producer_id);

-- Update RLS policies to include producer access
CREATE POLICY "Producers can view their own sales"
ON sales
FOR SELECT
TO public
USING (producer_id = auth.uid());
