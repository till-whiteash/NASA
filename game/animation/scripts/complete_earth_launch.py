"""Complete the Earth launch in the same HD Blender scene, preserving the original pad film.
Run with Blender -b -P this_file -- --out ABS_DIR [--stills] [--render].
The original launch_earth.blend is an immutable input; output is launch_earth_complete.blend.
Flight time is compressed for teaching. The orbital backdrop is illustrated, not a navigation simulation.
Staging order: https://www.nasa.gov/reference/artemis-i-mission-timeline/
"""
import bpy, math, json, sys, argparse
from pathlib import Path
from mathutils import Vector
from bpy_extras import anim_utils

HERE=Path(__file__).resolve().parent
ANIM=HERE.parent
args=argparse.ArgumentParser()
args.add_argument('--out',required=True)
args.add_argument('--stills',action='store_true')
args.add_argument('--render',action='store_true')
opt=args.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
OUT=Path(opt.out).resolve(); OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ANIM/'blend/launch_earth.blend'))
s=bpy.context.scene; s.frame_set(0)
root=bpy.data.objects['sls_flight']; sls=bpy.data.objects['sls']; cam=s.camera
END=1343; SRB=564; LAS=720; MECO=912; CORE=936; IGNITE=1128; COAST=1272

def channels(o):
    ad=o.animation_data
    return anim_utils.action_get_channelbag_for_slot(ad.action,ad.action_slot).fcurves if ad and ad.action else []
def key(o,f,loc=None,rot=None,scale=None):
    for prop,val in [('location',loc),('rotation_euler',rot),('scale',scale)]:
        if val is not None:
            setattr(o,prop,val);o.keyframe_insert(prop,frame=f)
def linear(o):
    for fc in channels(o):
        for kp in fc.keyframe_points: kp.interpolation='LINEAR'
def newempty(name,parent=None,loc=(0,0,0)):
    o=bpy.data.objects.new(name,None);s.collection.objects.link(o);o.parent=parent;o.location=loc;return o
def smooth(t):
    t=max(0,min(1,t));return t*t*(3-2*t)
def center_pivot(name):
    o=bpy.data.objects[name];o.animation_data_clear();o.location=(0,0,0);o.rotation_euler=(0,0,0)
    c=sum((Vector(v) for v in o.bound_box),Vector())/8
    p=newempty(name+'_release',sls,c);o.parent=p;o.location=-c
    return p,c

# Cache the authored camera and flight path before changing the end. 24 fps, no seek at staging.
poses={}
for f in range(540,736):
    s.frame_set(f);poses[f]=(root.location.copy(),root.rotation_euler.copy(),cam.location.copy(),cam.rotation_euler.copy())
p_last,rot_last=poses[735][:2]
velocity=poses[735][0]-poses[734][0]
for f in range(736,END+1):
    p=p_last+velocity*(f-735)
    r=rot_last.copy();r.x=rot_last.x+(-math.radians(78)-rot_last.x)*smooth((f-735)/(IGNITE-735))
    key(root,f,loc=p,rot=r)
linear(root)

# Actual moving rigid parts: smooth lateral clearance, then aft drift. Pivots are in the parts,
# so the boosters rotate about themselves rather than orbiting the origin of the rocket.
release={}
for name,side in [('boosterL',-1),('boosterR',1)]:
    o,c=center_pivot(name);release[name]=o
    key(o,0,loc=c,rot=(0,0,0));key(o,SRB,loc=c,rot=(0,0,0))
    for f in range(SRB+1,END+1):
        t=(f-SRB)/24
        key(o,f,loc=c+Vector((side*(2.4*t+.22*t*t),0,-1.25*t*t)),rot=(0,side*math.radians(min(85,5*t)),0))
    linear(o)
    # Booster plumes die before release; no lit exhaust left hanging beside the core.
    fl=bpy.data.objects['srb_'+name];fl.animation_data_clear()
    key(fl,0,scale=(.001,)*3);key(fl,125,scale=(.001,)*3);key(fl,128,scale=(1,)*3)
    key(fl,SRB-10,scale=(1,)*3);key(fl,SRB,scale=(.001,)*3);linear(fl)

