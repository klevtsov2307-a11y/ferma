CREATE TABLE quality_assessments(id uuid PRIMARY KEY,batch_id uuid NOT NULL REFERENCES harvest_batches(id),assessed_by uuid NOT NULL REFERENCES users(id),method_version text NOT NULL,score integer NOT NULL CHECK(score BETWEEN 0 AND 100),breakdown jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX quality_batch_history ON quality_assessments(batch_id,created_at DESC);
