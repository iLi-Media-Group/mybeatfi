/*
  # Update sales analytics materialized view

  1. Changes
    - Drop existing materialized view if it exists
    - Recreate sales analytics materialized view with updated schema
    - Create refresh function and triggers
    - Add appropriate indexes for performance

  2. Purpose
    - Provides aggregated sales data for analytics
    - Tracks monthly sales metrics and producer performance
    - Enables efficient querying of sales trends
*/

-- Drop existing view and related objects
DROP MATERIALIZED VIEW IF EXISTS sales_analytics;
DROP TRIGGER IF EXISTS refresh_sales_analytics_on_sale ON sales;
DROP TRIGGER IF EXISTS refresh_sales_analytics_on_track ON tracks;
DROP FUNCTION IF EXISTS refresh_sales_analytics();

-- Create materialized view for sales analytics
CREATE MATERIALIZED VIEW sales_analytics AS
WITH monthly_sales AS (
  SELECT
    date_trunc('month', s.created_at) as month,
    COUNT(*) as total_sales,
    SUM(s.amount) as total_revenue,
    COUNT(DISTINCT s.buyer_id) as unique_buyers,
    COUNT(DISTINCT t.producer_id) as active_producers
  FROM sales s
  JOIN tracks t ON s.track_id = t.id
  GROUP BY date_trunc('month', s.created_at)
),
producer_stats AS (
  SELECT
    t.producer_id,
    p.email as producer_email,
    p.first_name,
    p.last_name,
    COUNT(DISTINCT s.id) as total_sales,
    SUM(s.amount) as total_revenue,
    COUNT(DISTINCT t.id) as total_tracks,
    MIN(t.created_at) as first_track_date,
    MAX(t.created_at) as last_track_date,
    COUNT(DISTINCT s.buyer_id) as unique_customers
  FROM tracks t
  LEFT JOIN sales s ON t.id = s.track_id
  JOIN profiles p ON t.producer_id = p.id
  GROUP BY t.producer_id, p.email, p.first_name, p.last_name
)
SELECT
  ms.*,
  ps.*
FROM monthly_sales ms
CROSS JOIN producer_stats ps;

-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_sales_analytics()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY sales_analytics;
  RETURN NULL;
END;
$$;

-- Create triggers to refresh the materialized view
CREATE TRIGGER refresh_sales_analytics_on_sale
  AFTER INSERT OR UPDATE OR DELETE ON sales
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_sales_analytics();

CREATE TRIGGER refresh_sales_analytics_on_track
  AFTER INSERT OR UPDATE OR DELETE ON tracks
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_sales_analytics();

-- Create indexes
CREATE UNIQUE INDEX ON sales_analytics (month, producer_id);
CREATE INDEX ON sales_analytics (producer_email);
CREATE INDEX ON sales_analytics (total_revenue DESC);
CREATE INDEX ON sales_analytics (total_sales DESC);
