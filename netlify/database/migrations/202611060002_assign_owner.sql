-- One-time owner assignment requested by the project owner.
DO $$
DECLARE target_id uuid;
BEGIN
  SELECT id INTO target_id FROM users WHERE login = '000kl000';
  IF target_id IS NULL THEN
    RAISE EXCEPTION 'Owner account must be registered before applying this migration';
  END IF;
  UPDATE users SET role = 'admin' WHERE id = target_id;
  INSERT INTO audit(user_id, action, entity) VALUES (target_id, 'owner_role_assigned_by_migration', 'farm-off');
END $$;
