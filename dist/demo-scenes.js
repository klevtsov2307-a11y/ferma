/* Explicit visual previews; production crop, equipment and finances remain authoritative. */
function demoGardenScene(p){return p?.mine&&p.demo_scene?.owner_id===account?.id?p.demo_scene:null}
function demoGardenLabel(s){return s.stage==='harvest_ready'?'Урожай созрел':s.stage==='planted'?'Молодые посадки':'Растёт и цветёт'}
function demoGardenEquipment(s){return `${s.border==='concrete'?'🧱 Бетонный бортик':'🪵 Деревянный бортик'}${s.irrigation?' · 💧 Автополив':''}`}
function demoGardenPlants(s,count){return Array.from({length:count},()=>`<i>${cropDrawing(s.crop,s.stage)}${s.stage==='growing'?'<span class="demo-flower">✿</span>':''}</i>`).join('')}
function demoGardenDress(){
 for(const p of myPlots()){
  const s=demoGardenScene(p);if(!s)continue;
  const el=document.querySelector(`.farm-parcel[data-plot="${p.id}"]`);if(!el)continue;
  el.classList.remove('bare-soil');el.classList.add('has-plants','demo-garden');el.dataset.stage=s.stage;el.dataset.border=s.border;
  el.setAttribute('aria-label',`${p.name}: ${s.crop}, ${demoGardenLabel(s)}. ${demoGardenEquipment(s)}. Демонстрация`);
  const land=el.querySelector('.parcel-land');if(land)land.innerHTML=illustratedGarden(s,p.id);
  const status=el.querySelector('.parcel-status');if(status)status.innerHTML=`<b>${esc(s.crop)}</b><span class="scene-stage ${s.stage==='harvest_ready'?'scene-ripe':''}">${s.stage==='harvest_ready'?'✦ Готово к сбору':s.stage==='planted'?'🌱 Молодые посадки':'🌼 Растёт'}</span><small>${demoGardenEquipment(s)}</small>`;

 }
 const id=Number(location.hash.match(/^#bed-(\d+)$/)?.[1]),p=myPlots().find(p=>p.id===id),s=demoGardenScene(p);if(!s)return;
 const hero=document.querySelector('.room-hero');if(!hero)return;
 hero.classList.add('demo-room');hero.dataset.border=s.border;
 const soil=hero.querySelector('.room-soil');if(soil)soil.innerHTML=illustratedGarden(s,'room-'+id);
 hero.querySelector('h1')?.insertAdjacentHTML('afterend',`<div class="demo-scene-description"><h2>${esc(s.crop)} · ${demoGardenLabel(s)}</h2><p>${demoGardenEquipment(s)}</p><span class="pill">Демо-сценарий</span><p>Так будет выглядеть оборудованная грядка. Посадки и улучшения здесь показаны для примера.</p></div>`);
 const baseCrop=hero.querySelector(':scope > div > p');if(baseCrop)baseCrop.hidden=true;
 const baseState=hero.querySelector(':scope > div > .pill');if(baseState)baseState.hidden=true;
 if(plotRoomTab==='build')document.querySelector('[role=tabpanel]')?.insertAdjacentHTML('afterbegin',`<section class="panel demo-installed"><h2>В этом демопримере установлено</h2><p>${demoGardenEquipment(s)}</p><p>Без списаний и фиктивных актов монтажа. Настоящие улучшения заказываются ниже.</p></section>`);
 if(plotRoomTab==='harvest')document.querySelector('[role=tabpanel]')?.insertAdjacentHTML('afterbegin',`<section class="panel demo-installed"><h2>${s.stage==='harvest_ready'?'🧺 Урожай на рисунке созрел':'🌱 Урожай ещё растёт'}</h2><p>${esc(s.crop)}. Деморисунок не создаёт партию на складе. Фактический сбор подтвердит садовник.</p></section>`);
}
farmViews.add(demoGardenDress);
const baseDemoFieldMenu=farmBedMenu;
farmBedMenu=function(id){baseDemoFieldMenu(id);const s=demoGardenScene(myPlots().find(p=>p.id===id)),panel=document.querySelector('.field-menu');if(s&&panel)panel.querySelector('.field-menu-head')?.insertAdjacentHTML('afterend',`<div class="demo-menu-summary"><b>${esc(s.crop)} · ${demoGardenLabel(s)}</b><p>${demoGardenEquipment(s)}</p><small>Демонстрация оформления. Реальные работы — по плану садовника.</small></div>`)};