las,c=center_pivot('las');release['las']=las
key(las,0,loc=c,rot=(0,0,0));key(las,LAS,loc=c,rot=(0,0,0))
for f in range(LAS+1,END+1):
    t=(f-LAS)/24
    key(las,f,loc=c+Vector((1.8*t*t,0,8*t+8*t*t)),rot=(0,math.radians(min(60,t*9)),0))
linear(las)
jet=bpy.data.objects['las_jettison'];jet.animation_data_clear()
for f,scale in [(0,.001),(LAS-1,.001),(LAS+3,1),(LAS+23,1),(LAS+30,.001)]:key(jet,f,scale=(scale,)*3)
linear(jet)

core,c=center_pivot('core');release['core']=core
key(core,0,loc=c,rot=(0,0,0));key(core,CORE,loc=c,rot=(0,0,0))
for f in range(CORE+1,END+1):
    t=(f-CORE)/24
    key(core,f,loc=c+Vector((-.3*t*t,0,-3*t-1.3*t*t)),rot=(0,-math.radians(min(35,2*t)),0))
linear(core)
# Four engines remain attached to the orange core. Their exhaust fades before separation.
for i in range(4):
    fl=bpy.data.objects[f'rs25_{i}'];fl.animation_data_clear();fl.parent=core;fl.location-=c
    for f,k in [(0,.001),(52,.001),(60,1),(564,1),(600,1.6),(MECO-12,1.6),(MECO,.001)]:key(fl,f,scale=(k,k,k))
    linear(fl)
# Stop the legacy smoke column from lingering under an already separated rocket.
smoke=bpy.data.objects.get('smoke_column')
if smoke:
    key(smoke,SRB+8,scale=(.001,)*3)

# RL10 nozzle and short vacuum plume on the retained upper stage.
s.frame_set(0)
sys.path.insert(0,str(HERE));import common
common.set_stretch(1.0)
nozzle_mat=common.mat('RL10 bell metal',(.19,.22,.26),rough=.4,metal=.8)
nozzle=common.lathe('upper_stage_RL10',[(70.1,.48),(69.5,.55),(68.8,.85),(68.1,1.15)],nozzle_mat,verts=48,caps=False)
nozzle.parent=sls
# A closed thrust deck and engine mounting structure, visible only after core release.
bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=2.75, depth=.28)
deck=bpy.context.object;deck.name='upper_stage_thrust_deck';deck.parent=sls;deck.location=(0,0,70.2);deck.data.materials.append(nozzle_mat)
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=.5, depth=1.2)
mount=bpy.context.object;mount.name='RL10_mount';mount.parent=sls;mount.location=(0,0,70.3);mount.data.materials.append(nozzle_mat)
plume=common.flame('upper_stage_exhaust',.6,16,sls,(0,0,68.1),color=(.25,.48,1),strength=3,alpha=.35)
for f,k in [(0,.001),(IGNITE,.001),(IGNITE+12,1),(COAST-8,1),(COAST,.001)]:key(plume,f,scale=(k,k,k))
linear(plume)

# Curved Earth below the final shots, using the project's existing Earth texture.
# It enters on a deliberate wide-shot cut, after the escape tower is clear, never mid-separation.
earth=common.uvsphere('earth_orbital_backdrop',3400,m=common.textured('earth_orbit_map','earth-map.jpg',2048),seg=128,rings=64)
earth.rotation_euler=(math.radians(90),0,math.radians(-30))
b=next(n for n in earth.data.materials[0].node_tree.nodes if n.type=='BSDF_PRINCIPLED')
b.inputs['Emission Strength'].default_value=.24
tex=next(n for n in earth.data.materials[0].node_tree.nodes if n.type=='TEX_IMAGE')
earth.data.materials[0].node_tree.links.new(tex.outputs['Color'],b.inputs['Emission Color'])
earth.hide_render=True;earth.keyframe_insert('hide_render',frame=0);earth.keyframe_insert('hide_render',frame=815)
earth.hide_render=False;earth.keyframe_insert('hide_render',frame=816)
# Keep the original shot intact up through the tower jettison; then retain the old launch's
# core staging -> upper-stage burn -> orbital coast story in the same detailed scene.
for f in range(540,END+1):
    s.frame_set(f);p=root.location.copy();q=root.rotation_euler.to_quaternion()
    if f<=735: pos=poses[f][2];euler=poses[f][3]
    else:
        if f<816:
            off=poses[735][2]-poses[735][0];target=45
        elif f<1056:
            u=smooth((f-816)/240);off=Vector((-120+25*u,-175+35*u,115));target=64+10*u
        else:
            u=smooth((f-1056)/(END-1056));off=Vector((-95+60*u,-140+80*u,115-7*u));target=74+6*u
        pos=p+off;euler=(p+q@Vector((0,0,target))-pos).to_track_quat('-Z','Y').to_euler('XYZ')
    key(cam,f,loc=pos,rot=euler)
    earth.location=pos+euler.to_quaternion()@Vector((0,-2900,-7000));earth.keyframe_insert('location',frame=f)
