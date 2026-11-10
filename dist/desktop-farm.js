/* Wide strategy scene. The same farm objects, links and camera controls remain in use. */
function desktopFarmLayout(count,width,height){
 const sceneWidth=Math.max(1000,Math.min(2560,width-40)),district=Math.round(Math.min(340,Math.max(280,width*.22))),availableWidth=sceneWidth-district-76,availableHeight=Math.max(330,height-250);
 const columns=Math.max(3,Math.min(10,Math.ceil(Math.sqrt((count+1)*availableWidth/availableHeight)))),rows=Math.ceil((count+1)/columns);
 const cellHeight=Math.max(158,Math.min(260,availableHeight/Math.max(2,rows)));
 return {width:sceneWidth,district,columns,cellHeight};
}
const mapBeforeDesktop=farmMap;
farmMap=function(){const html=mapBeforeDesktop();if(!matchMedia('(min-width: 1000px)').matches)return html;const layout=desktopFarmLayout(cityPlots().length,innerWidth,innerHeight);return html.replace(/style="width:\d+px"/,`style="width:${layout.width}px;--desktop-district:${layout.district}px;--desktop-columns:${layout.columns};--desktop-cell-height:${layout.cellHeight}px"`)};
farmViews.add(()=>{
 if(!matchMedia('(min-width: 1000px)').matches||location.hash!=='#home')return;
 const world=document.querySelector('.farm-world');if(!world)return;
 const plots=cityPlots(),ripe=plots.filter(p=>bedPresentation(p).growing_state==='harvest_ready').length;
 world.insertAdjacentHTML('afterbegin',`<div class="desktop-estate-title"><span>FARM–OFF · ЖИВОЕ ХОЗЯЙСТВО</span><h1>Ваш маленький мир</h1><p>${plots.length} грядок${ripe?' · '+ripe+' готовы к сбору':''}</p></div><div class="desktop-estate-grove" aria-hidden="true"><img src="art/tree.svg" alt=""><img src="art/tree.svg" alt=""><img src="art/tree.svg" alt=""></div>`);
 const assets=['market-building-v2','house','warehouse','truck'];world.querySelectorAll('.farm-map-objects .farm-building:not(.facility-empty) img').forEach((img,i)=>{img.src='art/'+assets[i]+'.svg'});
 desktopFarmScenery(world,plots.length);
 const v=world.closest('.farm-camera-viewport'),s=world.closest('.farm-camera-scene');if(v&&s){const layout=desktopFarmLayout(plots.length,innerWidth,innerHeight);s.style.width=layout.width+'px';s.style.setProperty('--desktop-district',layout.district+'px');s.style.setProperty('--desktop-columns',layout.columns);s.style.setProperty('--desktop-cell-height',layout.cellHeight+'px')}
});
let desktopFarmResizeFrame=0,desktopFarmWasWide=matchMedia('(min-width: 1000px)').matches;
addEventListener('resize',()=>{cancelAnimationFrame(desktopFarmResizeFrame);desktopFarmResizeFrame=requestAnimationFrame(()=>{
 const wide=matchMedia('(min-width: 1000px)').matches;if(wide!==desktopFarmWasWide){desktopFarmWasWide=wide;if(!modal.open)render();return}
 if(!wide||location.hash!=='#home')return;const scene=document.querySelector('.farm-camera-scene');if(!scene)return;
 const layout=desktopFarmLayout(cityPlots().length,innerWidth,innerHeight);scene.style.width=layout.width+'px';scene.style.setProperty('--desktop-district',layout.district+'px');scene.style.setProperty('--desktop-columns',layout.columns);scene.style.setProperty('--desktop-cell-height',layout.cellHeight+'px');desktopFarmScenery(scene.querySelector('.farm-world'),cityPlots().length);farmCameraZoom=null;fitFarmCamera();
})});

function desktopFarmScenery(world,count){world.querySelectorAll('.desktop-landscape').forEach(el=>el.remove());
 const grid=world.querySelector('.farm-parcels'),layoutForDecor=desktopFarmLayout(count,innerWidth,innerHeight),empty=(layoutForDecor.columns-(count+1)%layoutForDecor.columns)%layoutForDecor.columns;
 if(grid)for(let i=0;i<empty;i++)grid.insertAdjacentHTML('beforeend',`<div class="desktop-landscape" aria-hidden="true">${i%2?'<img src="art/tree.svg" alt=""><img src="art/tree.svg" alt=""><img src="art/tree.svg" alt="">':'<svg viewBox="0 0 240 180"><ellipse cx="120" cy="110" rx="87" ry="44" fill="#729953"/><ellipse cx="120" cy="103" rx="82" ry="41" fill="#d2c397"/><ellipse cx="120" cy="100" rx="72" ry="33" fill="#6ba5a0"/><ellipse cx="120" cy="96" rx="66" ry="28" fill="#88beb0"/><path d="M73 98q19-7 36 0m19 12q17-7 36 0" stroke="#daeed0" stroke-width="3" fill="none"/><ellipse cx="145" cy="88" rx="12" ry="5" fill="#f7f0cc"/><circle cx="153" cy="82" r="5" fill="#f7f0cc"/><path d="M157 82h7l-7 3" fill="#d8a450"/><g stroke="#618b4b" stroke-width="4"><path d="M48 108V77m0 15L38 82m10 14 10-15M187 114V85m0 14 10-12"/></g><g fill="#e6d58d"><ellipse cx="48" cy="75" rx="4" ry="10"/><ellipse cx="187" cy="83" rx="4" ry="10"/></g></svg>'}</div>`);
}
