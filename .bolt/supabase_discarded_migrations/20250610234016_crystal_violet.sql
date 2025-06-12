/*
  # Add IPI number and PRO fields to profiles
  
  1. Changes
     - Adds IPI number field to profiles table
     - Adds performing rights organization field to profiles table
*/

-- Add IPI number and PRO fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS ipi_number text;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS performing_rights_org text;

-- Ensure trigger exists (this was in the original migration)
CREATE TRIGGER IF NOT EXISTS handle_sync_proposal_payment_trigger
AFTER INSERT OR UPDATE ON stripe_orders
FOR EACH ROW
EXECUTE FUNCTION handle_sync_proposal_payment();
