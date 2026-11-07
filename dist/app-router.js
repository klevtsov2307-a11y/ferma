gameNavIcons.basket='<path d="M3 9h18l-2 12H5ZM7 9l5-7 5 7M9 13v5m6-5v5"/>';
/* One route render and explicit decoration layers. Legacy wrappers remain only for initial script boot. */
let lastFarmRoute='',farmRenderBusy=false;
const farmPages=new Map([
 ['home',()=>account?(selectedFarmCity()==='krasnodar'?farmMap():cloudHome()):emptyFarm()],
 ['rent',emptyFarm],['choose-bed',rent],['market',demoMarketPage],['basket',journeyPage],
 ['orders',ordersPage],['services',servicesPage],['notifications',notificationsPage],['launch',launchPage],
 ['warehouse',warehousePage],['lifecycle',lifecyclePage],['delivery',lifecyclePage],['season',seasonPage],
 ['settings',userProfilePage],['wallet',walletPage],['planner',planner],['journal',journal],['harvest',harvest],['guide',guide],
 ['farmer',()=>account?cloudFarmer():heading('Кабинет садовника','Войдите в свой аккаунт.')],
 ['farms',neighborCities],['animals',()=>heading('Животные появятся позже','Сейчас заботимся о ваших грядках.')]
]);
function decorateFarmIdentity(route){
 if(account&&farmIdentityUser!==account.id&&!farmIdentityLoading)queueMicrotask(loadFarmIdentity);
 if(route.startsWith('farms-')){const city=route.slice(6),map=document.querySelector('.local-discovery'),real=publicFarmList.filter(f=>f.city_id===city);if(map&&real.length){const container=document.createElement('div');container.className='all-farm-pins';real.forEach(f=>container.insertAdjacentHTML('beforeend',realFarmPin(f)));map.querySelectorAll('.farm-map-pin').forEach(pin=>container.append(pin));map.append(container);map.classList.add('has-real-farms');map.querySelector('.map-key').textContent='Хозяйства пользователей и подписанные демо-примеры';}}
 if(route==='settings'&&account)$('#app').insertAdjacentHTML('afterbegin',`<section class="panel"><h2>${esc(ownFarm?.name||'Назовите своё хозяйство')}</h2><p>${ownFarm?.visible?'Хозяйство видно другим пользователям':'Хозяйство скрыто с общей карты'}</p><button class="btn light" onclick="nameMyFarm()">Название и видимость</button></section>`);
 if(account&&farmIdentityUser===account.id&&!ownFarm&&!farmIdentityError&&!farmNameOffered&&!modal.open)queueMicrotask(()=>{if(!modal.open&&!farmNameOffered)nameMyFarm()});
}
function decorateBedRoom(){const p=currentRoomPlot();if(!p)return;
 if(plotRoomTab==='build')document.querySelector('[role=tabpanel]')?.insertAdjacentHTML('afterbegin',upgradeCards(p));
 if(['build','activity'].includes(plotRoomTab)){const requests=(lifeData?.requests||[]).filter(r=>r.plot_id===p.id);if(requests.length)document.querySelector('[role=tabpanel]')?.insertAdjacentHTML('beforeend',`<section class="panel"><h2>Установка и улучшения</h2>${requests.map(r=>`<article class="event"><b>${esc(lifeKinds[r.kind]||'Улучшение')}</b><p>${esc(r.details)}</p><span class="pill">${esc(lifeStatus[r.status]||r.status)}</span><p>${esc(r.report||'Ожидает согласования фермы')}</p>${upgradePaymentCard(r)}${account.role==='admin'?`<button class="btn light" onclick="reviewLifeRequest('${r.id}')">Обновить статус</button>`:''}</article>`).join('')}</section>`);}
}
render=function(){
 if(farmRenderBusy)return;const route=location.hash.slice(1)||'home';if(modal.open&&route===lastFarmRoute)return;farmRenderBusy=true;
 try{
 closeFieldMenu();const active=document.activeElement,focusKey=active?.getAttribute('data-market-search')!==null&&active?.matches('[data-market-search]'),selection=focusKey?active.selectionStart:null;
 let html;const publicMatch=route.match(/^public-([a-f0-9-]{36})-(krasnodar|moscow|petersburg)$/);
 if(/^bed-\d+$/.test(route))html=plotRoom();else if(publicMatch)html=publicVisitPage(publicMatch[1],publicMatch[2]);else if(route.startsWith('farms-'))html=neighborDirectory(route.slice(6));else if(route.startsWith('visit-'))html=visitNeighbor(route.slice(6));else html=(farmPages.get(route)||(()=>heading('Раздел не найден','Вернитесь в хозяйство.')))();
 $('#app').innerHTML=html;lastFarmRoute=route;document.body.classList.add('game-shell','has-game-dock');document.body.classList.toggle('farm-screen',route==='home');applyProfileTheme();statusBanner.textContent='Демо · оплата тестовыми средствами';
 const city=farmLocations.find(c=>c.id===(currentRoomPlot()?.city_id||selectedFarmCity()));document.querySelector('header>span:nth-child(2)').innerHTML=`<button class="city-switch" onclick="chooseFarmCity()" aria-label="Выбрать город. Сейчас ${city.name}">⌖ ${city.name} ⌄</button>`;
 userButton.onclick=profile;userButton.innerHTML=account?`<span class="profile-avatar">${avatarAnimals[profilePrefs().avatar]||'🦊'}</span><span>${esc(account.name)}</span>`:'Войти / регистрация';
 const dock=document.getElementById('game-dock');const current=route.startsWith('farm')||route.startsWith('visit-')||publicMatch?'farms':route==='basket'?'basket':route==='market'?'market':['settings','wallet'].includes(route)?'settings':'home';
 dock.innerHTML=[['home','Хозяйство'],['farms','Карта ферм'],['basket','Корзина'],['market','Маркет'],['settings','Профиль']].map(([key,label])=>`<a href="#${key}" ${key===current?'aria-current="page"':''}>${gameIcon(key)}<span>${label}</span></a>`).join('');
 if(account?.role==='admin'&&['settings','farmer','services','launch','orders'].includes(route))$('#app').insertAdjacentHTML('afterbegin','<div class="actions"><a class="btn light" href="#farmer">Управление фермой</a><a class="btn light" href="#services">Тарифы</a><a class="btn light" href="#orders">Работы</a><a class="btn light" href="#basket">План заботы</a></div>');
 decorateFarmIdentity(route);decorateBedRoom();dressFarm();applyImportedFarm();for(const view of farmViews)view();
 if(route==='home')requestAnimationFrame(()=>{fitFarmCamera();farmCameraObserver?.disconnect();const viewport=document.querySelector('.farm-camera-viewport');if(viewport){farmCameraObserver=new ResizeObserver(fitFarmCamera);farmCameraObserver.observe(viewport)}});
 if(focusKey){const next=document.querySelector('[data-market-search]');next?.focus();next?.setSelectionRange(selection,selection)}
 }finally{farmRenderBusy=false}
};
render();
