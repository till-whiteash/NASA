import * as THREE from 'three';
import {loadModel} from './nasamodels.js';

// NASA-hosted JSC Mission Control Room, creator DigitalSpace Corporation.
// Select one complete console from the original room's material-batched meshes.
// Coordinates are in decoded world space; the source GLB remains unmodified.
export async function loadControlConsole(){
 const asset=await loadModel('training/jsc-mission-control.glb');
 if(!asset)return null;
 asset.scene.updateMatrixWorld(true);
 const group=new THREE.Group();group.name='JSC flight-controller console';
 const region=new THREE.Box3(new THREE.Vector3(-2.82,-.01,.62),new THREE.Vector3(1,1.65,2.19));
 const v=new THREE.Vector3();
 asset.scene.traverse(source=>{
  if(!source.isMesh)return;
  const input=source.geometry.clone().applyMatrix4(source.matrixWorld);
  const flat=input.index?input.toNonIndexed():input;
  const positions=flat.attributes.position,selected=[];
  for(let i=0;i<positions.count;i+=3){
   if([i,i+1,i+2].every(j=>region.containsPoint(v.fromBufferAttribute(positions,j))))selected.push(i,i+1,i+2);
  }
  if(selected.length){
   const geometry=new THREE.BufferGeometry();
   for(const [name,attr] of Object.entries(flat.attributes)){
    const values=new Float32Array(selected.length*attr.itemSize);
    selected.forEach((index,j)=>{for(let k=0;k<attr.itemSize;k++)values[j*attr.itemSize+k]=attr.array[index*attr.itemSize+k];});
    geometry.setAttribute(name,new THREE.BufferAttribute(values,attr.itemSize,attr.normalized));
   }
   geometry.translate(.9113,0,-1.405);
   // The archive GLB decodes with black base colors: restore readable training-room finishes.
   const finishes={'0':'#8a9598','0_3':'#aab0ab','0_4':'#6e7c80','0_5':'#c5c7bd','0_6':'#26353d','0_8':'#d5ddd8','0_22':'#294c5b','0_23':'#527482','0_24':'#dae8de','0_28':'#8e9692','0_41':'#c5c9c3'};
   const material=new THREE.MeshStandardMaterial({color:finishes[source.name]||'#64767d',roughness:.72,metalness:.12});
   if(source.name==='0_22'){material.emissive.set('#173744');material.emissiveIntensity=.5;}
   const part=new THREE.Mesh(geometry,material);part.name=source.name;group.add(part);
  }
  if(flat!==input)flat.dispose();input.dispose();
 });
 return group;
}
