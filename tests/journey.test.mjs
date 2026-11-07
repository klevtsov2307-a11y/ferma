import {test} from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {readFile,readdir} from 'node:fs/promises';import {randomUUID as id} from 'node:crypto';
import {rentalCheckout} from '../netlify/lib/rentals.mjs';import {seasonAPI} from '../netlify/lib/season.mjs';import {lifecycleAPI} from '../netlify/lib/lifecycle.mjs';import {harvestAPI} from '../netlify/lib/harvest.mjs';
test('rehearsal: rental → crop cycle → partial harvest → acceptance → evidence score → home basket → receipt',async()=>{
 const pg=new PGlite();const db={pool:{connect:async()=>({query:(s,p)=>pg.query(s,p),release(){}})},sql:async(strings,...params)=>(await pg.query(strings.reduce((s,x,i)=>s+(i?'$'+i:'')+x,''),params)).rows};
 const user={id:id(),role:'member'},admin={id:id(),role:'admin'};
 try{const root=new URL('../netlify/database/migrations/',import.meta.url);for(const f of (await readdir(root)).filter(x=>!x.includes('0002_assign')).sort())await pg.exec(await readFile(new URL(f,root),'utf8'));
 for(const u of [user,admin])await pg.query('INSERT INTO users(id,login,name,password_hash,role) VALUES($1,$2,$2,$2,$3)',[u.id,u.id,u.role]);
 await pg.query('INSERT INTO demo_wallets(user_id,balance_kopecks) VALUES($1,1000000)',[user.id]);
 await rentalCheckout(db,user,{id:1,months:1,key:id()});
 const cycle=await seasonAPI(db,admin,'season-cycle',{plot:1,crop:'Томаты',family:'Паслёновые',conditions:'Проверочный цикл изолированной тестовой базы',start:new Date().toISOString().slice(0,10)},'POST');
 const batch=await seasonAPI(db,user,'season-partial',{key:id(),cycle:cycle.id,grams:1500},'POST');
 const life=(action,b,u=user)=>lifecycleAPI(db,u,'life-'+action,b,'POST');
 const basket={key:id(),kind:'home',recipient:'Тест',address:'Тестовый адрес',contact:'Тестовый контакт',items:[{id:batch.id,grams:1000}]};
 await assert.rejects(life('delivery',basket));
 await life('batch-verify',{id:batch.id,storage:'pantry',expires:new Date(Date.now()+86400000).toISOString(),conditions:'Условия подтверждены тестовым осмотром'},admin);
 const values=Object.fromEntries(['condition','ripeness','handling','traceability'].map(k=>[k,{score:80,evidence:'Подтверждено тестовыми записями'}]));
 await assert.rejects(harvestAPI(db,user,'quality-assess',{id:batch.id,values},'POST'));
 await harvestAPI(db,admin,'quality-assess',{id:batch.id,values},'POST');
 const passport=await harvestAPI(db,user,'passport',{id:batch.id},'POST');assert.equal(passport.rating.score,80);assert.equal(passport.works.length,0);
 const delivery=await life('delivery',basket);await life('delivery-update',{id:delivery.id,status:'confirmed',expected:new Date(Date.now()+3600000).toISOString()},admin);await life('delivery-update',{id:delivery.id,status:'shipped',packing:'Проверены комплектация, тара и условия перевозки'},admin);await life('delivery-update',{id:delivery.id,status:'delivered'});
 const result=await lifecycleAPI(db,user,'lifecycle',{},'GET');assert.equal(result.deliveries[0].status,'delivered');assert.equal((await pg.query('SELECT balance_grams FROM harvest_batches WHERE id=$1',[batch.id])).rows[0].balance_grams,500);
 }finally{await pg.close()}
});
