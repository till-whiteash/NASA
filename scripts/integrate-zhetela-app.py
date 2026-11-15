from pathlib import Path
import sys

root=Path(sys.argv[1])
p=root/'game/src/zhetela.js'
s=p.read_text(encoding='utf-8')
s=s.replace('const sheet = new Image(); sheet.src = new URL(\'../assets/zhetela-sprites.png\', import.meta.url).href;', '''const portraitAsset = name => new URL('../assets/zhetela-app/' + name + '.webp', import.meta.url).href;
function portraitHTML(motion = 'idle') {
  return `<picture class="zhetela-avatar"><source media="(prefers-reduced-motion: reduce)" srcset="${portraitAsset('portrait')}"><img src="${portraitAsset(motion)}" width="320" height="320" alt="" decoding="async"></picture>`;
}
function setPortraitMotion(motion) {
  const img = card?.querySelector('.zhetela-avatar img');
  if (img && img.src !== portraitAsset(motion)) img.src = portraitAsset(motion);
}''')
s=s.replace("'<canvas width=\"160\" height=\"160\" aria-hidden=\"true\"></canvas><div>","portraitHTML() + '<div>")
start=s.index('  let frame = success ? 3 : 2;')
end=s.index('  if (!step) timer=',start)
s=s[:start]+"  setPortraitMotion(success ? 'wave' : 'idle');\n  animation=setTimeout(()=>setPortraitMotion(voiceBusy() ? 'speaking' : 'idle'),2400);\n"+s[end:]
s=s.replace("'<div class=\"zhetela-speaker\"><span aria-hidden=\"true\"><i></i></span><b>Zhetela · Mission guide</b></div>'", "'<div class=\"zhetela-speaker\">'+portraitHTML()+'<b>Zhetela · Mission guide</b></div>'")
s += "\n// The app's speaking motion follows actual speech, not an endless mouth-flap timer.\naddEventListener('zhetela-voice-status', e => { if(card && !card.hidden) setPortraitMotion(e.detail === 'Speaking' ? 'speaking' : 'idle'); });\n"
p.write_text(s,encoding='utf-8')
p=root/'game/construction.css'
s=p.read_text(encoding='utf-8').replace('#zhetela-message canvas','#zhetela-message .zhetela-avatar')
s+='''
/* Approved desktop-app portrait: consistent framing across Mars and Moon. */
.zhetela-avatar{display:block;flex:none;width:68px;height:68px}
.zhetela-avatar img{display:block;width:100%;height:100%;object-fit:contain}
.zhetela-speaker .zhetela-avatar{width:64px;height:64px}
'''
p.write_text(s,encoding='utf-8')
p=root/'game/moon/hud.css'
p.write_text(p.read_text(encoding='utf-8').replace('#zhetela-message canvas','#zhetela-message .zhetela-avatar'),encoding='utf-8')
print('Updated guide, dialogue portraits and Moon sizing:',root)
