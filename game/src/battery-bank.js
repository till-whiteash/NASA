import * as THREE from 'three';
import {heightAt} from './world.js';
import {installPowerModel} from './power-models.js';
import {TUNED} from './sim.js';
import {placeBank,checkBank,connectBank} from './battery-bank-state.js';

// Physical field expansion uses the same first-person ray/reach limit as the original tutorial.
export class BatteryBank{
 constructor(world,{state,save,guide,cancel,cable}){
  Object.assign(this,{world,state,save,guide,cancelOther:cancel,cable});this.nodes=[];this.cables=new Map();
  this.group=new THREE.Group();world.scene.add(this.group);
  this.preview=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:'#ffe09a'}));world.scene.add(this.preview);this.preview.visible=false;
 }
 cancel(){this.held=null;this.preview.visible=false;}
 make(i){
  const pack=this.world.settlement.pack.position,x=pack.x+3+(i%3)*2.5,z=pack.z-2-Math.floor(i/3)*2.5,y=heightAt(x,z),g=new THREE.Group();g.position.set(x,y,z);this.group.add(g);this.world.clearRocksAround?.(x,z,1.3);
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.5,.9,1),new THREE.MeshStandardMaterial({color:'#a3aeb1',metalness:.45,roughness:.5}));body.position.y=.575;g.add(body);installPowerModel(body,'battery-cabinet',{y:-.45});
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#13242c';ctx.fillRect(0,0,512,256);ctx.fillStyle='#f3d07b';ctx.font='bold 36px system-ui';ctx.fillText('PACK '+(i+2)+'  |  48 V',24,55);ctx.fillStyle='#e7f4f4';ctx.font='27px system-ui';ctx.fillText('FUSE + BMS + ISOLATOR',24,108);ctx.fillText('PARALLEL SERVICE',24,151);ctx.fillText('E / Action: inspect',24,204);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const check=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.32),new THREE.MeshBasicMaterial({map:texture}));check.position.set(0,.39,.516);check.userData={kind:'bank-check',index:i,label:'Inspect 48 V matching, mounts and branch isolators'};g.add(check);
  const ghost=new THREE.Mesh(new THREE.BoxGeometry(1.5,.9,1),new THREE.MeshBasicMaterial({color:'#72ddd6',transparent:true,opacity:.3}));ghost.position.set(x,y+.575,z);ghost.userData={kind:'bank-place',index:i,label:'Place extra battery on its anchored mounting pad'};this.group.add(ghost);
  const rail=new THREE.Mesh(new THREE.BoxGeometry(.85,.1,.28),new THREE.MeshStandardMaterial({color:'#818d91',metalness:.65,roughness:.45}));rail.position.set(pack.x+1.05,pack.y+.07,pack.z+.4+i*.32);this.group.add(rail);
  const ports=[];
  for(const side of ['bus','pack'])for(const [pole,dx] of [['+',-.22],['-',.22]]){
   const port=new THREE.Mesh(new THREE.CylinderGeometry(.09,.1,.12,16),new THREE.MeshStandardMaterial({color:pole==='+'?'#cf342c':'#20272c',emissive:'#071416',roughness:.5}));
   port.position.copy(side==='pack'?new THREE.Vector3(x+dx,y+.815,z+.6):new THREE.Vector3(pack.x+1.05+dx,pack.y+.18,pack.z+.4+i*.32));
   const ring=new THREE.Mesh(new THREE.TorusGeometry(.12,.018,6,20),new THREE.MeshBasicMaterial({color:'#ccece4'}));ring.rotation.x=-Math.PI/2;port.add(ring);
   port.userData={kind:'bank-socket',index:i,side,pole,label:`${side==='bus'?'Protected bus':'Extra pack '+(i+2)} ${pole} · parallel branch`};this.group.add(port);ports.push(port);
  }
  const support=new THREE.Mesh(new THREE.BoxGeometry(1.7,.15,1.2),new THREE.MeshStandardMaterial({color:'#5d696b',roughness:.7}));support.position.set(x,y+.05,z);this.group.add(support);
  const collider={x,z,r:.9};this.world.colliders.push(collider);
  const node={g,body,ghost,check,ports,support,rail,collider};this.nodes.push(node);return node;
 }
 update(inside,blocked){
  const o=this.state(),bank=o.batteryBank,count=o.upgrades.battery||0;while(this.nodes.length<count)this.make(this.nodes.length);
  this.nodes.forEach((node,i)=>{
   const owned=i<count,placed=owned&&(!bank||bank.placed.includes(i)),connected=owned&&(!bank||bank.connected.includes(i));
   node.g.visible=placed;node.ghost.visible=owned&&!placed;node.support.visible=owned;node.rail.visible=placed;
   node.collider.r=placed?.9:0;
   node.ports.forEach(p=>p.visible=placed);node.check.material.color.set(connected?'#a9efc7':'#ffffff');
   for(const pole of connected?['+','-']:bank?.leads[i]||[]){
    const key=i+pole;if(this.cables.has(key))continue;
    const a=node.ports.find(p=>p.userData.side==='bus'&&p.userData.pole===pole).position,b=node.ports.find(p=>p.userData.side==='pack'&&p.userData.pole===pole).position;
    const cable=this.cable(a,b,new THREE.Vector3(pole==='+'?-.06:.06,0,0),pole==='+'?'#c8231c':'#141414',.028);this.world.scene.add(cable);this.cables.set(key,{cable,index:i,pole});
   }
  });
  for(const {cable,index,pole} of this.cables.values())cable.visible=index<count&&(!bank||bank.connected.includes(index)||bank.leads[index]?.includes(pole));
  if(this.held&&(!this.held.port.visible||bank?.connected.includes(this.held.index)||!bank?.checked.includes(this.held.index)))this.cancel();
  this.preview.visible=!!this.held&&!inside&&!blocked;
  if(this.preview.visible){const a=this.held.port.position,b=this.world.player.position.clone().add(new THREE.Vector3(0,1,0));this.preview.geometry.setFromPoints([a,b]);}
 }
 targets(){return this.nodes.flatMap(n=>[n.ghost,n.check,...n.ports]).filter(o=>o.visible&&o.parent.visible);}
 target(){const o=this.state(),b=o.batteryBank;if(!b)return null;const i=this.held?.index??this.nodes.findIndex((_,i)=>i<o.upgrades.battery&&!b.connected.includes(i));if(i<0)return null;const n=this.nodes[i];if(!b.placed.includes(i))return n.ghost.position;if(!b.checked.includes(i))return n.g.position;return this.held?n.ports.find(p=>p.userData.side!==this.held.side&&p.userData.pole===this.held.pole).position:n.ports.find(p=>p.userData.side==='bus'&&p.userData.pole===(b.leads[i]?.includes('+')?'-':'+')).position;}
 hint(){return this.held?`Holding ${this.held.pole==='+'?'red +':'black −'} · walk to the matching ${this.held.side==='bus'?'extra pack':'protected bus'} terminal · R drops`:'';}
 use(mesh){
  const o=this.state(),d=mesh.userData,b=o.batteryBank;if(!b)return true;
  if(d.kind==='bank-place'){if(placeBank(o,d.index)){this.save();this.guide('Cabinet anchored. Use its inspection panel before connecting the branch.');}return true;}
  if(d.kind==='bank-check'){
   if(b.connected.includes(d.index)){this.guide('This pack is connected in parallel: the bank remains 48 V. Its extra storage is already available.');return true;}
   if(checkBank(o,d.index)){this.save();this.guide('Cabinet checked and isolated. Follow the marker: connect red + to +. Then connect black − to −.');}else this.guide('Commission the main battery-to-base supply first.');return true;
  }
  if(b.connected.includes(d.index)){this.guide('This branch is already commissioned.');return true;}
  if(!b.checked.includes(d.index)){this.guide('Use the inspection panel on the new cabinet first. It checks that the packs match and the connectors are isolated.');return true;}
  const need=b.leads[d.index]?.includes('+')?'-':'+';
  if(!this.held){if(d.pole!==need){this.guide('Use the '+(need==='+'?'red +':'black −')+' lead next.');return true;}this.cancelOther();this.held={index:d.index,side:d.side,pole:d.pole,port:mesh};this.guide(this.hint());return true;}
  const h=this.held;if(h.index!==d.index||h.side===d.side){this.guide('Walk to the other end of this same parallel branch. R drops the lead.');return true;}
  const result=connectBank(o,d.index,h.pole,d.pole,TUNED.batteryUpgrade);
  if(!result.ok){this.guide('Polarity mismatch. Connect red + to + and black − to −. Nothing has been energized.');return true;}
  this.cancel();o.today=o.forecast();this.save();this.guide(result.complete?'Both leads fitted! The automatic safety check is complete. Your bank stays at 48 V and gains '+TUNED.batteryUpgrade+' kWh of storage.':'Red lead fitted. The circuit remains open. Connect the black − return to close the loop.',true);return true;
 }
}
