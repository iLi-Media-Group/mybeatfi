/*
  # Sales Analytics System

  1. Creates materialized view for comprehensive sales analytics
  2. Adds refresh function and triggers
  3. Creates necessary indexes for performance

  This migration provides:
  - Monthly sales aggregation
  - Producer performance metrics
  - Revenue tracking
  - Customer analytics
*/

-- Create materialized view for sales analytics
CREATE MATERIALIZED VIEW sales_analytics AS
WITH monthly_metrics AS (
  SELECT
    date_trunc('month', s.created_at) as month,
    COUNT(*) as monthly_sales_count,
    SUM(s.amount) as monthly_revenue,
    COUNT(DISTINCT s.buyer_id) as unique_buyers,
    COUNT(DISTINCT t.producer_id) as active_producers
  FROM sales s
  JOIN tracks t ON s.track_id = t.id
  GROUP BY date_trunc('month', s.created_at)
),
producer_metrics AS (
  SELECT
    t.producer_id,
    p.email as producer_email,
    p.first_name,
    p.last_name,
    COUNT(DISTINCT s.id) as producer_sales_count,
    SUM(s.amount) as producer_revenue,
    COUNT(DISTINCT t.id) as track_count,
    MIN(t.created_at) as first_track_date,
    MAX(t.created_at) as last_track_date,
    COUNT(DISTINCT s.buyer_id) as customer_count
  FROM tracks t
  LEFT JOIN sales s ON t.id = s.track_id
  JOIN profiles p ON t.producer_id = p.id
  GROUP BY t.producer_id, p.email, p.first_name, p.last_name
)
SELECT
  mm.month,
  mm.monthly_sales_count,
  mm.monthly_revenue,
  mm.unique_buyers,
  mm.active_producers,
  pm.producer_id,
  pm.producer_email,
  pm.first_name,
  pm.last_name,
  pm.producer_sales_count,
  pm.producer_revenue,
  pm.track_count,
  pm.first_track_date,
  pm.last_track_date,
  pm.customer_count
FROM monthly_metrics mm
CROSS JOIN producer_metrics pm;

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

-- Create indexes for better query performance
CREATE UNIQUE INDEX idx_sales_analytics_month_producer 
  ON sales_analytics (month, producer_id);
CREATE INDEX idx_sales_analytics_producer_email 
  ON sales_analytics (producer_email);
CREATE INDEX idx_sales_analytics_revenue 
  ON sales_analytics (monthly_revenue DESC);
CREATE INDEX idx_sales_analytics_sales 
  ON sales_analytics (monthly_sales_count DESC);
