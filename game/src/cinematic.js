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
// Films with a clean 1080p movie (previews/<name>-hd.mp4) get captions drawn by the page; the rest still play their
// legacy movie with baked captions until their HD render is added here.
const HD_FILMS = new Set(['ares_vi_briefing', 'ares_vi_briefing_moon', 'launch_moon', 'briefing_mission', 'briefing_moon', 'cruise_loop', 'mars_approach', 'launch_earth']);
const CLEAN_VIDEO = name => HD_FILMS.has(name);
// The film that usually follows each one: it starts downloading while this one plays, so there is no wait between them.
const FILM_NEXT = { ares_vi_briefing: 'briefing_mission', briefing_mission: 'launch_earth', launch_earth: 'cruise_loop',
  ares_vi_briefing_moon: 'briefing_moon', briefing_moon: 'launch_moon', mars_approach: 'outpost_26_months' };
const preloaded = new Map();
let preloadExpiry;
function releaseVideo(video) {
  if (!video) return;
  video.pause(); video.onended = null; video.onerror = null;
  video.removeAttribute('src'); video.load(); // explicitly release decoder and buffered media
}

function filmVideo(name) {
  const v = document.createElement('video'); v.className = 'cine-video';
  v.muted = true; v.defaultMuted = true; v.setAttribute('muted', '');          // muted films may always autoplay
  v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; v.poster = POSTER(name); v.src = VIDEO(name);
  return v;
}
// Start downloading a film before it is needed (call it a scene early). Safe to call more than once.
export function preloadCinematic(name) {
  if (!name || preloaded.has(name)) return;
  for (const video of preloaded.values()) releaseVideo(video);
  preloaded.clear(); clearTimeout(preloadExpiry); // at most one upcoming film
  const v = filmVideo(name); v.load(); preloaded.set(name, v); captionsFor(name);
  preloadExpiry = setTimeout(() => {
    if (preloaded.get(name) === v) { preloaded.delete(name); releaseVideo(v); }
  }, 60000); // release unused look-ahead buffers during long gameplay sessions
}
const VIDEO = name => new URL(`previews/${name}${CLEAN_VIDEO(name) ? '-hd' : ''}.mp4`, ANIMATION_ROOT).href;
const POSTER = name => new URL(`previews/posters/${name}.jpg`, ANIMATION_ROOT).href;
// What the loading screen calls each film.
const FILM_TITLES = {
  ares_vi_briefing: ['Ares VI · final briefing', 'Mars mission'], ares_vi_briefing_moon: ['Artemis · final briefing', 'Moon mission'],
  briefing_mission: ['The road to Mars', 'Mission plan'], briefing_moon: ['The road to the Moon', 'Mission plan'],
  launch_earth: ['Liftoff', 'Leaving Earth'], launch_moon: ['Liftoff', 'Leaving Earth'], cruise_loop: ['Six months in space', 'The journey'],
  mars_approach: ['Arriving at Mars', 'Orbit insertion'], edl_mars: ['Entry, descent and landing', 'Seven minutes'],
  outpost_26_months: ['Twenty-six months', 'Building the outpost'], dust_storm: ['Dust storm', 'Mars weather'],
  failure_solar_panel: ['Panel fault', 'Something broke'], failure_rover_stuck: ['Rover stuck', 'Something broke'],
  failure_air_leak: ['Air leak', 'Something broke'], ascent_mars: ['Leaving Mars', 'Mission complete'],
};
const LOADING_FACTS = [
  'Light from Mars takes between 3 and 22 minutes to reach Earth, so mission control can never steer you live.',
  'A day on Mars, a sol, lasts 24 hours 39 minutes.',
  'Mars has two small moons, Phobos and Deimos.',
  'Olympus Mons on Mars is about two and a half times taller than Mount Everest.',
  'The Moon is moving away from Earth by about 3.8 cm every year.',
  'Mars gravity is 38% of Earth\'s: a 40 kg backpack would feel like 15 kg.',
  'Twelve people have walked on the Moon, all between 1969 and 1972.',
  'Mars is red because its dust is full of iron oxide: rust.',
];
// A loading screen for the film's video: a still from the film, its title, real download progress and a fact.
function filmLoader(box, name) {
  const [title, kicker] = FILM_TITLES[name] || ['Mission film', 'Zhetalis'];
  const el = document.createElement('div'); el.className = 'cine-loading';
  el.innerHTML = `<img class="cl-poster" alt="" src="${POSTER(name)}"><div class="cl-card"><p class="cl-kicker"></p><h2 class="cl-title"></h2>
    <div class="cl-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div><p class="cl-status">Loading film…</p><p class="cl-fact"></p></div>`;
  el.querySelector('.cl-kicker').textContent = kicker; el.querySelector('.cl-title').textContent = title;
  el.querySelector('.cl-poster').onerror = e => e.target.remove();
  const bar = el.querySelector('.cl-bar'), fill = bar.querySelector('i'), status = el.querySelector('.cl-status'), fact = el.querySelector('.cl-fact');
  let f = Math.floor(Math.random() * LOADING_FACTS.length);
  const nextFact = () => { fact.classList.remove('on'); setTimeout(() => { fact.textContent = LOADING_FACTS[f++ % LOADING_FACTS.length]; fact.classList.add('on'); }, 250); };
  nextFact(); const factTimer = setInterval(nextFact, 6000);
  box.append(el);
  let shown = 3; const born = performance.now(), MIN_MS = 1400;   // long enough to read, never a flicker
  return {
    progress(video) {                                  // how much of the film has downloaded (the browser starts it when it can)
      const d = video.duration, b = video.buffered;
      if (!d || !isFinite(d) || !b.length) return;
      let end = 0; for (let i = 0; i < b.length; i++) if (b.start(i) <= video.currentTime + .5) end = Math.max(end, b.end(i));
      const pct = Math.min(100, Math.max(shown, Math.round(end / d * 100))); shown = pct;
      fill.style.width = pct + '%'; bar.setAttribute('aria-valuenow', pct); status.textContent = `Loading film… ${pct}%`;
    },
    ready() { status.textContent = 'Starting…'; fill.style.width = Math.max(shown, 100) + '%'; },
    done(now = false) { const wait = now ? 0 : Math.max(0, MIN_MS - (performance.now() - born)); setTimeout(() => { clearInterval(factTimer); el.classList.add('cl-out'); setTimeout(() => el.remove(), 450); }, wait); },
  };
}
const captionsCache = new Map();
function captionsFor(name) {
  if (!captionsCache.has(name)) captionsCache.set(name, fetch(new URL(`glb/${name}.captions.json`, ANIMATION_ROOT), { signal: AbortSignal.timeout(5000) }).then(r => r.ok ? r.json() : null).catch(() => null));
  return captionsCache.get(name);
}

