import {randomUUID} from 'node:crypto';
import {transaction,RuleError} from './operations.mjs';
import {estimateUpgrade,upgradeCatalog} from './upgrade-catalog.mjs';
const note='ВИРТУАЛЬНЫЙ САДОВНИК: симуляция. Физические работы не выполнялись.';
export async function virtualGardenerAPI(db,user,action,b,method){
 if(!['virtual-gardener','virtual-gardener-config','virtual-gardener-tick'].includes(action))return null;
 if(action==='virtual-gardener-tick'){if(method!=='POST')throw new RuleError('Недоступный метод',405);return runVirtualGardener(db,user)}
 return transaction(db,async c=>{if(action==='virtual-gardener-config'){if(method!=='POST'||typeof b.enabled!=='boolean')throw new RuleError('Укажите режим',400);await c.query('INSERT INTO farm_preferences(user_id,virtual_gardener) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET virtual_gardener=EXCLUDED.virtual_gardener',[user.id,b.enabled]);}
 const r=await c.query('SELECT virtual_gardener FROM farm_preferences WHERE user_id=$1',[user.id]);return {enabled:!!r.rows[0]?.virtual_gardener};});
}
export async function runVirtualGardener(db,user){return transaction(db,async c=>{
 const q=async(s,p=[])=>(await c.query(s,p)).rows;
 const pref=(await q('SELECT * FROM farm_preferences WHERE user_id=$1 FOR UPDATE',[user.id]))[0];if(!pref?.virtual_gardener)return {enabled:false,changed:false};
 let changed=false;const pending=[];
 const pay=async(amount,key,order=null)=>{if(!amount)return true;await q('INSERT INTO demo_wallets(user_id) VALUES($1) ON CONFLICT DO NOTHING',[user.id]);const w=(await q('SELECT balance_kopecks FROM demo_wallets WHERE user_id=$1 FOR UPDATE',[user.id]))[0];if(Number(w.balance_kopecks)<amount)return false;
 if(pref.monthly_limit){const spent=Number((await q("SELECT COALESCE(sum(amount_kopecks),0) n FROM demo_wallet_entries WHERE user_id=$1 AND kind IN ('payment','subscription','rental','purchase') AND created_at>=date_trunc('month',now())",[user.id]))[0].n);if(spent+amount>pref.monthly_limit)return false}
 await q('UPDATE demo_wallets SET balance_kopecks=balance_kopecks-$1 WHERE user_id=$2',[amount,user.id]);await q("INSERT INTO demo_wallet_entries(id,user_id,kind,amount_kopecks,order_id,request_key) VALUES($1,$2,'payment',$3,$4,$5)",[randomUUID(),user.id,amount,order,key]);return true;};
 const plots=await q("SELECT p.* FROM plots p WHERE p.owner_id=$1 AND p.rental_simulation AND EXISTS(SELECT 1 FROM rentals r WHERE r.plot_id=p.id AND r.user_id=$1 AND r.status='active' AND r.starts_at<=now() AND r.ends_at>now()) ORDER BY p.id FOR UPDATE",[user.id]);
 for(const p of plots){
 // Prepare a demo cultivation record for old illustrated demo beds, without touching physical state.
 const scene=p.demo_scene?.owner_id===user.id?p.demo_scene:null;
 let state=p.demo_growing_state||p.growing_state;
 if(scene&&['unchecked','empty','ready'].includes(state)){state=scene.stage;await q('UPDATE plots SET demo_growing_state=$1,crop=$2,demo_scene=NULL,version=version+1 WHERE id=$3',[state,scene.crop,p.id]);p.crop=scene.crop;changed=true;}
 if(['planted','growing','harvest_ready'].includes(state)&&p.crop){const exists=await q('SELECT id FROM crop_cycles WHERE plot_id=$1 AND owner_id=$2 AND ended_on IS NULL',[p.id,user.id]);if(!exists.length){await q("INSERT INTO crop_cycles(id,owner_id,plot_id,crop,family,starts_on,conditions,approved) VALUES($1,$2,$3,$4,'Демо',current_date,$5,true)",[randomUUID(),user.id,p.id,p.crop,note]);changed=true}}
 const orders=await q("SELECT * FROM work_orders WHERE plot_id=$1 AND user_id=$2 AND status NOT IN ('done','cancelled') AND payment_status IN ('unpaid','demo_paid','waived') ORDER BY created_at FOR UPDATE",[p.id,user.id]);
 for(const o of orders){if(['on_way','working','review'].includes(o.status)&&!o.is_simulation)continue;
 if(o.service_code==='harvest'&&!(await q('SELECT id FROM crop_cycles WHERE plot_id=$1 AND owner_id=$2 AND ended_on IS NULL',[p.id,user.id])).length){pending.push('Нет посадки для сбора');continue}
 if(o.payment_status==='unpaid'&&!await pay(o.price_kopecks,randomUUID(),o.id)){pending.push('Недостаточно демосредств или достигнут лимит: '+o.title);continue}
 if(o.payment_status==='unpaid')await q("UPDATE work_orders SET payment_status='demo_paid' WHERE id=$1",[o.id]);
 if(o.service_code==='harvest'){
  const cycles=await q('SELECT * FROM crop_cycles WHERE plot_id=$1 AND owner_id=$2 AND ended_on IS NULL AND ($3::uuid IS NULL OR id=$3)',[p.id,user.id,o.cycle_id]);const cy=cycles[0];if(!cy){pending.push('Нет посадки для сбора');continue}
  const grams=Math.round(Number(p.size)*2000),storage=(await q("SELECT id FROM storage_locations WHERE kind='fridge' AND active AND city_id=$1 ORDER BY id LIMIT 1",[p.city_id]))[0];
  const batch=randomUUID();await q("INSERT INTO harvest_batches(id,owner_id,plot_id,crop,harvested_on,received_grams,balance_grams,cycle_id,request_key,verified,expires_at,storage_conditions,storage_location_id,is_simulation) VALUES($1,$2,$3,$4,current_date,$5,$5,$6,$7,true,now()+interval '7 days',$8,$9,true)",[batch,user.id,p.id,cy.crop,grams,cy.id,o.id,note+' Условный урожай 2 кг/м², срок 7 дней — только для теста.',storage?.id||null]);
  await q("INSERT INTO stock_events(id,batch_id,actor_id,kind,grams,reason,request_key) VALUES($1,$2,$3,'received',$4,$5,$6)",[randomUUID(),batch,user.id,grams,note,randomUUID()]);await q('UPDATE crop_cycles SET ended_on=GREATEST(current_date,starts_on) WHERE id=$1',[cy.id]);await q("UPDATE plots SET demo_growing_state='finished',demo_scene=NULL,version=version+1 WHERE id=$1",[p.id]);
 }else if(['plant','plant_package'].includes(o.service_code)){
  await q('UPDATE crop_cycles SET approved=true,starts_on=current_date,updated_at=now() WHERE id=$1',[o.cycle_id]);await q("UPDATE plots SET demo_growing_state='harvest_ready',crop=COALESCE((SELECT crop FROM crop_cycles WHERE id=$1),crop),demo_scene=NULL,version=version+1 WHERE id=$2",[o.cycle_id,p.id]);
 }else if(o.service_code==='prepare')await q("UPDATE plots SET demo_growing_state='ready',demo_scene=NULL,version=version+1 WHERE id=$1",[p.id]);
 await q("UPDATE work_orders SET status='done',is_simulation=true,payment_status=CASE WHEN payment_status='unpaid' THEN 'demo_paid' ELSE payment_status END,started_at=now(),finished_at=now(),report=$1,updated_at=now() WHERE id=$2",[note,o.id]);await q("INSERT INTO order_events(order_id,actor_id,event,details) VALUES($1,$2,'done',$3)",[o.id,user.id,note]);changed=true;
 }
 await q('INSERT INTO care_plans(plot_id,approved_by,instructions,water_gap_minutes,feed_gap_minutes) VALUES($1,$2,$3,240,4320) ON CONFLICT(plot_id) DO NOTHING',[p.id,user.id,note+' Условный план ухода.']);
 const mature=await q("UPDATE plots SET demo_growing_state='harvest_ready',demo_scene=NULL,version=version+1 WHERE id=$1 AND COALESCE(demo_growing_state,growing_state) IN ('planted','growing') RETURNING id",[p.id]);if(mature.length)changed=true;
 const requests=await q("SELECT * FROM farm_requests WHERE user_id=$1 AND plot_id=$2 AND status IN ('requested','reviewed') ORDER BY created_at FOR UPDATE",[user.id,p.id]);
 for(const r of requests){if(r.catalog_id){const item=upgradeCatalog.find(x=>x.id===r.catalog_id);if(!item)continue;const quote=r.quote?.confirmed?r.quote:{...estimateUpgrade(item,p),confirmed:true,provisional:false,finish_by:new Date().toISOString()};if(!r.paid_at&&!await pay(quote.amount_kopecks,randomUUID())){pending.push('Недостаточно демосредств или достигнут лимит: '+item.name);continue}
 await q('INSERT INTO plot_equipment(id,request_id,plot_id,owner_id,catalog_id,report,is_simulation) VALUES($1,$2,$3,$4,$5,$6,true) ON CONFLICT(request_id) DO NOTHING',[randomUUID(),r.id,p.id,user.id,r.catalog_id,note]);await q('UPDATE farm_requests SET quote=$1,paid_at=COALESCE(paid_at,now()) WHERE id=$2',[JSON.stringify(quote),r.id]);}
 await q("UPDATE farm_requests SET status='done',report=$1 WHERE id=$2",[note,r.id]);changed=true;
 }
 }
 // Store purchases are already explicitly demo-paid; accept their goods without real shipment.
 const purchases=await q("SELECT * FROM demo_market_orders WHERE user_id=$1 AND stage IN ('requested','packing') FOR UPDATE",[user.id]);
 for(const purchase of purchases){for(const item of purchase.items||[]){if(!['Семена','Рассада','Удобрения'].includes(item.category))continue;await q('INSERT INTO supply_stock(id,owner_id,name,unit,balance) VALUES($1,$2,$3,$4,$5)',[randomUUID(),user.id,item.name,item.unit,item.qty]);}
 await q("UPDATE demo_market_orders SET stage='received',status='Виртуально получено',report=$1,updated_at=now() WHERE id=$2",[note,purchase.id]);changed=true;}
 const deliveries=await q("SELECT d.* FROM delivery_orders d WHERE d.user_id=$1 AND d.status IN ('requested','confirmed','shipped') AND EXISTS(SELECT 1 FROM delivery_items i WHERE i.delivery_id=d.id) AND NOT EXISTS(SELECT 1 FROM delivery_items i JOIN harvest_batches b ON b.id=i.batch_id WHERE i.delivery_id=d.id AND NOT b.is_simulation) FOR UPDATE",[user.id]);
 for(const d of deliveries){const items=await q('SELECT i.*,b.balance_grams,b.reserved_grams FROM delivery_items i JOIN harvest_batches b ON b.id=i.batch_id WHERE i.delivery_id=$1 FOR UPDATE OF b',[d.id]);if(items.some(i=>i.grams>i.balance_grams||i.grams>i.reserved_grams))continue;
 for(const i of items){await q('UPDATE harvest_batches SET balance_grams=balance_grams-$1,reserved_grams=reserved_grams-$1 WHERE id=$2',[i.grams,i.batch_id]);await q('INSERT INTO delivery_receipts(delivery_id,batch_id,received_grams,issue) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[d.id,i.batch_id,i.grams,note]);await q("INSERT INTO stock_events(id,batch_id,actor_id,kind,grams,reason,request_key) VALUES($1,$2,$3,'ship',$4,$5,$6)",[randomUUID(),i.batch_id,user.id,i.grams,note+' Виртуальная выдача.',randomUUID()]);}
 await q("UPDATE delivery_orders SET status='delivered',is_simulation=true,packing_report=$1 WHERE id=$2",[note+' Виртуальная доставка без курьера.',d.id]);changed=true;
 }
 return {enabled:true,changed,pending};
})}
