const compactUpgradeGroups=[
 {id:'borders',icon:'🪵',name:'Бортики',hint:'Дерево и бетон',items:['wood','concrete']},
 {id:'water',icon:'💧',name:'Полив',hint:'Автоматическая забота',items:['drip']},
 {id:'plants',icon:'🌿',name:'Для растений',hint:'Опоры и мульча',items:['trellis']},
 {id:'shelter',icon:'🏡',name:'Укрытия',hint:'Парник и теплица',items:['cover','tunnel','greenhouse']},
 {id:'sign',icon:'🏷️',name:'Моя табличка',hint:'Название грядки',items:[]}
];
function compactUpgradeBack(id,group){return `<button type="button" class="upgrade-mini-back" onclick="compactUpgrades(${id}${group?",'"+group+"'":''})">← ${group?'К вариантам':'Все категории'}</button>`}
async function compactUpgrades(id,group=''){
 const p=myPlots().find(p=>Number(p.id)===Number(id));if(!p)return;
 if(group==='sign'){sign(id);return}
 if(!lifeData){modalForm('Улучшим вашу грядку','<div class="upgrade-loading" role="status">🌿 Загружаем варианты…</div>',()=>{});const box=document.querySelector('.upgrade-loading'),uid=account?.id;await loadLife();if(!box?.isConnected||account?.id!==uid)return;if(!lifeData){toast('Не удалось загрузить улучшения. Попробуйте ещё раз.');return}}
 const selected=compactUpgradeGroups.find(g=>g.id===group);
 if(!selected){modalForm('Улучшим вашу грядку',`<div class="upgrade-mini-context">Грядка №${id} · ${esc(p.size)} м²</div><div class="upgrade-category-grid">${compactUpgradeGroups.map(g=>`<button type="button" onclick="compactUpgrades(${id},'${g.id}')"><span>${g.icon}</span><b>${g.name}</b><small>${g.hint}</small></button>`).join('')}</div>`,()=>{});return}
 const rows=selected.items.map(key=>{const u=bedUpgrades.find(u=>u.id===key);if(!u)return '';const reason=upgradeBlocked(u,bedPresentation(p));return `<button type="button" class="upgrade-mini-option" ${reason?'disabled':''} onclick="compactUpgradeDetail(${id},'${u.id}','${group}')"><span>${u.icon}</span><div><b>${esc(u.name)}</b><small>${esc(reason||'≈ '+upgradePrice(u,p).toLocaleString('ru-RU')+' демо-₽ · с монтажом')}</small></div><em>${reason?'🔒':'›'}</em></button>`}).join('');
 const extras=group==='plants'?`<button type="button" class="upgrade-mini-option" onclick="compactUpgradeRequest(${id},'mulch','🍂','Мульча','plants')"><span>🍂</span><div><b>Мульча</b><small>Материал и цену подберёт садовник</small></div><em>›</em></button>`:'';
 modalForm(selected.name,`${compactUpgradeBack(id)}<div class="upgrade-mini-options">${rows}${extras}</div>`,()=>{});
}
function compactUpgradeDetail(id,key,group){const p=myPlots().find(p=>Number(p.id)===Number(id)),u=bedUpgrades.find(u=>u.id===key);if(!p||!u)return;const reason=upgradeBlocked(u,bedPresentation(p));if(reason){toast(reason);return}const requestKey=crypto.randomUUID();
 formAsync(u.name,`${compactUpgradeBack(id,group)}<div class="upgrade-detail-symbol">${u.icon}</div><div class="upgrade-detail-price">≈ ${upgradePrice(u,p).toLocaleString('ru-RU')} <small>демо-₽</small></div><p class="upgrade-detail-description">${esc(u.description)}</p><p class="upgrade-detail-note">Материалы и монтаж включены в предварительный расчёт. Ферма подтвердит цену и срок. Сейчас без списания.</p><details class="upgrade-wishes"><summary>Добавить пожелание</summary><textarea name="notes" maxlength="400" aria-label="Пожелания к установке"></textarea></details><button class="btn upgrade-send">Заказать установку</button>`,async f=>{
 const current=myPlots().find(x=>Number(x.id)===Number(id));if(!current)throw Error('Грядка недоступна');const blocked=upgradeBlocked(u,bedPresentation(current));if(blocked)throw Error(blocked);
 await api('life-request',{plot:id,kind:u.kind,catalog_id:u.id,key:requestKey,details:`[Улучшение: ${u.id}] ${u.name}. Площадь ${current.size} м². Предварительная демо-смета ${upgradePrice(u,current)} ₽, материалы и монтаж. Требует согласования. ${f.get('notes')||''}`});await loadLife();modal.close();toast('Заявка на установку отправлена. Ферма согласует цену и срок.');
 });
}
function compactUpgradeRequest(id,kind,icon,title,group){const key=crypto.randomUUID();formAsync(title,`${compactUpgradeBack(id,group)}<div class="upgrade-detail-symbol">${icon}</div><p class="upgrade-detail-description">Садовник подберёт подходящий вариант и согласует с вами цену и срок.</p><button class="btn upgrade-send">Отправить пожелание</button>`,async()=>{await api('life-request',{plot:id,kind,key,details:title+' для грядки. Прошу подобрать вариант, согласовать стоимость и сроки.'});await loadLife();modal.close();toast('Пожелание отправлено садовнику.')})}
const bedOpenBeforeCompactUpgrades=bedJourneyOpen;
bedJourneyOpen=function(id,tab){if(tab==='build'){compactUpgrades(id);return}bedOpenBeforeCompactUpgrades(id,tab)};
