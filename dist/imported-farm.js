/* Browser adaptation of assets from ana3stay/3d-farm; see THIRD_PARTY_ASSETS.md. */
function applyImportedFarm(){
 const count=cityPlots().length;
 const homeModel=count>=15?'farm_house_lvl7':count>=5?'farm_house_lvl5':count>=1?'farm_house_lvl2':'farm_house_lvl1';
 const storageActive=!!lifeData&&hasStorage();
 const assets=['farm_lvl3',homeModel,storageActive?'farm_house_lvl5':'farm_house_lvl3'];
 const buildings=document.querySelectorAll('.farm-map-objects .farm-building');
 if(buildings[1])buildings[1].title='Декоративный вид дома зависит от числа ваших грядок. Профиль и финансы';
 if(buildings[2]){buildings[2].querySelector('small').textContent=!lifeData?'Урожай и подписка':storageActive?'Хранение подключено':'Подключить хранение';buildings[2].title='Склад: '+(!lifeData?'загрузка статуса':storageActive?'подписка активна':'подписки нет')}
 document.querySelectorAll('.atlas-pin').forEach((pin,i)=>{if(!pin.querySelector('.atlas-farm-art'))pin.insertAdjacentHTML('afterbegin',`<img class="atlas-farm-art" src="art/imported/${['farm_lvl3','farm_house_lvl5','farm_house_lvl7'][i]}.svg" alt="" aria-hidden="true">`)});
 document.querySelectorAll('.farm-map-objects .farm-building img').forEach((img,i)=>{if(assets[i])img.src='art/imported/'+assets[i]+'.svg'});
 document.querySelectorAll('.farm-village img').forEach((img,i)=>{img.src='art/imported/'+(['farm_house_lvl2','farm_house_lvl5','farm_house_lvl7'][i%3])+'.svg'});
 document.querySelectorAll('.farm-parcel').forEach((el,i)=>{if(el.querySelector('.source-grass'))return;el.insertAdjacentHTML('beforeend',`<img class="source-grass" src="art/imported/grass${i%2+1}.svg" alt="" aria-hidden="true">`)});
 document.querySelectorAll('.farm-parcel[data-stage="harvest_ready"]').forEach(el=>{const p=myPlots().find(p=>p.id===Number(el.dataset.plot));const asset=/морков/i.test(p?.crop||'')?'carrot2':/томат|помидор/i.test(p?.crop||'')?'tomato-single':null;if(asset)el.querySelectorAll('.parcel-crops i').forEach(i=>i.innerHTML=`<img class="source-carrot" src="art/imported/${asset}.svg" alt="">`)});
 document.querySelectorAll('.farm-fence').forEach(el=>{el.innerHTML=Array.from({length:6},()=>'<img src="art/imported/fence.svg" alt="">').join('')});
}
const beforeImportedRender=render;render=function(){beforeImportedRender();applyImportedFarm()};render();
