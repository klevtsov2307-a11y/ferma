import {randomUUID} from 'node:crypto';
import {RuleError,transaction} from './operations.mjs';
export function farmName(value){if(typeof value!=='string')throw new RuleError('Введите название хозяйства',400);const n=value.trim().replace(/\s+/g,' ');if(n.length<2||n.length>60||/[<>\x00-\x1f]/.test(n))throw new RuleError('Название: от 2 до 60 символов, без разметки',400);return n}
export async function publicFarmAPI(db,user,action,b,method,url){
 if(!['my-farm','farm-directory','farm-view','profile-save'].includes(action))return null;
 return transaction(db,async c=>{const q=async(s,p=[]) =>(await c.query(s,p)).rows;
 if(action==='profile-save'&&method==='POST'){const name=farmName(b.name);return {user:(await q('UPDATE users SET name=$1 WHERE id=$2 RETURNING id,login,name,role',[name,user.id]))[0]}}
 if(action==='my-farm'&&method==='POST'&&typeof b.visible==='boolean'){return {farm:(await q('UPDATE public_farms SET visible=$1,updated_at=now() WHERE user_id=$2 RETURNING id,name,visible',[b.visible,user.id]))[0]||null}}
 if(action==='my-farm'&&method==='POST'){const name=farmName(b.name);return {farm:(await q('INSERT INTO public_farms(id,user_id,name) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET name=EXCLUDED.name,updated_at=now() RETURNING id,name',[randomUUID(),user.id,name]))[0]}}
 if(action==='my-farm'&&method==='GET')return {farm:(await q('SELECT id,name,visible FROM public_farms WHERE user_id=$1',[user.id]))[0]||null};
 if(action==='farm-directory'&&method==='GET')return {farms:await q("SELECT f.id,f.name,p.city_id,count(*)::int AS count,(f.user_id=$1) AS mine FROM public_farms f JOIN plots p ON p.owner_id=f.user_id WHERE (f.visible OR f.user_id=$1) GROUP BY f.id,f.name,f.user_id,p.city_id ORDER BY f.created_at,f.id,p.city_id",[user.id])};
 if(action==='farm-view'&&method==='GET'){const id=url.searchParams.get('id'),city=url.searchParams.get('city');if(!/^[a-f0-9-]{36}$/i.test(id||'')||!['krasnodar','moscow','petersburg'].includes(city))throw new RuleError('Хозяйство не найдено',404);
 const farm=(await q('SELECT id,name,(user_id=$2) AS mine FROM public_farms WHERE id=$1 AND (visible OR user_id=$2)',[id,user.id]))[0];if(!farm)throw new RuleError('Хозяйство не найдено',404);
 const plots=await q('SELECT p.size,p.crop,p.growing_state FROM plots p JOIN public_farms f ON f.user_id=p.owner_id WHERE f.id=$1 AND p.city_id=$2 ORDER BY p.id',[id,city]);if(!plots.length)throw new RuleError('В этом городе у хозяйства пока нет грядок',404);return {farm:{...farm,city},plots};}
 throw new RuleError('Метод недоступен',405);
 });
}
