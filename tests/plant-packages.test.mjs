import {test} from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {readFile,readdir} from 'node:fs/promises';import {randomUUID as id} from 'node:crypto';
import {marketAPI} from '../netlify/lib/market.mjs';import {journeyAPI} from '../netlify/lib/journeys.mjs';import {seasonAPI} from '../netlify/lib/season.mjs';import {harvestAPI} from '../netlify/lib/harvest.mjs';import {lifecycleAPI} from '../netlify/lib/lifecycle.mjs';import {rentalCheckout} from '../netlify/lib/rentals.mjs';
async function fixture(fn){const pg=new PGlite(),db={pool:{connect:async()=>({query:(s,p)=>pg.query(s,p),release(){}})},sql:async(s,...p)=>(await pg.query(s.reduce((a,x,i)=>a+(i?'$'+i:'')+x,''),p)).rows};try{const root=new URL('../netlify/database/migrations/',import.meta.url);for(const f of (await readdir(root)).filter(x=>!x.includes('0002_assign')).sort())await pg.exec(await readFile(new URL(f,root),'utf8'));const user={id:id(),role:'member'},buyer={id:id(),role:'member'},admin={id:id(),role:'admin'};for(const u of [user,buyer,admin]){await pg.query('INSERT INTO users(id,login,name,password_hash,role) VALUES($1,$2,$2,$2,$3)',[u.id,u.id,u.role]);await pg.query('INSERT INTO demo_wallets(user_id,balance_kopecks) VALUES($1,10000000)',[u.id]);}await rentalCheckout(db,user,{id:1,months:1,key:id()});await fn({pg,db,user,buyer,admin})}finally{await pg.close()}}

import {plantingAPI,plantingQuote,plantingCrops} from '../netlify/lib/plant-packages.mjs';
import {operations} from '../netlify/lib/operations.mjs';
test('one-click planting charges once, schedules work, blocks occupied plot and refunds cancellation',()=>fixture(async({pg,db,user,admin,buyer})=>{
 const call=(u,a,b)=>plantingAPI(db,u,a,b,'POST');
 const offers=await call(user,'planting-offers',{plot:1});assert.equal(offers.offers.length,6);
 const offer=offers.offers.find(x=>x.id==='radish'),key=id();
 const before=Number((await pg.query('SELECT balance_kopecks FROM demo_wallets WHERE user_id=$1',[user.id])).rows[0].balance_kopecks);
 await assert.rejects(call(buyer,'planting-buy',{plot:1,crop:'radish',price:offer.quote.price,key}));
 await assert.rejects(call(user,'planting-buy',{plot:1,crop:'radish',price:1,key}));
 const {order}=await call(user,'planting-buy',{plot:1,crop:'radish',price:offer.quote.price,key});
 assert.equal(order.status,'queued');assert.equal(order.payment_status,'demo_paid');assert.ok(order.assigned_to);assert.ok(Date.parse(order.finish_by)>Date.now());
 const again=await call(user,'planting-buy',{plot:1,crop:'radish',price:offer.quote.price,key});assert.equal(again.order.id,order.id);
 assert.equal(Number((await pg.query('SELECT balance_kopecks FROM demo_wallets WHERE user_id=$1',[user.id])).rows[0].balance_kopecks),before-offer.quote.price);
 await assert.rejects(call(user,'planting-buy',{plot:1,crop:'dill',price:offer.quote.price,key:id()}));
 await operations(db,user,'order-update',{id:order.id,to:'cancelled'},'POST');
 assert.equal(Number((await pg.query('SELECT balance_kopecks FROM demo_wallets WHERE user_id=$1',[user.id])).rows[0].balance_kopecks),before);
 assert.ok((await pg.query('SELECT ended_on FROM crop_cycles WHERE id=$1',[order.cycle_id])).rows[0].ended_on);
 await call(user,'planting-offers',{plot:1});
 await pg.query('UPDATE demo_wallets SET balance_kopecks=0 WHERE user_id=$1',[user.id]);
 await assert.rejects(call(user,'planting-buy',{plot:1,crop:'radish',price:offer.quote.price,key:id()}));
 assert.equal((await pg.query('SELECT * FROM work_orders')).rows.length,1);
}));
test('prepared beds exclude preparation; larger beds take longer',()=>{
 const c=plantingCrops[0];const a=plantingQuote({size:3,growing_state:'unchecked'},c),b=plantingQuote({size:3,growing_state:'ready'},c),d=plantingQuote({size:7,growing_state:'unchecked'},c);
 assert.equal(a.minutes,60);assert.equal(b.minutes,35);assert.ok(b.price<a.price);assert.ok(d.minutes>a.minutes);
});
