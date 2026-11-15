// The habitat construction site in the world (quest state and text: habitat-build-state.js).
import * as THREE from 'three';
import {collectSalvage,recordSurvey,buildStarter,pioneerReady,spendFor,stockText,SURVEY_SECONDS} from './pioneer-state.js';
import {recordStarter} from './learning-state.js';
import { heightAt } from './world.js';
import { HAB_DONE, ROCKS, PRESSURE_SECONDS, habitatBuilt } from './habitat-build-state.js';

// The scene side: hides the finished base until it is built and supplies the things to aim at.
export class HabitatBuild {
  constructor(world, { state, colony, save, guide, notify, onDone }) {
    Object.assign(this, { world, state, colony, save, guide, notify, onDone });
    const m = world.settlement;
    this.m = m; this.mods = m.layout.moduleColliders; this.entrances = m.entrances;
    this.group = new THREE.Group(); this.group.name = 'Habitat build site'; world.scene.add(this.group);
    const c = this.mods.reduce((a, q) => a.add(new THREE.Vector3(q.x, 0, q.z)), new THREE.Vector3()).multiplyScalar(1 / this.mods.length);
    this.centre = c; this.front = Math.max(...this.entrances.map(e => e.bottom)) + 3;
    // Everything that belongs to the finished habitat, and the colliders that go with it
    this.parts = [m.model, m.group, m.greenhouse, m.glassTunnel].filter(Boolean);
    const lay = m.layout.colliders, last = lay.indexOf(this.mods[this.mods.length - 1]);
    const near = q => Math.hypot(q.x - c.x, q.z - c.z) < 75;
    this.colliders = world.colliders.filter(q => this.mods.includes(q) || (lay.indexOf(q) > last + 5 && near(q)));
    this.walkHeight = m.walkHeight; this.blockRails = m.blockRails;
    this.model = { scale: m.model.scale.clone() };
    const ghost = (color, o = .32) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: o, depthWrite: false });
    // 1. site rocks, in front of the modules
    this.rocks = [0, 1, 2, 3].map(i => {
      const e = this.entrances[Math.round(i * (this.entrances.length - 1) / 3)], x = e.x + (i % 2 ? 1.6 : -1.6), z = e.bottom + 2.2 + (i % 2) * 1.2;
      const rock = new THREE.Mesh(world.rocks.geometry, world.rocks.material.clone()); rock.scale.set(.7, .5, .6);
      rock.position.set(x, heightAt(x, z) + .22, z); rock.castShadow = rock.receiveShadow = true;
      rock.userData = { kind: 'hab-rock', id: i, label: 'Break site rock (pickaxe)' };
      rock.material.color?.set('#9b7657'); // standalone rocks have no instance colour
      world.clearRocksAround?.(x, z, 1.8); // clear incidental rubble beneath the quest rock
      this.group.add(rock); return rock;
    });
    // 2. a footprint per module, then its footing and frame
    const steel = new THREE.MeshStandardMaterial({ color: '#b9c0c6', metalness: .6, roughness: .35 }), pad = new THREE.MeshStandardMaterial({ color: '#8d8478', roughness: .95 });
    this.pads = this.mods.map((q, i) => {
      const g = ghost('#6cf0d0', .35), p = new THREE.Mesh(new THREE.CylinderGeometry(q.r * .9, q.r * .9, .12, 40), g);
      p.position.set(q.x, heightAt(q.x, q.z) + .08, q.z); p.userData = { kind: 'hab-pad', id: i, label: `Lay foundation and raise frame · module ${i + 1}` };
      this.group.add(p); return p;
    });
    this.frames = this.mods.map(q => {
      const f = new THREE.Group(), y0 = heightAt(q.x, q.z), r = q.r * .82, h = 6.2;
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(q.r * .92, q.r * .98, .35, 40), pad); foot.position.y = .17; f.add(foot);
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, s = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, h, 6), steel); s.position.set(Math.cos(a) * r, h / 2 + .3, Math.sin(a) * r); s.castShadow = true; f.add(s); }
      for (const y of [2.3, 4.4, 6.4]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r, .06, 6, 48), steel); ring.rotation.x = Math.PI / 2; ring.position.y = y; f.add(ring); }
      f.position.set(q.x, y0, q.z); f.visible = false; this.group.add(f); return f;
    });
    // 3. shell control post · 4. airlock outline · 5. pressure valve
    const post = new THREE.Group(), px = c.x, pz = this.front + 1.5;
    const mast = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.3, .35), new THREE.MeshStandardMaterial({ color: '#e8b33a', roughness: .5 })); mast.position.y = .65; post.add(mast);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(.38, .25), new THREE.MeshBasicMaterial({ color: '#7fe3ff' })); screen.position.set(0, 1.05, .18); post.add(screen);
    post.position.set(px, heightAt(px, pz), pz); post.userData = { kind: 'hab-shell', label: 'Unfold the pressure shells' }; this.post = post; this.group.add(post);
    const e0 = this.entrances[0];
    this.airlock = new THREE.Mesh(new THREE.BoxGeometry(2.4, Math.max(2, e0.y + 2.4), Math.max(3, e0.bottom - e0.doorZ)), ghost('#7fe3ff', .22));
    this.airlock.position.set(e0.x, heightAt(e0.x, e0.bottom) + Math.max(2, e0.y + 2.4) / 2, (e0.doorZ + e0.bottom) / 2);
    this.airlock.userData = { kind: 'hab-airlock', label: 'Attach airlocks and stairs' }; this.group.add(this.airlock);
    const vx = e0.x + 1.9, vz = e0.bottom + .8;
    this.valve = new THREE.Group();
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 1, 12), steel); pipe.position.y = .5; this.valve.add(pipe);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(.26, .05, 8, 24), new THREE.MeshStandardMaterial({ color: '#3ad17a', emissive: '#0d4a26' })); wheel.position.y = 1.05; this.valve.add(wheel); this.wheel = wheel;
    this.valve.position.set(vx, heightAt(vx, vz), vz); this.valve.userData = { kind: 'hab-seal', label: 'Open the pressurisation valve' }; this.group.add(this.valve);
    const label=(text)=>{const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d');ctx.fillStyle='#142630';ctx.fillRect(0,0,512,96);ctx.fillStyle='#ecfaf7';ctx.font='bold 30px system-ui';ctx.textAlign='center';ctx.fillText(text,256,58);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.8,.34),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));sign.position.set(0,1.15,.42);return sign;};
    this.cargo=Array.from({length:6},(_,i)=>{
      const g=new THREE.Group(),x=c.x+(i%3-1)*3.2,z=this.front+8+Math.floor(i/3)*3.2;
      const box=new THREE.Mesh(new THREE.BoxGeometry(1.4,.8,.85),new THREE.MeshStandardMaterial({color:'#d18a40',roughness:.68,metalness:.2}));box.position.y=.4;g.add(box);
      for(const x of [-.45,.45]){const strap=new THREE.Mesh(new THREE.BoxGeometry(.07,.83,.89),steel);strap.position.set(x,.42,0);g.add(strap);}
      if(i%2){for(let n=0;n<2;n++){const scrap=new THREE.Mesh(new THREE.BoxGeometry(.95,.035,.6),steel);scrap.position.set((n-.5)*.28,.94+n*.12,0);scrap.rotation.set(n*.16,0,(n-.5)*.3);g.add(scrap);}}
      g.add(label('CARGO '+String(i+1).padStart(2,'0')));g.position.set(x,heightAt(x,z),z);g.userData={kind:'hab-cargo',id:i,label:'Recover salvage '+(i+1)+' · structural alloy and sealed flight supplies'};
      world.clearRocksAround?.(x,z,1.2);this.group.add(g);return g;
    });
    // The first cargo's packing frame unfolds into a useful rack: a quick, real build.
    this.starter=new THREE.Group();this.starter.position.copy(this.cargo[0].position);this.starter.position.x+=2;
    this.starter.userData={kind:'hab-starter',label:'Assemble supply rack · E / Action'};
    const rackMat=new THREE.MeshStandardMaterial({color:'#72edc4',transparent:true,opacity:.45,roughness:.65});
    for(const x of [-.55,.55])for(const z of [-.3,.3]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.08,.9,.08),rackMat);leg.position.set(x,.45,z);this.starter.add(leg);}
    const shelf=new THREE.Mesh(new THREE.BoxGeometry(1.3,.12,.8),rackMat);shelf.position.y=.9;this.starter.add(shelf);
    this.starter.add(label('BUILD SUPPLY RACK'));this.group.add(this.starter);
    world.clearRocksAround?.(this.starter.position.x,this.starter.position.z,1);
    const readings=['Footing levels','Module alignment','Airlock clearance'];
    this.surveys=readings.map((text,i)=>{
      const g=new THREE.Group(),x=c.x+(i-1)*7,z=this.front+3;
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.09,1.35,8),steel);pole.position.y=.675;g.add(pole);
      const instrument=new THREE.Mesh(new THREE.BoxGeometry(.52,.3,.3),new THREE.MeshStandardMaterial({color:'#58a8d2',emissive:'#102f4a'}));instrument.position.y=1.4;g.add(instrument);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.65,.035,6,36),ghost('#76e5ff',.7));ring.rotation.x=-Math.PI/2;ring.position.y=.05;g.add(ring);
      g.add(label(text));g.position.set(x,heightAt(x,z),z);g.userData={kind:'hab-survey',id:i,label:'Calibrate · '+text};world.clearRocksAround?.(x,z,1);this.group.add(g);return g;
    });
    if (this.b) this.b.modules = this.mods.length;
    this.anim = null; this.apply(true);
  }
  get b() { return this.state().habBuild; }
  // Show what the saved step says is built.
  apply(initial = false) {
    const b = this.b, built = habitatBuilt(this.state()), s = b?.step ?? HAB_DONE, w = this.world;
    // Resume/co-op snapshots must replace any partial local visual animation.
    if(initial){this.anim=null;this.growing=[];if(this.measuring)this.measuring.mesh.rotation.y=0;this.measuring=null;this.m.model.scale.copy(this.model.scale);this.frames.forEach(f=>f.scale.set(1,1,1));}
    this.group.visible = !built;
    this.cargo.forEach((g,i)=>g.visible=s===0&&!!b?.pioneer?.exitedPod&&!b.pioneer.collected.includes(i));
    this.starter.visible=!!b?.pioneer&&b.pioneer.starterBuilt!==undefined&&b.pioneer.collected.length>0;
    this.starter.traverse(o=>{if(o.isMesh&&o.material===this.starter.children[0].material){o.material.opacity=b?.pioneer?.starterBuilt?1:.45;o.material.color.set(b?.pioneer?.starterBuilt?'#aebec7':'#72edc4');}});
    this.surveys.forEach((g,i)=>g.visible=s===0&&b?.pioneer?.collected.length===6&&!b.pioneer.surveyed.includes(i));
    this.rocks.forEach((r, i) => {
      r.visible = s === 1 && !b.cleared.includes(i);
      const hits = b?.rockHits?.[i] || 0;
      r.scale.set(.7, .5, .6).multiplyScalar(1 - .1 * Math.min(hits, 2));
      r.userData.label = `Break site rock (pickaxe) · ${Math.min(hits, 3)}/3 hits`;
    });
    // Survey poles are navigation decoration, not mining targets; keep the working area clear.
    for (const post of this.m.layout.group?.children || []) if (post.userData.surveyPost)
      post.visible = !this.rocks.some(rock => rock.visible && Math.hypot(post.position.x-rock.position.x, post.position.z-rock.position.z) < 2);

    this.pads.forEach((p, i) => (p.visible = s === 2 && !b.frames.includes(i)));
    this.frames.forEach((f, i) => (f.visible = !built && (s <= 3 || !!this.anim) && (s >= 3 || b.frames.includes(i))));
    this.post.visible = s === 3; this.airlock.visible = s === 4; this.valve.visible = s >= 4 && !built;
    const shells = s >= 4, stairs = s >= 5;
    if (!this.anim) this.m.model.visible = shells;
    if (this.m.group) this.m.group.visible = stairs;
    for (const p of [this.m.greenhouse, this.m.glassTunnel]) if (p) p.visible = built;
    // the finished base's collisions and stairs only exist once it does
    const want = new Set(built ? this.colliders : shells ? this.colliders.filter(q => this.mods.includes(q)) : []);
    for (const q of this.colliders) { const i = w.colliders.indexOf(q); if (want.has(q) && i < 0) w.colliders.push(q); else if (!want.has(q) && i >= 0) w.colliders.splice(i, 1); }
    this.m.walkHeight = stairs ? this.walkHeight : (x, z, ground) => ground;
    this.m.blockRails = stairs ? this.blockRails : () => {};
    w.remoteShadowDirty = true;
    if (!initial) this.save();
  }
  targets() { return habitatBuilt(this.state()) ? [] : [...this.cargo,...this.surveys,...this.rocks, ...this.pads, this.post, this.airlock, this.valve,...(this.b?.pioneer?.starterBuilt===false?[this.starter]:[])].filter(o => o.visible); }
  // Where the quest marker points
  target() {
    const b = this.b; if (!b || habitatBuilt(this.state())) return null;
    const p = this.world.player.position, nearest = list => list.filter(o => o.visible).sort((a, c) => a.position.distanceTo(p) - c.position.distanceTo(p))[0]?.position;
    if(b.pioneer?.starterBuilt===false&&b.pioneer.collected.length)return this.starter.position;
    if(b.step===0&&b.pioneer&&!pioneerReady(b))return nearest(b.pioneer.collected.length<6?this.cargo:this.surveys);
    if (b.step === 0) return { x: this.centre.x, z: this.front };
    if (b.step === 1) return nearest(this.rocks);
    if (b.step === 2) return nearest(this.pads);
    if (b.step === 3) return this.post.position;
    if (b.step === 4) return this.airlock.position;
    return this.valve.position;
  }
  advance(text) { this.b.step++; this.b.pressure = 0; this.apply(); if (text) this.guide(text, true); }
  mine(mesh) {
    const b=this.b,d=mesh?.userData;if(!b||d?.kind!=='hab-rock'||!mesh.visible||b.cleared.includes(d.id))return false;
      if (this.colony().tool !== 'pickaxe') { this.guide('Equip the pickaxe from your tool belt before breaking site rocks.'); return true; }
      if (this.striking || this.world.toolSwing >= 0) return true; this.striking = true;
      const accepted = this.world.swingTool(() => {
        this.striking = false;if(this.b!==b||!mesh.visible||b.cleared.includes(d.id))return; b.rockHits[d.id] = (b.rockHits[d.id] || 0) + 1;
        this.world.mineImpact?.(mesh.position, '#9b7657');
        if (b.rockHits[d.id] < 3) { this.apply(); this.notify(`Rock cracking · ${b.rockHits[d.id]}/3`); return; }
        if (!b.cleared.includes(d.id)) b.cleared.push(d.id);
        mesh.visible = false; this.notify(`Site cleared: ${b.cleared.length}/${ROCKS}`);
        if (b.cleared.length >= ROCKS) this.advance('Site clear. Now lay a foundation and raise a frame on each glowing footprint.'); else this.apply();
      });
      if (!accepted) this.striking = false; // a rejected swing must never lock the rock permanently
      return true;
  }
  use(mesh) {
    const b = this.b, d = mesh.userData; if (!b) return false;
    if(!mesh.visible)return true;
    if(d.kind==='hab-starter'){if(buildStarter(b)){recordStarter(this.state());this.apply();this.guide('First build complete! Your supply rack is ready. Suit air and the base clock now run: return to the pod to refill. Next, collect the remaining orange cargo.',true);}return true;}
    if(d.kind==='hab-cargo'){
      if(collectSalvage(b,d.id)){this.apply();this.guide('Cargo secured. '+stockText(b)+(b.pioneer.starterBuilt===false?' Next, use E / Action on the green supply rack beside the first cargo bundle.':b.pioneer.collected.length===6?' All cargo found. Use the three blue survey instruments next.':' Follow the marker to the next orange bundle.'),true);}return true;
    }
    if(d.kind==='hab-survey'){
      if(!b.pioneer?.calibrator)return true;
      if(!this.measuring){this.measuring={mesh,t:0};this.guide('Calibrator running: '+d.label+'. Stay within 3 metres for 3 seconds.');}return true;
    }
    if (d.kind === 'hab-rock') { this.guide('Site rock: '+(b.rockHits[d.id]||0)+'/3 hits. Left click or Mine with the pickaxe to clear it. E only inspects.');return true; }
    if (d.kind === 'hab-pad') {
      if (b.frames.includes(d.id)) return true;
      const cost=spendFor(b,'frame',d.id);if(!cost.ok){this.guide(cost.why);return true;}
      b.frames.push(d.id); mesh.visible = false; this.rise(this.frames[d.id]);
      this.notify(`Module ${d.id + 1} framed · ${b.frames.length}/${this.mods.length}`);
      if (b.frames.length >= this.mods.length) this.advance('All frames are up. Use the yellow control post to unfold the pressure shells.'); else this.save();
      return true;
    }
    if (d.kind === 'hab-shell') { if(b.step!==3)return true;const cost=spendFor(b,'shell');if(!cost.ok){this.guide(cost.why);return true;}this.unfold(); this.advance('Shells expanded. Next, attach the airlocks and stairs so you can get in without losing air.'); return true; }
    if (d.kind === 'hab-airlock') { if(b.step!==4)return true;const cost=spendFor(b,'airlock');if(!cost.ok){this.guide(cost.why);return true;}this.advance('Airlocks fitted. Open the green valve and stay close while the cabin fills with air.'); return true; }
    if (d.kind === 'hab-seal') {
      if (b.step < 5) { this.guide('Attach the airlocks first, or the air would leak straight out.'); return true; }
      if (b.pressure > 0) { this.notify('Pressurising · stay within 6 m'); return true; }
      b.pressure = .01; this.guide('Valve open. Stay within 6 metres until the cabin reaches pressure.'); return true;
    }
    return false;
  }
  // a frame (or the shells) grows up out of the ground
  rise(obj, seconds = 1.2) { obj.visible = true; obj.scale.set(1, .02, 1); (this.growing ??= []).push({ obj, t: 0, seconds }); }
  unfold() { const model = this.m.model; model.visible = true; this.anim = { t: 0, seconds: 3 }; }
  update(dt) {
    const b = this.b; if (!b || habitatBuilt(this.state())) return;
    for (const g of this.growing || []) { g.t += dt; const k = Math.min(1, g.t / g.seconds); g.obj.scale.y = .02 + .98 * (1 - Math.pow(1 - k, 3)); this.world.remoteShadowDirty = true; }
    if (this.growing) this.growing = this.growing.filter(g => g.t < g.seconds);
    if (this.anim) {
      const a = this.anim, model = this.m.model, s = this.model.scale; a.t += dt; const k = Math.min(1, a.t / a.seconds), e = 1 - Math.pow(1 - k, 3);
      model.scale.set(s.x * (.92 + .08 * e), s.y * Math.max(.03, e), s.z * (.92 + .08 * e)); model.updateMatrix(); model.updateMatrixWorld(true);
      this.frames.forEach(f => (f.visible = k < .9)); this.world.remoteShadowDirty = true;
      if (k >= 1) { model.scale.copy(s); model.updateMatrix(); model.updateMatrixWorld(true); this.anim = null; this.apply(true); }
    }
    const p = this.world.player.position;
    if(this.measuring){
      const q=this.measuring;
      if(q.mesh.position.distanceTo(p)>3){this.measuring=null;this.guide('Measurement cancelled. Stand within 3 metres of the instrument and try again.');}
      else {q.t+=dt;q.mesh.rotation.y=Math.sin(q.t*5)*.12;
        this.notify('Calibrating '+Math.min(100,Math.round(q.t/SURVEY_SECONDS*100))+'% · stay close');
        if(q.t>=SURVEY_SECONDS){recordSurvey(b,q.mesh.userData.id);q.mesh.rotation.y=0;this.measuring=null;this.apply();this.guide(b.pioneer.surveyed.length===3?'Survey complete. Clear the four site rocks, then build each module from recovered cargo.':'Survey recorded. Go to the next blue instrument.',true);}
      }
    }
    if (b.step === 0 && pioneerReady(b) && Math.hypot(p.x - this.centre.x, p.z - this.front) < 12) this.advance('This is your habitat site. First clear the four marked rocks with your pickaxe.');
    if (b.step === 5 && b.pressure > 0) {
      const near = this.valve.position.distanceTo(p) < 6;
      this.wheel.rotation.z += dt * 3;
      if (!near) { b.pressure = 0; this.guide('You walked away, so the valve closed. Go back to the green valve and open it again.'); return; }
      b.pressure = Math.min(PRESSURE_SECONDS, b.pressure + dt);
      if (b.pressure >= PRESSURE_SECONDS) { b.step = HAB_DONE; this.apply(); this.guide('The habitat holds pressure and the greenhouse dome is up. Welcome home! Go inside through Airlock 01.', true); this.onDone?.(); }
    }
  }
}
