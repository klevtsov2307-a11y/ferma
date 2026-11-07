-- Owner-requested visual examples only: no harvest, payment or installed-equipment records.
ALTER TABLE plots ADD COLUMN demo_scene jsonb;
UPDATE plots p SET demo_scene=jsonb_build_object('owner_id',p.owner_id,'crop',v.crop,'stage',v.stage,'border',v.border,'irrigation',v.irrigation)
FROM (VALUES
 (7,'Помидоры','harvest_ready','concrete',true),
 (8,'Огурцы','growing','wood',true),
 (9,'Морковь','harvest_ready','concrete',false),
 (26,'Баклажаны','planted','concrete',true)
) AS v(id,crop,stage,border,irrigation)
WHERE p.id=v.id AND p.owner_id=(SELECT id FROM users WHERE login='000kl000');
