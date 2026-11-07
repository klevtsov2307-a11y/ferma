CREATE TABLE public_farms (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
 name text NOT NULL CHECK(char_length(name) BETWEEN 2 AND 60),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public_farms(id,user_id,name)
 SELECT id,id,'Ферма Павла Клевцова' FROM users WHERE login='000kl000'
 ON CONFLICT(user_id) DO NOTHING;
