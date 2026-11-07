ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES crop_cycles(id);
CREATE INDEX IF NOT EXISTS work_orders_cycle ON work_orders(cycle_id);
