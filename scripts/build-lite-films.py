"""Create 720p H.264 copies of the published clean films without changing their timing."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import re, subprocess, json

root=Path(__file__).resolve().parents[1]
source=(root/'game/src/cinematic.js').read_text(encoding='utf-8')
names=re.findall(r"'([^']+)'",re.search(r'const HD_FILMS = new Set\(\[([\s\S]*?)\]\)',source).group(1))
def export(name):
    folder=root/'game/animation/previews'; original=folder/(name+'-hd.mp4'); target=folder/(name+'-lite.mp4')
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(original),'-map','0:v:0','-an','-vf','scale=1280:720','-c:v','libx264','-preset','veryfast','-crf','25','-pix_fmt','yuv420p','-threads','2','-movflags','+faststart',str(target)],check=True)
    def probe(path):
        return json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height,duration,nb_frames','-of','json',str(path)]))['streams'][0]
    a,b=probe(original),probe(target)
    assert (b['width'],b['height'])==(1280,720) and a['nb_frames']==b['nb_frames'] and abs(float(a['duration'])-float(b['duration']))<.05,(name,a,b)
    print(name,original.stat().st_size,'->',target.stat().st_size,flush=True)
with ThreadPoolExecutor(max_workers=3) as pool:
    list(pool.map(export,names))
