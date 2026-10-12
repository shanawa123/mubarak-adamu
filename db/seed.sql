-- =========================================================================
-- ShinkafiRide.ng - PostgreSQL Seed Script
-- Realistic Shinkafi, Zamfara State Transport Ecosystem
-- =========================================================================

-- 1. Service Areas
INSERT INTO service_areas (id, name, state, center_lat, center_lng, radius_km, is_active, operating_hours)
VALUES 
('area-shinkafi-urban', 'Shinkafi Urban & Environs', 'Zamfara State', 13.0782, 6.5195, 25, TRUE, '05:30 - 22:00 WAT'),
('area-zamfara-corridor', 'Shinkafi - Gusau / Sokoto Transport Corridor', 'Zamfara / Sokoto', 12.6500, 6.0000, 120, TRUE, '06:00 - 19:00 WAT (Security Advisory Hours)')
ON CONFLICT (id) DO NOTHING;

-- 2. Fare Rules
INSERT INTO fare_rules (id, category, service_area, base_fare, per_km_rate, per_minute_rate, minimum_fare, cancellation_fee, commission_percentage, currency)
VALUES
('fare-keke', 'keke_tricycle', 'Shinkafi Urban', 200.00, 80.00, 10.00, 300.00, 150.00, 12.00, 'NGN'),
('fare-sedan', 'sedan', 'Shinkafi Urban', 500.00, 150.00, 20.00, 700.00, 300.00, 15.00, 'NGN'),
('fare-van', 'intercity_van', 'Zamfara Corridor', 1500.00, 180.00, 25.00, 2500.00, 1000.00, 15.00, 'NGN'),
('fare-cargo', 'cargo_pickup', 'Shinkafi Urban', 2000.00, 250.00, 30.00, 3500.00, 1500.00, 15.00, 'NGN')
ON CONFLICT (category) DO NOTHING;
