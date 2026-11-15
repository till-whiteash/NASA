// Full-screen playback of the authored Blender movies in animation/previews/.
// Clip ranges and responsive captions come from animation/glb/<name>.captions.json.
//   playCinematic('briefing_mission')                        -> Promise that resolves when it ends or is skipped
//   playCinematic('failure_solar_panel', { clip: 'panel_failure', world })   (pauses the game while it plays)
//   const loop = loopCinematic('cruise_loop', parentElement)  -> { stop() }  (loading-screen background)
// Only Skip or Esc advances. Films keep their authored motion and do not depend on WebGL rendering.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// Crew slots: the Blender films mark where each crew member stands and what they do (empties with crew_* extras);
// the real Mixamo characters from assets/crew are loaded there and retargeted exactly like src/hab-crew.js does.
const crewLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const crewCache = new Map();
const crewFile = f => { if (!crewCache.has(f)) crewCache.set(f, crewLoader.loadAsync('assets/crew/' + f)); return crewCache.get(f); };
const norm = n => n.replace(/^mixamorig\d*:?/, '').replace(/_\d+$/, '');
export async function fillCrewSlots(root, mixers) {
  const slots = []; root.traverse(o => { if (o.userData?.crew_char) slots.push(o); });
  if (!slots.length) return;
  const clips = (await crewFile('crew-anims.glb')).animations;
  await Promise.all(slots.map(async slot => {
    const d = slot.userData, g = await crewFile(d.crew_char + '.glb');
    const { clone } = await import('three/addons/utils/SkeletonUtils.js');
    const model = clone(g.scene);
    model.updateWorldMatrix(true, true);
    const h = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).y || 1;
    model.scale.multiplyScalar((d.crew_height || 1.7) / h);
    const tint = d.crew_tint && new THREE.Color(...d.crew_tint), match = d.crew_tint_match && new RegExp(d.crew_tint_match);
    model.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (tint && match.test(o.name)) { o.material = o.material.clone(); o.material.color.multiply(tint); } } });
    slot.add(model);
    const byName = {};
    model.traverse(o => { if (/^mixamorig/.test(o.name) && norm(o.parent?.name ?? '') !== norm(o.name)) (byName[norm(o.name)] ??= []).push(o.name); });
    const src = THREE.AnimationClip.findByName(clips, d.crew_clip) || clips[0], tracks = [];
    for (const t of src.tracks) { const i = t.name.lastIndexOf('.'), node = t.name.slice(0, i), prop = t.name.slice(i + 1); for (const target of byName[norm(node)] ?? []) { const k = t.clone(); k.name = target + '.' + prop; tracks.push(k); } }
    const mixer = new THREE.AnimationMixer(model), act = mixer.clipAction(new THREE.AnimationClip(src.name, src.duration, tracks));
    act.play(); act.time = (d.crew_offset || 0) * src.duration; mixer.timeScale = d.crew_speed || 1;
    mixers.push(mixer);
  }));
}

const ANIMATION_ROOT = new URL('../animation/', import.meta.url);
export const BASE = new URL('glb/', ANIMATION_ROOT).href;
export const LOOKS = {                                        // background, hemisphere sky/ground, sun colour
  space: { bg: '#000', sky: '#9fb3ff', ground: '#000', sun: '#fff6ea', hemi: .35, sunI: 3.2 },
  room: { bg: '#05070d', sky: '#8fb4ff', ground: '#201008', hemi: .9, sunI: 1.6, glow: true, bars: true },   // the briefing room
  solar: { bg: '#000', sky: '#9fb3ff', ground: '#000', sun: '#fff6ea', hemi: .2, sunI: 3.2, point: true },   // lit by the Sun at the centre
  earth: { bg: '#9db8dc', sky: '#cfe2ff', ground: '#5d6b45', sun: '#fff4e2', hemi: 1.2, sunI: 3.0 },
  mars: { bg: '#c49a78', sky: '#f2d2b4', ground: '#6b3d26', sun: '#ffe6c8', hemi: 1.1, sunI: 2.6, fog: [160, 1400] },
};
// Newly rendered clean movies use responsive captions; legacy movies retain baked captions.
const CLEAN_VIDEO = name => ['ares_vi_briefing', 'ares_vi_briefing_moon', 'launch_moon', 'briefing_mission', 'briefing_moon', 'cruise_loop', 'mars_approach'].includes(name);
const VIDEO = name => new URL(`previews/${name}${CLEAN_VIDEO(name) ? '-hd' : ''}.mp4`, ANIMATION_ROOT).href;
const captionsCache = new Map();
function captionsFor(name) {
  if (!captionsCache.has(name)) captionsCache.set(name, fetch(new URL(`glb/${name}.captions.json`, ANIMATION_ROOT), { signal: AbortSignal.timeout(5000) }).then(r => r.ok ? r.json() : null).catch(() => null));
  return captionsCache.get(name);
}

