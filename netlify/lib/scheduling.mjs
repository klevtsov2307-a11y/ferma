// All currently supported cities use UTC+3. Shift: 09:00–19:00 local.
export function withinShift(start,end){const a=new Date(+start+3*3600000),b=new Date(+end+3*3600000);return Number.isFinite(+a)&&Number.isFinite(+b)&&+end>+start&&a.toISOString().slice(0,10)===b.toISOString().slice(0,10)&&a.getUTCHours()>=9&&(b.getUTCHours()<19||b.getUTCHours()===19&&b.getUTCMinutes()===0&&b.getUTCSeconds()===0)}
export function laborQuote({minutes,productiveMinutes=420,materials=0,overhead=0,marginMode='markup'}){if(![minutes,productiveMinutes,materials,overhead].every(Number.isFinite)||minutes<=0||productiveMinutes<=0||productiveMinutes>600||materials<0||overhead<0||!['markup','margin'].includes(marginMode))throw Error('Проверьте исходные затраты');const labor=300000*minutes/productiveMinutes,cost=labor+materials+overhead;return {labor_kopecks:Math.round(labor),cost_kopecks:Math.round(cost),price_kopecks:Math.ceil(marginMode==='markup'?cost*1.3:cost/.7),productiveMinutes,marginMode,provisional:true}}
export function careCapacity(entries,candidate,maxCount=8,maxMinutes=100){
 const rows=[...entries,candidate].map(x=>({at:Date.parse(x.due_at),minutes:Number(x.minutes)})).sort((a,b)=>a.at-b.at);const span=30*86400000;
 if(rows.some(x=>!Number.isFinite(x.at)||!Number.isFinite(x.minutes)||x.minutes<=0))return false;
 return rows.every(start=>{const window=rows.filter(x=>x.at>=start.at&&x.at<start.at+span);return window.length<=maxCount&&window.reduce((n,x)=>n+x.minutes,0)<=maxMinutes});
}
