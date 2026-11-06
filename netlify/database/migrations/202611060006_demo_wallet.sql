CREATE TABLE demo_wallets(user_id uuid PRIMARY KEY REFERENCES users(id),balance_kopecks bigint NOT NULL DEFAULT 0 CHECK(balance_kopecks>=0),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE demo_wallet_entries(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),kind text NOT NULL CHECK(kind IN ('topup','withdraw','payment','refund')),amount_kopecks integer NOT NULL CHECK(amount_kopecks>0),order_id uuid REFERENCES work_orders(id),request_key uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,request_key));
CREATE UNIQUE INDEX demo_order_payment_once ON demo_wallet_entries(order_id) WHERE kind='payment';
CREATE UNIQUE INDEX demo_order_refund_once ON demo_wallet_entries(order_id) WHERE kind='refund';
ALTER TABLE work_orders ADD COLUMN is_simulation boolean NOT NULL DEFAULT false;
ALTER TABLE work_orders DROP CONSTRAINT work_orders_payment_status_check;
ALTER TABLE work_orders ADD CONSTRAINT work_orders_payment_status_check CHECK(payment_status IN ('unpaid','paid','waived','refund_due','refunded','demo_paid','demo_refunded'));
