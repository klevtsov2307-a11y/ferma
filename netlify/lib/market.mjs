import {randomUUID} from 'node:crypto';
import {demoCatalog} from './market-catalog.mjs';
import {RuleError,transaction} from './operations.mjs';
const requireValue=(ok,message)=>{if(!ok)throw new RuleError(message,400)};
export function marketItems(items){
 requireValue(Array.isArray(items)&&items.length>0&&items.length<=150,'В корзине должно быть от 1 до 150 товаров');
 requireValue(new Set(items.map(x=>x?.id)).size===items.length,'Товар повторяется в корзине');
 return items.map(x=>{const p=demoCatalog.find(p=>p.id===x?.id);requireValue(p&&Number.isInteger(x.qty)&&x.qty>=1&&x.qty<=99,'Проверьте товар и количество');return {id:p.id,name:p.name,unit:p.unit,price:p.price,qty:x.qty,rent:p.rent,category:p.category}});
}
export async function marketAPI(db,user,action,b,method){
 if(!['market-orders','market-checkout','market-transition'].includes(action))return null;
 return transaction(db,async c=>{const q=async(s,p=[])=>(await c.query(s,p)).rows;
 if(action==='market-orders'&&method==='GET')return {orders:await q('SELECT id,items,amount_kopecks,delivery,status,stage,plot_id,report,created_at FROM demo_market_orders WHERE user_id=$1 OR $2 ORDER BY created_at DESC LIMIT 100',[user.id,user.role==='admin'])};

 if(action==='market-transition'&&method==='POST'){
 const o=(await q('SELECT * FROM demo_market_orders WHERE id=$1 FOR UPDATE',[b.id]))[0];requireValue(o&&(o.user_id===user.id||user.role==='admin'),'Нет доступа к заказу');
 if(o.stage===b.stage)return {ok:true};
 requireValue(({requested:['packing','cancelled'],packing:['received','cancelled']})[o.stage]?.includes(b.stage),'Переход недоступен');
 requireValue(b.stage==='cancelled'&&o.stage==='requested'||user.role==='admin','Получение подтверждает управляющий');
 requireValue(typeof b.report==='string'&&b.report.trim().length>=10,'Добавьте результат');
 if(b.stage==='cancelled'){
 await q('UPDATE demo_wallets SET balance_kopecks=balance_kopecks+$1 WHERE user_id=$2',[o.amount_kopecks,o.user_id]);
 await q("INSERT INTO demo_wallet_entries(id,user_id,kind,amount_kopecks,request_key) VALUES($1,$2,'refund',$3,$4)",[randomUUID(),o.user_id,o.amount_kopecks,randomUUID()]);
 }
 if(b.stage==='received')for(const item of o.items){
 const product=demoCatalog.find(x=>x.id===item.id);
 if(product?.rent)await q('INSERT INTO market_rentals(id,order_id,owner_id,catalog_id,quantity,condition_report) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),o.id,o.user_id,item.id,item.qty,b.report.trim().slice(0,2000)]);
 if(product&&product.category!=='Овощи'&&!product.rent)await q('INSERT INTO supply_stock(id,owner_id,name,unit,balance,market_order_id,catalog_id,expires_on,lot,variety) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[randomUUID(),o.user_id,product.name,product.unit,item.qty,o.id,item.id,item.details?.expires_on||null,item.details?.lot||null,item.details?.variety||null]);
 }
 const label={packing:'Демо: комплектуется',received:'Демо: получен',cancelled:'Демо: отменён, средства возвращены'}[b.stage];
 await q('UPDATE demo_market_orders SET stage=$1,status=$2,report=$3,updated_at=now() WHERE id=$4',[b.stage,label,b.report.trim().slice(0,2000),o.id]);return {ok:true};
 }
 requireValue(action==='market-checkout'&&method==='POST','Недоступный метод');
 requireValue(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(b.key||''),'Неверный номер запроса');
 const items=marketItems(b.items),amount=items.reduce((n,x)=>n+x.price*x.qty*100,0);
 const details=await q('SELECT * FROM product_details WHERE catalog_id=ANY($1::text[])',[items.map(x=>x.id)]);for(const item of items)item.details=details.find(x=>x.catalog_id===item.id)||null;
 requireValue(amount<=100000000,'Слишком большая корзина');
 requireValue(['Доставка домой — имитация','Самовывоз — имитация','На грядку — имитация'].includes(b.delivery),'Выберите получение');
 await q('INSERT INTO demo_wallets(user_id) VALUES($1) ON CONFLICT DO NOTHING',[user.id]);
 const wallet=(await q('SELECT * FROM demo_wallets WHERE user_id=$1 FOR UPDATE',[user.id]))[0];
 const existing=(await q('SELECT id,items,delivery,plot_id FROM demo_market_orders WHERE user_id=$1 AND request_key=$2',[user.id,b.key]))[0];if(existing){const signature=x=>JSON.stringify(x.map(i=>[i.id,i.qty]).sort((a,b)=>a[0].localeCompare(b[0])));requireValue(signature(existing.items)===signature(items)&&existing.delivery===b.delivery&&String(existing.plot_id||'')===String(b.delivery==='На грядку — имитация'?b.plot:''),'Номер операции уже использован для другого заказа');return {id:existing.id};}
 requireValue(Number(wallet.balance_kopecks)>=amount,'Недостаточно демосредств. Пополните баланс в профиле.');
 const prefs=(await q('SELECT monthly_limit FROM farm_preferences WHERE user_id=$1',[user.id]))[0];
 const spent=Number((await q("SELECT COALESCE(sum(amount_kopecks),0) n FROM demo_wallet_entries WHERE user_id=$1 AND kind IN ('payment','subscription','rental','purchase') AND created_at>=date_trunc('month',now())",[user.id]))[0].n);
 requireValue(!prefs?.monthly_limit||spent+amount<=prefs.monthly_limit,'Превышен месячный лимит');
 if(b.delivery==='На грядку — имитация')requireValue((await q('SELECT id FROM plots WHERE id=$1 AND owner_id=$2',[b.plot,user.id])).length,'Выберите свою грядку для получения');
 const id=randomUUID();await q('INSERT INTO demo_market_orders(id,user_id,request_key,items,amount_kopecks,delivery,plot_id) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,user.id,b.key,JSON.stringify(items),amount,b.delivery,b.delivery==='На грядку — имитация'?b.plot:null]);
 await q('UPDATE demo_wallets SET balance_kopecks=balance_kopecks-$1 WHERE user_id=$2',[amount,user.id]);
 await q("INSERT INTO demo_wallet_entries(id,user_id,kind,amount_kopecks,request_key) VALUES($1,$2,'purchase',$3,$4)",[randomUUID(),user.id,amount,b.key]);return {id};
 });
}
