import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { loadModel } from './nasamodels.js';

export const Z2_MODEL = 'models/nasa-spacesuits/z2-gameplay.glb';

// Exported from Claude's astro_kit: keep its capsule skin weights and bone axes.
export async function loadZ2Astronaut() {
  const gltf = await loadModel(Z2_MODEL);
  if (!gltf) return null;
  const root = clone(gltf.scene);
  root.name = 'NASA Z-2 articulated suit';
  root.userData.suitModel = 'Z2';
  root.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    o.frustumCulled = false;
    // Fabric needs a broad, soft highlight under the habitat's inspection lamps.
    const materials=[].concat(o.material).map(m=>{const c=m.clone();c.roughness=Math.max(.8,c.roughness??.8);return c;});
    o.material=Array.isArray(o.material)?materials:materials[0];
  });
  const mixer = new THREE.AnimationMixer(root), actions = {};
  for (const clip of gltf.animations) {
    const action = mixer.clipAction(clip);
    action.play().setEffectiveWeight(clip.name === 'Idle' ? 1 : 0);
    actions[clip.name] = action;
  }
  const bone = n => root.getObjectByName(n);
  const suit = { root, model:'Z2', mixer, actions, lastTime:0,
    pelvis:bone('pelvis'), torso:bone('spine'),
    hips:[bone('thigh_n'),bone('thigh_p')], knees:[bone('shin_n'),bone('shin_p')],
    arms:[bone('arm_n'),bone('arm_p')], elbows:[bone('fore_n'),bone('fore_p')] };
  if ([suit.pelvis,suit.torso,...suit.hips,...suit.knees,...suit.arms,...suit.elbows].some(b=>!b)) {
    throw new Error('The Z-2 gameplay rig is incomplete');
  }
  poseZ2Astronaut(suit,{phase:0,pace:0,run:0,air:0,t:0});
  return suit;
}

export function poseZ2Astronaut(a,{phase=0,pace=0,run=0,air=0,t=0,vy=0,swing=-1,crouch=0,activity}) {
  const dt=Math.min(.1,Math.max(0,t-a.lastTime)); a.lastTime=t;
  const kind=swing>=0?'Dig':air>.35?'Jump':crouch>.45?'Crouch':
    activity&&a.actions[activity]?activity:pace>.08?(run>.45?'Run':'Walk'):'Idle';
  const blend=1-Math.exp(-12*(dt||1/60));
  for (const [name,action] of Object.entries(a.actions)) {
    const duration=action.getClip().duration;
    if (name==='Walk'||name==='Run') action.time=(((phase/Math.PI/2)%1)+1)%1*duration;
    else if(name==='Dig') action.time=Math.max(0,swing)*duration*.5;
    else if(name==='Jump') action.time=THREE.MathUtils.clamp(vy>0?(1-vy/3.2)*.5:.5-vy/8,0,.99)*duration;
    else action.time=(t%duration+duration)%duration;
    action.setEffectiveWeight(THREE.MathUtils.lerp(action.getEffectiveWeight(),name===kind?1:0,blend));
  }
  a.mixer.update(0);
  return {bob:-crouch*.18+(Math.cos(phase*2)-1)*.012*pace*(1-air),sway:Math.sin(phase)*.012*pace};
}
