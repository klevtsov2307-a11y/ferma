ALTER TABLE plots ADD COLUMN growing_state text NOT NULL DEFAULT 'unchecked' CHECK(growing_state IN ('unchecked','empty','ready','planted','growing','harvest_ready','finished'));
CREATE TABLE services(code text PRIMARY KEY,title text NOT NULL,description text NOT NULL,price_kopecks integer CHECK(price_kopecks>=0),duration_minutes integer NOT NULL CHECK(duration_minutes>0),enabled boolean NOT NULL DEFAULT false,version integer NOT NULL DEFAULT 1);
INSERT INTO services(code,title,description,duration_minutes) VALUES
('inspect','Осмотр грядки','Проверить состояние и подготовленность участка',15),
('prepare','Подготовка почвы','Согласованная подготовка пустого участка',30),
('plant','Посадка','Посадка по согласованному плану',30),
('water','Проверка и полив','Проверить необходимость и выполнить согласованный полив',15),
('feed','Подкормка по плану','Только по утверждённому средству и дозировке',20),
('weed','Прополка','Удаление сорняков с сохранением посадок',25),
('harvest','Сбор урожая','Сбор и приёмка готового урожая',30);
CREATE TABLE rentals(id uuid PRIMARY KEY,plot_id integer NOT NULL REFERENCES plots(id),user_id uuid NOT NULL REFERENCES users(id),starts_at timestamptz NOT NULL,ends_at timestamptz, status text NOT NULL CHECK(status IN ('legacy','requested','active','ended','cancelled')),terms text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now(),CHECK(ends_at IS NULL OR ends_at>starts_at));
INSERT INTO rentals(id,plot_id,user_id,starts_at,status,terms) SELECT gen_random_uuid(),id,owner_id,now(),'legacy','Ранее закреплённый участок. Сроки и условия ещё не согласованы.' FROM plots WHERE owner_id IS NOT NULL;
CREATE TABLE work_orders(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),plot_id integer NOT NULL REFERENCES plots(id),service_code text NOT NULL REFERENCES services(code),service_version integer NOT NULL,title text NOT NULL,price_kopecks integer NOT NULL CHECK(price_kopecks>=0),duration_minutes integer NOT NULL,status text NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','quoted','awaiting_payment','queued','on_way','working','review','done','cancelled')),payment_status text NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','paid','waived','refund_due','refunded')),assigned_to uuid REFERENCES users(id),start_by timestamptz,finish_by timestamptz,started_at timestamptz,finished_at timestamptz,report text,request_key uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,request_key));
CREATE UNIQUE INDEX one_active_plot_order ON work_orders(plot_id) WHERE status NOT IN ('done','cancelled');
CREATE UNIQUE INDEX one_active_worker ON work_orders(assigned_to) WHERE status IN ('on_way','working');
CREATE TABLE order_events(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,order_id uuid NOT NULL REFERENCES work_orders(id),actor_id uuid NOT NULL REFERENCES users(id),event text NOT NULL,details text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE care_plans(plot_id integer PRIMARY KEY REFERENCES plots(id),approved_by uuid NOT NULL REFERENCES users(id),instructions text NOT NULL,water_gap_minutes integer NOT NULL CHECK(water_gap_minutes>=0),feed_gap_minutes integer NOT NULL CHECK(feed_gap_minutes>=0),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE notifications(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),message text NOT NULL,read_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX order_user_created ON work_orders(user_id,created_at DESC);
