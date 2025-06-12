-- Create storage bucket for license agreements
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'license-agreements',
  'license-agreements',
  true,
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET 
  public = EXCLUDED.public,
  avif_autodetection = EXCLUDED.avif_autodetection,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create table for storing license agreements
CREATE TABLE IF NOT EXISTS public.license_agreements (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  license_id uuid REFERENCES public.sales(id),
  pdf_url text NOT NULL,
  licensee_info jsonb NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on license_agreements table
ALTER TABLE public.license_agreements ENABLE ROW LEVEL SECURITY;

-- Create policies for license_agreements
CREATE POLICY "Users can view their own license agreements"
  ON public.license_agreements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sales
      WHERE sales.id = license_agreements.license_id
      AND (sales.buyer_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.tracks
        WHERE tracks.id = sales.track_id
        AND tracks.producer_id = auth.uid()
      ))
    )
  );
