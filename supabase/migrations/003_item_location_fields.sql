ALTER TABLE items
ADD COLUMN location TEXT,
ADD COLUMN gps_lat DECIMAL(9,6),
ADD COLUMN gps_lng DECIMAL(9,6);

CREATE INDEX idx_items_location ON items (location) WHERE location IS NOT NULL;
