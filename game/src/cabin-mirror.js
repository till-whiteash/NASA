import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { figure } from './hab-crew.js';
import { loadNasaAstronaut, poseAstronaut } from './suit.js';

// Layer 1 is visible to the mirror camera, but excluded from the first-person
// camera. This reflects a real animated body without drawing its head over your view.
export class CabinMirror {
  constructor(room) {
    this.room=room;this.equipped=true;this.time=0;this.phase=0;
    this.avatar=new THREE.Group();this.avatar.name='Your reflected character';room.scene.add(this.avatar);
    this.cabin=figure({id:'you',colour:'#3b7bd8'}).root;this.cabin.name='Your cabin clothes';this.avatar.add(this.cabin);
    const frame=new THREE.Group();frame.name='Full-length cabin mirror';frame.position.set(-3.35,1.2,1.65);frame.rotation.y=Math.PI/2;room.scene.add(frame);
    const metal=new THREE.MeshStandardMaterial({color:'#687a83',metalness:.7,roughness:.28});
    for(const x of [-.635,.635]){const bar=new THREE.Mesh(new THREE.BoxGeometry(.055,2.22,.07),metal);bar.position.x=x;frame.add(bar);}
    for(const y of [-1.095,1.095]){const bar=new THREE.Mesh(new THREE.BoxGeometry(1.32,.055,.07),metal);bar.position.y=y;frame.add(bar);}
    this.surface=new Reflector(new THREE.PlaneGeometry(1.22,2.14),{color:0xbcbcbc,textureWidth:768,textureHeight:1024,clipBias:.003,multisample:0});
    this.surface.name='Working cabin mirror';this.surface.camera.layers.enable(1);frame.add(this.surface);
    const stripMat=new THREE.MeshBasicMaterial({color:'#f7f1dd'});
    for(const x of [-.69,.69]){const strip=new THREE.Mesh(new THREE.BoxGeometry(.018,2.12,.025),stripMat);strip.position.set(x,0,.035);frame.add(strip);}
    const inspectionLight=new THREE.PointLight('#f3f6ff',6,4,2);inspectionLight.position.set(-3.2,2.25,1.65);room.scene.add(inspectionLight);
    this._reflectionLayer(this.cabin);
    this.ready=Promise.all([this._loadCabin(),loadNasaAstronaut().then(s=>{if(s){this.suit=s;this._reflectionLayer(s.root);this.avatar.add(s.root);}})])
      .then(()=>this.setEquipped(this.equipped));
  }
  _reflectionLayer(root){root.traverse(o=>{o.layers.set(1);if(o.isMesh){o.castShadow=false;o.frustumCulled=false;}});}
  async _loadCabin(){
    try{
      const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
      const [gltf,animation]=await Promise.all([
        loader.loadAsync('assets/crew/player-cabin.glb'),
        loader.loadAsync('assets/crew/crew-anims.glb')
      ]);
      const body=gltf.scene;body.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(body),scale=1.78/box.getSize(new THREE.Vector3()).y;
      body.scale.setScalar(scale);body.position.y=-box.min.y*scale;
      this.cabin.clear();this.cabin.add(body);this._reflectionLayer(body);
      this.cabinMixer=new THREE.AnimationMixer(body);
      this.cabinActions={};
      const norm=n=>n.replace(/^mixamorig\d*:?/,'').replace(/_\d+$/,''),bones={};
      body.traverse(o=>{if(o.isBone&&norm(o.parent?.name??'')!==norm(o.name))(bones[norm(o.name)]??=[]).push(o.name);});
      const idle=animation.animations.find(c=>c.name==='idle');
      const idleRotations=new Map((idle?.tracks??[]).map(t=>[norm(t.name.slice(0,t.name.lastIndexOf('.'))),t.values.slice(0,4)]));
      for(const clip of animation.animations){
        if(!['idle','run'].includes(clip.name))continue;
        const tracks=[],walking=clip.name==='run',name=walking?'Walk':'Idle';
        for(const track of clip.tracks){
          const split=track.name.lastIndexOf('.'),bone=norm(track.name.slice(0,split));
          for(const target of bones[bone]??[]){
            const copy=track.clone();copy.name=target+track.name.slice(split);
            if(walking){
              // Reduce the running stride and cadence for cabin walking.
              copy.times=copy.times.map(t=>t*1.5);
              const rest=idleRotations.get(bone);
              if(copy instanceof THREE.QuaternionKeyframeTrack&&rest){
                const q=new THREE.Quaternion(),base=new THREE.Quaternion().fromArray(rest);
                for(let i=0;i<copy.values.length;i+=4)q.fromArray(copy.values,i).slerp(base,.48).toArray(copy.values,i);
              }
            }
            tracks.push(copy);
          }
        }
        const a=this.cabinMixer.clipAction(new THREE.AnimationClip(name,clip.duration*(walking?1.5:1),tracks));
        a.play().setEffectiveWeight(name==='Idle'?1:0);this.cabinActions[name]=a;
      }
      this.cabin.userData.realistic=true;
      this.cabin.userData.playerModel='player-cabin';
    }catch(error){console.warn('Cabin character uses its built-in fallback',error);}
  }
  setEquipped(equipped){
    this.equipped=!!equipped;this.cabin.visible=!this.equipped;
    if(this.suit)this.suit.root.visible=this.equipped;
  }
  update(dt){
    const r=this.room,speed=Math.hypot(r.vel?.x||0,r.vel?.z||0);
    this.time+=dt;this.phase+=speed*dt*Math.PI/1.2;
    this.avatar.position.copy(r.pos);this.avatar.rotation.y=r.yaw;
    if(this.cabinActions){this.walkMix=THREE.MathUtils.damp(this.walkMix||0,Math.min(1,speed/1.5),9,dt);this.cabinActions.Idle?.setEffectiveWeight(1-this.walkMix);this.cabinActions.Walk?.setEffectiveWeight(this.walkMix).setEffectiveTimeScale(Math.max(.5,speed/1.4));}
    this.cabinMixer?.update(dt);
    this.cabin.position.y=-(r.crouch||0)*.18;
    if(this.suit){const p=poseAstronaut(this.suit,{phase:this.phase,pace:Math.min(1,speed/2.6),run:0,air:0,t:this.time,crouch:r.crouch||0});this.suit.root.position.y=p.bob;}
    // Skip the extra render when the player is elsewhere in the linked habitat.
    this.surface.visible=r.pos.x<2.5&&r.pos.z>-.5;
  }
}
