ALTER TABLE farm_preferences ADD COLUMN IF NOT EXISTS facility_state jsonb NOT NULL DEFAULT '{}'::jsonb;
