/*
  # Add INSERT policy for sales table

  1. Changes
    - Add new RLS policy to allow authenticated users to create sales records
    - Policy ensures users can only create sales records where they are the buyer

  2. Security
    - Enables authenticated users to create their own sales records
    - Maintains data integrity by linking sales to authenticated users
    - Preserves existing SELECT policies
*/

CREATE POLICY "Users can create their own sales records"
ON sales
FOR INSERT
TO public
WITH CHECK (auth.uid() = buyer_id);
