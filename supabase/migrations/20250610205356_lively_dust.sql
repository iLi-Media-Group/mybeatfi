/*
  # Add IPI Number and PRO fields to profiles table

  1. New Columns
    - Add ipi_number column to profiles table
    - Add performing_rights_org column to profiles table
    
  2. Purpose
    - Store International Performer Identifier for producers
    - Store Performing Rights Organization information
*/

-- Add IPI number and PRO fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS ipi_number text;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS performing_rights_org text;
