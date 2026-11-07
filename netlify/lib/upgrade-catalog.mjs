export const upgradeCatalog = [
 {id:'wood',name:'Деревянные бортики',kind:'wood_border',price:4000,icon:'🪵',basis:'perimeter',description:'Бортики с монтажом. Расчёт по периметру грядки.'},
 {id:'concrete',name:'Бетонный бордюр',kind:'concrete_border',price:12000,icon:'🧱',basis:'perimeter',description:'Основание и бордюр с монтажом. Расчёт по периметру.'},
 {id:'drip',name:'Автополив',kind:'drip',price:5500,icon:'💧',basis:'area',description:'Линия, фильтр и таймер. Ферма проверит источник воды.'},
 {id:'trellis',name:'Шпалера',kind:'trellis',price:2500,icon:'🌿',basis:'area',description:'Опоры, сетка и установка для ваших растений.'},
 {id:'tunnel',name:'Парник на грядке',kind:'tunnel',price:9500,icon:'🏕️',basis:'area',description:'Демо-парник: каркас, покрытие и проветривание. Монтаж и нагрузки проверяет ферма.'},
 {id:'greenhouse',name:'Теплица',kind:'greenhouse',price:35000,icon:'🏡',basis:'area',description:'Предварительная демо-смета теплицы. Основание, конструкция и обслуживание требуют отдельного согласования.'},
 {id:'cover',name:'Укрытие грядки',kind:'cover',price:3500,icon:'🏡',basis:'area',description:'Дуги, укрывной материал и монтаж.'}
];
export function estimateUpgrade(item,plot){
 const area=Number(plot.size);if(!Number.isFinite(area)||area<=0)throw Error('Неизвестная площадь грядки');
 // Existing plots are sold as 1 × N metres; retain this assumption explicitly in the quote.
 const measured=Number(plot.width_m)>0&&Number(plot.length_m)>0;const width=measured?Number(plot.width_m):1,length=measured?Number(plot.length_m):area;
 const ratio=item.basis==='perimeter'?(2*(width+length))/8:area/3;
 const setup=500;return {version:1,amount_kopecks:Math.round((setup+(item.price-setup)*Math.max(1,ratio))*100),basis:item.basis,area,width,length,dimensions_confirmed:measured,setup_kopecks:setup*100,provisional:true};
}
