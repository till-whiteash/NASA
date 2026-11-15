from pathlib import Path
import shutil
root=Path('C:/NASA/Zhetalis-Nasa-tutorial');stage=Path(__file__).parent
shutil.copyfile(stage/'field-manual.js',root/'game/src/field-manual.js')
p=root/'game/src/main.js';s=p.read_text(encoding='utf-8')
s="import {MANUAL,suggestedChapter} from './field-manual.js';\n"+s
anchor="$('#cine-btn').onclick = () => {"
assert anchor in s
s=s.replace(anchor,'''function openFieldManual(topic=suggestedChapter(activeMissionObjective())){
  const chapter=MANUAL[topic]||MANUAL.build;
  const portrait=zhetelaPortraitHTML();
  modal({title:'Field manual · '+chapter.title,html:portrait+'<p><b>'+chapter.intro+'</b></p><ol>'+chapter.steps.map(text=>'<li>'+text+'</li>').join('')+'</ol><details><summary>Why this works · deeper explanation</summary><p>'+chapter.detail+'</p></details><p class="source">Optional demonstrations pause play. Your inventory and construction progress stay unchanged.</p>',choices:[
    ...chapter.films.map(([label,name,clip,note])=>({label,onPick:async()=>{await playCinematic(name,{clip,world});openFieldManual(topic);}})),
    ...Object.entries(MANUAL).filter(([key])=>key!==topic).map(([key,value])=>({label:value.title,onPick:()=>openFieldManual(key)})),
    {label:'Back to my mission',primary:true}
  ]});
}
'''+anchor,1)
s=s.replace("  if (inside) return toast('Go outside to watch a cutscene.');", "  if (inside) return openFieldManual();",1)
s=s.replace("title: 'Cutscenes', html: '<p>Watch the big moments again. Use Skip or Esc to move on.</p>', choices: [", "title: 'Mission films & demonstrations', html: '<p>Watch the big moments again. Use Skip or Esc to move on. Demonstrations do not build or repair your equipment.</p>', choices: [\n    {label:'Field manual · help with my current task',onPick:()=>openFieldManual()},",1)
anchor="  const help=document.createElement('button');help.textContent='How do I do this?';help.onclick=openTutorial;missionCard.append(help);"
assert anchor in s
s=s.replace(anchor,anchor+"\n  const demo=document.createElement('button');demo.textContent='Field manual & demonstration';demo.onclick=()=>openFieldManual();missionCard.append(demo);",1)
# Add a practical guide at the pod displays, where new players can read before their first EVA.
old="<p>Orion's <b>heat shield</b> is on its bottom. Coming home it gets hotter than the surface of a lava flow, and it slowly burns away to carry the heat off.</p>` });"
new="<p>Orion's <b>heat shield</b> is on its bottom. Coming home it gets hotter than the surface of a lava flow, and it slowly burns away to carry the heat off.</p>`, choices:[{label:'Plan my base · field manual',primary:true,onPick:()=>openFieldManual('build')},{label:'Flight films',onPick:()=>openFieldManual('flight')},{label:'Back'}] });"
assert old in s;s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
# Keep the shared art at its original aspect ratio in the Moon HUD too.
p=root/'game/moon/hud.css';s=p.read_text(encoding='utf-8').replace('canvas { width: 44px; height: 44px; }','canvas { width: 44px; height: 66px; }');p.write_text(s,encoding='utf-8')
print('Installed six contextual field-manual chapters and linked the authored films to their tasks.')