export function playCinematic(name, { clip, world, onSkip } = {}) {
  return new Promise(resolve => {                    // plays even with reduced motion: the films carry the story
    const box = document.createElement('section'); box.className = 'cinematic'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Cutscene');
    box.innerHTML = '<p class="cine-phase"></p><p class="cine-cap" aria-live="polite"></p><button type="button" class="cine-skip">Skip ›</button><p class="cine-load">Loading…</p>';
    document.body.append(box);
    const cap = box.querySelector('.cine-cap'), phase = box.querySelector('.cine-phase');
    let done = false, video = null, videoPending = false, endLoader = null, stopRetry = null;
    box.insertAdjacentHTML('beforeend', '<p class="cine-buffer-badge" aria-live="polite">Buffering…</p>');
    const playVideo = async () => {
      if (done || video || videoPending) return;
      videoPending = true;
      const videoCaps = (clip || CLEAN_VIDEO(name)) ? await captionsFor(name) : null;
      const range = clip ? videoCaps?.clips?.find(c => c.name === clip) : null;   // one clip of a longer film
      if (done) return;
      videoPending = false;
      video = preloaded.get(name) || filmVideo(name); preloaded.delete(name);
      box.prepend(video); box.classList.add('cine-has-video'); cap.textContent = ''; phase.textContent = '';
      box.querySelector('.cine-load')?.remove();
      // The loading card only appears if the film is not running after a moment (slow connection), never as a flash.
      let loader = null;
      const loaderTimer = setTimeout(() => { if (!done && !box.classList.contains('cine-playing')) { loader = filmLoader(box, name); loader.progress(video); if (video.readyState >= 3) loader.ready(); } }, 900);
      const onProgress = () => loader?.progress(video);
      for (const ev of ['progress', 'loadedmetadata', 'durationchange']) video.addEventListener(ev, onProgress);
      video.addEventListener('canplay', () => loader?.ready());
      video.addEventListener('playing', () => { clearTimeout(loaderTimer); box.classList.add('cine-playing'); loader?.done(true); preloadCinematic(FILM_NEXT[name]); }, { once: true });
      endLoader = () => { clearTimeout(loaderTimer); loader?.done(true); };
      // a slow connection mid-film: a small buffering badge instead of a frozen picture
      video.addEventListener('waiting', () => { if (video.currentTime > .2) box.classList.add('cine-buffering'); });
      video.addEventListener('playing', () => box.classList.remove('cine-buffering'));
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
      // Play straight away, with no play button. Muted films are allowed to autoplay; if a browser still holds one back,
      // keep asking as data arrives and on the player's next key press, click or tap anywhere.
      const tryPlay = () => { if (!done && video?.paused && !video.ended) video.play()?.catch?.(() => {}); };
      for (const ev of ['loadedmetadata', 'loadeddata', 'canplay']) video.addEventListener(ev, tryPlay);
      for (const ev of ['pointerdown', 'keydown', 'touchstart']) addEventListener(ev, tryPlay, true);
      const retry = setInterval(() => { if (done || box.classList.contains('cine-playing')) clearInterval(retry); else tryPlay(); }, 350);
      stopRetry = () => { clearInterval(retry); for (const ev of ['pointerdown', 'keydown', 'touchstart']) removeEventListener(ev, tryPlay, true); };
      tryPlay();
    };
    const previousVideo = world?.cinematicVideo;
    if (world) { world.cinematicVideo = true; world.cinematic = true; for (const k of Object.keys(world.keys || {})) world.keys[k] = false; }
    const end = played => {
      if (done) return; done = true; video?.pause(); endLoader?.(); stopRetry?.(); removeEventListener('keydown', key, true);
      box.classList.add('cine-out');
      setTimeout(() => { releaseVideo(video); box.remove(); }, 400);
      if (world) { world.cinematic = false; world.cinematicVideo = previousVideo; }
      resolve(played);
    };
    const advance = () => { onSkip?.(); end(true); };
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
  const video = preloaded.get(name) || document.createElement('video'); preloaded.delete(name);
  Object.assign(video, { src: VIDEO(name), muted: true, defaultMuted: true, playsInline: true, loop: true, autoplay: true, preload: 'auto' }); video.setAttribute('muted', '');
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
