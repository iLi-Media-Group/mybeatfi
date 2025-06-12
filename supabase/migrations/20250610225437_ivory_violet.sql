/*
  # Add IPI Number and PRO fields to profiles

  1. New Columns
    - Add ipi_number column to profiles table
    - Add performing_rights_org column to profiles table
    
  2. Notes
    - These fields are required for music producers to identify their rights organization
    - Will be used for royalty tracking and payments
*/

-- Create trigger to handle sync proposal payments
DROP TRIGGER IF EXISTS handle_sync_proposal_payment_trigger ON stripe_orders;
CREATE TRIGGER handle_sync_proposal_payment_trigger
AFTER INSERT OR UPDATE ON stripe_orders
FOR EACH ROW
EXECUTE FUNCTION handle_sync_proposal_payment();

-- Add IPI number and PRO fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS ipi_number text;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS performing_rights_org text;
