// The habitat construction site in the world (quest state and text: habitat-build-state.js).
import * as THREE from 'three';
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
      const flag = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 1.1, 8), new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#7a3a00' }));
      flag.position.set(.55, .7, 0); flag.scale.setScalar(1 / .6); rock.add(flag);
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
    if (this.b) this.b.modules = this.mods.length;
    this.anim = null; this.apply(true);
  }
  get b() { return this.state().habBuild; }
  // Show what the saved step says is built.
  apply(initial = false) {
    const b = this.b, built = habitatBuilt(this.state()), s = b?.step ?? HAB_DONE, w = this.world;
    this.group.visible = !built;
    this.rocks.forEach((r, i) => (r.visible = s === 1 && !b.cleared.includes(i)));
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
  targets() { return habitatBuilt(this.state()) ? [] : [...this.rocks, ...this.pads, this.post, this.airlock, this.valve].filter(o => o.visible); }
  // Where the quest marker points
  target() {
    const b = this.b; if (!b || habitatBuilt(this.state())) return null;
    const p = this.world.player.position, nearest = list => list.filter(o => o.visible).sort((a, c) => a.position.distanceTo(p) - c.position.distanceTo(p))[0]?.position;
    if (b.step === 0) return { x: this.centre.x, z: this.front };
    if (b.step === 1) return nearest(this.rocks);
    if (b.step === 2) return nearest(this.pads);
    if (b.step === 3) return this.post.position;
    if (b.step === 4) return this.airlock.position;
    return this.valve.position;
  }
  advance(text) { this.b.step++; this.b.pressure = 0; this.apply(); if (text) this.guide(text, true); }
  use(mesh) {
    const b = this.b, d = mesh.userData; if (!b) return false;
    if (d.kind === 'hab-rock') {
      if (this.colony().tool !== 'pickaxe') { this.guide('Equip the pickaxe from your tool belt (1 or 2) before breaking site rocks.'); return true; }
      if (this.striking) return true; this.striking = true;
      this.world.swingTool(() => {
        this.striking = false; b.rockHits[d.id] = (b.rockHits[d.id] || 0) + 1;
        if (b.rockHits[d.id] < 3) { this.notify(`Rock cracking · ${b.rockHits[d.id]}/3`); return; }
        if (!b.cleared.includes(d.id)) b.cleared.push(d.id);
        mesh.visible = false; this.notify(`Site cleared: ${b.cleared.length}/${ROCKS}`);
        if (b.cleared.length >= ROCKS) this.advance('Site clear. Now lay a foundation and raise a frame on each glowing footprint.'); else this.save();
      });
      return true;
    }
    if (d.kind === 'hab-pad') {
      if (b.frames.includes(d.id)) return true;
      b.frames.push(d.id); mesh.visible = false; this.rise(this.frames[d.id]);
      this.notify(`Module ${d.id + 1} framed · ${b.frames.length}/${this.mods.length}`);
      if (b.frames.length >= this.mods.length) this.advance('All frames are up. Use the yellow control post to unfold the pressure shells.'); else this.save();
      return true;
    }
    if (d.kind === 'hab-shell') { this.unfold(); this.advance('Shells expanded. Next, attach the airlocks and stairs so you can get in without losing air.'); return true; }
    if (d.kind === 'hab-airlock') { this.advance('Airlocks fitted. Open the green valve and stay close while the cabin fills with air.'); return true; }
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
    if (b.step === 0 && Math.hypot(p.x - this.centre.x, p.z - this.front) < 12) this.advance('This is your habitat site. First clear the four flagged rocks with your pickaxe.');
    if (b.step === 5 && b.pressure > 0) {
      const near = this.valve.position.distanceTo(p) < 6;
      this.wheel.rotation.z += dt * 3;
      if (!near) { b.pressure = 0; this.guide('You walked away, so the valve closed. Go back to the green valve and open it again.'); return; }
      b.pressure = Math.min(PRESSURE_SECONDS, b.pressure + dt);
      if (b.pressure >= PRESSURE_SECONDS) { b.step = HAB_DONE; this.apply(); this.guide('The habitat holds pressure and the greenhouse dome is up. Welcome home! Go inside through Airlock 01.', true); this.onDone?.(); }
    }
  }
}
