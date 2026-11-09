INSERT INTO services(code,title,description,price_kopecks,duration_minutes,enabled) VALUES('plant_package','Посадка под ключ','Демопакет: семена, необходимая подготовка и посадка всей грядки.',0,60,true);
ALTER TABLE work_orders ADD COLUMN planting_crop text, ADD COLUMN planting_quote jsonb;
