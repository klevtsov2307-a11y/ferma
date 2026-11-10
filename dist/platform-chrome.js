/* Hide only Netlify's cosmetic pre-launch toolbar, on every device.
   Site access, authentication and application frames are unaffected. */
(()=>{
 const removeToolbar=root=>{
  if(root.nodeType!==1)return;
  if(root.id==='nl-hud-frame'){root.remove();return}
  root.querySelectorAll('#nl-hud-frame').forEach(frame=>frame.remove());
 };
 removeToolbar(document.documentElement);
 new MutationObserver(changes=>{for(const change of changes)for(const node of change.addedNodes)removeToolbar(node)}).observe(document.documentElement,{childList:true,subtree:true});
})();
