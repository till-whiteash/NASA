// Pause on GPU/context failure instead of running a broken scene indefinitely.
export function installRenderHealth(canvas,{save,stop}) {
  let failed=false;
  const fail=()=>{
    if(failed)return;failed=true;
    try{stop();}catch(error){console.warn("Could not release controls",error);}
    try{save();}catch(error){console.warn("Could not save interrupted mission",error);}
    const panel=document.createElement('div');panel.id='graphics-recovery';
    panel.style.cssText='position:fixed;inset:0;z-index:10000;background:#101820ed;color:white;display:grid;place-content:center;padding:24px;font:18px system-ui';
    const title=document.createElement('h2');title.textContent='Graphics interrupted';
    const text=document.createElement('p');text.textContent='Restart with lighter graphics to continue from your last save.';
    const retry=document.createElement('button');retry.textContent='Restart with low graphics';
    retry.onclick=()=>{const u=new URL(location.href);u.searchParams.set('graphics','low');if(u.href===location.href)location.reload();else location.assign(u);};
    panel.append(title,text,retry);document.body.append(panel);document.exitPointerLock?.();retry.focus();
  };
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fail();});
  addEventListener('error',e=>{if(e.error)fail();});
  return {get failed(){return failed;}};
}
export function renderRatio(width,height,dpr,quality) {
  const budget=quality==='low'?1280*720:quality==='high'?2560*1440:1920*1080;
  const cap=quality==='low'?1:quality==='high'?2:1.5;
  return Math.min(dpr,cap,Math.sqrt(budget/Math.max(1,width*height)));
}
