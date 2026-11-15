import { GRAPHICS_MODE } from './surface-detail.js';
import { effectiveQuality } from './device-profile.js';
const litePortrait = effectiveQuality(GRAPHICS_MODE) === 'low';
import {speakZhetela,stopZhetelaVoice,voiceEnabled,voiceStatus,voiceBusy,setZhetelaVoice} from './zhetela-voice.js';
// Original Zhetela artwork, shared by Mars and Moon. No microphone or AI service required.
let card, timer, animation, activeStep, stepDismissed;
const standing = new Image(); standing.src = new URL(litePortrait ? '../assets/zhetela-app/portrait.webp' : '../assets/zhetela/standing.png', import.meta.url).href;
const wave = []; // Load the existing animation only when the guide first appears.
function loadWave(){if(wave.length)return;for(let n=1;n<=36;n++){const img=new Image();img.src=new URL('../assets/zhetela/wave/'+String(n).padStart(3,'0')+'.png',import.meta.url).href;wave.push(img);}}

export function zhetela(message, success = false, {step, action} = {}) {
  // A walkthrough owns the card until its caller completes it.
  if (!step && activeStep) return;
  if (step !== activeStep) stepDismissed = false;
  activeStep = step;
  if (step && stepDismissed) return;
  if (!card) {
    card = document.createElement('aside'); card.id = 'zhetela-message'; card.hidden = true;
    card.innerHTML = '<canvas width="192" height="205" aria-hidden="true"></canvas><div><b>Zhetela · Mission guide</b><p role="status" aria-live="polite"></p><button type="button" data-read-voice aria-label="Read this message aloud" title="Read aloud"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3zM16 8q5 4 0 8M19 5q8 7 0 14" fill="none" stroke="currentColor" stroke-width="2"/></svg><span>Listen</span></button></div><button type="button" aria-label="Dismiss Zhetela message">×</button>';
    document.body.append(card);
    const close = card.querySelector('[aria-label="Dismiss Zhetela message"]');
    close.className = 'zhetela-close';
    close.onclick = () => { stepDismissed = !!activeStep; dismiss(); };
    const actionButton = document.createElement('button');
    actionButton.type = 'button';
    actionButton.dataset.guideAction = '';
    card.querySelector('[data-read-voice]').after(actionButton);
    card.querySelector('[data-read-voice]').onclick=()=>{if(voiceBusy()){stopZhetelaVoice();return;}if(!voiceEnabled())setZhetelaVoice(true);speakZhetela(card.querySelector('p').textContent);};
  }
  clearTimeout(timer); clearInterval(animation);
  const actionButton = card.querySelector('[data-guide-action]');
  actionButton.hidden = !action;
  actionButton.textContent = action?.label || '';
  actionButton.onclick = action?.run || null;
  card.querySelector('p').textContent = message; card.hidden = false;stopZhetelaVoice();
  const since=performance.now(), reduced=litePortrait || matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduced)loadWave();
  const paint = () => {
    const seconds=(performance.now()-since)/1000, waving=!reduced&&(seconds%7)<1.5;
    const candidate=wave[Math.min(35,Math.floor((seconds%7)*24))];
    const art=waving&&candidate?.complete&&candidate.naturalWidth?candidate:standing;
    const c=card.querySelector('canvas'),g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);
    // Match the app's portrait_crop framing in the viewport; source PNGs stay untouched.
    if(art.complete&&art.naturalWidth){if(litePortrait)g.drawImage(art,0,0,art.naturalWidth,art.naturalHeight,0,6,c.width,c.width);else g.drawImage(art,art.naturalWidth*.18,0,art.naturalWidth*.64,art.naturalHeight*.455,0,0,c.width,c.height);}
    // Independent twinkles keep the approved face, dress and hair completely unchanged.
    for(let n=0;n<9;n++){
      const x=10+((n*67)%174),y=12+((n*83)%174);
      const alpha=reduced?.45:Math.pow(Math.max(0,Math.sin(seconds*(success?4:2.6)+n*1.9)),6);
      const size=2+alpha*(success?5:3);g.strokeStyle=`rgba(228,229,255,${alpha})`;g.lineWidth=1.2;
      g.beginPath();g.moveTo(x-size,y);g.lineTo(x+size,y);g.moveTo(x,y-size);g.lineTo(x,y+size);g.stroke();
    }
  };
  standing.onload=paint;paint();
  if(!reduced)animation=setInterval(paint,1000/24);
  if (!step) timer=setTimeout(()=>{if(!voiceEnabled()||!voiceBusy()){if(card)card.hidden=true;clearInterval(animation);}},Math.min(14000,Math.max(6500,message.length*65)));
}
function dismiss(){stopZhetelaVoice();if(card)card.hidden=true;clearTimeout(timer);clearInterval(animation);}
export function finishZhetelaStep(step) {
  if (step !== activeStep) return;
  activeStep = undefined;
  stepDismissed = false;
  dismiss();
}
export function zhetelaPortraitHTML(){if(litePortrait)return '<div class="zhetela-speaker"><img class="zhetela-lite-portrait" src="'+standing.src+'" alt="" width="72" height="72"><b>Zhetela · Mission guide</b></div>';return '<div class="zhetela-speaker"><span aria-hidden="true"><i></i></span><b>Zhetela · Mission guide</b></div>';}

addEventListener('zhetela-dismiss', () => { if (!activeStep) dismiss(); });

addEventListener('zhetela-voice-status',e=>{if(!activeStep&&card&&!card.hidden&&e.detail==='Voice ready'){clearTimeout(timer);timer=setTimeout(()=>{card.hidden=true;clearInterval(animation);},5000);}});

addEventListener('zhetela-voice-status',e=>{const b=card?.querySelector('[data-read-voice]');if(!b)return;const busy=voiceBusy();b.querySelector('span').textContent=busy?(e.detail==='Speaking'?'Stop':e.detail+' · Stop'):(e.detail==='Voice ready'||e.detail==='Voice off'?'Listen':e.detail);b.setAttribute('aria-label',busy?'Stop speaking':'Read this message aloud');b.title=e.detail;});
