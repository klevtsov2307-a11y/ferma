import {test} from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {readFile,readdir} from 'node:fs/promises';import {randomUUID as id} from 'node:crypto';
import {marketAPI} from '../netlify/lib/market.mjs';import {journeyAPI} from '../netlify/lib/journeys.mjs';import {seasonAPI} from '../netlify/lib/season.mjs';import {harvestAPI} from '../netlify/lib/harvest.mjs';import {lifecycleAPI} from '../netlify/lib/lifecycle.mjs';import {rentalCheckout} from '../netlify/lib/rentals.mjs';
async function fixture(fn){const pg=new PGlite(),db={pool:{connect:async()=>({query:(s,p)=>pg.query(s,p),release(){}})},sql:async(s,...p)=>(await pg.query(s.reduce((a,x,i)=>a+(i?'$'+i:'')+x,''),p)).rows};try{const root=new URL('../netlify/database/migrations/',import.meta.url);for(const f of (await readdir(root)).filter(x=>!x.includes('0002_assign')).sort())await pg.exec(await readFile(new URL(f,root),'utf8'));const user={id:id(),role:'member'},buyer={id:id(),role:'member'},admin={id:id(),role:'admin'};for(const u of [user,buyer,admin]){await pg.query('INSERT INTO users(id,login,name,password_hash,role) VALUES($1,$2,$2,$2,$3)',[u.id,u.id,u.role]);await pg.query('INSERT INTO demo_wallets(user_id,balance_kopecks) VALUES($1,10000000)',[u.id]);}await rentalCheckout(db,user,{id:1,months:1,key:id()});await fn({pg,db,user,buyer,admin})}finally{await pg.close()}}
test('purchase → staff receipt → supplies; repeated receipt and cancellation cannot duplicate stock or refunds',()=>fixture(async({pg,db,user,admin,buyer})=>{
 const call=(u,a,b)=>marketAPI(db,u,a,b,'POST');const order=await call(user,'market-checkout',{key:id(),items:[{id:'0-0-0',qty:2}],delivery:'На грядку — имитация',plot:1});
 assert.equal((await pg.query('SELECT * FROM supply_stock')).rows.length,0);
 await assert.rejects(call(buyer,'market-transition',{id:order.id,stage:'packing',report:'Тестовая комплектация'}));
 await call(admin,'market-transition',{id:order.id,stage:'packing',report:'Тестовая комплектация'});
 await call(admin,'market-transition',{id:order.id,stage:'received',report:'Тестовое получение семян'});await call(admin,'market-transition',{id:order.id,stage:'received',report:'Повторный запрос получения'});
 assert.equal((await pg.query('SELECT * FROM supply_stock')).rows.length,1);
 const cancel=await call(user,'market-checkout',{key:id(),items:[{id:'0-0-0',qty:1}],delivery:'Самовывоз — имитация'});
 const before=Number((await pg.query('SELECT balance_kopecks FROM demo_wallets WHERE user_id=$1',[user.id])).rows[0].balance_kopecks);
 for(let i=0;i<2;i++)await call(user,'market-transition',{id:cancel.id,stage:'cancelled',report:'Отменён до комплектации'});
 assert.equal(Number((await pg.query('SELECT balance_kopecks FROM demo_wallets WHERE user_id=$1',[user.id])).rows[0].balance_kopecks),before+9000);
}));
test('autocare schedule creates one included work order and demo charities are clearly classified',()=>fixture(async({pg,db,user,admin})=>{
 await lifecycleAPI(db,user,'life-subscribe',{kind:'autocare',key:id()},'POST');
 const call=(u,a,b)=>journeyAPI(db,u,'journey-'+a,b,'POST');
 const s=await call(admin,'schedule',{plot:1,service:'inspect',due:new Date(Date.now()+86400000).toISOString(),reason:'Проверить состояние почвы перед выбором посадок'});
 await assert.rejects(call(user,'schedule-order',{id:s.id}));
 const order=await call(admin,'schedule-order',{id:s.id});assert.equal((await call(admin,'schedule-order',{id:s.id})).id,order.id);
 const o=(await pg.query('SELECT * FROM work_orders WHERE id=$1',[order.id])).rows[0];assert.equal(o.price_kopecks,0);assert.equal(o.is_simulation,true);
 const chars=(await pg.query('SELECT * FROM charity_board WHERE is_demo')).rows;assert.equal(chars.length,10);assert.equal(chars.filter(x=>x.recipient_kind==='person').length,5);
 assert.equal((await pg.query('SELECT * FROM storage_locations WHERE capacity_grams IS NULL')).rows.length,2);
}));
test('harvest replay is idempotent; buyer receives source quality without seller private data',()=>fixture(async({pg,db,user,buyer,admin})=>{
 const cy=await seasonAPI(db,admin,'season-cycle',{plot:1,crop:'Томат',family:'Паслёновые',start:new Date().toISOString().slice(0,10),conditions:'Тестовый подтверждённый план посадок'},'POST');
 const body={cycle:cy.id,key:id(),grams:1000};const batch=await seasonAPI(db,user,'season-partial',body,'POST');assert.equal((await seasonAPI(db,user,'season-partial',body,'POST')).id,batch.id);
 await lifecycleAPI(db,admin,'life-batch-verify',{id:batch.id,storage:'pantry',expires:new Date(Date.now()+86400000).toISOString(),conditions:'Подтверждены условия тестового хранения'},'POST');
 await harvestAPI(db,admin,'quality-assess',{id:batch.id,values:Object.fromEntries(['condition','ripeness','handling','traceability'].map(k=>[k,{score:80,evidence:'Подтверждено по тестовой приёмке'}]))},'POST');
 await lifecycleAPI(db,user,'life-subscribe',{kind:'storage',key:id()},'POST');await lifecycleAPI(db,user,'life-listing',{batch:batch.id,grams:500,price:10000},'POST');
 const listing=(await pg.query('SELECT id FROM produce_listings')).rows[0];await seasonAPI(db,buyer,'season-buy',{id:listing.id,key:id()},'POST');
 const child=(await pg.query('SELECT id FROM harvest_batches WHERE owner_id=$1',[buyer.id])).rows[0];const passport=await harvestAPI(db,buyer,'passport',{id:child.id},'POST');assert.equal(passport.rating.score,80);assert.equal(passport.origin.transfers,1);assert.deepEqual(passport.rating.missing,[]);assert(!JSON.stringify(passport.origin).includes(user.id));
}));
test('supply offer reserves material, purchase transfers once and another buyer cannot replay it',()=>fixture(async({pg,db,user,buyer,admin})=>{
 await seasonAPI(db,user,'season-supply',{name:'Семена',unit:'пакет',quantity:5},'POST');const s=(await pg.query('SELECT id FROM supply_stock WHERE owner_id=$1',[user.id])).rows[0];
 const offer=await journeyAPI(db,user,'journey-supply-offer',{id:s.id,quantity:2,price:1000},'POST');
 await assert.rejects(seasonAPI(db,user,'season-consume',{id:s.id,plot:1,quantity:4,reason:'Расход',key:id()},'POST'));
 const body={id:offer.id,key:id()};await journeyAPI(db,buyer,'journey-supply-buy',body,'POST');await journeyAPI(db,buyer,'journey-supply-buy',body,'POST');
 assert.equal(Number((await pg.query('SELECT balance FROM supply_stock WHERE id=$1',[s.id])).rows[0].balance),3);
 assert.equal(Number((await pg.query('SELECT balance FROM supply_stock WHERE owner_id=$1',[buyer.id])).rows[0].balance),2);
 await assert.rejects(journeyAPI(db,admin,'journey-supply-buy',{...body,key:id()},'POST'));
}));
test('planting reserves purchased supplies and cancellation releases them without consuming',()=>fixture(async({pg,db,user,admin})=>{
 const {operations}=await import('../netlify/lib/operations.mjs');await pg.query("UPDATE plots SET growing_state='ready' WHERE id=1");await pg.query("UPDATE services SET enabled=true WHERE code='plant'");
 await operations(db,admin,'care-plan-save',{plot:1,waterGap:240,feedGap:4320,instructions:'Подтверждённый план посадки в тестовой базе'},'POST');
 await seasonAPI(db,admin,'season-cycle',{plot:1,crop:'Томат',family:'Паслёновые',start:new Date().toISOString().slice(0,10),conditions:'Тестовая посадка'},'POST');
 await seasonAPI(db,user,'season-supply',{name:'Полученные семена',unit:'пакет',quantity:2},'POST');const s=(await pg.query('SELECT id FROM supply_stock WHERE owner_id=$1',[user.id])).rows[0];
 await assert.rejects(operations(db,user,'order-create',{plot:1,service:'plant',key:id()},'POST'));
 const {order}=await operations(db,user,'order-create',{plot:1,service:'plant',key:id(),supply:s.id,quantity:1},'POST');assert.equal(Number((await pg.query('SELECT reserved FROM supply_stock WHERE id=$1',[s.id])).rows[0].reserved),1);
 await operations(db,user,'order-update',{id:order.id,to:'cancelled',reason:'Отмена до начала посадки'},'POST');const result=(await pg.query('SELECT balance,reserved FROM supply_stock WHERE id=$1',[s.id])).rows[0];assert.equal(Number(result.balance),2);assert.equal(Number(result.reserved),0);
}));
test('delivery quote needs customer consent, payment replays once and cancellation refunds once',()=>fixture(async({pg,db,user,admin})=>{
 const batch=id();await pg.query("INSERT INTO harvest_batches(id,owner_id,plot_id,crop,harvested_on,received_grams,balance_grams,verified,expires_at) VALUES($1,$2,1,'Томаты',current_date,1000,1000,true,now()+interval '3 days')",[batch,user.id]);
 await lifecycleAPI(db,user,'life-facility',{city:'krasnodar',kind:'delivery',accepted:true,version:'demo-delivery-1',signature:'Test'},'POST');const d=await lifecycleAPI(db,user,'life-delivery',{key:id(),kind:'home',recipient:'Тест',address:'Тестовый адрес',contact:'Тестовый контакт',items:[{id:batch,grams:500}]},'POST');
 const call=(u,a,b)=>journeyAPI(db,u,'journey-'+a,b,'POST');await call(admin,'delivery-quote',{id:d.id,price:25000,expected:new Date(Date.now()+86400000).toISOString(),conditions:'Адрес проверен, упаковка и условия перевозки согласованы'});
 await assert.rejects(call(user,'delivery-pay',{id:d.id,version:0}));
 const before=Number((await pg.query('SELECT balance_kopecks FROM demo_wallets WHERE user_id=$1',[user.id])).rows[0].balance_kopecks);
 await call(user,'delivery-pay',{id:d.id,version:1});await call(user,'delivery-pay',{id:d.id,version:1});assert.equal(Number((await pg.query('SELECT balance_kopecks FROM demo_wallets WHERE user_id=$1',[user.id])).rows[0].balance_kopecks),before-25000);
 await lifecycleAPI(db,user,'life-delivery-update',{id:d.id,status:'cancelled'},'POST');await assert.rejects(lifecycleAPI(db,user,'life-delivery-update',{id:d.id,status:'cancelled'},'POST'));
 assert.equal(Number((await pg.query('SELECT balance_kopecks FROM demo_wallets WHERE user_id=$1',[user.id])).rows[0].balance_kopecks),before);
}));
