from pathlib import Path

root=Path(r'C:\NASA\Zhetalis-Nasa-tutorial')
def replace(file,old,new):
    p=root/file
    text=p.read_text(encoding='utf-8')
    if new in text:return
    assert old in text,(file,old)
    p.write_text(text.replace(old,new),encoding='utf-8')

replace('game/src/main.js','canUse: !!near || !!sleepBunk || (!inside && colony.tool === \'builder\')','canUse: !!near || !!construction?.hit || !!sleepBunk || (!inside && colony.tool === \'builder\')')
replace('game/src/settings.js','<dt>Use / jump</dt><dd>E / Space</dd>','<dt>Mine / inspect</dt><dd>Left click with the pickaxe to mine. E inspects rocks and uses other objects.</dd><dt>Backpack / tools</dt><dd>I opens your backpack. 1–6 selects a tool; Q puts it away.</dd><dt>Jump</dt><dd>Space</dd>')
replace('game/src/settings.js','Use the Jump, Use and Eat buttons.','Tap Mine to break rocks and Inspect to examine them. Use the Jump and Eat buttons for those actions.')
replace('game/index.html','./src/settings.js?v=crouch-1','./src/settings.js?v=inventory-mine-1')

p=root/'scripts/test-mining-input-browser.py'
text=p.read_text(encoding='utf-8')
text=text.replace(" page.evaluate(\"\"\"async()=>{\n  const THREE=", " page.evaluate(\"()=>{game.colony.s.held=game.colony.s.belt.indexOf('pickaxe');game.colony.equip();dispatchEvent(new Event('touchstart'));}\")\n page.locator('#t-mine').wait_for(state='visible')\n page.evaluate(\"\"\"async()=>{\n  const THREE=")
anchor=" result={'E_inspects_without_damage'"
assert anchor in text
text=text.replace(anchor,""" # Touch buttons must use the same independent mining and inspection routes.
 page.keyboard.press('Escape')
 page.evaluate("()=>{inputTest.dep=game.colony.deposits.find(d=>d.group.parent&&!game.colony.s.mined.includes(d.id));inputTest.aim(inputTest.dep.group,2.2);}")
 before=page.evaluate('JSON.stringify(game.colony.s.hits)')
 page.locator('#t-use').dispatch_event('pointerdown',{'pointerType':'touch','pointerId':8,'button':0,'bubbles':True})
 page.get_by_role('dialog').filter(has=page.locator('h3',has_text='rock inspection')).wait_for(timeout=10000)
 assert page.evaluate('JSON.stringify(game.colony.s.hits)')==before,'Touch Inspect damaged a rock'
 page.get_by_role('button',name='Back to the rock',exact=True).click()
 page.locator('#t-mine').dispatch_event('pointerdown',{'pointerType':'touch','pointerId':9,'button':0,'bubbles':True})
 page.evaluate('inputTest.drain()')
 page.locator('#t-mine').dispatch_event('pointerup',{'pointerType':'touch','pointerId':9,'button':0,'bubbles':True})
 assert page.evaluate('(game.colony.s.hits[inputTest.dep.id]||0)===1'),'Touch Mine did not strike the rock'
 page.keyboard.press('Escape')
 page.evaluate("async()=>{(await import('./src/settings.js')).openSettings({tab:'controls'});}")
 page.get_by_text('Left click with the pickaxe to mine. E inspects rocks and uses other objects.',exact=True).wait_for()
 page.screenshot(path=str(out/'updated-controls.png'))
 result={'touch_mine_and_inspect':True,'E_inspects_without_damage'""")
p.write_text(text,encoding='utf-8')
