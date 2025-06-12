/*
  # Fix Producer IDs and Analytics

  1. Changes
    - Ensure each producer has a unique producer_number
    - Fix producer analytics in admin dashboard
    - Update sales_analytics view to properly group by producer

  2. Security
    - No changes to security policies
*/

-- First, let's ensure all producers have a unique producer_number
DO $$
DECLARE
  producer_record RECORD;
  next_number INTEGER := 1;
  new_producer_number TEXT;
BEGIN
  -- Find producers with duplicate or missing producer_numbers
  FOR producer_record IN 
    SELECT id, email, producer_number 
    FROM profiles 
    WHERE account_type = 'producer'
    ORDER BY created_at ASC
  LOOP
    -- If producer_number is null or doesn't match the pattern, assign a new one
    IF producer_record.producer_number IS NULL OR producer_record.producer_number !~ '^mbfpr-\d{3}$' THEN
      -- Find the next available number
      WHILE EXISTS (
        SELECT 1 FROM profiles 
        WHERE producer_number = 'mbfpr-' || LPAD(next_number::text, 3, '0')
      ) LOOP
        next_number := next_number + 1;
      END LOOP;
      
      -- Assign the new producer number
      new_producer_number := 'mbfpr-' || LPAD(next_number::text, 3, '0');
      
      UPDATE profiles 
      SET producer_number = new_producer_number
      WHERE id = producer_record.id;
      
      next_number := next_number + 1;
    END IF;
  END LOOP;
END $$;

-- Now, let's fix the sales_analytics materialized view to properly group by producer
DROP MATERIALIZED VIEW IF EXISTS sales_analytics;

CREATE MATERIALIZED VIEW sales_analytics AS
WITH monthly_data AS (
  SELECT
    date_trunc('month', s.created_at) AS month,
    COUNT(s.id) AS monthly_sales_count,
    SUM(s.amount) AS monthly_revenue,
    COUNT(DISTINCT s.buyer_id) AS unique_buyers,
    COUNT(DISTINCT t.producer_id) AS active_producers
  FROM
    sales s
    JOIN tracks t ON s.track_id = t.id
  WHERE
    s.deleted_at IS NULL
  GROUP BY
    date_trunc('month', s.created_at)
),
producer_data AS (
  SELECT
    p.id AS producer_id,
    p.email AS producer_email,
    p.first_name,
    p.last_name,
    COUNT(s.id) AS producer_sales_count,
    SUM(s.amount) AS producer_revenue,
    COUNT(DISTINCT t.id) AS track_count,
    MIN(t.created_at) AS first_track_date,
    MAX(t.created_at) AS last_track_date,
    COUNT(DISTINCT s.buyer_id) AS customer_count
  FROM
    profiles p
    LEFT JOIN tracks t ON p.id = t.producer_id AND t.deleted_at IS NULL
    LEFT JOIN sales s ON t.id = s.track_id AND s.deleted_at IS NULL
  WHERE
    p.account_type = 'producer'
  GROUP BY
    p.id, p.email, p.first_name, p.last_name
)
SELECT
  md.month,
  md.monthly_sales_count,
  md.monthly_revenue,
  md.unique_buyers,
  md.active_producers,
  pd.producer_id,
  pd.producer_email,
  pd.first_name,
  pd.last_name,
  pd.producer_sales_count,
  pd.producer_revenue,
  pd.track_count,
  pd.first_track_date,
  pd.last_track_date,
  pd.customer_count
FROM
  monthly_data md
  CROSS JOIN producer_data pd;

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW sales_analytics;

-- Create a function to refresh the sales analytics view
CREATE OR REPLACE FUNCTION refresh_sales_analytics()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW sales_analytics;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to refresh the view when sales or tracks change
DROP TRIGGER IF EXISTS refresh_sales_analytics_on_sale ON sales;
CREATE TRIGGER refresh_sales_analytics_on_sale
AFTER INSERT OR UPDATE OR DELETE ON sales
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_sales_analytics();

DROP TRIGGER IF EXISTS refresh_sales_analytics_on_track ON tracks;
CREATE TRIGGER refresh_sales_analytics_on_track
AFTER INSERT OR UPDATE OR DELETE ON tracks
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_sales_analytics();
