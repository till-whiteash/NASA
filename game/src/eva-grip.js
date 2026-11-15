import * as THREE from 'three';
import {loadModel} from './nasamodels.js';
import {mergeStatic} from './static-merge.js';
let template;
export function fitViewGlove(holder){
 // Tool metadata is supplied by makeTool; no inferred pose for other implements.
 if(holder?.userData.toolKind!=='pickaxe'||!holder.toolRoot)return Promise.resolve(null);
 holder.scale.setScalar(.55);holder.toolRoot.position.y=-.18;
 template??=loadModel('tools/eva-grip.glb').then(g=>{if(!g){template=null;return null;}const model=g.scene.clone(true);mergeStatic(model);return model;});
 holder.gloveReady=template.then(model=>{
  if(!model)return null;
  const glove=model.clone(true),tool=holder.toolRoot;
  glove.name='EVA grip';glove.position.copy(tool.position);glove.quaternion.copy(tool.quaternion);glove.scale.copy(tool.scale);
  glove.traverse(o=>{if(!o.isMesh)return;o.material.depthTest=true;o.material.depthWrite=true;o.material.fog=false;o.renderOrder=11;o.userData.sharedAsset=true;});
  holder.add(glove);holder.glove=glove;alignViewGlove(holder);return glove;
 });return holder.gloveReady;
}

export function alignViewGlove(holder){
 const glove=holder?.glove,tool=holder?.toolRoot,grip=tool?.getObjectByName('grip');
 // Keep depth inside the hand/tool assembly, including tools that load later.
 if(holder?.userData.toolKind==='pickaxe')holder.traverse(o=>{for(const m of o.material?[].concat(o.material):[]){m.depthTest=true;m.depthWrite=true;}});
 if(!glove||glove.userData.aligned||!grip)return;
 tool.updateWorldMatrix(true,true);
 const centre=new THREE.Box3().setFromObject(grip).getCenter(new THREE.Vector3()).applyMatrix4(new THREE.Matrix4().copy(tool.matrixWorld).invert());
 const offset=centre.clone().add(new THREE.Vector3(0,-.083,0));
 glove.position.copy(tool.position).add(offset.multiply(tool.scale).applyQuaternion(tool.quaternion));
 glove.quaternion.copy(tool.quaternion);glove.scale.copy(tool.scale);glove.userData.aligned=true;glove.userData.gripCentre=centre.toArray();
}
