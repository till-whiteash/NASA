// The approved Blender power kit is shared by the workbench and installed equipment.
// Batch static geometry once; quality presets never substitute another model.
import * as THREE from 'three';
import {loadModel} from './nasamodels.js';
import {mergeStatic} from './static-merge.js';

const templates=new Map();
export function powerModel(name){
 if(!templates.has(name))templates.set(name,loadModel('power/'+name+'.glb').then(g=>{
  if(!g){templates.delete(name);return null;}
  const root=g.scene.clone(true);root.name='Power kit: '+name;
  root.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
  mergeStatic(root);
  root.traverse(o=>{o.userData.sharedAsset=true;});
  root.userData.powerAsset=name;
  return root;
 }));
 return templates.get(name).then(root=>root?.clone(true)||null);
}

// Keep the existing gameplay anchor (and its visibility/collider), changing only its visual.
export function installPowerModel(anchor,name,{scale=1,y=0,prepare}={}){
 anchor.userData.powerAssetState='loading';
 anchor.powerModelReady=powerModel(name).then(model=>{
  if(!model){anchor.userData.powerAssetState='failed';return null;}
  model.scale.setScalar(scale);model.position.y=y;prepare?.(model);
  anchor.add(model);anchor.powerVisual=model;
  if(anchor.isMesh)anchor.material.visible=false;
  anchor.userData.powerAssetState='ready';return model;
 });
 return anchor.powerModelReady;
}

export async function installSolarModels(solar){
 const [module,frame]=await Promise.all([powerModel('solar-module'),powerModel('support-frame')]);
 if(!module||!frame){solar.group.userData.powerAssetState='failed';return false;}
 // One world-local cell material shares the cleaning uniform with the original
 // outpost panels. Keep the GLB's actual cell meshes, silver busbars and PBR colour.
 const cells=new Map(),dust=solar.group.userData.panelMat.userData.dust;
 module.traverse(o=>{if(!o.isMesh||o.material.name!=='pv_cell')return;
  const original=o.material;
  if(!cells.has(original)){
   const m=original.clone();m.userData.dust=dust;
   m.onBeforeCompile=shader=>{shader.uniforms.panelDust=dust;shader.fragmentShader='uniform float panelDust;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.55,0.29,0.12),panelDust * 0.92);');};
   m.customProgramCacheKey=()=> 'power-kit-dust-v1';cells.set(original,m);
  }o.material=cells.get(original);
 });
 solar.group.userData.fieldCellMaterials=[...cells.values()];
 // Two portrait modules fit the existing 3.2 x 2 m table. Feet and vertical
 // terrain-adjusted legs stay in place; the original top remains the raycast root.
 const top=new THREE.Group();top.name='Installed solar kit';
 frame.scale.set(3.2/.44,1.5,2/.36);frame.position.y=-.1;top.add(frame);
 for(const x of [-.8,.8]){const m=module.clone(true);m.rotation.y=Math.PI/2;m.scale.setScalar(4.8);m.position.set(x,-.06,0);top.add(m);}
 mergeStatic(top);top.traverse(o=>{o.userData.sharedAsset=true;});
 top.userData.powerAsset='solar-module + support-frame';
 for(const panel of solar.panels){const surface=panel.children[0];for(const old of surface.children)old.visible=false;const visual=top.clone(true);surface.add(visual);panel.powerVisual=visual;panel.userData.powerAssetState='ready';}
 solar.group.userData.powerAssetState='ready';return true;
}