linear(cam);linear(earth)
# Above the atmosphere, the sky remains black even when the camera looks toward Earth.
ramp=next(n for n in s.world.node_tree.nodes if n.type=='VALTORGB')
for el in ramp.color_ramp.elements:
    for fr,col in [(815,tuple(el.color)),(816,(.0004,.0007,.002,1)),(END,(.0004,.0007,.002,1))]:
        el.color=col;el.keyframe_insert('color',frame=fr)
# A labelled teaching marker, not a physical wall: the ship visibly crosses the cyan 100 km ring.
marker_mat=common.mat('Karman cyan',(.12,.55,.85),emit=(.15,.65,1),strength=1.5)
marker=newempty('Karman_100km_marker')
s.frame_set(672);cross=root.location.copy()+root.rotation_euler.to_quaternion()@Vector((0,0,50))
# Draw a near-horizontal ring in screen space; its projection moves from above to below Orion.
for f in range(648,709):
    s.frame_set(f);qcam=cam.rotation_euler.to_quaternion();target=root.location+root.rotation_euler.to_quaternion()@Vector((0,0,45))
    marker.location=target+qcam@Vector((0,(672-f)*1.4,-12))
    marker.rotation_euler=cam.rotation_euler
    marker.keyframe_insert('location',frame=f);marker.keyframe_insert('rotation_euler',frame=f)
curve=bpy.data.curves.new('100km_ellipse','CURVE');curve.dimensions='3D';curve.bevel_depth=.12;curve.bevel_resolution=3
poly=curve.splines.new('POLY');poly.points.add(127)
for i,pt in enumerate(poly.points):
    a=i/128*math.tau;pt.co=(math.cos(a)*95,math.sin(a)*8,0,1)
poly.use_cyclic_u=True
line=bpy.data.objects.new('Karman line - illustrated 100km threshold',curve);s.collection.objects.link(line);line.parent=marker;line.data.materials.append(marker_mat)
for f,hidden in [(0,True),(647,True),(648,False),(708,False),(709,True)]:
    line.hide_render=hidden;line.keyframe_insert('hide_render',frame=f)
linear(marker)
# A true camera cut, not an interpolated frame flying through the scene.
for fc in channels(cam):
    for kp in fc.keyframe_points:
        if kp.co.x in (815,352):kp.interpolation='CONSTANT'
# Repair the pre-existing stretched pad-to-chase shot cut using the good next pose.
s.frame_set(354);cl=cam.location.copy();cr=cam.rotation_euler.copy()
key(cam,353,loc=cl,rot=cr)
for fc in channels(cam):
    for kp in fc.keyframe_points:
        if 352<=kp.co.x<=353:kp.interpolation='CONSTANT'
