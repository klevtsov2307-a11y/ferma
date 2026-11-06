-- Owner supplied: 3000 RUB/person/day, daily 09:00-19:00.
-- Planning assumption: 450 chargeable minutes/day; each job includes 5 minutes for transition/report.
-- Target 30% contribution margin after allocated labor ONLY, not net profit.
CREATE TABLE IF NOT EXISTS farm_settings(key text PRIMARY KEY,value jsonb NOT NULL);
INSERT INTO farm_settings(key,value) VALUES('labor_pricing_v1','{"salary_kopecks_per_day":300000,"shift_start":"09:00","shift_end":"19:00","timezone":"Europe/Moscow","days":"daily","chargeable_minutes":450,"chargeable_minutes_is_assumption":true,"job_overhead_minutes":5,"target_labor_margin":0.30,"round_up_rubles":10,"materials_included":false,"fees_taxes_included":false,"scope":"one bed up to 6 square meters","durations_measured":false}'::jsonb);
WITH rates(code,work_minutes) AS (VALUES ('inspect',15),('prepare',30),('plant',30),('water',15),('feed',20),('weed',25),('harvest',30))
UPDATE services s SET price_kopecks=(ceil((300000::numeric/450*(r.work_minutes+5)/(1-0.30))/1000)*1000)::integer,
 duration_minutes=r.work_minutes+5,enabled=true,version=s.version+1,
 description=s.description || '. Труд на одну грядку до 6 м²; материалы отдельно. Время расчётное, включая 5 минут на переход и отчёт. Ферма работает ежедневно 09:00–19:00 (МСК).'
FROM rates r WHERE s.code=r.code;
INSERT INTO audit(user_id,action,entity) SELECT id,'labor_tariffs_approved','3000 RUB/day; 450 chargeable min assumed; 30% labor margin; daily 09-19 MSK' FROM users WHERE login='000kl000';
