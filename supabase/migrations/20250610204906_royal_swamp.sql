/*
  # Add IPI Number and PRO fields to profiles

  1. New Columns
    - Add ipi_number column to profiles table
    - Add performing_rights_org column to profiles table
    
  2. Notes
    - These fields are required for music producers to identify their rights organization
    - Will be used for royalty tracking and payments
*/

-- Add IPI number and PRO fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS ipi_number text;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS performing_rights_org text;
