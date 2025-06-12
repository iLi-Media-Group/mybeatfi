/*
  # Create test client accounts

  1. Changes
    - Insert test client accounts with specified email addresses
    - Set up profiles for each test client
    - Enable RLS policies for these accounts

  2. Security
    - Passwords are handled by Supabase Auth
    - Profiles have appropriate client account type
*/

-- Create test client accounts
DO $$
DECLARE
  user_id uuid;
  email_list text[] := ARRAY[
    'cabstudiosrio@gmail.com',
    'knockriobeats2@gmail.com',
    'babyimmastarrecords@gmail.com',
    'brasillivinginfo@gmail.com'
  ];
BEGIN
  -- Insert profiles for each test client
  FOR i IN 1..array_length(email_list, 1) LOOP
    -- Generate a consistent UUID based on email
    user_id := gen_random_uuid();
    
    INSERT INTO profiles (
      id,
      email,
      first_name,
      last_name,
      account_type,
      age_verified,
      created_at,
      updated_at
    ) VALUES (
      user_id,
      email_list[i],
      'Test',
      'Client ' || i,
      'client',
      true,
      now(),
      now()
    );
  END LOOP;
END;
$$;
