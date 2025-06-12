/*
  # Add test accounts

  1. New Data
    - Creates admin (producer) and client test accounts
    - Sets up profile data for both accounts
  
  2. Security
    - Uses secure password hashing
    - Sets proper user metadata
    - Checks for existing accounts before inserting
*/

-- Function to safely create test accounts
DO $$ 
DECLARE
  admin_user_id uuid;
  client_user_id uuid;
BEGIN
  -- Check and create admin account
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@mybeatfi.com') THEN
    INSERT INTO auth.users (
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      'admin@mybeatfi.com',
      crypt('admin', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"],"isProducer":true}',
      '{"name":"Admin Producer"}',
      now(),
      now(),
      'authenticated'
    ) RETURNING id INTO admin_user_id;

    -- Create admin profile
    INSERT INTO profiles (id, email, full_name, is_producer)
    VALUES (admin_user_id, 'admin@mybeatfi.com', 'Admin Producer', true);
  END IF;

  -- Check and create client account
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'client@mybeatfi.com') THEN
    INSERT INTO auth.users (
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      'client@mybeatfi.com',
      crypt('client', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"],"isProducer":false}',
      '{"name":"Test Client"}',
      now(),
      now(),
      'authenticated'
    ) RETURNING id INTO client_user_id;

    -- Create client profile
    INSERT INTO profiles (id, email, full_name, is_producer)
    VALUES (client_user_id, 'client@mybeatfi.com', 'Test Client', false);
  END IF;
END $$;