export function playCinematic(name, { clip, world } = {}) {
  return new Promise(resolve => {                    // plays even with reduced motion: the films carry the story
    const box = document.createElement('section'); box.className = 'cinematic'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Cutscene');
    box.innerHTML = '<p class="cine-phase"></p><p class="cine-cap" aria-live="polite"></p><button type="button" class="cine-skip">Skip ›</button><p class="cine-load">Loading…</p>';
    document.body.append(box);
    const cap = box.querySelector('.cine-cap'), phase = box.querySelector('.cine-phase');
    let done = false, video = null, videoPending = false;
    const playVideo = async () => {
      if (done || video || videoPending) return;
      videoPending = true;
      const videoCaps = (clip || CLEAN_VIDEO(name)) ? await captionsFor(name) : null;
      const range = clip ? videoCaps?.clips?.find(c => c.name === clip) : null;   // one clip of a longer film
      if (done) return;
      videoPending = false;
      video = document.createElement('video'); video.className = 'cine-video';
      Object.assign(video, { src: VIDEO(name), muted: true, playsInline: true, preload: 'auto' }); video.setAttribute('playsinline', '');
      box.prepend(video); box.classList.add('cine-has-video'); cap.textContent = ''; phase.textContent = '';
      const loading = box.querySelector('.cine-load');
      if (loading) loading.textContent = 'Loading movie…';
      video.addEventListener('loadeddata', () => loading?.remove(), { once: true });
      if (CLEAN_VIDEO(name)) {
        box.classList.remove('cine-bars'); box.classList.add('cine-clean-video');
        delete cap.dataset.key;
        const updateCaptions = () => {
          const line = videoCaps?.captions?.find(l => video.currentTime >= l.t0 && video.currentTime < l.t1);
          const id = line ? String(line.t0) : '';
          if (cap.dataset.key === id) return;
          cap.dataset.key = id; cap.textContent = ''; phase.textContent = line?.phase || '';
          if (line?.who) { const who = document.createElement('b'); who.className = 'cine-who'; who.textContent = line.who; cap.append(who); }
          if (line) cap.append(line.text);
        };
        video.addEventListener('timeupdate', updateCaptions);
        video.addEventListener('seeked', updateCaptions);
        video.addEventListener('loadedmetadata', updateCaptions);
        updateCaptions();
      }
      const from = range?.start || 0, to = range?.end;
      video.addEventListener('loadedmetadata', () => { if (from) video.currentTime = from; }, { once: true });
      if (to) video.addEventListener('timeupdate', () => { if (video.currentTime >= to - .05) end(true); });
      video.onended = () => end(true);
      video.onerror = () => { console.warn('Cutscene video unavailable:', name); end(false); };
      video.play().catch(() => {                       // a browser that blocks autoplay: one tap starts it
        if (done || !video || box.querySelector('.cine-play')) return;
        const b = document.createElement('button'); b.type = 'button'; b.className = 'cine-play'; b.textContent = '▶ Play';
        b.onclick = () => { b.disabled = true; video.play().then(() => b.remove()).catch(() => { b.disabled = false; }); }; box.append(b);
      });
    };
    if (world) { world.cinematic = true; for (const k of Object.keys(world.keys || {})) world.keys[k] = false; }
    const end = played => {
      if (done) return; done = true; video?.pause(); removeEventListener('keydown', key, true);
      box.classList.add('cine-out');
      setTimeout(() => box.remove(), 400);
      if (world) world.cinematic = false;
      resolve(played);
    };
    const advance = () => end(true);
    const key = e => { if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); advance(); } else if (['Space', 'Enter'].includes(e.code)) { e.preventDefault(); e.stopPropagation(); } };
    addEventListener('keydown', key, true);
    // Skip exits this film; the caller advances the mission.
    box.querySelector('.cine-skip').onclick = advance;
    // Cinematics use the authored Blender film, never the simplified GLB preview.
    playVideo();
  });
}

// Looping background (the loading screen during the trip). Captions show under it; stop() removes it.
export function loopCinematic(name, parent) {
  const holder = document.createElement('div'); holder.className = 'cine-loop'; parent.prepend(holder);
  const video = document.createElement('video');
  Object.assign(video, { src: VIDEO(name), muted: true, playsInline: true, loop: true, preload: 'auto' });
  Object.assign(video.style, { width: '100%', height: '100%', objectFit: 'contain' });
  video.setAttribute('playsinline', ''); holder.append(video);
  let stopped = false;
  if (CLEAN_VIDEO(name)) {
    const caption = document.createElement('p'); caption.className = 'cine-cap'; holder.append(caption);
    captionsFor(name).then(data => {
      if (stopped) return;
      const update = () => { const line = data?.captions?.find(l => video.currentTime >= l.t0 && video.currentTime < l.t1); if (caption.textContent !== (line?.text || '')) caption.textContent = line?.text || ''; };
      video.addEventListener('timeupdate', update); update();
    });
  }
  video.play().catch(() => {});
  return { stop() { stopped = true; video.pause(); video.removeAttribute('src'); video.load(); holder.remove(); } };
}
