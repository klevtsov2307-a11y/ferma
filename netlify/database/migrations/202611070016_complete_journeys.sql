ALTER TABLE plots ADD COLUMN length_m numeric CHECK(length_m>0), ADD COLUMN width_m numeric CHECK(width_m>0);
ALTER TABLE crop_cycles ADD COLUMN zone_id uuid REFERENCES plot_zones(id);
ALTER TABLE harvest_batches ADD COLUMN request_key uuid, ADD COLUMN storage_location_id uuid;
CREATE UNIQUE INDEX harvest_request_key ON harvest_batches(owner_id,request_key) WHERE request_key IS NOT NULL;
ALTER TABLE demo_market_orders ADD COLUMN plot_id integer REFERENCES plots(id), ADD COLUMN stage text NOT NULL DEFAULT 'requested' CHECK(stage IN ('requested','packing','received','cancelled')), ADD COLUMN report text NOT NULL DEFAULT '', ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE supply_stock ADD COLUMN market_order_id uuid REFERENCES demo_market_orders(id), ADD COLUMN catalog_id text;
ALTER TABLE work_orders ADD COLUMN approach_at timestamptz;
ALTER TABLE delivery_orders ADD COLUMN city_id text, ADD COLUMN expected_at timestamptz, ADD COLUMN charity_id uuid REFERENCES charity_board(id), ADD COLUMN packing_report text NOT NULL DEFAULT '';
CREATE TABLE storage_locations(id uuid PRIMARY KEY,name text NOT NULL,city_id text NOT NULL CHECK(city_id IN ('krasnodar','moscow','petersburg')),kind text NOT NULL CHECK(kind IN ('pantry','fridge')),capacity_grams bigint NOT NULL CHECK(capacity_grams>0),conditions text NOT NULL,active boolean NOT NULL DEFAULT true);
ALTER TABLE harvest_batches ADD CONSTRAINT harvest_location_fk FOREIGN KEY(storage_location_id) REFERENCES storage_locations(id);
CREATE TABLE care_schedule(id uuid PRIMARY KEY,owner_id uuid NOT NULL REFERENCES users(id),plot_id integer NOT NULL REFERENCES plots(id),cycle_id uuid REFERENCES crop_cycles(id),service_code text NOT NULL REFERENCES services(code),due_at timestamptz NOT NULL,reason text NOT NULL,status text NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','requested','cancelled')),order_id uuid REFERENCES work_orders(id),created_by uuid NOT NULL REFERENCES users(id),UNIQUE(plot_id,service_code,due_at));
CREATE TABLE journey_evidence(id uuid PRIMARY KEY,owner_id uuid NOT NULL REFERENCES users(id),entity_type text NOT NULL,entity_id text NOT NULL,kind text NOT NULL CHECK(kind IN ('photo','measurement','inspection')),description text NOT NULL,url text,actor_id uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE service_incidents(id uuid PRIMARY KEY,owner_id uuid NOT NULL REFERENCES users(id),order_id uuid REFERENCES work_orders(id),delivery_id uuid REFERENCES delivery_orders(id),description text NOT NULL,status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','review','resolved')),resolution text,refund_kopecks integer NOT NULL DEFAULT 0 CHECK(refund_kopecks>=0),created_at timestamptz NOT NULL DEFAULT now(),resolved_at timestamptz,CHECK((order_id IS NOT NULL)::int+(delivery_id IS NOT NULL)::int=1));
CREATE TABLE journey_settings(key text PRIMARY KEY,value jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO journey_settings VALUES('operations','{"transition_minutes":10,"approach_seconds":60,"autocare_scope":"Плановые осмотры и согласованные работы; материалы и монтаж согласуются отдельно","autocare_limit":8}',now());
ALTER TABLE public_farms ALTER COLUMN visible SET DEFAULT false;
ALTER TABLE storage_locations ALTER COLUMN capacity_grams DROP NOT NULL;
INSERT INTO storage_locations VALUES('10000000-0000-4000-8000-000000000001','Кладовая · без лимита','krasnodar','pantry',NULL,'Условия каждой партии подтверждает управляющий',true),('10000000-0000-4000-8000-000000000002','Холодильник · без лимита','krasnodar','fridge',NULL,'Температура и срок подтверждаются при приёмке',true);
ALTER TABLE charity_board ADD COLUMN is_demo boolean NOT NULL DEFAULT false, ADD COLUMN recipient_kind text NOT NULL DEFAULT 'organization' CHECK(recipient_kind IN ('organization','person'));
INSERT INTO charity_board(id,name,description,is_demo,recipient_kind) VALUES
('20000000-0000-4000-8000-000000000001','Демо: Тёплая корзина','Вымышленный центр помощи семьям. Передача продуктов только имитируется.',true,'organization'),
('20000000-0000-4000-8000-000000000002','Демо: Добрый росток','Вымышленный семейный центр. Передача продуктов только имитируется.',true,'organization'),
('20000000-0000-4000-8000-000000000003','Демо: Солнечный стол','Вымышленная социальная столовая. Передача продуктов только имитируется.',true,'organization'),
('20000000-0000-4000-8000-000000000004','Демо: Соседи рядом','Вымышленный волонтёрский центр. Передача продуктов только имитируется.',true,'organization'),
('20000000-0000-4000-8000-000000000005','Демо: Заботливый сад','Вымышленный центр поддержки старшего поколения. Передача продуктов только имитируется.',true,'organization'),
('20000000-0000-4000-8000-000000000006','Демо: Анна из Солнечного','Вымышленный человек для знакомства с функцией подарка.',true,'person'),
('20000000-0000-4000-8000-000000000007','Демо: Михаил из Лесного','Вымышленный человек для знакомства с функцией подарка.',true,'person'),
('20000000-0000-4000-8000-000000000008','Демо: Елена из Речного','Вымышленный человек для знакомства с функцией подарка.',true,'person'),
('20000000-0000-4000-8000-000000000009','Демо: Виктор из Цветочного','Вымышленный человек для знакомства с функцией подарка.',true,'person'),
('20000000-0000-4000-8000-000000000010','Демо: Ольга из Зелёного','Вымышленный человек для знакомства с функцией подарка.',true,'person');
CREATE TABLE market_rentals(id uuid PRIMARY KEY,order_id uuid NOT NULL REFERENCES demo_market_orders(id),owner_id uuid NOT NULL REFERENCES users(id),catalog_id text NOT NULL,quantity integer NOT NULL CHECK(quantity>0),starts_at timestamptz NOT NULL DEFAULT now(),ends_at timestamptz NOT NULL DEFAULT now()+interval '1 month',status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','returned')),condition_report text NOT NULL,returned_at timestamptz,UNIQUE(order_id,catalog_id));
CREATE TABLE delivery_receipts(delivery_id uuid REFERENCES delivery_orders(id),batch_id uuid REFERENCES harvest_batches(id),received_grams integer NOT NULL CHECK(received_grams>=0),issue text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(delivery_id,batch_id));
ALTER TABLE plot_equipment ADD COLUMN condition text NOT NULL DEFAULT 'installed' CHECK(condition IN ('installed','maintenance','retired')), ADD COLUMN maintenance_due timestamptz, ADD COLUMN end_of_lease text NOT NULL DEFAULT 'Нужно согласовать с владельцем';
CREATE TABLE supply_offers(id uuid PRIMARY KEY,owner_id uuid NOT NULL REFERENCES users(id),supply_id uuid NOT NULL REFERENCES supply_stock(id),quantity numeric NOT NULL CHECK(quantity>0),price_kopecks integer NOT NULL CHECK(price_kopecks>0),status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','sold','cancelled')),created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE supply_stock ADD COLUMN reserved numeric NOT NULL DEFAULT 0 CHECK(reserved>=0 AND reserved<=balance);
CREATE TABLE supply_trades(id uuid PRIMARY KEY,offer_id uuid NOT NULL UNIQUE REFERENCES supply_offers(id),buyer_id uuid NOT NULL REFERENCES users(id),request_key uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(buyer_id,request_key));
ALTER TABLE work_orders ADD COLUMN supply_id uuid REFERENCES supply_stock(id), ADD COLUMN supply_quantity numeric CHECK(supply_quantity>0);
ALTER TABLE plots ADD COLUMN demo_growing_state text CHECK(demo_growing_state IN ('unchecked','empty','ready','planted','growing','harvest_ready','finished'));
-- Explicitly account for historical assignments; never invent an active paid lease.
INSERT INTO rentals(id,plot_id,user_id,starts_at,status,terms)
SELECT gen_random_uuid(),p.id,p.owner_id,now(),'legacy','Историческое закрепление. Управляющий должен согласовать срок до новых платных работ.' FROM plots p
WHERE p.owner_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM rentals r WHERE r.plot_id=p.id AND r.user_id=p.owner_id);
CREATE TABLE staff_blocks(id uuid PRIMARY KEY,worker_id uuid NOT NULL REFERENCES users(id),starts_at timestamptz NOT NULL,ends_at timestamptz NOT NULL,reason text NOT NULL,CHECK(ends_at>starts_at));
CREATE TABLE product_details(catalog_id text PRIMARY KEY,description text NOT NULL,photo_url text,lot text,variety text,expires_on date,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE care_observations(id uuid PRIMARY KEY,plot_id integer NOT NULL REFERENCES plots(id),actor_id uuid NOT NULL REFERENCES users(id),soil text NOT NULL,weather text NOT NULL,stage text NOT NULL,decision text NOT NULL,material text,dose text,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE supply_stock ADD COLUMN lot text, ADD COLUMN variety text;
ALTER TABLE crop_cycles ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE work_orders ADD COLUMN harvest_destination text CHECK(harvest_destination IN ('home','storage','gift','charity'));
INSERT INTO services(code,title,description,price_kopecks,duration_minutes,enabled) VALUES
('loosen','Поверхностное рыхление','По плану садовника, без повреждения корней. Не заменяет подготовку пустой грядки.',15000,15,false),
('hill','Окучивание','Только для подходящей культуры и стадии, по согласованному плану.',25000,25,false);
ALTER TABLE delivery_orders ADD COLUMN delivery_quote jsonb, ADD COLUMN delivery_paid_at timestamptz;
