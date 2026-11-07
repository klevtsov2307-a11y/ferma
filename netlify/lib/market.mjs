import {randomUUID} from 'node:crypto';
import {demoCatalog} from './market-catalog.mjs';
import {RuleError,transaction} from './operations.mjs';
const requireValue=(ok,message)=>{if(!ok)throw new RuleError(message,400)};
export function marketItems(items){
 requireValue(Array.isArray(items)&&items.length>0&&items.length<=150,'В корзине должно быть от 1 до 150 товаров');
 requireValue(new Set(items.map(x=>x?.id)).size===items.length,'Товар повторяется в корзине');
 return items.map(x=>{const p=demoCatalog.find(p=>p.id===x?.id);requireValue(p&&Number.isInteger(x.qty)&&x.qty>=1&&x.qty<=99,'Проверьте товар и количество');return {id:p.id,name:p.name,unit:p.unit,price:p.price,qty:x.qty,rent:p.rent}});
}
export async function marketAPI(db,user,action,b,method){
 if(!['market-orders','market-checkout'].includes(action))return null;
 return transaction(db,async c=>{const q=async(s,p=[])=>(await c.query(s,p)).rows;
 if(action==='market-orders'&&method==='GET')return {orders:await q('SELECT id,items,amount_kopecks,delivery,status,created_at FROM demo_market_orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[user.id])};
 requireValue(action==='market-checkout'&&method==='POST','Недоступный метод');
 requireValue(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(b.key||''),'Неверный номер запроса');
 const items=marketItems(b.items),amount=items.reduce((n,x)=>n+x.price*x.qty*100,0);
 requireValue(amount<=100000000,'Слишком большая корзина');
 requireValue(['Доставка домой — имитация','Самовывоз — имитация','На грядку — имитация'].includes(b.delivery),'Выберите получение');
 await q('INSERT INTO demo_wallets(user_id) VALUES($1) ON CONFLICT DO NOTHING',[user.id]);
 const wallet=(await q('SELECT * FROM demo_wallets WHERE user_id=$1 FOR UPDATE',[user.id]))[0];
 const existing=(await q('SELECT id FROM demo_market_orders WHERE user_id=$1 AND request_key=$2',[user.id,b.key]))[0];if(existing)return existing;
 requireValue(Number(wallet.balance_kopecks)>=amount,'Недостаточно демосредств. Пополните баланс в профиле.');
 const prefs=(await q('SELECT monthly_limit FROM farm_preferences WHERE user_id=$1',[user.id]))[0];
 const spent=Number((await q("SELECT COALESCE(sum(amount_kopecks),0) n FROM demo_wallet_entries WHERE user_id=$1 AND kind IN ('payment','subscription','rental','purchase') AND created_at>=date_trunc('month',now())",[user.id]))[0].n);
 requireValue(!prefs?.monthly_limit||spent+amount<=prefs.monthly_limit,'Превышен месячный лимит');
 const id=randomUUID();await q('INSERT INTO demo_market_orders(id,user_id,request_key,items,amount_kopecks,delivery) VALUES($1,$2,$3,$4,$5,$6)',[id,user.id,b.key,JSON.stringify(items),amount,b.delivery]);
 await q('UPDATE demo_wallets SET balance_kopecks=balance_kopecks-$1 WHERE user_id=$2',[amount,user.id]);
 await q("INSERT INTO demo_wallet_entries(id,user_id,kind,amount_kopecks,request_key) VALUES($1,$2,'purchase',$3,$4)",[randomUUID(),user.id,amount,b.key]);return {id};
 });
}
