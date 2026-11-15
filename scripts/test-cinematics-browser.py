"""Cinematic playback, preloaded clip seek, loop reuse and GPU ownership regressions."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import re, json
ROOT=Path(__file__).resolve().parents[1]
from browser_test_server import start_server
server=start_server()
imports=re.search(r'<script type="importmap">(.*?)</script>',(ROOT/'game/index.html').read_text(encoding='utf-8'),re.S).group(1)
fixture='<base href="/game/"><script type="importmap">'+imports+'</script><link rel="stylesheet" href="style.css">'
names=['ares_vi_briefing','ares_vi_briefing_moon','briefing_mission','briefing_moon','launch_earth','launch_moon','cruise_loop','mars_approach','edl_mars','outpost_26_months','dust_storm','failure_solar_panel','failure_rover_stuck','failure_air_leak','ascent_mars']
try:
 with sync_playwright() as p:
    b=p.chromium.launch(channel='msedge',headless=True)
    page=b.new_page(viewport={'width':1280,'height':720});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/audit.html',lambda r:r.fulfill(body=fixture,content_type='text/html'))
    page.goto(f'http://127.0.0.1:{server.server_port}/audit.html')
    page.evaluate("async()=>{window.cine=await import('./src/cinematic.js');}")
    for name in names:
        page.evaluate("name=>{window.played=cine.playCinematic(name);}",name)
        page.wait_for_function("document.querySelector('.cinematic video')?.currentTime > .3",timeout=30000)
        result=page.evaluate("""async()=>{const v=document.querySelector('.cinematic video'); const q=v.getVideoPlaybackQuality();
          const result={width:v.videoWidth,height:v.videoHeight,frames:q.totalVideoFrames,dropped:q.droppedVideoFrames,active:cine.isCinematicActive()};
          document.querySelector('.cine-skip').click(); await played; await new Promise(r=>setTimeout(r,450));
          result.released=!v.getAttribute('src'); result.idle=!cine.isCinematicActive();return result;}""")
        assert result['width']>0 and result['active'] and result['released'] and result['idle'],result
        print(name,json.dumps(result),flush=True)
    # Preload fully before opening a repair clip; metadata event has already fired.
    page.evaluate("""()=>{const create=document.createElement.bind(document);
      document.createElement=(tag,...args)=>{const el=create(tag,...args);if(tag==='video')window.preloadedVideo=el;return el;};
      try{cine.preloadCinematic('failure_rover_stuck');}finally{document.createElement=create;}}""")
    page.wait_for_function('window.preloadedVideo?.readyState>=1',timeout=15000)
    page.evaluate("()=>{window.played=cine.playCinematic('failure_rover_stuck',{clip:'rover_freed'});}")
    caps=json.loads((ROOT/'game/animation/glb/failure_rover_stuck.captions.json').read_text())
    start=next(c['start'] for c in caps['clips'] if c['name']=='rover_freed')
    page.wait_for_function('(t)=>document.querySelector(".cinematic video")?.currentTime>=t',arg=start,timeout=3000)
    assert page.evaluate('document.querySelector(".cinematic video") === window.preloadedVideo')
    assert page.evaluate('document.querySelector(".cinematic video").currentTime') < start+3
    page.keyboard.press('Escape');page.wait_for_timeout(500)
    print('PRELOADED CLIP SEEK PASS',start,flush=True)
    result=page.evaluate("""async()=>{cine.preloadCinematic('cruise_loop');await new Promise(r=>setTimeout(r,1200));
       const loop=cine.loopCinematic('cruise_loop',document.body),v=document.querySelector('.cine-loop video');
       await new Promise(r=>setTimeout(r,800));const active=cine.isCinematicActive()&&v.currentTime>0;
       loop.stop();loop.stop();return {active,idle:!cine.isCinematicActive(),released:!v.getAttribute('src')};}""")
    assert all(result.values()),result
    print('LOOP CLEANUP PASS',result,flush=True)
    result=page.evaluate("""async()=>{const THREE=await import('three'); const {Launch}=await import('./src/launch.js');
      const {loadModel}=await import('./src/nasamodels.js');let counts=[];
      for(let i=0;i<2;i++){const launch=new Launch();await launch.ready;
        const source=await loadModel('sls.glb');const intact=['core','boosterL','boosterR','upper','las','orion'].every(n=>!!source.scene.getObjectByName(n));
        launch.resumeAtBoosterSeparation(); for(let k=0;k<2200&&!launch.done;k++)launch.update(1/60);
        counts.push({nasa:launch.nasa,intact,done:launch.done});launch.dispose();launch.dispose();
        if(launch.scene.children.length||launch.ownedGeometry.size||launch.ownedMaterials.size)throw Error('launch retained owned resources');}
      return counts;}""")
    assert all(all(r.values()) for r in result),result
    print('LAUNCH REPLAY/CACHE/DISPOSAL PASS',result,flush=True)
    # A failed movie must release the pause and restore an existing cinematic state.
    page.route('**/previews/unavailable-audit-film.mp4',lambda r:r.fulfill(status=404,body=''))
    result=page.evaluate("""async()=>{const world={keys:{KeyW:true},cinematic:true};
      const played=await cine.playCinematic('unavailable-audit-film',{world});
      await new Promise(r=>setTimeout(r,450));
      return {failed:played===false,idle:!cine.isCinematicActive(),restored:world.cinematic===true,keyCleared:!world.keys.KeyW};}""")
    assert all(result.values()),result
    print('FAILED MOVIE CLEANUP PASS',result,flush=True)
    # Clean HD captions should fit a portrait phone, even in an existing desktop session.
    page.set_viewport_size({'width':390,'height':844})
    page.evaluate("()=>{window.played=cine.playCinematic('briefing_mission');}")
    page.wait_for_function('document.querySelector(".cinematic .cine-cap")?.textContent.length>0')
    cap=page.evaluate("""()=>{const c=document.querySelector('.cinematic .cine-cap'),r=c.getBoundingClientRect();
      return {left:r.left,right:r.right,bottom:r.bottom,font:parseFloat(getComputedStyle(c).fontSize)};}""")
    assert cap['left']>=0 and cap['right']<=390 and cap['bottom']<=844 and cap['font']>=16,cap
    page.keyboard.press('Escape');page.wait_for_timeout(450)
    print('PHONE CAPTION PASS',cap,flush=True)
    assert not errors,errors
    b.close()
finally:server.shutdown()
