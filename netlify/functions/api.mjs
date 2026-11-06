import {walletAPI} from '../lib/wallet.mjs';
import {harvestAPI} from '../lib/harvest.mjs';
import {operations,RuleError,transaction} from '../lib/operations.mjs';
import {getDatabase} from '@netlify/database';
import {randomUUID,randomBytes} from 'node:crypto';
import {hashToken,text,loginName,passwordHash,verify,canManage,safeCamera} from '../lib/domain.mjs';
export const config={path:'/api/*'};
const response=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store',...extra}});
const cookie=(token,age)=>`farm_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${age}`;
export default async function(request,context){
 const url=new URL(request.url),action=url.pathname.replace('/api/','');
 if(!['GET','POST'].includes(request.method))return response({error:'Метод недоступен'},405);
 if(request.method==='POST'&&request.headers.get('origin')!==url.origin)return response({error:'Недопустимый источник запроса'},403);
 let b={};if(request.method==='POST'){if(Number(request.headers.get('content-length')||0)>16384)return response({error:'Слишком большой запрос'},413);try{const raw=await request.text();if(raw.length>16384)return response({error:'Слишком большой запрос'},413);b=JSON.parse(raw)}catch{return response({error:'Неверный формат'},400)}}
 let db;try{db=getDatabase()}catch{return response({error:'Общая база ещё не подключена. Используй деморежим.',code:'SETUP_REQUIRED'},503)}
 try{
 if(action==='health'){await db.sql`SELECT id FROM plots LIMIT 1`;return response({ok:true,database:true})}
 if(['register','login'].includes(action)&&request.method==='POST'){
 const key=hashToken((context.ip||'unknown')+':'+action),limit=await db.sql`INSERT INTO rate_limits(key,reset_at) VALUES(${key},now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.reset_at<now() THEN 1 ELSE rate_limits.count+1 END,reset_at=CASE WHEN rate_limits.reset_at<now() THEN now()+interval '15 minutes' ELSE rate_limits.reset_at END RETURNING count`;
 if(limit[0].count>15)return response({error:'Слишком много попыток. Попробуй через 15 минут.'},429);
 const login=loginName(b.login);let u;
 if(action==='register'){const ph=await passwordHash(b.password),name=text(b.name,60)||login;const rows=await db.sql`INSERT INTO users(id,login,name,password_hash) VALUES(${randomUUID()},${login},${name},${ph}) ON CONFLICT(login) DO NOTHING RETURNING id,login,name,role`;if(!rows.length)return response({error:'Этот логин уже занят'},409);u=rows[0]}
 else{const rows=await db.sql`SELECT * FROM users WHERE login=${login}`;u=rows[0];const dummy='00000000000000000000000000000000:'+('00'.repeat(64));if(!await verify(b.password,u?.password_hash||dummy)||!u)return response({error:'Неверный логин или пароль'},401)}
 const token=randomBytes(32).toString('hex');await db.sql`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(${hashToken(token)},${u.id},now()+interval '7 days')`;return response({user:{id:u.id,name:u.name,login:u.login,role:u.role}},200,{'set-cookie':cookie(token,604800)})}
 const token=request.headers.get('cookie')?.match(/(?:^|;\s*)farm_session=([a-f0-9]{64})(?:;|$)/)?.[1];let user;
 if(token){const rows=await db.sql`SELECT u.id,u.name,u.login,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=${hashToken(token)} AND s.expires_at>now()`;user=rows[0]}
 if(action==='me')return response({user:user||null});
 if(!user)return response({error:'Войди в аккаунт'},401);
 if(action==='logout'&&request.method==='POST'){await db.sql`DELETE FROM sessions WHERE token_hash=${hashToken(token)}`;return response({ok:true},200,{'set-cookie':cookie('',0)})}
 const staff=['farmer','admin'].includes(user.role);
 const walletResult=await walletAPI(db,user,action,b,request.method);if(walletResult!==null)return response(walletResult);
 const harvestResult=await harvestAPI(db,user,action,b,request.method);if(harvestResult!==null)return response(harvestResult);
 const op=await operations(db,user,action,b,request.method);if(op!==null)return response(op);
 if(action==='logout-all'&&request.method==='POST'){await db.sql`DELETE FROM sessions WHERE user_id=${user.id}`;return response({ok:true},200,{'set-cookie':cookie('',0)})}
 if(action==='state'&&request.method==='GET'){
 const plots=await db.sql`SELECT id,name,size,status,crop,sign,version,owner_id,growing_state FROM plots ORDER BY id`;const records=staff?await db.sql`SELECT * FROM records ORDER BY created_at DESC LIMIT 1000`:await db.sql`SELECT * FROM records WHERE owner_id=${user.id} OR kind='listing' ORDER BY created_at DESC LIMIT 1000`;
 return response({user,plots:plots.map(p=>({...p,name:p.owner_id===user.id||staff?p.name:'Грядка №'+p.id,crop:p.owner_id===user.id||staff?p.crop:'',sign:p.owner_id===user.id||staff?p.sign:'',mine:p.owner_id===user.id,owner_id:undefined})),records})}
 if(action==='claim'&&request.method==='POST'){
 return response(await transaction(db,async c=>{const id=Number(b.id);const rows=await c.query("UPDATE plots SET owner_id=$1,status='reserved',version=version+1 WHERE id=$2 AND status='available' AND owner_id IS NULL RETURNING id",[user.id,id]);if(!rows.rows.length)throw new RuleError('Участок уже занят или ещё не открыт фермером');await c.query("INSERT INTO rentals(id,plot_id,user_id,starts_at,status,terms) VALUES($1,$2,$3,now(),'requested',$4)",[randomUUID(),id,user.id,'Предварительное закрепление. Цена и срок аренды требуют отдельного согласования.']);await c.query('INSERT INTO audit(user_id,action,entity) VALUES($1,$2,$3)',[user.id,'reserve',String(id)]);return {ok:true}}))}

 if(action==='plot'&&request.method==='POST'){
 const rows=await db.sql`SELECT * FROM plots WHERE id=${Number(b.id)}`;const p=rows[0];if(!p||!canManage(user,p))return response({error:'Нет доступа к грядке'},403);
 const name=text(b.name,60)||p.name,sign=text(b.sign,40),crop=text(b.crop,60);const updated=await db.sql`UPDATE plots SET name=${name},sign=${sign},crop=${crop},version=version+1 WHERE id=${p.id} AND version=${Number(b.version)} RETURNING id`;return updated.length?response({ok:true}):response({error:'Грядка изменилась. Обнови страницу.'},409)}
 if(action==='camera'&&request.method==='GET'){const rows=await db.sql`SELECT * FROM plots WHERE id=${Number(url.searchParams.get('id'))}`;const p=rows[0];if(!p||!canManage(user,p))return response({error:'Нет доступа'},403);return response({url:p.camera_url||null})}
 if(action==='configure-plot'&&request.method==='POST'){
 if(!staff)return response({error:'Нужна роль фермера'},403);const camera=safeCamera(b.camera);const result=await db.sql`UPDATE plots SET camera_url=${camera},status=CASE WHEN owner_id IS NULL THEN ${b.available?'available':'unavailable'} ELSE status END,version=version+1 WHERE id=${Number(b.id)} RETURNING id`;return response({ok:!!result.length})}
 if(action==='record'&&request.method==='POST'){
 const kind=b.kind;if(!['task','note','planting','harvest','delivery','listing'].includes(kind))return response({error:'Неизвестная запись'},400);
 const plot=Number(b.plot)||null;if(plot){const rows=await db.sql`SELECT * FROM plots WHERE id=${plot}`;if(!rows[0]||!canManage(user,rows[0]))return response({error:'Нет доступа к грядке'},403)}
 const title=text(b.title,120);if(!title)return response({error:'Добавь название'},400);const data={title,description:text(b.description,600),date:text(b.date,10),status:kind==='task'?'new':'saved',amount:Math.max(0,Math.min(1000000,Number(b.amount)||0)),category:text(b.category,40)};
 await db.sql`INSERT INTO records(id,owner_id,kind,plot_id,data) VALUES(${randomUUID()},${user.id},${kind},${plot},${JSON.stringify(data)}::jsonb)`;return response({ok:true})}
 if(action==='complete-task'&&request.method==='POST'){if(!staff)return response({error:'Нужна роль фермера'},403);await db.sql`UPDATE records SET data=jsonb_set(data,'{status}','"done"'),updated_at=now() WHERE id=${b.id}::uuid AND kind='task'`;return response({ok:true})}
 return response({error:'Маршрут не найден'},404);
 }catch(e){if(e instanceof RuleError)return response({error:e.message},e.status);if(e.code==='23505')return response({error:'Уже есть активная работа на участке или исполнитель занят. Обнови список.'},409);console.error('API failure',e.code||e.name);return response({error:e.message?.startsWith('Пароль:')||e.message?.startsWith('Логин:')||e.message?.startsWith('Камера:')?e.message:'Не удалось выполнить действие. Повтори позже.'},400)}
}
