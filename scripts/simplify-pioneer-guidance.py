from pathlib import Path
root=Path('C:/NASA/Zhetalis-Nasa-tutorial')
def edit(f,old,new):
 p=root/f;s=p.read_text(encoding='utf-8');assert old in s,(f,old[:80]);p.write_text(s.replace(old,new,1),encoding='utf-8')
edit('game/src/main.js',"<small class=\"mission-progress\"></small><p></p><button", "<small class=\"mission-progress\"></small><details class=\"mission-why\"><summary>Why am I doing this?</summary><p></p></details><button")
edit('game/src/main.js',"missionCard.querySelector('.mission-progress').textContent=`First base:", "missionCard.querySelector('.mission-progress').textContent=habitatBuilt(outpost)?`First base:")
edit('game/src/main.js',"milestones · E / Action to interact`;", "milestones · E / Action to interact`:'Follow the marker · aim at the object · E / Action';")
edit('game/src/main.js','missionCollapseAt=performance.now()+8000;', "missionCollapseAt=task.id==='explore'?performance.now()+8000:0;")
edit('game/src/pioneer-state.js','${p.collected.length}/${SALVAGE_COUNT} cargo bundles recovered · ${stockText(b)}','Find an orange cargo bundle · ${p.collected.length}/${SALVAGE_COUNT} recovered')
edit('game/src/pioneer-state.js','${p.surveyed.length}/${SURVEY_COUNT} survey checks complete','Use a blue survey instrument · ${p.surveyed.length}/${SURVEY_COUNT} checked')
edit('game/src/habitat-build-state.js','${b.frames.length}/${modules} modules framed · ${stockText(b)}','Choose a glowing footprint · ${b.frames.length}/${modules} modules framed')
edit('game/src/battery-bank-state.js',"detail:'Two matched 48 V packs", "detail:'Follow the marker to your new battery. Place it, use its inspection panel, then join the matching red and black terminals. Zhetela explains each connection. Two matched 48 V packs")
# Context help must include the newly added tasks, not start by telling a new crew to enter its unbuilt base.
edit('game/src/player-tutorial.js'," if(task.target==='workbench')", " if(task.id?.startsWith('hab-')||task.id?.startsWith('bank-'))return (task.step?task.step+'. ':'')+task.detail;\n if(task.target==='workbench')")
# Add the pre-build lessons to the optional curriculum, keeping the existing tool/printing lessons.
edit('game/src/player-tutorial.js',"const t=s.tutorial||{};return [", """const t=s.tutorial||{},p=o.habBuild?.pioneer;return [
 ...(p?[
 {title:'Leave the pod safely',done:p.exitedPod,text:'Follow the hatch marker. Press E / Action, wait for PRESSURE MATCHED, then press E / Action again to open the outer hatch. Your checked suit is already on.'},
 {title:'Find your building supplies',done:p.collected.length===6,text:'Follow the marker to an orange cargo bundle, walk close and press E / Action. The next bundle is marked automatically. Six bundles contain all the structural supplies for your first habitat.'},
 {title:'Use the calibrator',done:p.surveyed.length===3,text:'Go to the marked blue instrument. Press E / Action and stand nearby until the check finishes. Repeat at the other two instruments. Walking away cancels a measurement; you can try again.'},
 {title:'Build your first home',done:o.habBuild.step>=6,text:'Use the pickaxe on the four marked rocks. Then use each glowing footprint to build a frame. Follow the marker to fit shells, airlocks and finally open the green pressure valve.'}
 ]:[]),""")
# Make the arrival test robust to typography normalisation; include the actual panel on a failure.
edit('scripts/test-pioneer-arrival-browser.py',"page.get_by_role('button',name='Plan my base · field manual',exact=True).click()", "print('COCKPIT',ascii(page.locator('#modal').inner_text()));page.locator('#modal .choices button').filter(has_text='Plan my base').click()")
print('Simplified default guidance to a single action, with optional explanations.')
