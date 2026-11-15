import * as THREE from 'three';
import {loadControlConsole} from './mission-control-console.js';
import {LESSONS} from './course-lessons.js';
import {loadNasaAstronaut,poseAstronaut} from './suit.js';
import {loadModel} from './nasamodels.js';
import {COURSES,trainingState,perform,answer,cleared} from './training-state.js';

// Shares the host renderer; the host suspends its own rendering during this promise.
export function runEarthTraining(renderer,destination){
 return new Promise(resolve=>{
  const lessons=LESSONS[destination];let lessonIndex=0,lessonStarted=false,lessonQuiz=false,beatIndex=0,beatTime=0,briefingPaused=false;
  const course=COURSES[destination],state=trainingState(destination),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#849da5');scene.fog=new THREE.Fog('#849da5',28,85);
  const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,120);
  scene.add(new THREE.HemisphereLight('#ecf8ff','#50594e',2.4));
  const sun=new THREE.DirectionalLight('#fff1d5',3);sun.position.set(-12,22,15);scene.add(sun);
  const owned=new Set(),materials=new Set();
  function mesh(geo,mat,parent=scene){owned.add(geo);materials.add(mat);const o=new THREE.Mesh(geo,mat);parent.add(o);return o;}
  const white=new THREE.MeshStandardMaterial({color:'#e6e7e3',roughness:.7}),dark=new THREE.MeshStandardMaterial({color:'#26383d',roughness:.6}),orange=new THREE.MeshStandardMaterial({color:'#df733f',roughness:.7}),cyan=new THREE.MeshBasicMaterial({color:'#7be6ed',transparent:true,opacity:.58,depthWrite:false});
  function box(x,y,z,w,h,d,mat=white,parent=scene){const o=mesh(new THREE.BoxGeometry(w,h,d),mat,parent);o.position.set(x,y,z);return o;}
  box(0,-.15,0,70,.3,70,new THREE.MeshStandardMaterial({color:'#6d776c',roughness:1}));
  box(0,-.01,0,28,.1,22,new THREE.MeshStandardMaterial({color:'#a9aaa2',roughness:1}));
  box(0,4,-10,28,8,.5);box(-14,4,0,.5,8,20);box(14,4,0,.5,8,20);
  for(let i=-12;i<14;i+=4){box(i,4,-9.7,.12,8,.2,dark);box(i,7,-9.5,2.5,.12,.2,cyan);}
  for(let x=-12;x<=12;x+=4)box(x,.06,1,.05,.015,17,white);
  box(0,.065,5,24,.02,.08,orange);
  const positions=course.drills.map((_,i)=>new THREE.Vector3(-9+i*6,0,-4));
  const stations=positions.map((p,i)=>{const group=new THREE.Group();group.position.copy(p);scene.add(group);box(0,.5,0,3,1,2,dark,group);box(0,1.05,0,3,.1,2,white,group);const indicator=box(0,1.15,1.03,2.6,.1,.05,orange,group);return {group,indicator};});
  function person(material){const g=new THREE.Group();box(0,1.1,0,.65,.8,.4,material,g);const head=mesh(new THREE.SphereGeometry(.32,16,12),material,g);head.position.y=1.8;box(0,1.8,.25,.43,.2,.12,dark,g);const limbs=[box(-.45,1,0,.2,.7,.24,material,g),box(.45,1,0,.2,.7,.24,material,g),box(-.2,.37,0,.25,.75,.3,material,g),box(.2,.37,0,.25,.75,.3,material,g)];scene.add(g);return {g,limbs};}
  // Full-size training shelter replaces the tabletop storm exhibit.
  const shelterIndex=course.drills.findIndex(d=>d.name==='Storm shelter');
  const sx=positions[shelterIndex].x, shelter=new THREE.Group();shelter.position.set(sx,0,-5.2);scene.add(shelter);
  const shell=new THREE.Group();shelter.add(shell);let shellReady=false;stations[shelterIndex].group.visible=false;
  box(0,.01,0,4.8,.12,6,white,shelter);box(-2.4,1.7,0,.18,3.4,6,white,shelter);box(2.4,1.7,0,.18,3.4,6,white,shelter);box(0,1.7,-3,4.8,3.4,.18,white,shelter);
  for(const x of [-1.65,1.65])box(x,1.7,3,1.5,3.4,.18,white,shelter);
  box(0,3,3,1.8,.8,.18,white,shelter);
  const roof=box(0,3.45,0,4.8,.16,6,white,shelter);
  const shelterDoor=box(0,1.3,3.08,1.7,2.6,.12,dark,shelter);
  for(const x of [-1.6,1.6]){box(x,.5,-.7,.9,.9,2.8,dark,shelter);box(x,1.35,-1.9,.9,.9,.16,orange,shelter);}
  box(0,1.6,-2.88,1.6,.7,.08,cyan,shelter);box(0,3.27,0,2.6,.04,.4,cyan,shelter);
  const roomLight=new THREE.PointLight('#dceeff',12,8);roomLight.position.set(0,2.8,0);shelter.add(roomLight);
  const roomMonitor=box(0,1.65,-2.82,1.7,.9,.04,dark,shelter);
  const monitorCanvas=document.createElement('canvas');monitorCanvas.width=512;monitorCanvas.height=256;const mc=monitorCanvas.getContext('2d');mc.fillStyle='#102b32';mc.fillRect(0,0,512,256);mc.fillStyle='#94efcd';mc.font='bold 32px system-ui';mc.fillText('SHELTER / TRAINING',25,50);mc.font='23px system-ui';mc.fillStyle='#e9f2f3';mc.fillText('Hatch access: clear',25,105);mc.fillText('Life support: battery reserve',25,145);mc.fillText('Wait for mission control',25,195);const monitorTexture=new THREE.CanvasTexture(monitorCanvas);monitorTexture.colorSpace=THREE.SRGBColorSpace;const monitorMat=new THREE.MeshBasicMaterial({map:monitorTexture});const monitorFace=mesh(new THREE.PlaneGeometry(1.6,.8),monitorMat,shelter);monitorFace.position.set(0,1.65,-2.78);
  const lining=new THREE.MeshStandardMaterial({color:'#53656c',roughness:.85});
  for(const x of [-2.28,2.28])for(let z=-2.4;z<2.5;z+=1.2)box(x,1.6,z,.05,2.9,1.1,lining,shelter);
  for(const x of [-1.7,1.7]){const tank=mesh(new THREE.CylinderGeometry(.17,.17,1.1,16),white,shelter);tank.position.set(x,.62,1.5);box(x,1.3,1.5,.25,.12,.25,orange,shelter);}
  const roomParts=shelter.children.filter(o=>o!==shell&&o!==shelterDoor);
  const screen=mesh(new THREE.PlaneGeometry(4.8,2.7),new THREE.MeshBasicMaterial({color:'#9bc7cd',side:THREE.DoubleSide}));screen.position.set(-3.8,3,0);
  // Physical mission-control console beneath the projected teaching display.
  box(-3.8,3,-.12,5,2.9,.15,dark);
  for(const x of [-5.9,-1.7])box(x,1.65,-.2,.09,3.3,.1,dark);
  const consoleFallback=box(-3.8,.5,-.45,3.8,1,1.5,dark);
  const consoleLabel=document.createElement('canvas');consoleLabel.width=1024;consoleLabel.height=96;
  const lc=consoleLabel.getContext('2d');lc.fillStyle='#203238';lc.fillRect(0,0,1024,96);lc.fillStyle='#e6edf0';lc.font='500 34px monospace';lc.fillText('FLIGHT DIRECTOR / CREW TRAINING',28,59);
  const consoleLabelTexture=new THREE.CanvasTexture(consoleLabel);consoleLabelTexture.colorSpace=THREE.SRGBColorSpace;
  const labelFace=mesh(new THREE.PlaneGeometry(3.6,.34),new THREE.MeshBasicMaterial({map:consoleLabelTexture}));labelFace.position.set(-3.8,1.48,.05);
  const slideTextures=new Map();let projected='';
  const player=person(white);player.g.position.set(0,.08,5);
  const hologramMaterial=new THREE.MeshPhongMaterial({color:'#74d9e9',emissive:'#153e4c',transparent:true,opacity:.7,shininess:70,depthWrite:false});materials.add(hologramMaterial);
  const hologram=person(hologramMaterial);hologram.g.position.set(.6,.55,2);
  const projector=mesh(new THREE.CylinderGeometry(1.1,1.3,.3,32),dark);projector.position.set(.6,.2,2);
  const beam=mesh(new THREE.ConeGeometry(1.1,2.6,32,1,true),new THREE.MeshBasicMaterial({color:'#72d9e5',transparent:true,opacity:.09,depthWrite:false,side:THREE.DoubleSide}));beam.position.set(.6,1.6,2);beam.rotation.z=Math.PI;
  let ended=false,frame,last=performance.now(),time=0,target=null,busy=0,near=false,nearScreen=false,avatar=null,inShelter=false,doorOpen=0,viewYaw=0,dragX=null;const waypoints=[];
  const skeletons=new Set();
  loadControlConsole().then(console=>{if(!console)return;if(ended){console.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});return;}console.position.set(-3.8,0,-.55);scene.add(console);consoleFallback.visible=false;console.traverse(o=>{if(o.isMesh){owned.add(o.geometry);materials.add(o.material);}});root.dataset.controlConsole='nasa-jsc';}).catch(error=>{console.warn('JSC console unavailable; using training desk',error);});
  loadModel('training/shelter-hdu.glb').then(asset=>{if(ended||!asset)return;const model=asset.scene.clone(true),b=new THREE.Box3().setFromObject(model),size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3());model.position.sub(new THREE.Vector3(center.x,b.min.y,center.z));const wrap=new THREE.Group();wrap.add(model);wrap.scale.setScalar(7.2/Math.max(size.x,size.z));shell.add(wrap);shellReady=true;});
  loadModel('training/replacement-unit.glb').then(asset=>{if(ended||!asset)return;const model=asset.scene.clone(true),b=new THREE.Box3().setFromObject(model),size=b.getSize(new THREE.Vector3());model.position.sub(b.getCenter(new THREE.Vector3()));const wrap=new THREE.Group();wrap.add(model);wrap.scale.setScalar(1.1/Math.max(size.x,size.y,size.z));wrap.position.set(1.5,1.7,-2.2);shelter.add(wrap);});
  loadNasaAstronaut().then(a=>{if(!a)return;a.root.traverse(o=>{if(o.isMesh){owned.add(o.geometry);[].concat(o.material).forEach(m=>materials.add(m));if(o.skeleton)skeletons.add(o.skeleton);}});if(ended){a.root.traverse(o=>{if(o.isMesh){o.geometry.dispose();[].concat(o.material).forEach(m=>m.dispose());o.skeleton?.dispose();}});return;}player.g.children.forEach(c=>c.visible=false);player.g.add(a.root);avatar=a;});
  loadModel('training/mark-iii.glb').then(asset=>{if(ended||!asset)return;const model=asset.scene.clone(true),b=new THREE.Box3().setFromObject(model),size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3());model.position.sub(new THREE.Vector3(center.x,b.min.y,center.z));model.traverse(o=>{if(o.isMesh)o.material=hologramMaterial;});const wrap=new THREE.Group();wrap.add(model);wrap.scale.setScalar(2.5/size.y);hologram.g.children.forEach(c=>c.visible=false);hologram.g.add(wrap);});
  // Clone the lightweight NASA exhibit scenes; do not dispose cached shared model resources.
  course.drills.forEach((d,i)=>i!==shelterIndex&&loadModel('training/'+d.model).then(asset=>{if(ended||!asset)return;const model=asset.scene.clone(true),wrap=new THREE.Group();wrap.add(model);const b=new THREE.Box3().setFromObject(model),size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3());model.position.sub(new THREE.Vector3(center.x,b.min.y,center.z));wrap.scale.setScalar(1.5/Math.max(size.x,size.y,size.z));wrap.position.y=1.12;stations[i].group.add(wrap);}));
  const root=document.createElement('section');root.id='earth-training';root.setAttribute('aria-label','Earth astronaut training');
  root.innerHTML=`<header><div><small>Zhetalis · Earth academy</small><h1>${course.name}</h1></div><b data-clearance>Launch locked</b><button data-exit>Return to mission menu</button></header><nav aria-label="Training stations"></nav><aside><small data-label>Hologram briefing · Commander Zhetela</small><h2 tabindex="-1"></h2><p data-brief></p><p data-feedback role="status" aria-live="polite"></p><div data-actions></div><footer>Earth rehearsal · simplified educational procedures<br>WASD / arrow keys to walk. Drag the room to look around.</footer></aside><figure class="academy-slide" hidden><img alt="Original course slide"><figcaption></figcaption></figure><div class="academy-walk" aria-label="Movement controls"><button data-walk="KeyW" aria-label="Walk forward">↑</button><button data-walk="KeyA" aria-label="Walk left">←</button><button data-walk="KeyS" aria-label="Walk backward">↓</button><button data-walk="KeyD" aria-label="Walk right">→</button></div><div class="commander-subtitles" role="status" aria-live="polite" hidden></div><div class="academy-guide"><strong>Explore the academy</strong><br>WASD / arrows to walk<br>Drag to look around<br>Approach the screen to answer</div>`;
  const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('../training.css',import.meta.url).href;document.head.append(link);document.body.append(root);
  const q=s=>root.querySelector(s),keys=new Set();
  const slideImage=q('.academy-slide img');slideImage.tabIndex=0;slideImage.setAttribute('role','button');slideImage.setAttribute('aria-label','Enlarge original course slide');
  function enlarge(){const dialog=document.createElement('dialog');dialog.className='academy-zoom';const close=document.createElement('button');close.textContent='Close slide';close.onclick=()=>dialog.close();const img=slideImage.cloneNode();img.removeAttribute('role');img.removeAttribute('tabindex');dialog.append(close,img);root.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();}
  slideImage.onclick=enlarge;slideImage.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();enlarge();}};
  root.querySelectorAll('[data-walk]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.walk);};b.onpointerup=b.onpointercancel=()=>keys.delete(b.dataset.walk);});
  const canvas=renderer.domElement;
  const dragStart=e=>{if(e.button!==0)return;dragX=e.clientX;canvas.setPointerCapture?.(e.pointerId);};
  const dragMove=e=>{if(dragX===null)return;viewYaw-=(e.clientX-dragX)*.006;dragX=e.clientX;};const dragEnd=()=>dragX=null;
  canvas.addEventListener('pointerdown',dragStart);canvas.addEventListener('pointermove',dragMove);canvas.addEventListener('pointerup',dragEnd);canvas.addEventListener('pointercancel',dragEnd);
  const nav=q('nav');course.drills.forEach((d,i)=>{const b=document.createElement('span');b.textContent=`${i+1}. ${d.name}`;nav.append(b);});
  function feedback(text){q('[data-feedback]').textContent=text;q('[data-feedback]').dataset.tone=text.startsWith('Correct')?'success':'retry';}
  function button(label,fn,disabled=false){const b=document.createElement('button');b.textContent=label;b.disabled=disabled;b.onclick=fn;if(/^(Start hologram|Answer at|Walk to screen|Walk to the briefing|Board spacecraft)/.test(label))b.dataset.kind='primary';q('[data-actions]').append(b);return b;}
  function routeTo(point){waypoints.length=0;if(inShelter){waypoints.push(new THREE.Vector3(sx,0,-3.2),new THREE.Vector3(sx,0,-1.1));}waypoints.push(point);target=waypoints.shift();}
  function beats(){return lessons[lessonIndex].narration.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(t=>t.trim())||[lessons[lessonIndex].narration];}
  function resetShot(){beatIndex=0;beatTime=0;briefingPaused=false;}
  function speak(text){if(!('speechSynthesis' in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=.92;speechSynthesis.speak(u);}
  function showSlide(lesson){const figure=q('.academy-slide');figure.hidden=true;if(!lesson){screen.visible=false;return;}screen.visible=true;if(projected!==lesson.image){projected=lesson.image;if(slideTextures.has(projected)){screen.material.map=slideTextures.get(projected);screen.material.needsUpdate=true;}else {const requested=projected;new THREE.TextureLoader().load(requested,t=>{if(ended){t.dispose();return;}t.colorSpace=THREE.SRGBColorSpace;slideTextures.set(requested,t);if(projected===requested){screen.material.map=t;screen.material.color.set('#ffffff');screen.material.needsUpdate=true;}});}}const img=figure.querySelector('img');img.src=lesson.image;img.alt=lesson.title+' — original course slide';figure.querySelector('figcaption').textContent=lesson.slide+' · page '+lesson.page;}
  function draw(){
   root.dataset.mode=(!state.briefed&&lessonQuiz)||state.quiz?'quiz':state.briefed?'practical':'briefing';
   q('[data-actions]').replaceChildren();feedback('');q('.commander-subtitles').hidden=true;root.classList.toggle('live-briefing',!state.briefed&&lessonStarted);root.classList.remove('cinematic-briefing');
   [...nav.children].forEach((n,i)=>{n.dataset.state=state.passed.includes(i)?'passed':state.briefed&&i===state.station?'current':'locked';n.textContent=`${state.passed.includes(i)?'Passed':i+1+'.'} ${course.drills[i].name}`;});
   if(!state.briefed){
    root.classList.add('briefing');
    if(!lessonStarted){showSlide(null);q('h2').textContent='Your mission starts on Earth';q('[data-brief]').textContent=course.brief+' Commander Zhetela will explain your course slides, then test your understanding. Every answer must be correct before practical training begins.';button('Start hologram briefing',()=>{lessonStarted=true;resetShot();draw();});return;}
    const lesson=lessons[lessonIndex];showSlide(lesson);q('[data-label]').textContent=`Commander Zhetela · lesson ${lessonIndex+1} / ${lessons.length}`;q('h2').textContent=lesson.title;q('[data-brief]').textContent=lessonQuiz?lesson.question:lesson.narration;
    if(lessonQuiz){if(!nearScreen){button('Walk to the briefing screen',()=>routeTo(new THREE.Vector3(-3.8,0,2)));feedback('Approach the projected screen to answer. You can keep walking while the briefing runs.');}lesson.answers.forEach((a,i)=>button(a,()=>{if(!nearScreen)return;if(i!==lesson.correct){feedback(lesson.explanation+' '+lesson.question);return;}lessonIndex++;lessonQuiz=false;resetShot();if(lessonIndex===lessons.length){state.briefed=true;showSlide(null);}draw();feedback('Correct. You may continue.');},!nearScreen));button('Review hologram explanation',()=>{lessonQuiz=false;resetShot();draw();});}
    else {q('[data-brief]').textContent='Live projector briefing · '+lesson.title;q('.commander-subtitles').hidden=false;button('Play voice',()=>speak(lesson.narration));button('Mute voice',()=>{if('speechSynthesis' in window)speechSynthesis.cancel();});button(briefingPaused?'Resume briefing':'Pause briefing',()=>{briefingPaused=!briefingPaused;if('speechSynthesis' in window){if(briefingPaused)speechSynthesis.pause();else speechSynthesis.resume();}draw();});button('Next briefing line',()=>{beatIndex=(beatIndex+1)%beats().length;beatTime=0;});const tools=document.createElement('details');tools.className='briefing-tools';const summary=document.createElement('summary');summary.textContent='Voice & playback';tools.append(summary);const controls=document.createElement('div');while(q('[data-actions]').firstChild)controls.append(q('[data-actions]').firstChild);tools.append(controls);q('[data-actions]').append(tools);button('Review original slide',enlarge);button(nearScreen?'Answer at the screen':'Walk to screen to answer',()=>{if('speechSynthesis' in window)speechSynthesis.cancel();lessonQuiz=true;if(!nearScreen)routeTo(new THREE.Vector3(-3.8,0,2));draw();});}
    const primary=q('[data-actions] [data-kind=primary]');if(primary)q('[data-actions]').prepend(primary);const source=document.createElement('small');source.textContent=lesson.notes;q('[data-actions]').append(source);return;
   }
   root.classList.remove('briefing');showSlide(null);
   if(cleared(state)){q('h2').textContent='Cleared for launch';q('[data-label]').textContent='Commander Zhetela · final briefing';q('[data-brief]').textContent=`You passed all ${course.drills.length} practical drills and quizzes for ${course.name}. Take these habits with you: protect your air, plan your return and check your evidence.`;q('[data-clearance]').textContent='Launch cleared';button('Board spacecraft',()=>finish(true));return;}
   const d=course.drills[state.station];
   if(inShelter)button('Leave shelter',()=>routeTo(new THREE.Vector3(sx,0,-1)));q('h2').textContent=d.name;q('[data-label]').textContent=`Drill ${state.station+1} of ${course.drills.length} · ${state.quiz?'Knowledge check':state.action+' / '+d.actions.length+' checks'}`;q('[data-brief]').textContent=state.quiz?d.question:d.brief;
   if(state.quiz){d.answers.forEach((a,i)=>button(a,()=>{if(answer(state,i)){stations[state.station-1].indicator.material=cyan;draw();feedback('Correct. '+d.why);}else feedback('Try again. '+d.why);}));return;}
   button('Walk to station',()=>{routeTo(positions[state.station].clone().add(new THREE.Vector3(0,0,2.5)));feedback('Walking to the training console…');});
   // Keep all unused controls available: learners must choose a safe order, not just press Next.
   [...d.actions].sort().forEach(a=>{if(d.actions.indexOf(a)<state.action)return;const b=button(a,()=>{if(!near||busy)return;if(a==='Enter shielded shelter'&&state.action===2){routeTo(new THREE.Vector3(sx,0,-4.8));feedback('Walk through the open hatch. The shelter check completes only once you are inside.');return;}if(!perform(state,a)){feedback('Check the procedure: '+d.actions[state.action]+' first.');return;}busy=state.quiz?0:.7;stations[state.station].indicator.scale.x=(state.action/d.actions.length);feedback(a+' — check complete.');draw();},!near||busy>0);b.dataset.operation='true';});
   if(!near)feedback('Move your astronaut to the marked console to use its controls.');
  }
  const delta=new THREE.Vector3(),look=new THREE.Vector3(),cameraTarget=new THREE.Vector3(),screenPoint=new THREE.Vector3(-3.8,.08,0),vertical=new THREE.Vector3(0,1,0);
  function tick(now){if(ended)return;frame=requestAnimationFrame(tick);const dt=document.hidden?0:Math.min(.1,(now-last)/1000);last=now;time+=dt;
   const priorBusy=busy;busy=Math.max(0,busy-dt);if(priorBusy>0&&!busy)draw();
   delta.set((keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),0,(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0));
   if(delta.lengthSq()){delta.applyAxisAngle(vertical,viewYaw);target=null;waypoints.length=0;}else if(target){delta.subVectors(target,player.g.position);delta.y=0;if(delta.length()<.12){target=waypoints.shift()||null;delta.set(0,0,0);}}
   const walking=!cleared(state)&&delta.lengthSq()>0;
   if(walking){delta.normalize();player.g.position.addScaledVector(delta,dt*4);player.g.position.x=THREE.MathUtils.clamp(player.g.position.x,-12,12);const pos=player.g.position;const unlocked=state.station===shelterIndex&&state.action>=2||state.passed.includes(shelterIndex);
    if(pos.z< -1.6){if(!unlocked){pos.z=-1.6;}else if(pos.z> -2.8){if(Math.abs(pos.x-sx)>.65){pos.z=-1.6;}}else {pos.x=THREE.MathUtils.clamp(pos.x,sx-1.05,sx+1.05);pos.z=Math.max(-7.7,pos.z);}}
    pos.z=Math.min(8,pos.z);player.g.rotation.y=Math.atan2(delta.x,delta.z);}
   const nowInside=player.g.position.z<-2.8&&Math.abs(player.g.position.x-sx)<2.3;
   const unlocked=state.station===shelterIndex&&state.action>=2||state.passed.includes(shelterIndex);
   doorOpen=THREE.MathUtils.damp(doorOpen,unlocked?1:0,7,dt);shelterDoor.position.x=doorOpen*1.85;
   const revealRoom=nowInside||(unlocked&&Math.abs(player.g.position.x-sx)<2&&player.g.position.z<.5);
   shell.visible=!revealRoom;roomParts.forEach(o=>o.visible=revealRoom||!shellReady);roof.visible=!nowInside&&(revealRoom||!shellReady);shelterDoor.visible=revealRoom||!shellReady;player.g.visible=!nowInside;
   if(nowInside!==inShelter){inShelter=nowInside;root.dataset.insideShelter=String(inShelter);draw();}
   if(inShelter&&state.station===shelterIndex&&state.action===2&&!state.quiz){perform(state,'Enter shielded shelter');draw();feedback('Shelter reached. You are inside the protected training room.');}
   if(avatar)poseAstronaut(avatar,{phase:time*9,pace:walking&&!reduced?1:0,run:0,air:0,t:time});
   player.limbs.forEach((l,i)=>l.rotation.x=walking&&!reduced?Math.sin(time*9+(i%2)*Math.PI)*.4:0);
   if(!reduced){hologram.g.position.y=.55+Math.sin(time*1.5)*.035;hologramMaterial.opacity=.68+Math.sin(time*2)*.025;hologram.g.rotation.y=Math.sin(time*.6)*.08;}
   const nextScreen=player.g.position.distanceTo(screenPoint)<2.8;
   if(nextScreen!==nearScreen){nearScreen=nextScreen;root.dataset.nearScreen=String(nearScreen);if(!state.briefed&&lessonStarted)draw();}
   root.dataset.playerX=player.g.position.x.toFixed(2);root.dataset.playerZ=player.g.position.z.toFixed(2);
   const nextNear=state.briefed&&!cleared(state)&&player.g.position.distanceTo(positions[state.station])<3.6;
   if(nextNear!==near){near=nextNear;draw();}
   cameraTarget.set(player.g.position.x+Math.sin(viewYaw)*11,7.2,player.g.position.z+Math.cos(viewYaw)*11);camera.position.lerp(cameraTarget,reduced?1:1-Math.exp(-dt*5));look.set(player.g.position.x,1.5,player.g.position.z);camera.lookAt(look);
   if(inShelter){camera.position.set(player.g.position.x,1.65,player.g.position.z+.3);camera.lookAt(player.g.position.x-Math.sin(viewYaw)*5,1.6,player.g.position.z-Math.cos(viewYaw)*5);}
   if(!state.briefed&&lessonStarted&&!lessonQuiz){
    const lines=beats();if(!briefingPaused){beatTime+=dt;if(beatTime>Math.max(5,lines[beatIndex].length/13)){beatTime=0;beatIndex=(beatIndex+1)%lines.length;}}
    const text='Commander Zhetela: '+lines[beatIndex];if(q('.commander-subtitles').textContent!==text)q('.commander-subtitles').textContent=text;

   }
   camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.shadowMap.needsUpdate=false;renderer.render(scene,camera);
  }
  function key(e){if(!['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))return;if(e.target.closest('button')&&e.code.startsWith('Arrow'))return;e.preventDefault();e.stopImmediatePropagation();if(e.type==='keydown')keys.add(e.code);else keys.delete(e.code);}
  const blur=()=>keys.clear();addEventListener('keydown',key,true);addEventListener('keyup',key,true);addEventListener('blur',blur);
  function finish(ok){if(ended||ok&&!cleared(state))return;ended=true;cancelAnimationFrame(frame);canvas.removeEventListener('pointerdown',dragStart);canvas.removeEventListener('pointermove',dragMove);canvas.removeEventListener('pointerup',dragEnd);canvas.removeEventListener('pointercancel',dragEnd);removeEventListener('keydown',key,true);removeEventListener('keyup',key,true);removeEventListener('blur',blur);if('speechSynthesis' in window)speechSynthesis.cancel();root.remove();link.remove();monitorTexture.dispose();consoleLabelTexture.dispose();slideTextures.forEach(t=>t.dispose());skeletons.forEach(s=>s.dispose());owned.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());scene.clear();resolve(ok);}
  q('[data-exit]').onclick=()=>finish(false);camera.position.set(3,10,17);draw();q('h2').focus();frame=requestAnimationFrame(tick);
 });
}
