-- Existing Krasnodar-direction plots are physically in Belorechensk.
ALTER TABLE plots ADD COLUMN IF NOT EXISTS city_id text NOT NULL DEFAULT 'krasnodar';
CREATE INDEX IF NOT EXISTS plots_city_availability_idx ON plots(city_id,status,size);
