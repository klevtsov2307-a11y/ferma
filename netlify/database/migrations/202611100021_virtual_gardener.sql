ALTER TABLE farm_preferences ADD COLUMN virtual_gardener boolean NOT NULL DEFAULT false;
ALTER TABLE harvest_batches ADD COLUMN is_simulation boolean NOT NULL DEFAULT false;
INSERT INTO farm_preferences(user_id,virtual_gardener) SELECT id,true FROM users WHERE login='000kl000'
ON CONFLICT(user_id) DO UPDATE SET virtual_gardener=true;
ALTER TABLE delivery_orders ADD COLUMN is_simulation boolean NOT NULL DEFAULT false;
