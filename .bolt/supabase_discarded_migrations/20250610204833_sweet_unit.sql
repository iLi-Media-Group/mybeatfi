@@ .. @@
 CREATE TRIGGER handle_sync_proposal_payment_trigger
 AFTER INSERT OR UPDATE ON stripe_orders
 FOR EACH ROW
-EXECUTE FUNCTION handle_sync_proposal_payment();
+EXECUTE FUNCTION handle_sync_proposal_payment();
+
+-- Add IPI number and PRO fields to profiles table
+ALTER TABLE profiles 
+ADD COLUMN IF NOT EXISTS ipi_number text;
+
+ALTER TABLE profiles 
+ADD COLUMN IF NOT EXISTS performing_rights_org text;
