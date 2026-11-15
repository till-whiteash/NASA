"""Real-browser regression for full HD launch, captions, skip and in-game handoff.
Run after complete_earth_launch.py has supplied launch_earth-hd.mp4 and captions.
"""
from pathlib import Path
import argparse,functools,http.server,json,re,sys,threading,os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'game/animation/trailer/scripts'))
from game_session import Quiet,open_game
# HTML video seeks need byte ranges; Python's stock SimpleHTTPRequestHandler ignores them.
original_head=Quiet.send_head
original_copy=Quiet.copyfile
def range_head(self):
    self.byte_range=None
    path=Path(self.translate_path(self.path))
    m=re.fullmatch(r'bytes=(\d+)-(\d*)',self.headers.get('Range',''))
    if not m or not path.is_file():return original_head(self)
    total=path.stat().st_size;start=int(m[1]);end=min(int(m[2]) if m[2] else total-1,total-1)
    if start> end:self.send_error(416);return None
    f=path.open('rb');f.seek(start);self.byte_range=end-start+1
    self.send_response(206);self.send_header('Content-Type',self.guess_type(str(path)))
    self.send_header('Accept-Ranges','bytes');self.send_header('Content-Range',f'bytes {start}-{end}/{total}')
    self.send_header('Content-Length',str(self.byte_range));self.end_headers();return f
def range_copy(self,source,output):
    if self.byte_range is None:return original_copy(self,source,output)
    left=self.byte_range
    try:
        while left:
            data=source.read(min(65536,left))
            if not data:break
            output.write(data);left-=len(data)
    except (ConnectionResetError,BrokenPipeError):pass
Quiet.send_head=range_head;Quiet.copyfile=range_copy
ap=argparse.ArgumentParser();ap.add_argument('--out',type=Path,required=True);ap.add_argument('--full-flow',action='store_true');a=ap.parse_args();a.out.mkdir(parents=True,exist_ok=True)
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
head=(ROOT/'game/index.html').read_text(encoding='utf-8').split('</head>')[0]+'</head>'
fixture=head+'''<body><script type="module">import {playCinematic} from './src/cinematic.js';
window.testWorld={keys:{forward:true},cinematic:false,cinematicVideo:false};
window.runFilm=()=>{window.result=null;window.skipped=false;playCinematic('launch_earth',{world:testWorld,onSkip:()=>window.skipped=true}).then(r=>window.result=r)};
</script></body></html>'''
results={};errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True,args=['--use-angle=d3d11'])
    page=browser.new_page(viewport={'width':1920,'height':1080})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/game/launch-check.html',lambda r:r.fulfill(status=200,content_type='text/html',body=fixture))
    page.goto(base+'/game/launch-check.html',wait_until='networkidle');page.wait_for_function('!!window.runFilm');page.evaluate('runFilm()')
    page.wait_for_function("document.querySelector('video')?.readyState>=2")
    page.wait_for_selector('.cinematic.cine-playing')
    results['media']=page.evaluate("()=>{let v=document.querySelector('video');v.pause();window.resumeFilm=v.play.bind(v);v.play=()=>Promise.resolve();return {duration:v.duration,width:v.videoWidth,height:v.videoHeight,src:v.currentSrc}}")
    assert results['media']['width']==1920 and results['media']['height']==1080
    assert abs(results['media']['duration']-56)<.1
    print('MEDIA',results['media'],flush=True)
    for t,name,caption in [(24.5,'booster-release','BOOSTER'),(26.5,'boosters-clear','BOOSTER'),(28,'karman-line','100 KM'),(31.5,'tower-release','TOWER'),(41,'core-separated','CORE'),(49.5,'upper-stage','UPPER'),(55,'earth-orbit','ORBIT')]:
        page.evaluate('(t)=>{const v=document.querySelector("video");v.currentTime=t}',arg=t)
        try:page.wait_for_function('(t)=>{const v=document.querySelector("video");return !v.seeking&&Math.abs(v.currentTime-t)<.1}',arg=t)
        except Exception:
            print('VIDEO STATE',page.evaluate('()=>{const v=document.querySelector("video");return {t:v.currentTime,seeking:v.seeking,ready:v.readyState,seekable:Array.from({length:v.seekable.length},(_,i)=>[v.seekable.start(i),v.seekable.end(i)]),error:v.error?.message}}'),flush=True);raise
        page.wait_for_function('(s)=>document.querySelector(".cine-phase")?.textContent.includes(s)',arg=caption)
        assert page.evaluate('window.result===null'),'The full film ended before its last shot'
        page.screenshot(path=str(a.out/(name+'.png')))
        print('FRAME',name,flush=True)
    page.evaluate('document.querySelector("video").currentTime=55.8;document.querySelector("video").play=window.resumeFilm;document.querySelector("video").play()')
    page.wait_for_function('window.result===true');page.wait_for_timeout(500)
    assert page.evaluate('!testWorld.cinematic&&!testWorld.cinematicVideo&&!testWorld.keys.forward')
    results['naturalEnd']=True
    page.evaluate('runFilm()');page.wait_for_selector('.cine-skip');page.keyboard.press('Escape');page.wait_for_function('window.result===true&&window.skipped');page.wait_for_timeout(500)
    assert page.locator('.cinematic').count()==0
    results['escape']=True
    page.set_viewport_size({'width':390,'height':844});page.evaluate('runFilm()');page.wait_for_function('document.querySelector("video")?.readyState>=2')
    page.wait_for_selector('.cinematic.cine-playing')
    page.evaluate('document.querySelector("video").pause();document.querySelector("video").play=()=>Promise.resolve();document.querySelector("video").currentTime=28')
    page.wait_for_function('!document.querySelector("video").seeking')
    page.wait_for_function('document.querySelector(".cine-phase")?.textContent.includes("100 KM")');page.screenshot(path=str(a.out/'karman-phone.png'))
    box=page.locator('.cine-cap').bounding_box();assert box['x']>=0 and box['x']+box['width']<=391
    page.click('.cine-skip');page.wait_for_function('window.skipped');results['phoneAndButtonSkip']=True
    browser.close()
    if a.full_flow:
        browser,page=open_game(p,w=1280,h=720)
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.wait_for_function("document.querySelector('.cinematic:not(.cine-out) video')?.currentSrc.includes('launch_earth')",timeout=120000)
        page.wait_for_function("document.querySelector('.cinematic:not(.cine-out) video')?.readyState>=2")
        page.evaluate("document.querySelector('.cinematic:not(.cine-out) video').currentTime=22.8;document.querySelector('.cinematic:not(.cine-out) video').playbackRate=4")
        page.wait_for_function("document.querySelector('.cinematic:not(.cine-out) video')?.currentTime>25",timeout=15000)
        assert page.evaluate("!game.launch && document.querySelector('.cinematic:not(.cine-out) video').currentSrc.includes('launch_earth')")
        page.wait_for_function("document.querySelector('.cinematic:not(.cine-out) video')?.currentTime>32",timeout=15000)
        assert page.evaluate('!game.launch'),'Legacy renderer was instantiated at separation'
        page.evaluate("document.querySelector('.cinematic:not(.cine-out) video').currentTime=55.7")
        page.wait_for_function("!document.querySelector('.cinematic:not(.cine-out) video[src*=launch_earth]')",timeout=15000)
        page.wait_for_function("!!document.querySelector('.cine-loop video') || !!document.querySelector('.cinematic video[src*=mars_approach]')",timeout=120000)
        results['actualMissionHandoff']=True;browser.close()
assert not errors,errors
(a.out/'launch-browser-results.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
print(json.dumps(results,indent=2));server.shutdown()
