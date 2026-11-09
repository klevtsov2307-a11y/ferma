/* Dialog feedback belongs in the top layer, never behind its backdrop. */
toast=function(message){
 const text=String(message||'Не удалось выполнить действие. Попробуйте ещё раз.');
 if(!modal.open){const notice=document.querySelector('#toast');notice.replaceChildren(document.createTextNode(text));notice.style.display='block';const close=document.createElement('button');close.type='button';close.textContent='Понятно';close.onclick=()=>notice.style.display='none';notice.append(close);return}
 let box=document.querySelector('#fields .action-feedback');
 if(!box){box=document.createElement('div');box.className='action-feedback';box.setAttribute('role','alert');box.tabIndex=-1;document.querySelector('#fields').prepend(box)}
 box.innerHTML=`<p>${esc(text)}</p>${/недостаточно|не хватает/i.test(text)?'<button type="button" class="btn" onclick="modal.close();location.hash=\'#wallet\';walletForm(\'topup\')">＋ Пополнить демобаланс</button>':''}${/уже есть работа|списке задач/i.test(text)?'<button type="button" class="btn" onclick="modal.close();location.hash=\'#orders\'">Открыть мои задачи</button>':''}<button type="button" class="btn light" onclick="this.parentElement.remove()">Понятно</button>`;
 box.focus();box.scrollIntoView({block:'nearest'});
};
