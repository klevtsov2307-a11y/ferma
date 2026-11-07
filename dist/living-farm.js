/* Original Farm-off artwork and interaction. No third-party game assets. */
function cropDrawing(crop,state){
 const mature=state==='harvest_ready',young=state==='planted';
 const type=/томат|помидор/i.test(crop)?'tomato':/огур/i.test(crop)?'cucumber':/морков/i.test(crop)?'carrot':/баклаж/i.test(crop)?'eggplant':'leaf';
 const fruit=type==='tomato'?'<circle cx="15" cy="25" r="6" fill="#e85d3d"/><circle cx="32" cy="20" r="5" fill="#ff8251"/>':type==='cucumber'?'<ellipse cx="15" cy="25" rx="4" ry="10" fill="#376f31"/>':type==='carrot'?'<path d="M16 27 L27 27 L21 43Z" fill="#f28b33"/>':type==='eggplant'?'<ellipse cx="16" cy="28" rx="6" ry="9" fill="#76518e"/>':'<ellipse cx="22" cy="29" rx="14" ry="10" fill="#85b850"/>';
 return `<svg viewBox="0 0 44 48" aria-hidden="true"><ellipse cx="22" cy="43" rx="15" ry="4" fill="#273f282b"/><g transform="${young?'translate(10 19) scale(.55)':'translate(0 0)'}"><path d="M22 42 Q25 24 22 9" fill="none" stroke="#466f32" stroke-width="3"/><path d="M22 29 Q3 29 5 12 Q20 12 22 29Z" fill="#639c43"/><path d="M23 20 Q25 3 39 7 Q39 22 23 20Z" fill="#8fba55"/>${mature?fruit:''}</g></svg>`
}
function dressFarm(){
 document.querySelectorAll('.farm-parcel[onclick^="farmBedMenu"]').forEach(el=>{
 const id=Number(el.getAttribute('onclick').match(/\d+/)[0]),p=myPlots().find(x=>x.id===id);if(!p)return;
 el.dataset.plot=id;el.dataset.stage=p.growing_state||'unchecked';
 const crops=el.querySelector('.parcel-crops');if(crops&&['planted','growing','harvest_ready'].includes(p.growing_state))crops.innerHTML=Array.from({length:9},()=>`<i>${cropDrawing(p.crop||'',p.growing_state)}</i>`).join('');
 if(lifeData?.requests?.some(r=>Number(r.plot_id)===id&&r.kind==='cover'&&r.status==='done'))el.querySelector('.parcel-land').insertAdjacentHTML('beforeend','<span class="confirmed-cover" aria-label="Укрытие установлено"></span>');
 });
}
function closeFieldMenu(restore=false){const panel=document.querySelector('.field-menu'),id=panel?.dataset.plot;panel?.remove();document.querySelectorAll('.selected-parcel').forEach(e=>{e.classList.remove('selected-parcel');e.setAttribute('aria-expanded','false')});if(restore&&id)document.querySelector(`[data-plot="${id}"].farm-parcel`)?.focus()}
farmBedMenu=function(id){
 const p=myPlots().find(x=>x.id===id);if(!p)return;
 closeFieldMenu();const el=document.querySelector(`.farm-parcel[data-plot="${id}"]`);el?.classList.add('selected-parcel');el?.setAttribute('aria-expanded','true');
 const panel=document.createElement('section');panel.className='field-menu';panel.dataset.plot=id;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Действия с грядкой '+p.name);
 const primary=({unchecked:['inspect','🔎','Осмотреть'],empty:['prepare','🪏','Подготовить'],finished:['prepare','🪏','Подготовить'],ready:['plant','🌱','Посадить'],planted:['water','💧','Полить'],growing:['water','💧','Полить'],harvest_ready:['harvest','🧺','Собрать']})[p.growing_state]||['inspect','🔎','Осмотреть'];
 panel.innerHTML=`<div class="field-menu-head"><div><small>ГРЯДКА №${id} · ${p.size} М²</small><h2>${esc(p.name)}</h2></div><button class="field-close" aria-label="Закрыть действия" onclick="closeFieldMenu(true)">×</button></div><p>${esc(growingLabels[p.growing_state]||'Нужен осмотр')}${p.crop?' · '+esc(p.crop):''}</p><div class="field-tools">${roomService(p,...primary,'Работу выполнит садовник')}${[['grow','🌿','Уход'],['build','🏡','Обустройство'],['camera','📹','Камера'],['harvest','🧺','Урожай'],['activity','📋','Ход работ']].map(([tab,icon,title])=>`<button onclick="closeFieldMenu();openFarmBed(${id},'${tab}')"><span>${icon}</span><b>${title}</b></button>`).join('')}</div><small class="field-menu-note">Стоимость в демосредствах. Перед заказом — подтверждение.</small>`;
 document.body.append(panel);
 if(innerWidth>700&&el){const r=el.getBoundingClientRect();panel.style.left=Math.max(12,Math.min(innerWidth-372,r.right+12))+'px';panel.style.top=Math.max(70,Math.min(innerHeight-panel.offsetHeight-110,r.top))+'px'}
 panel.querySelector('.field-close').focus();
};
addEventListener('keydown',e=>{if(e.key==='Escape')closeFieldMenu(true)});
addEventListener('hashchange',()=>closeFieldMenu());
addEventListener('resize',()=>closeFieldMenu());
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.field-menu,.farm-parcel,dialog'))closeFieldMenu()});
const beforeLivingRender=render;render=function(){closeFieldMenu();beforeLivingRender();dressFarm()};render();
