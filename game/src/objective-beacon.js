import * as THREE from 'three';

// One shared marker; no per-frame geometry, textures, or event handlers.
export class ObjectiveBeacon {
  constructor(scene, parent) {
    this.point = new THREE.Vector3(); this.cameraPoint = new THREE.Vector3();
    this.group = new THREE.Group(); scene.add(this.group);
    const material = new THREE.MeshBasicMaterial({color:0xffd16b,transparent:true,opacity:.4,depthWrite:false});
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(.16,.45,1,12),material);
    this.group.add(this.beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.85,1.1,32),material.clone());
    ring.rotation.x=-Math.PI/2;ring.position.y=.12;this.group.add(ring);
    this.element=document.createElement('div');this.element.className='objective-waypoint';
    this.element.innerHTML='<span class="objective-disc"></span><strong></strong><small></small><span class="objective-arrow">▲</span>';
    parent.append(this.element);
    this.icon=this.element.querySelector('.objective-disc');this.title=this.element.querySelector('strong');this.distance=this.element.querySelector('small');this.arrow=this.element.querySelector('.objective-arrow');
    if(!document.querySelector('#objective-waypoint-style')){
      const style=document.createElement('style');style.id='objective-waypoint-style';style.textContent=`
      .objective-waypoint{position:fixed;left:0;top:0;z-index:25;pointer-events:none;display:flex;align-items:center;flex-direction:column;width:190px;transform:translate(-50%,-50%);color:#fff5da;text-align:center;font:600 13px/1.3 system-ui;filter:drop-shadow(0 2px 3px #000)}
      .objective-waypoint[hidden]{display:none}.objective-disc{display:grid;place-items:center;width:54px;height:54px;border:3px solid #ffdc83;border-radius:50%;background:#302716ed;font-size:26px;box-sizing:border-box}
      .objective-waypoint strong,.objective-waypoint small{max-width:190px;background:#17202be8;padding:3px 7px;border-radius:5px;margin-top:3px}.objective-waypoint small{font-size:12px}.objective-arrow{position:absolute;top:-23px;color:#ffdc83;font-size:23px;transform-origin:center}
      @media(max-width:600px){.objective-waypoint{width:150px;font-size:11px}.objective-disc{width:44px;height:44px;font-size:22px}.objective-waypoint strong{max-width:150px}}
      `;document.head.append(style);
    }
  }
  update(target, task, world, ground, visible) {
    this.group.visible=!!target&&visible;this.element.hidden=!this.group.visible;
    if(!this.group.visible)return;
    const d=Math.hypot(target.x-world.player.position.x,target.z-world.player.position.z);
    const height=THREE.MathUtils.clamp(d*.22,2.5,24);
    this.group.position.set(target.x,ground,target.z);this.beam.scale.y=height;this.beam.position.y=height/2;
    this.beam.material.opacity=d<6?.12:.4;
    this.point.set(target.x,ground+height,target.z);
    world.camera.updateMatrixWorld();this.cameraPoint.copy(this.point).applyMatrix4(world.camera.matrixWorldInverse);this.point.project(world.camera);
    const behind=this.cameraPoint.z>=0;
    let x=this.point.x,y=-this.point.y;
    if(behind){x=-x;y=-y;if(Math.abs(x)<.01)x=1;}
    const w=innerWidth,h=innerHeight,padX=w<600?82:105,padY=100;
    const off=behind||Math.abs(x)>1-padX*2/w||Math.abs(y)>1-padY*2/h;
    if(off){const scale=Math.max(Math.abs(x)/(1-padX*2/w),Math.abs(y)/(1-padY*2/h),.001);x/=scale;y/=scale;}
    this.element.style.left=THREE.MathUtils.clamp((x+1)*w/2,padX,w-padX)+'px';
    this.element.style.top=THREE.MathUtils.clamp((y+1)*h/2,padY,h-padY)+'px';
    this.element.style.opacity=d<4&&!off?'.6':'1';
    this.arrow.hidden=!off;this.arrow.style.transform=`rotate(${Math.atan2(y,x)*180/Math.PI+90}deg)`;
    const kind=task.target;
    this.icon.textContent=kind==='hab'?'⌂':kind==='build-ore'||/clear|rock/i.test(task.title)?'⛏':/power|base/.test(kind)?'ϟ':kind==='charger'?'🚙':kind==='ice'||kind==='water'?'💧':kind==='greenhouse'?'🌱':kind==='isru'?'⚙':'◆';
    this.title.textContent=task.title;this.distance.textContent=`${Math.round(d)} m${d<4?' · Here':''}`;
  }
}
