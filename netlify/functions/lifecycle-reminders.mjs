import {getDatabase} from '@netlify/database';
import {lifecycleAlerts} from '../lib/lifecycle.mjs';
export const config={schedule:'0 * * * *'};
export default async()=>{await lifecycleAlerts(getDatabase());return new Response('ok')};
