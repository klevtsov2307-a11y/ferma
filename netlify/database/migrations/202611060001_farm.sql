CREATE TABLE IF NOT EXISTS users(id uuid PRIMARY KEY, login text UNIQUE NOT NULL, name text NOT NULL, password_hash text NOT NULL, role text NOT NULL DEFAULT 'member' CHECK(role IN ('member','farmer','admin')), created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS sessions(token_hash text PRIMARY KEY,user_id uuid REFERENCES users(id) ON DELETE CASCADE,expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS rate_limits(key text PRIMARY KEY, count integer NOT NULL DEFAULT 1, reset_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS plots(id integer PRIMARY KEY, name text NOT NULL, size integer NOT NULL DEFAULT 6, status text NOT NULL DEFAULT 'unavailable', owner_id uuid REFERENCES users(id), crop text DEFAULT '', sign text DEFAULT '', camera_url text DEFAULT '', version integer DEFAULT 0);
INSERT INTO plots(id,name) SELECT i,'Грядка №'||i FROM generate_series(1,50) i ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS records(id uuid PRIMARY KEY,owner_id uuid NOT NULL REFERENCES users(id),kind text NOT NULL,plot_id integer REFERENCES plots(id),data jsonb NOT NULL DEFAULT '{}',created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,user_id uuid REFERENCES users(id),action text NOT NULL,entity text,created_at timestamptz DEFAULT now());
CREATE INDEX IF NOT EXISTS records_owner_kind ON records(owner_id,kind);
