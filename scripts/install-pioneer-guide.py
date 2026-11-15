"""Install approved local Zhetela assets into the isolated tutorial worktree."""
from pathlib import Path
import hashlib, json, shutil

root = Path('C:/NASA/Zhetalis-Nasa-tutorial')
assets = root/'game/assets/zhetela'
assets.mkdir(exist_ok=True)
sources = [(Path('C:/Zhetela/assets/standard-models/standard-upright.png'), assets/'standing.png')]
for source in sorted(Path('C:/Zhetela/animation/standard-blender/wave').glob('*.png')):
    sources.append((source, assets/'wave'/source.name))
assert len(sources) == 37
for source, target in sources:
    target.parent.mkdir(exist_ok=True)
    shutil.copyfile(source, target)
(assets/'provenance.json').write_text(json.dumps({
    'description': 'User-approved original Zhetela standing artwork and its existing Blender wrist-wave frames. Copied without edits.',
    'fps': 24, 'frames': 36,
    'files': [{'file': str(dst.relative_to(assets)).replace('\\','/'), 'source': str(src), 'sha256': hashlib.sha256(dst.read_bytes()).hexdigest()} for src,dst in sources]
}, indent=2), encoding='utf-8')
p=root/'game/src/zhetela.js'
s=p.read_text(encoding='utf-8')
s=s.replace("const sheet = new Image(); sheet.src = new URL('../assets/zhetela-sprites.png', import.meta.url).href;", """const standing = new Image(); standing.src = new URL('../assets/zhetela/standing.png', import.meta.url).href;
const wave = []; // Load the existing animation only when the guide first appears.
function loadWave(){if(wave.length)return;for(let n=1;n<=36;n++){const img=new Image();img.src=new URL('../assets/zhetela/wave/'+String(n).padStart(3,'0')+'.png',import.meta.url).href;wave.push(img);}}
""")
s=s.replace('width="160" height="160"', 'width="192" height="288"')
start=s.index('  let frame = success ? 3 : 2;')
end=s.index('  if (!step) timer=', start)
s=s[:start]+"""  const since=performance.now(), reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduced)loadWave();
  const paint = () => {
    const seconds=(performance.now()-since)/1000, waving=!reduced&&(seconds%7)<1.5;
    const candidate=wave[Math.min(35,Math.floor((seconds%7)*24))];
    const art=waving&&candidate?.complete&&candidate.naturalWidth?candidate:standing;
    const c=card.querySelector('canvas'),g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);
    if(art.complete&&art.naturalWidth)g.drawImage(art,0,0,c.width,c.height);
    // Independent twinkles keep the approved face, dress and hair completely unchanged.
    for(let n=0;n<9;n++){
      const x=10+((n*67)%174),y=12+((n*83)%257);
      const alpha=reduced?.45:Math.pow(Math.max(0,Math.sin(seconds*(success?4:2.6)+n*1.9)),6);
      const size=2+alpha*(success?5:3);g.strokeStyle=`rgba(228,229,255,${alpha})`;g.lineWidth=1.2;
      g.beginPath();g.moveTo(x-size,y);g.lineTo(x+size,y);g.moveTo(x,y-size);g.lineTo(x,y+size);g.stroke();
    }
  };
  standing.onload=paint;paint();
  if(!reduced)animation=setInterval(paint,1000/24);
"""+s[end:]
p.write_text(s,encoding='utf-8')
p=root/'game/construction.css'
s=p.read_text(encoding='utf-8')
s+='''
/* Approved full-body Zhetela: transparent artwork, existing wrist-wave and frequent subtle stars. */
#zhetela-message canvas{width:88px;height:132px;border-radius:0;align-self:flex-end}
.zhetela-speaker span{width:64px;height:96px;border-radius:0;background:url('assets/zhetela/standing.png') center/contain no-repeat}
.zhetela-speaker i{display:none}
@media(max-width:600px){#zhetela-message canvas{width:56px;height:84px}}
'''
p.write_text(s,encoding='utf-8')
print('Installed 37 approved artwork files and the animated guide.')