# Tone the atmospheric sky into space over the original ascent, then hold it.
# Keep original lights, color management, NASA meshes and surface materials.
s.frame_end=END;s.render.fps=24
s.render.resolution_x=1920;s.render.resolution_y=1080;s.render.resolution_percentage=100
s.render.engine='BLENDER_EEVEE';s.eevee.taa_render_samples=32;s.eevee.shadow_pool_size='1024';s.eevee.use_raytracing=False
s.render.use_sequencer=False;s.render.use_border=False;s.render.use_crop_to_border=False
cam.data.clip_end=100000
s['launch_completion']='Continuous HD staging, 56 seconds; 24 fps; original pad retained'
s['staging_source']='https://www.nasa.gov/reference/artemis-i-mission-timeline/'
# Responsive captions: do not assert that merely crossing 100 km creates a stable orbit.
cap=json.loads((ANIM/'glb/launch_earth.captions.json').read_text(encoding='utf-8'))
cap['clips']=[{'name':'launch_earth','start':0,'end':56.0}]
cap['captions']=[
 {'t0':0,'t1':2.3,'text':'SLS: 98 m tall. Mobile Launcher: 116 m. Kennedy Space Center, Pad 39B.','phase':'LEAVING EARTH'},
 {'t0':2.3,'t1':5.33,'text':'Four RS-25 engines start, burning liquid hydrogen and liquid oxygen.','phase':'MAIN ENGINE IGNITION'},
 {'t0':5.33,'t1':11.12,'text':'The two solid boosters ignite. They supply over 75% of the 8.8 million pounds of liftoff thrust.','phase':'LIFTOFF'},
 {'t0':11.12,'t1':14.67,'text':'The rocket climbs clear. The mobile launcher stays on the ground.','phase':'TOWER CLEAR'},
 {'t0':14.67,'t1':19,'text':'Max-Q: the strongest aerodynamic load. The structure must withstand the pressure and vibration.','phase':'MAX-Q'},
 {'t0':19,'t1':23.5,'text':'About two minutes after liftoff, the boosters run out of fuel. Time is compressed here.','phase':'CLIMBING'}]
cap['telemetry']={'karman':{'start':27,'crossing':28,'end':29.5,'altitudeKm':100},'note':'Illustrated ascent. Time compressed.'}
for start,end,text,phase in [
 (23.5,27,'The empty side boosters separate and drift away. The four core engines keep firing.','BOOSTER SEPARATION'),
 (27,30,'Crossing the Kármán line: 100 km, the conventional edge of space. Reaching orbit also needs sideways speed.','KÁRMÁN LINE · 100 KM'),
 (30,34,'The escape tower could pull Orion away in an emergency. Now its motor carries it clear.','ESCAPE TOWER RELEASE'),
 (34,38,'The core stage keeps accelerating the spacecraft. This climb takes several minutes in real flight.','POWERED ASCENT'),
 (38,39,'Main engine cutoff: the core stage has finished its job.','ENGINES OFF'),
 (39,44,'The orange core separates. Orion remains attached to the upper stage.','CORE STAGE SEPARATION'),
 (44,47,'Coasting above Earth. The upper stage waits for the right place to burn. Time is shortened here.','ORBITAL COAST'),
 (47,53,'Later, the upper-stage engine raises the low part of the orbit.','UPPER-STAGE BURN'),
 (53,56,'Orbit! About 28,000 km/h in low Earth orbit. Next: our fictional Mars journey.','EARTH ORBIT')]:
    cap['captions'].append({'t0':start,'t1':end,'text':text,'phase':phase})
(OUT/'launch_earth.captions.json').write_text(json.dumps(cap,indent=1),encoding='utf-8')
# Audit actual scene transforms, including exact zero displacement at each release.
audit={'fps':24,'frames':END+1,'events':{}}
for name,at in [('boosterL',SRB),('boosterR',SRB),('las',LAS),('core',CORE)]:
    o=release[name];records=[]
    for f in [at-1,at,at+1,at+24,at+72]:
        s.frame_set(f);records.append({'frame':f,'location':list(o.location),'rotation':list(o.rotation_euler)})
    audit['events'][name]=records
(OUT/'launch-animation-audit.json').write_text(json.dumps(audit,indent=2),encoding='utf-8')
s.frame_set(0)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ANIM/'blend/launch_earth_complete.blend'),compress=True)
if opt.stills:
    s.render.image_settings.media_type='IMAGE';s.render.image_settings.file_format='PNG'
    for f in [552,588,636,672,756,936,984,1188,1320]:
        s.frame_set(f);s.render.filepath=str(OUT/f'launch-{f:04d}.png');bpy.ops.render.render(write_still=True)
if opt.render:
    s.frame_start=0;s.frame_end=END
    s.render.image_settings.media_type='VIDEO';s.render.image_settings.file_format='FFMPEG'
    s.render.ffmpeg.format='MPEG4';s.render.ffmpeg.codec='H264';s.render.ffmpeg.constant_rate_factor='HIGH';s.render.ffmpeg.ffmpeg_preset='GOOD'
    s.render.filepath=str(OUT/'launch_earth-hd.mp4');s.render.use_file_extension=False
    bpy.ops.render.render(animation=True)
print('COMPLETED LAUNCH BUILD',OUT)
