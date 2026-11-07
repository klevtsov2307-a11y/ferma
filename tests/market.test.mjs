import {test} from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {readFile,readdir} from 'node:fs/promises';import {randomUUID} from 'node:crypto';import {marketAPI,marketItems} from '../netlify/lib/market.mjs';
test('market uses authoritative prices, isolated orders, one debit per request and rollback on insufficient funds',async()=>{
 const pg=new PGlite(),db={pool:{connect:async()=>({query:(q,p)=>pg.query(q,p),release(){}})}};
 const u={id:randomUUID()},v={id:randomUUID()};
 try{const root=new URL('../netlify/database/migrations/',import.meta.url);for(const f of (await readdir(root)).filter(x=>!x.includes('0002_assign')).sort())await pg.exec(await readFile(new URL(f,root),'utf8'));
 for(const x of [u,v])await pg.query('INSERT INTO users(id,login,name,password_hash) VALUES($1,$2,$2,$2)',[x.id,x.id]);
 await pg.query('INSERT INTO demo_wallets(user_id,balance_kopecks) VALUES($1,50000)',[u.id]);
 const b={key:randomUUID(),delivery:'Доставка домой — имитация',items:[{id:'0-0-0',qty:2,price:1}]};
 const result=await marketAPI(db,u,'market-checkout',b,'POST');assert.equal((await marketAPI(db,u,'market-checkout',b,'POST')).id,result.id);
 assert.equal(Number((await pg.query('SELECT balance_kopecks FROM demo_wallets WHERE user_id=$1',[u.id])).rows[0].balance_kopecks),32000);
 assert.equal((await marketAPI(db,v,'market-orders',{},'GET')).orders.length,0);
 await assert.rejects(marketAPI(db,u,'market-checkout',{...b,key:randomUUID(),items:[{id:'0-0-0',qty:99}]},'POST'));
 assert.equal((await marketAPI(db,u,'market-orders',{},'GET')).orders.length,1);
 assert.throws(()=>marketItems([{id:'0-0-0',qty:-1}]));assert.throws(()=>marketItems([{id:'bogus',qty:1}]));
 }finally{await pg.close()}
});
