/* Browser adaptation of assets from ana3stay/3d-farm; see THIRD_PARTY_ASSETS.md. */
function applyImportedFarm(){
 const assets=['farm_lvl3','farm_house_lvl1','farm_house_lvl3'];
 document.querySelectorAll('.farm-map-objects .farm-building img').forEach((img,i)=>{if(assets[i])img.src='art/imported/'+assets[i]+'.svg'});
 document.querySelectorAll('.farm-village img').forEach((img,i)=>{img.src='art/imported/'+(i===1?'farm_house_lvl3':'farm_house_lvl1')+'.svg'});
 document.querySelectorAll('.farm-parcel').forEach((el,i)=>{if(el.querySelector('.source-grass'))return;el.insertAdjacentHTML('beforeend',`<img class="source-grass" src="art/imported/grass${i%2+1}.svg" alt="" aria-hidden="true">`)});
 document.querySelectorAll('.farm-parcel[data-stage="harvest_ready"]').forEach(el=>{const p=myPlots().find(p=>p.id===Number(el.dataset.plot));if(/морков/i.test(p?.crop||''))el.querySelectorAll('.parcel-crops i').forEach(i=>i.innerHTML='<img class="source-carrot" src="art/imported/carrot2.svg" alt="">')});
 document.querySelectorAll('.farm-fence').forEach(el=>{el.innerHTML=Array.from({length:6},()=>'<img src="art/imported/fence.svg" alt="">').join('')});
}
const beforeImportedRender=render;render=function(){beforeImportedRender();applyImportedFarm()};render();
