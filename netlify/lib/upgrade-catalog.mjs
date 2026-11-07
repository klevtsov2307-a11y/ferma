export const upgradeCatalog = [
 {id:'wood',name:'Деревянные бортики',kind:'wood_border',price:4000,icon:'🪵',basis:'perimeter',description:'Бортики с монтажом. Расчёт по периметру грядки.'},
 {id:'concrete',name:'Бетонный бордюр',kind:'concrete_border',price:12000,icon:'🧱',basis:'perimeter',description:'Основание и бордюр с монтажом. Расчёт по периметру.'},
 {id:'drip',name:'Автополив',kind:'drip',price:5500,icon:'💧',basis:'area',description:'Линия, фильтр и таймер. Ферма проверит источник воды.'},
 {id:'trellis',name:'Шпалера',kind:'trellis',price:2500,icon:'🌿',basis:'area',description:'Опоры, сетка и установка для ваших растений.'},
 {id:'cover',name:'Укрытие грядки',kind:'cover',price:3500,icon:'🏡',basis:'area',description:'Дуги, укрывной материал и монтаж.'}
];
export function estimateUpgrade(item,plot){
 const area=Number(plot.size);if(!Number.isFinite(area)||area<=0)throw Error('Неизвестная площадь грядки');
 // Existing plots are sold as 1 × N metres; retain this assumption explicitly in the quote.
 const ratio=item.basis==='perimeter'?(2*(1+area))/8:area/3;
 const setup=500;return {version:1,amount_kopecks:Math.round((setup+(item.price-setup)*Math.max(1,ratio))*100),basis:item.basis,area,width:1,length:area,setup_kopecks:setup*100,provisional:true};
}
