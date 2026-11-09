import {scrypt as rawScrypt,randomBytes,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(rawScrypt);
export const hashToken=t=>createHash('sha256').update(t).digest('hex');
export function text(v,max=200){return typeof v==='string'?v.trim().slice(0,max):''}
export function loginName(v){const s=text(v,40).toLowerCase();if(!/^[a-z0-9_-]{3,40}$/.test(s))throw Error('Логин: 3–40 латинских букв, цифр, _ или -');return s}
export async function passwordHash(p){if(typeof p!=='string'||p.length<12||p.length>128)throw Error('Пароль: от 12 до 128 символов');let salt=randomBytes(16).toString('hex');return salt+':'+Buffer.from(await scrypt(p,salt,64)).toString('hex')}
export async function verify(p,stored){if(typeof p!=='string'||p.length>128)return false;const [salt,h]=stored.split(':');const a=Buffer.from(h,'hex'),b=Buffer.from(await scrypt(p,salt,64));return a.length===b.length&&timingSafeEqual(a,b)}
export function canManage(user,plot){return user.role==='admin'||plot.owner_id===user.id}
export function safeCamera(value){if(!value)return '';const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)throw Error('Камера: нужен HTTPS-адрес без логина и пароля');return u.href}

export function emailLogin(value){const s=String(value||'').trim().toLowerCase();if(s.length>254||!/^([^\s@]+)@([^\s@.]+\.)+[^\s@.]{2,}$/.test(s)||s.split('@')[0].length>64||s.includes('..'))throw Error('Введите корректную электронную почту, например name@example.com');return s}
export function accountLogin(value,registration=false){return registration||String(value||'').includes('@')?emailLogin(value):loginName(value)}
