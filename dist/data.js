/* Replace this adapter with an authenticated API for production. No private data belongs in localStorage. */
window.FarmData={load(){try{return JSON.parse(localStorage.getItem('farmoff-v1'))}catch{return null}},save(value){localStorage.setItem('farmoff-v1',JSON.stringify(value))}};
