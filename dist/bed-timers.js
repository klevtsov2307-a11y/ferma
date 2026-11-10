/* Work deadlines are not completion events. Only accepted reports show a check. */
function bedWorkIndicator(plot,orders,now=Date.now()){
 const rows=orders.filter(o=>Number(o.plot_id)===Number(plot.id)&&o.status!=='cancelled').sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
 const active=rows.find(o=>o.status!=='done');
 if(active){const o=active,deadline=Date.parse(o.finish_by),seconds=Math.ceil((deadline-now)/1000);
  if(o.status==='review')return {id:o.id,kind:'review',icon:'📋',title:'Работа выполнена',detail:'Проверяем отчёт',label:o.title};
  if(['requested','quoted','awaiting_payment'].includes(o.status))return {id:o.id,kind:'waiting',icon:'🕒',title:o.status==='quoted'?'Согласуйте сроки':o.status==='awaiting_payment'?'Ожидает оплаты':'В очереди',detail:'Срок уточняется',label:o.title};
  if(!Number.isFinite(deadline))return {id:o.id,kind:'waiting',icon:'🕒',title:'Срок уточняется',detail:'Задача у садовника',label:o.title};
  if(seconds<=0)return {id:o.id,kind:'late',icon:'⌛',title:'Ждём подтверждения',detail:'Срок задачи наступил',label:o.title};
  return {id:o.id,kind:o.status==='working'?'working':'queued',icon:o.status==='working'?'👩‍🌾':o.status==='on_way'?'🚶':'⏳',title:`${Math.floor(seconds/3600)}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`,detail:o.status==='working'?'Садовник работает':o.status==='on_way'?'Садовник идёт':'До выполнения',label:o.title};
 }
 const last=rows[0];if(last&&['plant','plant_package'].includes(last.service_code)&&['planted','growing'].includes(plot.growing_state))return {id:last.id,kind:'done',icon:'✓',title:'Посажено',detail:'Теперь ждём всходов и роста',label:last.title};
 return null;
}
function paintBedIndicators(){if(!account||!opsData)return;const plots=myPlots();document.querySelectorAll('.farm-parcel[data-plot]').forEach(el=>{const p=plots.find(x=>Number(x.id)===Number(el.dataset.plot));if(!p)return;const indicator=bedWorkIndicator(p,opsData.orders||[]);let badge=el.querySelector('.bed-work-badge');if(!indicator){badge?.remove();el.classList.remove('has-work-badge');return}if(!badge){badge=document.createElement('span');badge.className='bed-work-badge';badge.innerHTML='<span class="bed-work-icon"></span><span><strong></strong><small></small></span>';el.append(badge)}el.classList.add('has-work-badge');badge.dataset.kind=indicator.kind;badge.title=indicator.label+' · '+indicator.title+' · '+indicator.detail;badge.setAttribute('aria-label',badge.title);badge.querySelector('.bed-work-icon').textContent=indicator.icon;badge.querySelector('strong').textContent=indicator.title;badge.querySelector('small').textContent=indicator.detail;});
 const p=currentRoomPlot();if(p){const indicator=bedWorkIndicator(p,opsData.orders||[]);let box=document.querySelector('.bed-room-indicator');if(!indicator){box?.remove();return}if(!box){box=document.createElement('div');box.className='bed-room-indicator';const hub=document.querySelector('.bed-hub-live');if(hub)hub.append(box);else document.querySelector('.room-hero')?.insertAdjacentElement('afterend',box)}box.dataset.kind=indicator.kind;box.textContent=`${indicator.icon} ${indicator.title} · ${indicator.detail}`;}
}
farmViews.add(paintBedIndicators);
setInterval(()=>{if(!document.hidden)paintBedIndicators()},1000);
let bedIndicatorPolling=false;
async function refreshBedIndicators(){if(bedIndicatorPolling||!account||document.hidden||modal.open||document.querySelector('.field-menu')||!(/^#bed-\d+$/.test(location.hash)||location.hash==='#home'||!location.hash))return;const userId=account.id;bedIndicatorPolling=true;try{const [nextOps,nextCloud]=await Promise.all([api('ops'),api('state')]);if(account?.id!==userId||nextCloud.user?.id!==userId)return;const changed=JSON.stringify(nextOps.orders)!==JSON.stringify(opsData?.orders)||JSON.stringify(nextCloud.plots)!==JSON.stringify(cloud?.plots);opsData=nextOps;cloud=nextCloud;if(changed&&!modal.open&&!document.querySelector('.field-menu'))render();else paintBedIndicators()}catch{/* Keep last confirmed data; never infer success from a failed refresh. */}finally{bedIndicatorPolling=false}}
setInterval(refreshBedIndicators,15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshBedIndicators()});
