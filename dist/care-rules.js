// Generated shared care rules.
const allowedStates={"inspect":["unchecked","empty","ready","planted","growing","harvest_ready","finished"],"prepare":["unchecked","empty","finished"],"plant":["ready"],"water":["planted","growing","harvest_ready"],"feed":["planted","growing"],"loosen":["planted","growing"],"hill":["growing"],"weed":["planted","growing","harvest_ready"],"harvest":["harvest_ready"]};
function serviceReason(code,plot,plan,last,now=Date.now()){
 const state=plot.rental_simulation&&plot.demo_growing_state?plot.demo_growing_state:plot.growing_state;
 if(!allowedStates[code]?.includes(state))return code==='prepare'?'Подготовка почвы доступна только без растущих посадок':code==='plant'?'Сначала нужна готовая к посадке почва':'Для этого действия нужна подходящая стадия выращивания';
 if(['plant','water','feed','loosen','hill'].includes(code)&&!plan)return 'Сначала управляющий должен утвердить план ухода';
 const gap=code==='water'?plan?.water_gap_minutes:code==='feed'?plan?.feed_gap_minutes:0;
 if(gap&&last&&now-new Date(last).getTime()<gap*60000)return 'Повторная операция пока ограничена планом ухода. Запросите осмотр';
 return '';
}
