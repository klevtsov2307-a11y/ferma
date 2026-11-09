let atlasCameraObserver;
const atlasCameraSaved=new Map();
function atlasSceneLayout(count,cities=false){const columns=cities?2:Math.max(2,Math.ceil(Math.sqrt(count)));const rows=Math.ceil(Math.max(1,count)/columns);return {columns,rows,width:columns*340+160,height:rows*290+170}}
function decorateAtlasCamera(){
 atlasCameraObserver?.disconnect();const route=location.hash.slice(1),enabled=route==='farms'||/^farms-(krasnodar|moscow|petersburg)$/.test(route);document.body.classList.toggle('atlas-screen',enabled);if(!enabled)return;
 const map=document.querySelector('.discovery-map');if(!map||map.closest('.atlas-camera'))return;
 const cities=route==='farms',pins=[...map.querySelectorAll('.discovery-pin')],layout=atlasSceneLayout(pins.length,cities);
 map.querySelector('.all-farm-pins')?.remove();map.classList.remove('has-real-farms');
 const points=document.createElement('div');points.className='atlas-scene-pins';pins.forEach((pin,i)=>{pin.style.left=(80+170+(i%layout.columns)*340)+'px';pin.style.top=(85+145+Math.floor(i/layout.columns)*290)+'px';pin.classList.remove('point-0','point-1','point-2','farm-point-0','farm-point-1','farm-point-2');points.append(pin)});map.append(points);
 if(cities)pins.forEach(pin=>{const city=pin.hash.slice(7),count=publicFarmList.filter(f=>f.city_id===city).length;pin.querySelector('small').textContent=`${count?count+' хозяйств · ':''}3 демо-примера →`});
 map.style.width=layout.width+'px';map.style.height=layout.height+'px';map.querySelectorAll('.map-region').forEach(el=>el.remove());
 const viewport=document.createElement('div');viewport.className='atlas-camera gesture-map';viewport.tabIndex=0;viewport.setAttribute('aria-label',cities?'Карта городов: приближайте двумя пальцами и перемещайте карту':'Карта хозяйств: приближайте двумя пальцами и перемещайте карту');
 const scene=document.createElement('div');scene.className='farm-camera-scene';scene.style.width=layout.width+'px';scene.append(map);viewport.append(scene);
 const city=cities?null:neighborCity(route.slice(6));const hud=document.createElement('div');hud.className='atlas-camera-hud';hud.innerHTML=`${city?'<a href="#farms">← Города</a>':''}<div><b>${esc(city?.name||'Карта ферм')}</b><small>${cities?'Выберите город':'Выберите хозяйство · '+pins.length+' на карте'}</small></div>`;
 const app=document.querySelector('#app');app.replaceChildren(viewport,hud);
 const c={x:0,y:0,k:1,pointers:new Map(),dragged:false,until:0,ready:false,key:'atlas:'+route};const saved=atlasCameraSaved.get(route);if(saved)Object.assign(c,saved,{ready:true});
 const fit=()=>{const wasOverview=!c.fit||Math.abs(c.k-c.fit)<.0001;c.top=82;c.usableH=Math.max(100,viewport.clientHeight-200);c.fit=Math.max(.02,Math.min(1,(viewport.clientWidth-24)/layout.width,(c.usableH-12)/layout.height));if(!c.ready||wasOverview){c.k=c.fit;c.x=(viewport.clientWidth-layout.width*c.k)/2;c.y=c.top+(c.usableH-layout.height*c.k)/2;c.ready=true}paintFarmCamera(viewport,scene,c)};
 c.reset=()=>{c.ready=false;fit()};installFarmGestures(viewport,scene,c);fit();atlasCameraObserver=new ResizeObserver(fit);atlasCameraObserver.observe(viewport);
 const save=()=>atlasCameraSaved.set(route,{x:c.x,y:c.y,k:c.k});viewport.addEventListener('pointerup',save);viewport.addEventListener('wheel',save,{passive:true});viewport.addEventListener('keyup',save);
}
farmViews.add(decorateAtlasCamera);
