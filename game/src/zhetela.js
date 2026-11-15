import {speakZhetela,stopZhetelaVoice,voiceEnabled,voiceStatus,voiceBusy,setZhetelaVoice} from './zhetela-voice.js';
// Original Zhetela artwork, shared by Mars and Moon. No microphone or AI service required.
let card, timer, animation, activeStep, stepDismissed;
const portraitAsset = name => new URL('../assets/zhetela-app/' + name + '.webp', import.meta.url).href;
function portraitHTML(motion = 'idle') {
  return `<picture class="zhetela-avatar"><source media="(prefers-reduced-motion: reduce)" srcset="${portraitAsset('portrait')}"><img src="${portraitAsset(motion)}" width="320" height="320" alt="" decoding="async"></picture>`;
}
function setPortraitMotion(motion) {
  const img = card?.querySelector('.zhetela-avatar img');
  if (img && img.src !== portraitAsset(motion)) img.src = portraitAsset(motion);
}
export function zhetela(message, success = false, {step, action} = {}) {
  // A walkthrough owns the card until its caller completes it.
  if (!step && activeStep) return;
  if (step !== activeStep) stepDismissed = false;
  activeStep = step;
  if (step && stepDismissed) return;
  if (!card) {
    card = document.createElement('aside'); card.id = 'zhetela-message'; card.hidden = true;
    card.innerHTML = portraitHTML() + '<div><b>Zhetela · Mission guide</b><p role="status" aria-live="polite"></p><button type="button" data-read-voice aria-label="Read this message aloud" title="Read aloud"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3zM16 8q5 4 0 8M19 5q8 7 0 14" fill="none" stroke="currentColor" stroke-width="2"/></svg><span>Listen</span></button></div><button type="button" aria-label="Dismiss Zhetela message">×</button>';
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
  setPortraitMotion(success ? 'wave' : 'idle');
  animation=setTimeout(()=>setPortraitMotion(voiceBusy() ? 'speaking' : 'idle'),2400);
  if (!step) timer=setTimeout(()=>{if(!voiceEnabled()||!voiceBusy()){if(card)card.hidden=true;clearInterval(animation);}},Math.min(14000,Math.max(6500,message.length*65)));
}
function dismiss(){stopZhetelaVoice();if(card)card.hidden=true;clearTimeout(timer);clearInterval(animation);}
export function finishZhetelaStep(step) {
  if (step !== activeStep) return;
  activeStep = undefined;
  stepDismissed = false;
  dismiss();
}
export function zhetelaPortraitHTML(){return '<div class="zhetela-speaker">'+portraitHTML()+'<b>Zhetela · Mission guide</b></div>';}

addEventListener('zhetela-dismiss', () => { if (!activeStep) dismiss(); });

addEventListener('zhetela-voice-status',e=>{if(!activeStep&&card&&!card.hidden&&e.detail==='Voice ready'){clearTimeout(timer);timer=setTimeout(()=>{card.hidden=true;clearInterval(animation);},5000);}});

addEventListener('zhetela-voice-status',e=>{const b=card?.querySelector('[data-read-voice]');if(!b)return;const busy=voiceBusy();b.querySelector('span').textContent=busy?(e.detail==='Speaking'?'Stop':e.detail+' · Stop'):(e.detail==='Voice ready'||e.detail==='Voice off'?'Listen':e.detail);b.setAttribute('aria-label',busy?'Stop speaking':'Read this message aloud');b.title=e.detail;});

// The app's speaking motion follows actual speech, not an endless mouth-flap timer.
addEventListener('zhetela-voice-status', e => { if(card && !card.hidden) setPortraitMotion(e.detail === 'Speaking' ? 'speaking' : 'idle'); });
