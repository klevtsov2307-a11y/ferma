UPDATE plots SET demo_scene=jsonb_build_object('owner_id',owner_id,'crop','Баклажаны','stage','growing','border','wood','irrigation',false)
WHERE id=10 AND owner_id=(SELECT id FROM users WHERE login='000kl000');
