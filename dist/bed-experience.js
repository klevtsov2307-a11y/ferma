/* A single bed journey, driven only by confirmed plot and work states. */
function bedPresentation(p){
 if(Object.prototype.hasOwnProperty.call(p,'preview'))return p;
 const state=p.rental_simulation&&p.demo_growing_state?p.demo_growing_state:p.growing_state;
 const scene=typeof demoGardenScene==='function'?demoGardenScene(p):null;
 const active=['planted','growing','harvest_ready'].includes(state);
 // A confirmed or simulated crop cycle supersedes the old decorative preview.
 if(active)return {...p,growing_state:state,crop:p.crop||scene?.crop||'',preview:false,scene:scene?{...scene,stage:state,crop:p.crop||scene.crop}:typeof lifeData!=='undefined'&&lifeData?.equipment?.some(e=>Number(e.plot_id)===Number(p.id)&&e.condition!=='retired')&&/томат|помид|огур|морков|баклаж/i.test(p.crop||'')?{stage:state,crop:p.crop,border:lifeData.equipment.some(e=>Number(e.plot_id)===Number(p.id)&&e.catalog_id==='concrete'&&e.condition!=='retired')?'concrete':'wood',irrigation:lifeData.equipment.some(e=>Number(e.plot_id)===Number(p.id)&&e.catalog_id==='drip'&&e.condition!=='retired')}:null};
 if(scene)return {...p,growing_state:scene.stage,crop:scene.crop,preview:true,scene};
 return {...p,growing_state:state,preview:false,scene:null};
}
function bedJourneyState(p,orders=[]){
 p=bedPresentation(p);
 const work=orders.find(o=>Number(o.plot_id)===Number(p.id)&&!['done','cancelled'].includes(o.status));
 if(work)return {step:['planted','growing'].includes(p.growing_state)?2:p.growing_state==='harvest_ready'?3:1,icon:'👩‍🌾',title:'Забота уже в пути',text:'Срок и результат работы — ниже. Рост растений не ускоряется от повторных заказов.',action:'activity',button:'Посмотреть работу'};
 const states={unchecked:[0,'🌱','Здесь начнётся ваш урожай','Выберите овощ. В заказ включим семена, посадку и необходимую подготовку.','plant','Выбрать овощи'],empty:[0,'🌱','Что вырастим к столу?','Выберите овощ — покажем полную стоимость посадки.','plant','Выбрать овощи'],ready:[0,'🌱','Почва готова к посадке','Осталось выбрать овощ по фотографии и подтвердить цену.','plant','Выбрать овощи'],planted:[2,'🌱','Посажено. Ждём всходов','Посадка подтверждена. Следите за камерой и согласованным уходом.','camera','Посмотреть грядку'],growing:[2,'🌿','Ваш урожай растёт','Уход — по потребности растений. Готовность к сбору подтвердит садовник.','grow','Позаботиться'],harvest_ready:[3,'🧺','Пора за вашей корзиной!','Закажите сбор. Вес, качество и срок хранения появятся после приёмки урожая.','harvest','Собрать урожай'],finished:[0,'🍂','Время нового урожая','Прошлый цикл завершён. Можно выбрать следующую посадку.','plant','Посадить снова']};
 const s=states[p.growing_state]||[0,'🌱','Уточняем состояние','Откройте ход работ или свяжитесь с садовником.','activity','Посмотреть историю'];return {step:s[0],icon:s[1],title:s[2],text:s[3],action:s[4],button:s[5]};
}
function bedJourneyArt(p){
 const view=bedPresentation(p),scene=view.scene;p=view;const growing=['planted','growing','harvest_ready'].includes(p.growing_state);
 if(scene)return illustratedGarden(scene,'hub-demo-'+p.id);
 if(growing&&/томат|помид|огур|морков|баклаж/i.test(p.crop||''))return illustratedGarden({crop:p.crop,stage:p.growing_state,border:'wood',irrigation:false},'hub-'+p.id);
 return `<div class="bed-hub-soil ${growing?'has-seedlings':''}">${growing?Array.from({length:6},()=>cropDrawing(p.crop,p.growing_state)).join(''):'<span>🌱</span>'}</div>`;
}
function bedJourneyOverview(p){
 p=bedPresentation(p);const state=bedJourneyState(p,opsData?.orders||[]),scene=p.scene,orders=(opsData?.orders||[]).filter(o=>Number(o.plot_id)===Number(p.id)),batches=(batchData||[]).filter(b=>Number(b.plot_id)===Number(p.id)&&b.verified&&Number(b.balance_grams)>0);
 return `<a class="room-back" href="#home">← Моё хозяйство</a><section class="bed-hub"><header class="bed-hub-header"><div><small>ВАША ГРЯДКА · ${esc(p.size)} м²</small><h1>${esc(p.name)}</h1></div><button class="bed-history" onclick="bedJourneyOpen(${p.id},'activity')" aria-label="История работ">📋</button></header><div class="bed-hub-art">${bedJourneyArt(p)}<span class="bed-art-caption">${scene?'Демонстрация оформления':esc(['planted','growing','harvest_ready'].includes(p.growing_state)?p.crop||'Посадки':'Свободная почва')}</span></div><div class="bed-journey-steps" aria-label="Путь урожая">${['Выбор','Работа','Рост','Сбор'].map((label,i)=>`<span class="${i===state.step?'current':i<state.step?'passed':''}" ${i===state.step?'aria-current="step"':''}><i>${i<state.step?'✓':['🌱','🪏','🌿','🧺'][i]}</i>${label}</span>`).join('')}</div><div class="bed-next"><h2>${state.icon} ${state.title}</h2><p>${state.text}</p><button class="btn" onclick="bedJourneyOpen(${p.id},'${state.action}')">${state.button} →</button></div><div class="bed-hub-tools">${[['plant','🌱','Посадить','Овощи по картинкам'],['grow','💧','Уход','Полив и забота'],['build','🛠️','Улучшить','Бортики и полив'],['harvest','🧺','Собрать','Задание садовнику'],['camera','📹','Камера','Посмотреть вживую']].map(([tab,icon,title,desc])=>`<button ${tab==='plant'&&['planted','growing','harvest_ready'].includes(p.growing_state)?'disabled aria-label="Посадить — на грядке уже есть посадки"':''} onclick="bedJourneyOpen(${p.id},'${tab}')"><span>${icon}</span><b>${title}</b><small>${desc}</small></button>`).join('')}</div></section><div class="bed-hub-live"></div>${batches.length?`<section class="panel bed-batches"><h2>🧺 Урожай с этой грядки</h2>${batches.map(b=>`<button class="btn light" onclick="showPassport('${b.id}')">${esc(b.crop)} · ${Number(b.balance_grams)/1000} кг · паспорт →</button>`).join('')}<p>После приёмки можно собрать корзину или продавать урожай с подключённого склада.</p><a class="btn" href="#warehouse">В мой склад</a><button class="btn light" onclick="bedJourneyBasket()">🚚 Корзина домой / подарок</button></section>`:''}${orders.length?`<button class="bed-all-work" onclick="bedJourneyOpen(${p.id},'activity')">📋 Все работы на грядке · ${orders.length} →</button>`:''}`;
}
function bedJourneyOpen(id,tab){
 if(tab==='grow'){simpleBedCare(id);return}if(tab==='harvest'){simpleBedWork(id,'harvest');return}if(tab==='camera'){simpleBedCamera(id);return}
 const original=myPlots().find(p=>Number(p.id)===Number(id));if(!original)return;const p=bedPresentation(original);
 if(tab==='plant'){
  const work=(opsData?.orders||[]).some(o=>Number(o.plot_id)===Number(id)&&!['done','cancelled'].includes(o.status));
  if(work||['planted','growing','harvest_ready'].includes(p.growing_state)){
   modalForm(work?'Сначала завершим текущую работу':'На грядке уже растёт урожай',`<p>${work?'Задача уже у садовника. Новая посадка станет доступна после её завершения.':'Чтобы сохранить посадки, сначала дождитесь созревания и сбора. Для другой культуры можно добавить новую грядку.'}</p><button type="button" class="btn" onclick="modal.close();openFarmBed(${id},'${work?'activity':'harvest'}')">${work?'Посмотреть работу':'Мой урожай'}</button><button type="button" class="btn light" onclick="modal.close()">Вернуться к грядке</button>`,()=>{});return;
  }
  gamePlant(id);return;
 }
 openFarmBed(id,tab);
}
async function bedJourneyBasket(){if(!lifeData){await loadLife();if(!lifeData)return}basketForm()}
const beforeJourneyRoom=plotRoom;
plotRoom=function(){const p=currentRoomPlot();return p&&plotRoomTab==='overview'?bedJourneyOverview(p):beforeJourneyRoom()};
let openingBed=false;
farmBedMenu=function(id){
 if(openingBed)return;const p=myPlots().find(p=>Number(p.id)===Number(id));if(!p)return;
 closeFieldMenu();const el=document.querySelector(`.farm-parcel[data-plot="${id}"]`),v=document.querySelector('.farm-camera-viewport'),s=document.querySelector('.farm-camera-scene'),c=v&&farmCameraStates.get(v);
 if(el&&c&&s){const rect=el.getBoundingClientRect(),view=v.getBoundingClientRect();zoomFarmAt(v,s,c,Math.max(c.k,Math.min(1.25,c.fit*2.5)),rect.x-view.x+rect.width/2,rect.y-view.y+rect.height/2);el.classList.add('selected-parcel')}
 openingBed=true;setTimeout(()=>{openingBed=false;openFarmBed(id,'overview')},matchMedia('(prefers-reduced-motion: reduce)').matches?0:240);
};
farmViews.add(()=>{
 const p=currentRoomPlot();if(!p)return;
 if(plotRoomTab==='overview'){
  document.querySelector('.strategy-room-nav')?.remove();document.querySelector('.demo-scene-description')?.remove();
  const indicator=document.querySelector('.bed-room-indicator'),host=document.querySelector('.bed-hub-live');if(indicator&&host)host.append(indicator);
 }else{document.querySelector('.strategy-room-nav')?.insertAdjacentHTML('afterbegin',`<button onclick="openFarmBed(${p.id},'overview')"><span>🌻</span>Моя грядка</button>`)}
});

addEventListener('hashchange',()=>{if(/^#bed-\d+$/.test(location.hash)){plotRoomTab='overview';render()}});
if(/^#bed-\d+$/.test(location.hash))plotRoomTab='overview';
