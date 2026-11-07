import {withinShift,careCapacity} from './scheduling.mjs';
import {demoCatalog} from './market-catalog.mjs';
import {randomUUID} from 'node:crypto';
import {transaction,RuleError,checkLease,checkService} from './operations.mjs';
const req=(ok,msg)=>{if(!ok)throw new RuleError(msg,400)};
const text=(v,n=2000)=>typeof v==='string'?v.trim().slice(0,n):'';
const uuid=v=>typeof v==='string'&&/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(v);
export async function journeyAPI(db,user,action,b,method){
 if(!action.startsWith('journey'))return null;
 const admin=user.role==='admin';
 return transaction(db,async c=>{
 const q=async(s,p=[])=>(await c.query(s,p)).rows;
 const own=async(plot)=>{const p=(await q('SELECT * FROM plots WHERE id=$1 FOR UPDATE',[plot]))[0];req(p&&(admin||p.owner_id===user.id),'Грядка недоступна');return p};
 if(action==='journey'&&method==='GET')return {
 staff:admin?await q("SELECT id,name FROM users WHERE role IN ('admin','farmer') ORDER BY name"):[],
 blocks:admin?await q('SELECT * FROM staff_blocks WHERE ends_at>now()'):[],
 products:await q('SELECT * FROM product_details'),
 observations:await q('SELECT o.* FROM care_observations o JOIN plots p ON p.id=o.plot_id WHERE p.owner_id=$1 OR $2 ORDER BY o.created_at DESC LIMIT 100',[user.id,admin]),
 marketRentals:await q('SELECT * FROM market_rentals WHERE owner_id=$1 OR $2 ORDER BY starts_at DESC',[user.id,admin]),
 supplies:await q('SELECT * FROM supply_stock WHERE owner_id=$1',[user.id]),
 offers:await q("SELECT o.*,s.name,s.unit,s.expires_on FROM supply_offers o JOIN supply_stock s ON s.id=o.supply_id WHERE o.status='active' AND (s.expires_on IS NULL OR s.expires_on>=current_date)"),
 schedules:await q('SELECT * FROM care_schedule WHERE owner_id=$1 OR $2 ORDER BY due_at',[user.id,admin]),
 locations:await q('SELECT * FROM storage_locations WHERE active ORDER BY city_id,kind'),
 incidents:await q('SELECT * FROM service_incidents WHERE owner_id=$1 OR $2 ORDER BY created_at DESC LIMIT 100',[user.id,admin]),
 settings:await q('SELECT * FROM journey_settings'),
 evidence:await q('SELECT id,entity_type,entity_id,kind,description,url,created_at FROM journey_evidence WHERE owner_id=$1 OR $2 ORDER BY created_at DESC LIMIT 200',[user.id,admin]),
 achievements:await q("SELECT 'first_basket' code,min(created_at) achieved_at FROM delivery_orders WHERE user_id=$1 AND status='delivered' HAVING count(*)>0 UNION ALL SELECT 'first_harvest',min(created_at) FROM harvest_batches WHERE owner_id=$1 AND verified HAVING count(*)>0",[user.id])};
 req(method==='POST','Недоступный метод');
 if(action==='journey-delivery-quote'){
 req(admin&&Number.isInteger(b.price)&&b.price>=0&&b.price<=100000000&&text(b.conditions).length>=20&&Date.parse(b.expected)>Date.now(),'Подтвердите стоимость, адрес, условия перевозки и прибытие');const d=(await q('SELECT * FROM delivery_orders WHERE id=$1 FOR UPDATE',[b.id]))[0];req(d?.status==='requested'&&!d.delivery_paid_at,'Согласование уже завершено');
 const items=await q('SELECT b.expires_at FROM delivery_items i JOIN harvest_batches b ON b.id=i.batch_id WHERE i.delivery_id=$1',[d.id]);req(items.every(x=>Date.parse(x.expires_at)>Date.parse(b.expected)),'Срок партии истекает до прибытия');
 await q('UPDATE delivery_orders SET delivery_quote=$1 WHERE id=$2',[JSON.stringify({version:(d.delivery_quote?.version||0)+1,price:b.price,expected:b.expected,conditions:text(b.conditions),address:d.address,city:d.city_id}),d.id]);await q('INSERT INTO notifications(user_id,message) VALUES($1,$2)',[d.user_id,'Согласуйте стоимость и время доставки в разделе урожая']);return {ok:true};}
 if(action==='journey-delivery-pay'){
 const d=(await q('SELECT * FROM delivery_orders WHERE id=$1 FOR UPDATE',[b.id]))[0];req(d?.user_id===user.id,'Нет доступа');if(d.delivery_paid_at)return {ok:true};req(d.status==='requested'&&d.delivery_quote?.version===b.version,'Смета доставки изменилась');const quote=d.delivery_quote;req(Date.parse(quote.expected)>Date.now(),'Нужно обновить время прибытия');const items=await q('SELECT b.expires_at FROM delivery_items i JOIN harvest_batches b ON b.id=i.batch_id WHERE i.delivery_id=$1',[d.id]);req(items.every(x=>Date.parse(x.expires_at)>Date.parse(quote.expected)),'Срок партии изменился');
 await q('INSERT INTO demo_wallets(user_id) VALUES($1) ON CONFLICT DO NOTHING',[user.id]);const w=(await q('SELECT * FROM demo_wallets WHERE user_id=$1 FOR UPDATE',[user.id]))[0];req(Number(w.balance_kopecks)>=quote.price,'Недостаточно демосредств');const prefs=(await q('SELECT monthly_limit FROM farm_preferences WHERE user_id=$1',[user.id]))[0];const spent=Number((await q("SELECT COALESCE(sum(amount_kopecks),0) n FROM demo_wallet_entries WHERE user_id=$1 AND kind IN ('payment','subscription','rental','purchase') AND created_at>=date_trunc('month',now())",[user.id]))[0].n);req(!prefs?.monthly_limit||spent+quote.price<=prefs.monthly_limit,'Превышен месячный лимит');
 if(quote.price){await q('UPDATE demo_wallets SET balance_kopecks=balance_kopecks-$1 WHERE user_id=$2',[quote.price,user.id]);await q("INSERT INTO demo_wallet_entries(id,user_id,kind,amount_kopecks,request_key) VALUES($1,$2,'purchase',$3,$4)",[randomUUID(),user.id,quote.price,d.id]);}
 await q("UPDATE delivery_orders SET delivery_paid_at=now(),expected_at=$1,status='confirmed' WHERE id=$2",[quote.expected,d.id]);return {ok:true};}
 if(action==='journey-product'){
 req(admin&&demoCatalog.some(p=>p.id===b.id)&&text(b.description).length>=20,'Выберите товар и опишите комплектацию');if(b.photo){let u;try{u=new URL(b.photo)}catch{}req(u?.protocol==='https:'&&!u.username&&!u.password,'Нужна HTTPS-ссылка на изображение');}
 await q('INSERT INTO product_details(catalog_id,description,photo_url,lot,variety,expires_on) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(catalog_id) DO UPDATE SET description=excluded.description,photo_url=excluded.photo_url,lot=excluded.lot,variety=excluded.variety,expires_on=excluded.expires_on,updated_at=now()',[b.id,text(b.description),b.photo||null,text(b.lot,100),text(b.variety,100),b.expires||null]);return {ok:true};}
 if(action==='journey-observation'){
 req(admin,'Наблюдение подтверждает управляющий');const p=await own(b.plot);req([b.soil,b.weather,b.stage,b.decision].every(x=>text(x).length>=3),'Укажите почву, погоду, стадию и решение');req(!b.material||text(b.dose).length>=3,'Для материала нужна дозировка');await q('INSERT INTO care_observations(id,plot_id,actor_id,soil,weather,stage,decision,material,dose) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[randomUUID(),p.id,user.id,text(b.soil),text(b.weather),text(b.stage),text(b.decision),text(b.material),text(b.dose)]);return {ok:true};}
 if(action==='journey-staff-block'){
 req(admin&&text(b.reason).length>=3&&Date.parse(b.end)>Date.parse(b.start),'Укажите перерыв или отсутствие');const worker=(await q("SELECT id FROM users WHERE id=$1 AND role IN ('admin','farmer') FOR UPDATE",[b.worker]))[0];req(worker,'Сотрудник не найден');
 req(!(await q("SELECT id FROM work_orders WHERE assigned_to=$1 AND status NOT IN ('done','cancelled') AND start_by<$3 AND finish_by>$2",[b.worker,b.start,b.end])).length,'Есть согласованная работа: сначала перенесите её');await q('INSERT INTO staff_blocks VALUES($1,$2,$3,$4,$5)',[randomUUID(),b.worker,b.start,b.end,text(b.reason)]);return {ok:true};}
 if(action==='journey-reschedule'){
 req(admin&&text(b.reason).length>=10,'Объясните перенос');const o=(await q('SELECT * FROM work_orders WHERE id=$1 FOR UPDATE',[b.id]))[0];req(o&&['quoted','awaiting_payment','queued'].includes(o.status),'Можно перенести только неначатую работу');const start=new Date(b.start),end=new Date(b.end);req(+start>Date.now()&&+end-(+start)>=o.duration_minutes*60000&&withinShift(start,end),'Работа должна помещаться в будущую смену 09–19 МСК');
 await q('SELECT id FROM users WHERE id=$1 FOR UPDATE',[o.assigned_to]);req(!(await q("SELECT id FROM work_orders WHERE assigned_to=$1 AND id<>$4 AND status NOT IN ('done','cancelled') AND start_by<$3::timestamptz+interval '10 minutes' AND finish_by>$2::timestamptz-interval '10 minutes'",[o.assigned_to,start,end,o.id])).length,'Сотрудник занят');req(!(await q('SELECT id FROM staff_blocks WHERE worker_id=$1 AND starts_at<$3 AND ends_at>$2',[o.assigned_to,start,end])).length,'У сотрудника перерыв или отсутствие');
 await q("UPDATE work_orders SET start_by=$1,finish_by=$2,status='quoted',updated_at=now() WHERE id=$3",[start,end,o.id]);await q('INSERT INTO order_events(order_id,actor_id,event,details) VALUES($1,$2,$3,$4)',[o.id,user.id,'rescheduled',text(b.reason)]);await q('INSERT INTO notifications(user_id,message) VALUES($1,$2)',[o.user_id,'Предложено новое время: '+text(b.reason,200)]);return {ok:true};}
 if(action==='journey-read'){await q('UPDATE notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL',[user.id]);return {ok:true};}
 if(action==='journey-dimensions'){
 req(admin,'Размеры подтверждает управляющий');const p=await own(b.plot);
 req(Number.isFinite(b.width)&&Number.isFinite(b.length)&&b.width>0&&b.length>0&&Math.abs(b.width*b.length-Number(p.size))<0.01,'Длина × ширина должны совпадать с площадью');
 await q('UPDATE plots SET width_m=$1,length_m=$2,version=version+1 WHERE id=$3',[b.width,b.length,p.id]);return {ok:true};}
 if(action==='journey-storage'){
 req(admin,'Настройка склада доступна управляющему');req(['krasnodar','moscow','petersburg'].includes(b.city)&&['pantry','fridge'].includes(b.kind)&&text(b.name)&&text(b.conditions).length>=10,'Заполните город, тип и условия');req(b.capacity===null||Number.isSafeInteger(b.capacity)&&b.capacity>0,'Вместимость должна быть положительной или без лимита');
 await q('INSERT INTO storage_locations(id,name,city_id,kind,capacity_grams,conditions) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET name=excluded.name,capacity_grams=excluded.capacity_grams,conditions=excluded.conditions',[uuid(b.id)?b.id:randomUUID(),text(b.name,100),b.city,b.kind,b.capacity,text(b.conditions)]);return {ok:true};}
 if(action==='journey-schedule'){
 req(admin,'План обслуживания подтверждает управляющий');const p=await own(b.plot);req(p.owner_id,'Нужна арендованная грядка');await checkLease(c,p.id,p.owner_id);
 req(['inspect','water','feed','weed'].includes(b.service)&&text(b.reason).length>=20&&Date.parse(b.due)>Date.now(),'Укажите работу, будущую дату и основание');
 req((await q("SELECT 1 FROM farm_memberships WHERE user_id=$1 AND kind='autocare' AND expires_at>$2",[p.owner_id,b.due])).length,'Автоуход должен действовать на дату работы');
 const cy=(await q('SELECT id FROM crop_cycles WHERE plot_id=$1 AND approved AND ended_on IS NULL',[p.id]));req(!b.cycle||cy.some(x=>x.id===b.cycle),'Посадка недоступна');req(cy.length<=1||b.cycle,'Выберите посадку');req(b.service==='inspect'||cy.length>0,'Сначала согласуйте посадку');
 const settings=(await q("SELECT value FROM journey_settings WHERE key='operations'"))[0].value;
 const existing=await q("SELECT s.due_at,v.duration_minutes minutes FROM care_schedule s JOIN services v ON v.code=s.service_code WHERE s.owner_id=$1 AND s.status<>'cancelled' AND s.due_at BETWEEN $2::timestamptz-interval '30 days' AND $2::timestamptz+interval '30 days'",[p.owner_id,b.due]);const duration=(await q('SELECT duration_minutes FROM services WHERE code=$1',[b.service]))[0]?.duration_minutes;req(careCapacity(existing,{due_at:b.due,minutes:duration},settings.autocare_limit,100),'Включено до 8 работ и 100 минут в любые 30 дней. Дополнительный уход согласуйте отдельно');
 const id=randomUUID();await q('INSERT INTO care_schedule(id,owner_id,plot_id,cycle_id,service_code,due_at,reason,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,p.owner_id,p.id,b.cycle||cy[0]?.id||null,b.service,b.due,text(b.reason),user.id]);
 await q('INSERT INTO notifications(user_id,message) VALUES($1,$2)',[p.owner_id,'Запланирован автоуход: '+text(b.reason,120)]);return {id};}
 if(action==='journey-schedule-order'){
 req(admin,'Назначение подтверждает управляющий');const s=(await q('SELECT * FROM care_schedule WHERE id=$1 FOR UPDATE',[b.id]))[0];req(s,'План не найден');if(s.order_id)return {id:s.order_id};req(s.status==='planned','План отменён');
 const p=await own(s.plot_id);req(p.owner_id===s.owner_id,'Владелец грядки изменился');await checkLease(c,p.id,p.owner_id);
 req((await q("SELECT 1 FROM farm_memberships WHERE user_id=$1 AND kind='autocare' AND expires_at>greatest(now(),$2::timestamptz)",[p.owner_id,s.due_at])).length,'Продлите автоуход');
 const plan=(await q('SELECT * FROM care_plans WHERE plot_id=$1',[p.id]))[0];const last=(await q("SELECT finished_at FROM work_orders WHERE plot_id=$1 AND service_code=$2 AND status='done' AND NOT is_simulation ORDER BY finished_at DESC LIMIT 1",[p.id,s.service_code]))[0];checkService(s.service_code,p,plan,last?.finished_at);
 const service=(await q('SELECT * FROM services WHERE code=$1',[s.service_code]))[0];req(service?.enabled,'Услуга закрыта');
 const id=randomUUID();await q('INSERT INTO work_orders(id,user_id,plot_id,service_code,service_version,title,price_kopecks,duration_minutes,request_key,cycle_id,is_simulation) VALUES($1,$2,$3,$4,$5,$6,0,$7,$8,$9,true)',[id,p.owner_id,p.id,s.service_code,service.version,'Включено в демоуход: '+service.title,service.duration_minutes,randomUUID(),s.cycle_id]);
 await q("UPDATE care_schedule SET status='requested',order_id=$1 WHERE id=$2",[id,s.id]);return {id};}
 if(action==='journey-evidence'){
 req(admin,'Подтверждения добавляет управляющий');req(['photo','measurement','inspection'].includes(b.kind)&&text(b.description).length>=10,'Добавьте описание подтверждения');let owner;
 if(b.entity==='batch')owner=(await q('SELECT owner_id FROM harvest_batches WHERE id=$1',[b.id]))[0]?.owner_id;
 else if(b.entity==='plot')owner=(await own(Number(b.id))).owner_id;
 else if(b.entity==='equipment')owner=(await q('SELECT owner_id FROM plot_equipment WHERE id=$1',[b.id]))[0]?.owner_id;
 req(owner,'Объект не найден');if(b.url){let u;try{u=new URL(b.url)}catch{}req(u?.protocol==='https:'&&!u.username&&!u.password,'Нужна HTTPS-ссылка без пароля')}
 req(b.kind!=='photo'||b.url,'Для фото нужна ссылка');await q('INSERT INTO journey_evidence VALUES($1,$2,$3,$4,$5,$6,$7,$8,now())',[randomUUID(),owner,b.entity,String(b.id),b.kind,text(b.description),b.url||null,user.id]);return {ok:true};}
 if(action==='journey-incident'){
 req(text(b.description).length>=10&&['order','delivery'].includes(b.entity),'Опишите проблему');const row=(await q(b.entity==='order'?'SELECT user_id FROM work_orders WHERE id=$1':'SELECT user_id FROM delivery_orders WHERE id=$1',[b.id]))[0];req(row&&(row.user_id===user.id||admin),'Нет доступа');
 const id=randomUUID();await q('INSERT INTO service_incidents(id,owner_id,order_id,delivery_id,description) VALUES($1,$2,$3,$4,$5)',[id,row.user_id,b.entity==='order'?b.id:null,b.entity==='delivery'?b.id:null,text(b.description)]);return {id};}
 if(action==='journey-resolve'){
 req(admin&&text(b.resolution).length>=10,'Нужно решение управляющего');const issue=(await q('SELECT * FROM service_incidents WHERE id=$1 FOR UPDATE',[b.id]))[0];req(issue,'Обращение не найдено');if(issue.status==='resolved')return {ok:true};req(Number.isInteger(b.refund)&&b.refund>=0,'Неверная сумма возврата');
 if(b.refund>0&&issue.order_id){const o=(await q('SELECT * FROM work_orders WHERE id=$1 FOR UPDATE',[issue.order_id]))[0];req(o.payment_status==='demo_paid'&&b.refund<=o.price_kopecks,'Возврат ограничен оплаченной суммой');
 const refunded=Number((await q("SELECT COALESCE(sum(amount_kopecks),0) n FROM demo_wallet_entries WHERE order_id=$1 AND kind='refund'",[o.id]))[0].n);req(refunded+b.refund<=o.price_kopecks,'Сумма уже возвращена');
 await q('UPDATE demo_wallets SET balance_kopecks=balance_kopecks+$1 WHERE user_id=$2',[b.refund,issue.owner_id]);await q("INSERT INTO demo_wallet_entries(id,user_id,kind,amount_kopecks,order_id,request_key) VALUES($1,$2,'refund',$3,$4,$5)",[randomUUID(),issue.owner_id,b.refund,o.id,randomUUID()]);}
 if(b.refund>0&&issue.delivery_id){const d=(await q('SELECT * FROM delivery_orders WHERE id=$1 FOR UPDATE',[issue.delivery_id]))[0];req(d.delivery_paid_at&&['shipped','delivered'].includes(d.status),'Возврат доступен за оплаченную отправленную доставку');const refunded=Number((await q("SELECT COALESCE(sum(refund_kopecks),0) n FROM service_incidents WHERE delivery_id=$1 AND status='resolved'",[d.id]))[0].n);req(refunded+b.refund<=d.delivery_quote.price,'Возврат превышает оплату доставки');await q('UPDATE demo_wallets SET balance_kopecks=balance_kopecks+$1 WHERE user_id=$2',[b.refund,issue.owner_id]);await q("INSERT INTO demo_wallet_entries(id,user_id,kind,amount_kopecks,request_key) VALUES($1,$2,'refund',$3,$4)",[randomUUID(),issue.owner_id,b.refund,randomUUID()]);}
 if(b.stop&&issue.order_id){const order=(await q('SELECT * FROM work_orders WHERE id=$1 FOR UPDATE',[issue.order_id]))[0];req(['on_way','working','review'].includes(order.status),'Можно остановить только начатую работу');if(order.status==='on_way'&&order.supply_id)await q('UPDATE supply_stock SET reserved=reserved-$1 WHERE id=$2',[order.supply_quantity,order.supply_id]);await q("UPDATE work_orders SET status='cancelled',updated_at=now() WHERE id=$1",[order.id]);await q('INSERT INTO order_events(order_id,actor_id,event,details) VALUES($1,$2,$3,$4)',[order.id,user.id,'stopped_after_incident',text(b.resolution)]);}
 await q("UPDATE service_incidents SET status='resolved',resolution=$1,refund_kopecks=$2,resolved_at=now() WHERE id=$3",[text(b.resolution),b.refund,issue.id]);await q('INSERT INTO notifications(user_id,message) VALUES($1,$2)',[issue.owner_id,'Решение по обращению: '+text(b.resolution,200)]);return {ok:true};}
 if(action==='journey-rental-return'){
 req(admin&&text(b.report).length>=10,'Возврат и состояние подтверждает управляющий');await q("UPDATE market_rentals SET status='returned',returned_at=now(),condition_report=condition_report||E'\\n'||$1 WHERE id=$2 AND status='active'",[text(b.report),b.id]);return {ok:true};}
 if(action==='journey-equipment'){
 req(admin&&['installed','maintenance','retired'].includes(b.condition)&&text(b.report).length>=10&&text(b.disposition).length>=10,'Подтвердите состояние, результат и условия окончания аренды');
 req(!b.due||Number.isFinite(Date.parse(b.due)),'Неверная дата');await q('UPDATE plot_equipment SET condition=$1,maintenance_due=$2,end_of_lease=$3,report=report||$4 WHERE id=$5',[b.condition,b.due||null,text(b.disposition), '\n'+text(b.report),b.id]);return {ok:true};}
 if(action==='journey-receipt'){
 const d=(await q('SELECT * FROM delivery_orders WHERE id=$1 FOR UPDATE',[b.id]))[0];req(d&&(d.user_id===user.id||admin),'Нет доступа');if(d.status==='delivered')return {ok:true};req(d.status==='shipped','Корзина ещё не отправлена');
 const items=await q('SELECT * FROM delivery_items WHERE delivery_id=$1 ORDER BY batch_id',[d.id]);req(Array.isArray(b.items)&&b.items.length===items.length&&new Set(b.items.map(x=>x.id)).size===items.length,'Подтвердите каждую позицию');let issues=[];
 for(const i of items){const r=b.items.find(x=>x.id===i.batch_id);req(r&&Number.isInteger(r.grams)&&r.grams>=0&&r.grams<=i.grams,'Полученный вес не может превышать отправленный');req(r.grams===i.grams||text(r.issue).length>=10,'Опишите недостачу или повреждение');await q('INSERT INTO delivery_receipts(delivery_id,batch_id,received_grams,issue) VALUES($1,$2,$3,$4)',[d.id,i.batch_id,r.grams,text(r.issue)]);if(r.grams<i.grams||text(r.issue))issues.push(text(r.issue));}
 if(issues.length)await q('INSERT INTO service_incidents(id,owner_id,delivery_id,description) VALUES($1,$2,$3,$4)',[randomUUID(),d.user_id,d.id,issues.join('; ')]);
 await q("UPDATE delivery_orders SET status='delivered' WHERE id=$1",[d.id]);return {ok:true};}
 if(action==='journey-supply-offer'){
 const s=(await q('SELECT * FROM supply_stock WHERE id=$1 FOR UPDATE',[b.id]))[0];req(s?.owner_id===user.id,'Нет доступа');req(Number.isFinite(b.quantity)&&b.quantity>0&&b.quantity<=Number(s.balance)-Number(s.reserved)&&Number.isInteger(b.price)&&b.price>0&&b.price<=100000000,'Проверьте количество и цену');req(!s.expires_on||new Date(s.expires_on)>=new Date(new Date().toISOString().slice(0,10)),'Материал просрочен');const id=randomUUID();await q('UPDATE supply_stock SET reserved=reserved+$1 WHERE id=$2',[b.quantity,s.id]);await q('INSERT INTO supply_offers(id,owner_id,supply_id,quantity,price_kopecks) VALUES($1,$2,$3,$4,$5)',[id,user.id,s.id,b.quantity,b.price]);return {id};}
 if(action==='journey-supply-cancel'){
 const o=(await q('SELECT * FROM supply_offers WHERE id=$1 FOR UPDATE',[b.id]))[0];req(o?.owner_id===user.id,'Нет доступа');if(o.status==='cancelled')return {ok:true};req(o.status==='active','Предложение завершено');await q('UPDATE supply_stock SET reserved=reserved-$1 WHERE id=$2',[o.quantity,o.supply_id]);await q("UPDATE supply_offers SET status='cancelled' WHERE id=$1",[o.id]);return {ok:true};}
 if(action==='journey-supply-buy'){
 req(uuid(b.key),'Нужен номер операции');const o=(await q('SELECT * FROM supply_offers WHERE id=$1 FOR UPDATE',[b.id]))[0];req(o&&o.owner_id!==user.id,'Нельзя купить своё предложение');const old=(await q('SELECT offer_id FROM supply_trades WHERE buyer_id=$1 AND request_key=$2',[user.id,b.key]))[0];if(old){req(old.offer_id===o.id,'Номер относится к другой покупке');return {ok:true}}req(o.status==='active','Предложение завершено');
 const s=(await q('SELECT * FROM supply_stock WHERE id=$1 FOR UPDATE',[o.supply_id]))[0];req(Number(s.reserved)>=Number(o.quantity)&&(!s.expires_on||new Date(s.expires_on)>=new Date(new Date().toISOString().slice(0,10))),'Материал недоступен');
 for(const uid of [user.id,o.owner_id].sort()){await q('INSERT INTO demo_wallets(user_id) VALUES($1) ON CONFLICT DO NOTHING',[uid]);await q('SELECT user_id FROM demo_wallets WHERE user_id=$1 FOR UPDATE',[uid])}
 const w=(await q('SELECT balance_kopecks FROM demo_wallets WHERE user_id=$1',[user.id]))[0];req(Number(w.balance_kopecks)>=o.price_kopecks,'Недостаточно демосредств');
 const prefs=(await q('SELECT monthly_limit FROM farm_preferences WHERE user_id=$1',[user.id]))[0];const spent=Number((await q("SELECT COALESCE(sum(amount_kopecks),0) n FROM demo_wallet_entries WHERE user_id=$1 AND kind IN ('payment','subscription','rental','purchase') AND created_at>=date_trunc('month',now())",[user.id]))[0].n);req(!prefs?.monthly_limit||spent+o.price_kopecks<=prefs.monthly_limit,'Превышен месячный лимит');
 await q('UPDATE demo_wallets SET balance_kopecks=balance_kopecks-$1 WHERE user_id=$2',[o.price_kopecks,user.id]);await q('UPDATE demo_wallets SET balance_kopecks=balance_kopecks+$1 WHERE user_id=$2',[o.price_kopecks,o.owner_id]);
 await q("INSERT INTO demo_wallet_entries(id,user_id,kind,amount_kopecks,request_key) VALUES($1,$2,'purchase',$3,$4),($5,$6,'sale',$3,$7)",[randomUUID(),user.id,o.price_kopecks,b.key,randomUUID(),o.owner_id,randomUUID()]);
 await q('UPDATE supply_stock SET balance=balance-$1,reserved=reserved-$1 WHERE id=$2',[o.quantity,s.id]);await q('INSERT INTO supply_stock(id,owner_id,name,unit,balance,expires_on,catalog_id,lot,variety) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[randomUUID(),user.id,s.name,s.unit,o.quantity,s.expires_on,s.catalog_id,s.lot,s.variety]);await q("UPDATE supply_offers SET status='sold' WHERE id=$1",[o.id]);await q('INSERT INTO supply_trades(id,offer_id,buyer_id,request_key) VALUES($1,$2,$3,$4)',[randomUUID(),o.id,user.id,b.key]);return {ok:true};}
 throw new RuleError('Действие не найдено',404);
 });
}

// Draft due jobs only. Assignment, consent and actual execution still use the normal work workflow.
export async function dueCareJobs(db){
 const due=await db.sql`SELECT s.id,s.created_by FROM care_schedule s JOIN users u ON u.id=s.created_by WHERE s.status='planned' AND s.due_at<=now()+interval '1 day' AND u.role='admin' ORDER BY s.due_at LIMIT 50`;
 let created=0;for(const s of due){try{await journeyAPI(db,{id:s.created_by,role:'admin'},'journey-schedule-order',{id:s.id},'POST');created++}catch(e){if(!(e instanceof RuleError)&&e.code!=='23505')throw e;}}
 return {created};
}
