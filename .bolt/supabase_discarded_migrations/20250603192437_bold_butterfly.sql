-- Create site_settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for site_settings
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'site_settings' 
    AND policyname = 'Allow public read access to site_settings'
  ) THEN
    DROP POLICY "Allow public read access to site_settings" ON public.site_settings;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'site_settings' 
    AND policyname = 'Allow admin to manage site_settings'
  ) THEN
    DROP POLICY "Allow admin to manage site_settings" ON public.site_settings;
  END IF;
END $$;

-- Add policies for site_settings
CREATE POLICY "Allow public read access to site_settings"
  ON public.site_settings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow admin to manage site_settings"
  ON public.site_settings
  FOR ALL
  TO authenticated
  USING (email() IN ('knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com'));

-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text NOT NULL,
  link_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'clients' 
    AND policyname = 'Allow public read access to clients'
  ) THEN
    DROP POLICY "Allow public read access to clients" ON public.clients;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'clients' 
    AND policyname = 'Allow admin to manage clients'
  ) THEN
    DROP POLICY "Allow admin to manage clients" ON public.clients;
  END IF;
END $$;

-- Add policies for clients
CREATE POLICY "Allow public read access to clients"
  ON public.clients
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow admin to manage clients"
  ON public.clients
  FOR ALL
  TO authenticated
  USING (email() IN ('knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com'));
