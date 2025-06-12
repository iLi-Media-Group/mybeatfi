/*
# Fix knockriobeats2@gmail.com account

1. Changes
   - Ensures the user with email knockriobeats2@gmail.com has a proper profile entry
   - Sets the account_type to 'client'
   - Sets the membership_plan to 'Single Track'
   - Adds admin access to this email in all relevant policies
*/

-- First, check if the user exists in auth.users but not in profiles
DO $$
DECLARE
    user_id uuid;
BEGIN
    -- Get the user ID from auth.users
    SELECT id INTO user_id FROM auth.users WHERE email = 'knockriobeats2@gmail.com';
    
    -- If user exists in auth but not in profiles, create a profile
    IF user_id IS NOT NULL THEN
        INSERT INTO profiles (id, email, account_type, membership_plan, created_at, updated_at)
        SELECT 
            user_id, 
            'knockriobeats2@gmail.com', 
            'client', 
            'Single Track',
            now(),
            now()
        WHERE NOT EXISTS (
            SELECT 1 FROM profiles WHERE id = user_id
        );
    END IF;
END $$;

-- If the user already exists in profiles, ensure account_type is set correctly
UPDATE profiles
SET 
    account_type = 'client',
    membership_plan = 'Single Track',
    updated_at = now()
WHERE 
    email = 'knockriobeats2@gmail.com' 
    AND (account_type IS NULL OR account_type != 'client');

-- Add knockriobeats2@gmail.com to all admin policies
DO $$
DECLARE
    policy_record record;
    new_check text;
    new_qual text;
BEGIN
    -- Find all policies that reference the admin emails
    FOR policy_record IN 
        SELECT 
            schemaname, 
            tablename, 
            policyname, 
            permissive,
            cmd,
            qual,
            with_check
        FROM 
            pg_policies
        WHERE 
            qual LIKE '%knockriobeats@gmail.com%' OR 
            qual LIKE '%info@mybeatfi.io%' OR 
            qual LIKE '%derykbanks@yahoo.com%' OR
            with_check LIKE '%knockriobeats@gmail.com%' OR 
            with_check LIKE '%info@mybeatfi.io%' OR 
            with_check LIKE '%derykbanks@yahoo.com%'
    LOOP
        -- Update the qual condition if it exists
        IF policy_record.qual IS NOT NULL AND policy_record.qual LIKE '%ARRAY[%' THEN
            -- Check if knockriobeats2@gmail.com is already in the array
            IF policy_record.qual NOT LIKE '%knockriobeats2@gmail.com%' THEN
                -- Add knockriobeats2@gmail.com to the array
                new_qual := regexp_replace(
                    policy_record.qual, 
                    'ARRAY\[(.*?)\]', 
                    'ARRAY[\1, ''knockriobeats2@gmail.com'']', 
                    'g'
                );
                
                -- Update the policy qual
                EXECUTE format(
                    'ALTER POLICY %I ON %I.%I USING (%s)',
                    policy_record.policyname,
                    policy_record.schemaname,
                    policy_record.tablename,
                    new_qual
                );
            END IF;
        END IF;
        
        -- Update the with_check condition if it exists
        IF policy_record.with_check IS NOT NULL AND policy_record.with_check LIKE '%ARRAY[%' THEN
            -- Check if knockriobeats2@gmail.com is already in the array
            IF policy_record.with_check NOT LIKE '%knockriobeats2@gmail.com%' THEN
                -- Add knockriobeats2@gmail.com to the array
                new_check := regexp_replace(
                    policy_record.with_check, 
                    'ARRAY\[(.*?)\]', 
                    'ARRAY[\1, ''knockriobeats2@gmail.com'']', 
                    'g'
                );
                
                -- Update the policy with_check
                EXECUTE format(
                    'ALTER POLICY %I ON %I.%I WITH CHECK (%s)',
                    policy_record.policyname,
                    policy_record.schemaname,
                    policy_record.tablename,
                    new_check
                );
            END IF;
        END IF;
    END LOOP;
END $$;
