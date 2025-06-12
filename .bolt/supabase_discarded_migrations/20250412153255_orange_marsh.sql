/*
  # Add test proposals and vocal tracks

  1. Changes
    - Update tracks to have vocals
    - Add test sync proposals
    - Add negotiation messages
    - Add reference files
    - Refresh analytics view
*/

-- First ensure we have tracks with vocals
UPDATE tracks
SET 
  has_vocals = true,
  vocals_usage_type = 'sync_only'
WHERE id IN (
  SELECT id FROM tracks 
  ORDER BY created_at DESC 
  LIMIT 1
);

UPDATE tracks
SET 
  has_vocals = true,
  vocals_usage_type = 'normal'
WHERE id IN (
  SELECT id FROM tracks 
  WHERE id NOT IN (
    SELECT id FROM tracks 
    ORDER BY created_at DESC 
    LIMIT 1
  )
  ORDER BY created_at DESC 
  LIMIT 1
);

-- Get client ID for test proposals
DO $$
DECLARE
  test_client_id uuid;
  first_proposal_id uuid;
  second_proposal_id uuid;
  vocal_track_producer_id uuid;
BEGIN
  -- Get test client
  SELECT id INTO test_client_id FROM profiles WHERE email = 'client@mybeatfi.com' LIMIT 1;

  -- Generate new UUIDs for proposals
  first_proposal_id := gen_random_uuid();
  second_proposal_id := gen_random_uuid();

  -- Get producer ID from first vocal track
  SELECT t.producer_id INTO vocal_track_producer_id
  FROM tracks t
  WHERE t.has_vocals = true 
    AND t.vocals_usage_type = 'sync_only'
  LIMIT 1;

  -- Insert first proposal (urgent, exclusive)
  INSERT INTO sync_proposals (
    id,
    track_id,
    client_id,
    project_type,
    duration,
    is_exclusive,
    sync_fee,
    payment_terms,
    expiration_date,
    is_urgent,
    status,
    negotiation_status,
    created_at
  ) 
  SELECT 
    first_proposal_id,
    id,
    test_client_id,
    'TV Commercial - National Campaign',
    '1 year',
    true,
    5000.00,
    'net30',
    NOW() + INTERVAL '7 days',
    true,
    'pending',
    'negotiating',
    NOW() - INTERVAL '2 days'
  FROM tracks 
  WHERE has_vocals = true 
    AND vocals_usage_type = 'sync_only'
  LIMIT 1;

  -- Insert second proposal (regular)
  INSERT INTO sync_proposals (
    id,
    track_id,
    client_id,
    project_type,
    duration,
    is_exclusive,
    sync_fee,
    payment_terms,
    expiration_date,
    is_urgent,
    status,
    negotiation_status,
    created_at
  )
  SELECT 
    second_proposal_id,
    id,
    test_client_id,
    'YouTube Series - 12 Episodes',
    '2 years',
    false,
    2500.00,
    'immediate',
    NOW() + INTERVAL '14 days',
    false,
    'pending',
    'pending',
    NOW() - INTERVAL '1 day'
  FROM tracks 
  WHERE has_vocals = true 
    AND vocals_usage_type = 'normal'
  LIMIT 1;

  -- Add negotiation messages for first proposal
  INSERT INTO proposal_negotiations (
    proposal_id,
    sender_id,
    message,
    counter_offer,
    counter_terms,
    created_at
  ) VALUES (
    first_proposal_id,
    test_client_id,
    'We''re interested in using this track for our national TV campaign. The campaign will run for 1 year across all major networks.',
    5000.00,
    'net30',
    NOW() - INTERVAL '2 days'
  );

  -- Add producer's counter-offer
  INSERT INTO proposal_negotiations (
    proposal_id,
    sender_id,
    message,
    counter_offer,
    counter_terms,
    created_at
  ) VALUES (
    first_proposal_id,
    vocal_track_producer_id,
    'Thank you for your interest. Given the national scope and exclusivity, our standard rate for this type of usage is $7,500.',
    7500.00,
    'net30',
    NOW() - INTERVAL '1 day'
  );

  -- Add a reference file
  INSERT INTO proposal_files (
    proposal_id,
    uploader_id,
    file_name,
    file_url,
    file_type,
    file_size,
    created_at
  ) VALUES (
    first_proposal_id,
    test_client_id,
    'campaign_brief.pdf',
    'https://example.com/files/campaign_brief.pdf',
    'application/pdf',
    1024576,
    NOW() - INTERVAL '2 days'
  );
END $$;

-- Refresh materialized view to include new proposals
REFRESH MATERIALIZED VIEW proposal_analytics;
